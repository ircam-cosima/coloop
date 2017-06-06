import * as soundworks from 'soundworks/client';
import { decibelToLinear } from 'soundworks/utils/math';

const audio = soundworks.audio;
const audioContext = soundworks.audioContext;
const audioScheduler = soundworks.audio.getScheduler();

function appendSegments(segments, loopSegment, measureDuration) {
  const buffer = loopSegment.buffer;
  const bufferDuration = buffer ? buffer.duration : 0;
  const startOffset = loopSegment.startOffset || 0;
  const gain = loopSegment.gain;
  const repeat = loopSegment.repeat || 1;

  for (let n = 0; n < repeat; n++) {
    let cont = !!loopSegment.continue;

    for (let i = 0; i < loopSegment.length; i++) {
      const offset = startOffset + i * measureDuration;

      if (offset < bufferDuration) {
        const segment = new Segment(buffer, offset, Infinity, 0, gain, cont);
        segments.push(segment);
      }

      cont = true;
    }
  }
}

class Segment {
  constructor(buffer, offsetInBuffer = 0, durationInBuffer = Infinity, offsetInMeasure = 0, gain = 0, cont = false) {
    this.buffer = buffer;
    this.offsetInBuffer = offsetInBuffer;
    this.durationInBuffer = durationInBuffer; // 0: continue untill next segment starts
    this.offsetInMeasure = offsetInMeasure;
    this.gain = gain;
    this.continue = cont; // segment continues previous segment
  }
}

class SegmentTrack {
  constructor(output, segmentLayers, transitionTime = 0.05) {
    this.src = audioContext.createBufferSource();

    this.segmentLayers = segmentLayers;
    this.transitionTime = transitionTime;

    this.minCutoffFreq = 5;
    this.maxCutoffFreq = audioContext.sampleRate / 2;
    this.logCutoffRatio = Math.log(this.maxCutoffFreq / this.minCutoffFreq);

    this.layerIndex = 0;
    this.discontinue = true;

    const cutoff = audioContext.createBiquadFilter();
    cutoff.connect(output);
    cutoff.type = 'lowpass';
    cutoff.frequency.value = this.maxCutoffFreq;

    this.src = null;
    this.env = null;
    this.cutoff = cutoff;
    this.endTime = 0;
  }

  startSegment(audioTime, segment) {
    const buffer = segment.buffer;
    const bufferDuration = buffer.duration;
    const offsetInBuffer = segment.offsetInBuffer;
    const durationInBuffer = Math.min((segment.durationInBuffer || Infinity), bufferDuration - offsetInBuffer);
    let transitionTime = this.transitionTime;

    if (audioTime < this.endTime - transitionTime) {
      const src = this.src;
      const endTime = Math.min(audioTime + transitionTime, this.endTime);

      if (transitionTime > 0) {
        const env = this.env;
        // env.gain.cancelScheduledValues(audioTime);
        env.gain.setValueAtTime(1, audioTime);
        env.gain.linearRampToValueAtTime(0, endTime);
      }

      src.stop(endTime);
    }

    if (offsetInBuffer < bufferDuration) {
      let delay = 0;

      if (offsetInBuffer < transitionTime) {
        delay = transitionTime - offsetInBuffer;
        transitionTime = offsetInBuffer;
      }

      const gain = audioContext.createGain();
      gain.connect(this.cutoff);
      gain.gain.value = decibelToLinear(segment.gain);

      const env = audioContext.createGain();
      env.connect(gain);

      if (transitionTime > 0) {
        env.gain.value = 0;
        env.gain.setValueAtTime(0, audioTime + delay);
        env.gain.linearRampToValueAtTime(1, audioTime + delay + transitionTime);
      }

      const src = audioContext.createBufferSource();
      src.connect(env);
      src.buffer = buffer;
      src.start(audioTime + delay, offsetInBuffer - transitionTime);

      audioTime += transitionTime;

      const endInBuffer = offsetInBuffer + durationInBuffer;
      let endTime = audioTime + durationInBuffer;

      this.src = src;
      this.env = env;
      this.endTime = endTime;
    }
  }

  stopSegment(audioTime = audioContext.currentTime) {
    const src = this.src;

    if (src) {
      const transitionTime = this.transitionTime;
      const env = this.env;

      env.gain.setValueAtTime(1, audioTime);
      env.gain.linearRampToValueAtTime(0, audioTime + transitionTime);

      src.stop(audioTime + transitionTime);

      this.src = null;
      this.env = null;
      this.endTime = 0;
    }
  }

  startMeasure(audioTime, measureIndex, canContinue = false) {
    const segments = this.segmentLayers[this.layerIndex];
    const measureIndexInPattern = measureIndex % segments.length;
    const segment = segments[measureIndexInPattern];

    if (segment && (this.discontinue || !(segment.continue && canContinue))) {
      const delay = segment.offsetInMeasure || 0;
      this.startSegment(audioTime + delay, segment);
      this.discontinue = false;
    }
  }

  setCutoff(value) {
    const cutoffFreq = this.minCutoffFreq * Math.exp(this.logCutoffRatio * value);
    this.cutoff.frequency.value = cutoffFreq;
  }

  setLayer(value) {
    this.layerIndex = value;
    this.discontinue = true;
  }
}

export default class LoopPlayer extends audio.TimeEngine {
  constructor(metricScheduler, audioOutputs, measureLength = 1, tempo = 120, tempoUnit = 1 / 4, transitionTime = 0.05, measureCallback = function(measureCount) {}) {
    super();

    this.metricScheduler = metricScheduler;
    this.audioOutputs = audioOutputs;
    this.measureLength = measureLength;
    this.tempo = tempo;
    this.tempoUnit = tempoUnit;
    this.transitionTime = transitionTime;
    this.measureCallback = measureCallback;

    this.measureDuration = 60 / (tempo * tempoUnit);
    this.measureIndex = undefined;
    this.segmentTracks = new Map();

    this.metricScheduler.add(this);
  }

  stopAllTracks() {
    for (let [index, segmentTrack] of this.segmentTracks)
      segmentTrack.stopSegment();
  }

  syncSpeed(syncTime, metricPosition, metricSpeed) {
    if (metricSpeed === 0)
      this.stopAllTracks();
  }

  syncPosition(syncTime, metricPosition, metricSpeed) {
    const audioTime = audioScheduler.currentTime;
    const floatMeasures = metricPosition / this.measureLength;
    const numMeasures = Math.ceil(floatMeasures);
    const nextMeasurePosition = numMeasures * this.measureLength;

    this.measureIndex = numMeasures - 1;
    this.nextMeasureTime = undefined;

    return nextMeasurePosition;
  }

  advancePosition(syncTime, metricPosition, metricSpeed) {
    const audioTime = audioScheduler.currentTime;

    this.measureIndex++;

    const canContinue = (this.nextMeasureTime && Math.abs(audioTime - this.nextMeasureTime) < 0.01);

    for (let [index, segmentTrack] of this.segmentTracks)
      segmentTrack.startMeasure(audioTime, this.measureIndex, canContinue);

    this.measureCallback(audioTime, this.measureIndex);

    this.nextMeasureTime = audioTime + this.measureDuration;

    return metricPosition + this.measureLength;
  }

  getLoopTrack(index) {
    return this.segmentTracks.get(index);
  }

  removeLoopTrack(index) {
    const segmentTrack = this.segmentTracks.get(index);

    if (segmentTrack) {
      segmentTrack.stopSegment();
      this.segmentTracks.delete(index);
    }
  }

  addLoopTrack(index, loopLayers) {
    let segmentTrack = this.segmentTracks.get(index);

    if (segmentTrack)
      throw new Error(`Cannot add segment track twice (index: ${index})`);

    const segmentLayers = [];

    for (let layer of loopLayers) {
      const segments = [];

      if (Array.isArray(layer))
        layer.forEach((seg) => appendSegments(segments, seg, this.measureDuration));
      else
        appendSegments(segments, layer, this.measureDuration);

      segmentLayers.push(segments);
    }

    segmentTrack = new SegmentTrack(this.audioOutputs[index], segmentLayers, this.transitionTime);
    this.segmentTracks.set(index, segmentTrack);
  }

  setCutoff(index, value) {
    const segmentTrack = this.segmentTracks.get(index);

    if (segmentTrack)
      segmentTrack.setCutoff(value);
  }

  setLayer(index, value) {
    const segmentTrack = this.segmentTracks.get(index);

    if (segmentTrack)
      segmentTrack.setLayer(value);
  }

  destroy() {
    this.stopAllTracks();
    this.metricScheduler.remove(this);
  }
}

import * as soundworks from 'soundworks/client';

const audio = soundworks.audio;
const audioContext = soundworks.audioContext;
const audioScheduler = soundworks.audio.getScheduler();

function appendSegments(segments, multiLayerSegment, measureDuration, numMeasures) {
  const loopSegment = multiLayerSegment.low;
  const buffer = loopSegment.buffer;
  const bufferDuration = buffer ? buffer.duration : 0;
  const startOffset = loopSegment.startOffset || 0;
  const repeat = loopSegment.repeat || 1;

  for (let n = 0; n < repeat; n++) {
    let cont = !!loopSegment.continue;

    for (let i = 0; i < numMeasures; i++) {
      const offset = startOffset + i * measureDuration;

      if (offset < bufferDuration) {
        const segment = new Segment(buffer, offset, Infinity, 0, cont);
        segments.push(segment);
      }

      cont = true;
    }
  }
}

class Segment {
  constructor(buffer, offsetInBuffer = 0, durationInBuffer = Infinity, offsetInMeasure = 0, cont = false) {
    this.buffer = buffer;
    this.offsetInBuffer = offsetInBuffer;
    this.durationInBuffer = durationInBuffer; // 0: continue untill next segment starts
    this.offsetInMeasure = offsetInMeasure;
    this.continue = cont; // segment continues previous segment
  }
}

class SegmentTrack {
  constructor(output, segments, transitionTime = 0.05) {
    this.src = audioContext.createBufferSource();

    this.segments = segments;
    this.transitionTime = transitionTime;

    this.minCutoffFreq = 5;
    this.maxCutoffFreq = audioContext.sampleRate / 2;
    this.logCutoffRatio = Math.log(this.maxCutoffFreq / this.minCutoffFreq);

    const cutoff = audioContext.createBiquadFilter();
    cutoff.connect(output);
    cutoff.type = 'lowpass';
    cutoff.frequency.value = this.maxCutoffFreq;

    this.src = null;
    this.env = null;
    this.cutoff = cutoff;
    this.endTime = 0;

    this._active = false;
  }

  get active() {
    return this._active;
  }

  set active(active) {
    if (!active)
      this.stopSegment();

    this._active = active;
  }

  startSegment(audioTime, buffer, offsetInBuffer, durationInBuffer = Infinity) {
    const bufferDuration = buffer.duration;
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

      const env = audioContext.createGain();
      env.connect(this.cutoff);

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

      durationInBuffer = Math.min(durationInBuffer, bufferDuration - offsetInBuffer);

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
    if (this._active) {
      const measureIndexInPattern = measureIndex % this.segments.length;
      const segment = this.segments[measureIndexInPattern];

      if (segment && !(segment.continue && canContinue)) {
        const delay = segment.offsetInMeasure || 0;
        this.startSegment(audioTime + delay, segment.buffer, segment.offsetInBuffer, segment.durationInBuffer);
      }
    }
  }

  setCutoff(value) {
    const cutoffFreq = this.minCutoffFreq * Math.exp(this.logCutoffRatio * value);
    this.cutoff.frequency.value = cutoffFreq;
  }
}

class LoopPlayer extends audio.TimeEngine {
  constructor(metricScheduler, outputBusses, measureLength = 1, tempo = 120, tempoUnit = 1/4, numBeats = 4, transitionTime = 0.05) {
    super();

    this.metricScheduler = metricScheduler;
    this.outputBusses = outputBusses;
    this.measureLength = measureLength;
    this.tempo = tempo;
    this.tempoUnit = tempoUnit;
    this.numBeats = numBeats;
    this.transitionTime = transitionTime;

    this.measureDuration = 60 / (tempo * tempoUnit);
    this.numMeasures = this.numBeats * tempoUnit;
    this.measureIndex = undefined;
    this.segmentTracks = new Map();

    this.metricScheduler.add(this);
  }

  stopAllTracks() {
    for (let [index, track] of this.segmentTracks)
      track.stopSegment();
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

    const canContinue = !!(this.nextMeasureTime && Math.abs(audioTime - this.nextMeasureTime) < 0.01);

    for (let [index, track] of this.segmentTracks)
      track.startMeasure(audioTime, this.measureIndex, canContinue);

    this.nextMeasureTime = audioTime + this.measureDuration;

    return metricPosition + this.measureLength;
  }

  getLoopTrack(index) {
    return this.segmentTracks.get(index);
  }

  /** used ? */
  removeLoopTrack(index) {
    const track = this.segmentTracks.get(index);

    if (track) {
      track.stopSegment();
      this.segmentTracks.remove(index);
    }
  }

  addLoopTrack(index, loop) {
    let track = this.segmentTracks.get(index);

    if (track)
      throw new Error(`Cannot add segment track twice (index: ${index})`);

    const segments = [];

    if (Array.isArray(loop))
      loop.forEach((elem) => appendSegments(segments, elem, this.measureDuration, this.numMeasures));
    else
      appendSegments(segments, loop, this.measureDuration, this.numMeasures);

    track = new SegmentTrack(this.outputBusses[index], segments, this.transitionTime);
    this.segmentTracks.set(index, track);
  }

  setCutoff(index, value) {
    const track = this.segmentTracks.get(index);

    if (track)
      track.setCutoff(value);
  }

  destroy() {
    this.stopAllTracks();
    this.metricScheduler.remove(this);
  }
}

export default LoopPlayer;

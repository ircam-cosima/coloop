import TimeEngine from '../waves-audio/time-engine';
import placerConfig from '../../shared/placer-config';

const minBlinkPeriod = 0.4;
const maxBlinkPeriod = 1;

class Blinker extends TimeEngine {
  constructor(scheduler, index) {
    super();

    this.scheduler = scheduler;
    this.index = index;

    const place = placerConfig[index];
    this.place = place.color;
    this.period = place.period;
    this.state = false;
  }

  advanceTime(time) {
    // control LED display
    const onOff = this.state ? ('on, ' + this.color) : 'off';
    this.state = !this.state;
    console.log(`blinking at place ${this.index + 1} (${onOff})`);
    return time + this.period;
  }

  start() {
    const time = this.scheduler.currentTime;
    const period = this.period;
    const nextIndex = Math.ceil(time / period);
    const startTime = nextIndex * period;
    this.state = ((nextIndex % 2) !== 0);
    this.scheduler.add(this, startTime);
  }

  stop() {
    if (this.master)
      this.scheduler.remove(this);
  }
}

export default class Placer {
  constructor(experience) {
    this.experience = experience;

    this.callbacks = [];
    this.blinkers = [];

    this.onPlacerReadys = [];
  }

  start(client, callback = function() {}) {
    const experience = this.experience;

    console.log("start:", this.callbacks, client.index);
    this.callbacks[client.index] = callback;

    if(!this.onPlacerReadys[client.index]) {
      const onPlacerReady = () => this.onPlacerReady(client);
      experience.receive(client, 'placerReady', onPlacerReady);
      this.onPlacerReadys[client.index] = onPlacerReady;
    }

    const blinker = new Blinker(experience.scheduler, client.index);
    blinker.start();
    this.blinkers[client.index] = blinker;
  }

  stop(client) {
    const blinker = this.blinkers[client.index];
    const callback = this.callbacks[client.index];

    if (blinker) {
      delete this.blinkers[client.index];

      blinker.stop();
    }

    if (callback) {
      delete this.callbacks[client.index];

      // const experience = this.experience;
      // experience.stopReceiving(client, 'ready', this.onPlacerReady);
    }

    console.log("stop:", this.callbacks, client.index);
  }

  onPlacerReady(client) {
    console.log("onPlacerReady:", client.index);
    const callback = this.callbacks[client.index];
    this.stop(client);
    callback();
  }
}

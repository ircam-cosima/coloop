import TimeEngine from '../waves-audio/time-engine';
import placerConfig from '../../shared/placer-config';

const minBlinkPeriod = 0.4;
const maxBlinkPeriod = 1;

class Blinker extends TimeEngine {
  constructor(experience, index) {
    super();

    this.scheduler = experience.scheduler;
    this.experience = experience;
    this.index = index;

    const place = placerConfig[index];
    this.color = place.color;
    this.period = place.period;
    this.state = false;
  }

  advanceTime(time) {
    const experience = this.experience;
    const ledDisplay = experience.ledDisplay;
    
    // control LED display
    const onOff = this.state ? ('on, ' + this.color) : 'off';
    this.state = !this.state;
    /// this.index - index PLAYER
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
  }

  start(client, callback = function() {}) {
    const experience = this.experience;
    const clientIndex = client.index;

    this.callbacks[clientIndex] = callback;

    experience.receive(client, 'placerReady', () => this.onPlacerReady(client));

    const blinker = new Blinker(experience, clientIndex);
    blinker.start();
    this.blinkers[clientIndex] = blinker;
  }

  stop(client) {
    const experience = this.experience;
    const clientIndex = client.index;
    const blinker = this.blinkers[clientIndex];
    const callback = this.callbacks[clientIndex];

    if (blinker) {
      delete this.blinkers[clientIndex];
      blinker.stop();
    }

    if (callback) {
      delete this.callbacks[clientIndex];
      experience.stopReceiving(client, 'placerReady', this.onPlacerReady);
    }
  }

  onPlacerReady(client) {
    const experience = this.experience;
    const clientIndex = client.index;
    const callback = this.callbacks[clientIndex];

    if(callback) {
      this.stop(client);
      experience.broadcast('barrel', null, 'placerDone', clientIndex);
      callback();
    }
  }
}

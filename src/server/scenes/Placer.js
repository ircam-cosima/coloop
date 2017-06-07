import TimeEngine from '../waves-audio/time-engine';
import colorConfig from '../../shared/color-config';
const playerColors = colorConfig.players;

const minBlinkPeriod = 0.4;
const maxBlinkPeriod = 1;

export default class Placer {
  constructor(experience) {
    this.experience = experience;

    this.blinkStates = [];
    this.callbacks = [];
    this.onPlacerReadys = [];
  }

  start(client, callback = function() {}) {
    const experience = this.experience;
    const clientIndex = client.index;

    this.callbacks[clientIndex] = callback;
    this.onPlacerReadys[clientIndex] = () => this.onPlacerReady(client);

    experience.receive(client, 'placerReady', this.onPlacerReadys[clientIndex]);
  }

  stop(client) {
    const experience = this.experience;
    const clientIndex = client.index;
    const callback = this.callbacks[clientIndex];

    if (callback) {
      delete this.callbacks[clientIndex];
      experience.stopReceiving(client, 'placerReady', this.onPlacerReadys[clientIndex]);
    }
  }

  setBlinkState(index, state) {
    if(this.blinkStates[index] !== state) {
      this.blinkStates[index] = state;

      // control LEDs
      console.log(`blinking at place ${index + 1} (${state})`);
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

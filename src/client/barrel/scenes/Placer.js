import * as soundworks from 'soundworks/client';

export default class Placer {
  constructor(experience) {
    this.experience = experience;
    this.callbacks = [];

    this.onDone = this.onDone.bind(this);
    experience.receive('placerDone', this.onDone);
  }

  start(index, callback = function() {}) {
    this.callbacks[index] = callback;
  }

  stop(index) {
    delete this.callbacks[index];
  }

  clear() {
    this.callbacks = [];
  }

  onDone(index) {
    const callback = this.callbacks[index];

    if (callback)
      callback(index);
  }
}

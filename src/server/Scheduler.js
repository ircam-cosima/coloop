import SchedulingQueue from './waves-audio/scheduling-queue';

export default class Scheduler extends SchedulingQueue {
  constructor(sync, options = {}) {
    super();

    this.sync = sync;

    this.__currentTime = null;
    this.__nextTime = Infinity;
    this.__timeout = null;

    /**
     * scheduler (setTimeout) period
     * @type {Number}
     */
    this.period = options.period ||  0.025;
  }

  // setTimeout scheduling loop
  __tick() {
    const sync = this.sync;
    const currentTime = sync.getSyncTime();
    let time = this.__nextTime;

    this.__timeout = null;

    while (time <= currentTime) {
      this.__currentTime = time;
      time = this.advanceTime(time);
    }

    this.__currentTime = null;
    this.resetTime(time);
  }

  resetTime(time = this.currentTime) {
    if (this.__timeout) {
      clearTimeout(this.__timeout);
      this.__timeout = null;
    }

    if (time !== Infinity) {
      const timeOutDelay = Math.max((time - this.sync.getSyncTime()), this.period);

      this.__timeout = setTimeout(() => {
        this.__tick();
      }, timeOutDelay * 1000);
    }

    this.__nextTime = time;
  }

  get currentTime() {
    return this.__currentTime || this.sync.getSyncTime();
  }
}

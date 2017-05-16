import { Experience } from 'soundworks/server';

export default class BarrelExperience extends Experience {
  constructor(clientType) {
    super(clientType);

    this.sharedParams = this.require('shared-params');
    this.audioBufferManager = this.require('audio-buffer-manager');
    this.metricScheduler = this.require('metric-scheduler');
  }
}

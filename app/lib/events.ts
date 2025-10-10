import { EventEmitter } from 'events';

type BuildCompletedPayload = { projectId: string };

class Bus extends EventEmitter {
  emitBuildCompleted(payload: BuildCompletedPayload) {
    this.emit('build:completed', payload);
  }
  onBuildCompleted(fn: (p: BuildCompletedPayload) => void) {
    this.on('build:completed', fn);
    return () => {
      this.off('build:completed', fn);
    };
  }
}

export const bus = new Bus();

/** Track document-level effects owned by this full-page application, not by the reader. */
export class Lifetime {
  private cleanup: (() => void)[] = [];
  private frames = new Set<number>();
  private timers = new Set<ReturnType<typeof setTimeout>>();
  disposed = false;
  listen(
    target: EventTarget,
    type: string,
    listener: EventListener,
    options?: AddEventListenerOptions | boolean,
  ) {
    target.addEventListener(type, listener, options);
    this.cleanup.push(() =>
      target.removeEventListener(type, listener, options),
    );
  }
  frame(callback: FrameRequestCallback) {
    if (this.disposed) return 0;
    const id = requestAnimationFrame((time) => {
      this.frames.delete(id);
      if (!this.disposed) callback(time);
    });
    this.frames.add(id);
    return id;
  }
  timeout(callback: () => void, delay: number) {
    const id = setTimeout(() => {
      this.timers.delete(id);
      if (!this.disposed) callback();
    }, delay);
    this.timers.add(id);
    return id;
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.cleanup.forEach((fn) => fn());
    this.cleanup = [];
    this.frames.forEach(cancelAnimationFrame);
    this.frames.clear();
    this.timers.forEach(clearTimeout);
    this.timers.clear();
  }
}

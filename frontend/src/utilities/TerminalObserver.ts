type TerminalObserverCallback = (key: string, content: string) => void;

class TerminalObserver {
  private observers: Map<string, TerminalObserverCallback[]> = new Map();

  subscribe(key: string, callback: TerminalObserverCallback) {
    if (!this.observers.has(key)) {
      this.observers.set(key, []);
    }
    this.observers.get(key)?.push(callback);
  }

  notify(key: string, content: string) {
    if (this.observers.has(key)) {
      this.observers.get(key)?.forEach((callback) => callback(key, content));
    }
  }

  unsubscribe(key: string, callback: TerminalObserverCallback) {
    if (this.observers.has(key)) {
      const callbacks = this.observers
        .get(key)
        ?.filter((cb) => cb !== callback);
      if (callbacks) {
        this.observers.set(key, callbacks);
      }
    }
  }
}

export default new TerminalObserver();

export class TempStore<KEY, VALUE> {
  private store: Map<KEY, { value: VALUE, timeoutId: NodeJS.Timeout }>;

  constructor() {
    this.store = new Map();
  }

  set(key: KEY, value: VALUE, ttl: number = 300) {
    if (this.store.has(key)) {
      clearTimeout(this.store.get(key)!.timeoutId);
    }
    const timeoutId = setTimeout(() => this.store.delete(key), ttl * 1000);
    this.store.set(key, { value, timeoutId });
  }

  get(key: KEY) {
    const item = this.store.get(key);
    return item ? item.value : undefined;
  }

  getMap() {
	return this.store;
  }

  resetTTL(key: KEY, ttl: number = 300) {
    if (this.store.has(key)) {
      clearTimeout(this.store.get(key)!.timeoutId);
      const timeoutId = setTimeout(() => this.store.delete(key), ttl * 1000);
      const value = this.store.get(key)!.value;
      this.store.set(key, { value, timeoutId });
    }
  }
}
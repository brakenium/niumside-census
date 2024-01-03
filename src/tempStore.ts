export class TempStore<KEY, VALUE> {
  private store: Map<KEY, { value: VALUE, timeoutId: NodeJS.Timeout }>;
  private ttl: number;

  constructor(ttl: number) {
    this.store = new Map();
	this.ttl = ttl;
  }

  set(key: KEY, value: VALUE) {
    if (this.store.has(key)) {
      clearTimeout(this.store.get(key)!.timeoutId);
    }
    const timeoutId = setTimeout(() => this.store.delete(key), this.ttl);
    this.store.set(key, { value, timeoutId });
  }

  get(key: KEY) {
    const item = this.store.get(key);
    return item ? item.value : undefined;
  }

  getMap() {
	return this.store;
  }

  resetTTL(key: KEY) {
    if (this.store.has(key)) {
      clearTimeout(this.store.get(key)!.timeoutId);
      const timeoutId = setTimeout(() => this.store.delete(key), this.ttl);
      const value = this.store.get(key)!.value;
      this.store.set(key, { value, timeoutId });
    }
  }
}
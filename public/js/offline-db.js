/**
 * Minimal IndexedDB layer backing AgriFinance's offline-first behaviour:
 *   - `queue`  writes made while offline, replayed to the server once the
 *              connection returns (auth and AI-chat calls are excluded —
 *              see api.js — since "queue a login" doesn't make sense)
 *   - `cache`  the last-known response for every GET, so pages can still
 *              render real data (not just a blank screen) when offline
 *
 * No external library — a farm-management PWA that needs to survive on
 * 2G/no signal shouldn't also need to ship a dependency for this.
 */
const OfflineDB = {
  _db: null,
  NAME: 'agrifinance-offline',
  VERSION: 1,

  open() {
    if (this._db) return Promise.resolve(this._db);
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(this.NAME, this.VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('queue')) {
          db.createObjectStore('queue', { keyPath: 'id', autoIncrement: true });
        }
        if (!db.objectStoreNames.contains('cache')) {
          db.createObjectStore('cache', { keyPath: 'url' });
        }
      };
      req.onsuccess = () => { this._db = req.result; resolve(this._db); };
      req.onerror = () => reject(req.error);
    });
  },

  async enqueue(entry) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('queue', 'readwrite');
      tx.objectStore('queue').add({ ...entry, createdAt: Date.now() });
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
  },

  async getQueue() {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const req = db.transaction('queue', 'readonly').objectStore('queue').getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  },

  async removeFromQueue(id) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('queue', 'readwrite');
      tx.objectStore('queue').delete(id);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
  },

  async queueCount() {
    return (await this.getQueue()).length;
  },

  async setCache(url, data) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('cache', 'readwrite');
      tx.objectStore('cache').put({ url, data, cachedAt: Date.now() });
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
  },

  async getCache(url) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const req = db.transaction('cache', 'readonly').objectStore('cache').get(url);
      req.onsuccess = () => resolve(req.result ? req.result.data : null);
      req.onerror = () => reject(req.error);
    });
  },

  /** Rough storage-quota read for the "storage management" behaviour. */
  async storageEstimate() {
    if (navigator.storage && navigator.storage.estimate) {
      const { usage, quota } = await navigator.storage.estimate();
      return { usage, quota, percent: quota ? Math.round((usage / quota) * 100) : 0 };
    }
    return null;
  },

  /**
   * Drops cached GET responses older than maxAgeMs once storage pressure is
   * high. The write queue is never touched by this — unsynced farm records
   * are never purged, only the disposable read-cache is.
   */
  async purgeStaleCache(maxAgeMs = 7 * 24 * 60 * 60 * 1000) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('cache', 'readwrite');
      const store = tx.objectStore('cache');
      const req = store.getAll();
      req.onsuccess = () => {
        const now = Date.now();
        (req.result || []).forEach((row) => {
          if (now - row.cachedAt > maxAgeMs) store.delete(row.url);
        });
      };
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
  },

  /** Called on load: if storage is under real pressure, purge stale cache. */
  async maybePurge() {
    const est = await this.storageEstimate();
    if (est && est.percent >= 80) await this.purgeStaleCache();
  }
};

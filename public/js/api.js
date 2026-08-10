/* Thin fetch wrapper: attaches the JWT, base-URLs every call to /api, and
   throws a readable Error with the server's message on failure.

   Offline-first layer: GET responses are cached in IndexedDB (offline-db.js)
   as they arrive; if a request fails because the device is actually offline
   (not because the server returned an error), GETs fall back to that cache
   and writes are queued and replayed automatically once the connection
   returns. Auth and AI-chat calls are excluded from queuing on purpose —
   "log in" or "ask the assistant" while offline isn't something that makes
   sense to silently retry minutes later. */
const API = {
  base: '/api',
  NO_QUEUE_PREFIXES: ['/auth', '/assistant'],

  token() {
    return localStorage.getItem('af_token');
  },

  setSession(token, user) {
    localStorage.setItem('af_token', token);
    localStorage.setItem('af_user', JSON.stringify(user));
  },

  clearSession() {
    localStorage.removeItem('af_token');
    localStorage.removeItem('af_user');
  },

  currentUser() {
    try { return JSON.parse(localStorage.getItem('af_user')); } catch (e) { return null; }
  },

  async request(method, path, body) {
    const headers = { 'Content-Type': 'application/json' };
    const t = this.token();
    if (t) headers['Authorization'] = `Bearer ${t}`;
    const url = this.base + path;

    let res;
    try {
      res = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined
      });
    } catch (networkErr) {
      // fetch() itself threw — genuinely offline/unreachable, not a server
      // error. Fall back to the offline cache/queue instead of surfacing a
      // raw network exception.
      return this._handleOffline(method, path, url, body);
    }

    let data = null;
    try { data = await res.json(); } catch (e) { /* no body */ }

    if (!res.ok) {
      if (res.status === 401) {
        API.clearSession();
        if (!location.pathname.endsWith('index.html') && location.pathname !== '/') {
          location.href = '/index.html';
        }
      }
      throw new Error((data && data.error) || `Request failed (${res.status})`);
    }

    if (method === 'GET' && window.OfflineDB) {
      OfflineDB.setCache(url, data).catch(() => {});
    }

    return data;
  },

  async _handleOffline(method, path, url, body) {
    if (!window.OfflineDB) throw new Error('You appear to be offline.');

    if (method === 'GET') {
      const cached = await OfflineDB.getCache(url).catch(() => null);
      if (cached) return { ...cached, _offline: true };
      throw new Error('You\u2019re offline and this page hasn\u2019t been loaded before, so there\u2019s no saved copy to show yet.');
    }

    if (this.NO_QUEUE_PREFIXES.some((p) => path.startsWith(p))) {
      throw new Error('This needs an internet connection.');
    }

    await OfflineDB.enqueue({ method, path, body });
    document.dispatchEvent(new CustomEvent('af:queue-changed'));
    if (window.Toast) Toast.info('You\u2019re offline — saved on this device and will sync automatically once you\u2019re back online.');
    return { _queued: true, ...(body || {}) };
  },

  /** Replays every queued write, in order, once the connection is back. */
  async flushQueue() {
    if (!window.OfflineDB || !navigator.onLine) return;
    const items = await OfflineDB.getQueue().catch(() => []);
    if (!items.length) return;

    let syncedCount = 0;
    for (const item of items) {
      try {
        const headers = { 'Content-Type': 'application/json' };
        const t = this.token();
        if (t) headers['Authorization'] = `Bearer ${t}`;
        const res = await fetch(this.base + item.path, {
          method: item.method,
          headers,
          body: item.body ? JSON.stringify(item.body) : undefined
        });
        // Drop it on success or on a permanent client error (4xx) we can't
        // usefully retry. Only a network failure or 5xx leaves it queued.
        if (res.ok || (res.status >= 400 && res.status < 500)) {
          await OfflineDB.removeFromQueue(item.id);
          if (res.ok) syncedCount += 1;
        }
      } catch (err) {
        break; // still offline/unreachable — stop, retry on the next 'online' event
      }
    }
    document.dispatchEvent(new CustomEvent('af:queue-changed'));
    if (syncedCount > 0 && window.Toast) {
      Toast.success(`Synced ${syncedCount} offline change${syncedCount === 1 ? '' : 's'}.`);
    }
  },

  /** Call once per page: registers the service worker and wires up sync. */
  initOffline() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
    if (window.OfflineDB) OfflineDB.maybePurge().catch(() => {});
    window.addEventListener('online', () => this.flushQueue());
    if (navigator.onLine) this.flushQueue();
  },

  get(path) { return this.request('GET', path); },
  post(path, body) { return this.request('POST', path, body); },
  patch(path, body) { return this.request('PATCH', path, body); },
  del(path) { return this.request('DELETE', path); }
};

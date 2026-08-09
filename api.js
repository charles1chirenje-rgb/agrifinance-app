/* Thin fetch wrapper: attaches the JWT, base-URLs every call to /api, and
   throws a readable Error with the server's message on failure. */
const API = {
  base: '/api',

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

    const res = await fetch(this.base + path, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    });

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
    return data;
  },

  get(path) { return this.request('GET', path); },
  post(path, body) { return this.request('POST', path, body); },
  patch(path, body) { return this.request('PATCH', path, body); },
  del(path) { return this.request('DELETE', path); }
};

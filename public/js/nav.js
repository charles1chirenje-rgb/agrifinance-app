/* Runs on every protected page: bounces to login if no token, then paints
   the top navigation bar (with role-aware links) into #topbar, and wires up
   the offline-first layer (service worker + sync banner) shared by every
   authenticated page. */
(function () {
  const user = API.currentUser();
  if (!API.token() || !user) {
    location.href = '/index.html';
    return;
  }

  API.initOffline();

  const links = [
    { href: '/dashboard.html', label: 'Dashboard' },
    { href: '/ledger.html', label: 'Ledger & Loans' },
    { href: '/crops.html', label: 'Crops' },
    { href: '/livestock.html', label: 'Livestock' },
    { href: '/forecast.html', label: 'Forecast' },
    { href: '/roi.html', label: 'ROI' },
    { href: '/marketplace.html', label: 'Marketplace' },
    { href: '/community.html', label: 'Community' }
  ];
  if (user.role === 'admin') links.push({ href: '/admin.html', label: 'Admin' });

  const current = location.pathname.split('/').pop() || 'dashboard.html';

  const el = document.getElementById('topbar');
  if (!el) return;

  el.innerHTML = `
    <a class="brand" href="/dashboard.html">
      <span class="stamp">AF</span> AgriFinance
    </a>
    <nav class="nav-links">
      ${links.map(l => `<a href="${l.href}" class="${l.href.endsWith(current) ? 'active' : ''}">${l.label}</a>`).join('')}
    </nav>
    <div class="user-chip">
      <span>${user.name} &middot; ${user.farmName || 'Farm 54'}</span>
      <span class="role-badge">${user.role}</span>
      <button class="btn-logout" id="logoutBtn">Log out</button>
    </div>
  `;

  document.getElementById('logoutBtn').addEventListener('click', () => {
    API.clearSession();
    location.href = '/index.html';
  });

  // --- Offline / sync status banner -------------------------------------
  const banner = document.createElement('div');
  banner.id = 'offlineBanner';
  banner.className = 'offline-banner hidden';
  document.body.prepend(banner);

  async function refreshBanner() {
    const pending = window.OfflineDB ? await OfflineDB.queueCount().catch(() => 0) : 0;
    if (!navigator.onLine) {
      banner.textContent = pending > 0
        ? `You're offline — showing saved data. ${pending} change${pending === 1 ? '' : 's'} will sync automatically once you're back online.`
        : "You're offline — showing the last saved copy of this page.";
      banner.className = 'offline-banner offline-banner-offline';
    } else if (pending > 0) {
      banner.textContent = `Syncing ${pending} offline change${pending === 1 ? '' : 's'}…`;
      banner.className = 'offline-banner offline-banner-syncing';
    } else {
      banner.className = 'offline-banner hidden';
    }
  }

  window.addEventListener('online', refreshBanner);
  window.addEventListener('offline', refreshBanner);
  document.addEventListener('af:queue-changed', refreshBanner);
  refreshBanner();
})();

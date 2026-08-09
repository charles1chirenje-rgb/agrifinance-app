/* Runs on every protected page: bounces to login if no token, then paints
   the top navigation bar (with role-aware links) into #topbar. */
(function () {
  const user = API.currentUser();
  if (!API.token() || !user) {
    location.href = '/index.html';
    return;
  }

  const links = [
    { href: '/dashboard.html', label: 'Dashboard' },
    { href: '/ledger.html', label: 'Ledger & Loans' },
    { href: '/crops.html', label: 'Crops' },
    { href: '/livestock.html', label: 'Livestock' },
    { href: '/forecast.html', label: 'Forecast' },
    { href: '/roi.html', label: 'ROI' }
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
})();

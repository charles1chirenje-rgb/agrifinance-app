/* Promise-based confirm/prompt dialogs styled to match the app, so we never
   fall back to the browser's native confirm()/prompt(). */
const Modal = {
  confirm(message, { danger = false } = {}) {
    return new Promise((resolve) => {
      const backdrop = document.createElement('div');
      backdrop.className = 'modal-backdrop';
      backdrop.innerHTML = `
        <div class="modal" style="max-width:380px;">
          <p style="margin-bottom:20px;color:var(--ink);">${message}</p>
          <div style="display:flex;gap:10px;">
            <button class="btn btn-secondary" style="flex:1;" data-a="cancel">Cancel</button>
            <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" style="flex:1;" data-a="ok">${danger ? 'Delete' : 'Confirm'}</button>
          </div>
        </div>`;
      document.body.appendChild(backdrop);
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop || e.target.dataset.a === 'cancel') { backdrop.remove(); resolve(false); }
        if (e.target.dataset.a === 'ok') { backdrop.remove(); resolve(true); }
      });
    });
  },

  prompt(message, { placeholder = '', type = 'text', defaultValue = '' } = {}) {
    return new Promise((resolve) => {
      const backdrop = document.createElement('div');
      backdrop.className = 'modal-backdrop';
      backdrop.innerHTML = `
        <div class="modal" style="max-width:380px;">
          <p style="margin-bottom:12px;color:var(--ink);">${message}</p>
          <input type="${type}" id="modalPromptInput" placeholder="${placeholder}" value="${defaultValue}" style="margin-bottom:18px;" step="0.01">
          <div style="display:flex;gap:10px;">
            <button class="btn btn-secondary" style="flex:1;" data-a="cancel">Cancel</button>
            <button class="btn btn-primary" style="flex:1;" data-a="ok">Save</button>
          </div>
        </div>`;
      document.body.appendChild(backdrop);
      const input = backdrop.querySelector('#modalPromptInput');
      input.focus();
      const finish = (val) => { backdrop.remove(); resolve(val); };
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop || e.target.dataset.a === 'cancel') finish(null);
        if (e.target.dataset.a === 'ok') finish(input.value);
      });
      input.addEventListener('keydown', (e) => { if (e.key === 'Enter') finish(input.value); });
    });
  }
};

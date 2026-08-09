/* Floating AI Farm Assistant, mounted on every protected page (invoked from
   nav.js after the topbar renders). Chat history lives only in memory for
   this page view - each page load starts fresh, keeping the server stateless. */
(function () {
  let history = [];
  let open = false;

  const host = document.createElement('div');
  host.id = 'assistantHost';
  host.innerHTML = `
    <button id="assistantToggle" class="assistant-fab" title="Ask the Farm Assistant" aria-label="Open Farm Assistant">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
    </button>
    <div id="assistantPanel" class="assistant-panel hidden">
      <div class="assistant-head">
        <div>
          <strong>Farm Assistant</strong>
          <div style="font-size:0.72rem;color:var(--ink-soft);">Grounded in your live farm data</div>
        </div>
        <button id="assistantClose" class="modal-close">&times;</button>
      </div>
      <div id="assistantMessages" class="assistant-messages">
        <div class="assistant-msg assistant-msg-bot">
          Hi! I'm your Farm Assistant. Ask me about your crops, livestock, cash flow, loans or ROI — I read straight from your live records. Try: <em>"How's my sugar cane doing?"</em>
        </div>
      </div>
      <form id="assistantForm" class="assistant-input-row">
        <input type="text" id="assistantInput" placeholder="Ask about your farm…" autocomplete="off">
        <button type="submit" class="btn btn-primary btn-sm">Send</button>
      </form>
    </div>
  `;
  document.body.appendChild(host);

  const panel = document.getElementById('assistantPanel');
  const toggle = document.getElementById('assistantToggle');
  const messages = document.getElementById('assistantMessages');
  const form = document.getElementById('assistantForm');
  const input = document.getElementById('assistantInput');

  function setOpen(v) {
    open = v;
    panel.classList.toggle('hidden', !open);
    if (open) input.focus();
  }
  toggle.addEventListener('click', () => setOpen(!open));
  document.getElementById('assistantClose').addEventListener('click', () => setOpen(false));

  function addMessage(text, who) {
    const div = document.createElement('div');
    div.className = `assistant-msg assistant-msg-${who}`;
    div.textContent = text;
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
    return div;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    input.value = '';
    addMessage(text, 'user');
    history.push({ role: 'user', content: text });

    const thinking = addMessage('Thinking…', 'bot');
    thinking.classList.add('assistant-thinking');

    try {
      const res = await API.post('/assistant/chat', { messages: history });
      thinking.remove();
      addMessage(res.reply, 'bot');
      history.push({ role: 'assistant', content: res.reply });
    } catch (err) {
      thinking.remove();
      addMessage(err.message || "I couldn't reach the assistant just now.", 'bot');
    }
  });
})();

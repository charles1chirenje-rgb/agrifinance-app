document.addEventListener('DOMContentLoaded', () => {
  // Ensure the container exists in the DOM
  let container = document.getElementById('assistant-widget-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'assistant-widget-container';
    document.body.appendChild(container);
  }

  // Inject the floating button and chat drawer HTML
  container.innerHTML = `
    <div id="aiAssistantWrapper" style="position: fixed; bottom: 24px; right: 24px; z-index: 99999; font-family: system-ui, sans-serif;">
      <button id="aiToggleBtn" style="background: #47552f; color: #fff; border: none; border-radius: 50px; padding: 12px 20px; font-weight: 600; cursor: pointer; box-shadow: 0 4px 16px rgba(0,0,0,0.2); display: flex; align-items: center; gap: 8px; font-size: 0.9rem; transition: transform 0.2s;">
        <span>💬</span> Agri Assistant
      </button>
      <div id="aiChatBox" class="hidden" style="position: absolute; bottom: 64px; right: 0; width: 340px; height: 420px; background: #fff; border: 1px solid #d8cdb3; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.15); display: flex; flex-direction: column; overflow: hidden;">
        <div style="background: #47552f; color: #fff; padding: 14px 16px; font-weight: 600; display: flex; justify-content: space-between; align-items: center; font-size: 0.95rem;">
          <span>Agronomy AI (Offline Ready)</span>
          <button id="aiCloseBtn" style="background: none; border: none; color: #fff; cursor: pointer; font-size: 18px; padding: 0 4px;">&times;</button>
        </div>
        <div id="aiMessages" style="padding: 14px; flex: 1; overflow-y: auto; font-size: 0.85rem; background: #fcfbfa; display: flex; flex-direction: column; gap: 10px;">
          <div style="background: #f0eee6; color: #2c2a24; padding: 10px 14px; border-radius: 8px; align-self: flex-start; max-width: 85%; line-height: 1.4;">
            Hello! I'm your AgriFinance offline assistant. How can I help you manage your farm today?
          </div>
        </div>
        <div style="padding: 10px 12px; border-top: 1px solid #d8cdb3; display: flex; gap: 8px; background: #fff;">
          <input type="text" id="aiInput" placeholder="Ask about crops, risks, balances..." style="flex: 1; padding: 10px 12px; border: 1px solid #d8cdb3; border-radius: 6px; font-size: 0.85rem; outline: none;">
          <button id="aiSendBtn" style="background: #47552f; color: #fff; border: none; padding: 0 16px; border-radius: 6px; cursor: pointer; font-weight: 600;">Send</button>
        </div>
      </div>
    </div>
  `;

  const toggleBtn = document.getElementById('aiToggleBtn');
  const chatBox = document.getElementById('aiChatBox');
  const closeBtn = document.getElementById('aiCloseBtn');
  const sendBtn = document.getElementById('aiSendBtn');
  const input = document.getElementById('aiInput');
  const messages = document.getElementById('aiMessages');

  // Toggle visibility logic
  toggleBtn.addEventListener('click', () => {
    const isHidden = chatBox.classList.toggle('hidden');
    chatBox.style.display = isHidden ? 'none' : 'flex';
    if (!isHidden) input.focus();
  });

  closeBtn.addEventListener('click', () => {
    chatBox.classList.add('hidden');
    chatBox.style.display = 'none';
  });

  // Initial state setup for safety
  chatBox.style.display = 'none';

  async function handleSend() {
    const text = input.value.trim();
    if (!text) return;

    // Append user message
    messages.innerHTML += `<div style="background: #47552f; color: #fff; padding: 10px 14px; border-radius: 8px; align-self: flex-end; max-width: 85%; line-height: 1.4;">${text}</div>`;
    input.value = '';
    messages.scrollTop = messages.scrollHeight;

    try {
      const res = await fetch('/api/assistant/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text })
      });
      const data = await res.json();
      const reply = data.reply || "Offline assistant active.";
      
      messages.innerHTML += `<div style="background: #f0eee6; color: #2c2a24; padding: 10px 14px; border-radius: 8px; align-self: flex-start; max-width: 85%; line-height: 1.4;">${reply}</div>`;
    } catch (err) {
      messages.innerHTML += `<div style="background: #f0eee6; color: #2c2a24; padding: 10px 14px; border-radius: 8px; align-self: flex-start; max-width: 85%; line-height: 1.4;">Offline mode active. Local assistant fallback engaged.</div>`;
    }
    messages.scrollTop = messages.scrollHeight;
  }

  sendBtn.addEventListener('click', handleSend);
  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSend();
  });
});
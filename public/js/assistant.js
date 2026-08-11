/**
 * Offline Rule-Based & Personal-Data Grounded Farm Assistant
 * Answers farming questions locally using real-time user data.
 */
(function () {
  // 1. Static Knowledge Base for General Farming Queries
  const farmingKnowledge = [
    {
      keywords: ['sugarcane', 'sugar cane', 'cane', 'yield', 'maturing', 'harvest'],
      answer: "Sugarcane in Zimbabwe generally operates on a 12 to 14-month growth cycle. Keep an eye on leaf color during the ripening phase; reducing irrigation 4–6 weeks before harvest increases sucrose content."
    },
    {
      keywords: ['fertilizer', 'fertiliser', 'urea', 'npk', 'top dress', 'basal'],
      answer: "Apply Basal fertilizer at planting time (high in Phosphorus for root development). Top-dress with Nitrogen (Urea/AN) around 6 to 9 weeks after emergence, preferably when soil is moist."
    },
    {
      keywords: ['water', 'irrigation', 'rain', 'dry', 'drought'],
      answer: "Ensure soil stays moist during vegetative growth. Drip and center-pivot irrigation save up to 30-40% water compared to furrow flooding."
    },
    {
      keywords: ['pest', 'disease', 'borer', 'smut', 'rust'],
      answer: "Inspect crops weekly for stalk borers or leaf rust. For sugarcane smut, rogue out infected stools immediately and burn them away from the field."
    },
    {
      keywords: ['livestock', 'cattle', 'goat', 'feed', 'vaccine', 'dip'],
      answer: "Ensure livestock dipping/spraying occurs weekly during the rainy season to prevent tick-borne diseases like Heartwater and November disease."
    }
  ];

  // 2. Dynamic Personal Data Answer Engine
  async function generatePersonalAnswer(query) {
    const q = query.toLowerCase();

    // Fetch current user's live data
    let balance = 0, income = 0, expense = 0, activeCrops = [], loans = [], livestock = [];
    try {
      if (window.API) {
        const [dash, cropData, loanData, stockData] = await Promise.all([
          API.get('/dashboard').catch(() => ({})),
          API.get('/crops').catch(() => ({ crops: [] })),
          API.get('/loans').catch(() => ({ loans: [] })),
          API.get('/livestock').catch(() => ({ livestock: [] }))
        ]);
        
        balance = dash.balance || 0;
        income = dash.totalIncome || 0;
        expense = dash.totalExpense || 0;
        activeCrops = cropData.crops || [];
        loans = loanData.loans || [];
        livestock = stockData.livestock || [];
      }
    } catch (e) {
      console.warn('Assistant running in fallback offline mode.');
    }

    const money = n => `$${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

    // --- FINANCIAL QUERIES ---
    if (q.includes('balance') || q.includes('money') || q.includes('cash') || q.includes('profit')) {
      return `Your current net balance is **${money(balance)}**.\n\n* Total Income logged: **${money(income)}**\n* Total Expenses logged: **${money(expense)}**`;
    }

    if (q.includes('loan') || q.includes('debt') || q.includes('borrow')) {
      if (!loans.length) return "You currently have no active or recorded loans on file.";
      const activeLoans = loans.filter(l => l.status !== 'repaid');
      const totalOutstanding = activeLoans.reduce((sum, l) => sum + (l.amount - (l.repaidAmount || 0)), 0);
      return `You have **${activeLoans.length} active loan(s)** with a total remaining balance of **${money(totalOutstanding)}**.`;
    }

    // --- CROP QUERIES ---
    if (q.includes('my crop') || q.includes('my plants') || q.includes('field') || q.includes('what am i growing')) {
      if (!activeCrops.length) return "You haven't logged any crops yet. Go to the **Crops** tab to add your fields!";
      const cropList = activeCrops.map(c => `• **${c.name}** (${c.areaHa || 'N/A'} ha) - Stage: *${c.stage || 'Planted'}*`).join('\n');
      return `Here are your current active crops:\n\n${cropList}`;
    }

    // --- LIVESTOCK QUERIES ---
    if (q.includes('my livestock') || q.includes('animals') || q.includes('cattle') || q.includes('goats')) {
      if (!livestock.length) return "No livestock recorded yet. You can track animals under the **Livestock** tab.";
      const totalHead = livestock.reduce((acc, curr) => acc + (curr.quantity || 1), 0);
      return `You have **${totalHead} head of livestock** registered on the farm across ${livestock.length} records.`;
    }

    // --- GENERAL KNOWLEDGE SEARCH ---
    for (const entry of farmingKnowledge) {
      if (entry.keywords.some(kw => q.includes(kw))) {
        return entry.answer;
      }
    }

    // --- DEFAULT FALLBACK ---
    return "I am your offline AgriFinance assistant! You can ask me about:\n\n" +
      "1. **Your Finances:** *'What is my balance?'*, *'How much debt do I have?'*\n" +
      "2. **Your Crops & Animals:** *'What am I growing?'*, *'How many livestock do I have?'*\n" +
      "3. **Farming Advice:** *'When to apply fertilizer?'*, *'How to manage sugarcane?'*";
  }

  // 3. UI Widget Injector
  function initAssistantWidget() {
    if (document.getElementById('aiAssistantBtn')) return; // Prevent duplicates

    const btn = document.createElement('button');
    btn.id = 'aiAssistantBtn';
    btn.innerHTML = '💬';
    btn.setAttribute('style', 'position:fixed;bottom:20px;right:20px;width:52px;height:52px;border-radius:50%;background:#47552f;color:#fff;border:none;font-size:22px;cursor:pointer;box-shadow:0 4px 12px rgba(0,0,0,0.25);z-index:9999;');
    
    const panel = document.createElement('div');
    panel.id = 'aiAssistantPanel';
    panel.setAttribute('style', 'display:none;position:fixed;bottom:80px;right:20px;width:320px;height:420px;background:#fff;border:1px solid #d8cdb3;border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,0.15);z-index:9999;flex-direction:column;overflow:hidden;font-family:sans-serif;');

    panel.innerHTML = `
      <div style="background:#333f20;color:#fff;padding:12px 16px;font-weight:600;display:flex;justify-content:space-between;align-items:center;">
        <span>AgriAssistant (Offline)</span>
        <button id="aiCloseBtn" style="background:none;border:none;color:#fff;font-size:16px;cursor:pointer;">✕</button>
      </div>
      <div id="aiChatBox" style="flex:1;padding:12px;overflow-y:auto;font-size:0.85rem;line-height:1.4;color:#2c2823;background:#faf8f5;">
        <div style="background:#e8e2d5;padding:8px 12px;border-radius:8px;margin-bottom:8px;">
          Hello! Ask me about your farm balance, crops, loans, or general agronomy advice.
        </div>
      </div>
      <div style="padding:8px;border-top:1px solid #e8e2d5;display:flex;gap:6px;">
        <input type="text" id="aiInput" placeholder="Ask a question..." style="flex:1;padding:8px;border:1px solid #ccc;border-radius:6px;font-size:0.85rem;" />
        <button id="aiSendBtn" style="background:#47552f;color:#fff;border:none;padding:8px 12px;border-radius:6px;cursor:pointer;">Send</button>
      </div>
    `;

    document.body.appendChild(btn);
    document.body.appendChild(panel);

    // Event Listeners
    btn.onclick = () => {
      panel.style.display = panel.style.display === 'none' ? 'flex' : 'none';
    };

    document.getElementById('aiCloseBtn').onclick = () => {
      panel.style.display = 'none';
    };

    const chatBox = document.getElementById('aiChatBox');
    const input = document.getElementById('aiInput');

    async function handleSend() {
      const text = input.value.trim();
      if (!text) return;

      // User Message
      chatBox.innerHTML += `<div style="text-align:right;margin-bottom:8px;"><span style="background:#47552f;color:#fff;padding:6px 10px;border-radius:8px;display:inline-block;">${text}</span></div>`;
      input.value = '';
      chatBox.scrollTop = chatBox.scrollHeight;

      // Bot Answer
      const reply = await generatePersonalAnswer(text);
      chatBox.innerHTML += `<div style="text-align:left;margin-bottom:8px;"><span style="background:#e8e2d5;color:#2c2823;padding:8px 12px;border-radius:8px;display:inline-block;">${reply.replace(/\n/g, '<br>')}</span></div>`;
      chatBox.scrollTop = chatBox.scrollHeight;
    }

    document.getElementById('aiSendBtn').onclick = handleSend;
    input.onkeypress = (e) => { if (e.key === 'Enter') handleSend(); };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAssistantWidget);
  } else {
    initAssistantWidget();
  }
})();
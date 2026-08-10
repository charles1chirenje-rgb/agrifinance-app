/**
 * Voice-note field logging. Wraps the browser's native Web Speech API
 * (SpeechRecognition) so a farmer can dictate a field note instead of typing
 * — useful with dirty hands, gloves, or mid-task. Pure browser API, no
 * external service, no cost, degrades invisibly on unsupported browsers.
 */
const VoiceInput = {
  supported() {
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  },

  /**
   * Attaches a mic button next to `inputEl` that dictates into it.
   * Does nothing (and adds no UI) if the browser doesn't support speech
   * recognition, so the rest of the form still works normally everywhere.
   */
  attach(inputEl) {
    if (!this.supported() || !inputEl || inputEl.dataset.voiceAttached) return;
    inputEl.dataset.voiceAttached = 'true';

    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new Recognition();
    recognition.lang = 'en-ZA';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'mic-btn';
    btn.title = 'Dictate this note';
    btn.innerHTML = `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke-width="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>`;
    inputEl.insertAdjacentElement('afterend', btn);

    let listening = false;

    recognition.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      inputEl.value = inputEl.value ? `${inputEl.value} ${transcript}` : transcript;
      inputEl.dispatchEvent(new Event('input'));
    };
    recognition.onend = () => { listening = false; btn.classList.remove('mic-listening'); };
    recognition.onerror = () => { listening = false; btn.classList.remove('mic-listening'); };

    btn.addEventListener('click', () => {
      if (listening) { recognition.stop(); return; }
      try {
        recognition.start();
        listening = true;
        btn.classList.add('mic-listening');
      } catch (err) {
        // start() throws if already running — ignore, user can just retry
      }
    });
  }
};

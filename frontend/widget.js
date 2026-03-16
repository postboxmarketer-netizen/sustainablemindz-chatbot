/**
 * Sustainable Mindz Chat Widget
 * Self-contained — no external dependencies
 * Usage: <script src="widget.js" data-api="https://your-backend-url"></script>
 */
(function () {
  "use strict";

  // ── Config ─────────────────────────────────────────────────────────────────
  const currentScript = document.currentScript;
  const API_BASE = (currentScript && currentScript.getAttribute("data-api")) || "http://localhost:8000";
  const LOGO_URL = (currentScript && currentScript.getAttribute("data-logo")) || "logo.png";
  const BRAND_COLOR = "#682575";
  const BRAND_COLOR_DARK = "#4a1857";
  const WELCOME_MESSAGE = "Hi! 👋 I'm the Sustainable Mindz assistant. Ask me anything about our digital marketing services, SEO, web design, branding, or how we can help grow your business!";

  // ── Conversation State ─────────────────────────────────────────────────────
  let conversationHistory = [];
  let isOpen = false;
  let isTyping = false;
  let isRecording = false;
  let ttsEnabled = false;

  // ── Styles ─────────────────────────────────────────────────────────────────
  const styles = `
    #sm-chat-wrapper * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }

    @keyframes sm-pulse-ring {
      0%   { transform: scale(1); opacity: 0.6; }
      70%  { transform: scale(1.55); opacity: 0; }
      100% { transform: scale(1.55); opacity: 0; }
    }
    @keyframes sm-bounce {
      0%, 100% { transform: translateY(0); }
      40%       { transform: translateY(-8px); }
      60%       { transform: translateY(-4px); }
    }
    #sm-chat-bubble {
      position: fixed; bottom: 24px; right: 24px; z-index: 99999;
      width: 64px; height: 64px; border-radius: 50%;
      background: ${BRAND_COLOR}; cursor: pointer;
      box-shadow: 0 4px 20px rgba(104,37,117,0.45);
      display: flex; align-items: center; justify-content: center;
      border: none; outline: none;
      animation: sm-bounce 2.4s ease-in-out 2s 3;
      transition: transform 0.2s, box-shadow 0.2s;
      overflow: visible;
    }
    #sm-chat-bubble::before {
      content: '';
      position: absolute; inset: 0; border-radius: 50%;
      background: ${BRAND_COLOR};
      animation: sm-pulse-ring 2s ease-out 1s infinite;
      z-index: -1;
    }
    #sm-chat-bubble:hover { transform: scale(1.1); box-shadow: 0 8px 28px rgba(104,37,117,0.55); }
    #sm-chat-bubble img.sm-bubble-logo { width: 44px; height: 44px; object-fit: contain; border-radius: 50%; background: white; padding: 5px; }

    #sm-unread-badge {
      position: absolute; top: -4px; right: -4px;
      background: #e53935; color: white;
      font-size: 11px; font-weight: 700;
      border-radius: 50%; width: 20px; height: 20px;
      display: flex; align-items: center; justify-content: center;
      border: 2px solid white; display: none;
    }

    #sm-chat-window {
      position: fixed; bottom: 96px; right: 24px; z-index: 99998;
      width: 380px; max-width: calc(100vw - 32px);
      height: 560px; max-height: calc(100vh - 120px);
      background: #fff; border-radius: 16px;
      box-shadow: 0 8px 40px rgba(0,0,0,0.18);
      display: flex; flex-direction: column; overflow: hidden;
      transform: scale(0.95) translateY(10px); opacity: 0;
      transition: transform 0.25s cubic-bezier(0.34,1.56,0.64,1), opacity 0.2s;
      pointer-events: none;
    }
    #sm-chat-window.open {
      transform: scale(1) translateY(0); opacity: 1; pointer-events: all;
    }

    #sm-chat-header {
      background: ${BRAND_COLOR}; color: white;
      padding: 16px 20px; display: flex; align-items: center; gap: 12px;
      flex-shrink: 0;
    }
    #sm-chat-header .sm-avatar {
      width: 42px; height: 42px; border-radius: 50%;
      background: white;
      display: flex; align-items: center; justify-content: center;
      font-size: 20px; flex-shrink: 0;
    }
    #sm-chat-header .sm-header-info { flex: 1; }
    #sm-chat-header .sm-header-info strong { font-size: 15px; display: block; }
    #sm-chat-header .sm-header-info span {
      font-size: 12px; opacity: 0.85; display: flex; align-items: center; gap: 4px;
    }
    #sm-chat-header .sm-online-dot {
      width: 8px; height: 8px; border-radius: 50%; background: #69f0ae; display: inline-block;
    }
    #sm-call-btn {
      background: rgba(255,255,255,0.15); border: none; color: white; cursor: pointer;
      padding: 7px; border-radius: 50%; line-height: 1;
      display: flex; align-items: center; justify-content: center;
      text-decoration: none; transition: background 0.2s;
    }
    #sm-call-btn:hover { background: rgba(255,255,255,0.28); }
    #sm-call-btn svg { width: 18px; height: 18px; fill: white; display: block; }
    #sm-close-btn {
      background: none; border: none; color: white; cursor: pointer;
      padding: 4px; opacity: 0.8; line-height: 1;
      font-size: 22px; display: flex; align-items: center; justify-content: center;
    }
    #sm-close-btn:hover { opacity: 1; }

    #sm-chat-messages {
      flex: 1; overflow-y: auto; padding: 16px 16px 8px;
      display: flex; flex-direction: column; gap: 12px;
      scroll-behavior: smooth;
    }
    #sm-chat-messages::-webkit-scrollbar { width: 4px; }
    #sm-chat-messages::-webkit-scrollbar-track { background: transparent; }
    #sm-chat-messages::-webkit-scrollbar-thumb { background: #ddd; border-radius: 2px; }

    .sm-msg { display: flex; gap: 8px; max-width: 90%; }
    .sm-msg.user { align-self: flex-end; flex-direction: row-reverse; }
    .sm-msg.bot { align-self: flex-start; }

    .sm-msg-avatar {
      width: 30px; height: 30px; border-radius: 50%; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center; font-size: 14px;
    }
    .sm-msg.bot .sm-msg-avatar { background: white; font-size: 13px; }
    .sm-msg.user .sm-msg-avatar { background: #e8f5e9; font-size: 14px; }

    .sm-bubble {
      padding: 10px 14px; border-radius: 16px; font-size: 14px;
      line-height: 1.5; color: #333; max-width: 100%;
    }
    .sm-msg.bot .sm-bubble { background: #f5f5f5; border-bottom-left-radius: 4px; }
    .sm-msg.user .sm-bubble {
      background: ${BRAND_COLOR}; color: white; border-bottom-right-radius: 4px;
    }

    .sm-typing { display: flex; align-items: center; gap: 4px; padding: 12px 14px; }
    .sm-typing span {
      width: 7px; height: 7px; border-radius: 50%;
      background: #aaa; display: inline-block; animation: sm-bounce 1.2s infinite;
    }
    .sm-typing span:nth-child(2) { animation-delay: 0.2s; }
    .sm-typing span:nth-child(3) { animation-delay: 0.4s; }
    @keyframes sm-bounce {
      0%, 60%, 100% { transform: translateY(0); }
      30% { transform: translateY(-5px); }
    }

    #sm-chat-footer { padding: 12px 16px 16px; flex-shrink: 0; border-top: 1px solid #f0f0f0; }
    #sm-chat-form { display: flex; gap: 8px; align-items: flex-end; }
    #sm-chat-input {
      flex: 1; border: 1.5px solid #e0e0e0; border-radius: 24px;
      padding: 10px 16px; font-size: 14px; outline: none; resize: none;
      line-height: 1.4; max-height: 100px; min-height: 42px; overflow-y: auto;
      transition: border-color 0.2s; color: #333;
    }
    #sm-chat-input:focus { border-color: ${BRAND_COLOR}; }
    #sm-chat-input::placeholder { color: #aaa; }
    #sm-send-btn {
      width: 42px; height: 42px; border-radius: 50%; background: ${BRAND_COLOR};
      border: none; cursor: pointer; display: flex; align-items: center;
      justify-content: center; flex-shrink: 0; transition: background 0.2s;
    }
    #sm-send-btn:hover { background: ${BRAND_COLOR_DARK}; }
    #sm-send-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    #sm-send-btn svg { width: 18px; height: 18px; fill: white; }

    #sm-mic-btn {
      width: 42px; height: 42px; border-radius: 50%; background: #f0f0f0;
      border: none; cursor: pointer; display: flex; align-items: center;
      justify-content: center; flex-shrink: 0; transition: background 0.2s;
    }
    #sm-mic-btn:hover { background: #e0e0e0; }
    #sm-mic-btn svg { width: 18px; height: 18px; fill: #666; display: block; }
    #sm-mic-btn.recording { background: #e53935; animation: sm-mic-pulse 1s ease-in-out infinite; }
    #sm-mic-btn.recording svg { fill: white; }
    #sm-mic-btn:disabled { opacity: 0.4; cursor: not-allowed; }
    @keyframes sm-mic-pulse {
      0%, 100% { box-shadow: 0 0 0 0 rgba(229,57,53,0.45); }
      50%       { box-shadow: 0 0 0 8px rgba(229,57,53,0); }
    }

    #sm-footer-bar { display: flex; align-items: center; justify-content: space-between; margin-top: 6px; }
    #sm-powered-by { flex: 1; text-align: center; font-size: 11px; color: #bbb; }
    #sm-tts-btn {
      background: none; border: none; cursor: pointer; padding: 4px; line-height: 1;
      display: flex; align-items: center; justify-content: center;
      opacity: 0.35; transition: opacity 0.2s; border-radius: 4px;
    }
    #sm-tts-btn.active { opacity: 1; }
    #sm-tts-btn svg { width: 16px; height: 16px; fill: ${BRAND_COLOR}; display: block; }

    @media (max-width: 440px) {
      #sm-chat-window { right: 12px; bottom: 88px; width: calc(100vw - 24px); }
      #sm-chat-bubble { right: 16px; bottom: 16px; }
    }
  `;

  // ── DOM Builder ────────────────────────────────────────────────────────────
  function buildWidget() {
    // Inject styles
    const styleEl = document.createElement("style");
    styleEl.textContent = styles;
    document.head.appendChild(styleEl);

    // Wrapper (for scoping)
    const wrapper = document.createElement("div");
    wrapper.id = "sm-chat-wrapper";

    // Chat bubble button
    wrapper.innerHTML = `
      <button id="sm-chat-bubble" title="Chat with us" aria-label="Open chat">
        <img class="sm-bubble-logo" src="${LOGO_URL}" alt="Sustainable Mindz">
        <span id="sm-unread-badge">1</span>
      </button>

      <div id="sm-chat-window" role="dialog" aria-label="Sustainable Mindz Chat">
        <div id="sm-chat-header">
          <div class="sm-avatar"><img src="${LOGO_URL}" alt="logo" style="width:40px;height:40px;object-fit:contain;"></div>
          <div class="sm-header-info">
            <strong>Sustainable Mindz</strong>
            <span><span class="sm-online-dot"></span> Measurable Digital Marketeers</span>
          </div>
          <a id="sm-call-btn" href="tel:+971588983218" aria-label="Call us" title="Call +971 58 898 3218">
            <svg viewBox="0 0 24 24"><path d="M6.62 10.79a15.05 15.05 0 006.59 6.59l2.2-2.2a1 1 0 011.01-.24 11.47 11.47 0 003.58.57 1 1 0 011 1V20a1 1 0 01-1 1C10.02 21 3 13.98 3 5a1 1 0 011-1h3.5a1 1 0 011 1c0 1.25.2 2.45.57 3.58a1 1 0 01-.24 1.01l-2.21 2.2z"/></svg>
          </a>
          <button id="sm-close-btn" aria-label="Close chat">✕</button>
        </div>
        <div id="sm-chat-messages"></div>
        <div id="sm-chat-footer">
          <form id="sm-chat-form">
            <textarea
              id="sm-chat-input"
              placeholder="Ask about our services…"
              rows="1"
              maxlength="1000"
              autocomplete="off"
            ></textarea>
            <button id="sm-mic-btn" type="button" aria-label="Voice input" title="Speak your message">
              <svg viewBox="0 0 24 24"><path d="M12 14a3 3 0 003-3V5a3 3 0 00-6 0v6a3 3 0 003 3zm5-3a5 5 0 01-10 0H5a7 7 0 006 6.93V20H9v2h6v-2h-2v-2.07A7 7 0 0019 11h-2z"/></svg>
            </button>
            <button id="sm-send-btn" type="submit" aria-label="Send" disabled>
              <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
            </button>
          </form>
          <div id="sm-footer-bar">
            <div id="sm-powered-by">Powered by Claude AI</div>
            <button id="sm-tts-btn" type="button" title="Voice replies off" aria-label="Toggle voice replies">
              <svg viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3a4.5 4.5 0 00-2.7-4.13v8.27c1.66-.45 2.7-1.98 2.7-4.14zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77 0-4.28-2.99-7.86-7-8.77z"/></svg>
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(wrapper);

    // Wire up
    const bubble   = document.getElementById("sm-chat-bubble");
    const window_  = document.getElementById("sm-chat-window");
    const closeBtn = document.getElementById("sm-close-btn");
    const form     = document.getElementById("sm-chat-form");
    const input    = document.getElementById("sm-chat-input");
    const sendBtn  = document.getElementById("sm-send-btn");
    const messages = document.getElementById("sm-chat-messages");
    const badge    = document.getElementById("sm-unread-badge");

    // Toggle open/close
    function openChat() {
      isOpen = true;
      window_.classList.add("open");
      badge.style.display = "none";
      input.focus();
      scrollToBottom();
    }
    function closeChat() {
      isOpen = false;
      window_.classList.remove("open");
    }

    bubble.addEventListener("click", () => isOpen ? closeChat() : openChat());
    closeBtn.addEventListener("click", closeChat);

    // Enable send button only when there's text
    input.addEventListener("input", () => {
      sendBtn.disabled = input.value.trim().length === 0 || isTyping;
      // Auto-resize textarea
      input.style.height = "auto";
      input.style.height = Math.min(input.scrollHeight, 100) + "px";
    });

    // Send on Enter (Shift+Enter for newline)
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        if (!sendBtn.disabled) form.dispatchEvent(new Event("submit"));
      }
    });

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const text = input.value.trim();
      if (!text || isTyping) return;

      input.value = "";
      input.style.height = "auto";
      sendBtn.disabled = true;

      addMessage("user", text);
      conversationHistory.push({ role: "user", content: text });

      await fetchBotReply(text);
    });

    // ── Voice Input (Speech-to-Text) ───────────────────────────────────────
    const micBtn = document.getElementById("sm-mic-btn");
    const ttsBtn = document.getElementById("sm-tts-btn");

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      micBtn.style.display = "none"; // hide if browser doesn't support it
    } else {
      const recognition = new SR();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = "en-US";

      recognition.onresult = (e) => {
        const transcript = e.results[0][0].transcript;
        input.value = transcript;
        input.dispatchEvent(new Event("input"));
        if (transcript.trim()) {
          setTimeout(() => form.dispatchEvent(new Event("submit")), 150);
        }
      };
      recognition.onend = () => {
        isRecording = false;
        micBtn.classList.remove("recording");
        micBtn.title = "Speak your message";
      };
      recognition.onerror = (e) => {
        isRecording = false;
        micBtn.classList.remove("recording");
        if (e.error === "not-allowed" || e.error === "permission-denied") {
          addMessage("bot", "Microphone access was blocked. Please click the 🔒 icon in your browser address bar and allow microphone access, then try again.");
        } else if (e.error === "no-speech") {
          // silently ignore — user just didn't speak
        } else {
          addMessage("bot", "Voice input isn't available right now. Please type your message instead.");
        }
      };

      micBtn.addEventListener("click", () => {
        if (isTyping) return;
        if (isRecording) {
          recognition.stop();
        } else {
          isRecording = true;
          micBtn.classList.add("recording");
          micBtn.title = "Listening… click to stop";
          window.speechSynthesis && window.speechSynthesis.cancel();
          recognition.start();
        }
      });
    }

    // ── Text-to-Speech toggle ──────────────────────────────────────────────
    // Preload voices (they load async in some browsers)
    let ttsVoices = [];
    if (window.speechSynthesis) {
      const loadVoices = () => { ttsVoices = window.speechSynthesis.getVoices(); };
      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    ttsBtn.addEventListener("click", () => {
      ttsEnabled = !ttsEnabled;
      ttsBtn.classList.toggle("active", ttsEnabled);
      ttsBtn.title = ttsEnabled ? "Voice replies on" : "Voice replies off";
      if (!ttsEnabled) window.speechSynthesis && window.speechSynthesis.cancel();
    });

    // ── Message Rendering ──────────────────────────────────────────────────
    function renderMarkdown(escaped) {
      const lines = escaped.split('\n');
      const out = [];
      let inList = false;
      for (const raw of lines) {
        const line = raw.trim();
        // Strip horizontal rules (--- or ***)
        if (/^-{3,}$/.test(line) || /^\*{3,}$/.test(line)) {
          if (inList) { out.push('</ul>'); inList = false; }
          continue;
        }
        // Bullet list item: lines starting with - or *
        const li = line.match(/^[-*]\s+(.+)/);
        if (li) {
          if (!inList) { out.push('<ul style="margin:4px 0 4px 14px;padding:0;list-style:disc;">'); inList = true; }
          out.push('<li style="margin-bottom:2px;">' + applyBold(li[1]) + '</li>');
          continue;
        }
        if (inList) { out.push('</ul>'); inList = false; }
        if (line === '') {
          out.push('<div style="height:5px;"></div>');
        } else {
          out.push(applyBold(line) + '<br>');
        }
      }
      if (inList) out.push('</ul>');
      return out.join('');
    }

    function applyBold(str) {
      return str.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    }

    function linkify(str) {
      return str
        .replace(/([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/g,
          '<a href="mailto:$1" style="color:inherit;text-decoration:underline;">$1</a>')
        .replace(/(\+?[\d\s\-().]{7,20}\d)/g, (match) => {
          const digits = match.replace(/\D/g, "");
          if (digits.length < 7 || digits.length > 15) return match;
          return `<a href="tel:+${digits}" style="color:inherit;text-decoration:underline;">${match}</a>`;
        });
    }

    function addMessage(role, text) {
      const msg = document.createElement("div");
      msg.className = `sm-msg ${role}`;
      const escaped = escapeHtml(text);
      const content = role === "bot"
        ? linkify(renderMarkdown(escaped))
        : escaped.replace(/\n/g, "<br>");
      msg.innerHTML = `
        <div class="sm-msg-avatar">${role === "bot" ? `<img src="${LOGO_URL}" alt="logo" style="width:24px;height:24px;object-fit:contain;">` : "👤"}</div>
        <div class="sm-bubble">${content}</div>
      `;
      messages.appendChild(msg);
      scrollToBottom();
      if (role === "bot") speakText(text);
    }

    function showTyping() {
      const t = document.createElement("div");
      t.className = "sm-msg bot";
      t.id = "sm-typing-indicator";
      t.innerHTML = `
        <div class="sm-msg-avatar"><img src="${LOGO_URL}" alt="logo" style="width:24px;height:24px;object-fit:contain;"></div>
        <div class="sm-bubble sm-typing"><span></span><span></span><span></span></div>
      `;
      messages.appendChild(t);
      scrollToBottom();
    }

    function hideTyping() {
      const t = document.getElementById("sm-typing-indicator");
      if (t) t.remove();
    }

    function scrollToBottom() {
      requestAnimationFrame(() => {
        messages.scrollTop = messages.scrollHeight;
      });
    }

    function speakText(text) {
      if (!ttsEnabled || !window.speechSynthesis) return;
      window.speechSynthesis.cancel();
      const plain = text.replace(/<[^>]+>/g, "").replace(/\n/g, " ");
      const utt = new SpeechSynthesisUtterance(plain);

      // Use female Indian English voice (Veena on macOS, Heera on Windows)
      const femaleIndianNames = /veena|heera|raveena|kalpana|priya|neerja/i;
      const voice = ttsVoices.find(v => v.lang === "en-IN" && femaleIndianNames.test(v.name)) || null;
      if (voice) { utt.voice = voice; utt.lang = voice.lang; }
      utt.rate = 0.95;
      utt.pitch = 1.1; // slightly higher pitch for a feminine tone
      window.speechSynthesis.speak(utt);
    }

    function escapeHtml(str) {
      return str.replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;");
    }

    // ── API Call ───────────────────────────────────────────────────────────
    async function fetchBotReply(userMessage) {
      isTyping = true;
      sendBtn.disabled = true;
      window.speechSynthesis && window.speechSynthesis.cancel();
      showTyping();

      try {
        const res = await fetch(`${API_BASE}/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: userMessage,
            history: conversationHistory.slice(-20), // last 10 turns
          }),
        });

        hideTyping();

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          addMessage("bot", err.detail || "Sorry, something went wrong. Please try again or contact us at info@sustainablemindz.com");
          return;
        }

        const data = await res.json();
        const reply = data.reply;

        addMessage("bot", reply);
        conversationHistory.push({ role: "assistant", content: reply });

        // Show unread badge if window is closed
        if (!isOpen) {
          badge.style.display = "flex";
        }
      } catch (err) {
        hideTyping();
        addMessage("bot", "I'm having trouble connecting right now. Please reach us directly at info@sustainablemindz.com or call +971 58 898 3218.");
        console.error("Chat error:", err);
      } finally {
        isTyping = false;
        sendBtn.disabled = input.value.trim().length === 0;
      }
    }

    // ── Welcome Message ────────────────────────────────────────────────────
    addMessage("bot", WELCOME_MESSAGE);

    // Show badge on load (after 3 seconds) to draw attention
    setTimeout(() => {
      if (!isOpen) badge.style.display = "flex";
    }, 3000);
  }

  // ── Init ───────────────────────────────────────────────────────────────────
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", buildWidget);
  } else {
    buildWidget();
  }
})();

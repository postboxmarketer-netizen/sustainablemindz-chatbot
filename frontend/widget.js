/**
 * Sustainable Mindz Chat Widget v2.1
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
      touch-action: pan-y;
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
      flex: 1 1 0 !important; min-height: 0 !important;
      overflow-y: scroll !important; overflow-x: hidden !important;
      padding: 16px 16px 8px;
      display: flex !important; flex-direction: column; gap: 12px;
      scroll-behavior: smooth;
      -webkit-overflow-scrolling: touch;
      touch-action: pan-y;
      overscroll-behavior: contain;
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

    .sm-speak-btn {
      background: none; border: none; cursor: pointer; padding: 2px;
      opacity: 0.35; transition: opacity 0.2s; border-radius: 4px;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0; align-self: flex-end;
    }
    .sm-speak-btn:hover { opacity: 0.75; }
    .sm-speak-btn.speaking { opacity: 1; }
    .sm-speak-btn svg { width: 14px; height: 14px; fill: ${BRAND_COLOR}; display: block; }

    #sm-quick-replies {
      display: flex; flex-wrap: wrap; gap: 8px; padding: 4px 0 8px;
    }
    .sm-quick-btn {
      display: inline-flex; align-items: center; gap: 6px;
      background: ${BRAND_COLOR}; color: #fff; border: none; border-radius: 20px;
      padding: 7px 13px; font-size: 12px; font-weight: 500; cursor: pointer;
      transition: background 0.18s, transform 0.1s; white-space: nowrap;
      line-height: 1;
    }
    .sm-quick-btn:hover { background: ${BRAND_COLOR_DARK}; transform: translateY(-1px); }
    .sm-quick-btn svg { width: 13px; height: 13px; fill: white; flex-shrink: 0; }

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
        </div>
      </div>
    `;

    document.body.appendChild(wrapper);

    // Force scroll styles via JS to override any WordPress theme interference
    const messagesEl = wrapper.querySelector("#sm-chat-messages");
    messagesEl.style.cssText += ";overflow-y:scroll!important;min-height:0!important;flex:1 1 0!important;-webkit-overflow-scrolling:touch!important;touch-action:pan-y!important;overscroll-behavior:contain!important;";

    // Stop WordPress from intercepting wheel events — let browser scroll naturally
    messagesEl.addEventListener('wheel', (e) => {
      e.stopPropagation();
    }, { passive: true });

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

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    // Detect Permissions-Policy: microphone=() header (Chrome exposes this via featurePolicy)
    const _fp = document.featurePolicy || document.permissionsPolicy;
    const micPolicyBlocked = _fp ? !_fp.allowsFeature("microphone") : false;

    if (!SR || micPolicyBlocked) {
      micBtn.style.display = "none";
    } else {
      let recognition = null;

      function startRecognition() {
        recognition = new SR();
        recognition.continuous = false;
        recognition.interimResults = true;   // show real-time transcript as user speaks
        recognition.lang = "en-US";
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
          input.placeholder = "Listening… speak now";
          input.value = "";
        };
        recognition.onresult = (e) => {
          let interim = "";
          let final_ = "";
          for (let i = e.resultIndex; i < e.results.length; i++) {
            const t = e.results[i][0].transcript;
            if (e.results[i].isFinal) { final_ += t; }
            else { interim += t; }
          }
          // Show words appearing in real-time while speaking
          input.value = final_ || interim;
          input.dispatchEvent(new Event("input"));
          // Auto-submit when speech ends (Siri-like)
          if (final_.trim()) {
            input.value = final_.trim();
            input.placeholder = "Ask about our services…";
            setTimeout(() => form.dispatchEvent(new Event("submit")), 200);
          }
        };
        recognition.onend = () => {
          isRecording = false;
          micBtn.classList.remove("recording");
          micBtn.title = "Speak your message";
          input.placeholder = "Ask about our services…";
          recognition = null;
        };
        recognition.onerror = (e) => {
          isRecording = false;
          micBtn.classList.remove("recording");
          input.placeholder = "Ask about our services…";
          input.value = "";
          recognition = null;
          if (e.error === "not-allowed" || e.error === "permission-denied") {
            addMessage("bot", "Microphone access was denied. Tap the lock icon 🔒 in your browser address bar → set Microphone to Allow → then refresh and try again.");
          } else if (e.error === "audio-capture") {
            addMessage("bot", "Your microphone couldn't be accessed. Make sure no other app is using it, then try again.");
          } else if (e.error === "service-not-allowed") {
            addMessage("bot", "Voice input isn't supported on this browser. Try Chrome on desktop or Android.");
          } else if (e.error === "network") {
            addMessage("bot", "Voice recognition couldn't connect. Check your internet connection or type your message instead.");
          } else if (e.error === "no-speech" || e.error === "aborted") {
            // silently ignore — user stopped or no speech detected
          } else {
            addMessage("bot", `Voice input error (${e.error}). Please type your message instead.`);
          }
        };

        try {
          recognition.start();
        } catch (err) {
          isRecording = false;
          micBtn.classList.remove("recording");
          input.placeholder = "Ask about our services…";
          recognition = null;
        }
      }

      micBtn.addEventListener("click", () => {
        if (isTyping) return;
        if (isRecording && recognition) {
          recognition.stop();
          return;
        }
        isRecording = true;
        micBtn.classList.add("recording");
        micBtn.title = "Listening… click to stop";
        window.speechSynthesis && window.speechSynthesis.cancel();

        // iOS Safari requires getUserMedia to be called first to activate the mic
        // permission before SpeechRecognition will work. We always call startRecognition
        // regardless of whether getUserMedia succeeds or fails — SpeechRecognition has
        // its own permission handling and will fire onerror if access is truly denied.
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          navigator.mediaDevices.getUserMedia({ audio: true })
            .then(stream => {
              stream.getTracks().forEach(t => t.stop());
              startRecognition();
            })
            .catch(() => {
              // getUserMedia failed (browser/OS block or Permissions-Policy header).
              // Still try SpeechRecognition — it may work independently on some browsers.
              startRecognition();
            });
        } else {
          startRecognition();
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
        // Markdown links [text](url)
        .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g,
          '<a href="$2" target="_blank" rel="noopener" style="color:#682575;text-decoration:underline;font-weight:500;">$1</a>')
        // Emails
        .replace(/([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/g,
          '<a href="mailto:$1" style="color:inherit;text-decoration:underline;">$1</a>')
        // Phone numbers
        .replace(/(\+?[\d\s\-().]{7,20}\d)/g, (match) => {
          const digits = match.replace(/\D/g, "");
          if (digits.length < 7 || digits.length > 15) return match;
          return `<a href="tel:+${digits}" style="color:inherit;text-decoration:underline;">${match}</a>`;
        });
    }

    function addMessage(role, text) {
      const msg = document.createElement("div");
      msg.className = `sm-msg ${role}`;
      // Pre-process: rejoin markdown links split across lines e.g. [text]\n(url)
      const clean = role === "bot" ? text.replace(/\]\s*\n+\s*\(/g, '](') : text;
      const escaped = escapeHtml(clean);
      const content = role === "bot"
        ? renderMarkdown(linkify(escaped))  // linkify FIRST on full text, then split by lines
        : escaped.replace(/\n/g, "<br>");
      const speakBtnHtml = role === "bot" ? `
        <button class="sm-speak-btn" title="Listen" aria-label="Read aloud">
          <svg viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3a4.5 4.5 0 00-2.7-4.13v8.27c1.66-.45 2.7-1.98 2.7-4.14zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77 0-4.28-2.99-7.86-7-8.77z"/></svg>
        </button>` : "";
      msg.innerHTML = `
        <div class="sm-msg-avatar">${role === "bot" ? `<img src="${LOGO_URL}" alt="logo" style="width:24px;height:24px;object-fit:contain;">` : "👤"}</div>
        <div class="sm-bubble">${content}</div>
        ${speakBtnHtml}
      `;
      if (role === "bot") {
        const btn = msg.querySelector(".sm-speak-btn");
        btn.addEventListener("click", () => {
          if (btn.classList.contains("speaking")) {
            window.speechSynthesis && window.speechSynthesis.cancel();
            btn.classList.remove("speaking");
          } else {
            document.querySelectorAll(".sm-speak-btn.speaking").forEach(b => b.classList.remove("speaking"));
            btn.classList.add("speaking");
            speakText(text, () => btn.classList.remove("speaking"));
          }
        });
      }
      messages.appendChild(msg);
      scrollToBottom();
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
        requestAnimationFrame(() => {
          messages.scrollTop = messages.scrollHeight;
        });
      });
    }

    function speakText(text, onEnd) {
      if (!window.speechSynthesis) return;
      window.speechSynthesis.cancel();
      const plain = text.replace(/<[^>]+>/g, "").replace(/\n/g, " ");
      const utt = new SpeechSynthesisUtterance(plain);

      // Priority: enhanced female → British female → Australian female → any English female → default
      const femaleNames = /female|woman|girl|samantha|karen|moira|kate|hazel|zira|susan|victoria|fiona|tessa|serena|alice/i;
      const voice =
        ttsVoices.find(v => /en-(GB|AU|US)/i.test(v.lang) && /enhanced|premium/i.test(v.name) && femaleNames.test(v.name)) ||
        ttsVoices.find(v => v.lang === "en-GB" && femaleNames.test(v.name)) ||
        ttsVoices.find(v => v.lang === "en-AU" && femaleNames.test(v.name)) ||
        ttsVoices.find(v => v.lang === "en-GB") ||
        ttsVoices.find(v => /^en/i.test(v.lang) && femaleNames.test(v.name)) ||
        null;

      if (voice) { utt.voice = voice; utt.lang = voice.lang; }
      utt.rate = 0.92;
      utt.pitch = 1.05;
      if (onEnd) utt.onend = onEnd;
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

    // ── Quick Reply Service Buttons ────────────────────────────────────────
    const services = [
      { label: "SEO", icon: `<svg viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>`, url: "https://www.sustainablemindz.net/seo-services-in-dubai/" },
      { label: "Web Design", icon: `<svg viewBox="0 0 24 24"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-5 14H4v-4h11v4zm0-5H4V9h11v4zm5 5h-4V9h4v9z"/></svg>`, url: "https://www.sustainablemindz.net/web-design-development-services/" },
      { label: "Social Media", icon: `<svg viewBox="0 0 24 24"><path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z"/></svg>`, url: "https://www.sustainablemindz.net/social-media-marketing-agency-dubai/" },
      { label: "Branding", icon: `<svg viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>`, url: "https://www.sustainablemindz.net/brand-identity-creation/" },
      { label: "Digital Ads", icon: `<svg viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg>`, url: "https://www.sustainablemindz.net/digital-advertising-agency-dubai/" },
      { label: "Lead Generation", icon: `<svg viewBox="0 0 24 24"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>`, url: "https://www.sustainablemindz.net/lead-generation-company-dubai/" },
    ];

    const quickDiv = document.createElement("div");
    quickDiv.id = "sm-quick-replies";
    services.forEach(({ label, icon, url }) => {
      const btn = document.createElement("button");
      btn.className = "sm-quick-btn";
      btn.innerHTML = `${icon}${label}`;
      btn.addEventListener("click", () => {
        window.open(url, "_blank", "noopener");
      });
      quickDiv.appendChild(btn);
    });
    messages.appendChild(quickDiv);
    scrollToBottom();

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

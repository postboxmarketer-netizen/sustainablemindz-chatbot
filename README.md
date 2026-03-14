# Sustainable Mindz Chatbot

Custom AI chatbot for sustainablemindz.net — powered entirely by Claude API.
No third-party chatbot platforms. No external dependencies.

---

## Architecture

```
Your Website
    ↓  (one <script> tag)
widget.js  ──────────────→  FastAPI Backend (main.py)
                                    ↓
                           knowledge_base.json  (your content)
                                    ↓
                            Claude API (claude-sonnet-4-6)
                                    ↓
                              Answer sent back
```

---

## Project Structure

```
sustainablemindz-chatbot/
├── backend/
│   ├── main.py               ← FastAPI server
│   ├── knowledge_base.json   ← All your company content
│   ├── requirements.txt
│   └── .env.example
└── frontend/
    └── widget.js             ← Embeddable chat widget
```

---

## Step 1 — Get Your Claude API Key

1. Go to https://console.anthropic.com
2. Sign up / log in
3. Click **API Keys** → **Create Key**
4. Copy the key (starts with `sk-ant-...`)

---

## Step 2 — Set Up the Backend

### Install Python (if not installed)
Download from https://python.org (version 3.10 or higher)

### Install dependencies
```bash
cd backend
pip install -r requirements.txt
```

### Configure environment
```bash
cp .env.example .env
```
Open `.env` and paste your API key:
```
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxx
```

### Run the server
```bash
uvicorn main:app --host 0.0.0.0 --port 8000
```

Test it works:
```
http://localhost:8000/health
```
Should return: `{"status":"ok","service":"Sustainable Mindz Chatbot"}`

---

## Step 3 — Add Widget to Your Website

Add this single line before `</body>` in your website's HTML:

```html
<script src="https://your-server-url/widget.js" data-api="https://your-server-url"></script>
```

Replace `your-server-url` with where you deployed the backend.

---

## Step 4 — Deploy to Production

### Option A: VPS (DigitalOcean / Hostinger / any VPS)

```bash
# On your server
git clone <your-repo>
cd sustainablemindz-chatbot/backend
pip install -r requirements.txt

# Create .env with your API key

# Run with process manager
pip install gunicorn
gunicorn main:app -w 2 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

Set up Nginx to proxy your domain to port 8000 + add SSL via Let's Encrypt.

### Option B: Railway.app (Easiest — free tier available)

1. Push code to GitHub
2. Go to railway.app → New Project → Deploy from GitHub
3. Add environment variable: `ANTHROPIC_API_KEY=your_key`
4. Railway auto-deploys and gives you a URL like `https://your-app.railway.app`

### Option C: Render.com

1. Push to GitHub
2. New Web Service → connect repo → set root to `backend/`
3. Build command: `pip install -r requirements.txt`
4. Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
5. Add `ANTHROPIC_API_KEY` as environment variable

---

## Updating Your Knowledge Base

Edit `backend/knowledge_base.json` to:
- Add new services
- Update pricing information
- Add more FAQs
- Change contact details

Restart the server after any changes.

---

## Customization

### Change colors
In `widget.js`, edit line 12-13:
```js
const BRAND_COLOR = "#2e7d32";       // Main green color
const BRAND_COLOR_DARK = "#1b5e20";  // Darker shade for hover
```

### Change welcome message
In `widget.js`, edit line 15:
```js
const WELCOME_MESSAGE = "Hi! 👋 ...your custom message...";
```

### Change Claude's behavior
In `backend/main.py`, edit the `SYSTEM_PROMPT` variable (around line 35).

---

## Cost Estimate

Claude API pricing (as of 2025):
- claude-sonnet-4-6: ~$3 per million input tokens, ~$15 per million output tokens
- Average chat message: ~2,000 tokens in + ~300 tokens out ≈ $0.01 per conversation
- 1,000 conversations/month ≈ ~$10/month

---

## Support

For questions about the chatbot code, refer to:
- Anthropic docs: https://docs.anthropic.com
- FastAPI docs: https://fastapi.tiangolo.com

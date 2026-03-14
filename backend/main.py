import os
import json
from pathlib import Path
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

import anthropic
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

# ── App Setup ────────────────────────────────────────────────────────────────
app = FastAPI(title="Sustainable Mindz Chatbot API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://www.sustainablemindz.net",
        "https://sustainablemindz.net",
        "http://localhost",
        "http://localhost:3000",
        "http://127.0.0.1",
    ],
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)

# ── Load Knowledge Base ───────────────────────────────────────────────────────
KB_PATH = Path(__file__).parent / "knowledge_base.json"
knowledge_base = json.loads(KB_PATH.read_text(encoding="utf-8"))
KNOWLEDGE_BASE_STR = json.dumps(knowledge_base, indent=2)

# ── Claude Client ─────────────────────────────────────────────────────────────
client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])

# ── Google Calendar Setup ─────────────────────────────────────────────────────
GCAL_CALENDAR_ID = os.environ.get("GOOGLE_CALENDAR_ID", "primary")
DUBAI_TZ = ZoneInfo("Asia/Dubai")
TOKEN_FILE = Path(__file__).parent / "token.json"
GOOGLE_SCOPES = [
    "https://www.googleapis.com/auth/calendar",
    "https://www.googleapis.com/auth/gmail.send",
]

def get_google_creds():
    try:
        from google.oauth2.credentials import Credentials
        from google.auth.transport.requests import Request

        # Local dev: use token.json file
        # Production (Railway): use GOOGLE_TOKEN_JSON env var
        if TOKEN_FILE.exists():
            creds = Credentials.from_authorized_user_file(str(TOKEN_FILE), GOOGLE_SCOPES)
        else:
            token_json = os.environ.get("GOOGLE_TOKEN_JSON")
            if not token_json:
                return None
            creds = Credentials.from_authorized_user_info(
                json.loads(token_json), GOOGLE_SCOPES
            )

        if creds.expired and creds.refresh_token:
            creds.refresh(Request())
            if TOKEN_FILE.exists():
                TOKEN_FILE.write_text(creds.to_json())

        return creds
    except Exception:
        return None

def get_calendar_service():
    creds = get_google_creds()
    if not creds:
        return None
    try:
        from googleapiclient.discovery import build
        return build("calendar", "v3", credentials=creds)
    except Exception:
        return None

def send_confirmation_email(to_email: str, name: str, date: str, time_slot: str, topic: str, meet_link: str = ""):
    creds = get_google_creds()
    if not creds:
        return
    try:
        import base64
        from email.mime.text import MIMEText
        from googleapiclient.discovery import build

        meet_line = f"\nGoogle Meet: {meet_link}\n" if meet_link else "\n"
        body = f"""Hi {name},

Your free consultation with Sustainable Mindz has been confirmed.

Date: {date}
Time: {time_slot} UAE time (Gulf Standard Time, UTC+4)
Topic: {topic}
{meet_line}
If you need to reschedule, contact us at info@sustainablemindz.com or +971 58 898 3218.

See you soon,
Sustainable Mindz Team
"""
        msg = MIMEText(body)
        msg["to"] = to_email
        msg["cc"] = "ak@sustainablemindz.com"
        msg["from"] = "ak@sustainablemindz.com"
        msg["subject"] = f"Consultation Confirmed — {date} at {time_slot}"
        raw = base64.urlsafe_b64encode(msg.as_bytes()).decode()

        service = build("gmail", "v1", credentials=creds)
        service.users().messages().send(userId="me", body={"raw": raw}).execute()
    except Exception:
        pass

def create_calendar_event(name: str, email: str, phone: str, date: str, time_slot: str, topic: str = "Free Consultation") -> str | None:
    service = get_calendar_service()
    if not service:
        return None
    try:
        from dateutil import parser as dtparser
        dt_naive = dtparser.parse(f"{date} {time_slot}")
        # Ensure year is never in the past
        today = datetime.now(DUBAI_TZ)
        if dt_naive.year < today.year:
            dt_naive = dt_naive.replace(year=today.year)
        dt_start = dt_naive.replace(tzinfo=DUBAI_TZ)
        dt_end   = dt_start + timedelta(hours=1)

        import uuid
        event = {
            "summary": f"Consultation — {name}",
            "description": f"Client: {name}\nEmail: {email}\nPhone: {phone}\nTopic: {topic}\n\nBooked via website chatbot.",
            "start": {"dateTime": dt_start.isoformat(), "timeZone": "Asia/Dubai"},
            "end":   {"dateTime": dt_end.isoformat(),   "timeZone": "Asia/Dubai"},
            "reminders": {"useDefault": True},
            "conferenceData": {
                "createRequest": {
                    "requestId": str(uuid.uuid4()),
                    "conferenceSolutionKey": {"type": "hangoutsMeet"},
                }
            },
            "attendees": [{"email": email}],
        }
        created = service.events().insert(
            calendarId=GCAL_CALENDAR_ID,
            body=event,
            conferenceDataVersion=1,
            sendUpdates="all",
        ).execute()

        meet_link = ""
        conf = created.get("conferenceData", {})
        for ep in conf.get("entryPoints", []):
            if ep.get("entryPointType") == "video":
                meet_link = ep.get("uri", "")
                break

        send_confirmation_email(email, name, date, time_slot, topic, meet_link)
        return created.get("htmlLink")
    except Exception:
        return None

# ── Booking Tool Definition ───────────────────────────────────────────────────
BOOKING_TOOL = {
    "name": "book_consultation",
    "description": (
        "Book a free 1-hour consultation on Google Calendar. "
        "Only call this tool when you have collected ALL of: "
        "the visitor's full name, email address, phone number, preferred date (YYYY-MM-DD), "
        "and preferred time slot. Do not call it with missing fields."
    ),
    "input_schema": {
        "type": "object",
        "properties": {
            "name":      {"type": "string", "description": "Visitor's full name"},
            "email":     {"type": "string", "description": "Visitor's email address"},
            "phone":     {"type": "string", "description": "Visitor's phone number including country code"},
            "date":      {"type": "string", "description": "Preferred date in YYYY-MM-DD format"},
            "time_slot": {"type": "string", "description": "Preferred time in HH:MM AM/PM format, e.g. '10:00 AM'"},
            "topic":     {"type": "string", "description": "Brief topic or goal for the consultation"},
        },
        "required": ["name", "email", "phone", "date", "time_slot"],
    },
}

# ── System Prompt ─────────────────────────────────────────────────────────────
def build_system_prompt() -> str:
    today = datetime.now(DUBAI_TZ).strftime("%A, %d %B %Y")
    return f"""Today's date is {today} (UAE time). Always use the correct year when booking consultations.

You are a real person on the Sustainable Mindz team — friendly, direct, and genuinely helpful. You chat with people visiting the website and help them figure out if we're the right agency for them.

Your job is to answer questions honestly, help people understand what we do, and nudge them toward booking a free consultation when it makes sense.

━━━━━━━━━━━━━━━━━━━━
STRICT RULES
━━━━━━━━━━━━━━━━━━━━
1. ONLY answer questions about Sustainable Mindz and digital marketing topics.
2. If someone asks something unrelated (weather, coding, jokes, etc.), politely redirect: "I'm here to help with questions about Sustainable Mindz services!"
3. NEVER invent pricing numbers. Always say pricing is custom and encourage them to contact us.
4. Keep answers concise — 2 to 4 sentences unless more detail is genuinely needed.
5. If you don't know something, say so and point them to the team.
6. End with a natural next step when it fits — don't force it.

━━━━━━━━━━━━━━━━━━━━
BOOKING A CONSULTATION
━━━━━━━━━━━━━━━━━━━━
When a visitor wants to book a consultation or meeting, collect the following — one at a time, naturally:
1. Their full name
2. Their email address
3. Their phone number (with country code)
4. Preferred date (remind them we're available Mon–Fri, 9 AM–6 PM UAE time)
5. Preferred time slot

Once you have all five, call the book_consultation tool immediately. Don't ask for anything else first.

After booking succeeds, confirm the date, time, and that a Google Meet link + calendar invite were sent to their email.
If booking fails, apologise briefly and give them the direct contact: info@sustainablemindz.com or +971 58 898 3218.

━━━━━━━━━━━━━━━━━━━━
HOW TO WRITE — SOUND HUMAN, NOT AI
━━━━━━━━━━━━━━━━━━━━
You must write like a real person texting or chatting, not like a bot generating a report. Follow these rules strictly:

NEVER start with: "Great question!", "Certainly!", "Of course!", "Absolutely!", "Sure thing!" or any sycophantic opener. Just answer.

NEVER use these AI giveaway words: delve, tapestry, landscape (abstract), pivotal, testament, underscore, showcase, vibrant, intricate, foster, enhance, align with, crucial, highlight (as a verb), garner, enduring.

NEVER use em dashes (—) for dramatic effect. Use a comma or just split the sentence.

NEVER bold random phrases mid-sentence for emphasis. Bold is for headers only, and even then use it sparingly.

NEVER use emojis as bullet decorations (🚀 Speed: ...). If you use an emoji, use it naturally like a human would in chat — once, at most.

NEVER write lists of three parallel things just to sound thorough ("speed, quality, and innovation"). Pick the most relevant one or two and say something real about them.

NEVER end with a vague upbeat closer: "The future looks bright!", "Exciting times ahead!", "We're committed to excellence." Just stop when you're done.

NEVER hedge excessively: not "it could potentially be argued that this might possibly..." — just say what's true.

DO vary your sentence length. Short punchy ones. Then a longer one when the idea needs more room to breathe.

DO be specific. "We've run 19,000+ campaigns" beats "we have extensive experience."

DO sound like someone who actually works here and cares — not a brochure that learned to talk.

━━━━━━━━━━━━━━━━━━━━
CONTACT DETAILS (use when relevant)
━━━━━━━━━━━━━━━━━━━━
- Email: info@sustainablemindz.com / ak@sustainablemindz.com
- Phone: +971 58 898 3218
- Dubai Office: Business Venue Building, Oud Metha

━━━━━━━━━━━━━━━━━━━━
COMPANY KNOWLEDGE BASE
━━━━━━━━━━━━━━━━━━━━
{KNOWLEDGE_BASE_STR}
"""

# ── Request / Response Models ─────────────────────────────────────────────────
class Message(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    message: str
    history: list[Message] = []

class ChatResponse(BaseModel):
    reply: str
    input_tokens: int
    output_tokens: int

# ── Endpoints ─────────────────────────────────────────────────────────────────
@app.get("/health")
def health():
    return {"status": "ok", "service": "Sustainable Mindz Chatbot"}


@app.post("/chat", response_model=ChatResponse)
def chat(req: ChatRequest):
    message = req.message.strip()
    if not message:
        raise HTTPException(status_code=400, detail="Message cannot be empty.")
    if len(message) > 1000:
        raise HTTPException(status_code=400, detail="Message is too long (max 1000 characters).")

    history = req.history[-10:] if len(req.history) > 10 else req.history
    messages = [{"role": m.role, "content": m.content} for m in history]
    messages.append({"role": "user", "content": message})

    try:
        response = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=600,
            system=build_system_prompt(),
            messages=messages,
            tools=[BOOKING_TOOL],
        )
    except anthropic.APIError as e:
        raise HTTPException(status_code=502, detail=f"AI service error: {str(e)}")

    input_tokens  = response.usage.input_tokens
    output_tokens = response.usage.output_tokens

    # ── Handle booking tool call ──────────────────────────────────────────────
    if response.stop_reason == "tool_use":
        tool_block = next(b for b in response.content if b.type == "tool_use")
        args = tool_block.input

        event_link = create_calendar_event(
            name      = args["name"],
            email     = args["email"],
            phone     = args.get("phone", ""),
            date      = args["date"],
            time_slot = args["time_slot"],
            topic     = args.get("topic", "Free Consultation"),
        )

        if event_link:
            reply_text = (
                f"Done! Your consultation is booked for {args['date']} at {args['time_slot']} UAE time. "
                f"A calendar invite has been sent to {args['email']}. Looking forward to speaking with you!"
            )
        else:
            reply_text = (
                f"I wasn't able to create the calendar event automatically right now. "
                f"Please email us at info@sustainablemindz.com or call +971 58 898 3218 to confirm your slot "
                f"on {args['date']} at {args['time_slot']} — mention your name ({args['name']}) and we'll sort it straight away."
            )

        return ChatResponse(reply=reply_text, input_tokens=input_tokens, output_tokens=output_tokens)

    # ── Normal text reply ─────────────────────────────────────────────────────
    reply_text = response.content[0].text
    return ChatResponse(reply=reply_text, input_tokens=input_tokens, output_tokens=output_tokens)

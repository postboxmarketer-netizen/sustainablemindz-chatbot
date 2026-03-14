from dotenv import load_dotenv
load_dotenv()
import os
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
from google.oauth2 import service_account
from googleapiclient.discovery import build

creds = service_account.Credentials.from_service_account_file(
    os.environ["GOOGLE_SERVICE_ACCOUNT_JSON"],
    scopes=["https://www.googleapis.com/auth/calendar"],
)
service = build("calendar", "v3", credentials=creds)

DUBAI_TZ = ZoneInfo("Asia/Dubai")
dt_start = datetime(2026, 3, 16, 10, 0, tzinfo=DUBAI_TZ)
dt_end = dt_start + timedelta(hours=1)

event = {
    "summary": "Test Consultation — Sustainable Mindz",
    "start": {"dateTime": dt_start.isoformat(), "timeZone": "Asia/Dubai"},
    "end":   {"dateTime": dt_end.isoformat(),   "timeZone": "Asia/Dubai"},
}

try:
    result = service.events().insert(
        calendarId=os.environ.get("GOOGLE_CALENDAR_ID", "primary"),
        body=event,
    ).execute()
    print("Success:", result.get("htmlLink"))
except Exception as e:
    print("Error:", e)

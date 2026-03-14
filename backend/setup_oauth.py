"""
Run this once to authorize the chatbot to access your Google Calendar and Gmail.
It will open a browser, ask you to sign in with ak@sustainablemindz.com,
and save a token.json file that the backend uses.

Usage:
    python3 setup_oauth.py
"""
from google_auth_oauthlib.flow import InstalledAppFlow
from pathlib import Path

SCOPES = [
    "https://www.googleapis.com/auth/calendar",
    "https://www.googleapis.com/auth/gmail.send",
]
CLIENT_SECRETS_FILE = Path(__file__).parent / "oauth-client.json"
TOKEN_FILE = Path(__file__).parent / "token.json"

print("Opening browser for Google authorization...")
print("Sign in with: ak@sustainablemindz.com")
print("You will be asked to allow: Calendar + Gmail (send only)")
print()

flow = InstalledAppFlow.from_client_secrets_file(str(CLIENT_SECRETS_FILE), SCOPES)
creds = flow.run_local_server(port=8080, prompt="consent")

TOKEN_FILE.write_text(creds.to_json())
print(f"\nDone! Token saved to: {TOKEN_FILE}")
print("The chatbot can now create calendar events and send confirmation emails.")

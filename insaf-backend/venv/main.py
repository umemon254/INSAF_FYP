import os, json, smtplib, urllib.request
from uuid import UUID
from email.message import EmailMessage
from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

URL = os.environ["SUPABASE_URL"]
ANON = os.environ["SUPABASE_ANON_KEY"]
GMAIL = os.environ["SMTP_USER"]
GMAIL_PASS = os.environ["SMTP_PASS"]

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:3000"],
                   allow_methods=["*"], allow_headers=["*"])

def get(path, token):
    headers = {"apikey": ANON, "Authorization": f"Bearer {token}"}
    with urllib.request.urlopen(urllib.request.Request(URL + path, headers=headers)) as r:
        return json.load(r)

class Body(BaseModel):
    lawyer_id: UUID

@app.post("/notify-lawyer")
def notify(body: Body, authorization: str = Header(...)):
    token = authorization.replace("Bearer ", "")
    try:
        caller = get("/auth/v1/user", token)
        admin = get(f"/rest/v1/admins?user_id=eq.{caller['id']}&select=user_id", token)
        rows = get(f"/rest/v1/lawyer_applications?user_id=eq.{body.lawyer_id}"
                   "&select=full_name,email,status,rejection_reason", token)
    except Exception as e:
        print("SUPABASE CHECK FAILED:", e)
        raise HTTPException(401, "Check failed")
    if not admin:
        raise HTTPException(403, "Admins only")
    if not rows:
        raise HTTPException(404, "Application not found")
    a = rows[0]

    if a["status"] == "approved":
        subject = "INSAF: Your lawyer account is approved"
        text = f"Dear {a['full_name']},\n\nYour application is approved. You are now listed in the INSAF lawyers directory.\n\nINSAF Team"
    elif a["status"] == "rejected":
        subject = "INSAF: Your lawyer application was rejected"
        text = f"Dear {a['full_name']},\n\nYour application was rejected.\nReason: {a['rejection_reason']}\n\nINSAF Team"
    else:
        raise HTTPException(400, "Application is still pending")

    m = EmailMessage()
    m["Subject"], m["From"], m["To"] = subject, GMAIL, a["email"]
    m.set_content(text)
    try:
        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as s:
            s.login(GMAIL, GMAIL_PASS)
            s.send_message(m)
    except Exception as e:
        print("EMAIL FAILED:", e)
        raise HTTPException(500, "Email failed")
    return {"sent": True}
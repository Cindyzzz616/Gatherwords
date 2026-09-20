import base64
import hashlib
import hmac
import json
import os
import ssl
import tempfile
import time
import urllib.error
import urllib.request

import certifi
import firebase_admin
from fastapi import FastAPI, File, Form, HTTPException, Request, UploadFile
from firebase_admin import firestore
from faster_whisper import WhisperModel
from pydantic import BaseModel
from practice_api import router as practice_router

app = FastAPI()
app.include_router(practice_router)
model = WhisperModel("small", device="cpu", compute_type="int8")


class LinqSendRequest(BaseModel):
    phoneNumber: str
    text: str
    chatId: str | None = None


def linq_request(url: str, payload: dict):
    api_key = os.environ.get("LINQ_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="LINQ_API_KEY is not configured on the server.")

    request = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(
            request,
            timeout=20,
            context=ssl.create_default_context(cafile=certifi.where()),
        ) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as error:
        body = error.read().decode("utf-8")
        try:
            detail = json.loads(body).get("message") or json.loads(body).get("detail") or body
        except json.JSONDecodeError:
            detail = body
        raise HTTPException(status_code=error.code, detail=detail) from error
    except urllib.error.URLError as error:
        raise HTTPException(status_code=502, detail="Could not reach Linq.") from error


def verify_linq_webhook(raw_body: bytes, headers) -> None:
    secret = os.environ.get("LINQ_WEBHOOK_SECRET")
    webhook_id = headers.get("webhook-id")
    timestamp = headers.get("webhook-timestamp")
    signatures = headers.get("webhook-signature", "")
    if not secret or not webhook_id or not timestamp or not signatures:
        raise HTTPException(status_code=401, detail="Missing or invalid Linq webhook signature.")

    try:
        if abs(time.time() - int(timestamp)) > 300:
            raise ValueError("Webhook timestamp is too old.")
        key = base64.b64decode(secret.removeprefix("whsec_"))
    except (ValueError, TypeError) as error:
        raise HTTPException(status_code=401, detail="Invalid Linq webhook signature.") from error

    signed_content = b".".join([webhook_id.encode(), timestamp.encode(), raw_body])
    expected = base64.b64encode(hmac.new(key, signed_content, hashlib.sha256).digest()).decode()
    valid = any(
        signature.startswith("v1,") and hmac.compare_digest(expected, signature[3:])
        for signature in signatures.split(" ")
    )
    if not valid:
        raise HTTPException(status_code=401, detail="Invalid Linq webhook signature.")


def get_firestore_client():
    try:
        firebase_admin.get_app()
    except ValueError:
        firebase_admin.initialize_app()
    return firestore.client()


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/linq/send")
async def send_linq_message(message: LinqSendRequest):
    phone_number = message.phoneNumber.strip()
    text = message.text.strip()
    if not phone_number.startswith("+") or not phone_number[1:].isdigit():
        raise HTTPException(status_code=400, detail="Use an E.164 phone number, such as +14165551234.")
    if not text:
        raise HTTPException(status_code=400, detail="Enter a message.")

    content = {"parts": [{"type": "text", "value": text}]}
    if message.chatId:
        result = linq_request(
            f"https://api.linqapp.com/api/partner/v3/chats/{message.chatId}/messages",
            {"message": content},
        )
    else:
        from_number = os.environ.get("LINQ_PHONE_NUMBER")
        if not from_number:
            raise HTTPException(status_code=500, detail="LINQ_PHONE_NUMBER is not configured on the server.")
        result = linq_request(
            "https://api.linqapp.com/api/partner/v3/chats",
            {"from": from_number, "to": [phone_number], "message": content},
        )

    return {
        "chatId": result.get("chat_id") or result.get("chat", {}).get("id"),
        "messageId": result.get("id") or result.get("message", {}).get("id"),
    }


@app.post("/linq/webhook")
async def receive_linq_webhook(request: Request):
    raw_body = await request.body()
    verify_linq_webhook(raw_body, request.headers)

    try:
        event = json.loads(raw_body)
    except json.JSONDecodeError as error:
        raise HTTPException(status_code=400, detail="Invalid webhook JSON.") from error

    if event.get("event_type") != "message.received":
        return {"received": True, "stored": False}

    data = event.get("data", {})
    sender = data.get("sender_handle", {}).get("handle")
    message_id = data.get("id")
    chat_id = data.get("chat", {}).get("id")
    text = "\n".join(
        part.get("value", "")
        for part in data.get("parts", [])
        if part.get("type") == "text" and isinstance(part.get("value"), str)
    ).strip()
    if not sender or not message_id or not text:
        return {"received": True, "stored": False}

    database = get_firestore_client()
    matching_contacts = database.collection_group("contacts").where("phoneNumber", "==", sender).stream()
    stored = False
    for contact in matching_contacts:
        contact.reference.set({"linqChatId": chat_id}, merge=True)
        contact.reference.collection("messages").document(message_id).set({
            "text": text,
            "direction": "inbound",
            "status": "sent",
            "linqMessageId": message_id,
            "createdAt": int(time.time() * 1000),
        }, merge=True)
        stored = True

    return {"received": True, "stored": stored}


@app.post("/transcribe")
async def transcribe(audio: UploadFile = File(...), language: str = Form("en")):
    suffix = os.path.splitext(audio.filename or ".m4a")[1]
    path = ""

    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temporary_file:
            temporary_file.write(await audio.read())
            path = temporary_file.name

        segments, _ = model.transcribe(path, language=language, vad_filter=True, beam_size=5)
        text = " ".join(segment.text.strip() for segment in segments).strip()
        return {"text": text}
    finally:
        if path and os.path.exists(path):
            os.unlink(path)

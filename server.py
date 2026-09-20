import os
import tempfile

from fastapi import FastAPI, File, Form, UploadFile
from faster_whisper import WhisperModel

app = FastAPI()
model = WhisperModel("small", device="cpu", compute_type="int8")


@app.get("/health")
async def health():
    return {"status": "ok"}


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

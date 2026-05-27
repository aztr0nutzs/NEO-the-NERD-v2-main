from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional, Literal
import base64

app = FastAPI(title="NEO OmniVoice bridge")

class TTSRequest(BaseModel):
    voiceId: str
    text: str
    mode: Literal["clone", "design"]
    refAudioId: Optional[str] = None
    refText: Optional[str] = None
    instruct: Optional[str] = None
    languageId: Optional[str] = None
    speed: Optional[float] = None
    duration: Optional[float] = None

@app.get('/health')
def health():
    return {"ok": True, "provider": "omnivoice", "status": "scaffold"}

@app.post('/tts')
def tts(req: TTSRequest):
    if not req.text.strip():
        raise HTTPException(status_code=400, detail="text is required")
    # Placeholder scaffold. Replace with real omnivoice-infer subprocess/API.
    silence_wav = base64.b64encode(b"RIFF....WAVE").decode("utf-8")
    return {"audioBase64": silence_wav, "mimeType": "audio/wav", "fileName": f"{req.voiceId}.wav", "provider": "omnivoice", "providerVoiceId": req.voiceId}

import asyncio
import json
import random
import uuid
from datetime import datetime
from typing import Set

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class SignInRequest(BaseModel):
    name: str
    text: str
    emoji: str

class ConnectionManager:
    def __init__(self):
        self.active: Set[WebSocket] = set()

    async def connect(self, ws: WebSocket):
        await ws.accept()
        self.active.add(ws)

    def disconnect(self, ws: WebSocket):
        self.active.discard(ws)

    async def broadcast(self, message: dict):
        payload = json.dumps(message, ensure_ascii=False)
        dead = set()
        for ws in self.active:
            try:
                await ws.send_text(payload)
            except Exception:
                dead.add(ws)
        self.active -= dead

manager = ConnectionManager()

blessings_db: list[dict] = []

SIMULATED_NAMES = [
    "小明", "小红", "阿华", "丽丽", "大伟", "小芳", "志强", "美玲",
    "建国", "秀英", "浩然", "雨薇", "天宇", "梦瑶", "子涵", "欣怡",
    "思远", "佳琪", "俊杰", "紫萱", "文博", "诗涵", "嘉豪", "若曦",
]

SIMULATED_TEXTS = [
    "祝新婚快乐，百年好合！",
    "愿你们白头偕老，永结同心！",
    "幸福美满，甜甜蜜蜜！",
    "祝你们携手走过每一个春夏秋冬！",
    "愿爱情如酒，越陈越香！",
    "永浴爱河，幸福长久！",
    "佳偶天成，珠联璧合！",
    "愿每一天都像今天一样幸福！",
    "执子之手，与子偕老！",
    "祝福你们，永远相爱！",
    "花好月圆，永结同心！",
    "愿你们的日子甜如蜜！",
    "恩爱到老，不离不弃！",
    "天作之合，地造一双！",
    "祝你们爱情长长久久！",
    "幸福的钟声为你们敲响！",
    "愿此情此爱永不褪色！",
    "神仙眷侣，人人羡慕！",
    "愿你们相守一生，不负韶华！",
    "红绳牵一线，姻缘定三生！",
]

SIMULATED_EMOJIS = [
    "😊", "🥰", "😍", "❤️", "💕", "🎉", "🎊", "💖",
    "🌹", "✨", "🌟", "💐", "🥂", "💍", "👰", "🤵",
    "💝", "💞", "💗", "🍀", "🌈", "🎈", "🎀", "🦋",
]

def make_blessing(name: str, text: str, emoji: str) -> dict:
    return {
        "type": "blessing",
        "name": name,
        "text": text,
        "emoji": emoji,
        "time": datetime.now().strftime("%H:%M:%S"),
    }

@app.post("/signin")
async def signin(req: SignInRequest):
    msg = make_blessing(req.name, req.text, req.emoji)
    blessings_db.append(msg)
    await manager.broadcast(msg)
    return {"status": "ok", "message": msg}

@app.websocket("/ws")
async def ws_endpoint(ws: WebSocket):
    await manager.connect(ws)
    try:
        while True:
            await ws.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(ws)

async def simulate_blessings():
    await asyncio.sleep(2)
    while True:
        await asyncio.sleep(random.uniform(2.0, 5.0))
        name = random.choice(SIMULATED_NAMES)
        text = random.choice(SIMULATED_TEXTS)
        emoji = random.choice(SIMULATED_EMOJIS)
        msg = make_blessing(name, text, emoji)
        blessings_db.append(msg)
        await manager.broadcast(msg)

@app.on_event("startup")
async def on_startup():
    asyncio.create_task(simulate_blessings())

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

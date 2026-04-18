from fastapi import FastAPI, UploadFile, File
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from langchain.agents import create_agent
from langchain.messages import HumanMessage
from langgraph.checkpoint.memory import InMemorySaver
from langchain_deepseek import ChatDeepSeek
import os
import json
from typing import Dict, Optional
from dotenv import load_dotenv

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, ".env"))


def _resolve_project_path(path_value: str) -> str:
    if os.path.isabs(path_value):
        return path_value
    return os.path.join(BASE_DIR, path_value)

DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY")
PERSONAS_FILE = _resolve_project_path(os.getenv("PERSONAS_FILE", "personas.json"))
DEFAULT_PERSONA_ID = os.getenv("DEFAULT_PERSONA_ID", "kobe_fan")
UPLOAD_DIR = os.path.join(BASE_DIR, "upload")

FALLBACK_PERSONAS = [
    {
        "id": "kobe_fan",
        "name": "科比球迷",
        "system_prompt": "你是一个社交机器人,现在你的人格设定是NBA球员科比·布莱恩特的粉丝",
    },
    {
        "id": "gentle_friend",
        "name": "温柔陪伴",
        "system_prompt": "你是一个温柔耐心的社交机器人,语气自然亲切,善于倾听并提供有条理的建议。",
    },
]


def _normalize_personas(raw_personas) -> Dict[str, Dict[str, str]]:
    normalized: Dict[str, Dict[str, str]] = {}
    for item in raw_personas:
        if not isinstance(item, dict):
            continue
        persona_id = str(item.get("id", "")).strip()
        system_prompt = str(item.get("system_prompt", "")).strip()
        name = str(item.get("name") or persona_id).strip()
        if persona_id and system_prompt:
            normalized[persona_id] = {
                "id": persona_id,
                "name": name,
                "system_prompt": system_prompt,
            }
    return normalized


def load_personas() -> Dict[str, Dict[str, str]]:
    if not os.path.exists(PERSONAS_FILE):
        return _normalize_personas(FALLBACK_PERSONAS)

    try:
        with open(PERSONAS_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
        if isinstance(data, list):
            normalized = _normalize_personas(data)
        elif isinstance(data, dict) and isinstance(data.get("personas"), list):
            normalized = _normalize_personas(data["personas"])
        else:
            normalized = {}

        if normalized:
            return normalized
        print("personas.json 格式无效，回退到默认人设")
    except Exception as exc:
        print(f"读取 personas.json 失败，回退到默认人设: {exc}")

    return _normalize_personas(FALLBACK_PERSONAS)


PERSONAS = load_personas()
if DEFAULT_PERSONA_ID not in PERSONAS:
    DEFAULT_PERSONA_ID = next(iter(PERSONAS.keys()))

llm_deepseek = ChatDeepSeek(
    model="deepseek-chat",
    api_key=DEEPSEEK_API_KEY,
)

AGENT_CACHE = {}


def get_agent_for_persona(persona_id: str):
    selected_id = persona_id if persona_id in PERSONAS else DEFAULT_PERSONA_ID
    if selected_id not in AGENT_CACHE:
        AGENT_CACHE[selected_id] = create_agent(
            model=llm_deepseek,
            system_prompt=PERSONAS[selected_id]["system_prompt"],
            tools=[],
            middleware=[],
            checkpointer=InMemorySaver(),
        )
    return AGENT_CACHE[selected_id], selected_id

app = FastAPI()  # 一定要先定义 app

# 允许所有前端跨域请求
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    user_input: str
    thread_id: str = "1"
    persona_id: Optional[str] = None


@app.get("/personas")
async def list_personas():
    return {
        "default_persona_id": DEFAULT_PERSONA_ID,
        "personas": [{"id": p["id"], "name": p["name"]} for p in PERSONAS.values()],
    }

@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    file_location = os.path.join(UPLOAD_DIR, file.filename)
    with open(file_location, "wb") as f:
        content = await file.read()
        f.write(content)
    return JSONResponse({"filename": file.filename})

@app.post("/chat")
async def chat(req: ChatRequest):
    ag, selected_persona_id = get_agent_for_persona(req.persona_id or DEFAULT_PERSONA_ID)
    msg = [HumanMessage(content=req.user_input)]
    config = {"configurable": {"thread_id": req.thread_id}}
    response = ag.invoke({"messages": msg}, config=config)
    return {"reply": response["messages"][-1].content, "persona_id": selected_persona_id}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

# Social Bot

这是一个前后端分离的社交机器人项目：

- 后端：FastAPI + LangChain（目录在 back）
- 前端：React + Vite（目录在 ether-chat）

## 当前目录结构

```text
SocialBot/
├─ .vscode/
│  └─ settings.json
├─ back/
│  ├─ .env
│  ├─ .env.example
│  ├─ .gitignore
│  ├─ main_api.py
│  ├─ main.ipynb
│  ├─ personas.json
│  ├─ requirements.txt
│  └─ upload/
├─ ether-chat/
│  ├─ src/
│  │  ├─ App.tsx
│  │  ├─ index.css
│  │  └─ main.tsx
│  ├─ package.json
│  └─ 其他前端配置文件
├─ .gitignore
├─ requirements.txt
├─ start.bat
└─ README.md
```

## 快速启动（推荐）

在项目根目录运行：

```powershell
.\start.bat
```

脚本会自动：

- 进入 back 目录创建虚拟环境并安装后端依赖
- 启动后端服务 http://localhost:8000
- 进入 ether-chat 安装前端依赖并启动开发服务器 http://localhost:3000

## 手动启动

### 1) 后端

```powershell
cd back
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m uvicorn main_api:app --host 0.0.0.0 --port 8000
```

### 2) 前端

```powershell
cd ether-chat
npm install
npm run dev
```

## 环境变量

后端使用 back/.env，最少需要配置：

- DEEPSEEK_API_KEY=你的密钥

可选：

- PERSONAS_FILE=personas.json
- DEFAULT_PERSONA_ID=kobe_fan

可以先从 back/.env.example 复制一份再填写。

## 接口说明

- GET /personas：返回可用人设和默认人设
- POST /chat：发送聊天请求
- POST /upload：上传文件

## 人设配置

人设文件位置：back/personas.json

修改后重启后端即可生效。

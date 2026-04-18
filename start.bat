@echo off
setlocal
chcp 65001 >nul

set "ROOT=%~dp0"
set "BACKEND_DIR=%ROOT%back"
set "FRONTEND_DIR=%ROOT%ether-chat"
echo [Social Bot] 正在一键启动...

start "SocialBot Backend" powershell -NoExit -ExecutionPolicy Bypass -Command "Set-Location '%BACKEND_DIR%'; if (-not (Test-Path '.venv\Scripts\python.exe')) { if (Get-Command py -ErrorAction SilentlyContinue) { py -3 -m venv .venv } elseif (Get-Command python -ErrorAction SilentlyContinue) { python -m venv .venv } else { Write-Host '[Social Bot] 未检测到 Python，请先安装 Python 3.10+。' -ForegroundColor Red; return } }; if (-not (Test-Path '.venv\Scripts\python.exe')) { Write-Host '[Social Bot] 虚拟环境创建失败。' -ForegroundColor Red; return }; & '.\.venv\Scripts\python.exe' -m pip install -r requirements.txt; if ($LASTEXITCODE -ne 0) { Write-Host '[Social Bot] 后端依赖安装失败。' -ForegroundColor Red; return }; & '.\.venv\Scripts\python.exe' -m uvicorn main_api:app --host 0.0.0.0 --port 8000"

start "Ether Chat Frontend" powershell -NoExit -ExecutionPolicy Bypass -Command "Set-Location '%FRONTEND_DIR%'; if (-not (Test-Path 'node_modules')) { npm install }; npm run dev"

echo [Social Bot] 已启动前后端窗口。
echo 关闭对应窗口即可停止服务。

endlocal

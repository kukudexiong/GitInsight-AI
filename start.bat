@echo off
chcp 65001 >nul
setlocal EnableDelayedExpansion

echo ============================================
echo   GitInsight AI - 一键启动脚本
echo ============================================
echo.

:: ============ 检查前置环境 ============
echo [检查] 正在检查环境依赖...

where python >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [错误] 未检测到 Python，请先安装 Python 3.10+
    pause
    exit /b 1
)

where node >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [错误] 未检测到 Node.js，请先安装 Node.js 18+
    pause
    exit /b 1
)

where git >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [错误] 未检测到 Git，请先安装 Git
    pause
    exit /b 1
)

echo [OK] Python / Node.js / Git 已就绪
echo.

:: ============ 后端设置 ============
echo [后端] 正在准备后端环境...

cd /d "%~dp0backend"

:: 创建虚拟环境（如果不存在）
if not exist "venv\Scripts\activate.bat" (
    echo [后端] 创建 Python 虚拟环境...
    python -m venv venv
    if %ERRORLEVEL% neq 0 (
        echo [错误] 虚拟环境创建失败
        pause
        exit /b 1
    )
    echo [OK] 虚拟环境创建完成
) else (
    echo [跳过] 虚拟环境已存在
)

:: 激活虚拟环境
call venv\Scripts\activate.bat

:: 安装/更新依赖（通过对比 requirements.txt 的修改时间判断是否需要重装）
set "NEED_INSTALL=0"
if not exist "venv\.deps_installed" (
    set "NEED_INSTALL=1"
) else (
    for %%A in (requirements.txt) do set "REQ_TIME=%%~tA"
    for %%A in (venv\.deps_installed) do set "MARK_TIME=%%~tA"
    if "!REQ_TIME!" gtr "!MARK_TIME!" set "NEED_INSTALL=1"
)

if "!NEED_INSTALL!"=="1" (
    echo [后端] 安装 Python 依赖...
    pip install -r requirements.txt -q
    if %ERRORLEVEL% neq 0 (
        echo [错误] 依赖安装失败
        pause
        exit /b 1
    )
    echo. > venv\.deps_installed
    echo [OK] Python 依赖安装完成
) else (
    echo [跳过] Python 依赖已是最新
)

:: 检查 .env 配置文件
if not exist ".env" (
    echo [后端] 从 .env.example 创建 .env 配置文件...
    copy .env.example .env >nul
    echo [提示] 请稍后编辑 backend\.env 填入你的 AI API Key
    echo.
) else (
    echo [跳过] .env 配置文件已存在
)

:: 启动后端（新窗口）
echo [后端] 启动 FastAPI 服务 (端口 8000)...
start "GitInsight-Backend" cmd /k "cd /d "%~dp0backend" && call venv\Scripts\activate.bat && python main.py"

cd /d "%~dp0"

:: ============ 前端设置 ============
echo.
echo [前端] 正在准备前端环境...

cd /d "%~dp0frontend"

:: 安装 node_modules（如果不存在）
if not exist "node_modules" (
    echo [前端] 安装 npm 依赖（首次安装可能较慢）...
    npm install
    if %ERRORLEVEL% neq 0 (
        echo [错误] npm 依赖安装失败
        pause
        exit /b 1
    )
    echo [OK] npm 依赖安装完成
) else (
    echo [跳过] node_modules 已存在
)

:: 启动前端（新窗口）
echo [前端] 启动 Vite 开发服务器 (端口 5173)...
start "GitInsight-Frontend" cmd /k "cd /d "%~dp0frontend" && npm run dev"

cd /d "%~dp0"

:: ============ 完成 ============
echo.
echo ============================================
echo   启动完成！
echo   后端: http://localhost:8000
echo   前端: http://localhost:5173
echo ============================================
echo.
echo   * 两个服务分别在独立窗口运行
echo   * 关闭对应窗口即可停止服务
echo   * 如未配置 .env，AI 功能不可用，但 Git 可视化正常
echo.

:: 等待 2 秒后自动打开浏览器
timeout /t 3 /nobreak >nul
start http://localhost:5173

endlocal

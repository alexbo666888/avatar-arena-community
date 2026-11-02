@echo off
cd /d "%~dp0"
if not exist ".venv\Scripts\python.exe" (
    echo Run install.bat first. See guide.html for setup instructions.
    pause
    exit /b 1
)
".venv\Scripts\python.exe" -X utf8 "launch.py"
if errorlevel 1 (
    echo Startup failed. Copy the error above and contact the author. See guide.html.
    pause
    exit /b 1
)

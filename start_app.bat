@echo off
echo Starting Apple Notes Clone...
cd /d "%~dp0"
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: npm install failed. Make sure Node.js is installed.
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b
)
call npm start
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to start the application.
    pause
) 
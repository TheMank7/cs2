@echo off
setlocal
cd /d "%~dp0"

echo ========================================
echo   CS2 Inventory Tracker - Desktop App
echo ========================================
echo.

where node >nul 2>nul
if %errorlevel% neq 0 (
  echo Node.js is not installed or not in PATH.
  echo Install Node.js LTS from https://nodejs.org/ and run this again.
  pause
  exit /b 1
)

if not exist node_modules (
  echo Installing dependencies. This only needs to run once.
  call npm install
  if %errorlevel% neq 0 (
    echo npm install failed.
    pause
    exit /b 1
  )
)

echo Launching CS2 Inventory Tracker...
call npm run desktop:dev
pause

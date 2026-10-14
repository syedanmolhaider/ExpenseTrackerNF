@echo off
title King's Tracker - WhatsApp Bot & Device Linker
color 0A
cls
echo ========================================================
echo   👑 King's Tracker - WhatsApp Device Linker
echo ========================================================
echo.
echo Starting WhatsApp Bot & Dashboard Bridge...
echo.
set PATH=C:\Users\anmolh\AppData\Local\Programs\nodejs;%PATH%
node whatsapp-bot.js
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ⚠️ Bot stopped or encountered an error.
    pause
)

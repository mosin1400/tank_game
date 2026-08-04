@echo off
cd /d "%~dp0"
start "T34 Server" /min python -m http.server 8080
timeout /t 2 /nobreak >nul
start "" "http://localhost:8080/game.html"

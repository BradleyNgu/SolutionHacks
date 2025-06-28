@echo off
echo Starting SolutionHacks Anime Maid Application...
echo.

echo Starting Backend Server...
cd /d "%~dp0backend"
start "Backend Server" cmd /k "npm start"

echo Waiting for backend to initialize...
timeout /t 3 /nobreak > nul

echo Starting Frontend Application...
cd /d "%~dp0frontend"
start "Frontend App" cmd /k "npm start"

echo.
echo Both services are starting...
echo Backend: http://localhost:3001
echo Frontend: Electron Desktop App
echo.
echo Close this window or press Ctrl+C to stop watching.
pause 
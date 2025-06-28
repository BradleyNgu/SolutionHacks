#!/bin/bash

echo "Starting SolutionHacks Anime Maid Application..."
echo

echo "Starting Backend Server..."
cd backend
npm start &
BACKEND_PID=$!

echo "Waiting for backend to initialize..."
sleep 3

echo "Starting Frontend Application..."
cd ../frontend
npm start &
FRONTEND_PID=$!

echo
echo "Both services are running..."
echo "Backend: http://localhost:3001 (PID: $BACKEND_PID)"
echo "Frontend: Electron Desktop App (PID: $FRONTEND_PID)"
echo
echo "Press Ctrl+C to stop both services"

# Wait for Ctrl+C
trap 'echo; echo "Stopping services..."; kill $BACKEND_PID $FRONTEND_PID; exit' INT
wait 
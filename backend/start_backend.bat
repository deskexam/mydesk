@echo off
echo Starting EduRAG Backend Server...
echo.

REM Change to the backend directory
cd /d "%~dp0"

echo Current directory: %CD%
echo.

REM Add the backend directory to Python path and start the server
python -c "import sys; import os; sys.path.insert(0, os.getcwd()); print('Python path updated'); from main import app; import uvicorn; print('=== EduRAG Backend Server Starting ==='); print('Server URL: http://localhost:8000'); print('API Docs: http://localhost:8000/docs'); print('=' * 50); uvicorn.run(app, host='0.0.0.0', port=8000, log_level='info')"
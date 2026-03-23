@echo off
echo Starting EduRAG Backend Server...
echo.
echo Backend directory: %~dp0
echo Adding to Python path...
echo.
python -c "import sys; sys.path.insert(0, '%~dp0'); from main import app; import uvicorn; print('=== EduRAG Backend Server Starting ==='); print('Starting server on http://localhost:8000'); print('Press Ctrl+C to stop'); print('=' * 50); uvicorn.run('main:app', host='0.0.0.0', port=8000, reload=True, log_level='info')"
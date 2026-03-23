@echo off
echo 🚀 Starting DeskExam - Merged Project
echo ======================================

echo.
echo 📁 Project Structure:
echo   ├── frontend/  - React application (SikshaSetu base)
echo   └── backend/   - FastAPI application (EduRAG base)
echo.

echo 🔧 Setting up Backend (FastAPI)...
cd backend

if exist requirements.txt (
    echo 📦 Installing Python dependencies...
    pip install -r requirements.txt
)

echo 🌐 Backend will run on: http://localhost:8000
echo 📚 API documentation: http://localhost:8000/docs
echo.

echo 🎨 Setting up Frontend (React)...
cd ../frontend

if exist package.json (
    echo 📦 Installing Node.js dependencies...
    npm install
)

echo 🎨 Frontend will run on: http://localhost:3000
echo.

echo 📝 Environment Setup:
echo 1. Create .env file in backend/ with your MongoDB URL and Groq API key
echo 2. Create .env file in frontend/ with API URLs and Google Client ID
echo.

echo 🎯 Key Features Available:
echo   ✨ AI Paper Generation (FastAPI + RAG)
echo   📝 LaTeX Editor (React + KaTeX)
echo   🔄 PDF Tools (Import/Export)
echo   💰 Payment Integration (Razorpay)
echo   👥 User Management (MongoDB)
echo.

echo 🚀 Starting servers...
echo.

REM Start backend in a new window
start "DeskExam Backend" cmd /k "cd backend && uvicorn main:app --reload --port 8000"

REM Wait a moment
timeout /t 2 /nobreak >nul

REM Start frontend in a new window
start "DeskExam Frontend" cmd /k "cd frontend && npm start"

echo ✅ Servers started successfully!
echo.
echo 🔗 URLs:
echo   Frontend: http://localhost:3000
echo   Backend:  http://localhost:8000
echo   API Docs: http://localhost:8000/docs
echo.
echo 💡 Tips:
echo   - Use Ctrl+C to stop any server
echo   - Check console logs for any errors
echo   - Make sure MongoDB is running
echo   - Set up environment variables for full functionality
echo.
pause
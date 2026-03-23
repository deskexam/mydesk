#!/bin/bash

echo "🚀 Starting DeskExam - Merged Project"
echo "======================================"

# Check if Python and Node.js are installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python3 is not installed. Please install Python3 first."
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo "❌ Node.js/npm is not installed. Please install Node.js first."
    exit 1
fi

# Check if MongoDB is running
if ! pgrep -x "mongod" > /dev/null; then
    echo "⚠️  MongoDB is not running. Please start MongoDB first."
    echo "   You can start it with: mongod --dbpath /data/db"
    echo "   Or use MongoDB Atlas cloud service."
fi

echo ""
echo "📁 Project Structure:"
echo "  ├── frontend/  - React application (SikshaSetu base)"
echo "  └── backend/   - FastAPI application (EduRAG base)"
echo ""

# Start backend in a new terminal
echo "🔧 Starting Backend (FastAPI)..."
cd backend

# Install Python dependencies if requirements.txt exists
if [ -f "requirements.txt" ]; then
    echo "📦 Installing Python dependencies..."
    pip install -r requirements.txt
fi

# Start backend server
echo "🌐 Backend will run on: http://localhost:8000"
echo "📚 API documentation: http://localhost:8000/docs"
echo ""

# Start frontend in another terminal
cd ../frontend

# Install Node.js dependencies if package.json exists
if [ -f "package.json" ]; then
    echo "📦 Installing Node.js dependencies..."
    npm install
fi

echo "🎨 Frontend will run on: http://localhost:3000"
echo ""

# Instructions for environment setup
echo "📝 Environment Setup:"
echo "1. Create .env file in backend/ with your MongoDB URL and Groq API key"
echo "2. Create .env file in frontend/ with API URLs and Google Client ID"
echo ""

echo "🎯 Key Features Available:"
echo "  ✨ AI Paper Generation (FastAPI + RAG)"
echo "  📝 LaTeX Editor (React + KaTeX)"
echo "  🔄 PDF Tools (Import/Export)"
echo "  💰 Payment Integration (Razorpay)"
echo "  👥 User Management (MongoDB)"
echo ""

echo "🚀 Starting servers..."
echo ""

# Start both servers
gnome-terminal --tab --title="Backend" --command="bash -c 'cd backend && uvicorn main:app --reload --port 8000'"
sleep 2
gnome-terminal --tab --title="Frontend" --command="bash -c 'cd frontend && npm start'"

echo "✅ Servers started successfully!"
echo ""
echo "🔗 URLs:"
echo "  Frontend: http://localhost:3000"
echo "  Backend:  http://localhost:8000"
echo "  API Docs: http://localhost:8000/docs"
echo ""
echo "💡 Tips:"
echo "  - Use Ctrl+C to stop any server"
echo "  - Check console logs for any errors"
echo "  - Make sure MongoDB is running"
echo "  - Set up environment variables for full functionality"
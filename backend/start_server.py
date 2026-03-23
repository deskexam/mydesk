#!/usr/bin/env python3
"""
Backend server startup script for EduRAG
"""
import sys
import os

# Add the backend directory to Python path
backend_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, backend_dir)

# Now import and run the main application
if __name__ == "__main__":
    try:
        from main import app
        import uvicorn
        
        print("=== EduRAG Backend Server Starting ===")
        print(f"Backend directory: {backend_dir}")
        print(f"Python path includes: {backend_dir}")
        print("Starting server on http://localhost:8000")
        print("Press Ctrl+C to stop")
        print("=" * 50)
        
        uvicorn.run(
            "main:app",
            host="0.0.0.0",
            port=8000,
            reload=True,
            log_level="info"
        )
    except ImportError as e:
        print(f"Import error: {e}")
        print("Make sure you're running this from the correct directory")
        sys.exit(1)
    except Exception as e:
        print(f"Error starting server: {e}")
        sys.exit(1)
#!/usr/bin/env python3
"""
FastAPI server startup script for DeskExam RAG API
This script ensures the server runs from the correct directory
"""

import os
import sys
import uvicorn

# Ensure we're in the backend directory
if __name__ == "__main__":
    # Change to the backend directory where main.py is located
    backend_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(backend_dir)
    
    # Run the FastAPI application
    uvicorn.run(
        "main:app", 
        host="0.0.0.0", 
        port=8000, 
        reload=True,
        log_level="info"
    )
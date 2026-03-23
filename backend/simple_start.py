#!/usr/bin/env python3
import sys
import os

# Add backend directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    print("Attempting to import main module...")
    from main import app
    print("Main module imported successfully")
    
    print("Attempting to import uvicorn...")
    import uvicorn
    print("Uvicorn imported successfully")
    
    print("Starting server...")
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")
    
except ImportError as e:
    print(f"Import error: {e}")
    import traceback
    traceback.print_exc()
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
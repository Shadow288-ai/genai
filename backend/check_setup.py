#!/usr/bin/env python3
"""
Setup checker for HomeGuard AI backend
Checks if all dependencies are installed and configured correctly
"""
import sys
import subprocess
import requests
from pathlib import Path

def check_python_version():
    """Check Python version"""
    version = sys.version_info
    if version.major < 3 or (version.major == 3 and version.minor < 10):
        print("❌ Python 3.10+ required. Current:", sys.version)
        return False
    print(f"✓ Python {version.major}.{version.minor}.{version.micro}")
    return True

def check_ollama():
    """Check if Ollama is installed and running"""
    try:
        # Check if ollama command exists
        result = subprocess.run(["ollama", "--version"], 
                              capture_output=True, text=True, timeout=5)
        if result.returncode == 0:
            print(f"✓ Ollama installed: {result.stdout.strip()}")
        else:
            print("❌ Ollama command found but not working")
            return False
    except FileNotFoundError:
        print("❌ Ollama not installed")
        print("   Install from: https://ollama.com")
        return False
    except Exception as e:
        print(f"❌ Error checking Ollama: {e}")
        return False
    
    # Check if Ollama server is running
    try:
        response = requests.get("http://localhost:11434/api/tags", timeout=2)
        if response.status_code == 200:
            print("✓ Ollama server is running")
            return True
        else:
            print("⚠ Ollama server returned error:", response.status_code)
            return False
    except requests.exceptions.ConnectionError:
        print("❌ Ollama server not running")
        print("   Start it with: ollama serve")
        return False
    except Exception as e:
        print(f"❌ Error connecting to Ollama: {e}")
        return False

def check_ollama_models():
    """Check if a model is available"""
    try:
        response = requests.get("http://localhost:11434/api/tags", timeout=2)
        if response.status_code == 200:
            models = response.json().get("models", [])
            if models:
                print(f"✓ Found {len(models)} model(s):")
                for model in models:
                    print(f"   - {model.get('name', 'unknown')}")
                return True
            else:
                print("❌ No models found")
                print("   Pull a model: ollama pull llama3")
                return False
        return False
    except Exception as e:
        print(f"❌ Error checking models: {e}")
        return False

def check_python_packages():
    """Check if required Python packages are installed"""
    required = [
        ("fastapi", "fastapi"),
        ("uvicorn", "uvicorn"),
        ("langchain", "langchain"),
        ("langchain-community", "langchain_community"),
        ("sentence-transformers", "sentence_transformers"),
        ("faiss-cpu", "faiss"),
        ("pydantic", "pydantic")
    ]
    
    missing = []
    for package_name, import_name in required:
        try:
            __import__(import_name)
            print(f"✓ {package_name}")
        except ImportError:
            print(f"❌ {package_name} not installed")
            missing.append(package_name)
    
    if missing:
        print(f"\n⚠ Missing packages: {', '.join(missing)}")
        print("   Install with: pip install -r requirements.txt")
        return False
    return True

def check_house_manuals():
    """Check if house manual files exist"""
    # Try both possible paths (from backend/ and from project root)
    script_dir = Path(__file__).parent
    data_dir1 = script_dir / "data" / "house_manuals"
    data_dir2 = script_dir.parent / "data" / "house_manuals"
    data_dir3 = script_dir.parent / "backend" / "data" / "house_manuals"
    
    data_dir = None
    if data_dir1.exists():
        data_dir = data_dir1
    elif data_dir2.exists():
        data_dir = data_dir2
    elif data_dir3.exists():
        data_dir = data_dir3
    
    if not data_dir or not data_dir.exists():
        print("⚠ House manuals directory not found")
        print(f"   Checked: {data_dir1}")
        print(f"   Checked: {data_dir2}")
        print(f"   Checked: {data_dir3}")
        return False
    
    files = list(data_dir.glob("*.txt"))
    if files:
        print(f"✓ Found {len(files)} house manual file(s):")
        for f in files:
            print(f"   - {f.name}")
        return True
    else:
        print("⚠ No house manual files found")
        return False

def main():
    print("=" * 60)
    print("HomeGuard AI - Setup Checker")
    print("=" * 60)
    print()
    
    all_ok = True
    
    print("1. Checking Python version...")
    if not check_python_version():
        all_ok = False
    print()
    
    print("2. Checking Ollama installation...")
    ollama_ok = check_ollama()
    if not ollama_ok:
        all_ok = False
    print()
    
    if ollama_ok:
        print("3. Checking Ollama models...")
        if not check_ollama_models():
            all_ok = False
        print()
    
    print("4. Checking Python packages...")
    if not check_python_packages():
        all_ok = False
    print()
    
    print("5. Checking house manuals...")
    check_house_manuals()
    print()
    
    print("=" * 60)
    if all_ok:
        print("✓ All checks passed! You're ready to start the backend.")
        print("\nNext steps:")
        print("  1. Make sure Ollama is running: ollama serve")
        print("  2. Start backend: python -m app.main")
    else:
        print("❌ Some checks failed. Please fix the issues above.")
    print("=" * 60)

if __name__ == "__main__":
    main()


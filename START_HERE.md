# 🚀 START HERE - Getting the LLM Working

This guide will get you from zero to a working AI-powered chat in 10 minutes.

## TL;DR - The Fastest Path

```bash
# 1. Install Ollama (if not installed)
# Mac: brew install ollama
# Or download from: https://ollama.com

# 2. Start Ollama
ollama serve

# 3. Pull a model (in new terminal)
ollama pull llama3

# 4. Setup backend
cd backend
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# 5. Start backend (keep Ollama running!)
python -m app.main

# 6. Start frontend (in new terminal)
npm install
npm run dev

# 7. Open http://localhost:5173 and test!
```

## Detailed Steps

### Step 1: Install Ollama ⚙️

**Mac:**
```bash
brew install ollama
```

**Windows/Linux:**
- Download from: https://ollama.com/download
- Run installer

**Verify:**
```bash
ollama --version
```

📖 **Need help?** See [INSTALL_OLLAMA.md](./INSTALL_OLLAMA.md)

### Step 2: Start Ollama 🟢

```bash
ollama serve
```

**Keep this terminal open!** Ollama needs to keep running.

### Step 3: Download a Model 📦

Open a **new terminal** and run:

```bash
# Choose one (llama3 recommended):
ollama pull llama3    # Best quality (~4.7GB)
# OR
ollama pull mistral   # Faster (~4GB)
# OR  
ollama pull phi3      # Fastest, smallest (~2GB)
```

This downloads the model (takes 2-5 minutes).

**Verify:**
```bash
ollama list
# Should show your model
```

**Test:**
```bash
ollama run llama3
# Type: "Hello"
# Should get response. Type /bye to exit
```

### Step 4: Setup Backend 🐍

```bash
cd backend

# Create virtual environment
python3 -m venv venv

# Activate it
source venv/bin/activate  # Mac/Linux
# OR
venv\Scripts\activate     # Windows

# Install dependencies
pip install -r requirements.txt
```

**Check setup:**
```bash
python check_setup.py
```

This will verify everything is ready.

### Step 5: Start Backend 🚀

**Make sure Ollama is still running** (Step 2), then:

```bash
# In backend/ directory with venv activated
python -m app.main
```

You should see:
```
✓ Connected to Ollama (llama3)
✓ Loaded house manual for prop-1...
✓ Backend initialized successfully!
INFO: Uvicorn running on http://0.0.0.0:8000
```

**Keep this terminal open!**

### Step 6: Start Frontend 💻

Open a **new terminal**:

```bash
# In project root
npm install  # If first time
npm run dev
```

You should see:
```
VITE ready in XXX ms
➜  Local:   http://localhost:5173/
```

### Step 7: Test It! 🎉

1. Open http://localhost:5173
2. Login: `tenant@example.com` / `admin123`
3. Go to **Messages**
4. Type: **"How does the TV work?"**
5. Watch the AI respond automatically! 🤖

## What You Should Have Running

**3 terminal windows:**

1. **Terminal 1**: `ollama serve` (Ollama server)
2. **Terminal 2**: `python -m app.main` (Backend API)
3. **Terminal 3**: `npm run dev` (Frontend)

## Troubleshooting

### ❌ "ollama: command not found"
→ Install Ollama first (Step 1)

### ❌ "Could not connect to Ollama"
→ Make sure `ollama serve` is running (Step 2)

### ❌ "No models found"
→ Pull a model: `ollama pull llama3` (Step 3)

### ❌ "Module not found" (Python)
→ Activate venv and install: `pip install -r requirements.txt`

### ❌ Frontend can't connect
→ Check backend is running on port 8000
→ Check browser console for errors

### ❌ Slow responses
→ First request loads models (10-30 seconds) - this is normal!
→ Subsequent requests are faster (2-5 seconds)
→ Use `phi3` model for faster responses

## Quick Health Checks

```bash
# Check Ollama
ollama list
curl http://localhost:11434/api/tags

# Check backend
curl http://localhost:8000/health

# Check what's running
lsof -i :8000   # Backend
lsof -i :5173   # Frontend  
lsof -i :11434  # Ollama
```

## Next Steps

Once it's working:
- ✅ Try different questions
- ✅ Test issue reporting ("The AC is making noise")
- ✅ Check backend logs for AI responses
- ✅ Customize house manuals in `backend/data/house_manuals/`

## Need More Help?

- **Installation issues?** → [INSTALL_OLLAMA.md](./INSTALL_OLLAMA.md)
- **Detailed setup?** → [QUICK_START.md](./QUICK_START.md)
- **Backend docs?** → [backend/README.md](./backend/README.md)

---

**You're all set! 🎉** The AI will now automatically respond to tenant messages.


# Quick Start Guide - Getting the LLM Working

Follow these steps to get the RAG-powered AI assistant running.

## Step 1: Install Ollama

### Mac:
```bash
# Download and install from website, or use Homebrew:
brew install ollama
```

### Windows:
1. Go to https://ollama.com
2. Download the installer
3. Run the installer

### Linux:
```bash
curl -fsSL https://ollama.com/install.sh | sh
```

## Step 2: Start Ollama

After installation, Ollama should start automatically. If not:

```bash
ollama serve
```

Keep this terminal window open - Ollama needs to keep running.

## Step 3: Pull a Model

Open a **new terminal window** and pull a model:

```bash
# Recommended: llama3 (good balance of quality and speed)
ollama pull llama3

# OR for faster/smaller (good for testing):
ollama pull mistral

# OR for very small (fastest, good for testing):
ollama pull phi3
```

This will download the model (takes a few minutes, ~4-8GB for llama3).

**Verify it worked:**
```bash
ollama list
# Should show: llama3 (or mistral, phi3)
```

**Test the model:**
```bash
ollama run llama3
# Type: "Hello, can you help me?"
# Should get a response. Type /bye to exit
```

## Step 4: Setup Python Backend

```bash
cd backend

# Create virtual environment
python3 -m venv venv

# Activate it
# Mac/Linux:
source venv/bin/activate
# Windows:
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

## Step 5: Start the Backend

Make sure Ollama is still running (Step 2), then:

```bash
# In the backend directory with venv activated
python -m app.main
```

You should see:
```
Loading embedding model: all-MiniLM-L6-v2...
Connecting to Ollama model: llama3...
✓ Connected to Ollama (llama3)
Loading house manuals...
✓ Loaded house manual for prop-1 from prop-1_downtown_loft.txt
Building vector stores...
✓ Created vector store for property prop-1 with X chunks
✓ Backend initialized successfully!
INFO:     Uvicorn running on http://0.0.0.0:8000
```

**Keep this terminal open** - the backend needs to keep running.

## Step 6: Start the Frontend

Open a **new terminal window**:

```bash
# In the project root
npm install  # If you haven't already
npm run dev
```

You should see:
```
VITE v7.x.x  ready in XXX ms

➜  Local:   http://localhost:5173/
```

## Step 7: Test It!

1. Open http://localhost:5173 in your browser
2. Login as tenant: `tenant@example.com` / `admin123`
3. Go to Messages
4. Type a message like: "How does the TV work?"
5. You should see the AI respond automatically!

## Troubleshooting

### "Could not connect to Ollama"
- Make sure Ollama is running: `ollama serve`
- Check it's on port 11434: `curl http://localhost:11434/api/tags`
- Verify model is pulled: `ollama list`

### "Module not found" errors
- Make sure virtual environment is activated
- Reinstall: `pip install -r requirements.txt`

### Backend won't start
- Check Python version: `python3 --version` (needs 3.10+)
- Check all dependencies installed: `pip list`

### Frontend can't connect to backend
- Check backend is running on port 8000
- Check browser console for errors
- Verify CORS settings in `backend/app/main.py`

### Slow responses
- First request loads models (takes 10-30 seconds)
- Subsequent requests should be faster (2-5 seconds)
- Use smaller model (`phi3`) for faster responses

## What's Running?

You should have **3 terminal windows open**:

1. **Terminal 1**: Ollama (`ollama serve`)
2. **Terminal 2**: Backend (`python -m app.main`)
3. **Terminal 3**: Frontend (`npm run dev`)

## Quick Commands Reference

```bash
# Check Ollama is running
ollama list

# Test Ollama model
ollama run llama3

# Check backend health
curl http://localhost:8000/health

# Check what's running on ports
lsof -i :8000  # Backend
lsof -i :5173  # Frontend
lsof -i :11434 # Ollama
```

## Next Steps

Once everything is working:
- Try different questions in the chat
- Test issue reporting (e.g., "The AC is making noise")
- Test the "Ask AI Assistant" quick questions
- Check the backend terminal for logs


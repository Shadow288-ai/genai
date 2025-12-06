# Setup Guide - HomeGuard AI

Complete setup instructions for running the RAG-powered tenant-landlord app.

## Step 1: Install Ollama

1. **Download Ollama**
   - Visit: https://ollama.com
   - Download and install for your OS (Mac/Windows/Linux)

2. **Pull a Model**
   ```bash
   # Recommended (good balance):
   ollama pull llama3
   
   # Or lighter/faster:
   ollama pull mistral
   
   # Or very small (for testing):
   ollama pull phi3
   ```

3. **Verify Installation**
   ```bash
   ollama list  # Should show your model
   ollama run llama3  # Test it works
   ```

## Step 2: Setup Backend

```bash
cd backend

# Create virtual environment
python3 -m venv venv

# Activate (Mac/Linux):
source venv/bin/activate

# Activate (Windows):
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start server
python -m app.main
```

Start the backend server:
```bash
cd backend
python -m app.main
```

Backend should now be running on `http://localhost:8000`

**Test it:**
```bash
curl http://localhost:8000/health
```

## Step 3: Setup Frontend

```bash
# Install dependencies
npm install

# Start dev server
npm run dev
```

Frontend should now be running on `http://localhost:5173`

## Step 4: Test the Integration

1. Open `http://localhost:5173`
2. Login as tenant: `tenant@example.com` / `admin123`
3. Go to Messages
4. Click "Ask AI Assistant"
5. Try: "How does the TV work?"
6. You should get an AI response based on the house manual!

## Troubleshooting

### Backend won't start

**Error: "Could not connect to Ollama"**
- Make sure Ollama is running: `ollama serve`
- Check model is pulled: `ollama list`
- Test: `ollama run llama3`

**Error: "Module not found"**
- Activate virtual environment: `source venv/bin/activate`
- Reinstall: `pip install -r requirements.txt`

**Error: "Port 8000 already in use"**
- Change port in `backend/app/main.py`: `uvicorn.run(app, port=8001)`
- Or kill process using port 8000

### Frontend can't connect to backend

**Error: "Failed to fetch"**
- Check backend is running: `curl http://localhost:8000/health`
- Check CORS settings in `backend/app/main.py`
- Verify `VITE_API_URL` in `.env` (or default `http://localhost:8000`)

**Error: "Network error"**
- Make sure backend is on port 8000
- Check browser console for CORS errors
- Try accessing backend directly: `http://localhost:8000/health`

### Slow AI responses

- First request loads models (takes 10-30 seconds)
- Subsequent requests should be faster (2-5 seconds)
- Use smaller model (`phi3`) for faster responses
- Reduce `top_k` in RAG queries (in `rag_service.py`)

## What's Happening Under the Hood

1. **User asks question** → Frontend sends to `/api/chat`
2. **Backend receives** → Checks if it's a question or issue
3. **If question** → RAG pipeline:
   - Embeds question using sentence-transformers
   - Searches FAISS vector store for relevant chunks
   - Sends chunks + question to Ollama LLM
   - Returns answer
4. **If issue** → Issue triage:
   - Sends description to Ollama LLM
   - LLM classifies category, severity, suggests actions
   - Creates incident ticket
5. **Response sent back** → Frontend displays AI message

## Next Steps

- Add more properties to `SAMPLE_HOUSE_MANUALS` in `backend/app/main.py`
- Customize prompts in `backend/app/rag_service.py`
- Add real database instead of in-memory storage
- Implement WebSocket for real-time updates
- Add authentication/authorization

## Model Recommendations

**For Development/Testing:**
- `phi3` - Very fast, good for testing
- `mistral` - Good balance

**For Production:**
- `llama3` - Best quality, slower
- `llama3:8b` - Good balance of quality/speed

**Embeddings:**
- `all-MiniLM-L6-v2` - Default, fast, good quality
- `bge-m3` - Better for multilingual content


# HomeGuard AI - Tenant-Landlord Communication Platform

A comprehensive tenant-landlord communication app with AI-powered property assistant, RAG-based house manual Q&A, and automated maintenance ticket management.

## Features

- **Airbnb-style Chat Interface**: Real-time messaging between tenants and landlords
- **AI Property Assistant**: RAG-powered Q&A using house manuals and property documents
- **Issue Triage**: Automatic classification and severity assessment of maintenance issues
- **Calendar Management**: Unified calendar for stays, maintenance, and AI suggestions
- **Reply Suggestions**: AI-generated reply suggestions for landlords

## Tech Stack

### Frontend
- React 19 + TypeScript
- Vite
- React Router

### Backend
- FastAPI (Python)
- LangChain (RAG orchestration)
- Ollama (Local LLM - llama3/mistral/phi3)
- Sentence Transformers (Embeddings - all-MiniLM-L6-v2)
- FAISS (Vector database)

## Prerequisites

1. **Node.js 18+** and **npm**
2. **Python 3.10+**
3. **Ollama** installed and running

## Installation & Setup

### Step 1: Install Ollama

**Mac:**
```bash
brew install ollama
# Or download from https://ollama.com
```

**Windows:**
1. Go to https://ollama.com/download
2. Download and run `OllamaSetup.exe`

**Linux:**
```bash
curl -fsSL https://ollama.com/install.sh | sh
```

### Step 2: Pull a Model

```bash
# Recommended (good balance):
ollama pull llama3

# Or for faster/smaller:
ollama pull mistral

# Or for very small (testing):
ollama pull phi3
```

**Verify installation:**
```bash
ollama list
ollama run llama3  # Test it works
```

### Step 3: Start Ollama

Ollama usually starts automatically. If not:
```bash
ollama serve
```
Keep this terminal open - Ollama needs to keep running.

### Step 4: Setup Backend

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

# Start backend server
python -m app.main
```

Backend will run on `http://localhost:8000`

**Test it:**
```bash
curl http://localhost:8000/health
```

### Step 5: Setup Frontend

Open a **new terminal window**:

```bash
# Install dependencies
npm install

# Start dev server
npm run dev
```

Frontend will run on `http://localhost:5173`

### Step 6: Access the App

Open `http://localhost:5173` in your browser.

**Demo Login:**
- **Landlord**: `landlord@example.com` / `admin123`
- **Tenant**: `tenant@example.com` / `admin123`

## Running the Project

You need **3 terminal windows** running:

1. **Terminal 1**: Ollama
   ```bash
   ollama serve
   ```

2. **Terminal 2**: Backend
   ```bash
   cd backend
   source venv/bin/activate  # Mac/Linux
   python -m app.main
   ```

3. **Terminal 3**: Frontend
   ```bash
   npm run dev
   ```

## Project Structure

```
├── backend/
│   ├── app/
│   │   ├── main.py          # FastAPI app
│   │   ├── rag_service.py   # RAG pipeline
│   │   └── models.py        # Pydantic models
│   └── data/
│       └── house_manuals/   # Property manuals
├── src/
│   ├── components/          # React components
│   ├── pages/               # Page components
│   ├── services/            # API client & mock data
│   └── types.ts             # TypeScript types
└── README.md
```

## Configuration

### Backend Model Selection

Edit `backend/app/main.py`:
```python
rag_service = RAGService(
    model_name="llama3",  # or "mistral", "phi3"
    embedding_model="all-MiniLM-L6-v2"
)
```

### Frontend API URL

Create `.env` file in root:
```
VITE_API_URL=http://localhost:8000
```

## Troubleshooting

### Backend Issues

**"Could not connect to Ollama"**
- Make sure Ollama is running: `ollama serve`
- Check model is pulled: `ollama list`
- Test: `ollama run llama3`

**"Module not found" errors**
- Activate virtual environment
- Reinstall: `pip install -r requirements.txt`

**Slow responses**
- First run loads models (takes 10-30 seconds)
- Use smaller model: `phi3` instead of `llama3`
- Subsequent requests should be faster (2-5 seconds)

### Frontend Issues

**API connection errors**
- Check backend is running on port 8000
- Check CORS settings in `backend/app/main.py`
- Verify `VITE_API_URL` in `.env`

**Build errors**
- Run `npm install` again
- Clear node_modules and reinstall

### Port Already in Use

**Port 8000 (Backend):**
- Change port in `backend/app/main.py`
- Or kill process: `lsof -ti:8000 | xargs kill`

**Port 5173 (Frontend):**
- Vite will automatically use next available port

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

## Development

### Adding New Properties

Add house manual files to `backend/data/house_manuals/` and update `backend/app/main.py`:

```python
property_files = {
    "prop-1": "prop-1_downtown_loft.txt",
    "prop-2": "prop-2_beach_house.txt",
    "prop-3": "prop-3_new_property.txt",  # Add new property
}
```

### Customizing RAG

Edit `backend/app/rag_service.py`:
- Adjust `chunk_size` and `chunk_overlap` in `RecursiveCharacterTextSplitter`
- Modify prompt template in `query()` method
- Change `top_k` retrieval count

## Model Recommendations

**For Development/Testing:**
- `phi3` - Very fast, good for testing
- `mistral` - Good balance

**For Production:**
- `llama3` - Best quality, slower
- `llama3:8b` - Good balance of quality/speed

**System Requirements:**
- RAM: At least 8GB (16GB recommended)
- Storage: 10GB free space for models
- CPU: Any modern CPU works (GPU optional but faster)

## Production Deployment

### Backend
- Use production ASGI server (e.g., Gunicorn + Uvicorn)
- Set up proper database (PostgreSQL recommended)
- Use environment variables for configuration
- Add authentication/authorization
- Set up proper logging

### Frontend
- Build: `npm run build`
- Serve with Nginx or similar
- Configure API URL for production
- Set up HTTPS

## License

MIT

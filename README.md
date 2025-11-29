# HomeGuard AI - Tenant-Landlord Communication Platform

A comprehensive tenant-landlord communication app with AI-powered property assistant, predictive maintenance, and RAG-based house manual Q&A.

## Features

- **Airbnb-style Chat Interface**: Real-time messaging between tenants and landlords
- **AI Property Assistant**: RAG-powered Q&A using house manuals and property documents
- **Issue Triage**: Automatic classification and severity assessment of maintenance issues
- **Predictive Maintenance**: Risk scoring and AI-suggested maintenance windows
- **Calendar Management**: Unified calendar for stays, maintenance, and AI suggestions
- **Reply Suggestions**: AI-generated reply suggestions for landlords
- **Multilingual Support**: (UI ready, backend integration pending)

## Tech Stack

### Frontend
- React 19 + TypeScript
- Vite
- React Router
- Airbnb-inspired modern UI

### Backend
- FastAPI (Python)
- LangChain (RAG orchestration)
- Ollama (Local LLM - llama3/mistral/phi3)
- Sentence Transformers (Embeddings - all-MiniLM-L6-v2)
- FAISS (Vector database)

## Quick Start

### Prerequisites

1. **Node.js 18+** and **npm**
2. **Python 3.10+**
3. **Ollama** installed and running

> **📖 New to Ollama?** See [INSTALL_OLLAMA.md](./INSTALL_OLLAMA.md) for detailed installation instructions.
> 
> **🚀 Quick setup?** See [QUICK_START.md](./QUICK_START.md) for step-by-step guide.

### 1. Install Ollama

Download from https://ollama.com and install.

Then pull a model:
```bash
ollama pull llama3
# Or for a lighter option:
ollama pull mistral
# Or for testing:
ollama pull phi3
```

Verify it works:
```bash
ollama run llama3
```

### 2. Setup Backend

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start backend server
python -m app.main
# Or: uvicorn app.main:app --reload --port 8000
```

Backend will run on `http://localhost:8000`

### 3. Setup Frontend

```bash
# Install dependencies
npm install

# Start dev server
npm run dev
```

Frontend will run on `http://localhost:5173`

### 4. Access the App

Open `http://localhost:5173` in your browser.

**Demo Login:**
- **Landlord**: `landlord@example.com` / `admin123`
- **Tenant**: `tenant@example.com` / `admin123`

## Project Structure

```
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py          # FastAPI app
│   │   ├── rag_service.py   # RAG pipeline
│   │   └── models.py        # Pydantic models
│   ├── requirements.txt
│   └── README.md
├── src/
│   ├── components/
│   │   └── chat/
│   │       └── ChatInterface.tsx
│   ├── pages/
│   │   ├── tenant/          # Tenant views
│   │   └── landlord/        # Landlord views
│   ├── services/
│   │   ├── api.ts           # API client
│   │   └── mockData.ts      # Mock data
│   └── types.ts
└── README.md
```

## API Endpoints

- `GET /health` - Health check
- `POST /api/chat` - Main chat endpoint (RAG + triage)
- `POST /api/rag/query` - Direct RAG query
- `POST /api/triage` - Issue triage
- `POST /api/suggest-reply` - Reply suggestion
- `GET /api/conversations/{id}` - Get conversation
- `GET /api/incidents/{id}` - Get incident

## Configuration

### Backend Model Selection

Edit `backend/app/main.py`:

```python
rag_service = RAGService(
    model_name="llama3",  # or "mistral", "phi3"
    embedding_model="all-MiniLM-L6-v2"  # or "bge-m3" for multilingual
)
```

### Frontend API URL

Create `.env` file in root:

```
VITE_API_URL=http://localhost:8000
```

## Troubleshooting

### Backend Issues

**Ollama not connecting:**
- Make sure Ollama is running: `ollama serve`
- Check model is pulled: `ollama list`
- Test: `ollama run llama3`

**Import errors:**
- Activate virtual environment
- Reinstall: `pip install -r requirements.txt`

**Slow responses:**
- First run loads models (takes time)
- Use smaller model: `phi3` instead of `llama3`
- Reduce `top_k` in RAG queries

### Frontend Issues

**API connection errors:**
- Check backend is running on port 8000
- Check CORS settings in `backend/app/main.py`
- Verify `VITE_API_URL` in `.env`

**Build errors:**
- Run `npm install` again
- Clear node_modules and reinstall

## Development

### Adding New Properties

Edit `backend/app/main.py` and add to `SAMPLE_HOUSE_MANUALS`:

```python
SAMPLE_HOUSE_MANUALS = {
    "prop-1": ["House manual text here..."],
    "prop-3": ["New property manual..."]
}
```

### Customizing RAG

Edit `backend/app/rag_service.py`:
- Adjust `chunk_size` and `chunk_overlap` in `RecursiveCharacterTextSplitter`
- Modify prompt template in `query()` method
- Change `top_k` retrieval count

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

## Contributing

This is a demonstration project. For production use, consider:
- Proper authentication/authorization
- Database persistence
- Real-time WebSocket updates
- Production-grade error handling
- Monitoring and logging
- Security hardening

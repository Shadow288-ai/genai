# HomeGuard AI Backend

RAG-powered backend service using Ollama, LangChain, and FAISS.

## Prerequisites

1. **Python 3.10+** installed
2. **Ollama** installed and running
   - Download from: https://ollama.com
   - Install and run: `ollama serve`
   - Pull model: `ollama pull llama3` (or `mistral`, `phi3`)

## Setup

1. **Create virtual environment** (recommended):
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. **Install dependencies**:
```bash
pip install -r requirements.txt
```

3. **Verify Ollama is running**:
```bash
ollama list  # Should show llama3 or your model
ollama run llama3  # Test that it works
```

4. **Start the backend server**:
```bash
python -m app.main
# Or with uvicorn directly:
uvicorn app.main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`

## API Endpoints

- `GET /health` - Health check
- `POST /api/chat` - Main chat endpoint (handles RAG + issue triage)
- `POST /api/rag/query` - Direct RAG query
- `POST /api/triage` - Issue triage
- `POST /api/suggest-reply` - Reply suggestion for landlords
- `GET /api/conversations/{id}` - Get conversation history
- `GET /api/incidents/{id}` - Get incident details

## House Manual Files

House manuals are loaded from `data/house_manuals/` directory as `.txt` files.

The system automatically:
1. Loads all house manual files on startup
2. Chunks the content into searchable pieces
3. Creates embeddings using sentence-transformers
4. Builds FAISS vector stores per property

To add a new property:
1. Create a `.txt` file: `data/house_manuals/prop-{id}_{name}.txt`
2. Add comprehensive house manual content
3. Update `main.py` to map property ID to filename
4. Restart server

## RAG Behavior

The RAG agent uses intelligent fallback:

1. **First**: Searches house manual documents (RAG)
2. **If not found**: Tries to answer with common knowledge
3. **If still uncertain**: Offers to escalate to landlord

Example flow:
- Question: "How does the TV work?" → Answers from house manual
- Question: "What's the best way to clean a TV?" → Answers with general knowledge
- Question: "What's the exact model number?" → Offers escalation

## Testing

Test the health endpoint:
```bash
curl http://localhost:8000/health
```

Test RAG query:
```bash
curl -X POST http://localhost:8000/api/rag/query \
  -H "Content-Type: application/json" \
  -d '{
    "property_id": "prop-1",
    "question": "How does the TV work?",
    "user_role": "TENANT"
  }'
```

Test fallback behavior:
```bash
curl -X POST http://localhost:8000/api/rag/query \
  -H "Content-Type: application/json" \
  -d '{
    "property_id": "prop-1",
    "question": "What is the exact serial number of the router?",
    "user_role": "TENANT"
  }'
```

## Troubleshooting

**Ollama connection error:**
- Make sure Ollama is running: `ollama serve`
- Check model is pulled: `ollama pull llama3`
- Test: `ollama run llama3`

**Import errors:**
- Make sure virtual environment is activated
- Reinstall: `pip install -r requirements.txt`

**Slow responses:**
- First run loads models (takes time)
- Consider using smaller model: `phi3` instead of `llama3`
- Reduce `top_k` in RAG queries

## Model Options

**LLM (via Ollama):**
- `llama3` - Recommended, good balance
- `mistral` - Lighter, faster
- `phi3` - Very small, good for testing

**Embeddings:**
- `all-MiniLM-L6-v2` - Default, lightweight
- `bge-m3` - Better multilingual support

Change in `app/rag_service.py`:
```python
rag_service = RAGService(model_name="mistral", embedding_model="all-MiniLM-L6-v2")
```


# Installing Ollama - Step by Step

Ollama is required to run the local LLM. Here's how to install it.

## Mac Installation

### Option 1: Homebrew (Recommended)
```bash
brew install ollama
```

### Option 2: Direct Download
1. Go to https://ollama.com/download
2. Download the Mac installer
3. Open the `.dmg` file
4. Drag Ollama to Applications
5. Open Ollama from Applications (it will start automatically)

## Windows Installation

1. Go to https://ollama.com/download
2. Download `OllamaSetup.exe`
3. Run the installer
4. Ollama will start automatically after installation

## Linux Installation

```bash
curl -fsSL https://ollama.com/install.sh | sh
```

Or for manual installation:
```bash
# Download
curl -L https://ollama.com/download/ollama-linux-amd64 -o /usr/local/bin/ollama
chmod +x /usr/local/bin/ollama

# Create systemd service (optional, for auto-start)
# See: https://github.com/ollama/ollama/blob/main/docs/linux.md
```

## Verify Installation

After installation, verify it works:

```bash
ollama --version
```

Should output something like: `ollama version is 0.x.x`

## Start Ollama

Ollama usually starts automatically, but if not:

```bash
ollama serve
```

Keep this terminal open - Ollama needs to keep running.

## Pull Your First Model

In a new terminal:

```bash
# Recommended for good quality/speed balance:
ollama pull llama3

# OR for faster (smaller model):
ollama pull mistral

# OR for very fast (smallest, good for testing):
ollama pull phi3
```

This downloads the model (takes a few minutes, ~4-8GB for llama3).

## Test It Works

```bash
ollama run llama3
```

Type: "Hello, can you help me?"
You should get a response. Type `/bye` to exit.

## Next Steps

Once Ollama is installed and a model is pulled:

1. Make sure Ollama is running: `ollama serve` (keep terminal open)
2. Run the setup checker: `python backend/check_setup.py`
3. Start the backend: `cd backend && python -m app.main`
4. Start the frontend: `npm run dev`

## Troubleshooting

### "ollama: command not found"
- Make sure Ollama is installed
- On Mac: Check Applications folder
- On Windows: Check it's in PATH
- Try restarting your terminal

### "Connection refused" when starting backend
- Make sure Ollama is running: `ollama serve`
- Check it's on port 11434: `curl http://localhost:11434/api/tags`

### Model download is slow
- This is normal - models are large (4-8GB)
- First download takes time
- Subsequent uses are instant

### Out of memory errors
- Use a smaller model: `ollama pull phi3` (smallest)
- Or `ollama pull mistral` (medium)
- Close other applications

## System Requirements

- **RAM**: At least 8GB (16GB recommended)
- **Storage**: 10GB free space for models
- **CPU**: Any modern CPU works (GPU optional but faster)

## Model Sizes

- `phi3`: ~2GB (fastest, good for testing)
- `mistral`: ~4GB (good balance)
- `llama3`: ~4.7GB (best quality)
- `llama3:8b`: ~4.7GB (8B parameter version)

Choose based on your system's RAM and speed needs.


**Prerequisites:** Node.js 18+, Python 3.10+, Ollama

## 1. Setup & Run Ollama
```bash
ollama pull mistral

ollama serve
```

## 2. Setup & Run Backend
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python -m app.main
```

## 3. Setup & Run Frontend
```bash
npm install
npm run dev
```

## 4. Access App
Open **http://localhost:5173**

- **Landlord:** `landlord@example.com` / `admin123`
- **Tenant:** `tenant@example.com` / `admin123`

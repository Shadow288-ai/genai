"""
FastAPI backend for HomeGuard AI
Provides RAG-powered chat and AI assistant endpoints
"""
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from typing import Dict, List, Optional
import uuid
from datetime import datetime
from pathlib import Path

from app.models import (
    ChatRequest, ChatResponse,
    RAGQueryRequest, RAGQueryResponse,
    IssueTriageRequest, IssueTriageResponse,
    ReplySuggestionRequest, ReplySuggestionResponse,
    HealthResponse,
    CalendarEventRequest,
    CalendarEventResponse,
)
from app.rag_service import RAGService

app = FastAPI(title="HomeGuard AI API", version="1.0.0")

# CORS middleware for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize RAG service
rag_service = RAGService(model_name="mistral", embedding_model="all-MiniLM-L6-v2")

# In-memory storage (replace with database in production)
conversations: Dict[str, List[Dict]] = {}
incidents: Dict[str, Dict] = {}
calendar_events: Dict[str, Dict] = {}

# Load house manuals from files
def load_house_manuals():
    """Load house manual documents from data directory"""
    data_dir = Path(__file__).parent.parent / "data" / "house_manuals"
    
    if not data_dir.exists():
        print(f"⚠ Warning: House manuals directory not found: {data_dir}")
        print("  Creating sample data directory...")
        data_dir.mkdir(parents=True, exist_ok=True)
        return {}
    
    manuals = {}
    
    # Map property IDs to file names
    property_files = {
        "prop-1": "prop-1_downtown_loft.txt",
        "prop-2": "prop-2_beach_house.txt",
    }
    
    for property_id, filename in property_files.items():
        file_path = data_dir / filename
        if file_path.exists():
            content = rag_service.load_documents_from_file(str(file_path))
            if content:
                manuals[property_id] = [content]
                print(f"✓ Loaded house manual for {property_id} from {filename}")
            else:
                print(f"⚠ Warning: Could not load content from {filename}")
        else:
            print(f"⚠ Warning: House manual file not found: {file_path}")
    
    return manuals

# Load house manuals and initialize vector stores
print("\n" + "="*50)
print("Loading house manuals...")
print("="*50)
HOUSE_MANUALS = load_house_manuals()

if not HOUSE_MANUALS:
    print("\n⚠ No house manuals loaded. Using fallback sample data.")
    # Fallback to sample data if files don't exist
    HOUSE_MANUALS = {
        "prop-1": [
            """
            Downtown Loft - House Manual
            
            WELCOME
            Welcome to your stay! This modern loft is located in the heart of downtown.
            
            WI-FI
            Network: DowntownLoft_Guest
            Password: Welcome2024!
            The router is located in the living room, on the shelf next to the TV.
            To reset: Unplug for 10 seconds, then plug back in. Wait 2 minutes for full restart.
            
            TV & ENTERTAINMENT
            The TV is a Samsung 55" Smart TV.
            To turn on: Use the Samsung remote (black, on the coffee table).
            Press the power button, then select HDMI 1 for cable, or use the Smart TV apps.
            Netflix, Hulu, and Disney+ are pre-installed. Use the guest account (no password needed).
            If the TV won't turn on, check that the power strip under the TV is switched on.
            """
        ],
        "prop-2": [
            """
            Beach House - House Manual
            
            WELCOME
            Welcome to your beachfront stay!
            
            WI-FI
            Network: BeachHouse_WiFi
            Password: OceanView2024!
            
            AC
            Master bedroom has individual AC unit. Use remote control on nightstand.
            """
        ]
    }

# Initialize vector stores with house manual data
print("\n" + "="*50)
print("Building vector stores...")
print("="*50)
for property_id, docs in HOUSE_MANUALS.items():
    rag_service.add_property_documents(property_id, docs)

print("\n" + "="*50)
print("✓ Backend initialized successfully!")
print("="*50 + "\n")

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    return {
        "status": "ok",
        "ollama_connected": rag_service.llm is not None,
        "vector_store_ready": len(rag_service.vector_stores) > 0
    }

@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Main chat endpoint - handles tenant/landlord messages and AI responses
    """
    try:
        # Store user message
        if request.conversation_id not in conversations:
            conversations[request.conversation_id] = []
        
        conversations[request.conversation_id].append({
            "role": "user",
            "content": request.message,
            "timestamp": datetime.now().isoformat(),
            "sender_id": request.user_id,
            "sender_type": request.user_role
        })
        
        # Check if message might be a question (improved heuristic)
        message_lower = request.message.lower().strip()
        is_question = (
            "?" in request.message or 
            any(word in message_lower for word in [
                "how", "what", "where", "when", "why", "can you", "tell me", 
                "explain", "do you know", "show me", "help me", "i need to know",
                "how do i", "how to", "what is", "what are", "where is", "where are"
            ]) or
            message_lower.startswith(("how", "what", "where", "when", "why", "can", "tell", "show"))
        )
        
        incident_created = False
        incident_id = None
        
        # Check if it's an issue report
        issue_keywords = ["broken", "not working", "problem", "issue", "faulty", "noise", "leak", "flicker", "doesn't work", "won't work", "not functioning", "malfunction"]
        
        # If Ollama is available, try to use RAG for questions or general messages
        # Only skip RAG for clear issue reports that need triage
        is_issue_report = any(keyword in message_lower for keyword in issue_keywords)
        
        # Use RAG if:
        # 1. It's a question, OR
        # 2. Ollama is available and it's not clearly an issue report, OR
        # 3. It's a short message that might be a question
        should_use_rag = (
            is_question or 
            (rag_service.llm is not None and not is_issue_report) or
            (len(request.message.split()) <= 10 and rag_service.llm is not None)
        )
        
        if should_use_rag and rag_service.llm is not None:
            try:
                answer, sources = rag_service.query(request.property_id, request.message)
                
                # Store AI response
                conversations[request.conversation_id].append({
                    "role": "assistant",
                    "content": answer,
                    "timestamp": datetime.now().isoformat(),
                    "sender_id": "ai-assistant",
                    "sender_type": "AI",
                    "metadata": {
                        "sources": sources,
                        "isAISuggestion": True
                    }
                })
                
                return ChatResponse(
                    response=answer,
                    sources=sources,
                    incident_created=False
                )
            except Exception as e:
                print(f"Error in RAG query: {e}")
                # Fall through to issue triage or default response
        
        # Check if it's an issue report that needs triage
        if is_issue_report:
            # Triage the issue
            triage_result = rag_service.triage_issue(request.message)
            
            # Create incident
            incident_id = str(uuid.uuid4())
            incidents[incident_id] = {
                "id": incident_id,
                "property_id": request.property_id,
                "conversation_id": request.conversation_id,
                "description": request.message,
                "category": triage_result["category"],
                "severity": triage_result["severity"],
                "status": "reported",
                "created_at": datetime.now().isoformat(),
                "ai_suggested": True
            }
            
            # Generate AI response
            response_text = f"""I've analyzed your issue and created a maintenance ticket.

**Category:** {triage_result['category']}
**Severity:** {triage_result['severity']}

**Suggested actions:**
{chr(10).join('- ' + action for action in triage_result['suggested_actions'])}

The landlord will review this and get back to you with scheduling options."""
            
            conversations[request.conversation_id].append({
                "role": "assistant",
                "content": response_text,
                "timestamp": datetime.now().isoformat(),
                "sender_id": "ai-assistant",
                "sender_type": "AI",
                "metadata": {
                    "incidentId": incident_id,
                    "isAISuggestion": True
                }
            })
            
            return ChatResponse(
                response=response_text,
                sources=None,
                incident_created=True,
                incident_id=incident_id
            )
        
        # Default: acknowledge message
        # If Ollama is not available, provide a helpful message
        if rag_service.llm is None:
            response_text = "I'm currently unable to process your message with AI assistance. Your message has been saved and the landlord will see it. Please contact your landlord directly if you need immediate assistance."
        else:
            response_text = "Thank you for your message. I'll make sure the landlord sees this."
        
        conversations[request.conversation_id].append({
            "role": "assistant",
            "content": response_text,
            "timestamp": datetime.now().isoformat(),
            "sender_id": "ai-assistant",
            "sender_type": "AI",
            "metadata": {}
        })
        
        return ChatResponse(
            response=response_text,
            sources=None,
            incident_created=False
        )
        
    except Exception as e:
        print(f"Error in chat endpoint: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/rag/query", response_model=RAGQueryResponse)
async def rag_query(request: RAGQueryRequest):
    """
    Direct RAG query endpoint for property assistant
    """
    try:
        answer, sources = rag_service.query(request.property_id, request.question)
        return RAGQueryResponse(
            answer=answer,
            sources=sources,
            confidence=0.8 if sources else 0.3
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/triage", response_model=IssueTriageResponse)
async def triage_issue(request: IssueTriageRequest):
    """
    Issue triage endpoint
    """
    try:
        result = rag_service.triage_issue(request.description)
        
        # Create incident if requested
        incident_id = None
        if request.property_id:
            incident_id = str(uuid.uuid4())
            incidents[incident_id] = {
                "id": incident_id,
                "property_id": request.property_id,
                "conversation_id": request.conversation_id,
                "description": request.description,
                "category": result["category"],
                "severity": result["severity"],
                "status": "reported",
                "created_at": datetime.now().isoformat(),
                "ai_suggested": True
            }
        
        return IssueTriageResponse(
            category=result["category"],
            severity=result["severity"],
            suggested_actions=result["suggested_actions"],
            confidence=result["confidence"],
            incident_id=incident_id
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/suggest-reply", response_model=ReplySuggestionResponse)
async def suggest_reply(request: ReplySuggestionRequest):
    """
    Generate reply suggestion for landlord
    """
    try:
        suggestion = rag_service.suggest_reply(request.context, tone="professional")
        return ReplySuggestionResponse(
            suggestion=suggestion,
            tone="professional"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/conversations/{conversation_id}")
async def get_conversation(conversation_id: str):
    """Get conversation history"""
    messages = conversations.get(conversation_id, [])
    
    # Convert backend format to frontend Message format
    formatted_messages = []
    for i, msg in enumerate(messages):
        # Use stored sender_type if available, otherwise infer from role
        sender_type = msg.get("sender_type")
        if not sender_type:
            if msg.get("role") == "user":
                sender_type = msg.get("sender_type", "TENANT")
            elif msg.get("role") == "assistant":
                sender_type = "AI"
            else:
                sender_type = "TENANT"
        
        sender_id = msg.get("sender_id")
        if not sender_id:
            if msg.get("role") == "assistant":
                sender_id = "ai-assistant"
            else:
                sender_id = msg.get("user_id", "unknown")
        
        formatted_messages.append({
            "id": f"msg-{i}-{msg.get('timestamp', datetime.now().isoformat())}",
            "conversationId": conversation_id,
            "senderId": sender_id,
            "senderType": sender_type,
            "content": msg.get("content", ""),
            "timestamp": msg.get("timestamp", datetime.now().isoformat()),
            "metadata": msg.get("metadata", {})
        })
    
    return {
        "conversation_id": conversation_id,
        "messages": formatted_messages
    }

@app.get("/api/incidents")
async def get_all_incidents(
    property_id: Optional[str] = Query(None),
    landlord_id: Optional[str] = Query(None)
):
    """Get all incidents, optionally filtered by property or landlord"""
    all_incidents = list(incidents.values())
    
    # Filter by property if provided
    if property_id:
        all_incidents = [i for i in all_incidents if i.get("property_id") == property_id]
    
    # Filter by landlord if provided
    # For now, return all incidents for any landlord (in production, check property ownership)
    # Since we don't have property ownership data, we'll return all incidents
    # In production, you'd filter: if landlord_id, only return incidents for properties owned by that landlord
    
    # Sort by created date (newest first)
    all_incidents.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    
    return {"incidents": all_incidents}

@app.get("/api/incidents/{incident_id}")
async def get_incident(incident_id: str):
    """Get incident details"""
    if incident_id not in incidents:
        raise HTTPException(status_code=404, detail="Incident not found")
    return incidents[incident_id]

@app.post("/api/calendar/events", response_model=CalendarEventResponse)
async def create_calendar_event(event: CalendarEventRequest):
    """Create a new calendar event"""
    event_id = str(uuid.uuid4())
    calendar_events[event_id] = {
        "id": event_id,
        "property_id": event.property_id,
        "type": event.type,
        "title": event.title,
        "start_time": event.start_time,
        "end_time": event.end_time,
        "status": event.status,
        "tenant_id": event.tenant_id,
        "asset_id": event.asset_id,
        "incident_id": event.incident_id,
        "description": event.description,
        "is_ai_suggested": False,
        "created_at": datetime.now().isoformat(),
    }
    
    # Update incident status if linked
    if event.incident_id and event.incident_id in incidents:
        incidents[event.incident_id]["status"] = "scheduled"
        if "scheduled_at" not in incidents[event.incident_id]:
            incidents[event.incident_id]["scheduled_at"] = event.start_time
    
    return calendar_events[event_id]

@app.get("/api/calendar/events")
async def get_calendar_events(
    property_id: Optional[str] = Query(None)
):
    """Get all calendar events, optionally filtered by property"""
    all_events = list(calendar_events.values())
    
    if property_id:
        all_events = [e for e in all_events if e.get("property_id") == property_id]
    
    # Sort by start time
    all_events.sort(key=lambda x: x.get("start_time", ""))
    
    return {"events": all_events}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

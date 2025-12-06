from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from typing import Dict, List, Optional
import uuid
from datetime import datetime
from pathlib import Path

from app.models import (
    ChatRequest, ChatResponse, RAGQueryRequest, RAGQueryResponse,
    IssueTriageRequest, IssueTriageResponse, ReplySuggestionRequest,
    ReplySuggestionResponse, HealthResponse, CalendarEventRequest, CalendarEventResponse,
)
from app.rag_service import RAGService

app = FastAPI(title="HomeGuard AI API", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:5173", "http://localhost:3000"],
                   allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

rag_service = RAGService(model_name="mistral", embedding_model="all-MiniLM-L6-v2")
conversations: Dict[str, List[Dict]] = {}
incidents: Dict[str, Dict] = {}
calendar_events: Dict[str, Dict] = {}

def create_incident(property_id: str, conversation_id: str, description: str) -> str:
    triage = rag_service.triage_issue(description)
    incident_id = str(uuid.uuid4())
    incidents[incident_id] = {
        "id": incident_id, "property_id": property_id, "conversation_id": conversation_id,
        "description": description, "category": triage["category"], "severity": triage["severity"],
        "status": "reported", "created_at": datetime.now().isoformat(),
        "ai_suggested": True, "awaiting_more_info": True
    }
    return incident_id

def update_incident(incident_id: str, additional_info: str):
    if incident_id in incidents:
        incidents[incident_id]["description"] += f"\n\nAdditional details: {additional_info}"
        incidents[incident_id]["awaiting_more_info"] = False

def find_open_incident(conversation_id: str) -> Optional[str]:
    for iid, inc in incidents.items():
        if inc.get("conversation_id") == conversation_id and inc.get("status") == "reported" and inc.get("awaiting_more_info"):
            return iid
    return None

def generate_followup_questions(issue_description: str, category: str) -> str:
    if not rag_service.llm:
        return "Can you provide more details about when this started and what exactly is happening?"
    prompt = f"""A tenant has reported an issue. Generate 2-3 specific, helpful follow-up questions to gather more information.

Issue reported: "{issue_description}"
Category: {category}

Generate questions that will help understand:
- When did this start?
- What exactly is happening?
- Any error messages or unusual behavior?
- Location or specific device affected?

Format as a friendly message asking these questions. Keep it concise (2-3 sentences max).

Your response:"""
    try:
        return rag_service.llm.invoke(prompt).strip()
    except:
        return "Can you provide more details about when this started and what exactly is happening?"

def is_question(msg: str) -> bool:
    msg_lower = msg.lower().strip()
    q_words = ["how", "what", "where", "when", "why", "can you", "tell me", "explain", "do you know", 
               "show me", "help me", "i need to know", "how do i", "how to", "what is", "what are", "where is", "where are"]
    return "?" in msg or any(w in msg_lower for w in q_words) or msg_lower.startswith(("how", "what", "where", "when", "why", "can", "tell", "show"))

def is_issue_report(msg: str) -> bool:
    keywords = ["broken", "not working", "problem", "issue", "faulty", "noise", "leak", "flicker", 
                "doesn't work", "won't work", "not functioning", "malfunction", "damaged", "out of order", 
                "not responding", "stopped working", "not turning on", "error"]
    return any(k in msg.lower() for k in keywords)

def load_house_manuals():
    data_dir = Path(__file__).parent.parent / "data" / "house_manuals"
    if not data_dir.exists():
        data_dir.mkdir(parents=True, exist_ok=True)
        return {}
    manuals = {}
    for prop_id, filename in {"prop-1": "prop-1_downtown_loft.txt", "prop-2": "prop-2_beach_house.txt"}.items():
        file_path = data_dir / filename
        if file_path.exists():
            content = rag_service.load_documents_from_file(str(file_path))
            if content:
                manuals[prop_id] = [content]
    return manuals

HOUSE_MANUALS = load_house_manuals()
if not HOUSE_MANUALS:
    HOUSE_MANUALS = {
        "prop-1": ["""Downtown Loft - House Manual
WELCOME: Welcome to your stay! This modern loft is located in the heart of downtown.
WI-FI: Network: DowntownLoft_Guest, Password: Welcome2024!
The router is located in the living room, on the shelf next to the TV.
To reset: Unplug for 10 seconds, then plug back in. Wait 2 minutes for full restart.
TV & ENTERTAINMENT: The TV is a Samsung 55" Smart TV.
To turn on: Use the Samsung remote (black, on the coffee table).
Press the power button, then select HDMI 1 for cable, or use the Smart TV apps.
Netflix, Hulu, and Disney+ are pre-installed. Use the guest account (no password needed).
If the TV won't turn on, check that the power strip under the TV is switched on."""],
        "prop-2": ["""Beach House - House Manual
WELCOME: Welcome to your beachfront stay!
WI-FI: Network: BeachHouse_WiFi, Password: OceanView2024!
AC: Master bedroom has individual AC unit. Use remote control on nightstand."""]
    }
for prop_id, docs in HOUSE_MANUALS.items():
    rag_service.add_property_documents(prop_id, docs)

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    return {
        "status": "ok",
        "ollama_connected": rag_service.llm is not None,
        "vector_store_ready": len(rag_service.vector_stores) > 0
    }

def _add_message(conv_id: str, role: str, content: str, sender_id: str, sender_type: str, metadata: dict = None):
    if conv_id not in conversations:
        conversations[conv_id] = []
    conversations[conv_id].append({
        "role": role, "content": content, "timestamp": datetime.now().isoformat(),
        "sender_id": sender_id, "sender_type": sender_type, "metadata": metadata or {}
    })

def _get_recent_messages(conv_id: str, limit: int = 3) -> List[Dict]:
    """Get the last N messages from conversation (excluding current message)"""
    if conv_id not in conversations:
        return []
    msgs = conversations[conv_id]
    # Get last N messages, excluding the most recent one (which is the current message being processed)
    return msgs[-(limit+1):-1] if len(msgs) > 1 else []

@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    try:
        _add_message(request.conversation_id, "user", request.message, request.user_id, request.user_role)
        
        if request.user_role == "LANDLORD":
            return ChatResponse(response="", sources=None, incident_created=False, incident_id=None, incident_details=None)
        
        open_incident_id = find_open_incident(request.conversation_id)
        if open_incident_id:
            update_incident(open_incident_id, request.message)
            inc = incidents[open_incident_id]
            response = f"""Thank you for the additional information! I've updated the maintenance ticket (ID: {open_incident_id[:8]}) with these details.

**Updated Ticket:**
- Category: {inc['category']}
- Severity: {inc['severity']}
- Description: {inc['description'][:200]}...

Your landlord has been notified and will review the complete ticket shortly."""
            _add_message(request.conversation_id, "assistant", response, "ai-assistant", "AI", 
                        {"isAISuggestion": True, "incidentId": open_incident_id})
            return ChatResponse(response=response, sources=None, incident_created=False, 
                              incident_id=open_incident_id, incident_details=_get_incident_details(open_incident_id))
        
        msg_is_q = is_question(request.message)
        msg_is_issue = is_issue_report(request.message)
        incident_id = None
        incident_created = False
        
        if msg_is_issue:
            incident_id = create_incident(request.property_id, request.conversation_id, request.message)
            incident_created = True
            inc = incidents[incident_id]
            followup = generate_followup_questions(request.message, inc['category'])
            response = f"""I've created a maintenance ticket for your issue and **escalated it to your landlord**.

**Ticket Created:**
- Ticket ID: {incident_id[:8]}
- Category: {inc['category']}
- Severity: {inc['severity']}

{followup}

The landlord has been notified and will review your ticket once you provide these details."""
            _add_message(request.conversation_id, "assistant", response, "ai-assistant", "AI",
                        {"incidentId": incident_id, "isAISuggestion": True})
            return ChatResponse(response=response, sources=None, incident_created=True, 
                              incident_id=incident_id, incident_details=_get_incident_details(incident_id))
        
        if msg_is_q and rag_service.llm:
            try:
                recent_msgs = _get_recent_messages(request.conversation_id, limit=3)
                answer, sources = rag_service.query(request.property_id, request.message, conversation_history=recent_msgs)
                _add_message(request.conversation_id, "assistant", answer, "ai-assistant", "AI",
                            {"sources": sources, "isAISuggestion": True})
                return ChatResponse(response=answer, sources=sources, incident_created=False, 
                                  incident_id=None, incident_details=None)
            except Exception as e:
                print(f"Error in RAG query: {e}")
        
        if not msg_is_q and not msg_is_issue and rag_service.llm:
            try:
                recent_msgs = _get_recent_messages(request.conversation_id, limit=3)
                response = rag_service.general_conversation(request.message, request.user_role, conversation_history=recent_msgs)
                _add_message(request.conversation_id, "assistant", response, "ai-assistant", "AI", {"isAISuggestion": True})
                return ChatResponse(response=response, sources=None, incident_created=False, 
                                  incident_id=None, incident_details=None)
            except Exception as e:
                print(f"Error in general conversation: {e}")
        
        response = ("I'm currently unable to process your message with AI assistance. Your message has been saved and the landlord will see it. Please contact your landlord directly if you need immediate assistance."
                   if not rag_service.llm else "Thank you for your message. I'll make sure the landlord sees this.")
        _add_message(request.conversation_id, "assistant", response, "ai-assistant", "AI", {})
        return ChatResponse(response=response, sources=None, incident_created=False, incident_id=None, incident_details=None)
    except Exception as e:
        print(f"Error in chat endpoint: {e}")
        raise HTTPException(status_code=500, detail=str(e))

def _get_incident_details(incident_id: Optional[str]) -> Optional[dict]:
    if not incident_id or incident_id not in incidents:
        return None
    inc = incidents[incident_id]
    return {"category": inc.get("category"), "severity": inc.get("severity"), "description": inc.get("description")}

@app.post("/api/rag/query", response_model=RAGQueryResponse)
async def rag_query(request: RAGQueryRequest):
    try:
        answer, sources = rag_service.query(request.property_id, request.question)
        return RAGQueryResponse(answer=answer, sources=sources, confidence=0.8 if sources else 0.3)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/triage", response_model=IssueTriageResponse)
async def triage_issue(request: IssueTriageRequest):
    try:
        result = rag_service.triage_issue(request.description)
        incident_id = create_incident(request.property_id, request.conversation_id or "", request.description) if request.property_id else None
        return IssueTriageResponse(category=result["category"], severity=result["severity"],
                                  suggested_actions=result["suggested_actions"], confidence=result["confidence"], incident_id=incident_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/suggest-reply", response_model=ReplySuggestionResponse)
async def suggest_reply(request: ReplySuggestionRequest):
    try:
        return ReplySuggestionResponse(suggestion=rag_service.suggest_reply(request.context, tone="professional"), tone="professional")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/conversations/{conversation_id}")
async def get_conversation(conversation_id: str):
    msgs = conversations.get(conversation_id, [])
    formatted = []
    for i, msg in enumerate(msgs):
        sender_type = msg.get("sender_type") or ("AI" if msg.get("role") == "assistant" else "TENANT")
        sender_id = msg.get("sender_id") or ("ai-assistant" if msg.get("role") == "assistant" else msg.get("user_id", "unknown"))
        formatted.append({
            "id": f"msg-{i}-{msg.get('timestamp', datetime.now().isoformat())}",
            "conversationId": conversation_id, "senderId": sender_id, "senderType": sender_type,
            "content": msg.get("content", ""), "timestamp": msg.get("timestamp", datetime.now().isoformat()),
            "metadata": msg.get("metadata", {})
        })
    return {"conversation_id": conversation_id, "messages": formatted}

@app.get("/api/incidents")
async def get_all_incidents(property_id: Optional[str] = Query(None), landlord_id: Optional[str] = Query(None)):
    all_incidents = [i for i in incidents.values() if not property_id or i.get("property_id") == property_id]
    all_incidents.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    return {"incidents": all_incidents}

@app.get("/api/incidents/{incident_id}")
async def get_incident(incident_id: str):
    if incident_id not in incidents:
        raise HTTPException(status_code=404, detail="Incident not found")
    return incidents[incident_id]

@app.post("/api/calendar/events", response_model=CalendarEventResponse)
async def create_calendar_event(event: CalendarEventRequest):
    event_id = str(uuid.uuid4())
    calendar_events[event_id] = {
        "id": event_id, "property_id": event.property_id, "type": event.type, "title": event.title,
        "start_time": event.start_time, "end_time": event.end_time, "status": event.status,
        "tenant_id": event.tenant_id, "asset_id": event.asset_id, "incident_id": event.incident_id,
        "description": event.description, "is_ai_suggested": False, "created_at": datetime.now().isoformat()
    }
    if event.incident_id and event.incident_id in incidents:
        incidents[event.incident_id]["status"] = "scheduled"
        if "scheduled_at" not in incidents[event.incident_id]:
            incidents[event.incident_id]["scheduled_at"] = event.start_time
    return calendar_events[event_id]

@app.get("/api/calendar/events")
async def get_calendar_events(property_id: Optional[str] = Query(None)):
    all_events = [e for e in calendar_events.values() if not property_id or e.get("property_id") == property_id]
    all_events.sort(key=lambda x: x.get("start_time", ""))
    return {"events": all_events}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

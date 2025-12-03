"""
FastAPI backend for HomeGuard AI
Simplified version maintaining all functionality
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

# Helper function to create incident
def create_incident(property_id: str, conversation_id: str, description: str) -> str:
    """Create an incident and return its ID"""
    triage_result = rag_service.triage_issue(description)
    incident_id = str(uuid.uuid4())
    incidents[incident_id] = {
        "id": incident_id,
        "property_id": property_id,
        "conversation_id": conversation_id,
        "description": description,
        "category": triage_result["category"],
        "severity": triage_result["severity"],
        "status": "reported",
        "created_at": datetime.now().isoformat(),
        "ai_suggested": True,
        "awaiting_more_info": True  # Flag to track if we need more information
    }
    print(f"✓ Created incident {incident_id} for issue report")
    return incident_id

# Helper function to update incident with additional information
def update_incident(incident_id: str, additional_info: str):
    """Update an incident with additional information from tenant"""
    if incident_id in incidents:
        incident = incidents[incident_id]
        # Append additional info to description
        incident["description"] = f"{incident['description']}\n\nAdditional details: {additional_info}"
        incident["awaiting_more_info"] = False  # Mark as complete
        print(f"✓ Updated incident {incident_id} with additional information")

# Helper function to find open incident in conversation
def find_open_incident(conversation_id: str) -> Optional[str]:
    """Find an incident that's awaiting more information in this conversation"""
    for incident_id, incident in incidents.items():
        if (incident.get("conversation_id") == conversation_id and 
            incident.get("status") == "reported" and 
            incident.get("awaiting_more_info", False)):
            return incident_id
    return None

# Helper function to generate follow-up questions
def generate_followup_questions(issue_description: str, category: str) -> str:
    """Generate relevant follow-up questions based on the issue"""
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
        questions = rag_service.llm.invoke(prompt)
        return questions.strip()
    except Exception as e:
        print(f"Error generating follow-up questions: {e}")
        return "Can you provide more details about when this started and what exactly is happening?"

# Helper function to check if message is a question
def is_question(message: str) -> bool:
    """Check if message is likely a question"""
    msg_lower = message.lower().strip()
    question_words = ["how", "what", "where", "when", "why", "can you", "tell me", 
                      "explain", "do you know", "show me", "help me", "i need to know",
                      "how do i", "how to", "what is", "what are", "where is", "where are"]
    return ("?" in message or 
            any(word in msg_lower for word in question_words) or
            msg_lower.startswith(("how", "what", "where", "when", "why", "can", "tell", "show")))

# Helper function to check if message is an issue report
def is_issue_report(message: str) -> bool:
    """Check if message reports an issue"""
    msg_lower = message.lower()
    issue_keywords = ["broken", "not working", "problem", "issue", "faulty", "noise", 
                      "leak", "flicker", "doesn't work", "won't work", "not functioning", 
                      "malfunction", "damaged", "out of order", "not responding", 
                      "stopped working", "not turning on", "error"]
    return any(keyword in msg_lower for keyword in issue_keywords)

# Load house manuals from files
def load_house_manuals():
    """Load house manual documents from data directory"""
    data_dir = Path(__file__).parent.parent / "data" / "house_manuals"
    
    if not data_dir.exists():
        print(f"⚠ Warning: House manuals directory not found: {data_dir}")
        data_dir.mkdir(parents=True, exist_ok=True)
        return {}
    
    manuals = {}
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
    
    return manuals

# Load house manuals and initialize vector stores
print("\n" + "="*50)
print("Loading house manuals...")
print("="*50)
HOUSE_MANUALS = load_house_manuals()

if not HOUSE_MANUALS:
    print("\n⚠ No house manuals loaded. Using fallback sample data.")
    HOUSE_MANUALS = {
        "prop-1": ["""Downtown Loft - House Manual
            
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
If the TV won't turn on, check that the power strip under the TV is switched on."""],
        "prop-2": ["""Beach House - House Manual
            
WELCOME
Welcome to your beachfront stay!
            
WI-FI
Network: BeachHouse_WiFi
Password: OceanView2024!
            
AC
Master bedroom has individual AC unit. Use remote control on nightstand."""]
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
    """Main chat endpoint - handles tenant/landlord messages and AI responses"""
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
        
        # If message is from landlord, AI should NOT respond - tenant will respond
        if request.user_role == "LANDLORD":
            return ChatResponse(
                response="",  # Empty response - AI doesn't respond to landlord messages
                sources=None,
                incident_created=False,
                incident_id=None,
                incident_details=None
            )
        
        # From here on, only TENANT messages are processed by AI
        
        # Check if there's an open incident awaiting more information
        open_incident_id = find_open_incident(request.conversation_id)
        if open_incident_id:
            # Update the incident with additional information
            update_incident(open_incident_id, request.message)
            incident = incidents[open_incident_id]
            
            # Confirm receipt and close the follow-up
            response_text = f"""Thank you for the additional information! I've updated the maintenance ticket (ID: {open_incident_id[:8]}) with these details.

**Updated Ticket:**
- Category: {incident['category']}
- Severity: {incident['severity']}
- Description: {incident['description'][:200]}...

Your landlord has been notified and will review the complete ticket shortly."""
            
            conversations[request.conversation_id].append({
                "role": "assistant",
                "content": response_text,
                "timestamp": datetime.now().isoformat(),
                "sender_id": "ai-assistant",
                "sender_type": "AI",
                "metadata": {
                    "isAISuggestion": True,
                    "incidentId": open_incident_id
                }
            })
            
            return ChatResponse(
                response=response_text,
                sources=None,
                incident_created=False,
                incident_id=open_incident_id,
                incident_details=_get_incident_details(open_incident_id)
            )
        
        # Check message type
        msg_is_question = is_question(request.message)
        msg_is_issue = is_issue_report(request.message)
        incident_created = False
        incident_id = None
        
        # Create incident if tenant reports an issue
        if msg_is_issue:
            incident_id = create_incident(request.property_id, request.conversation_id, request.message)
            incident_created = True
            incident = incidents[incident_id]
            
            # Generate and ask follow-up questions
            followup_questions = generate_followup_questions(request.message, incident['category'])
            
            # Create response with ticket creation and follow-up questions
            response_text = f"""I've created a maintenance ticket for your issue and **escalated it to your landlord**.

**Ticket Created:**
- Ticket ID: {incident_id[:8]}
- Category: {incident['category']}
- Severity: {incident['severity']}

{followup_questions}

The landlord has been notified and will review your ticket once you provide these details."""
            
            # Store AI response
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
                incident_created=incident_created,
                incident_id=incident_id,
                incident_details=_get_incident_details(incident_id)
            )
        
        # Handle RAG query for questions
        if msg_is_question and rag_service.llm is not None:
            try:
                answer, sources = rag_service.query(request.property_id, request.message)
                
                # Append escalation message if incident was created
                if incident_created:
                    incident = incidents[incident_id]
                    followup_questions = generate_followup_questions(request.message, incident['category'])
                    answer += f"\n\n✓ **I've created a maintenance ticket (ID: {incident_id[:8]}) and escalated it to your landlord.**\n\n{followup_questions}"
                
                # Store and return response
                conversations[request.conversation_id].append({
                    "role": "assistant",
                    "content": answer,
                    "timestamp": datetime.now().isoformat(),
                    "sender_id": "ai-assistant",
                    "sender_type": "AI",
                    "metadata": {
                        "sources": sources,
                        "isAISuggestion": True,
                        "incidentId": incident_id if incident_created else None
                    }
                })
                
                return ChatResponse(
                    response=answer,
                    sources=sources,
                    incident_created=incident_created,
                    incident_id=incident_id if incident_created else None,
                    incident_details=_get_incident_details(incident_id) if incident_created else None
                )
            except Exception as e:
                print(f"Error in RAG query: {e}")
        
        # Handle general conversation for non-question, non-issue messages
        if not msg_is_question and not msg_is_issue and rag_service.llm is not None:
            try:
                response_text = rag_service.general_conversation(request.message, request.user_role)
                conversations[request.conversation_id].append({
                    "role": "assistant",
                    "content": response_text,
                    "timestamp": datetime.now().isoformat(),
                    "sender_id": "ai-assistant",
                    "sender_type": "AI",
                    "metadata": {"isAISuggestion": True}
                })
                return ChatResponse(
                    response=response_text,
                    sources=None,
                    incident_created=False,
                    incident_id=None,
                    incident_details=None
                )
            except Exception as e:
                print(f"Error in general conversation: {e}")
        
        # Handle issue reports (when not handled by RAG above)
        # This case should not happen now since we handle issues earlier, but keeping for safety
        if msg_is_issue and not incident_created:
            incident_id = create_incident(request.property_id, request.conversation_id, request.message)
            incident_created = True
            incident = incidents[incident_id]
            followup_questions = generate_followup_questions(request.message, incident['category'])
            triage_result = rag_service.triage_issue(request.message)
            response_text = f"""I've created a maintenance ticket for your issue and **escalated it to your landlord**.

**Ticket Created:**
- Ticket ID: {incident_id[:8]}
- Category: {triage_result['category']}
- Severity: {triage_result['severity']}

{followup_questions}

The landlord has been notified and will review your ticket once you provide these details."""
            
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
                incident_created=incident_created,
                incident_id=incident_id,
                incident_details=_get_incident_details(incident_id)
            )
        
        # Default response
        response_text = (
            "I'm currently unable to process your message with AI assistance. Your message has been saved and the landlord will see it. Please contact your landlord directly if you need immediate assistance."
            if rag_service.llm is None
            else "Thank you for your message. I'll make sure the landlord sees this."
        )
        
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
            incident_created=False,
            incident_id=None,
            incident_details=None
        )
        
    except Exception as e:
        print(f"Error in chat endpoint: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

def _get_incident_details(incident_id: Optional[str]) -> Optional[dict]:
    """Get incident details for response"""
    if not incident_id:
        return None
    incident = incidents.get(incident_id)
    if incident:
        return {
            "category": incident.get("category"),
            "severity": incident.get("severity"),
            "description": incident.get("description"),
        }
    return None

@app.post("/api/rag/query", response_model=RAGQueryResponse)
async def rag_query(request: RAGQueryRequest):
    """Direct RAG query endpoint for property assistant"""
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
    """Issue triage endpoint"""
    try:
        result = rag_service.triage_issue(request.description)
        incident_id = None
        
        if request.property_id:
            incident_id = create_incident(request.property_id, request.conversation_id or "", request.description)
        
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
    """Generate reply suggestion for landlord"""
    try:
        suggestion = rag_service.suggest_reply(request.context, tone="professional")
        return ReplySuggestionResponse(suggestion=suggestion, tone="professional")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/conversations/{conversation_id}")
async def get_conversation(conversation_id: str):
    """Get conversation history"""
    messages = conversations.get(conversation_id, [])
    
    formatted_messages = []
    for i, msg in enumerate(messages):
        sender_type = msg.get("sender_type") or ("AI" if msg.get("role") == "assistant" else "TENANT")
        sender_id = msg.get("sender_id") or ("ai-assistant" if msg.get("role") == "assistant" else msg.get("user_id", "unknown"))
        
        formatted_messages.append({
            "id": f"msg-{i}-{msg.get('timestamp', datetime.now().isoformat())}",
            "conversationId": conversation_id,
            "senderId": sender_id,
            "senderType": sender_type,
            "content": msg.get("content", ""),
            "timestamp": msg.get("timestamp", datetime.now().isoformat()),
            "metadata": msg.get("metadata", {})
        })
    
    return {"conversation_id": conversation_id, "messages": formatted_messages}

@app.get("/api/incidents")
async def get_all_incidents(
    property_id: Optional[str] = Query(None),
    landlord_id: Optional[str] = Query(None)
):
    """Get all incidents, optionally filtered by property or landlord"""
    all_incidents = list(incidents.values())
    
    if property_id:
        all_incidents = [i for i in all_incidents if i.get("property_id") == property_id]
    
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
async def get_calendar_events(property_id: Optional[str] = Query(None)):
    """Get all calendar events, optionally filtered by property"""
    all_events = list(calendar_events.values())
    
    if property_id:
        all_events = [e for e in all_events if e.get("property_id") == property_id]
    
    all_events.sort(key=lambda x: x.get("start_time", ""))
    return {"events": all_events}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

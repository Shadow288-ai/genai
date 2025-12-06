from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from typing import Dict, List, Optional
import uuid
import re
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
troubleshooting_sessions: Dict[str, Dict] = {}  # conversation_id -> {issue, attempts, steps_tried}

def create_incident(property_id: str, conversation_id: str, description: str, troubleshooting_history: str = "") -> str:
    triage = rag_service.triage_issue(description)
    full_description = description
    if troubleshooting_history:
        full_description = f"{description}\n\n=== TROUBLESHOOTING ATTEMPTS ===\n{troubleshooting_history}"
    incident_id = str(uuid.uuid4())
    incidents[incident_id] = {
        "id": incident_id, "property_id": property_id, "conversation_id": conversation_id,
        "description": full_description, "category": triage["category"], "severity": triage["severity"],
        "status": "reported", "created_at": datetime.now().isoformat(),
        "ai_suggested": True, "awaiting_more_info": False
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

def find_troubleshooting_session(conversation_id: str) -> Optional[Dict]:
    return troubleshooting_sessions.get(conversation_id)

def start_troubleshooting(conversation_id: str, issue_description: str, category: str):
    troubleshooting_sessions[conversation_id] = {
        "issue": issue_description,
        "category": category,
        "attempts": 0,
        "steps_tried": [],
        "started_at": datetime.now().isoformat()
    }

def add_troubleshooting_step(conversation_id: str, step: str, tenant_response: str = ""):
    if conversation_id in troubleshooting_sessions:
        troubleshooting_sessions[conversation_id]["attempts"] += 1
        troubleshooting_sessions[conversation_id]["steps_tried"].append({
            "step": step,
            "tenant_response": tenant_response or "",
            "timestamp": datetime.now().isoformat()
        })

def get_troubleshooting_summary(conversation_id: str) -> str:
    if conversation_id not in troubleshooting_sessions:
        return ""
    session = troubleshooting_sessions[conversation_id]
    summary = f"Original issue: {session['issue']}\n\n"
    summary += f"Troubleshooting attempts: {session['attempts']}\n\n"
    for i, step_info in enumerate(session['steps_tried'], 1):
        summary += f"Attempt {i}:\n"
        summary += f"  - Suggested: {step_info['step']}\n"
        if step_info['tenant_response']:
            summary += f"  - Tenant response: {step_info['tenant_response']}\n"
    return summary

def end_troubleshooting(conversation_id: str):
    if conversation_id in troubleshooting_sessions:
        del troubleshooting_sessions[conversation_id]

def generate_troubleshooting_steps(issue_description: str, category: str, previous_steps: List[str] = None) -> str:
    if not rag_service.llm:
        return "Can you check if it's plugged in and powered on? Also verify there are no visible signs of damage."
    previous_context = ""
    if previous_steps:
        previous_context = f"\n\nPrevious troubleshooting steps already tried:\n" + "\n".join([f"- {step}" for step in previous_steps])
    prompt = f"""A tenant has reported an issue: "{issue_description}"
Category: {category}{previous_context}

Generate 2-3 specific troubleshooting steps the tenant can try. These should be:
- Simple checks they can do themselves (e.g., "Check if the power button is on", "Verify the cable is plugged in")
- Diagnostic steps (e.g., "Check for error messages", "Look for indicator lights")
- NOT repair instructions (no "replace", "fix", "repair", "tighten", etc.)

IMPORTANT: Generate ONLY the troubleshooting steps themselves. Do NOT include:
- Greetings (no "Hello", "Hi", etc.)
- Introductions (no "Let me help", "I'm here to help", etc.)
- Conclusions (no "Thank you", "Let me know", etc.)
- Just provide the steps as a numbered or bulleted list

Format as a clean list of steps only. Example format:
1. Check if the power button is on
2. Verify the cable is plugged in
3. Look for error messages

Your response (steps only, no greetings or introductions):"""
    try:
        steps = rag_service.llm.invoke(prompt).strip()
        # Clean up any greetings or introductions that might have been added
        steps = re.sub(r'^(hello|hi|hey|greetings)[!.,]?\s*', '', steps, flags=re.IGNORECASE)
        steps = re.sub(r'^(let me help|i\'m here to help|i can help)[!.,]?\s*', '', steps, flags=re.IGNORECASE)
        steps = re.sub(r'(thank you|thanks|let me know|please let us know)[!.,]?\s*$', '', steps, flags=re.IGNORECASE)
        return steps
    except Exception as e:
        print(f"Error generating troubleshooting steps: {e}")
        return "Can you check if it's plugged in and powered on? Also verify there are no visible signs of damage or error messages."

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

def is_unfixable_issue(msg: str) -> bool:
    """Check if issue is clearly unfixable by tenant (theft, major damage, security, etc.)"""
    msg_lower = msg.lower()
    unfixable_keywords = [
        "stolen", "theft", "robbed", "burglary", "break-in", "broken into",
        "vandalized", "vandalism", "graffiti", "smashed", "destroyed",
        "fire", "flood", "water damage", "structural", "foundation", "ceiling collapse",
        "gas leak", "carbon monoxide", "smoke", "electrical fire",
        "lock broken", "door broken", "window broken", "shattered",
        "missing", "disappeared", "gone", "not there"
    ]
    return any(kw in msg_lower for kw in unfixable_keywords)

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

def is_escalation_request(msg: str) -> bool:
    """Check if user is requesting escalation"""
    msg_lower = msg.lower().strip()
    escalation_keywords = ["yes", "please", "go ahead", "sure", "ok", "okay", "yes please", "yes do it", 
                           "escalate", "escalate it", "contact landlord", "notify landlord", "tell landlord"]
    return any(kw in msg_lower for kw in escalation_keywords)

def last_message_offered_escalation(conversation_id: str) -> bool:
    """Check if the last AI message offered escalation"""
    if conversation_id not in conversations or len(conversations[conversation_id]) < 2:
        return False
    last_ai_msg = None
    for msg in reversed(conversations[conversation_id][:-1]):  # Exclude current user message
        if msg.get("role") == "assistant" or msg.get("sender_type") == "AI":
            last_ai_msg = msg.get("content", "")
            break
    if not last_ai_msg:
        return False
    escalation_phrases = ["would you like me to escalate", "escalate this to your landlord", 
                          "escalate to your landlord", "escalate this"]
    return any(phrase in last_ai_msg.lower() for phrase in escalation_phrases)

@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    try:
        _add_message(request.conversation_id, "user", request.message, request.user_id, request.user_role)
        
        if request.user_role == "LANDLORD":
            return ChatResponse(response="", sources=None, incident_created=False, incident_id=None, incident_details=None)
        
        # Check if user wants to escalate (responded yes to escalation offer)
        if is_escalation_request(request.message) and last_message_offered_escalation(request.conversation_id):
            # Get the original question/issue from conversation history (the user's message before the AI offered escalation)
            issue_description = "User requested escalation"
            for msg in reversed(conversations[request.conversation_id][:-1]):
                if msg.get("role") == "user" and msg.get("sender_type") == "TENANT":
                    user_msg = msg.get("content", "")
                    if user_msg and not is_escalation_request(user_msg):  # Get the actual question, not another escalation request
                        issue_description = user_msg
                        break
            # If we couldn't find a good description, use a generic one
            if issue_description == "User requested escalation":
                issue_description = f"User requested escalation: {request.message}"
            incident_id = create_incident(request.property_id, request.conversation_id, issue_description)
            inc = incidents[incident_id]
            response = f"""I've **escalated this to your landlord**.

**Ticket Created:**
- Ticket ID: {incident_id[:8]}
- Category: {inc['category']}
- Severity: {inc['severity']}

Your landlord has been notified and will review your request shortly."""
            _add_message(request.conversation_id, "assistant", response, "ai-assistant", "AI",
                        {"incidentId": incident_id, "isAISuggestion": True})
            return ChatResponse(response=response, sources=None, incident_created=True, 
                              incident_id=incident_id, incident_details=_get_incident_details(incident_id))
        
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
        
        # Check if there's an active troubleshooting session
        troubleshooting = find_troubleshooting_session(request.conversation_id)
        if troubleshooting:
            session = troubleshooting_sessions[request.conversation_id]
            
            # Check if issue is resolved or still broken
            msg_lower = request.message.lower().strip()
            # Check for negative indicators first (these override positive ones)
            has_negative = any(neg in msg_lower for neg in ["doesn't work", "not working", "still doesn't", "still not", "didn't work", "won't work", "isn't working", "not fixed", "not resolved", "didn't help", "no change", "same problem", "still broken"])
            
            # Only check for positive resolution if no negative indicators
            is_resolved = False
            if not has_negative:
                is_resolved = any(phrase in msg_lower for phrase in ["it works", "it's working", "all good", "ok now", "solved", "yes it works", "fixed now", "working now", "resolved", "it's fixed"])
            
            is_still_broken = has_negative or any(word in msg_lower for word in ["still", "broken", "didn't help", "no change", "same problem"])
            
            # If resolved, end troubleshooting
            if is_resolved and not has_negative:
                response = "Great! I'm glad that worked. If you need anything else, just let me know!"
                _add_message(request.conversation_id, "assistant", response, "ai-assistant", "AI", {"isAISuggestion": True})
                end_troubleshooting(request.conversation_id)
                return ChatResponse(response=response, sources=None, incident_created=False, incident_id=None, incident_details=None)
            
            # Add tenant response to last troubleshooting step
            if session["steps_tried"]:
                session["steps_tried"][-1]["tenant_response"] = request.message
            
            # If we've already done 2 troubleshooting attempts, escalate
            if session["attempts"] >= 2:
                troubleshooting_summary = get_troubleshooting_summary(request.conversation_id)
                incident_id = create_incident(request.property_id, request.conversation_id, session["issue"], troubleshooting_summary)
                inc = incidents[incident_id]
                response = f"""I've tried troubleshooting this issue, but it still needs attention. I've **escalated it to your landlord** with all the details of what we've tried.

**Ticket Created:**
- Ticket ID: {incident_id[:8]}
- Category: {inc['category']}
- Severity: {inc['severity']}

The landlord has been notified with a complete summary of the issue and troubleshooting steps attempted. They'll review and get back to you soon."""
                _add_message(request.conversation_id, "assistant", response, "ai-assistant", "AI",
                            {"incidentId": incident_id, "isAISuggestion": True})
                end_troubleshooting(request.conversation_id)
                return ChatResponse(response=response, sources=None, incident_created=True, 
                                  incident_id=incident_id, incident_details=_get_incident_details(incident_id))
            
            # Continue troubleshooting - provide next steps
            previous_steps = [step["step"] for step in session["steps_tried"] if step["step"]]
            troubleshooting_steps = generate_troubleshooting_steps(session["issue"], session["category"], previous_steps)
            add_troubleshooting_step(request.conversation_id, troubleshooting_steps)
            response = f"""Let me help you troubleshoot this further. Try these steps:

{troubleshooting_steps}

Let me know if this helps or if the issue persists."""
            _add_message(request.conversation_id, "assistant", response, "ai-assistant", "AI", {"isAISuggestion": True})
            return ChatResponse(response=response, sources=None, incident_created=False, incident_id=None, incident_details=None)
        
        msg_is_q = is_question(request.message)
        msg_is_issue = is_issue_report(request.message)
        msg_is_unfixable = is_unfixable_issue(request.message)
        incident_id = None
        incident_created = False
        
        # For unfixable issues (theft, major damage, etc.), immediately create ticket
        # Check this FIRST, even if it doesn't match regular issue keywords
        if msg_is_unfixable:
            triage = rag_service.triage_issue(request.message)
            incident_id = create_incident(request.property_id, request.conversation_id, request.message)
            inc = incidents[incident_id]
            response = f"""I understand there's an issue that requires immediate attention. I've **created a maintenance ticket** and **notified the landlord**.

**Ticket Created:**
- Ticket ID: {incident_id[:8]}
- Category: {inc['category']}
- Severity: {inc['severity']}

The landlord has been notified and will address this issue promptly."""
            _add_message(request.conversation_id, "assistant", response, "ai-assistant", "AI",
                        {"incidentId": incident_id, "isAISuggestion": True})
            return ChatResponse(response=response, sources=None, incident_created=True, 
                              incident_id=incident_id, incident_details=_get_incident_details(incident_id))
        
        # For fixable issues, start troubleshooting
        if msg_is_issue:
            triage = rag_service.triage_issue(request.message)
            start_troubleshooting(request.conversation_id, request.message, triage["category"])
            troubleshooting_steps = generate_troubleshooting_steps(request.message, triage["category"])
            add_troubleshooting_step(request.conversation_id, troubleshooting_steps)
            response = f"""I understand you're having an issue. Let me help you troubleshoot this first.

**Issue detected:** {triage['category']}

Here are some steps to try:

{troubleshooting_steps}

Please try these steps and let me know if the issue is resolved or if it's still not working."""
            _add_message(request.conversation_id, "assistant", response, "ai-assistant", "AI", {"isAISuggestion": True})
            return ChatResponse(response=response, sources=None, incident_created=False, incident_id=None, incident_details=None)
        
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
        
        response = ("I'm currently unable to process your message with AI assistance. Your message has been saved and the landlord will see it. Would you like me to escalate this to your landlord?"
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

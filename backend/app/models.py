from pydantic import BaseModel
from typing import List, Optional, Literal

class ChatMessage(BaseModel):
    role: Literal["user", "assistant", "system"]
    content: str
    timestamp: Optional[str] = None

class ChatRequest(BaseModel):
    conversation_id: str
    property_id: str
    message: str
    user_id: str
    user_role: Literal["TENANT", "LANDLORD"]

class ChatResponse(BaseModel):
    response: str
    sources: Optional[List[str]] = None
    incident_created: bool = False
    incident_id: Optional[str] = None

class RAGQueryRequest(BaseModel):
    property_id: str
    question: str
    user_role: Literal["TENANT", "LANDLORD"]

class RAGQueryResponse(BaseModel):
    answer: str
    sources: List[str]
    confidence: Optional[float] = None

class IssueTriageRequest(BaseModel):
    property_id: str
    description: str
    conversation_id: Optional[str] = None

class IssueTriageResponse(BaseModel):
    category: str
    severity: Literal["low", "medium", "high", "critical"]
    suggested_actions: List[str]
    confidence: float
    incident_id: Optional[str] = None

class ReplySuggestionRequest(BaseModel):
    conversation_id: str
    context: List[ChatMessage]

class ReplySuggestionResponse(BaseModel):
    suggestion: str
    tone: Literal["professional", "friendly", "apologetic"]

class HealthResponse(BaseModel):
    status: str
    ollama_connected: bool
    vector_store_ready: bool

class CalendarEventRequest(BaseModel):
    property_id: str
    type: Literal["STAY", "MAINTENANCE", "CHECK_WINDOW"]
    title: str
    start_time: str
    end_time: str
    status: Literal["confirmed", "proposed", "cancelled"] = "confirmed"
    tenant_id: Optional[str] = None
    asset_id: Optional[str] = None
    incident_id: Optional[str] = None
    description: Optional[str] = None

class CalendarEventResponse(BaseModel):
    id: str
    property_id: str
    type: str
    title: str
    start_time: str
    end_time: str
    status: str
    tenant_id: Optional[str] = None
    asset_id: Optional[str] = None
    incident_id: Optional[str] = None
    description: Optional[str] = None
    is_ai_suggested: Optional[bool] = False


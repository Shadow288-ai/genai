const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export interface ChatRequest {
  conversation_id: string;
  property_id: string;
  message: string;
  user_id: string;
  user_role: "TENANT" | "LANDLORD";
}

export interface ChatResponse {
  response: string;
  sources?: string[];
  incident_created: boolean;
  incident_id?: string;
  incident_details?: {
    category: string;
    severity: string;
    description: string;
  };
}

export interface RAGQueryRequest {
  property_id: string;
  question: string;
  user_role: "TENANT" | "LANDLORD";
}

export interface RAGQueryResponse {
  answer: string;
  sources: string[];
  confidence?: number;
}

export interface IssueTriageRequest {
  property_id: string;
  description: string;
  conversation_id?: string;
}

export interface IssueTriageResponse {
  category: string;
  severity: "low" | "medium" | "high" | "critical";
  suggested_actions: string[];
  confidence: number;
  incident_id?: string;
}

export interface ReplySuggestionRequest {
  conversation_id: string;
  context: Array<{
    role: "user" | "assistant" | "system";
    content: string;
    timestamp?: string;
  }>;
}

export interface ReplySuggestionResponse {
  suggestion: string;
  tone: "professional" | "friendly" | "apologetic";
}

class ApiService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_BASE_URL;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      console.log(`API Request: ${options.method || 'GET'} ${url}`, options.body);
      
      const response = await fetch(url, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          ...options.headers,
        },
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({
          detail: `HTTP ${response.status}: ${response.statusText}`,
        }));
        console.error(`API Error: ${endpoint}`, error);
        throw new Error(error.detail || "API request failed");
      }

      const data = await response.json();
      console.log(`API Response: ${endpoint}`, data);
      return data;
    } catch (error) {
      console.error(`API request failed: ${endpoint}`, error);
      throw error;
    }
  }

  async healthCheck(): Promise<{
    status: string;
    ollama_connected: boolean;
    vector_store_ready: boolean;
  }> {
    return this.request("/health");
  }

  async sendChatMessage(request: ChatRequest): Promise<ChatResponse> {
    return this.request("/api/chat", {
      method: "POST",
      body: JSON.stringify(request),
    });
  }

  async queryRAG(request: RAGQueryRequest): Promise<RAGQueryResponse> {
    return this.request("/api/rag/query", {
      method: "POST",
      body: JSON.stringify(request),
    });
  }

  async triageIssue(request: IssueTriageRequest): Promise<IssueTriageResponse> {
    return this.request("/api/triage", {
      method: "POST",
      body: JSON.stringify(request),
    });
  }

  async suggestReply(
    request: ReplySuggestionRequest
  ): Promise<ReplySuggestionResponse> {
    return this.request("/api/suggest-reply", {
      method: "POST",
      body: JSON.stringify(request),
    });
  }

  async getConversation(conversationId: string): Promise<{
    conversation_id: string;
    messages: Array<{
      role: string;
      content: string;
      timestamp?: string;
    }>;
  }> {
    return this.request(`/api/conversations/${conversationId}`);
  }

  async getAllIncidents(propertyId?: string, landlordId?: string): Promise<{
    incidents: Array<{
      id: string;
      property_id: string;
      conversation_id?: string;
      description: string;
      category: string;
      severity: string;
      status: string;
      created_at: string;
      resolved_at?: string;
      ai_suggested?: boolean;
    }>;
  }> {
    const params = new URLSearchParams();
    if (propertyId) params.append("property_id", propertyId);
    if (landlordId) params.append("landlord_id", landlordId);
    const query = params.toString();
    return this.request(`/api/incidents${query ? `?${query}` : ""}`);
  }

  async getIncident(incidentId: string): Promise<any> {
    return this.request(`/api/incidents/${incidentId}`);
  }

  async createCalendarEvent(event: {
    property_id: string;
    type: "STAY" | "MAINTENANCE" | "CHECK_WINDOW";
    title: string;
    start_time: string;
    end_time: string;
    status?: "confirmed" | "proposed" | "cancelled";
    tenant_id?: string;
    asset_id?: string;
    incident_id?: string;
    description?: string;
  }): Promise<{
    id: string;
    property_id: string;
    type: string;
    title: string;
    start_time: string;
    end_time: string;
    status: string;
  }> {
    return this.request("/api/calendar/events", {
      method: "POST",
      body: JSON.stringify(event),
    });
  }

  async getAllCalendarEvents(propertyId?: string): Promise<{
    events: Array<{
      id: string;
      property_id: string;
      type: string;
      title: string;
      start_time: string;
      end_time: string;
      status: string;
      tenant_id?: string;
      asset_id?: string;
      incident_id?: string;
      description?: string;
      is_ai_suggested?: boolean;
    }>;
  }> {
    const params = propertyId ? `?property_id=${propertyId}` : "";
    return this.request(`/api/calendar/events${params}`);
  }
}

export const apiService = new ApiService();


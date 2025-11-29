/**
 * API service for communicating with the backend RAG service
 */

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
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
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
        throw new Error(error.detail || "API request failed");
      }

      return await response.json();
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

  async getIncident(incidentId: string): Promise<any> {
    return this.request(`/api/incidents/${incidentId}`);
  }
}

export const apiService = new ApiService();


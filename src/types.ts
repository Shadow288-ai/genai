export type UserRole = "TENANT" | "LANDLORD" | "ADMIN";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  language?: string;
  avatar?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResult {
  success: boolean;
  message?: string;
  user?: User;
}

export type PropertyType = "apartment" | "house" | "studio";

export interface Property {
  id: string;
  landlordId: string;
  name: string;
  address: string;
  type: PropertyType;
  assets: Asset[];
  houseManualDocs?: string[]; // URLs or Paths
  airbnbListingId?: string;
  createdAt: string;
}

export type AssetType =
  | "LIGHTS"
  | "AC"
  | "HEATER"
  | "TV"
  | "ROUTER"
  | "WASHER"
  | "DRYER"
  | "PLUMBING"
  | "APPLIANCES"
  | "OTHER";

export interface Asset {
  id: string;
  propertyId: string;
  type: AssetType;
  name: string;
  model?: string;
  location: string;
  installDate?: string;
  lastCheckDate?: string;
  lastIncidentDate?: string;
  riskScore?: number; // 0-100
}

export type BookingSource = "AIRBNB" | "DIRECT" | "BOOKING" | "OTHER";

export interface Stay {
  id: string;
  propertyId: string;
  tenantId: string;
  checkIn: string;
  checkOut: string;
  bookingSource: BookingSource;
  guestName: string;
  status: "upcoming" | "active" | "completed";
}

export interface Conversation {
  id: string;
  propertyId: string;
  tenantId: string;
  landlordId: string;
  lastMessageAt: string;
  unreadCount?: number;
  sentiment?: "positive" | "neutral" | "negative";
  isUrgent?: boolean;
}

export type MessageSenderType = "TENANT" | "LANDLORD" | "AI";

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderType: MessageSenderType;
  content: string;
  attachments?: string[]; // URLs
  timestamp: string;
  metadata?: {
    isAISuggestion?: boolean;
    incidentId?: string;
    incidentDetails?: {
      category: string;
      severity: string;
      description: string;
    };
    translatedContent?: string;
  };
}

export type IncidentSeverity = "low" | "medium" | "high" | "critical";
export type IncidentStatus = "reported" | "triaged" | "scheduled" | "in_progress" | "resolved";
export type IncidentSource = "TENANT_MESSAGE" | "AI_SUGGESTION" | "MANUAL";

export interface Incident {
  id: string;
  propertyId: string;
  assetId?: string;
  stayId?: string;
  conversationId?: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  category: AssetType;
  description: string;
  createdAt: string;
  resolvedAt?: string;
  source: IncidentSource;
  aiSuggested?: boolean;
}

// Predictive Maintenance
export interface AssetRiskScore {
  assetId: string;
  score: number; // 0-100
  computedAt: string;
  modelVersion?: string;
  reasons?: string[];
}

export type CalendarEventType = "STAY" | "MAINTENANCE" | "CHECK_WINDOW";
export type CalendarEventStatus = "confirmed" | "proposed" | "cancelled";

export interface CalendarEvent {
  id: string;
  propertyId: string;
  type: CalendarEventType;
  title: string;
  startTime: string;
  endTime: string;
  status: CalendarEventStatus;
  tenantId?: string;
  assetId?: string;
  incidentId?: string;
  isAISuggested?: boolean;
  description?: string;
}

// AI Features
export interface AIAssistantResponse {
  content: string;
  sources?: string[];
  suggestedActions?: string[];
  confidence?: number;
}

export interface IssueTriageResult {
  category: AssetType;
  severity: IncidentSeverity;
  suggestedActions: string[];
  confidence: number;
}

export interface ReplySuggestion {
  content: string;
  tone: "professional" | "friendly" | "apologetic";
}


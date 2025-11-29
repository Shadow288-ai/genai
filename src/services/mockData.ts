import type {
  User,
  Property,
  Asset,
  Stay,
  Conversation,
  Message,
  Incident,
  CalendarEvent,
  AssetRiskScore,
} from "../types";

// Mock Users
export const mockLandlord: User = {
  id: "landlord-1",
  name: "Alex Property Manager",
  email: "landlord@example.com",
  role: "LANDLORD",
  language: "en",
};

export const mockTenant: User = {
  id: "tenant-1",
  name: "Marie Guest",
  email: "tenant@example.com",
  role: "TENANT",
  language: "en",
};

// Mock Properties
export const mockProperties: Property[] = [
  {
    id: "prop-1",
    landlordId: "landlord-1",
    name: "Downtown Loft",
    address: "123 Main St, San Francisco, CA",
    type: "apartment",
    assets: [
      {
        id: "asset-1",
        propertyId: "prop-1",
        type: "AC",
        name: "Living Room AC Unit",
        model: "LG 12000 BTU",
        location: "Living Room",
        installDate: "2022-05-15",
        lastCheckDate: "2024-01-10",
        lastIncidentDate: "2024-06-15",
        riskScore: 75,
      },
      {
        id: "asset-2",
        propertyId: "prop-1",
        type: "HEATER",
        name: "Central Heating System",
        model: "Carrier Infinity",
        location: "Basement",
        installDate: "2021-11-20",
        lastCheckDate: "2024-02-05",
        riskScore: 45,
      },
      {
        id: "asset-3",
        propertyId: "prop-1",
        type: "LIGHTS",
        name: "Bathroom Light Circuit",
        location: "Bathroom",
        riskScore: 60,
      },
      {
        id: "asset-4",
        propertyId: "prop-1",
        type: "ROUTER",
        name: "Wi-Fi Router",
        model: "Netgear Nighthawk",
        location: "Living Room",
        riskScore: 20,
      },
    ],
    createdAt: "2021-01-15",
  },
  {
    id: "prop-2",
    landlordId: "landlord-1",
    name: "Beach House",
    address: "456 Ocean Ave, Malibu, CA",
    type: "house",
    assets: [
      {
        id: "asset-5",
        propertyId: "prop-2",
        type: "AC",
        name: "Master Bedroom AC",
        location: "Master Bedroom",
        riskScore: 30,
      },
    ],
    createdAt: "2022-03-10",
  },
];

// Mock Stays
export const mockStays: Stay[] = [
  {
    id: "stay-1",
    propertyId: "prop-1",
    tenantId: "tenant-1",
    checkIn: "2024-12-15",
    checkOut: "2024-12-22",
    bookingSource: "AIRBNB",
    guestName: "Marie Guest",
    status: "active",
  },
];

// Mock Conversations
export const mockConversations: Conversation[] = [
  {
    id: "conv-1",
    propertyId: "prop-1",
    tenantId: "tenant-1",
    landlordId: "landlord-1",
    lastMessageAt: new Date().toISOString(),
    unreadCount: 0,
    sentiment: "neutral",
  },
];

// Mock Messages
export const mockMessages: Message[] = [
  {
    id: "msg-1",
    conversationId: "conv-1",
    senderId: "tenant-1",
    senderType: "TENANT",
    content: "Hi! I just checked in. The place looks great!",
    timestamp: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: "msg-2",
    conversationId: "conv-1",
    senderId: "ai-assistant",
    senderType: "AI",
    content: "Welcome! I'm your property assistant. Feel free to ask me anything about the property, like 'How does the TV work?' or 'Where are the spare keys?'",
    timestamp: new Date(Date.now() - 3500000).toISOString(),
  },
  {
    id: "msg-3",
    conversationId: "conv-1",
    senderId: "tenant-1",
    senderType: "TENANT",
    content: "Actually, I noticed the AC is making some strange noises at night. Should I be concerned?",
    timestamp: new Date(Date.now() - 1800000).toISOString(),
  },
  {
    id: "msg-4",
    conversationId: "conv-1",
    senderId: "ai-assistant",
    senderType: "AI",
    content: "I've analyzed your concern about the AC. This appears to be a heating/cooling issue with medium severity. I've created a maintenance ticket and suggested some time slots for inspection. The landlord will review this shortly.",
    timestamp: new Date(Date.now() - 1700000).toISOString(),
    metadata: {
      incidentId: "incident-1",
    },
  },
  {
    id: "msg-5",
    conversationId: "conv-1",
    senderId: "landlord-1",
    senderType: "LANDLORD",
    content: "Thanks for letting us know! I can have someone check it out tomorrow between 10 AM - 12 PM. Would that work for you?",
    timestamp: new Date(Date.now() - 900000).toISOString(),
  },
];

// Mock Incidents
export const mockIncidents: Incident[] = [
  {
    id: "incident-1",
    propertyId: "prop-1",
    assetId: "asset-1",
    stayId: "stay-1",
    conversationId: "conv-1",
    severity: "medium",
    status: "scheduled",
    category: "AC",
    description: "AC making strange noises at night",
    createdAt: new Date(Date.now() - 1700000).toISOString(),
    source: "TENANT_MESSAGE",
    aiSuggested: true,
  },
];

// Mock Calendar Events
export const mockCalendarEvents: CalendarEvent[] = [
  {
    id: "event-1",
    propertyId: "prop-1",
    type: "STAY",
    title: "Marie Guest - Downtown Loft",
    startTime: "2024-12-15T15:00:00Z",
    endTime: "2024-12-22T11:00:00Z",
    status: "confirmed",
    tenantId: "tenant-1",
  },
  {
    id: "event-2",
    propertyId: "prop-1",
    type: "MAINTENANCE",
    title: "AC Inspection - Downtown Loft",
    startTime: "2024-12-16T10:00:00Z",
    endTime: "2024-12-16T12:00:00Z",
    status: "proposed",
    assetId: "asset-1",
    incidentId: "incident-1",
    description: "AC making strange noises - tenant reported",
  },
  {
    id: "event-3",
    propertyId: "prop-1",
    type: "CHECK_WINDOW",
    title: "Suggested: Bathroom Light Check",
    startTime: "2024-12-20T14:00:00Z",
    endTime: "2024-12-20T16:00:00Z",
    status: "proposed",
    assetId: "asset-3",
    isAISuggested: true,
    description: "High risk score (60) - previous incidents suggest preventive check",
  },
];

// Mock Risk Scores
export const mockRiskScores: AssetRiskScore[] = [
  {
    assetId: "asset-1",
    score: 75,
    computedAt: new Date().toISOString(),
    reasons: [
      "3 incidents in last 6 months",
      "Noisy complaint this week",
      "Summer season approaching",
    ],
  },
  {
    assetId: "asset-3",
    score: 60,
    computedAt: new Date().toISOString(),
    reasons: [
      "2 incidents in last 3 months",
      "Time since last check: 8 months",
    ],
  },
];

// Helper functions to get data
export const getPropertyById = (id: string): Property | undefined => {
  return mockProperties.find((p) => p.id === id);
};

export const getConversationById = (id: string): Conversation | undefined => {
  return mockConversations.find((c) => c.id === id);
};

export const getMessagesByConversation = (conversationId: string): Message[] => {
  return mockMessages
    .filter((m) => m.conversationId === conversationId)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
};

export const getStaysByProperty = (propertyId: string): Stay[] => {
  return mockStays.filter((s) => s.propertyId === propertyId);
};

export const getIncidentsByProperty = (propertyId: string): Incident[] => {
  return mockIncidents.filter((i) => i.propertyId === propertyId);
};

export const getCalendarEventsByProperty = (propertyId: string): CalendarEvent[] => {
  return mockCalendarEvents
    .filter((e) => e.propertyId === propertyId)
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
};

export const getAssetsByProperty = (propertyId: string): Asset[] => {
  const property = getPropertyById(propertyId);
  return property?.assets || [];
};


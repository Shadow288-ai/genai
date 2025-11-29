import React, { useState } from "react";
import { useParams } from "react-router-dom";
import type { User, Message } from "../../types";
import {
  mockConversations,
  getMessagesByConversation,
  mockProperties,
} from "../../services/mockData";
import ChatInterface from "../../components/chat/ChatInterface";

interface TenantMessagesProps {
  user: User;
}

const TenantMessages: React.FC<TenantMessagesProps> = ({ user }) => {
  const { conversationId } = useParams<{ conversationId?: string }>();
  const [selectedConversation, setSelectedConversation] = useState<string | null>(
    conversationId || null
  );
  const conversations = mockConversations.filter((c) => c.tenantId === user.id);

  const conversation = selectedConversation
    ? conversations.find((c) => c.id === selectedConversation)
    : conversations[0];

  // Initialize messages from mock data, but allow updates
  const initialMessages = conversation ? getMessagesByConversation(conversation.id) : [];
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  
  const property = conversation
    ? mockProperties.find((p) => p.id === conversation.propertyId)
    : null;

  // Update messages when conversation changes
  React.useEffect(() => {
    if (conversation) {
      const newMessages = getMessagesByConversation(conversation.id);
      setMessages(newMessages);
    }
  }, [conversation?.id]);

  const handleSendMessage = (content: string) => {
    // Add user message optimistically
    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      conversationId: conversation!.id,
      senderId: user.id,
      senderType: user.role,
      content: content,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);
  };

  const handleNewMessage = (message: Message) => {
    setMessages((prev) => [...prev, message]);
  };

  const handleIncidentCreated = (incidentId: string) => {
    console.log("Incident created:", incidentId);
    // Could show a notification or update UI
  };

  const handleAskAI = (question: string) => {
    // This is now handled by ChatInterface directly via API
    console.log("AI question:", question);
  };

  return (
    <div className="page-container messages-page">
      <div className="messages-layout">
        <div className="conversations-sidebar">
          <div className="sidebar-header">
            <h3>Messages</h3>
          </div>
          <div className="conversations-list">
            {conversations.map((conv) => {
              const prop = mockProperties.find((p) => p.id === conv.propertyId);
              return (
                <div
                  key={conv.id}
                  className={`conversation-item ${selectedConversation === conv.id ? "active" : ""}`}
                  onClick={() => setSelectedConversation(conv.id)}
                >
                  <div className="conversation-header">
                    <strong>{prop?.name || "Property"}</strong>
                    {conv.unreadCount && conv.unreadCount > 0 && (
                      <span className="badge">{conv.unreadCount}</span>
                    )}
                  </div>
                  <div className="conversation-preview">
                    {conv.sentiment === "negative" && (
                      <span className="sentiment-badge negative">⚠️</span>
                    )}
                    <span className="text-muted">
                      {new Date(conv.lastMessageAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="chat-main">
          {conversation && property ? (
            <ChatInterface
              conversation={conversation}
              messages={messages}
              property={property}
              currentUser={user}
              onSendMessage={handleSendMessage}
              onAskAI={handleAskAI}
              onNewMessage={handleNewMessage}
              onIncidentCreated={handleIncidentCreated}
            />
          ) : (
            <div className="empty-chat">
              <p>Select a conversation to start chatting</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TenantMessages;

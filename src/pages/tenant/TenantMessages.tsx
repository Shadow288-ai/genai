import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import type { User, Message } from "../../types";
import {
  mockConversations,
  mockProperties,
} from "../../services/mockData";
import ChatInterface from "../../components/chat/ChatInterface";
import { apiService } from "../../services/api";

interface TenantMessagesProps {
  user: User;
}

const TenantMessages: React.FC<TenantMessagesProps> = ({ user }) => {
  const { conversationId } = useParams<{ conversationId?: string }>();
  const [selectedConversation, setSelectedConversation] = useState<string | null>(
    conversationId || null
  );
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  
  const conversations = mockConversations.filter((c) => c.tenantId === user.id);

  const conversation = selectedConversation
    ? conversations.find((c) => c.id === selectedConversation)
    : conversations[0];
  
  const property = conversation
    ? mockProperties.find((p) => p.id === conversation.propertyId)
    : null;

  // Load messages from backend when conversation changes
  useEffect(() => {
    const loadMessages = async () => {
      if (!conversation) {
        setMessages([]);
        return;
      }

      setIsLoadingMessages(true);
      try {
        const response = await apiService.getConversation(conversation.id);
        const loadedMessages: Message[] = response.messages.map((msg: any) => ({
          id: msg.id || `msg-${Date.now()}-${Math.random()}`,
          conversationId: conversation.id,
          senderId: msg.senderId || (msg.role === "assistant" ? "ai-assistant" : user.id),
          senderType: msg.senderType || (msg.role === "assistant" ? "AI" : user.role),
          content: msg.content,
          timestamp: msg.timestamp || new Date().toISOString(),
          metadata: msg.metadata || {},
        }));
        
        loadedMessages.sort((a, b) => 
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
        
        setMessages(loadedMessages);
      } catch (error) {
        console.error("Failed to load messages:", error);
        setMessages([]);
      } finally {
        setIsLoadingMessages(false);
      }
    };

    loadMessages();
  }, [conversation?.id, user.id, user.role]);

  const handleSendMessage = (content: string) => {
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
            isLoadingMessages ? (
              <div className="empty-chat">
                <p>Loading messages...</p>
              </div>
            ) : (
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
            )
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

import React, { useState, useRef, useEffect } from "react";
import type { User, Message, Conversation, Property } from "../../types";
import { apiService } from "../../services/api";
import logoIcon from "../../assets/logo.png";

interface ChatInterfaceProps {
  conversation: Conversation;
  messages: Message[];
  property: Property;
  currentUser: User;
  onSendMessage: (content: string) => void;
  onAskAI: (question: string) => void;
  onNewMessage?: (message: Message) => void;
  onIncidentCreated?: (incidentId: string) => void;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({
  conversation,
  messages,
  property,
  currentUser,
  onSendMessage,
  onAskAI,
  onNewMessage,
  onIncidentCreated,
}) => {
  const [inputValue, setInputValue] = useState("");
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim() && !isLoading) {
      const userMessage = inputValue;
      setInputValue("");
      setIsLoading(true);

      // Call the callback immediately for optimistic UI
      onSendMessage(userMessage);

      try {
        console.log("Sending message to API:", {
          conversation_id: conversation.id,
          property_id: property.id,
          message: userMessage,
          user_id: currentUser.id,
          user_role: currentUser.role,
        });

        // Call backend API
        const response = await apiService.sendChatMessage({
          conversation_id: conversation.id,
          property_id: property.id,
          message: userMessage,
          user_id: currentUser.id,
          user_role: currentUser.role,
        });

        console.log("Received API response:", response);

        // Add AI response to messages
        if (onNewMessage && response.response) {
          const aiMessage: Message = {
            id: `msg-${Date.now()}`,
            conversationId: conversation.id,
            senderId: "ai-assistant",
            senderType: "AI",
            content: response.response,
            timestamp: new Date().toISOString(),
            metadata: {
              incidentId: response.incident_id,
              incidentDetails: response.incident_details,
              isAISuggestion: true,
            },
          };
          onNewMessage(aiMessage);

          // Notify about incident if created
          if (response.incident_created && response.incident_id && onIncidentCreated) {
            onIncidentCreated(response.incident_id);
          }
        } else {
          console.warn("No response from API or onNewMessage not provided");
        }
      } catch (error) {
        console.error("Failed to send message:", error);
        if (onNewMessage) {
          const errorMessage: Message = {
            id: `msg-error-${Date.now()}`,
            conversationId: conversation.id,
            senderId: "ai-assistant",
            senderType: "AI",
            content: `Sorry, I'm having trouble connecting to the server. Error: ${error instanceof Error ? error.message : 'Unknown error'}. Please check that the backend is running on http://localhost:8000 or contact your landlord directly.`,
            timestamp: new Date().toISOString(),
          };
          onNewMessage(errorMessage);
        }
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleAskAI = async (question: string) => {
    if (isLoading) return;
    
    setShowAIPanel(false);
    setIsLoading(true);

    try {
      // Call RAG API directly
      const response = await apiService.queryRAG({
        property_id: property.id,
        question: question,
        user_role: currentUser.role,
      });

      // Add user question and AI answer
      if (onNewMessage) {
        const userMsg: Message = {
          id: `msg-${Date.now()}-user`,
          conversationId: conversation.id,
          senderId: currentUser.id,
          senderType: currentUser.role,
          content: question,
          timestamp: new Date().toISOString(),
        };
        onNewMessage(userMsg);

        const aiMsg: Message = {
          id: `msg-${Date.now()}-ai`,
          conversationId: conversation.id,
          senderId: "ai-assistant",
          senderType: "AI",
          content: response.answer,
          timestamp: new Date().toISOString(),
          metadata: {
            isAISuggestion: true,
          },
        };
        onNewMessage(aiMsg);
      }
    } catch (error) {
      console.error("Failed to query AI:", error);
      if (onNewMessage) {
        const errorMessage: Message = {
          id: `msg-error-${Date.now()}`,
          conversationId: conversation.id,
          senderId: "ai-assistant",
          senderType: "AI",
          content: "Sorry, I'm having trouble connecting to the AI service. Please try again later.",
          timestamp: new Date().toISOString(),
        };
        onNewMessage(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    return date.toLocaleDateString() + " " + date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const formatDateHeader = (timestamp: string, prevTimestamp?: string) => {
    const date = new Date(timestamp);
    const prevDate = prevTimestamp ? new Date(prevTimestamp) : null;
    const now = new Date();
    
    if (!prevDate || date.toDateString() !== prevDate.toDateString()) {
      if (date.toDateString() === now.toDateString()) {
        return "Today";
      }
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      if (date.toDateString() === yesterday.toDateString()) {
        return "Yesterday";
      }
      return date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
    }
    return null;
  };

  const getSenderName = (message: Message) => {
    if (message.senderType === "AI") return "AI Assistant";
    if (message.senderType === "LANDLORD") return "Landlord";
    return currentUser.name;
  };

  const getSenderInitials = (message: Message) => {
    if (message.senderType === "AI") return "AI";
    const name = message.senderType === "LANDLORD" ? "Landlord" : currentUser.name;
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const isCurrentUser = (message: Message) => {
    return message.senderId === currentUser.id && message.senderType !== "AI";
  };

  return (
    <div className="chat-interface">
      <div className="chat-header">
        <div>
          <h3>{property.name}</h3>
          <p className="text-muted">{property.address}</p>
        </div>
        <button
          className="btn-secondary btn-sm"
          onClick={() => setShowAIPanel(!showAIPanel)}
          disabled={isLoading}
        >
          {showAIPanel ? "Hide" : "Ask"} AI Assistant
        </button>
      </div>

      {showAIPanel && (
        <div className="ai-panel">
          <h4>Property Assistant</h4>
          <p className="text-muted">Ask me anything about this property</p>
          <div className="ai-quick-questions">
            <button
              className="btn-link"
              onClick={() => handleAskAI("How does the TV work?")}
              disabled={isLoading}
            >
              How does the TV work?
            </button>
            <button
              className="btn-link"
              onClick={() => handleAskAI("Where are the spare keys?")}
              disabled={isLoading}
            >
              Where are the spare keys?
            </button>
            <button
              className="btn-link"
              onClick={() => handleAskAI("How to reset the Wi-Fi router?")}
              disabled={isLoading}
            >
              How to reset the Wi-Fi router?
            </button>
            <button
              className="btn-link"
              onClick={() => handleAskAI("Where are the forks?")}
              disabled={isLoading}
            >
              Where are the forks?
            </button>
          </div>
        </div>
      )}

      <div className="chat-messages">
        {messages.map((message, index) => {
          const prevMessage = index > 0 ? messages[index - 1] : null;
          const dateHeader = formatDateHeader(message.timestamp, prevMessage?.timestamp);
          const isOwn = isCurrentUser(message);
          
          return (
            <React.Fragment key={message.id}>
              {dateHeader && (
                <div className="message-date-divider">
                  <span>{dateHeader}</span>
                </div>
              )}
              <div className={`message-bubble ${isOwn ? "message-sent" : "message-received"}`}>
                {!isOwn && (
                  <div className={`message-avatar-circle ${message.senderType === "AI" ? "avatar-with-logo" : ""}`}>
                    {message.senderType === "AI" ? (
                      <img src={logoIcon} alt="AI Assistant" className="avatar-logo" />
                    ) : (
                      <span className="avatar-initials">{getSenderInitials(message)}</span>
                    )}
                  </div>
                )}
                <div className="message-bubble-content">
                  {!isOwn && (
                    <div className="message-sender-name">{getSenderName(message)}</div>
                  )}
                  <div className="message-text">{message.content}</div>
                  {message.metadata?.incidentId && message.metadata?.incidentDetails && (
                    <div className="incident-card">
                      <div className="incident-card-header">
                        <div className="incident-card-icon">🔧</div>
                        <div>
                          <h4>Maintenance Ticket Created</h4>
                          <p className="text-muted">Your landlord has been notified</p>
                        </div>
                      </div>
                      <div className="incident-card-body">
                        <div className="incident-card-row">
                          <span className="incident-label">Issue:</span>
                          <span className="incident-value">{message.metadata.incidentDetails.description}</span>
                        </div>
                        <div className="incident-card-row">
                          <span className="incident-label">Category:</span>
                          <span className="incident-value">{message.metadata.incidentDetails.category}</span>
                        </div>
                        <div className="incident-card-row">
                          <span className="incident-label">Severity:</span>
                          <span className={`incident-severity severity-${message.metadata.incidentDetails.severity}`}>
                            {message.metadata.incidentDetails.severity}
                          </span>
                        </div>
                        <div className="incident-card-row">
                          <span className="incident-label">Ticket ID:</span>
                          <span className="incident-value incident-id">{message.metadata.incidentId.substring(0, 8)}</span>
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="message-timestamp">{formatTime(message.timestamp)}</div>
                </div>
              </div>
            </React.Fragment>
          );
        })}
        {isLoading && (
          <div className="message-bubble message-received">
            <div className="message-avatar-circle avatar-with-logo">
              <img src={logoIcon} alt="AI Assistant" className="avatar-logo" />
            </div>
            <div className="message-bubble-content">
              <div className="message-sender-name">AI Assistant</div>
              <div className="message-text typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-container">
        <form className="chat-input-form" onSubmit={handleSend}>
          <div className="chat-input-wrapper">
            <input
              type="text"
              className="chat-input"
              placeholder={isLoading ? "AI is thinking..." : "Type a message..."}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              disabled={isLoading}
            />
            <button 
              type="submit" 
              className="chat-send-button" 
              disabled={isLoading || !inputValue.trim()}
              aria-label="Send message"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChatInterface;

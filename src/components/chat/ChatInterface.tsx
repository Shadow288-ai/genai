import React, { useState, useRef, useEffect } from "react";
import type { User, Message, Conversation, Property } from "../../types";
import { apiService } from "../../services/api";

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
        // Call backend API
        const response = await apiService.sendChatMessage({
          conversation_id: conversation.id,
          property_id: property.id,
          message: userMessage,
          user_id: currentUser.id,
          user_role: currentUser.role,
        });

        // Add AI response to messages
        if (onNewMessage) {
          const aiMessage: Message = {
            id: `msg-${Date.now()}`,
            conversationId: conversation.id,
            senderId: "ai-assistant",
            senderType: "AI",
            content: response.response,
            timestamp: new Date().toISOString(),
            metadata: {
              incidentId: response.incident_id,
              isAISuggestion: true,
            },
          };
          onNewMessage(aiMessage);

          // Notify about incident if created
          if (response.incident_created && response.incident_id && onIncidentCreated) {
            onIncidentCreated(response.incident_id);
          }
        }
      } catch (error) {
        console.error("Failed to send message:", error);
        // Show error message
        if (onNewMessage) {
          const errorMessage: Message = {
            id: `msg-error-${Date.now()}`,
            conversationId: conversation.id,
            senderId: "ai-assistant",
            senderType: "AI",
            content: "Sorry, I'm having trouble connecting to the server. Please try again or contact your landlord directly.",
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

  const getSenderName = (message: Message) => {
    if (message.senderType === "AI") return "AI Assistant";
    if (message.senderType === "LANDLORD") return "Landlord";
    return currentUser.name;
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
        {messages.map((message) => (
          <div
            key={message.id}
            className={`message ${message.senderType.toLowerCase()} ${isCurrentUser(message) ? "own" : ""}`}
          >
            <div className="message-avatar">
              {message.senderType === "AI" ? "🤖" : message.senderType === "LANDLORD" ? "👤" : "👤"}
            </div>
            <div className="message-content">
              <div className="message-header">
                <strong>{getSenderName(message)}</strong>
                <span className="message-time">{formatTime(message.timestamp)}</span>
              </div>
              <div className="message-body">{message.content}</div>
              {message.metadata?.incidentId && (
                <div className="message-meta">
                  <span className="badge">Maintenance ticket created</span>
                </div>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="message ai">
            <div className="message-avatar">🤖</div>
            <div className="message-content">
              <div className="message-body">Thinking...</div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form className="chat-input-form" onSubmit={handleSend}>
        <input
          type="text"
          className="chat-input"
          placeholder={isLoading ? "AI is thinking..." : "Type a message..."}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          disabled={isLoading}
        />
        <button type="submit" className="btn-primary btn-send" disabled={isLoading || !inputValue.trim()}>
          {isLoading ? "..." : "Send"}
        </button>
      </form>
    </div>
  );
};

export default ChatInterface;

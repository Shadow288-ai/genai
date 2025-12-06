import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import type { User, Message } from "../../types";
import {
  mockConversations,
  mockProperties,
} from "../../services/mockData";
import ChatInterface from "../../components/chat/ChatInterface";
import { apiService } from "../../services/api";

interface LandlordInboxProps {
  user: User;
}

const LandlordInbox: React.FC<LandlordInboxProps> = ({ user }) => {
  const { conversationId } = useParams<{ conversationId?: string }>();
  const [selectedConversation, setSelectedConversation] = useState<string | null>(
    conversationId || null
  );
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [suggestedReply, setSuggestedReply] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  
  const conversations = mockConversations.filter((c) => c.landlordId === user.id);

  const conversation = selectedConversation
    ? conversations.find((c) => c.id === selectedConversation)
    : conversations[0];
  
  const property = conversation
    ? mockProperties.find((p) => p.id === conversation.propertyId)
    : null;

  // Load messages from backend
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
        setSuggestedReply(null);
        setSummary(null);
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
  };

  const handleAskAI = (question: string) => {
    console.log("AI question:", question);
  };

  const handleSuggestReply = async () => {
    if (!conversation) return;
    
    try {
      const context = messages.map((msg) => ({
        role: msg.senderType === "AI" ? "assistant" : msg.senderType === "LANDLORD" ? "user" : "user",
        content: msg.content,
        timestamp: msg.timestamp,
      }));

      const response = await apiService.suggestReply({
        conversation_id: conversation.id,
        context: context,
      });

      setSuggestedReply(response.suggestion);
    } catch (error) {
      console.error("Failed to generate reply suggestion:", error);
      setSuggestedReply("Sorry, I couldn't generate a reply suggestion. Please try again.");
    }
  };

  const handleSummarize = async () => {
    if (!conversation) return;
    
    try {
      const context = messages.map((msg) => ({
        role: msg.senderType === "AI" ? "assistant" : msg.senderType === "LANDLORD" ? "user" : "user",
        content: msg.content,
        timestamp: msg.timestamp,
      }));

      // For now, we'll use the suggest reply with a custom prompt
      const response = await apiService.suggestReply({
        conversation_id: conversation.id,
        context: [
          {
            role: "system",
            content: "Summarize this conversation in 2-3 sentences, highlighting key issues and actions needed.",
          },
          ...context,
        ],
      });

      setSummary(response.suggestion);
    } catch (error) {
      console.error("Failed to generate summary:", error);
      setSummary("Sorry, I couldn't generate a summary. Please try again.");
    }
  };

  const useSuggestedReply = () => {
    if (suggestedReply) {
      handleSendMessage(suggestedReply);
      setSuggestedReply(null);
    }
  };

  return (
    <div className="page-container messages-page">
      <div className="messages-layout">
        <div className="conversations-sidebar">
          <div className="sidebar-header">
            <h3>Inbox</h3>
            <div className="inbox-filters">
              <button className="btn-link btn-sm">All</button>
              <button className="btn-link btn-sm">Urgent</button>
            </div>
          </div>
          <div className="conversations-list">
            {conversations.map((conv) => {
              const prop = mockProperties.find((p) => p.id === conv.propertyId);
              return (
                <div
                  key={conv.id}
                  className={`conversation-item ${selectedConversation === conv.id ? "active" : ""} ${conv.sentiment === "negative" ? "negative" : ""}`}
                  onClick={() => setSelectedConversation(conv.id)}
                >
                  <div className="conversation-header">
                    <strong>{prop?.name || "Property"}</strong>
                    {conv.unreadCount && conv.unreadCount > 0 && (
                      <span className="badge">{conv.unreadCount}</span>
                    )}
                    {conv.isUrgent && <span className="badge urgent">Urgent</span>}
                  </div>
                  <div className="conversation-preview">
                    {conv.sentiment === "negative" && (
                      <span className="sentiment-badge negative">⚠️ Negative sentiment</span>
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
              <div className="chat-wrapper">
                <div className="chat-actions-bar">
                  <button className="btn-secondary btn-sm" onClick={handleSuggestReply}>
                    💡 Suggest Reply
                  </button>
                  <button className="btn-secondary btn-sm" onClick={handleSummarize}>
                    📝 Summarize Thread
                  </button>
                </div>
                
                {suggestedReply && (
                  <div className="suggestion-panel">
                    <div className="suggestion-header">
                      <strong>Suggested Reply:</strong>
                      <button className="btn-link btn-sm" onClick={() => setSuggestedReply(null)}>
                        ✕
                      </button>
                    </div>
                    <p>{suggestedReply}</p>
                    <button className="btn-primary btn-sm" onClick={useSuggestedReply}>
                      Use This Reply
                    </button>
                  </div>
                )}

                {summary && (
                  <div className="suggestion-panel">
                    <div className="suggestion-header">
                      <strong>Conversation Summary:</strong>
                      <button className="btn-link btn-sm" onClick={() => setSummary(null)}>
                        ✕
                      </button>
                    </div>
                    <p>{summary}</p>
                  </div>
                )}

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
              </div>
            )
          ) : (
            <div className="empty-chat">
              <p>Select a conversation to view messages</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LandlordInbox;

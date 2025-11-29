import React, { useState } from "react";
import { useParams } from "react-router-dom";
import type { User } from "../../types";
import {
  mockConversations,
  getMessagesByConversation,
  mockProperties,
} from "../../services/mockData";
import ChatInterface from "../../components/chat/ChatInterface";

interface LandlordInboxProps {
  user: User;
}

const LandlordInbox: React.FC<LandlordInboxProps> = ({ user }) => {
  const { conversationId } = useParams<{ conversationId?: string }>();
  const [selectedConversation, setSelectedConversation] = useState<string | null>(
    conversationId || null
  );
  const conversations = mockConversations.filter((c) => c.landlordId === user.id);

  const conversation = selectedConversation
    ? conversations.find((c) => c.id === selectedConversation)
    : conversations[0];

  const messages = conversation ? getMessagesByConversation(conversation.id) : [];
  const property = conversation
    ? mockProperties.find((p) => p.id === conversation.propertyId)
    : null;

  const handleSendMessage = (content: string) => {
    console.log("Sending message:", content);
  };

  const handleAskAI = (question: string) => {
    console.log("Asking AI:", question);
  };

  const handleSuggestReply = () => {
    // In production, this would call AI service
    console.log("Generating reply suggestion");
  };

  const handleSummarize = () => {
    // In production, this would call AI service
    console.log("Generating summary");
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
            <div className="chat-wrapper">
              <div className="chat-actions-bar">
                <button className="btn-secondary btn-sm" onClick={handleSuggestReply}>
                  💡 Suggest Reply
                </button>
                <button className="btn-secondary btn-sm" onClick={handleSummarize}>
                  📝 Summarize Thread
                </button>
              </div>
              <ChatInterface
                conversation={conversation}
                messages={messages}
                property={property}
                currentUser={user}
                onSendMessage={handleSendMessage}
                onAskAI={handleAskAI}
              />
            </div>
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


import React from "react";
import type { CalendarEvent } from "../../types";
import { mockProperties } from "../../services/mockData";

interface CalendarEventDetailModalProps {
  event: CalendarEvent;
  onClose: () => void;
}

const CalendarEventDetailModal: React.FC<CalendarEventDetailModalProps> = ({
  event,
  onClose,
}) => {
  const property = mockProperties.find((p) => p.id === event.propertyId);

  const getEventIcon = (type: string) => {
    if (type === "STAY") return "🏠";
    if (type === "MAINTENANCE") return "🔧";
    if (type === "CHECK_WINDOW") return "🔍";
    return "📅";
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "green";
      case "proposed":
        return "yellow";
      case "cancelled":
        return "red";
      default:
        return "gray";
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
      time: date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };
  };

  const startDateTime = formatDateTime(event.startTime);
  const endDateTime = formatDateTime(event.endTime);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ fontSize: "1.5rem" }}>{getEventIcon(event.type)}</span>
            <h2>Event Details</h2>
          </div>
          <button className="btn-link" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="modal-body">
          <div className="incident-detail-section">
            <h3>Title</h3>
            <p style={{ fontSize: "1.125rem", fontWeight: 600 }}>{event.title}</p>
          </div>

          <div className="incident-detail-section">
            <h3>Property</h3>
            <p>{property?.name || "Unknown Property"}</p>
            <p className="text-muted">{property?.address}</p>
          </div>

          <div className="incident-detail-grid">
            <div className="incident-detail-item">
              <label>Type</label>
              <p>{event.type}</p>
            </div>
            <div className="incident-detail-item">
              <label>Status</label>
              <span className={`status-badge ${getStatusColor(event.status)}`}>
                {event.status}
              </span>
            </div>
            <div className="incident-detail-item">
              <label>Start Date & Time</label>
              <p>{startDateTime.date}</p>
              <p className="text-muted">{startDateTime.time}</p>
            </div>
            <div className="incident-detail-item">
              <label>End Date & Time</label>
              <p>{endDateTime.date}</p>
              <p className="text-muted">{endDateTime.time}</p>
            </div>
          </div>

          {event.description && (
            <div className="incident-detail-section">
              <h3>Description</h3>
              <p>{event.description}</p>
            </div>
          )}

          {event.isAISuggested && (
            <div className="incident-detail-section">
              <p className="text-muted">
                <strong>AI Suggested:</strong> This event was automatically suggested by the AI assistant.
              </p>
            </div>
          )}

          <div className="modal-actions">
            <button className="btn-secondary" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CalendarEventDetailModal;


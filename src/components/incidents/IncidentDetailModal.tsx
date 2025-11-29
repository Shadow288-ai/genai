import React, { useState } from "react";
import type { Incident } from "../../types";
import { mockProperties } from "../../services/mockData";

interface IncidentDetailModalProps {
  incident: Incident;
  onClose: () => void;
  onScheduleVisit: (incidentId: string, startTime: string, endTime: string, description?: string) => void;
}

const IncidentDetailModal: React.FC<IncidentDetailModalProps> = ({
  incident,
  onClose,
  onScheduleVisit,
}) => {
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("10:00");
  const [endTime, setEndTime] = useState("12:00");
  const [notes, setNotes] = useState("");

  const property = mockProperties.find((p) => p.id === incident.propertyId);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "red";
      case "high":
        return "orange";
      case "medium":
        return "yellow";
      default:
        return "blue";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "resolved":
        return "green";
      case "in_progress":
        return "blue";
      case "scheduled":
        return "yellow";
      default:
        return "gray";
    }
  };

  const handleSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate) {
      alert("Please select a date");
      return;
    }

    const startDateTime = `${startDate}T${startTime}:00`;
    const endDateTime = `${startDate}T${endTime}:00`;

    onScheduleVisit(incident.id, startDateTime, endDateTime, notes);
    setShowScheduleForm(false);
    onClose();
  };

  // Set default date to tomorrow
  React.useEffect(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setStartDate(tomorrow.toISOString().split("T")[0]);
  }, []);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Incident Details</h2>
          <button className="btn-link" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="modal-body">
          <div className="incident-detail-section">
            <h3>Property</h3>
            <p>{property?.name || "Unknown Property"}</p>
            <p className="text-muted">{property?.address}</p>
          </div>

          <div className="incident-detail-section">
            <h3>Description</h3>
            <p>{incident.description}</p>
          </div>

          <div className="incident-detail-grid">
            <div className="incident-detail-item">
              <label>Category</label>
              <p>{incident.category}</p>
            </div>
            <div className="incident-detail-item">
              <label>Severity</label>
              <span className={`severity-badge ${getSeverityColor(incident.severity)}`}>
                {incident.severity}
              </span>
            </div>
            <div className="incident-detail-item">
              <label>Status</label>
              <span className={`status-badge ${getStatusColor(incident.status)}`}>
                {incident.status}
              </span>
            </div>
            <div className="incident-detail-item">
              <label>Reported</label>
              <p>{new Date(incident.createdAt).toLocaleString()}</p>
            </div>
          </div>

          {incident.aiSuggested && (
            <div className="incident-detail-section">
              <p className="text-muted">
                <strong>AI Suggested:</strong> This incident was automatically created by the AI assistant.
              </p>
            </div>
          )}

          {!showScheduleForm ? (
            <div className="modal-actions">
              <button
                className="btn-primary"
                onClick={() => setShowScheduleForm(true)}
              >
                Schedule Visit
              </button>
              <button className="btn-secondary" onClick={onClose}>
                Close
              </button>
            </div>
          ) : (
            <form className="schedule-form" onSubmit={handleSchedule}>
              <h3>Schedule Maintenance Visit</h3>
              
              <div className="form-group">
                <label className="form-label">
                  Date
                  <input
                    type="date"
                    className="form-input"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                    min={new Date().toISOString().split("T")[0]}
                  />
                </label>
              </div>

              <div className="form-group-row">
                <div className="form-group">
                  <label className="form-label">
                    Start Time
                    <input
                      type="time"
                      className="form-input"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      required
                    />
                  </label>
                </div>
                <div className="form-group">
                  <label className="form-label">
                    End Time
                    <input
                      type="time"
                      className="form-input"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      required
                    />
                  </label>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">
                  Notes (optional)
                  <textarea
                    className="form-input"
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Additional notes for the visit..."
                  />
                </label>
              </div>

              <div className="modal-actions">
                <button type="submit" className="btn-primary">
                  Schedule Visit
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowScheduleForm(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default IncidentDetailModal;


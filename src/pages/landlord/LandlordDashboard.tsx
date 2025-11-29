import React from "react";
import { useNavigate } from "react-router-dom";
import type { User } from "../../types";
import {
  mockProperties,
  mockIncidents,
  mockRiskScores,
  mockCalendarEvents,
} from "../../services/mockData";

interface LandlordDashboardProps {
  user: User;
}

const LandlordDashboard: React.FC<LandlordDashboardProps> = () => {
  const navigate = useNavigate();

  const totalProperties = mockProperties.length;
  const openIncidents = mockIncidents.filter((i) => i.status !== "resolved").length;
  const highRiskAssets = mockRiskScores.filter((r) => r.score >= 70).length;
  const upcomingEvents = mockCalendarEvents.filter(
    (e) => new Date(e.startTime) >= new Date() && e.status === "confirmed"
  ).length;

  const recentIncidents = mockIncidents
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  const getPropertyName = (propertyId: string) => {
    return mockProperties.find((p) => p.id === propertyId)?.name || "Unknown";
  };

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

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>Dashboard</h2>
        <p className="text-muted">Overview of your properties and maintenance</p>
      </div>

      <div className="dashboard-cards">
        <div className="stat-card" onClick={() => navigate("/landlord/properties")}>
          <div className="stat-icon">🏠</div>
          <div className="stat-content">
            <div className="stat-value">{totalProperties}</div>
            <div className="stat-label">Properties</div>
          </div>
        </div>

        <div className="stat-card" onClick={() => navigate("/landlord/maintenance")}>
          <div className="stat-icon">⚠️</div>
          <div className="stat-content">
            <div className="stat-value">{openIncidents}</div>
            <div className="stat-label">Open Incidents</div>
          </div>
        </div>

        <div className="stat-card" onClick={() => navigate("/landlord/maintenance")}>
          <div className="stat-icon">🔴</div>
          <div className="stat-content">
            <div className="stat-value">{highRiskAssets}</div>
            <div className="stat-label">High Risk Assets</div>
          </div>
        </div>

        <div className="stat-card" onClick={() => navigate("/landlord/calendar")}>
          <div className="stat-icon">📅</div>
          <div className="stat-content">
            <div className="stat-value">{upcomingEvents}</div>
            <div className="stat-label">Upcoming Events</div>
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="card card-large">
          <div className="card-header">
            <h3>Recent Incidents</h3>
            <button
              className="btn-link"
              onClick={() => navigate("/landlord/maintenance")}
            >
              View all
            </button>
          </div>
          <div className="incidents-list">
            {recentIncidents.length === 0 ? (
              <p className="text-muted">No recent incidents</p>
            ) : (
              recentIncidents.map((incident) => (
                <div key={incident.id} className="incident-item">
                  <div className="incident-main">
                    <div>
                      <strong>{getPropertyName(incident.propertyId)}</strong>
                      <p className="text-muted">{incident.description}</p>
                    </div>
                    <span
                      className={`severity-badge ${getSeverityColor(incident.severity)}`}
                    >
                      {incident.severity}
                    </span>
                  </div>
                  <div className="incident-meta">
                    <span className="text-muted">
                      {new Date(incident.createdAt).toLocaleDateString()}
                    </span>
                    <span className={`status-badge ${incident.status}`}>
                      {incident.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="card card-large">
          <div className="card-header">
            <h3>This Week</h3>
          </div>
          <div className="week-summary">
            <div className="summary-item">
              <span className="summary-label">Properties with active stays:</span>
              <span className="summary-value">{totalProperties}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">AI suggestions pending:</span>
              <span className="summary-value">
                {mockCalendarEvents.filter((e) => e.isAISuggested && e.status === "proposed")
                  .length}
              </span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Avg response time:</span>
              <span className="summary-value">2.5 hours</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandlordDashboard;


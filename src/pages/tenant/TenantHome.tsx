import React from "react";
import { useNavigate } from "react-router-dom";
import type { User } from "../../types";
import { mockStays, mockProperties } from "../../services/mockData";

interface TenantHomeProps {
  user: User;
}

const TenantHome: React.FC<TenantHomeProps> = ({ user }) => {
  const navigate = useNavigate();
  const activeStay = mockStays.find((s) => s.tenantId === user.id && s.status === "active");
  const property = activeStay
    ? mockProperties.find((p) => p.id === activeStay.propertyId)
    : null;

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>Welcome back, {user.name}!</h2>
        <p className="text-muted">Your property assistant is here to help</p>
      </div>

      {activeStay && property ? (
        <div className="card card-large">
          <div className="card-header">
            <h3>Your Active Stay</h3>
          </div>
          <div className="stay-card">
            <div className="stay-info">
              <h4>{property.name}</h4>
              <p className="text-muted">{property.address}</p>
              <div className="stay-dates">
                <span>
                  <strong>Check-in:</strong> {new Date(activeStay.checkIn).toLocaleDateString()}
                </span>
                <span>
                  <strong>Check-out:</strong> {new Date(activeStay.checkOut).toLocaleDateString()}
                </span>
              </div>
            </div>
            <div className="stay-actions">
              <button
                className="btn-primary"
                onClick={() => navigate("/tenant/messages")}
              >
                Ask Property Assistant
              </button>
              <button
                className="btn-secondary"
                onClick={() => navigate("/tenant/visits")}
              >
                View Upcoming Visits
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="card card-large">
          <div className="empty-state">
            <h3>No active stay</h3>
            <p className="text-muted">You don't have any active reservations at the moment.</p>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <h3>Quick Actions</h3>
        </div>
        <div className="quick-actions">
          <button
            className="action-card"
            onClick={() => navigate("/tenant/messages")}
          >
            <div className="action-icon">💬</div>
            <div className="action-text">
              <strong>Chat with Landlord</strong>
              <span>Send a message or ask a question</span>
            </div>
          </button>
          <button
            className="action-card"
            onClick={() => navigate("/tenant/messages")}
          >
            <div className="action-icon">🤖</div>
            <div className="action-text">
              <strong>Property Assistant</strong>
              <span>Ask about the property 24/7</span>
            </div>
          </button>
          <button
            className="action-card"
            onClick={() => navigate("/tenant/visits")}
          >
            <div className="action-icon">📅</div>
            <div className="action-text">
              <strong>Upcoming Visits</strong>
              <span>View scheduled maintenance</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default TenantHome;


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
        <div>
          <h2>Welcome back, {user.name}!</h2>
          <p className="text-muted">Your property assistant is here to help</p>
        </div>
      </div>

      <div className="tenant-home-grid">
        {activeStay && property ? (
          <div className="card card-large property-card">
            <div className="property-card-header">
              <div>
                <h3>{property.name}</h3>
                <p className="text-muted">{property.address}</p>
              </div>
            </div>
            <div className="property-details">
              <div className="property-detail-item">
                <span className="detail-label">Check-in</span>
                <span className="detail-value">
                  {new Date(activeStay.checkIn).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              </div>
              <div className="property-detail-item">
                <span className="detail-label">Check-out</span>
                <span className="detail-value">
                  {new Date(activeStay.checkOut).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              </div>
            </div>
            <div className="property-actions">
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
                View Visits
              </button>
            </div>
          </div>
        ) : (
          <div className="card card-large">
            <div className="empty-state">
              <div className="empty-icon">🏠</div>
              <h3>No active stay</h3>
              <p className="text-muted">You don't have any active reservations at the moment.</p>
            </div>
          </div>
        )}

        <div className="card quick-actions-card">
          <div className="card-header">
            <h3>Quick Actions</h3>
          </div>
          <div className="quick-actions-grid">
            <button
              className="action-card"
              onClick={() => navigate("/tenant/messages")}
            >
              <div className="action-icon">🤖</div>
              <div className="action-content">
                <strong>Property Assistant</strong>
                <span>Ask about the property 24/7</span>
              </div>
            </button>
            <button
              className="action-card"
              onClick={() => navigate("/tenant/visits")}
            >
              <div className="action-icon">📅</div>
              <div className="action-content">
                <strong>Upcoming Visits</strong>
                <span>View scheduled maintenance</span>
              </div>
            </button>
            <button
              className="action-card"
              onClick={() => navigate("/tenant/profile")}
            >
              <div className="action-icon">👤</div>
              <div className="action-content">
                <strong>Profile</strong>
                <span>Manage your account</span>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TenantHome;


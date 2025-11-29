import React from "react";
import type { User } from "../../types";
import {
  mockCalendarEvents,
  mockProperties,
  mockStays,
} from "../../services/mockData";

interface TenantVisitsProps {
  user: User;
}

const TenantVisits: React.FC<TenantVisitsProps> = ({ user }) => {
  const activeStay = mockStays.find((s) => s.tenantId === user.id && s.status === "active");
  const visits = activeStay
    ? mockCalendarEvents.filter(
        (e) =>
          e.tenantId === user.id &&
          e.type === "MAINTENANCE" &&
          new Date(e.startTime) >= new Date()
      )
    : [];
  const properties = mockProperties;

  const getPropertyName = (propertyId: string) => {
    return properties.find((p) => p.id === propertyId)?.name || "Unknown Property";
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>Upcoming Visits</h2>
        <p className="text-muted">Maintenance appointments and scheduled visits</p>
      </div>

      {visits.length === 0 ? (
        <div className="card card-large">
          <div className="empty-state">
            <h3>No upcoming visits</h3>
            <p className="text-muted">
              You don't have any scheduled maintenance visits at the moment.
            </p>
          </div>
        </div>
      ) : (
        <div className="visits-list">
          {visits.map((visit) => {
            const { date, time } = formatDateTime(visit.startTime);
            return (
              <div key={visit.id} className="card visit-card">
                <div className="visit-header">
                  <h4>{visit.title}</h4>
                  <span className={`status-badge ${visit.status}`}>{visit.status}</span>
                </div>
                <div className="visit-details">
                  <p>
                    <strong>Property:</strong> {getPropertyName(visit.propertyId)}
                  </p>
                  <p>
                    <strong>Date:</strong> {date}
                  </p>
                  <p>
                    <strong>Time:</strong> {time}
                  </p>
                  {visit.description && (
                    <p>
                      <strong>Reason:</strong> {visit.description}
                    </p>
                  )}
                </div>
                {visit.status === "proposed" && (
                  <div className="visit-actions">
                    <button className="btn-primary btn-sm">Confirm</button>
                    <button className="btn-secondary btn-sm">Suggest Alternative</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TenantVisits;


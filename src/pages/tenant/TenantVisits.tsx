import React, { useState, useEffect } from "react";
import type { User, CalendarEvent } from "../../types";
import {
  mockProperties,
  mockStays,
} from "../../services/mockData";
import { apiService } from "../../services/api";

interface TenantVisitsProps {
  user: User;
}

const TenantVisits: React.FC<TenantVisitsProps> = ({ user }) => {
  const [visits, setVisits] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const activeStay = mockStays.find((s) => s.tenantId === user.id && s.status === "active");
  const properties = mockProperties;

  // Load calendar events from backend
  useEffect(() => {
    const loadVisits = async () => {
      if (!activeStay) {
        setVisits([]);
        return;
      }

      setIsLoading(true);
      try {
        // Fetch events
        const response = await apiService.getAllCalendarEvents(activeStay.propertyId);
        
        const allEvents: CalendarEvent[] = response.events.map((e: any) => ({
          id: e.id,
          propertyId: e.property_id,
          type: e.type as any,
          title: e.title,
          startTime: e.start_time,
          endTime: e.end_time,
          status: e.status as any,
          tenantId: e.tenant_id,
          assetId: e.asset_id,
          incidentId: e.incident_id,
          isAISuggested: e.is_ai_suggested || false,
          description: e.description,
        }));
        
        // Filter for future maintenance events
        const filteredVisits = allEvents.filter(
          (e) =>
            e.type === "MAINTENANCE" &&
            new Date(e.startTime) >= new Date() &&
            e.propertyId === activeStay.propertyId &&
            (!e.tenantId || e.tenantId === user.id)
        );
        
        filteredVisits.sort((a, b) => 
          new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
        );
        
        setVisits(filteredVisits);
      } catch (error) {
        console.error("Failed to load visits:", error);
        setVisits([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadVisits();
  }, [activeStay, user.id]);

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

      {isLoading ? (
        <div className="card card-large">
          <div className="empty-state">
            <p>Loading visits...</p>
          </div>
        </div>
      ) : !activeStay ? (
        <div className="card card-large">
          <div className="empty-state">
            <h3>No active stay</h3>
            <p className="text-muted">
              You need an active stay to view scheduled visits.
            </p>
          </div>
        </div>
      ) : visits.length === 0 ? (
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


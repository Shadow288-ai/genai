import React, { useState, useEffect, useMemo } from "react";
import type { User, Incident } from "../../types";
import { mockProperties } from "../../services/mockData";
import { apiService } from "../../services/api";
import IncidentDetailModal from "../../components/incidents/IncidentDetailModal";

interface LandlordMaintenanceProps {
  user: User;
}

const LandlordMaintenance: React.FC<LandlordMaintenanceProps> = ({ user }) => {
  const [selectedProperty, setSelectedProperty] = useState<string>("all");
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [isLoadingIncidents, setIsLoadingIncidents] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);

  // Memoize properties to prevent unnecessary re-renders
  const properties = useMemo(() => 
    mockProperties.filter((p) => p.landlordId === user.id),
    [user.id]
  );

  // Load incidents from backend
  useEffect(() => {
    const loadIncidents = async () => {
      setIsLoadingIncidents(true);
      try {
        const response = await apiService.getAllIncidents(
          selectedProperty === "all" ? undefined : selectedProperty,
          user.id
        );
        
        // Convert API response to Incident format
        const loadedIncidents: Incident[] = response.incidents.map((inc: any) => ({
          id: inc.id,
          propertyId: inc.property_id,
          assetId: inc.asset_id,
          stayId: inc.stay_id,
          conversationId: inc.conversation_id,
          severity: inc.severity,
          status: inc.status,
          category: inc.category as any,
          description: inc.description,
          createdAt: inc.created_at,
          resolvedAt: inc.resolved_at,
          source: inc.ai_suggested ? "AI_SUGGESTION" : "TENANT_MESSAGE",
          aiSuggested: inc.ai_suggested || false,
        }));
        
        setIncidents(loadedIncidents);
      } catch (error) {
        console.error("Failed to load incidents:", error);
        setIncidents([]);
      } finally {
        setIsLoadingIncidents(false);
      }
    };

    loadIncidents();
  }, [selectedProperty, user.id]);

  // Filter incidents by selected property
  const filteredIncidents = incidents.filter((i) =>
    selectedProperty === "all"
      ? properties.some((p) => p.id === i.propertyId)
      : i.propertyId === selectedProperty
  );

  const getPropertyName = (propertyId: string) => {
    return properties.find((p) => p.id === propertyId)?.name || "Unknown";
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

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>Maintenance</h2>
        <div className="maintenance-controls">
          <select
            className="form-input"
            value={selectedProperty}
            onChange={(e) => setSelectedProperty(e.target.value)}
          >
            <option value="all">All Properties</option>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="incidents-view">
        <div className="card card-large">
          <div className="card-header">
            <h3>All Incidents</h3>
            <div className="incident-filters">
              <button className="btn-link btn-sm">All</button>
              <button className="btn-link btn-sm">Open</button>
              <button className="btn-link btn-sm">Resolved</button>
            </div>
          </div>
          {isLoadingIncidents ? (
            <div className="empty-state">
              <p>Loading incidents...</p>
            </div>
          ) : filteredIncidents.length === 0 ? (
            <div className="empty-state">
              <p>No incidents found. All clear!</p>
            </div>
          ) : (
            <div className="table-wrapper">
              <div className="incidents-table">
                <table className="table">
                <thead>
                  <tr>
                    <th>Property</th>
                    <th>Description</th>
                    <th>Category</th>
                    <th>Severity</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredIncidents.map((incident) => (
                    <tr key={incident.id}>
                      <td>{getPropertyName(incident.propertyId)}</td>
                      <td>{incident.description}</td>
                      <td>{incident.category}</td>
                      <td>
                        <span
                          className={`severity-badge ${getSeverityColor(incident.severity)}`}
                        >
                          {incident.severity}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`status-badge ${getStatusColor(incident.status)}`}
                        >
                          {incident.status}
                        </span>
                      </td>
                      <td>{new Date(incident.createdAt).toLocaleDateString()}</td>
                      <td>
                        <button 
                          className="btn-link btn-sm"
                          onClick={() => setSelectedIncident(incident)}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {selectedIncident && (
        <IncidentDetailModal
          incident={selectedIncident}
          onClose={() => setSelectedIncident(null)}
          onScheduleVisit={async (incidentId, startTime, endTime, description) => {
            try {
              const property = mockProperties.find(
                (p) => p.id === selectedIncident.propertyId
              );
              
              await apiService.createCalendarEvent({
                property_id: selectedIncident.propertyId,
                type: "MAINTENANCE",
                title: `Maintenance: ${selectedIncident.category} - ${property?.name || "Property"}`,
                start_time: startTime,
                end_time: endTime,
                status: "confirmed",
                incident_id: incidentId,
                description: description || selectedIncident.description,
              });

              // Update incident status locally
              setIncidents((prev) =>
                prev.map((inc) =>
                  inc.id === incidentId
                    ? { ...inc, status: "scheduled" as any }
                    : inc
                )
              );

              alert("Visit scheduled successfully! Check the Calendar tab to see it.");
            } catch (error) {
              console.error("Failed to schedule visit:", error);
              alert("Failed to schedule visit. Please try again.");
            }
          }}
        />
      )}
    </div>
  );
};

export default LandlordMaintenance;

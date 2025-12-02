import React, { useState, useEffect, useMemo } from "react";
import type { User, Incident } from "../../types";
import {
  mockRiskScores,
  mockProperties,
  getAssetsByProperty,
} from "../../services/mockData";
import { apiService } from "../../services/api";
import IncidentDetailModal from "../../components/incidents/IncidentDetailModal";

interface LandlordMaintenanceProps {
  user: User;
}

interface MaintenancePrediction {
  asset_id: string;
  asset_name: string;
  asset_type: string;
  predicted_date: string;
  confidence: number;
  days_until: number;
  reasoning: string;
  last_maintenance?: string;
  average_interval_days: number;
  maintenance_count: number;
}

const LandlordMaintenance: React.FC<LandlordMaintenanceProps> = ({ user }) => {
  const [view, setView] = useState<"incidents" | "predictive">("incidents");
  const [selectedProperty, setSelectedProperty] = useState<string>("all");
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [isLoadingIncidents, setIsLoadingIncidents] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [predictions, setPredictions] = useState<MaintenancePrediction[]>([]);
  const [isLoadingPredictions, setIsLoadingPredictions] = useState(false);

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

  // Load maintenance predictions
  useEffect(() => {
    const loadPredictions = async () => {
      if (view !== "predictive") {
        setPredictions([]);
        setIsLoadingPredictions(false);
        return;
      }
      
      setIsLoadingPredictions(true);
      try {
        if (selectedProperty === "all") {
          // Load predictions for all properties
          const allPredictions: MaintenancePrediction[] = [];
          const propertyIds = properties.map(p => p.id);
          
          console.log("Loading predictions for properties:", propertyIds);
          
          for (const propertyId of propertyIds) {
            try {
              console.log(`Fetching predictions for ${propertyId}...`);
              const response = await apiService.getMaintenancePredictions(propertyId);
              console.log(`Got ${response.predictions.length} predictions for ${propertyId}`);
              allPredictions.push(...response.predictions);
            } catch (error) {
              console.error(`Failed to load predictions for ${propertyId}:`, error);
            }
          }
          console.log(`Total predictions loaded: ${allPredictions.length}`);
          setPredictions(allPredictions);
        } else {
          console.log(`Fetching predictions for property: ${selectedProperty}`);
          const response = await apiService.getMaintenancePredictions(selectedProperty);
          console.log(`Got ${response.predictions.length} predictions`);
          setPredictions(response.predictions);
        }
      } catch (error) {
        console.error("Failed to load maintenance predictions:", error);
        setPredictions([]);
      } finally {
        setIsLoadingPredictions(false);
      }
    };

    loadPredictions();
  }, [view, selectedProperty, properties]); // Now safe to include properties since it's memoized

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

  const getRiskColor = (score: number) => {
    if (score >= 70) return "red";
    if (score >= 50) return "orange";
    if (score >= 30) return "yellow";
    return "green";
  };

  // Get all assets with risk scores
  const allAssets = properties.flatMap((p) => getAssetsByProperty(p.id));
  const assetsWithRisk = allAssets.map((asset) => {
    const riskScore = mockRiskScores.find((r) => r.assetId === asset.id);
    return {
      asset,
      riskScore: riskScore?.score || 0,
      reasons: riskScore?.reasons || [],
    };
  });

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>Maintenance</h2>
        <div className="maintenance-controls">
          <div className="view-toggle">
            <button
              className={view === "incidents" ? "active" : ""}
              onClick={() => setView("incidents")}
            >
              Incidents
            </button>
            <button
              className={view === "predictive" ? "active" : ""}
              onClick={() => setView("predictive")}
            >
              Predictive Maintenance
            </button>
          </div>
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

      {view === "incidents" ? (
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
            )}
          </div>
        </div>
      ) : (
        <div className="predictive-view">
          <div className="card card-large">
            <div className="card-header">
              <h3>Predictive Maintenance</h3>
              <p className="text-muted">
                ML-powered predictions for next maintenance dates based on historical data
              </p>
            </div>
            {isLoadingPredictions ? (
              <div className="empty-state">
                <p>Loading predictions...</p>
              </div>
            ) : predictions.length === 0 ? (
              <div className="empty-state">
                <h3>No maintenance predictions available</h3>
                <p className="text-muted">
                  {selectedProperty === "all" 
                    ? "No maintenance history found for any property. Maintenance history files should be in backend/data/maintenance_history/"
                    : `No maintenance history found for this property. Check backend/data/maintenance_history/${selectedProperty}_maintenance_history.txt`}
                </p>
                <p className="text-muted" style={{ fontSize: "0.875rem", marginTop: "8px" }}>
                  The ML model needs historical maintenance data to generate predictions. 
                  History files should contain records in format: asset_id|asset_name|asset_type|date|type
                </p>
              </div>
            ) : (
              <div className="predictions-grid">
                {predictions
                  .sort((a, b) => a.days_until - b.days_until)
                  .map((prediction) => {
                    const property = properties.find((p) => 
                      p.assets.some(a => a.id === prediction.asset_id)
                    );
                    const asset = property?.assets.find(a => a.id === prediction.asset_id);
                    const predictedDate = new Date(prediction.predicted_date);
                    const isOverdue = prediction.days_until < 0;
                    const isUrgent = prediction.days_until >= 0 && prediction.days_until <= 30;
                    
                    return (
                      <div key={prediction.asset_id} className="card prediction-card">
                        <div className="prediction-header">
                          <div>
                            <h4>{prediction.asset_name}</h4>
                            <p className="text-muted">
                              {property?.name} • {asset?.location || prediction.asset_type}
                            </p>
                          </div>
                          <div className={`confidence-badge confidence-${Math.floor(prediction.confidence * 10) * 10}`}>
                            {Math.round(prediction.confidence * 100)}% confidence
                          </div>
                        </div>
                        <div className="prediction-details">
                          <div className="prediction-row">
                            <span className="prediction-label">Next Maintenance:</span>
                            <span className={`prediction-date ${isOverdue ? 'overdue' : isUrgent ? 'urgent' : ''}`}>
                              {predictedDate.toLocaleDateString()}
                            </span>
                          </div>
                          <div className="prediction-row">
                            <span className="prediction-label">Days Until:</span>
                            <span className={`prediction-days ${isOverdue ? 'overdue' : isUrgent ? 'urgent' : ''}`}>
                              {isOverdue ? `${Math.abs(prediction.days_until)} days overdue` : `${prediction.days_until} days`}
                            </span>
                          </div>
                          {prediction.last_maintenance && (
                            <div className="prediction-row">
                              <span className="prediction-label">Last Maintenance:</span>
                              <span className="prediction-value">
                                {new Date(prediction.last_maintenance).toLocaleDateString()}
                              </span>
                            </div>
                          )}
                          <div className="prediction-row">
                            <span className="prediction-label">Average Interval:</span>
                            <span className="prediction-value">
                              {Math.round(prediction.average_interval_days)} days
                            </span>
                          </div>
                          <div className="prediction-row">
                            <span className="prediction-label">History Records:</span>
                            <span className="prediction-value">
                              {prediction.maintenance_count} maintenance events
                            </span>
                          </div>
                        </div>
                        <div className="prediction-reasoning">
                          <strong>Prediction Basis:</strong>
                          <p className="text-muted">{prediction.reasoning}</p>
                        </div>
                        <div className="prediction-actions">
                          <button 
                            className="btn-primary btn-sm"
                            onClick={() => {
                              // Schedule maintenance based on prediction
                              const startDate = new Date(predictedDate);
                              startDate.setHours(9, 0, 0, 0);
                              const endDate = new Date(startDate);
                              endDate.setHours(17, 0, 0, 0);
                              
                              // This would open a calendar event creation modal
                              alert(`Schedule maintenance for ${prediction.asset_name} on ${predictedDate.toLocaleDateString()}`);
                            }}
                          >
                            Schedule Maintenance
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>
      )}

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

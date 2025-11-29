import React, { useState, useEffect } from "react";
import type { User, Incident } from "../../types";
import {
  mockRiskScores,
  mockProperties,
  getAssetsByProperty,
} from "../../services/mockData";
import { apiService } from "../../services/api";

interface LandlordMaintenanceProps {
  user: User;
}

const LandlordMaintenance: React.FC<LandlordMaintenanceProps> = ({ user }) => {
  const [view, setView] = useState<"incidents" | "predictive">("incidents");
  const [selectedProperty, setSelectedProperty] = useState<string>("all");
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [isLoadingIncidents, setIsLoadingIncidents] = useState(false);

  const properties = mockProperties.filter((p) => p.landlordId === user.id);

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
                          <button className="btn-link btn-sm">View</button>
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
              <h3>Asset Risk Scores</h3>
              <p className="text-muted">
                AI-powered risk prediction based on historical data and patterns
              </p>
            </div>
            <div className="risk-scores-grid">
              {assetsWithRisk
                .sort((a, b) => b.riskScore - a.riskScore)
                .map(({ asset, riskScore, reasons }) => {
                  const property = properties.find((p) => p.id === asset.propertyId);
                  return (
                    <div key={asset.id} className="card risk-score-card">
                      <div className="risk-score-header">
                        <div>
                          <h4>{asset.name}</h4>
                          <p className="text-muted">
                            {property?.name} • {asset.location}
                          </p>
                        </div>
                        <div
                          className={`risk-score-circle ${getRiskColor(riskScore)}`}
                        >
                          <div className="risk-score-value">{riskScore}</div>
                          <div className="risk-score-label">Risk</div>
                        </div>
                      </div>
                      <div className="risk-reasons">
                        {reasons.length > 0 && (
                          <>
                            <strong>Why this risk score:</strong>
                            <ul>
                              {reasons.map((reason, i) => (
                                <li key={i}>{reason}</li>
                              ))}
                            </ul>
                          </>
                        )}
                      </div>
                      <div className="risk-actions">
                        <button className="btn-primary btn-sm">Schedule Check</button>
                        <button className="btn-secondary btn-sm">View History</button>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LandlordMaintenance;

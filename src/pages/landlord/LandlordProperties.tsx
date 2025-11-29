import React, { useState } from "react";
import { useParams } from "react-router-dom";
import type { User, Property } from "../../types";
import { mockProperties, mockRiskScores, getAssetsByProperty } from "../../services/mockData";

interface LandlordPropertiesProps {
  user: User;
}

const LandlordProperties: React.FC<LandlordPropertiesProps> = ({ user }) => {
  const { propertyId } = useParams<{ propertyId?: string }>();
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(
    propertyId ? mockProperties.find((p) => p.id === propertyId) || null : null
  );

  const properties = mockProperties.filter((p) => p.landlordId === user.id);

  const getRiskScore = (assetId: string) => {
    return mockRiskScores.find((r) => r.assetId === assetId)?.score || 0;
  };

  const getRiskColor = (score: number) => {
    if (score >= 70) return "red";
    if (score >= 50) return "orange";
    if (score >= 30) return "yellow";
    return "green";
  };

  if (selectedProperty) {
    const assets = getAssetsByProperty(selectedProperty.id);
    return (
      <div className="page-container">
        <div className="page-header">
          <button className="btn-secondary" onClick={() => setSelectedProperty(null)}>
            ← Back to Properties
          </button>
          <h2>{selectedProperty.name}</h2>
        </div>

        <div className="card card-large">
          <div className="card-header">
            <h3>Property Details</h3>
          </div>
          <div className="property-details">
            <div className="detail-row">
              <label>Address</label>
              <span>{selectedProperty.address}</span>
            </div>
            <div className="detail-row">
              <label>Type</label>
              <span>{selectedProperty.type}</span>
            </div>
          </div>
        </div>

        <div className="card card-large">
          <div className="card-header">
            <h3>Assets & Risk Scores</h3>
          </div>
          <div className="assets-grid">
            {assets.map((asset) => {
              const riskScore = getRiskScore(asset.id);
              return (
                <div key={asset.id} className="asset-card">
                  <div className="asset-header">
                    <h4>{asset.name}</h4>
                    <span className={`risk-badge ${getRiskColor(riskScore)}`}>
                      Risk: {riskScore}
                    </span>
                  </div>
                  <div className="asset-details">
                    <p>
                      <strong>Type:</strong> {asset.type}
                    </p>
                    <p>
                      <strong>Location:</strong> {asset.location}
                    </p>
                    {asset.model && (
                      <p>
                        <strong>Model:</strong> {asset.model}
                      </p>
                    )}
                    {asset.lastCheckDate && (
                      <p>
                        <strong>Last Check:</strong>{" "}
                        {new Date(asset.lastCheckDate).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>Properties</h2>
        <button className="btn-primary">+ Add Property</button>
      </div>

      <div className="properties-grid">
        {properties.map((property) => (
          <div
            key={property.id}
            className="card property-card"
            onClick={() => setSelectedProperty(property)}
          >
            <div className="property-card-header">
              <h3>{property.name}</h3>
              <span className="property-type">{property.type}</span>
            </div>
            <p className="text-muted">{property.address}</p>
            <div className="property-stats">
              <span>{property.assets.length} assets</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LandlordProperties;


import React, { useState } from "react";
import type { User } from "../../types";

interface TenantProfileProps {
  user: User;
}

const TenantProfile: React.FC<TenantProfileProps> = ({ user }) => {
  const [language, setLanguage] = useState(user.language || "en");
  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    sms: false,
  });

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setLanguage(e.target.value);
    // In production, this would save to backend
  };

  const handleNotificationChange = (type: keyof typeof notifications) => {
    setNotifications((prev) => ({
      ...prev,
      [type]: !prev[type],
    }));
    // In production, this would save to backend
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>Profile Settings</h2>
        <p className="text-muted">Manage your account preferences</p>
      </div>

      <div className="card card-large">
        <div className="card-header">
          <h3>Account Information</h3>
        </div>
        <div className="profile-info">
          <div className="info-row">
            <label>Name</label>
            <span>{user.name}</span>
          </div>
          <div className="info-row">
            <label>Email</label>
            <span>{user.email}</span>
          </div>
          <div className="info-row">
            <label>Role</label>
            <span>{user.role}</span>
          </div>
        </div>
      </div>

      <div className="card card-large">
        <div className="card-header">
          <h3>Preferences</h3>
        </div>
        <div className="preferences-section">
          <div className="preference-item">
            <label htmlFor="language">Preferred Language</label>
            <select
              id="language"
              className="form-input"
              value={language}
              onChange={handleLanguageChange}
            >
              <option value="en">English</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
              <option value="de">German</option>
              <option value="it">Italian</option>
            </select>
            <p className="hint">AI assistant will respond in your preferred language</p>
          </div>
        </div>
      </div>

      <div className="card card-large">
        <div className="card-header">
          <h3>Notifications</h3>
        </div>
        <div className="notifications-section">
          <div className="notification-item">
            <div>
              <strong>Email Notifications</strong>
              <p className="text-muted">Receive updates via email</p>
            </div>
            <label className="toggle">
              <input
                type="checkbox"
                checked={notifications.email}
                onChange={() => handleNotificationChange("email")}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>
          <div className="notification-item">
            <div>
              <strong>Push Notifications</strong>
              <p className="text-muted">Receive real-time updates</p>
            </div>
            <label className="toggle">
              <input
                type="checkbox"
                checked={notifications.push}
                onChange={() => handleNotificationChange("push")}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>
          <div className="notification-item">
            <div>
              <strong>SMS Notifications</strong>
              <p className="text-muted">Receive urgent updates via SMS</p>
            </div>
            <label className="toggle">
              <input
                type="checkbox"
                checked={notifications.sms}
                onChange={() => handleNotificationChange("sms")}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TenantProfile;


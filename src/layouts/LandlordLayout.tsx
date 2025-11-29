import React from "react";
import { Routes, Route, NavLink, useNavigate } from "react-router-dom";
import type { User } from "../types";
import LandlordDashboard from "../pages/landlord/LandlordDashboard";
import LandlordProperties from "../pages/landlord/LandlordProperties";
import LandlordInbox from "../pages/landlord/LandlordInbox";
import LandlordCalendar from "../pages/landlord/LandlordCalendar";
import LandlordMaintenance from "../pages/landlord/LandlordMaintenance";

interface LandlordLayoutProps {
  user: User;
  onLogout: () => void;
}

const LandlordLayout: React.FC<LandlordLayoutProps> = ({ user, onLogout }) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    onLogout();
    navigate("/login");
  };

  return (
    <div className="app-container landlord-layout">
      <header className="app-header">
        <div className="header-content">
          <h1 className="app-logo">HomeGuard AI</h1>
          <nav className="main-nav">
            <NavLink
              to="/landlord/dashboard"
              className={({ isActive }) => (isActive ? "active" : "")}
            >
              Dashboard
            </NavLink>
            <NavLink
              to="/landlord/properties"
              className={({ isActive }) => (isActive ? "active" : "")}
            >
              Properties
            </NavLink>
            <NavLink
              to="/landlord/inbox"
              className={({ isActive }) => (isActive ? "active" : "")}
            >
              Inbox
            </NavLink>
            <NavLink
              to="/landlord/calendar"
              className={({ isActive }) => (isActive ? "active" : "")}
            >
              Calendar
            </NavLink>
            <NavLink
              to="/landlord/maintenance"
              className={({ isActive }) => (isActive ? "active" : "")}
            >
              Maintenance
            </NavLink>
          </nav>
          <div className="header-user">
            <span>{user.name}</span>
            <button className="btn-secondary btn-sm" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="app-main">
        <Routes>
          <Route path="dashboard" element={<LandlordDashboard user={user} />} />
          <Route path="properties" element={<LandlordProperties user={user} />} />
          <Route path="properties/:propertyId" element={<LandlordProperties user={user} />} />
          <Route path="inbox" element={<LandlordInbox user={user} />} />
          <Route path="inbox/:conversationId" element={<LandlordInbox user={user} />} />
          <Route path="calendar" element={<LandlordCalendar user={user} />} />
          <Route path="maintenance" element={<LandlordMaintenance user={user} />} />
        </Routes>
      </main>
    </div>
  );
};

export default LandlordLayout;


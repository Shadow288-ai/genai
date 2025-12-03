import React, { useState } from "react";
import { Routes, Route, NavLink, useNavigate } from "react-router-dom";
import type { User } from "../types";
import TenantHome from "../pages/tenant/TenantHome";
import TenantMessages from "../pages/tenant/TenantMessages";
import TenantVisits from "../pages/tenant/TenantVisits";
import TenantProfile from "../pages/tenant/TenantProfile";
import Logo from "../components/Logo";

interface TenantLayoutProps {
  user: User;
  onLogout: () => void;
}

const TenantLayout: React.FC<TenantLayoutProps> = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    onLogout();
    navigate("/login");
  };

  return (
    <div className="app-container tenant-layout">
      <header className="app-header">
        <div className="header-content">
          <Logo size={32} className="app-logo" />
          <button 
            className="mobile-menu-toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
          <nav className={`main-nav ${mobileMenuOpen ? "mobile-open" : ""}`}>
            <NavLink 
              to="/tenant/home" 
              className={({ isActive }) => (isActive ? "active" : "")}
              onClick={() => setMobileMenuOpen(false)}
            >
              Home
            </NavLink>
            <NavLink
              to="/tenant/messages"
              className={({ isActive }) => (isActive ? "active" : "")}
              onClick={() => setMobileMenuOpen(false)}
            >
              Messages
            </NavLink>
            <NavLink
              to="/tenant/visits"
              className={({ isActive }) => (isActive ? "active" : "")}
              onClick={() => setMobileMenuOpen(false)}
            >
              Visits
            </NavLink>
            <NavLink
              to="/tenant/profile"
              className={({ isActive }) => (isActive ? "active" : "")}
              onClick={() => setMobileMenuOpen(false)}
            >
              Profile
            </NavLink>
          </nav>
          <div className="header-user">
            <span className="header-user-name">{user.name}</span>
            <button className="btn-secondary btn-sm" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="app-main">
        <Routes>
          <Route path="home" element={<TenantHome user={user} />} />
          <Route path="messages" element={<TenantMessages user={user} />} />
          <Route path="messages/:conversationId" element={<TenantMessages user={user} />} />
          <Route path="visits" element={<TenantVisits user={user} />} />
          <Route path="profile" element={<TenantProfile user={user} />} />
        </Routes>
      </main>
    </div>
  );
};

export default TenantLayout;


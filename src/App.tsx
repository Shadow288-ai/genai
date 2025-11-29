import React, { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LoginForm from "./components/LoginForm";
import TenantLayout from "./layouts/TenantLayout";
import LandlordLayout from "./layouts/LandlordLayout";
import type { User, LoginCredentials, LoginResult } from "./types";
import { mockLandlord, mockTenant } from "./services/mockData";

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(() => {
    // Check localStorage for persisted user
    const saved = localStorage.getItem("user");
    return saved ? JSON.parse(saved) : null;
  });

  const handleLogin = ({ email, password }: LoginCredentials): LoginResult => {
    // Demo auth - in production, this would be an API call
    if (email === "landlord@example.com" && password === "admin123") {
      const loggedInUser = mockLandlord;
      setUser(loggedInUser);
      localStorage.setItem("user", JSON.stringify(loggedInUser));
      return { success: true, user: loggedInUser };
    }
    if (email === "tenant@example.com" && password === "admin123") {
      const loggedInUser = mockTenant;
      setUser(loggedInUser);
      localStorage.setItem("user", JSON.stringify(loggedInUser));
      return { success: true, user: loggedInUser };
    }
    return { success: false, message: "Invalid credentials" };
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem("user");
  };

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={
            user ? (
              <Navigate
                to={user.role === "LANDLORD" ? "/landlord/dashboard" : "/tenant/home"}
                replace
              />
            ) : (
              <LoginForm onLogin={handleLogin} />
            )
          }
        />
        <Route
          path="/landlord/*"
          element={
            user && user.role === "LANDLORD" ? (
              <LandlordLayout user={user} onLogout={handleLogout} />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/tenant/*"
          element={
            user && user.role === "TENANT" ? (
              <TenantLayout user={user} onLogout={handleLogout} />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/"
          element={
            user ? (
              <Navigate
                to={user.role === "LANDLORD" ? "/landlord/dashboard" : "/tenant/home"}
                replace
              />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
      </Routes>
    </BrowserRouter>
  );
};

export default App;

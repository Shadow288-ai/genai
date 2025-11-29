import React, { useState } from "react";
import LoginForm from "./components/LoginForm";
import Dashboard from "./pages/DashBoard";
import type { LoginCredentials, LoginResult, User } from "./types";

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);

  const handleLogin = ({ email, password }: LoginCredentials): LoginResult => {
    // Demo-only auth
    if (email === "admin@example.com" && password === "admin123") {
      setUser({ email });
      return { success: true };
    }
    return { success: false, message: "Invalid credentials" };
  };

  const handleLogout = () => {
    setUser(null);
  };

  if (!user) {
    return <LoginForm onLogin={handleLogin} />;
  }

  return <Dashboard user={user} onLogout={handleLogout} />;
};

export default App;

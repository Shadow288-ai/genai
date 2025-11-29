import React, { useState } from "react";
import type { LoginCredentials, LoginResult } from "../types";

interface LoginFormProps {
  onLogin: (credentials: LoginCredentials) => LoginResult;
}

const LoginForm: React.FC<LoginFormProps> = ({ onLogin }) => {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [error, setError] = useState<string>("");

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    const result = onLogin({ email, password });
    if (!result.success) {
      setError(result.message ?? "Login failed");
    }
  };

  const handleQuickLogin = (userType: "landlord" | "tenant") => {
    if (userType === "landlord") {
      setEmail("landlord@example.com");
      setPassword("admin123");
    } else {
      setEmail("tenant@example.com");
      setPassword("admin123");
    }
  };

  return (
    <div className="auth-wrapper">
      <form className="card auth-card" onSubmit={handleSubmit}>
        <div className="auth-header">
          <h1 className="auth-logo">HomeGuard AI</h1>
          <p className="auth-subtitle">Tenant-Landlord Communication Platform</p>
        </div>

        {error && <div className="alert-error">{error}</div>}

        <div className="form-group">
          <label className="form-label">
            Email
            <input
              className="form-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
            />
          </label>
        </div>

        <div className="form-group">
          <label className="form-label">
            Password
            <input
              className="form-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </label>
        </div>

        <button className="btn-primary btn-block" type="submit">
          Login
        </button>

        <div className="auth-divider">
          <span>Quick Login (Demo)</span>
        </div>

        <div className="quick-login-buttons">
          <button
            type="button"
            className="btn-secondary btn-block"
            onClick={() => handleQuickLogin("landlord")}
          >
            Login as Landlord
          </button>
          <button
            type="button"
            className="btn-secondary btn-block"
            onClick={() => handleQuickLogin("tenant")}
          >
            Login as Tenant
          </button>
        </div>

        <p className="hint">
          Demo credentials:
          <br />
          <strong>Landlord:</strong> landlord@example.com / admin123
          <br />
          <strong>Tenant:</strong> tenant@example.com / admin123
        </p>
      </form>
    </div>
  );
};

export default LoginForm;

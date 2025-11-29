import React, { useState } from "react";
import type { LoginCredentials, LoginResult } from "../types";

interface LoginFormProps {
  onLogin: (credentials: LoginCredentials) => LoginResult;
}

const LoginForm: React.FC<LoginFormProps> = ({ onLogin }) => {
  const [email, setEmail] = useState<string>("admin@example.com");
  const [password, setPassword] = useState<string>("admin123");
  const [error, setError] = useState<string>("");

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const result = onLogin({ email, password });
    if (!result.success) {
      setError(result.message ?? "Login failed");
    }
  };

  return (
    <div className="auth-wrapper">
      <form className="card" onSubmit={handleSubmit}>
        <h1 className="card-title">Tenant Manager</h1>
        <p className="card-subtitle">Please log in to continue</p>

        {error && <div className="alert-error">{error}</div>}

        <label className="form-label">
          Email
          <input
            className="form-input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@example.com"
          />
        </label>

        <label className="form-label">
          Password
          <input
            className="form-input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </label>

        <button className="btn-primary" type="submit">
          Login
        </button>

        <p className="hint">
          Demo login: <strong>admin@example.com / admin123</strong>
        </p>
      </form>
    </div>
  );
};

export default LoginForm;

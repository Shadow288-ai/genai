import React from "react";
import logoIcon from "../assets/logo.png";

interface LogoProps {
  size?: number;
  showText?: boolean;
  className?: string;
}

const Logo: React.FC<LogoProps> = ({ size = 32, showText = true, className = "" }) => {
  return (
    <div className={`logo-container ${className}`} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
      <img 
        src={logoIcon} 
        alt="HomeGuard AI Logo" 
        style={{ width: `${size}px`, height: `${size}px`, objectFit: "contain" }}
      />
      {showText && (
        <span style={{ fontSize: "1.25rem", fontWeight: 600, color: "inherit" }}>
          HomeGuard AI
        </span>
      )}
    </div>
  );
};

export default Logo;


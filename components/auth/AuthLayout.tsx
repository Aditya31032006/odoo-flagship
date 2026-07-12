import React from "react";

interface AuthLayoutProps {
  children: React.ReactNode;
  subtitle?: string; // Logo subtitle
  infoColumns?: React.ReactNode; // Columns like PROVENANCE and INTEGRITY
  footerStyle?: "signin" | "register";
}

export default function AuthLayout({
  children,
  subtitle = "Enterprise Asset Intelligence",
  infoColumns,
  footerStyle = "signin",
}: AuthLayoutProps) {
  return (
    <main className="auth-page">
      {/* Logo / Brand Anchor */}
      <div className="auth-brand-logo">
        <div className="brand-logo-icon">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {/* Outline box/wallet icon matching the design */}
            <rect x="3" y="4" width="18" height="16" rx="2" />
            <path d="M16 8h.01" />
            <path d="M12 8H8v8h4c2.2 0 4-1.8 4-4s-1.8-4-4-4z" />
          </svg>
        </div>
        <span className="brand-title">AssetFlow</span>
        {subtitle && <span className="brand-subtitle">{subtitle}</span>}
      </div>

      {/* Primary Card */}
      {children}

      {/* Optional Info Columns / Social Proof */}
      {infoColumns}
    </main>
  );
}

import React from "react";

interface AuthCardProps {
  title: string;
  description: string;
  children: React.ReactNode;
}

export default function AuthCard({ title, description, children }: AuthCardProps) {
  const hasHeader = title || description;
  return (
    <div className="auth-card">
      {hasHeader && (
        <header className="card-header">
          {title && <h1 className="card-title">{title}</h1>}
          {description && <p className="card-description">{description}</p>}
        </header>
      )}
      {children}
    </div>
  );
}

import React from "react";

interface AuthButtonProps {
  type?: "submit" | "button" | "reset";
  loading?: boolean;
  showArrow?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}

export default function AuthButton({
  type = "submit",
  loading = false,
  showArrow = false,
  onClick,
  children,
}: AuthButtonProps) {
  return (
    <button
      type={type}
      disabled={loading}
      onClick={onClick}
      className="auth-btn"
    >
      {loading ? (
        <span>Processing...</span>
      ) : (
        <>
          <span>{children}</span>
          {showArrow && (
            <span className="btn-arrow">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.2}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </span>
          )}
        </>
      )}
    </button>
  );
}

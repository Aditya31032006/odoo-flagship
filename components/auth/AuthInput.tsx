import React, { useState } from "react";

interface AuthInputProps {
  id: string;
  name: string;
  label: string;
  type: string;
  placeholder?: string;
  value?: string;
  required?: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  icon?: "user" | "key";
  rightLabel?: React.ReactNode; // Optional link on the right of the label (e.g. Forgot Key?)
  autoComplete?: string;
}

export default function AuthInput({
  id,
  name,
  label,
  type,
  placeholder,
  value,
  required = false,
  onChange,
  icon,
  rightLabel,
  autoComplete,
}: AuthInputProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const isPasswordField = type === "password";
  const inputType = isPasswordField && showPassword ? "text" : type;

  // Custom inline SVG icons
  const renderIcon = () => {
    if (icon === "user") {
      return (
        <span className="input-icon">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </span>
      );
    }
    if (icon === "key") {
      return (
        <span className="input-icon">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3M15.5 7.5L14 9" />
          </svg>
        </span>
      );
    }
    return null;
  };

  return (
    <div className={`auth-field ${isFocused ? "focused" : ""}`}>
      <div className="field-header">
        <label htmlFor={id}>{label}</label>
        {rightLabel}
      </div>

      <div className="input-wrapper">
        <input
          id={id}
          name={name}
          type={inputType}
          placeholder={placeholder}
          value={value}
          required={required}
          onChange={onChange}
          autoComplete={autoComplete}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className={!icon && !isPasswordField ? "has-no-icon" : ""}
        />

        {/* Regular Field Icon */}
        {!isPasswordField && renderIcon()}

        {/* Password eye toggle button */}
        {isPasswordField && (
          <button
            type="button"
            className="eye-toggle-btn"
            onClick={() => setShowPassword(!showPassword)}
            tabIndex={-1}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                <line x1="1" y1="1" x2="23" y2="23" />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import { useForm } from "../../hooks/useForm";
import useAuth from "../../hooks/useAuth";
import AuthLayout from "../../components/auth/AuthLayout";
import AuthCard from "../../components/auth/AuthCard";
import AuthInput from "../../components/auth/AuthInput";
import AuthButton from "../../components/auth/AuthButton";
import "../../styles/auth.scss";

export default function Login() {
  const { formValues, handleChange } = useForm({ email: "", password: "" });
  const [twoFactorRequired, setTwoFactorRequired] = useState(false);
  const [tempUserId, setTempUserId] = useState("");
  const [emailForOtp, setEmailForOtp] = useState("");
  const [otpCode, setOtpCode] = useState("");
  
  const { LoginUser, VerifyTwoFactor, loading } = useAuth();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (twoFactorRequired) {
      await VerifyTwoFactor(tempUserId, otpCode);
    } else {
      const res = await LoginUser(formValues);
      if (res && res.twoFactorRequired) {
        setTwoFactorRequired(true);
        setTempUserId(res.userId || "");
        setEmailForOtp(res.email || "");
      }
    }
  };

  const forgotPasswordLink = (
    <Link href="/forgot-password" className="forgot-link">
      Forgot password?
    </Link>
  );

  return (
    <AuthLayout footerStyle="signin">
      <ToastContainer position="top-right" autoClose={3000} theme="dark" />

      {twoFactorRequired ? (
        <AuthCard
          title="2FA Verification"
          description={`Enter the 6-digit security code sent to ${emailForOtp}`}
        >
          <form className="auth-form" onSubmit={handleSubmit}>
            <AuthInput
              id="login-otp"
              name="otp"
              label="Security Verification Code"
              type="text"
              placeholder="ENTER 6-DIGIT CODE"
              value={otpCode}
              required
              onChange={(e) => setOtpCode(e.target.value)}
              icon="key"
              autoComplete="one-time-code"
            />

            <AuthButton type="submit" loading={loading} showArrow>
              Verify & Authorize
            </AuthButton>

            <div className="auth-divider">
              <span>or</span>
            </div>

            <div className="auth-text-btn-container">
              <button
                type="button"
                className="auth-text-btn"
                onClick={() => setTwoFactorRequired(false)}
              >
                Back to Sign In
              </button>
            </div>
          </form>
        </AuthCard>
      ) : (
        <AuthCard title="" description="">
          <form className="auth-form" onSubmit={handleSubmit}>
            {/* Email Input */}
            <AuthInput
              id="login-email"
              name="email"
              label="Email Address"
              type="email"
              placeholder="name@company.com"
              value={formValues.email}
              required
              onChange={handleChange}
              autoComplete="email"
            />

            {/* Password Input */}
            <AuthInput
              id="login-password"
              name="password"
              label="Password"
              type="password"
              placeholder="••••••••"
              value={formValues.password}
              required
              onChange={handleChange}
              rightLabel={forgotPasswordLink}
              autoComplete="current-password"
            />

            {/* Sign In Button */}
            <AuthButton type="submit" loading={loading} showArrow>
              Sign In
            </AuthButton>

            {/* Divider */}
            <div className="auth-divider">
              <span>New Here?</span>
            </div>

            {/* Registration Callout */}
            <div className="auth-text-btn-container">
              <p style={{ margin: "0 0 16px 0", fontSize: "0.85rem", color: "#64748b" }}>
                Sign up creates an employee account. Admin roles are assigned later by system supervisors.
              </p>
              <Link href="/register" className="auth-text-btn">
                Create Account
              </Link>
            </div>
          </form>
        </AuthCard>
      )}
    </AuthLayout>
  );
}

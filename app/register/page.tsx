"use client";

import React from "react";
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

export default function Register() {
  const { formValues, handleChange } = useForm({
    name: "",
    email: "",
    password: "",
  });

  const { RegisterUser, loading } = useAuth();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    RegisterUser(formValues);
  };

  return (
    <AuthLayout footerStyle="register">
      <ToastContainer position="top-right" autoClose={3000} theme="dark" />

      <AuthCard
        title="Create Account"
        description="Register to request your employee credentials."
      >
        <form className="auth-form" onSubmit={handleSubmit}>
          {/* Full Name Input */}
          <AuthInput
            id="register-name"
            name="name"
            label="Full Name"
            type="text"
            placeholder="Jane Doe"
            value={formValues.name}
            required
            onChange={handleChange}
            autoComplete="name"
          />

          {/* Email Address Input */}
          <AuthInput
            id="register-email"
            name="email"
            label="Email Address"
            type="email"
            placeholder="name@company.com"
            value={formValues.email}
            required
            onChange={handleChange}
            autoComplete="email"
          />

          {/* Secure Password Input */}
          <AuthInput
            id="register-password"
            name="password"
            label="Password"
            type="password"
            placeholder="••••••••"
            value={formValues.password}
            required
            onChange={handleChange}
            autoComplete="new-password"
          />

          {/* Create Account Button */}
          <AuthButton type="submit" loading={loading} showArrow>
            Create Account
          </AuthButton>

          {/* Card Footer Divider & Switch Link */}
          <footer className="card-footer">
            <span className="footer-label">Already registered?</span>
            <Link href="/login" className="auth-text-btn">
              Sign In
            </Link>
          </footer>
        </form>
      </AuthCard>
    </AuthLayout>
  );
}

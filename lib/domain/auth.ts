export interface LoginCredentials {
  email: string; // Used for "USERNAME OR EMAIL" identification
  password: string;
}

export interface RegisterCredentials {
  name: string;
  email: string;
  password: string;
}

export interface AuthUser {
  id: string | number;
  full_name: string;
  email: string;
}

export interface AuthResponse {
  message: string;
  user?: AuthUser;
  twoFactorRequired?: boolean;
  userId?: string;
  email?: string;
  token?: string;
}

/**
 * Validates login credentials
 */
export function validateLogin(credentials: LoginCredentials): string | null {
  if (!credentials.email.trim()) {
    return "Email Address is required";
  }
  if (!credentials.password) {
    return "Security key is required";
  }
  return null;
}

/**
 * Validates registration credentials
 */
export function validateRegister(credentials: RegisterCredentials): string | null {
  if (!credentials.name.trim()) {
    return "Full Name is required";
  }
  if (!credentials.email.trim()) {
    return "Email address is required";
  }
  // Simple email regex check
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(credentials.email)) {
    return "Invalid email address format";
  }
  if (!credentials.password) {
    return "Password is required";
  }
  if (credentials.password.length < 6) {
    return "Password must be at least 6 characters";
  }
  return null;
}

import { query as defaultQuery } from "../db";

const runQuery = (executor: any, text: string, params?: any[]) => {
  if (typeof executor === "function") {
    return executor(text, params);
  }
  return executor.query(text, params);
};

export const userQueries = {
  /**
   * Retrieves a user by their email address
   */
  async getUserByEmailOrUsername(email: string, executor: any = defaultQuery) {
    const emailLower = email.toLowerCase().trim();
    return runQuery(
      executor,
      "SELECT * FROM users WHERE email = $1",
      [emailLower]
    );
  },

  /**
   * Checks if a user already exists with the given email
   */
  async checkUserExists(email: string, username?: string, executor: any = defaultQuery) {
    return runQuery(
      executor,
      "SELECT * FROM users WHERE email = $1",
      [email.toLowerCase().trim()]
    );
  },

  /**
   * Inserts a new user record into the database
   */
  async insertUser(fullName: string, email: string, passwordHash: string, executor: any = defaultQuery) {
    return runQuery(
      executor,
      "INSERT INTO users (full_name, email, password_hash, role, status) VALUES ($1, $2, $3, 'EMPLOYEE', 'ACTIVE') RETURNING id, full_name, email, email_verified",
      [fullName.trim(), email.toLowerCase().trim(), passwordHash]
    );
  },

  /**
   * Retrieves a user by their unique ID
   */
  async getUserById(id: string, executor: any = defaultQuery) {
    return runQuery(
      executor,
      "SELECT * FROM users WHERE id = $1",
      [id]
    );
  },

  /**
   * Updates a user's OTP code and its expiration timestamp
   */
  async updateUserOtp(userId: string, code: string | null, expiresAt: Date | null, executor: any = defaultQuery) {
    return runQuery(
      executor,
      "UPDATE users SET otp_code = $1, otp_expires_at = $2 WHERE id = $3 RETURNING *",
      [code, expiresAt, userId]
    );
  },

  /**
   * Updates a user's verification status
   */
  async updateUserVerification(userId: string, isVerified: boolean, executor: any = defaultQuery) {
    return runQuery(
      executor,
      "UPDATE users SET email_verified = $1, otp_code = NULL, otp_expires_at = NULL WHERE id = $2 RETURNING *",
      [isVerified, userId]
    );
  },

  /**
   * Updates a user's profile details
   */
  async updateUserProfile(userId: string, fullName: string, email: string, executor: any = defaultQuery) {
    return runQuery(
      executor,
      "UPDATE users SET full_name = $1, email = $2 WHERE id = $3 RETURNING *",
      [fullName.trim(), email.toLowerCase().trim(), userId]
    );
  },

  /**
   * Inserts a new password reset token into the database
   */
  async createPasswordResetToken(userId: string, tokenHash: string, expiresAt: Date, executor: any = defaultQuery) {
    return runQuery(
      executor,
      "INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3) RETURNING *",
      [userId, tokenHash, expiresAt]
    );
  },

  /**
   * Retrieves a password reset token along with the user details
   */
  async getPasswordResetToken(tokenHash: string, executor: any = defaultQuery) {
    return runQuery(
      executor,
      `SELECT t.*, u.email, u.full_name 
       FROM password_reset_tokens t 
       JOIN users u ON t.user_id = u.id 
       WHERE t.token_hash = $1`,
      [tokenHash]
    );
  },

  /**
   * Marks a password reset token as used
   */
  async markPasswordResetTokenUsed(tokenId: string, executor: any = defaultQuery) {
    return runQuery(
      executor,
      "UPDATE password_reset_tokens SET used_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *",
      [tokenId]
    );
  },

  /**
   * Updates a user's password
   */
  async updateUserPassword(userId: string, passwordHash: string, executor: any = defaultQuery) {
    return runQuery(
      executor,
      "UPDATE users SET password_hash = $1, password_changed_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *",
      [passwordHash, userId]
    );
  }
};

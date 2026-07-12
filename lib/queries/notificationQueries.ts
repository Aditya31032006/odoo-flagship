import { query as defaultQuery } from "../db";

const runQuery = (executor: any, text: string, params?: any[]) => {
  if (typeof executor === "function") {
    return executor(text, params);
  }
  return executor.query(text, params);
};

export const notificationQueries = {
  /**
   * Fetches user notifications
   */
  async getNotifications(userId: number, executor: any = defaultQuery) {
    return runQuery(
      executor,
      `SELECT * FROM notifications 
       WHERE user_id = $1 
       ORDER BY created_at DESC`,
      [userId]
    );
  },

  /**
   * Marks a user notification as read
   */
  async markAsRead(id: number, userId: number, executor: any = defaultQuery) {
    return runQuery(
      executor,
      `UPDATE notifications 
       SET is_read = true, 
           read_at = CURRENT_TIMESTAMP 
       WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );
  },

  /**
   * Fetches chronological system events log trail
   */
  async getActivityLogs(executor: any = defaultQuery) {
    return runQuery(
      executor,
      `SELECT al.*, u.full_name AS actor_name
       FROM activity_logs al
       LEFT JOIN users u ON al.actor_user_id = u.id
       ORDER BY al.created_at DESC 
       LIMIT 100`
    );
  }
};

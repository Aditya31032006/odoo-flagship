import { notificationQueries } from "../queries/notificationQueries";
import { query as defaultQuery } from "../db";

export const notificationService = {
  /**
   * Retrieves user notifications list
   */
  async getUserNotifications(userId: number) {
    const res = await notificationQueries.getNotifications(userId);
    return res.rows;
  },

  /**
   * Marks a notification as read
   */
  async markNotificationRead(notificationId: number, userId: number) {
    await notificationQueries.markAsRead(notificationId, userId);
    return { success: true };
  },

  /**
   * Retrieves activity log list (restricts access to ADMIN/ASSET_MANAGER)
   */
  async getAuditTrail(userId: number) {
    // 1. Verify role permissions
    const userRes = await defaultQuery("SELECT role FROM users WHERE id = $1", [userId]);
    if (userRes.rows.length === 0) throw new Error("User session invalid");
    
    const role = userRes.rows[0].role;
    if (role !== "ADMIN" && role !== "ASSET_MANAGER") {
      throw new Error("Access denied: Admin permissions required to view system logs.");
    }

    const res = await notificationQueries.getActivityLogs();
    return res.rows;
  }
};

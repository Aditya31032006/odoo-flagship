import { notificationQueries } from "../queries/notificationQueries";
import { query as defaultQuery } from "../db";

export const notificationService = {
  /**
   * Retrieves user notifications list
   */
  async getUserNotifications(userId: number) {
    try {
      // 1. Dynamic Check: Overdue returns
      const overdueRes = await notificationQueries.getOverdueAllocations();
      for (const row of overdueRes.rows) {
        const exist = await notificationQueries.checkNotificationExists(parseInt(row.employee_id, 10), 'OVERDUE_RETURN', parseInt(row.id, 10));
        if (!exist) {
          const dateStr = new Date(row.expected_return_date).toLocaleDateString();
          await notificationQueries.insertNotification(
            parseInt(row.employee_id, 10),
            'OVERDUE_RETURN',
            'HIGH',
            'Overdue Return Alert',
            `Overdue return: ${row.asset_name} (${row.asset_tag}) was due on ${dateStr}`,
            parseInt(row.id, 10)
          );
        }
      }

      // 2. Dynamic Check: Upcoming returns
      const upcomingRes = await notificationQueries.getUpcomingAllocations();
      for (const row of upcomingRes.rows) {
        const exist = await notificationQueries.checkNotificationExists(parseInt(row.employee_id, 10), 'UPCOMING_RETURN', parseInt(row.id, 10));
        if (!exist) {
          const dateStr = new Date(row.expected_return_date).toLocaleDateString();
          await notificationQueries.insertNotification(
            parseInt(row.employee_id, 10),
            'UPCOMING_RETURN',
            'NORMAL',
            'Upcoming Return Reminder',
            `Upcoming return: ${row.asset_name} (${row.asset_tag}) is due on ${dateStr}`,
            parseInt(row.id, 10)
          );
        }
      }

      // 3. Dynamic Check: Upcoming resource bookings (Reminders)
      const bookingsRes = await notificationQueries.getUpcomingBookings();
      for (const row of bookingsRes.rows) {
        const exist = await notificationQueries.checkNotificationExists(parseInt(row.booked_by, 10), 'BOOKING_REMINDER', parseInt(row.id, 10));
        if (!exist) {
          const timeStr = new Date(row.start_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          await notificationQueries.insertNotification(
            parseInt(row.booked_by, 10),
            'BOOKING_REMINDER',
            'NORMAL',
            'Booking Reminder',
            `Booking reminder: ${row.asset_name} slot starts at ${timeStr}`,
            parseInt(row.id, 10)
          );
        }
      }
    } catch (err) {
      console.error("Dynamic notification warnings error:", err);
    }

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

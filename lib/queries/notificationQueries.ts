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
  },

  // ── Dynamic Alerts Identifiers ──
  async getOverdueAllocations(executor: any = defaultQuery) {
    return runQuery(
      executor,
      `SELECT aa.id, aa.employee_id, aa.asset_id, a.name AS asset_name, a.asset_tag, aa.expected_return_date
       FROM asset_allocations aa
       JOIN assets a ON aa.asset_id = a.id
       WHERE aa.expected_return_date < CURRENT_DATE
         AND aa.status IN ('ACTIVE', 'RETURN_REQUESTED', 'TRANSFER_REQUESTED')
         AND aa.employee_id IS NOT NULL`
    );
  },

  async getUpcomingAllocations(executor: any = defaultQuery) {
    return runQuery(
      executor,
      `SELECT aa.id, aa.employee_id, aa.asset_id, a.name AS asset_name, a.asset_tag, aa.expected_return_date
       FROM asset_allocations aa
       JOIN assets a ON aa.asset_id = a.id
       WHERE aa.expected_return_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '2 days'
         AND aa.status IN ('ACTIVE', 'RETURN_REQUESTED', 'TRANSFER_REQUESTED')
         AND aa.employee_id IS NOT NULL`
    );
  },

  async getUpcomingBookings(executor: any = defaultQuery) {
    return runQuery(
      executor,
      `SELECT rb.id, rb.booked_by, rb.asset_id, a.name AS asset_name, rb.start_at
       FROM resource_bookings rb
       JOIN assets a ON rb.asset_id = a.id
       WHERE rb.start_at BETWEEN CURRENT_TIMESTAMP AND CURRENT_TIMESTAMP + INTERVAL '24 hours'
         AND rb.status = 'UPCOMING'`
    );
  },

  async checkNotificationExists(userId: number, type: string, entityId: number, executor: any = defaultQuery) {
    const res = await runQuery(
      executor,
      `SELECT id FROM notifications 
       WHERE user_id = $1 AND type = $2 AND related_entity_id = $3`,
      [userId, type, entityId]
    );
    return res.rows.length > 0;
  },

  async insertNotification(userId: number, type: string, priority: string, title: string, message: string, entityId: number, executor: any = defaultQuery) {
    return runQuery(
      executor,
      `INSERT INTO notifications (user_id, type, priority, title, message, related_entity_type, related_entity_id)
       VALUES ($1, $2, $3, $4, $5, 'SYSTEM', $6)`,
      [userId, type, priority, title, message, entityId]
    );
  }
};

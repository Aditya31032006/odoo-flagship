import { query as defaultQuery } from "../db";

const runQuery = (executor: any, text: string, params?: any[]) => {
  if (typeof executor === "function") {
    return executor(text, params);
  }
  return executor.query(text, params);
};

export const bookingQueries = {
  /**
   * Fetches assets marked as shared / bookable
   */
  async getBookableAssets(executor: any = defaultQuery) {
    return runQuery(
      executor,
      `SELECT id, name, asset_tag, current_status 
       FROM assets 
       WHERE is_shared_bookable = true 
         AND current_status NOT IN ('LOST', 'RETIRED', 'DISPOSED')
       ORDER BY asset_tag ASC`
    );
  },

  /**
   * Fetches active bookings for an asset on a given date
   */
  async getExistingBookingsForDate(assetId: number, dateStr: string, executor: any = defaultQuery) {
    return runQuery(
      executor,
      `SELECT rb.*, u.full_name AS booked_by_name, d.name AS department_name
       FROM resource_bookings rb
       LEFT JOIN users u ON rb.booked_by = u.id
       LEFT JOIN departments d ON rb.created_for_department_id = d.id
       WHERE rb.asset_id = $1 
         AND (rb.start_at::date = $2 OR rb.end_at::date = $2)
         AND rb.status != 'CANCELLED'
       ORDER BY rb.start_at ASC`,
      [assetId, dateStr]
    );
  },

  /**
   * Verifies if any bookings overlap with requested start/end range
   */
  async checkOverlap(
    assetId: number,
    startAt: string,
    endAt: string,
    excludeBookingId?: number,
    executor: any = defaultQuery
  ) {
    let sql = `
      SELECT id, title, start_at, end_at 
      FROM resource_bookings 
      WHERE asset_id = $1 
        AND status != 'CANCELLED'
        AND start_at < $3 
        AND end_at > $2
    `;
    const params: any[] = [assetId, startAt, endAt];

    if (excludeBookingId) {
      params.push(excludeBookingId);
      sql += ` AND id != $4`;
    }

    return runQuery(executor, sql, params);
  },

  /**
   * Inserts booking row
   */
  async createBooking(
    assetId: number,
    bookedBy: number,
    createdForType: "EMPLOYEE" | "DEPARTMENT",
    createdForEmployeeId: number | null,
    createdForDepartmentId: number | null,
    title: string,
    purpose: string,
    startAt: string,
    endAt: string,
    reminderMinutesBefore: number,
    executor: any = defaultQuery
  ) {
    return runQuery(
      executor,
      `INSERT INTO resource_bookings (
        asset_id, booked_by, created_for_type, created_for_employee_id, created_for_department_id,
        title, purpose, start_at, end_at, status, reminder_minutes_before
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, 'UPCOMING', $10
      ) RETURNING id`,
      [
        assetId,
        bookedBy,
        createdForType,
        createdForEmployeeId,
        createdForDepartmentId,
        title,
        purpose,
        startAt,
        endAt,
        reminderMinutesBefore
      ]
    );
  },

  /**
   * Cancels resource reservation
   */
  async cancelBooking(
    bookingId: number,
    cancelledBy: number,
    reason: string,
    executor: any = defaultQuery
  ) {
    return runQuery(
      executor,
      `UPDATE resource_bookings 
       SET status = 'CANCELLED', 
           cancelled_by = $2, 
           cancelled_at = CURRENT_TIMESTAMP, 
           cancellation_reason = $3, 
           updated_at = CURRENT_TIMESTAMP 
       WHERE id = $1`,
      [bookingId, cancelledBy, reason]
    );
  },

  async updateBookingTimes(
    bookingId: number,
    startAt: string,
    endAt: string,
    executor: any = defaultQuery
  ) {
    return runQuery(
      executor,
      `UPDATE resource_bookings 
       SET start_at = $2, 
           end_at = $3, 
           updated_at = CURRENT_TIMESTAMP 
       WHERE id = $1`,
      [bookingId, startAt, endAt]
    );
  }
};

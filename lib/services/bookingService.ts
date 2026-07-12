import { bookingQueries } from "../queries/bookingQueries";
import { query as defaultQuery } from "../db";

export const bookingService = {
  /**
   * Fetches assets marked as shared / bookable
   */
  async fetchBookableResources() {
    const res = await bookingQueries.getBookableAssets();
    return res.rows;
  },

  /**
   * Fetches existing bookings for a selected asset and day
   */
  async fetchBookings(assetId: number, dateStr: string) {
    const res = await bookingQueries.getExistingBookingsForDate(assetId, dateStr);
    return res.rows;
  },

  /**
   * Reserves a shared resource after validation checks
   */
  async reserveResource(
    data: {
      assetId: string;
      title: string;
      purpose?: string;
      startAt: string;
      endAt: string;
      createdForType: "EMPLOYEE" | "DEPARTMENT";
      createdForEmployeeId?: string;
      createdForDepartmentId?: string;
      reminderMinutesBefore?: number;
    },
    bookedByUserId: number
  ) {
    const assetIdNum = parseInt(data.assetId, 10);
    const startStr = new Date(data.startAt).toISOString();
    const endStr = new Date(data.endAt).toISOString();

    if (new Date(startStr) >= new Date(endStr)) {
      throw new Error("Start time must be before end time.");
    }

    await defaultQuery("BEGIN");

    try {
      // 1. Verify resource availability
      const assetRes = await defaultQuery(
        "SELECT current_status, is_shared_bookable FROM assets WHERE id = $1",
        [assetIdNum]
      );
      if (assetRes.rows.length === 0) {
        throw new Error("Resource not found.");
      }
      const asset = assetRes.rows[0];
      if (!asset.is_shared_bookable) {
        throw new Error("This resource is not marked as shared/bookable.");
      }
      if (["LOST", "RETIRED", "DISPOSED", "UNDER_MAINTENANCE"].includes(asset.current_status)) {
        throw new Error(`This resource is currently ${asset.current_status.toLowerCase().replace("_", " ")} and cannot be reserved.`);
      }

      // 2. Perform overlapping check
      const overlaps = await bookingQueries.checkOverlap(assetIdNum, startStr, endStr);
      if (overlaps.rows.length > 0) {
        throw new Error(`Booking Rejected (Time Overlap): This resource is already reserved during this period.`);
      }

      // 3. Create booking
      const empId = data.createdForEmployeeId ? parseInt(data.createdForEmployeeId, 10) : null;
      const deptId = data.createdForDepartmentId ? parseInt(data.createdForDepartmentId, 10) : null;

      const createRes = await bookingQueries.createBooking(
        assetIdNum,
        bookedByUserId,
        data.createdForType,
        empId,
        deptId,
        data.title,
        data.purpose || "",
        startStr,
        endStr,
        data.reminderMinutesBefore || 30
      );

      // 4. Create activity log
      await defaultQuery(
        `INSERT INTO activity_logs (actor_user_id, action, entity_type, entity_id, description)
         VALUES ($1, 'BOOK', 'ASSET', $2, $3)`,
        [bookedByUserId, assetIdNum, `Resource reserved: ${data.title}`]
      );

      await defaultQuery("COMMIT");
      return { success: true, id: createRes.rows[0].id };
    } catch (error) {
      await defaultQuery("ROLLBACK");
      throw error;
    }
  },

  /**
   * Cancels a reservation
   */
  async cancelReservation(bookingId: number, cancelledByUserId: number, reason: string) {
    await defaultQuery("BEGIN");
    try {
      const bookingRes = await defaultQuery(
        "SELECT asset_id, status FROM resource_bookings WHERE id = $1",
        [bookingId]
      );
      if (bookingRes.rows.length === 0) {
        throw new Error("Booking record not found.");
      }

      const booking = bookingRes.rows[0];
      if (booking.status === "CANCELLED") {
        throw new Error("Booking is already cancelled.");
      }

      await bookingQueries.cancelBooking(bookingId, cancelledByUserId, reason);

      await defaultQuery(
        `INSERT INTO activity_logs (actor_user_id, action, entity_type, entity_id, description)
         VALUES ($1, 'CANCEL_BOOK', 'ASSET', $2, $3)`,
        [cancelledByUserId, booking.asset_id, `Reservation cancelled: ${reason}`]
      );

      await defaultQuery("COMMIT");
      return { success: true };
    } catch (error) {
      await defaultQuery("ROLLBACK");
      throw error;
    }
  }
};

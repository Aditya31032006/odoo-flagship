import { NextResponse } from "next/server";
import { bookingService } from "../services/bookingService";
import { query } from "../db";

export const bookingController = {
  /**
   * Retrieves bookable resources and day schedule list
   */
  async getBookings(req: Request) {
    try {
      const { searchParams } = new URL(req.url);
      const assetId = searchParams.get("assetId");
      const date = searchParams.get("date");

      // Load initial lists (bookable assets, departments) for dropdowns
      const dropdowns = searchParams.get("dropdowns") === "true";
      if (dropdowns) {
        const [assets, departments] = await Promise.all([
          bookingService.fetchBookableResources(),
          query("SELECT id, name FROM departments WHERE status = 'ACTIVE' ORDER BY name ASC")
        ]);

        return NextResponse.json({ assets, departments }, { status: 200 });
      }

      if (!assetId || !date) {
        return NextResponse.json({ message: "Asset ID and Date are required" }, { status: 400 });
      }

      const list = await bookingService.fetchBookings(parseInt(assetId, 10), date);
      return NextResponse.json(list, { status: 200 });
    } catch (error: any) {
      console.error("ResourceBooking GET Controller Error:", error);
      return NextResponse.json({ message: "Internal server error", details: error.message }, { status: 500 });
    }
  },

  /**
   * Reserves a resource slot
   */
  async createBooking(req: Request) {
    try {
      const headerUserId = req.headers.get("x-user-id");
      if (!headerUserId) {
        return NextResponse.json({ message: "Unauthorized: session missing" }, { status: 401 });
      }

      const userId = parseInt(headerUserId, 10);
      const data = await req.json();

      const newBooking = await bookingService.reserveResource(data, userId);
      return NextResponse.json(newBooking, { status: 201 });
    } catch (error: any) {
      console.error("ResourceBooking POST Controller Error:", error);
      return NextResponse.json({ message: error.message || "Failed to create booking" }, { status: 400 });
    }
  },

  /**
   * Cancels a reservation
   */
  async cancelBooking(req: Request) {
    try {
      const headerUserId = req.headers.get("x-user-id");
      if (!headerUserId) {
        return NextResponse.json({ message: "Unauthorized: session missing" }, { status: 401 });
      }

      const userId = parseInt(headerUserId, 10);
      const { bookingId, reason, startAt, endAt } = await req.json();

      if (!bookingId) {
        return NextResponse.json({ message: "Booking ID is required" }, { status: 400 });
      }

      if (startAt && endAt) {
        await bookingService.rescheduleReservation(parseInt(bookingId, 10), startAt, endAt, userId);
        return NextResponse.json({ message: "Booking rescheduled successfully" }, { status: 200 });
      } else {
        await bookingService.cancelReservation(parseInt(bookingId, 10), userId, reason || "User request");
        return NextResponse.json({ message: "Booking cancelled successfully" }, { status: 200 });
      }
    } catch (error: any) {
      console.error("ResourceBooking PUT Controller Error:", error);
      return NextResponse.json({ message: error.message || "Failed to update booking" }, { status: 400 });
    }
  }
};

import { NextResponse } from "next/server";
import { notificationService } from "../services/notificationService";

export const notificationController = {
  /**
   * Retrieves active user notifications list
   */
  async getNotifications(req: Request) {
    try {
      const headerUserId = req.headers.get("x-user-id");
      if (!headerUserId) {
        return NextResponse.json({ message: "Unauthorized: session missing" }, { status: 401 });
      }

      const userId = parseInt(headerUserId, 10);
      const list = await notificationService.getUserNotifications(userId);
      return NextResponse.json(list, { status: 200 });
    } catch (error: any) {
      console.error("Notifications GET Controller Error:", error);
      return NextResponse.json({ message: "Internal server error", details: error.message }, { status: 500 });
    }
  },

  /**
   * Marks a notification as read
   */
  async markRead(req: Request) {
    try {
      const headerUserId = req.headers.get("x-user-id");
      if (!headerUserId) {
        return NextResponse.json({ message: "Unauthorized: session missing" }, { status: 401 });
      }

      const userId = parseInt(headerUserId, 10);
      const data = await req.json();
      const { id } = data;

      if (!id) {
        return NextResponse.json({ message: "Notification ID is required" }, { status: 400 });
      }

      await notificationService.markNotificationRead(parseInt(id, 10), userId);
      return NextResponse.json({ message: "Notification marked read successfully" }, { status: 200 });
    } catch (error: any) {
      console.error("Notifications PUT Controller Error:", error);
      return NextResponse.json({ message: error.message || "Failed to mark read" }, { status: 400 });
    }
  },

  /**
   * Retrieves chronological audit trail logs (Admins only)
   */
  async getAuditTrail(req: Request) {
    try {
      const headerUserId = req.headers.get("x-user-id");
      if (!headerUserId) {
        return NextResponse.json({ message: "Unauthorized: session missing" }, { status: 401 });
      }

      const userId = parseInt(headerUserId, 10);
      const list = await notificationService.getAuditTrail(userId);
      return NextResponse.json(list, { status: 200 });
    } catch (error: any) {
      console.error("Activity Logs GET Controller Error:", error);
      return NextResponse.json({ message: error.message || "Failed to fetch audit trail" }, { status: 400 });
    }
  }
};

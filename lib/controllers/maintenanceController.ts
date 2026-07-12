import { NextResponse } from "next/server";
import { maintenanceService } from "../services/maintenanceService";
import { query } from "../db";

export const maintenanceController = {
  /**
   * Retrieves maintenance requests grouped for Kanban
   */
  async getKanban(req: Request) {
    try {
      const { searchParams } = new URL(req.url);

      // Load initial lists (assets, employees/technicians) for dropdowns
      const dropdowns = searchParams.get("dropdowns") === "true";
      if (dropdowns) {
        const [assets, employees] = await Promise.all([
          query("SELECT id, name, asset_tag FROM assets ORDER BY asset_tag ASC"),
          query("SELECT id, full_name, role FROM users WHERE status = 'ACTIVE' ORDER BY full_name ASC")
        ]);

        return NextResponse.json({
          assets: assets.rows,
          employees: employees.rows // can act as technicians
        }, { status: 200 });
      }

      const list = await maintenanceService.getKanbanRequests();
      return NextResponse.json(list, { status: 200 });
    } catch (error: any) {
      console.error("Maintenance GET Controller Error:", error);
      return NextResponse.json({ message: "Internal server error", details: error.message }, { status: 500 });
    }
  },

  /**
   * Creates a new request
   */
  async raiseRequest(req: Request) {
    try {
      const headerUserId = req.headers.get("x-user-id");
      if (!headerUserId) {
        return NextResponse.json({ message: "Unauthorized: session missing" }, { status: 401 });
      }

      const userId = parseInt(headerUserId, 10);
      const data = await req.json();

      const info = await maintenanceService.raiseRequest(data, userId);
      return NextResponse.json(info, { status: 201 });
    } catch (error: any) {
      console.error("Maintenance POST Controller Error:", error);
      return NextResponse.json({ message: error.message || "Failed to create request" }, { status: 400 });
    }
  },

  /**
   * Handles action state transition updates
   */
  async updateStage(req: Request) {
    try {
      const headerUserId = req.headers.get("x-user-id");
      if (!headerUserId) {
        return NextResponse.json({ message: "Unauthorized: session missing" }, { status: 401 });
      }

      const userId = parseInt(headerUserId, 10);
      const data = await req.json();
      const { action, id } = data;

      if (!id || !action) {
        return NextResponse.json({ message: "Request ID and action are required" }, { status: 400 });
      }

      const requestId = parseInt(id, 10);

      switch (action) {
        case "APPROVE":
          await maintenanceService.approveRequest(requestId, userId);
          return NextResponse.json({ message: "Request approved successfully" }, { status: 200 });
        case "REJECT":
          await maintenanceService.rejectRequest(requestId, userId, data.reason || "Rejected by supervisor");
          return NextResponse.json({ message: "Request rejected successfully" }, { status: 200 });
        case "ASSIGN":
          if (!data.technicianId) {
            return NextResponse.json({ message: "Technician ID is required for assignment" }, { status: 400 });
          }
          await maintenanceService.assignTechnician(requestId, parseInt(data.technicianId, 10), userId);
          return NextResponse.json({ message: "Technician assigned successfully" }, { status: 200 });
        case "START":
          await maintenanceService.startWork(requestId);
          return NextResponse.json({ message: "Work started successfully" }, { status: 200 });
        case "RESOLVE":
          await maintenanceService.resolveRequest(requestId, data, userId);
          return NextResponse.json({ message: "Request resolved successfully" }, { status: 200 });
        default:
          return NextResponse.json({ message: "Invalid action transition requested" }, { status: 400 });
      }
    } catch (error: any) {
      console.error("Maintenance PUT Controller Error:", error);
      return NextResponse.json({ message: error.message || "Failed to execute transition" }, { status: 400 });
    }
  }
};

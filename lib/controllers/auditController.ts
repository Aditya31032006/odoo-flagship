import { NextResponse } from "next/server";
import { auditService } from "../services/auditService";
import { query } from "../db";

export const auditController = {
  /**
   * Retrieves cycles lists or active checklist parameters
   */
  async getCycles(req: Request) {
    try {
      const { searchParams } = new URL(req.url);
      const cycleId = searchParams.get("cycleId");

      // Load initial lists (departments, locations, categories, users) for dropdowns
      const dropdowns = searchParams.get("dropdowns") === "true";
      if (dropdowns) {
        const [departments, locations, categories, users] = await Promise.all([
          query("SELECT id, name FROM departments WHERE status = 'ACTIVE' ORDER BY name ASC"),
          query("SELECT id, name FROM locations ORDER BY name ASC"),
          query("SELECT id, name FROM asset_categories WHERE status = 'ACTIVE' ORDER BY name ASC"),
          query("SELECT id, full_name, role FROM users WHERE status = 'ACTIVE' ORDER BY full_name ASC")
        ]);

        return NextResponse.json({
          departments: departments.rows,
          locations: locations.rows,
          categories: categories.rows,
          users: users.rows // auditors
        }, { status: 200 });
      }

      if (cycleId) {
        const details = await auditService.fetchCycleDetails(parseInt(cycleId, 10));
        return NextResponse.json(details, { status: 200 });
      }

      const list = await auditService.fetchCycles();
      return NextResponse.json(list, { status: 200 });
    } catch (error: any) {
      console.error("Audit GET Controller Error:", error);
      return NextResponse.json({ message: "Internal server error", details: error.message }, { status: 500 });
    }
  },

  /**
   * Creates a new audit cycle scope checklist
   */
  async createCycle(req: Request) {
    try {
      const headerUserId = req.headers.get("x-user-id");
      if (!headerUserId) {
        return NextResponse.json({ message: "Unauthorized: session missing" }, { status: 401 });
      }

      const userId = parseInt(headerUserId, 10);
      const data = await req.json();

      const newCycle = await auditService.createCycle(data, userId);
      return NextResponse.json(newCycle, { status: 201 });
    } catch (error: any) {
      console.error("Audit POST Controller Error:", error);
      return NextResponse.json({ message: error.message || "Failed to create cycle" }, { status: 400 });
    }
  },

  /**
   * Verification and closure actions
   */
  async updateStage(req: Request) {
    try {
      const headerUserId = req.headers.get("x-user-id");
      if (!headerUserId) {
        return NextResponse.json({ message: "Unauthorized: session missing" }, { status: 401 });
      }

      const userId = parseInt(headerUserId, 10);
      const data = await req.json();
      const { action } = data;

      if (!action) {
        return NextResponse.json({ message: "Action is required" }, { status: 400 });
      }

      switch (action) {
        case "VERIFY":
          await auditService.verifyItem(data, userId);
          return NextResponse.json({ message: "Item verification logged successfully" }, { status: 200 });
        case "RESOLVE_DISCREPANCY":
          await auditService.resolveDiscrepancy(data, userId);
          return NextResponse.json({ message: "Discrepancy resolved successfully" }, { status: 200 });
        case "CLOSE":
          if (!data.cycleId) {
            return NextResponse.json({ message: "Cycle ID is required for closure" }, { status: 400 });
          }
          await auditService.closeCycle(parseInt(data.cycleId, 10), data.notes || "Audit Cycle Closed", userId);
          return NextResponse.json({ message: "Audit Cycle closed and asset statuses updated" }, { status: 200 });
        default:
          return NextResponse.json({ message: "Invalid action transition requested" }, { status: 400 });
      }
    } catch (error: any) {
      console.error("Audit PUT Controller Error:", error);
      return NextResponse.json({ message: error.message || "Failed to complete update" }, { status: 400 });
    }
  }
};

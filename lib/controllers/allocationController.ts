import { NextResponse } from "next/server";
import { allocationService } from "../services/allocationService";
import { query } from "../db";

export const allocationController = {
  /**
   * Checks allocation status and history for an asset
   */
  async checkAllocation(req: Request) {
    try {
      const { searchParams } = new URL(req.url);
      const assetId = searchParams.get("assetId");

      // Load initial lists (assets, employees, departments) for dropdowns
      const dropdowns = searchParams.get("dropdowns") === "true";
      if (dropdowns) {
        const [assetsRes, employeesRes, departmentsRes] = await Promise.all([
          query(
            `SELECT id, name, asset_tag, current_status 
             FROM assets 
             WHERE current_status NOT IN ('LOST', 'UNDER_MAINTENANCE', 'RETIRED', 'DISPOSED')
             ORDER BY asset_tag ASC`
          ),
          query("SELECT id, full_name FROM users WHERE status = 'ACTIVE' ORDER BY full_name ASC"),
          query("SELECT id, name FROM departments WHERE status = 'ACTIVE' ORDER BY name ASC")
        ]);

        return NextResponse.json({
          assets: assetsRes.rows,
          employees: employeesRes.rows,
          departments: departmentsRes.rows
        }, { status: 200 });
      }

      if (!assetId) {
        return NextResponse.json({ message: "Asset ID is required" }, { status: 400 });
      }

      const info = await allocationService.checkAssetAllocation(parseInt(assetId, 10));
      return NextResponse.json(info, { status: 200 });
    } catch (error: any) {
      console.error("checkAllocation Controller Error:", error);
      return NextResponse.json({ message: "Internal server error", details: error.message }, { status: 500 });
    }
  },

  /**
   * Allocates an available asset to a user/department
   */
  async allocateAsset(req: Request) {
    try {
      const headerUserId = req.headers.get("x-user-id");
      if (!headerUserId) {
        return NextResponse.json({ message: "Unauthorized: session missing" }, { status: 401 });
      }

      const creatorId = parseInt(headerUserId, 10);
      const data = await req.json();

      await allocationService.allocateAsset(data, creatorId);
      return NextResponse.json({ message: "Asset allocated successfully" }, { status: 201 });
    } catch (error: any) {
      console.error("allocateAsset Controller Error:", error);
      return NextResponse.json({ message: error.message || "Failed to allocate asset" }, { status: 400 });
    }
  },

  /**
   * Submits a transfer request for an allocated asset
   */
  async createTransferRequest(req: Request) {
    try {
      const headerUserId = req.headers.get("x-user-id");
      if (!headerUserId) {
        return NextResponse.json({ message: "Unauthorized: session missing" }, { status: 401 });
      }

      const creatorId = parseInt(headerUserId, 10);
      const data = await req.json();

      await allocationService.createTransferRequest(data, creatorId);
      return NextResponse.json({ message: "Transfer request submitted successfully" }, { status: 201 });
    } catch (error: any) {
      console.error("createTransferRequest Controller Error:", error);
      return NextResponse.json({ message: error.message || "Failed to submit transfer request" }, { status: 400 });
    }
  }
};

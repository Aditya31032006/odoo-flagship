import { NextResponse } from "next/server";
import { assetService } from "../services/assetService";

export const assetController = {
  /**
   * Retrieves assets list matching search and filters
   */
  async getAssets(req: Request) {
    try {
      const { searchParams } = new URL(req.url);
      const search = searchParams.get("search") || undefined;
      const categoryId = searchParams.get("categoryId") || undefined;
      const status = searchParams.get("status") || undefined;
      const departmentId = searchParams.get("departmentId") || undefined;

      // Check if dropdowns request
      const dropdowns = searchParams.get("dropdowns") === "true";
      if (dropdowns) {
        const dropData = await assetService.fetchSetupDropdowns();
        return NextResponse.json(dropData, { status: 200 });
      }

      const list = await assetService.fetchAssets(search, categoryId, status, departmentId);
      return NextResponse.json(list, { status: 200 });
    } catch (error: any) {
      console.error("Asset GET Controller Error:", error);
      return NextResponse.json({ message: "Internal server error", details: error.message }, { status: 500 });
    }
  },

  /**
   * Registers a new asset in the system
   */
  async registerAsset(req: Request) {
    try {
      const headerUserId = req.headers.get("x-user-id");
      if (!headerUserId) {
        return NextResponse.json({ message: "Unauthorized: session missing" }, { status: 401 });
      }

      const creatorId = parseInt(headerUserId, 10);
      const data = await req.json();

      const newAsset = await assetService.registerAsset(data, creatorId);
      return NextResponse.json(newAsset, { status: 201 });
    } catch (error: any) {
      console.error("Asset Register Controller Error:", error);
      return NextResponse.json({ message: error.message || "Failed to register asset" }, { status: 400 });
    }
  },

  /**
   * Resolves detailed asset record and audit logs
   */
  async getAssetDetails(req: Request, id: string) {
    try {
      const assetId = parseInt(id, 10);
      if (isNaN(assetId)) {
        return NextResponse.json({ message: "Invalid asset ID" }, { status: 400 });
      }

      const details = await assetService.getAssetDetailsWithHistory(assetId);
      return NextResponse.json(details, { status: 200 });
    } catch (error: any) {
      console.error("Asset Details Controller Error:", error);
      return NextResponse.json({ message: error.message || "Failed to retrieve details" }, { status: 404 });
    }
  }
};

import { NextResponse } from "next/server";
import { reportService } from "../services/reportService";

export const reportController = {
  /**
   * Retrieves dashboard charts parameters and alerts
   */
  async getReportData(req: Request) {
    try {
      const data = await reportService.getUnifiedReportData();
      return NextResponse.json(data, { status: 200 });
    } catch (error: any) {
      console.error("Reports GET Controller Error:", error);
      return NextResponse.json({ message: "Internal server error", details: error.message }, { status: 500 });
    }
  },

  /**
   * Triggers file download export logs
   */
  async triggerExport(req: Request) {
    try {
      const headerUserId = req.headers.get("x-user-id");
      if (!headerUserId) {
        return NextResponse.json({ message: "Unauthorized: session missing" }, { status: 401 });
      }

      const userId = parseInt(headerUserId, 10);
      const data = await req.json();
      const { reportType, format } = data; // reportType: UTILIZATION, IDLE, MAINTENANCE, ALERTS; format: CSV, JSON

      if (!reportType || !format) {
        return NextResponse.json({ message: "reportType and format are required" }, { status: 400 });
      }

      const exportResult = await reportService.generateExport(reportType, format, userId);
      return NextResponse.json(exportResult, { status: 200 });
    } catch (error: any) {
      console.error("Reports Export Controller Error:", error);
      return NextResponse.json({ message: error.message || "Failed to generate export" }, { status: 400 });
    }
  }
};

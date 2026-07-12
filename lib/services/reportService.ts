import { reportQueries } from "../queries/reportQueries";

export const reportService = {
  /**
   * Fetches unified metrics for Dashboard Charts and Alerts Panel
   */
  async getUnifiedReportData() {
    const [deptAlloc, maintFreq, mostUsed, idleList, alerts, heatmap] = await Promise.all([
      reportQueries.getDepartmentAllocations(),
      reportQueries.getMaintenanceAnalysis(),
      reportQueries.getMostUsedAssets(),
      reportQueries.getIdleAssets(),
      reportQueries.getMaintenanceAndRetirementAlerts(),
      reportQueries.getBookingHeatmap()
    ]);

    return {
      departmentUtilization: deptAlloc.rows,
      maintenanceAnalysis: maintFreq.rows,
      mostUsedAssets: mostUsed.rows,
      idleAssets: idleList.rows,
      alerts: alerts.rows,
      bookingHeatmap: heatmap.rows
    };
  },

  /**
   * Generates export string and logs export audits
   */
  async generateExport(reportType: string, format: "CSV" | "JSON", userId: number) {
    const data = await this.getUnifiedReportData();

    // Select export data payload
    let payload: any = [];
    if (reportType === "UTILIZATION") {
      payload = data.mostUsedAssets;
    } else if (reportType === "IDLE") {
      payload = data.idleAssets;
    } else if (reportType === "MAINTENANCE") {
      payload = data.maintenanceAnalysis;
    } else if (reportType === "HEATMAP") {
      payload = data.bookingHeatmap;
    } else {
      payload = data.alerts;
    }

    let fileContent = "";
    if (format === "JSON") {
      fileContent = JSON.stringify(payload, null, 2);
    } else {
      // Format CSV
      if (payload.length > 0) {
        const headers = Object.keys(payload[0]);
        const csvRows = [headers.join(",")];
        for (const row of payload) {
          const values = headers.map(header => {
            const val = row[header];
            return typeof val === "string" ? `"${val.replace(/"/g, '""')}"` : String(val ?? "");
          });
          csvRows.push(values.join(","));
        }
        fileContent = csvRows.join("\n");
      } else {
        fileContent = "No records found";
      }
    }

    // Log export audit
    const fileUrl = `/exports/report_${Date.now()}.${format.toLowerCase()}`;
    await reportQueries.createExportLog(reportType, userId, JSON.stringify({ type: reportType }), format, fileUrl);

    return {
      fileContent,
      filename: `assetflow_${reportType.toLowerCase()}_report.${format.toLowerCase()}`,
      format
    };
  }
};

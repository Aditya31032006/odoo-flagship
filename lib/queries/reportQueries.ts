import { query as defaultQuery } from "../db";

const runQuery = (executor: any, text: string, params?: any[]) => {
  if (typeof executor === "function") {
    return executor(text, params);
  }
  return executor.query(text, params);
};

export const reportQueries = {
  /**
   * Fetches departmental summary for utilization bar charts
   */
  async getDepartmentAllocations(executor: any = defaultQuery) {
    return runQuery(
      executor,
      `SELECT * FROM department_allocation_summary ORDER BY active_allocations DESC`
    );
  },

  /**
   * Fetches maintenance frequency and costs per category/asset
   */
  async getMaintenanceAnalysis(executor: any = defaultQuery) {
    return runQuery(
      executor,
      `SELECT * FROM maintenance_frequency_report ORDER BY total_maintenance_requests DESC LIMIT 10`
    );
  },

  /**
   * Fetches most used assets
   */
  async getMostUsedAssets(executor: any = defaultQuery) {
    return runQuery(
      executor,
      `SELECT * FROM asset_utilization_report 
       ORDER BY (COALESCE(total_allocations, 0) + COALESCE(total_bookings, 0)) DESC 
       LIMIT 5`
    );
  },

  /**
   * Fetches idle assets
   */
  async getIdleAssets(executor: any = defaultQuery) {
    return runQuery(
      executor,
      `SELECT * FROM idle_assets_report 
       WHERE idle_days IS NOT NULL AND idle_days > 0
       ORDER BY idle_days DESC 
       LIMIT 5`
    );
  },

  /**
   * Fetches assets due for maintenance or nearing retirement
   */
  async getMaintenanceAndRetirementAlerts(executor: any = defaultQuery) {
    return runQuery(
      executor,
      `SELECT 
        id, name, asset_tag, current_status,
        next_maintenance_due_date,
        expected_retirement_date,
        acquisition_date,
        (next_maintenance_due_date - CURRENT_DATE) AS maintenance_days_remaining,
        (expected_retirement_date - CURRENT_DATE) AS retirement_days_remaining
       FROM assets
       WHERE (next_maintenance_due_date IS NOT NULL AND next_maintenance_due_date <= CURRENT_DATE + INTERVAL '30 days')
          OR (expected_retirement_date IS NOT NULL AND expected_retirement_date <= CURRENT_DATE + INTERVAL '365 days')
       ORDER BY next_maintenance_due_date ASC, expected_retirement_date ASC
       LIMIT 10`
    );
  },

  /**
   * Logs report export audits
   */
  async createExportLog(
    reportType: string,
    requestedBy: number,
    filters: string,
    fileFormat: string,
    fileUrl: string,
    executor: any = defaultQuery
  ) {
    return runQuery(
      executor,
      `INSERT INTO report_exports (report_type, requested_by, filters, file_format, file_url, generated_at, expires_at)
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '7 days') RETURNING id`,
      [reportType, requestedBy, filters, fileFormat, fileUrl]
    );
  }
};

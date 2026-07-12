import { query as defaultQuery } from "../db";

const runQuery = (executor: any, text: string, params?: any[]) => {
  if (typeof executor === "function") {
    return executor(text, params);
  }
  return executor.query(text, params);
};

export const maintenanceQueries = {
  /**
   * Fetches all maintenance requests with assets & users details
   */
  async getMaintenanceRequests(executor: any = defaultQuery) {
    return runQuery(
      executor,
      `SELECT 
        mr.*,
        a.name AS asset_name,
        a.asset_tag AS asset_tag,
        a.current_status AS asset_current_status,
        u_raised.full_name AS raised_by_name,
        u_tech.full_name AS technician_name
      FROM maintenance_requests mr
      LEFT JOIN assets a ON mr.asset_id = a.id
      LEFT JOIN users u_raised ON mr.raised_by = u_raised.id
      LEFT JOIN users u_tech ON mr.assigned_technician_id = u_tech.id
      ORDER BY mr.created_at DESC`
    );
  },

  /**
   * Resolves the next auto sequence ID for MR number
   */
  async getNextMRSequence(executor: any = defaultQuery) {
    return runQuery(executor, `SELECT COALESCE(MAX(id), 0) + 1 AS next_val FROM maintenance_requests`);
  },

  /**
   * Inserts maintenance request
   */
  async createRequest(
    requestNumber: string,
    assetId: number,
    raisedBy: number,
    issueTitle: string,
    issueDescription: string,
    priority: string,
    requestedServiceDate: string | null,
    issuePhoto: string | null = null,
    executor: any = defaultQuery
  ) {
    return runQuery(
      executor,
      `INSERT INTO maintenance_requests (
        request_number, asset_id, raised_by, issue_title, issue_description, priority, 
        status, requested_service_date, issue_photo, raised_at
      ) VALUES ($1, $2, $3, $4, $5, $6, 'PENDING', $7, $8, CURRENT_TIMESTAMP) RETURNING id`,
      [requestNumber, assetId, raisedBy, issueTitle, issueDescription, priority, requestedServiceDate, issuePhoto]
    );
  },

  /**
   * Approves a maintenance request
   */
  async approveRequest(id: number, approvedBy: number, executor: any = defaultQuery) {
    return runQuery(
      executor,
      `UPDATE maintenance_requests 
       SET status = 'APPROVED', 
           approved_by = $2, 
           approved_at = CURRENT_TIMESTAMP, 
           updated_at = CURRENT_TIMESTAMP 
       WHERE id = $1`,
      [id, approvedBy]
    );
  },

  /**
   * Rejects a maintenance request
   */
  async rejectRequest(id: number, rejectedBy: number, reason: string, executor: any = defaultQuery) {
    return runQuery(
      executor,
      `UPDATE maintenance_requests 
       SET status = 'REJECTED', 
           rejected_by = $2, 
           rejected_at = CURRENT_TIMESTAMP, 
           rejection_reason = $3, 
           updated_at = CURRENT_TIMESTAMP 
       WHERE id = $1`,
      [id, rejectedBy, reason]
    );
  },

  /**
   * Assigns technician to request
   */
  async assignTechnician(
    id: number,
    technicianId: number,
    assignedBy: number,
    executor: any = defaultQuery
  ) {
    return runQuery(
      executor,
      `UPDATE maintenance_requests 
       SET status = 'TECHNICIAN_ASSIGNED', 
           assigned_technician_id = $2, 
           assigned_by = $3, 
           assigned_at = CURRENT_TIMESTAMP, 
           updated_at = CURRENT_TIMESTAMP 
       WHERE id = $1`,
      [id, technicianId, assignedBy]
    );
  },

  /**
   * Changes status to In Progress
   */
  async startWork(id: number, executor: any = defaultQuery) {
    return runQuery(
      executor,
      `UPDATE maintenance_requests 
       SET status = 'IN_PROGRESS', 
           started_at = CURRENT_TIMESTAMP, 
           updated_at = CURRENT_TIMESTAMP 
       WHERE id = $1`,
      [id]
    );
  },

  /**
   * Resolves request, logging work details
   */
  async resolveRequest(
    id: number,
    notes: string,
    workPerformed: string,
    cost: number,
    conditionAfter: string,
    nextDueDate: string | null,
    executor: any = defaultQuery
  ) {
    return runQuery(
      executor,
      `UPDATE maintenance_requests 
       SET status = 'RESOLVED', 
           resolved_at = CURRENT_TIMESTAMP, 
           resolution_notes = $2, 
           work_performed = $3, 
           maintenance_cost = $4, 
           condition_after = $5, 
           next_maintenance_due_date = $6, 
           updated_at = CURRENT_TIMESTAMP 
       WHERE id = $1`,
      [id, notes, workPerformed, cost, conditionAfter, nextDueDate]
    );
  },

  /**
   * Updates core asset status
   */
  async updateAssetStatus(assetId: number, status: string, executor: any = defaultQuery) {
    return runQuery(
      executor,
      `UPDATE assets SET current_status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [status, assetId]
    );
  },

  /**
   * Logs lifecycle status change
   */
  async createAssetStatusHistory(
    assetId: number,
    fromStatus: string,
    toStatus: string,
    notes: string,
    changedBy: number,
    executor: any = defaultQuery
  ) {
    return runQuery(
      executor,
      `INSERT INTO asset_status_history (asset_id, previous_status, new_status, reason, changed_by)
       VALUES ($1, $2, $3, $4, $5)`,
      [assetId, fromStatus, toStatus, notes, changedBy]
    );
  }
};

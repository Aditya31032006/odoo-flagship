import { query as defaultQuery } from "../db";

const runQuery = (executor: any, text: string, params?: any[]) => {
  if (typeof executor === "function") {
    return executor(text, params);
  }
  return executor.query(text, params);
};

export const allocationQueries = {
  /**
   * Fetches active allocation record for an asset (if any)
   */
  async getActiveAllocationForAsset(assetId: number, executor: any = defaultQuery) {
    return runQuery(
      executor,
      `SELECT aa.*, u.full_name AS employee_name, d.name AS department_name
       FROM asset_allocations aa
       LEFT JOIN users u ON aa.employee_id = u.id
       LEFT JOIN departments d ON aa.department_id = d.id
       WHERE aa.asset_id = $1 
         AND aa.status IN ('ACTIVE', 'RETURN_REQUESTED', 'TRANSFER_REQUESTED')
       LIMIT 1`,
      [assetId]
    );
  },

  /**
   * Performs the allocation db write
   */
  async allocateAsset(
    assetId: number,
    employeeId: number | null,
    departmentId: number | null,
    allocatedAt: string,
    expectedReturnDate: string | null,
    checkoutCondition: string,
    notes: string,
    allocatedBy: number,
    executor: any = defaultQuery
  ) {
    return runQuery(
      executor,
      `INSERT INTO asset_allocations (
        asset_id, employee_id, department_id, allocated_at, expected_return_date,
        checkout_condition, notes, allocated_by, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'ACTIVE') RETURNING id`,
      [assetId, employeeId, departmentId, allocatedAt, expectedReturnDate, checkoutCondition, notes, allocatedBy]
    );
  },

  /**
   * Updates asset status in assets table
   */
  async updateAssetStatus(assetId: number, status: string, executor: any = defaultQuery) {
    return runQuery(
      executor,
      `UPDATE assets SET current_status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [status, assetId]
    );
  },

  /**
   * Logs status change in asset_status_history
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
      `INSERT INTO asset_status_history (asset_id, from_status, to_status, notes, changed_by)
       VALUES ($1, $2, $3, $4, $5)`,
      [assetId, fromStatus, toStatus, notes, changedBy]
    );
  },

  /**
   * Creates a new transfer request record
   */
  async createTransferRequest(
    allocationId: number,
    fromEmployeeId: number | null,
    fromDepartmentId: number | null,
    toEmployeeId: number | null,
    toDepartmentId: number | null,
    reason: string,
    requestedBy: number,
    executor: any = defaultQuery
  ) {
    return runQuery(
      executor,
      `INSERT INTO asset_transfer_requests (
        allocation_id, from_employee_id, from_department_id, to_employee_id, to_department_id,
        reason, requested_by, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'REQUESTED') RETURNING id`,
      [allocationId, fromEmployeeId, fromDepartmentId, toEmployeeId, toDepartmentId, reason, requestedBy]
    );
  },

  /**
   * Fetches history of allocations for an asset
   */
  async getAssetAllocationHistory(assetId: number, executor: any = defaultQuery) {
    return runQuery(
      executor,
      `SELECT aa.*, u.full_name AS employee_name, d.name AS department_name
       FROM asset_allocations aa
       LEFT JOIN users u ON aa.employee_id = u.id
       LEFT JOIN departments d ON aa.department_id = d.id
       WHERE aa.asset_id = $1
       ORDER BY aa.allocated_at DESC`,
      [assetId]
    );
  }
};

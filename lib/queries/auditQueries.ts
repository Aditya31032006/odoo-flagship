import { query as defaultQuery } from "../db";

const runQuery = (executor: any, text: string, params?: any[]) => {
  if (typeof executor === "function") {
    return executor(text, params);
  }
  return executor.query(text, params);
};

export const auditQueries = {
  /**
   * Fetches all audit cycles
   */
  async getAuditCycles(executor: any = defaultQuery) {
    return runQuery(
      executor,
      `SELECT ac.*, u.full_name AS created_by_name
       FROM audit_cycles ac
       LEFT JOIN users u ON ac.created_by = u.id
       ORDER BY ac.created_at DESC`
    );
  },

  /**
   * Fetches detailed audit cycle parameters
   */
  async getAuditCycle(cycleId: number, executor: any = defaultQuery) {
    return runQuery(executor, `SELECT * FROM audit_cycles WHERE id = $1`, [cycleId]);
  },

  /**
   * Fetches auditors assigned to a cycle
   */
  async getCycleAuditors(cycleId: number, executor: any = defaultQuery) {
    return runQuery(
      executor,
      `SELECT aca.*, u.full_name AS auditor_name
       FROM audit_cycle_auditors aca
       LEFT JOIN users u ON aca.auditor_id = u.id
       WHERE aca.audit_cycle_id = $1`,
      [cycleId]
    );
  },

  /**
   * Fetches checklist items for a cycle
   */
  async getCycleItems(cycleId: number, executor: any = defaultQuery) {
    return runQuery(
      executor,
      `SELECT 
        ai.*,
        a.name AS asset_name,
        a.asset_tag AS asset_tag,
        l.name AS expected_location_name,
        u.full_name AS assigned_auditor_name
      FROM audit_items ai
      LEFT JOIN assets a ON ai.asset_id = a.id
      LEFT JOIN locations l ON ai.expected_location_id = l.id
      LEFT JOIN users u ON ai.assigned_auditor_id = u.id
      WHERE ai.audit_cycle_id = $1
      ORDER BY a.asset_tag ASC`,
      [cycleId]
    );
  },

  /**
   * Resolves next cycle auto increment sequence MR number
   */
  async getNextAuditSequence(executor: any = defaultQuery) {
    return runQuery(executor, `SELECT COALESCE(MAX(id), 0) + 1 AS next_val FROM audit_cycles`);
  },

  /**
   * Creates audit cycle record
   */
  async createAuditCycle(
    auditNumber: string,
    title: string,
    description: string,
    scopeType: string,
    departmentId: number | null,
    locationId: number | null,
    categoryId: number | null,
    startDate: string,
    endDate: string,
    createdBy: number,
    executor: any = defaultQuery
  ) {
    return runQuery(
      executor,
      `INSERT INTO audit_cycles (
        audit_number, title, description, scope_type, department_id, location_id, category_id,
        start_date, end_date, status, created_by, total_assets, verified_assets, missing_assets,
        damaged_assets, pending_assets
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, 'ACTIVE', $10, 0, 0, 0, 0, 0
      ) RETURNING id`,
      [
        auditNumber,
        title,
        description,
        scopeType,
        departmentId,
        locationId,
        categoryId,
        startDate,
        endDate,
        createdBy
      ]
    );
  },

  /**
   * Assigns auditor to cycle
   */
  async createCycleAuditor(
    cycleId: number,
    auditorId: number,
    assignedBy: number,
    isLead: boolean,
    executor: any = defaultQuery
  ) {
    return runQuery(
      executor,
      `INSERT INTO audit_cycle_auditors (audit_cycle_id, auditor_id, assigned_by, assigned_at, is_lead_auditor)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP, $4)`,
      [cycleId, auditorId, assignedBy, isLead]
    );
  },

  /**
   * Populates checklist items matching scope
   */
  async populateCycleItems(
    cycleId: number,
    scopeType: string,
    departmentId: number | null,
    locationId: number | null,
    categoryId: number | null,
    auditorId: number,
    executor: any = defaultQuery
  ) {
    let sql = `
      SELECT id, location_id, department_id, current_condition
      FROM assets
      WHERE current_status NOT IN ('LOST', 'RETIRED', 'DISPOSED')
    `;
    const params: any[] = [];

    if (scopeType === "DEPARTMENT" && departmentId) {
      params.push(departmentId);
      sql += ` AND department_id = $${params.length}`;
    } else if (scopeType === "LOCATION" && locationId) {
      params.push(locationId);
      sql += ` AND location_id = $${params.length}`;
    } else if (scopeType === "CATEGORY" && categoryId) {
      params.push(categoryId);
      sql += ` AND category_id = $${params.length}`;
    }

    const assetsRes = await runQuery(executor, sql, params);

    for (const asset of assetsRes.rows) {
      await runQuery(
        executor,
        `INSERT INTO audit_items (
          audit_cycle_id, asset_id, assigned_auditor_id, verification_status,
          expected_location_id, expected_department_id, expected_condition
        ) VALUES ($1, $2, $3, 'PENDING', $4, $5, $6)`,
        [cycleId, asset.id, auditorId, asset.location_id, asset.department_id, asset.current_condition || "GOOD"]
      );
    }

    // Update cycle count totals
    await runQuery(
      executor,
      `UPDATE audit_cycles 
       SET total_assets = $2, pending_assets = $2 
       WHERE id = $1`,
      [cycleId, assetsRes.rows.length]
    );
  },

  /**
   * Updates verification status
   */
  async verifyItem(
    itemId: number,
    status: string,
    notes: string,
    verifiedBy: number,
    executor: any = defaultQuery
  ) {
    return runQuery(
      executor,
      `UPDATE audit_items 
       SET verification_status = $2, 
           verification_notes = $3, 
           verified_by = $4, 
           verified_at = CURRENT_TIMESTAMP 
       WHERE id = $1`,
      [itemId, status, notes, verifiedBy]
    );
  },

  /**
   * Creates audit discrepancy
   */
  async createDiscrepancy(
    cycleId: number,
    itemId: number,
    assetId: number,
    discrepancyType: string,
    description: string,
    reportedBy: number,
    executor: any = defaultQuery
  ) {
    // Delete any existing discrepancies for this item first to avoid double entries
    await runQuery(executor, `DELETE FROM audit_discrepancies WHERE audit_item_id = $1`, [itemId]);

    return runQuery(
      executor,
      `INSERT INTO audit_discrepancies (
        audit_cycle_id, audit_item_id, asset_id, discrepancy_type, description, status, reported_by, reported_at
      ) VALUES ($1, $2, $3, $4, $5, 'OPEN', $6, CURRENT_TIMESTAMP)`,
      [cycleId, itemId, assetId, discrepancyType, description, reportedBy]
    );
  },

  /**
   * Deletes discrepancy if status resolved back to verified
   */
  async removeDiscrepancy(itemId: number, executor: any = defaultQuery) {
    return runQuery(executor, `DELETE FROM audit_discrepancies WHERE audit_item_id = $1`, [itemId]);
  },

  /**
   * Resolves discrepancy
   */
  async resolveDiscrepancy(
    id: number,
    resolution: string,
    notes: string,
    resolvedBy: number,
    executor: any = defaultQuery
  ) {
    return runQuery(
      executor,
      `UPDATE audit_discrepancies 
       SET resolution = $2, 
           resolution_notes = $3, 
           status = 'RESOLVED',
           resolved_by = $4, 
           resolved_at = CURRENT_TIMESTAMP, 
           updated_at = CURRENT_TIMESTAMP 
       WHERE id = $1`,
      [id, resolution, notes, resolvedBy]
    );
  },

  /**
   * Closes audit cycle
   */
  async closeCycle(cycleId: number, notes: string, closedBy: number, executor: any = defaultQuery) {
    return runQuery(
      executor,
      `UPDATE audit_cycles 
       SET status = 'CLOSED', 
           closed_by = $2, 
           closed_at = CURRENT_TIMESTAMP, 
           closure_notes = $3, 
           updated_at = CURRENT_TIMESTAMP 
       WHERE id = $1`,
      [cycleId, closedBy, notes]
    );
  },

  /**
   * Recalculates metrics for a cycle
   */
  async recalculateCycleMetrics(cycleId: number, executor: any = defaultQuery) {
    const verifiedRes = await runQuery(executor, `SELECT COUNT(*) AS val FROM audit_items WHERE audit_cycle_id = $1 AND verification_status = 'VERIFIED'`, [cycleId]);
    const missingRes = await runQuery(executor, `SELECT COUNT(*) AS val FROM audit_items WHERE audit_cycle_id = $1 AND verification_status = 'MISSING'`, [cycleId]);
    const damagedRes = await runQuery(executor, `SELECT COUNT(*) AS val FROM audit_items WHERE audit_cycle_id = $1 AND verification_status = 'DAMAGED'`, [cycleId]);
    const pendingRes = await runQuery(executor, `SELECT COUNT(*) AS val FROM audit_items WHERE audit_cycle_id = $1 AND verification_status = 'PENDING'`, [cycleId]);

    await runQuery(
      executor,
      `UPDATE audit_cycles 
       SET verified_assets = $2, 
           missing_assets = $3, 
           damaged_assets = $4, 
           pending_assets = $5 
       WHERE id = $1`,
      [
        cycleId,
        parseInt(verifiedRes.rows[0].val, 10),
        parseInt(missingRes.rows[0].val, 10),
        parseInt(damagedRes.rows[0].val, 10),
        parseInt(pendingRes.rows[0].val, 10)
      ]
    );
  },

  /**
   * Updates core asset status in directory
   */
  async updateAssetStatus(assetId: number, status: string, executor: any = defaultQuery) {
    return runQuery(
      executor,
      `UPDATE assets SET current_status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [status, assetId]
    );
  }
};

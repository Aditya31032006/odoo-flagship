import { maintenanceQueries } from "../queries/maintenanceQueries";
import { query as defaultQuery } from "../db";

export const maintenanceService = {
  /**
   * Fetches requests and resolves columns grouping for Kanban board
   */
  async getKanbanRequests() {
    const res = await maintenanceQueries.getMaintenanceRequests();
    return res.rows;
  },

  /**
   * Raises a new maintenance issue report
   */
  async raiseRequest(
    data: {
      assetId: string;
      issueTitle: string;
      issueDescription: string;
      priority: string;
      requestedServiceDate: string;
    },
    raisedByUserId: number
  ) {
    const assetIdNum = parseInt(data.assetId, 10);

    await defaultQuery("BEGIN");

    try {
      // 1. Resolve sequence number
      const seqRes = await maintenanceQueries.getNextMRSequence();
      const nextSeq = parseInt(seqRes.rows[0].next_val, 10);
      const requestNumber = `MR-${String(nextSeq).padStart(4, "0")}`;

      // 2. Insert maintenance request
      const requestRes = await maintenanceQueries.createRequest(
        requestNumber,
        assetIdNum,
        raisedByUserId,
        data.issueTitle,
        data.issueDescription,
        data.priority || "MEDIUM",
        data.requestedServiceDate || null
      );

      // 3. Create activity log
      await defaultQuery(
        `INSERT INTO activity_logs (actor_user_id, action, entity_type, entity_id, description)
         VALUES ($1, 'MAINTENANCE_REQUEST', 'ASSET', $2, $3)`,
        [raisedByUserId, assetIdNum, `Maintenance request ${requestNumber} raised: ${data.issueTitle}`]
      );

      await defaultQuery("COMMIT");
      return { success: true, requestNumber, id: requestRes.rows[0].id };
    } catch (error) {
      await defaultQuery("ROLLBACK");
      throw error;
    }
  },

  /**
   * Transition stage: Approve
   */
  async approveRequest(id: number, approvedByUserId: number) {
    await defaultQuery("BEGIN");
    try {
      const requestRes = await defaultQuery(
        "SELECT asset_id, status FROM maintenance_requests WHERE id = $1",
        [id]
      );
      if (requestRes.rows.length === 0) throw new Error("Request not found");
      const req = requestRes.rows[0];

      if (req.status !== "PENDING") {
        throw new Error("Request is not in PENDING state.");
      }

      // Approve request
      await maintenanceQueries.approveRequest(id, approvedByUserId);

      // Update asset status to UNDER_MAINTENANCE
      await maintenanceQueries.updateAssetStatus(req.asset_id, "UNDER_MAINTENANCE");

      // Log status history
      await maintenanceQueries.createAssetStatusHistory(
        req.asset_id,
        "AVAILABLE", // from status
        "UNDER_MAINTENANCE", // to status
        "Approved for service repairs",
        approvedByUserId
      );

      // Create activity log
      await defaultQuery(
        `INSERT INTO activity_logs (actor_user_id, action, entity_type, entity_id, description)
         VALUES ($1, 'MAINTENANCE_APPROVE', 'ASSET', $2, $3)`,
        [approvedByUserId, req.asset_id, `Maintenance request approved`]
      );

      await defaultQuery("COMMIT");
      return { success: true };
    } catch (error) {
      await defaultQuery("ROLLBACK");
      throw error;
    }
  },

  /**
   * Transition stage: Reject
   */
  async rejectRequest(id: number, rejectedByUserId: number, reason: string) {
    await defaultQuery("BEGIN");
    try {
      const requestRes = await defaultQuery("SELECT asset_id, status FROM maintenance_requests WHERE id = $1", [id]);
      if (requestRes.rows.length === 0) throw new Error("Request not found");
      const req = requestRes.rows[0];

      if (req.status !== "PENDING") {
        throw new Error("Request is not in PENDING state.");
      }

      await maintenanceQueries.rejectRequest(id, rejectedByUserId, reason);

      await defaultQuery("COMMIT");
      return { success: true };
    } catch (error) {
      await defaultQuery("ROLLBACK");
      throw error;
    }
  },

  /**
   * Transition stage: Assign Technician
   */
  async assignTechnician(id: number, technicianId: number, assignedByUserId: number) {
    await defaultQuery("BEGIN");
    try {
      const requestRes = await defaultQuery("SELECT status FROM maintenance_requests WHERE id = $1", [id]);
      if (requestRes.rows.length === 0) throw new Error("Request not found");
      const req = requestRes.rows[0];

      if (req.status !== "APPROVED") {
        throw new Error("Request must be in APPROVED state to assign a technician.");
      }

      await maintenanceQueries.assignTechnician(id, technicianId, assignedByUserId);

      await defaultQuery("COMMIT");
      return { success: true };
    } catch (error) {
      await defaultQuery("ROLLBACK");
      throw error;
    }
  },

  /**
   * Transition stage: Start work
   */
  async startWork(id: number) {
    await defaultQuery("BEGIN");
    try {
      const requestRes = await defaultQuery("SELECT status FROM maintenance_requests WHERE id = $1", [id]);
      if (requestRes.rows.length === 0) throw new Error("Request not found");
      const req = requestRes.rows[0];

      if (req.status !== "TECHNICIAN_ASSIGNED") {
        throw new Error("Request must have a technician assigned to begin repair work.");
      }

      await maintenanceQueries.startWork(id);

      await defaultQuery("COMMIT");
      return { success: true };
    } catch (error) {
      await defaultQuery("ROLLBACK");
      throw error;
    }
  },

  /**
   * Transition stage: Resolve
   */
  async resolveRequest(
    id: number,
    data: {
      notes: string;
      workPerformed: string;
      cost: string;
      conditionAfter: string;
      nextDueDate?: string;
    },
    resolvedByUserId: number
  ) {
    await defaultQuery("BEGIN");
    try {
      const requestRes = await defaultQuery(
        "SELECT asset_id, status FROM maintenance_requests WHERE id = $1",
        [id]
      );
      if (requestRes.rows.length === 0) throw new Error("Request not found");
      const req = requestRes.rows[0];

      if (req.status !== "IN_PROGRESS") {
        throw new Error("Request must be IN_PROGRESS to resolve repairs.");
      }

      const costNum = parseFloat(data.cost) || 0;

      // Update maintenance request status to RESOLVED
      await maintenanceQueries.resolveRequest(
        id,
        data.notes,
        data.workPerformed,
        costNum,
        data.conditionAfter || "GOOD",
        data.nextDueDate || null
      );

      // Update core asset status back to AVAILABLE
      await maintenanceQueries.updateAssetStatus(req.asset_id, "AVAILABLE");

      // Log status history
      await maintenanceQueries.createAssetStatusHistory(
        req.asset_id,
        "UNDER_MAINTENANCE", // from status
        "AVAILABLE", // to status
        "Repairs completed successfully",
        resolvedByUserId
      );

      // Create activity log
      await defaultQuery(
        `INSERT INTO activity_logs (actor_user_id, action, entity_type, entity_id, description)
         VALUES ($1, 'MAINTENANCE_RESOLVED', 'ASSET', $2, $3)`,
        [resolvedByUserId, req.asset_id, `Maintenance request resolved`]
      );

      await defaultQuery("COMMIT");
      return { success: true };
    } catch (error) {
      await defaultQuery("ROLLBACK");
      throw error;
    }
  }
};

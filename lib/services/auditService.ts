import { auditQueries } from "../queries/auditQueries";
import { query as defaultQuery } from "../db";

export const auditService = {
  /**
   * Fetches cycles list
   */
  async fetchCycles() {
    const res = await auditQueries.getAuditCycles();
    return res.rows;
  },

  /**
   * Fetches details of a cycle, auditors list, and verification items checklist
   */
  async fetchCycleDetails(cycleId: number) {
    const [cycleRes, auditorsRes, itemsRes, discrepanciesRes] = await Promise.all([
      auditQueries.getAuditCycle(cycleId),
      auditQueries.getCycleAuditors(cycleId),
      auditQueries.getCycleItems(cycleId),
      defaultQuery(
        `SELECT ad.*, a.asset_tag, a.name AS asset_name 
         FROM audit_discrepancies ad
         LEFT JOIN assets a ON ad.asset_id = a.id
         WHERE ad.audit_cycle_id = $1`,
        [cycleId]
      )
    ]);

    if (cycleRes.rows.length === 0) throw new Error("Audit cycle not found.");

    return {
      cycle: cycleRes.rows[0],
      auditors: auditorsRes.rows,
      items: itemsRes.rows,
      discrepancies: discrepanciesRes.rows
    };
  },

  /**
   * Creates new audit cycle and populates checklist
   */
  async createCycle(
    data: {
      title: string;
      description?: string;
      scopeType: "ORGANIZATION" | "DEPARTMENT" | "LOCATION" | "CATEGORY";
      departmentId?: string;
      locationId?: string;
      categoryId?: string;
      startDate: string;
      endDate: string;
      auditorIds: string[]; // user IDs assigned as auditors
    },
    createdByUserId: number
  ) {
    await defaultQuery("BEGIN");

    try {
      // 1. Resolve sequence number
      const seqRes = await auditQueries.getNextAuditSequence();
      const nextSeq = parseInt(seqRes.rows[0].next_val, 10);
      const auditNumber = `AC-${String(nextSeq).padStart(4, "0")}`;

      // 2. Create base cycle
      const deptId = data.departmentId ? parseInt(data.departmentId, 10) : null;
      const locId = data.locationId ? parseInt(data.locationId, 10) : null;
      const catId = data.categoryId ? parseInt(data.categoryId, 10) : null;

      const cycleRes = await auditQueries.createAuditCycle(
        auditNumber,
        data.title,
        data.description || "",
        data.scopeType,
        deptId,
        locId,
        catId,
        data.startDate,
        data.endDate,
        createdByUserId
      );

      const cycleId = cycleRes.rows[0].id;

      // 3. Assign auditors
      if (data.auditorIds && data.auditorIds.length > 0) {
        for (let i = 0; i < data.auditorIds.length; i++) {
          const isLead = i === 0; // First auditor is default lead
          await auditQueries.createCycleAuditor(
            cycleId,
            parseInt(data.auditorIds[i], 10),
            createdByUserId,
            isLead
          );
        }
      }

      // 4. Populate checklist items matching scope
      // Default to lead auditor if list exists, otherwise creator
      const primaryAuditor = data.auditorIds.length > 0 ? parseInt(data.auditorIds[0], 10) : createdByUserId;
      await auditQueries.populateCycleItems(
        cycleId,
        data.scopeType,
        deptId,
        locId,
        catId,
        primaryAuditor
      );

      await defaultQuery("COMMIT");
      return { success: true, cycleId, auditNumber };
    } catch (error) {
      await defaultQuery("ROLLBACK");
      throw error;
    }
  },

  /**
   * Performs verify item check (registers discrepancies for damaged or missing assets)
   * and IMMEDIATELY syncs the asset's current_status in the asset directory.
   */
  async verifyItem(
    data: {
      itemId: string;
      status: "VERIFIED" | "MISSING" | "DAMAGED" | "NOT_ACCESSIBLE";
      notes?: string;
    },
    verifiedByUserId: number
  ) {
    const itemIdNum = parseInt(data.itemId, 10);

    await defaultQuery("BEGIN");

    try {
      // 1. Fetch item details (including the asset_id and cycle id)
      const itemRes = await defaultQuery("SELECT * FROM audit_items WHERE id = $1", [itemIdNum]);
      if (itemRes.rows.length === 0) throw new Error("Checklist item not found.");
      const item = itemRes.rows[0];

      // 2. Update audit_items verification record
      await auditQueries.verifyItem(itemIdNum, data.status, data.notes || "", verifiedByUserId);

      // 3. Manage discrepancy log
      if (data.status === "VERIFIED") {
        // Clear any existing discrepancy for this item
        await auditQueries.removeDiscrepancy(itemIdNum);

        // Revert asset to AVAILABLE (only if not already ALLOCATED to someone)
        const assetCheck = await defaultQuery(
          `SELECT current_status FROM assets WHERE id = $1`,
          [item.asset_id]
        );
        const currentStatus = assetCheck.rows[0]?.current_status;
        // Only restore to AVAILABLE if it was previously locked by audit (LOST or UNDER_MAINTENANCE)
        // but NOT if it is already ALLOCATED (someone may have checked it out)
        if (currentStatus === "LOST" || currentStatus === "UNDER_MAINTENANCE") {
          await auditQueries.updateAssetStatus(item.asset_id, "AVAILABLE");
          await defaultQuery(
            `INSERT INTO asset_status_history (asset_id, previous_status, new_status, reason, changed_by)
             VALUES ($1, $2, 'AVAILABLE', $3, $4)`,
            [item.asset_id, currentStatus, "Asset re-verified as OK in audit — status restored", verifiedByUserId]
          );
        }
      } else {
        // MISSING, DAMAGED, NOT_ACCESSIBLE → flag asset in directory immediately
        const typeStr = data.status;
        const description = data.notes || `Asset reported as ${data.status.toLowerCase()} during audit cycle.`;

        await auditQueries.createDiscrepancy(
          item.audit_cycle_id,
          itemIdNum,
          item.asset_id,
          typeStr,
          description,
          verifiedByUserId
        );

        // ── IMMEDIATE ASSET STATUS LOCK ──────────────────────────────
        // Fetch current asset status before overwriting
        const assetBefore = await defaultQuery(
          `SELECT current_status FROM assets WHERE id = $1`,
          [item.asset_id]
        );
        const prevStatus = assetBefore.rows[0]?.current_status || "AVAILABLE";

        let newAssetStatus: string;
        if (data.status === "MISSING" || data.status === "NOT_ACCESSIBLE") {
          newAssetStatus = "LOST";
        } else {
          // DAMAGED
          newAssetStatus = "UNDER_MAINTENANCE";
        }

        await auditQueries.updateAssetStatus(item.asset_id, newAssetStatus);

        // Log the status change in asset history
        await defaultQuery(
          `INSERT INTO asset_status_history (asset_id, previous_status, new_status, reason, changed_by)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            item.asset_id,
            prevStatus,
            newAssetStatus,
            `Asset flagged as ${data.status} during audit (${data.notes || "no notes"})`,
            verifiedByUserId
          ]
        );
      }

      // 4. Recalculate cycle metrics
      await auditQueries.recalculateCycleMetrics(item.audit_cycle_id);

      await defaultQuery("COMMIT");
      return { success: true };
    } catch (error) {
      await defaultQuery("ROLLBACK");
      throw error;
    }
  },

  /**
   * Resolves discrepancy
   */
  async resolveDiscrepancy(
    data: {
      discrepancyId: string;
      resolution: "MARK_AS_LOST" | "SEND_TO_MAINTENANCE" | "RELOCATE_ASSET" | "CORRECT_RECORD" | "NO_ACTION";
      notes: string;
    },
    resolvedByUserId: number
  ) {
    const discIdNum = parseInt(data.discrepancyId, 10);
    await defaultQuery("BEGIN");

    try {
      await auditQueries.resolveDiscrepancy(discIdNum, data.resolution, data.notes, resolvedByUserId);
      await defaultQuery("COMMIT");
      return { success: true };
    } catch (error) {
      await defaultQuery("ROLLBACK");
      throw error;
    }
  },

  /**
   * Closes audit cycle, syncing asset directory statuses based on final resolutions
   */
  async closeCycle(cycleId: number, notes: string, closedByUserId: number) {
    await defaultQuery("BEGIN");

    try {
      // 1. Fetch discrepancy resolutions inside this cycle to synchronize asset directory statuses
      const discrepanciesRes = await defaultQuery(
        `SELECT * FROM audit_discrepancies WHERE audit_cycle_id = $1`,
        [cycleId]
      );

      for (const disc of discrepanciesRes.rows) {
        // Sync directory statuses
        if (disc.resolution === "MARKED_LOST" || disc.discrepancy_type === "MISSING") {
          await auditQueries.updateAssetStatus(disc.asset_id, "LOST");
        } else if (disc.resolution === "SENT_TO_MAINTENANCE" || disc.discrepancy_type === "DAMAGED") {
          await auditQueries.updateAssetStatus(disc.asset_id, "UNDER_MAINTENANCE");
        }
      }

      // 2. Perform close cycle
      await auditQueries.closeCycle(cycleId, notes, closedByUserId);

      await defaultQuery("COMMIT");
      return { success: true };
    } catch (error) {
      await defaultQuery("ROLLBACK");
      throw error;
    }
  }
};

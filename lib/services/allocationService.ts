import { allocationQueries } from "../queries/allocationQueries";
import { query as defaultQuery } from "../db";

export const allocationService = {
  /**
   * Checks current allocation and fetches history list for an asset
   */
  async checkAssetAllocation(assetId: number) {
    const [activeRes, historyRes] = await Promise.all([
      allocationQueries.getActiveAllocationForAsset(assetId),
      allocationQueries.getAssetAllocationHistory(assetId)
    ]);

    return {
      activeAllocation: activeRes.rows[0] || null,
      history: historyRes.rows
    };
  },

  /**
   * Allocates an available asset to a user or department
   */
  async allocateAsset(
    data: {
      assetId: string;
      employeeId?: string;
      departmentId?: string;
      allocatedAt: string;
      expectedReturnDate?: string;
      checkoutCondition: string;
      notes?: string;
    },
    allocatedByUserId: number
  ) {
    const assetIdNum = parseInt(data.assetId, 10);
    const empIdNum = data.employeeId ? parseInt(data.employeeId, 10) : null;
    const deptIdNum = data.departmentId ? parseInt(data.departmentId, 10) : null;

    if (!empIdNum && !deptIdNum) {
      throw new Error("Must assign to either an employee or a department.");
    }

    await defaultQuery("BEGIN");

    try {
      // 1. Verify not already allocated
      const activeCheck = await allocationQueries.getActiveAllocationForAsset(assetIdNum);
      if (activeCheck.rows.length > 0) {
        throw new Error("This asset is already allocated to another holder.");
      }

      // 2. Perform allocation insert
      await allocationQueries.allocateAsset(
        assetIdNum,
        empIdNum,
        deptIdNum,
        data.allocatedAt || new Date().toISOString(),
        data.expectedReturnDate || null,
        data.checkoutCondition || "GOOD",
        data.notes || "",
        allocatedByUserId
      );

      // 3. Update asset status to ALLOCATED
      await allocationQueries.updateAssetStatus(assetIdNum, "ALLOCATED");

      // 4. Log lifecycle status change
      await allocationQueries.createAssetStatusHistory(
        assetIdNum,
        "AVAILABLE",
        "ALLOCATED",
        data.notes || "Asset checked out",
        allocatedByUserId
      );

      // 5. Add activity log
      await defaultQuery(
        `INSERT INTO activity_logs (actor_user_id, action, entity_type, entity_id, description)
         VALUES ($1, 'ALLOCATE', 'ASSET', $2, $3)`,
        [allocatedByUserId, assetIdNum, `Asset allocated to ${empIdNum ? "employee" : "department"}`]
      );

      await defaultQuery("COMMIT");
      return { success: true };
    } catch (error) {
      await defaultQuery("ROLLBACK");
      throw error;
    }
  },

  /**
   * Creates a transfer request for an allocated asset
   */
  async createTransferRequest(
    data: {
      assetId: string;
      toEmployeeId?: string;
      toDepartmentId?: string;
      reason: string;
    },
    requestedByUserId: number
  ) {
    const assetIdNum = parseInt(data.assetId, 10);
    const toEmpIdNum = data.toEmployeeId ? parseInt(data.toEmployeeId, 10) : null;
    const toDeptIdNum = data.toDepartmentId ? parseInt(data.toDepartmentId, 10) : null;

    if (!toEmpIdNum && !toDeptIdNum) {
      throw new Error("Must specify target employee or department for transfer.");
    }

    await defaultQuery("BEGIN");

    try {
      // 1. Fetch active allocation to find current holder
      const activeCheck = await allocationQueries.getActiveAllocationForAsset(assetIdNum);
      if (activeCheck.rows.length === 0) {
        throw new Error("This asset is not currently allocated and cannot be transferred.");
      }

      const activeAlloc = activeCheck.rows[0];

      // 2. Insert transfer request
      await allocationQueries.createTransferRequest(
        parseInt(activeAlloc.id, 10),
        activeAlloc.employee_id,
        activeAlloc.department_id,
        toEmpIdNum,
        toDeptIdNum,
        data.reason,
        requestedByUserId
      );

      // 3. Add activity log
      await defaultQuery(
        `INSERT INTO activity_logs (actor_user_id, action, entity_type, entity_id, description)
         VALUES ($1, 'TRANSFER_REQUEST', 'ASSET', $2, $3)`,
        [requestedByUserId, assetIdNum, `Asset transfer request created`]
      );

      await defaultQuery("COMMIT");
      return { success: true };
    } catch (error) {
      await defaultQuery("ROLLBACK");
      throw error;
    }
  }
};

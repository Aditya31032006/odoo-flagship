import { orgSetupQueries } from "../queries/orgSetupQueries";
import { query as defaultQuery } from "../db";

export const orgSetupService = {
  // ── Departments ──────────────────────────────────────────
  async getDepartments() {
    const res = await orgSetupQueries.getDepartments();
    return res.rows;
  },

  async createDepartment(name: string, code: string, description: string, parentId: number | null, status: string) {
    if (!name || !code) {
      throw new Error("Department Name and Code are required.");
    }
    const res = await orgSetupQueries.createDepartment(name, code, description, parentId, status);
    return res.rows[0];
  },

  async updateDepartment(id: number, name: string, code: string, description: string, parentId: number | null, status: string) {
    if (id === parentId) {
      throw new Error("A department cannot be its own parent.");
    }
    await orgSetupQueries.updateDepartment(id, name, code, description, parentId, status);
    return { success: true };
  },

  async assignDepartmentHead(departmentId: number, userId: number, assignedBy: number) {
    // Perform database writes to update assignment
    await defaultQuery("BEGIN");
    try {
      // 0. Fetch previous role
      const userRes = await defaultQuery("SELECT role FROM users WHERE id = $1", [userId]);
      const previousRole = userRes.rows.length > 0 ? userRes.rows[0].role : "EMPLOYEE";

      // 1. Deactivate current active head for this department
      await orgSetupQueries.deassignActiveDeptHeads(departmentId);

      // 2. Insert new assignment
      await orgSetupQueries.assignDeptHead(departmentId, userId, assignedBy);

      // 3. Promote user to DEPARTMENT_HEAD role (if not already)
      if (previousRole !== "DEPARTMENT_HEAD") {
        await orgSetupQueries.updateEmployeeRole(userId, "DEPARTMENT_HEAD");
        // 4. Log role assignment history
        await orgSetupQueries.logRoleHistory(userId, previousRole, "DEPARTMENT_HEAD", assignedBy);
      }

      await defaultQuery("COMMIT");
      return { success: true };
    } catch (err: any) {
      await defaultQuery("ROLLBACK");
      throw err;
    }
  },

  // ── Asset Categories ──────────────────────────────────────
  async getCategories() {
    const categoriesResult = await orgSetupQueries.getCategories();
    const categories = categoriesResult.rows;

    // Load custom fields for each category
    const list = await Promise.all(
      categories.map(async (cat: any) => {
        const fieldsResult = await orgSetupQueries.getCategoryCustomFields(cat.id);
        return {
          ...cat,
          customFields: fieldsResult.rows
        };
      })
    );
    return list;
  },

  async createCategory(name: string, code: string, description: string, status: string, customFields: any[], createdBy: number) {
    if (!name || !code) {
      throw new Error("Category Name and Code are required.");
    }

    await defaultQuery("BEGIN");
    try {
      const res = await orgSetupQueries.createCategory(name, code, description, status, createdBy);
      const categoryId = res.rows[0].id;

      if (customFields && customFields.length > 0) {
        for (const field of customFields) {
          await orgSetupQueries.insertCategoryCustomField(
            categoryId,
            field.name,
            field.field_type || field.fieldType || "TEXT",
            field.is_required || field.isRequired || false
          );
        }
      }

      await defaultQuery("COMMIT");
      return { id: categoryId, name, code };
    } catch (err) {
      await defaultQuery("ROLLBACK");
      throw err;
    }
  },

  async updateCategory(id: number, name: string, code: string, description: string, status: string, customFields: any[]) {
    await defaultQuery("BEGIN");
    try {
      await orgSetupQueries.updateCategory(id, name, code, description, status);

      // Refresh custom fields (delete and insert)
      await orgSetupQueries.deleteCategoryCustomFields(id);

      if (customFields && customFields.length > 0) {
        for (const field of customFields) {
          await orgSetupQueries.insertCategoryCustomField(
            id,
            field.name,
            field.field_type || field.fieldType || "TEXT",
            field.is_required || field.isRequired || false
          );
        }
      }

      await defaultQuery("COMMIT");
      return { success: true };
    } catch (err) {
      await defaultQuery("ROLLBACK");
      throw err;
    }
  },

  // ── Employees ─────────────────────────────────────────────
  async getEmployees() {
    const res = await orgSetupQueries.getEmployees();
    return res.rows;
  },

  async updateEmployeeDepartment(userId: number, departmentId: number | null) {
    await orgSetupQueries.updateEmployeeDepartment(userId, departmentId);
    return { success: true };
  },

  async updateEmployeeRole(userId: number, role: string, assignedBy: number) {
    await defaultQuery("BEGIN");
    try {
      // 0. Fetch previous role
      const userRes = await defaultQuery("SELECT role FROM users WHERE id = $1", [userId]);
      const previousRole = userRes.rows.length > 0 ? userRes.rows[0].role : "EMPLOYEE";

      if (previousRole === role) {
        await defaultQuery("COMMIT");
        return { success: true };
      }

      await orgSetupQueries.updateEmployeeRole(userId, role);
      await orgSetupQueries.logRoleHistory(userId, previousRole, role, assignedBy);
      await defaultQuery("COMMIT");
      return { success: true };
    } catch (err) {
      await defaultQuery("ROLLBACK");
      throw err;
    }
  },

  async updateEmployeeStatus(userId: number, status: string) {
    await orgSetupQueries.updateEmployeeStatus(userId, status);
    return { success: true };
  }
};

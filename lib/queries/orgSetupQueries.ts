import { query as defaultQuery } from "../db";

const runQuery = (executor: any, text: string, params?: any[]) => {
  if (typeof executor === "function") {
    return executor(text, params);
  }
  return executor.query(text, params);
};

export const orgSetupQueries = {
  // ── Departments ──────────────────────────────────────────
  async getDepartments(executor: any = defaultQuery) {
    return runQuery(
      executor,
      `SELECT 
        d.id,
        d.name,
        d.code,
        d.description,
        d.parent_department_id,
        d.status,
        p.name AS parent_name,
        u.full_name AS head_name,
        u.id AS head_user_id
      FROM departments d
      LEFT JOIN departments p ON d.parent_department_id = p.id
      LEFT JOIN department_head_assignments dha ON dha.department_id = d.id AND dha.is_active = TRUE
      LEFT JOIN users u ON dha.user_id = u.id
      ORDER BY d.created_at ASC`
    );
  },

  async createDepartment(name: string, code: string, description: string, parentId: number | null, status: string, executor: any = defaultQuery) {
    return runQuery(
      executor,
      `INSERT INTO departments (name, code, description, parent_department_id, status)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [name, code, description, parentId, status]
    );
  },

  async updateDepartment(id: number, name: string, code: string, description: string, parentId: number | null, status: string, executor: any = defaultQuery) {
    return runQuery(
      executor,
      `UPDATE departments 
       SET name = $1, code = $2, description = $3, parent_department_id = $4, status = $5, updated_at = CURRENT_TIMESTAMP
       WHERE id = $6`,
      [name, code, description, parentId, status, id]
    );
  },

  async deassignActiveDeptHeads(departmentId: number, executor: any = defaultQuery) {
    return runQuery(
      executor,
      `UPDATE department_head_assignments 
       SET ended_at = CURRENT_TIMESTAMP, is_active = FALSE 
       WHERE department_id = $1 AND is_active = TRUE`,
      [departmentId]
    );
  },

  async assignDeptHead(departmentId: number, userId: number, assignedBy: number, executor: any = defaultQuery) {
    return runQuery(
      executor,
      `INSERT INTO department_head_assignments (department_id, user_id, assigned_by)
       VALUES ($1, $2, $3)`,
      [departmentId, userId, assignedBy]
    );
  },

  // ── Asset Categories ──────────────────────────────────────
  async getCategories(executor: any = defaultQuery) {
    return runQuery(
      executor,
      `SELECT * FROM asset_categories ORDER BY id ASC`
    );
  },

  async createCategory(name: string, code: string, description: string, status: string, createdBy: number, executor: any = defaultQuery) {
    return runQuery(
      executor,
      `INSERT INTO asset_categories (name, code, description, status, created_by)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [name, code, description, status, createdBy]
    );
  },

  async updateCategory(id: number, name: string, code: string, description: string, status: string, executor: any = defaultQuery) {
    return runQuery(
      executor,
      `UPDATE asset_categories
       SET name = $1, code = $2, description = $3, status = $4, updated_at = CURRENT_TIMESTAMP
       WHERE id = $5`,
      [name, code, description, status, id]
    );
  },

  async getCategoryCustomFields(categoryId: number, executor: any = defaultQuery) {
    return runQuery(
      executor,
      `SELECT id, category_id, field_name AS name, field_key, data_type AS field_type, is_required 
       FROM category_custom_fields 
       WHERE category_id = $1 
       ORDER BY id ASC`,
      [categoryId]
    );
  },

  async deleteCategoryCustomFields(categoryId: number, executor: any = defaultQuery) {
    return runQuery(
      executor,
      `DELETE FROM category_custom_fields WHERE category_id = $1`,
      [categoryId]
    );
  },

  async insertCategoryCustomField(categoryId: number, name: string, fieldType: string, isRequired: boolean, executor: any = defaultQuery) {
    // Generate valid lowercase alphanumeric/underscore field key
    let fieldKey = name.toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '');
    if (!fieldKey) fieldKey = 'custom_field_' + Math.floor(Math.random() * 100000);
    
    // Ensure fieldType matches database enum values (TEXT, NUMBER, BOOLEAN, DATE, DATETIME, SELECT, MULTI_SELECT)
    const validTypes = ['TEXT', 'NUMBER', 'BOOLEAN', 'DATE', 'DATETIME', 'SELECT', 'MULTI_SELECT'];
    const dbType = validTypes.includes(fieldType.toUpperCase()) ? fieldType.toUpperCase() : 'TEXT';

    return runQuery(
      executor,
      `INSERT INTO category_custom_fields (category_id, field_name, field_key, data_type, is_required)
       VALUES ($1, $2, $3, $4, $5)`,
      [categoryId, name, fieldKey, dbType, isRequired]
    );
  },

  // ── Employees ─────────────────────────────────────────────
  async getEmployees(executor: any = defaultQuery) {
    return runQuery(
      executor,
      `SELECT u.id, u.full_name, u.email, u.role, u.status, u.department_id, d.name as department_name
       FROM users u
       LEFT JOIN departments d ON u.department_id = d.id
       ORDER BY u.id ASC`
    );
  },

  async updateEmployeeDepartment(userId: number, departmentId: number | null, executor: any = defaultQuery) {
    return runQuery(
      executor,
      `UPDATE users SET department_id = $1 WHERE id = $2`,
      [departmentId, userId]
    );
  },

  async updateEmployeeRole(userId: number, role: string, executor: any = defaultQuery) {
    return runQuery(
      executor,
      `UPDATE users SET role = $1 WHERE id = $2`,
      [role, userId]
    );
  },

  async updateEmployeeStatus(userId: number, status: string, executor: any = defaultQuery) {
    return runQuery(
      executor,
      `UPDATE users SET status = $1 WHERE id = $2`,
      [status, userId]
    );
  },

  async logRoleHistory(userId: number, previousRole: string, newRole: string, changedBy: number, executor: any = defaultQuery) {
    return runQuery(
      executor,
      `INSERT INTO role_assignment_history (user_id, previous_role, new_role, changed_by, reason)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, previousRole, newRole, changedBy, 'Role updated via Organization Setup dashboard']
    );
  },

  // ── Locations ─────────────────────────────────────────────
  async getLocations(executor: any = defaultQuery) {
    return runQuery(
      executor,
      `SELECT l.*, p.name AS parent_name
       FROM locations l
       LEFT JOIN locations p ON l.parent_location_id = p.id
       ORDER BY l.id ASC`
    );
  },

  async createLocation(name: string, code: string, address: string, parentId: number | null, createdBy: number, executor: any = defaultQuery) {
    return runQuery(
      executor,
      `INSERT INTO locations (name, code, address_line_1, parent_location_id, created_by)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [name, code, address, parentId, createdBy]
    );
  },

  async updateLocation(id: number, name: string, code: string, address: string, parentId: number | null, executor: any = defaultQuery) {
    return runQuery(
      executor,
      `UPDATE locations 
       SET name = $1, code = $2, address_line_1 = $3, parent_location_id = $4, updated_at = CURRENT_TIMESTAMP
       WHERE id = $5`,
      [name, code, address, parentId, id]
    );
  },

  async updateLocationStatus(id: number, isActive: boolean, executor: any = defaultQuery) {
    return runQuery(
      executor,
      `UPDATE locations SET is_active = $1 WHERE id = $2`,
      [isActive, id]
    );
  }
};

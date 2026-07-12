import { query as defaultQuery } from "../db";

const runQuery = (executor: any, text: string, params?: any[]) => {
  if (typeof executor === "function") {
    return executor(text, params);
  }
  return executor.query(text, params);
};

export const departmentQueries = {
  /**
   * Fetches all departments joined with parent departments and active heads
   */
  async getDepartmentsWithHeads(executor: any = defaultQuery) {
    return runQuery(
      executor,
      `SELECT 
        d.id,
        d.name,
        d.code,
        d.status,
        p.name AS parent_name,
        u.full_name AS head_name
      FROM departments d
      LEFT JOIN departments p ON d.parent_department_id = p.id
      LEFT JOIN department_head_assignments dha ON dha.department_id = d.id AND dha.is_active = TRUE
      LEFT JOIN users u ON dha.user_id = u.id
      ORDER BY d.created_at ASC`,
      []
    );
  },

  /**
   * Fetches department hierarchy statistics (total count and count created in current month)
   */
  async getDepartmentStats(executor: any = defaultQuery) {
    return runQuery(
      executor,
      `SELECT 
        COUNT(*) AS total_count,
        COUNT(CASE WHEN created_at >= date_trunc('month', CURRENT_DATE) THEN 1 END) AS count_this_month
      FROM departments`,
      []
    );
  }
};

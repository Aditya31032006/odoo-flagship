import { departmentQueries } from "../queries/departmentQueries";

export const departmentService = {
  /**
   * Fetches all departments joined with active head of department, parent department name, and total stats
   */
  async fetchAllDepartments() {
    const [departmentsResult, statsResult] = await Promise.all([
      departmentQueries.getDepartmentsWithHeads(),
      departmentQueries.getDepartmentStats()
    ]);

    const departments = departmentsResult.rows;
    const stats = statsResult.rows[0] || { total_count: 0, count_this_month: 0 };

    return {
      departments,
      stats: {
        total: parseInt(stats.total_count, 10) || 0,
        thisMonth: parseInt(stats.count_this_month, 10) || 0
      }
    };
  }
};

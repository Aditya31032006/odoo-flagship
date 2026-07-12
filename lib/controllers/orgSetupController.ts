import { NextResponse } from "next/server";
import { orgSetupService } from "../services/orgSetupService";
import { query } from "../db";

// Helper to enforce Admin-only access
async function verifyAdminUser(req: Request): Promise<{ id: number; verified: boolean }> {
  const headerUserId = req.headers.get("x-user-id");
  if (!headerUserId) {
    return { id: 0, verified: false };
  }

  const userRes = await query("SELECT id, role FROM users WHERE id = $1", [headerUserId]);
  if (userRes.rows.length > 0 && userRes.rows[0].role === "ADMIN") {
    return { id: parseInt(userRes.rows[0].id, 10), verified: true };
  }

  return { id: 0, verified: false };
}

export const orgSetupController = {
  // ── Departments ──────────────────────────────────────────
  async getDepartments(req: Request) {
    try {
      const { verified } = await verifyAdminUser(req);
      if (!verified) {
        return NextResponse.json({ message: "Access Denied: Admin role required." }, { status: 403 });
      }

      const data = await orgSetupService.getDepartments();
      return NextResponse.json(data, { status: 200 });
    } catch (error: any) {
      console.error("getDepartments Controller Error:", error);
      return NextResponse.json({ message: "Internal server error", details: error.message }, { status: 500 });
    }
  },

  async createDepartment(req: Request) {
    try {
      const { verified } = await verifyAdminUser(req);
      if (!verified) {
        return NextResponse.json({ message: "Access Denied: Admin role required." }, { status: 403 });
      }

      const { name, code, description, parent_department_id, status } = await req.json();
      const parentId = parent_department_id ? parseInt(parent_department_id, 10) : null;
      const dept = await orgSetupService.createDepartment(name, code, description, parentId, status || "ACTIVE");
      return NextResponse.json(dept, { status: 201 });
    } catch (error: any) {
      console.error("createDepartment Controller Error:", error);
      return NextResponse.json({ message: error.message || "Internal server error" }, { status: 400 });
    }
  },

  async updateDepartment(req: Request) {
    try {
      const { verified } = await verifyAdminUser(req);
      if (!verified) {
        return NextResponse.json({ message: "Access Denied: Admin role required." }, { status: 403 });
      }

      const { id, name, code, description, parent_department_id, status } = await req.json();
      const parentId = parent_department_id ? parseInt(parent_department_id, 10) : null;
      await orgSetupService.updateDepartment(parseInt(id, 10), name, code, description, parentId, status);
      return NextResponse.json({ message: "Department updated successfully" }, { status: 200 });
    } catch (error: any) {
      console.error("updateDepartment Controller Error:", error);
      return NextResponse.json({ message: error.message || "Internal server error" }, { status: 400 });
    }
  },

  async assignDepartmentHead(req: Request) {
    try {
      const { id: adminId, verified } = await verifyAdminUser(req);
      if (!verified) {
        return NextResponse.json({ message: "Access Denied: Admin role required." }, { status: 403 });
      }

      const { departmentId, userId } = await req.json();
      await orgSetupService.assignDepartmentHead(parseInt(departmentId, 10), parseInt(userId, 10), adminId);
      return NextResponse.json({ message: "Department Head assigned successfully" }, { status: 200 });
    } catch (error: any) {
      console.error("assignDepartmentHead Controller Error:", error);
      return NextResponse.json({ message: error.message || "Internal server error" }, { status: 400 });
    }
  },

  // ── Asset Categories ──────────────────────────────────────
  async getCategories(req: Request) {
    try {
      const { verified } = await verifyAdminUser(req);
      if (!verified) {
        return NextResponse.json({ message: "Access Denied: Admin role required." }, { status: 403 });
      }

      const data = await orgSetupService.getCategories();
      return NextResponse.json(data, { status: 200 });
    } catch (error: any) {
      console.error("getCategories Controller Error:", error);
      return NextResponse.json({ message: "Internal server error", details: error.message }, { status: 500 });
    }
  },

  async createCategory(req: Request) {
    try {
      const { verified } = await verifyAdminUser(req);
      if (!verified) {
        return NextResponse.json({ message: "Access Denied: Admin role required." }, { status: 403 });
      }

      const { name, code, description, status, customFields } = await req.json();
      const category = await orgSetupService.createCategory(name, code, description, status || "ACTIVE", customFields || []);
      return NextResponse.json(category, { status: 201 });
    } catch (error: any) {
      console.error("createCategory Controller Error:", error);
      return NextResponse.json({ message: error.message || "Internal server error" }, { status: 400 });
    }
  },

  async updateCategory(req: Request) {
    try {
      const { verified } = await verifyAdminUser(req);
      if (!verified) {
        return NextResponse.json({ message: "Access Denied: Admin role required." }, { status: 403 });
      }

      const { id, name, code, description, status, customFields } = await req.json();
      await orgSetupService.updateCategory(parseInt(id, 10), name, code, description, status, customFields || []);
      return NextResponse.json({ message: "Category updated successfully" }, { status: 200 });
    } catch (error: any) {
      console.error("updateCategory Controller Error:", error);
      return NextResponse.json({ message: error.message || "Internal server error" }, { status: 400 });
    }
  },

  // ── Employees ─────────────────────────────────────────────
  async getEmployees(req: Request) {
    try {
      const { verified } = await verifyAdminUser(req);
      if (!verified) {
        return NextResponse.json({ message: "Access Denied: Admin role required." }, { status: 403 });
      }

      const data = await orgSetupService.getEmployees();
      return NextResponse.json(data, { status: 200 });
    } catch (error: any) {
      console.error("getEmployees Controller Error:", error);
      return NextResponse.json({ message: "Internal server error", details: error.message }, { status: 500 });
    }
  },

  async updateEmployeeDepartment(req: Request) {
    try {
      const { verified } = await verifyAdminUser(req);
      if (!verified) {
        return NextResponse.json({ message: "Access Denied: Admin role required." }, { status: 403 });
      }

      const { userId, departmentId } = await req.json();
      const parsedDeptId = departmentId ? parseInt(departmentId, 10) : null;
      await orgSetupService.updateEmployeeDepartment(parseInt(userId, 10), parsedDeptId);
      return NextResponse.json({ message: "Employee department updated successfully" }, { status: 200 });
    } catch (error: any) {
      console.error("updateEmployeeDepartment Controller Error:", error);
      return NextResponse.json({ message: error.message || "Internal server error" }, { status: 400 });
    }
  },

  async updateEmployeeRole(req: Request) {
    try {
      const { id: adminId, verified } = await verifyAdminUser(req);
      if (!verified) {
        return NextResponse.json({ message: "Access Denied: Admin role required." }, { status: 403 });
      }

      const { userId, role } = await req.json();
      await orgSetupService.updateEmployeeRole(parseInt(userId, 10), role, adminId);
      return NextResponse.json({ message: "Employee role promoted/changed successfully" }, { status: 200 });
    } catch (error: any) {
      console.error("updateEmployeeRole Controller Error:", error);
      return NextResponse.json({ message: error.message || "Internal server error" }, { status: 400 });
    }
  },

  async updateEmployeeStatus(req: Request) {
    try {
      const { verified } = await verifyAdminUser(req);
      if (!verified) {
        return NextResponse.json({ message: "Access Denied: Admin role required." }, { status: 403 });
      }

      const { userId, status } = await req.json();
      await orgSetupService.updateEmployeeStatus(parseInt(userId, 10), status);
      return NextResponse.json({ message: "Employee status toggled successfully" }, { status: 200 });
    } catch (error: any) {
      console.error("updateEmployeeStatus Controller Error:", error);
      return NextResponse.json({ message: error.message || "Internal server error" }, { status: 400 });
    }
  }
};

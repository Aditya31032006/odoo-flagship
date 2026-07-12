import { NextResponse } from "next/server";
import { departmentService } from "../services/departmentService";

export const departmentController = {
  /**
   * Retrieves department list data along with hierarchy statistics
   */
  async getDepartments(req: Request) {
    try {
      const data = await departmentService.fetchAllDepartments();
      return NextResponse.json(data, { status: 200 });
    } catch (error: any) {
      console.error("Department Controller Error:", error);
      return NextResponse.json({ message: "Internal server error", details: error.message }, { status: 500 });
    }
  }
};

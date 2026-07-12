import { NextResponse } from "next/server";
import { orgSetupController } from "../../../../lib/controllers/orgSetupController";

export async function GET(req: Request) {
  return orgSetupController.getEmployees(req);
}

export async function PUT(req: Request) {
  try {
    // Clone request to avoid consuming it twice
    const body = await req.clone().json();
    if ("departmentId" in body) {
      return orgSetupController.updateEmployeeDepartment(req);
    }
    if ("role" in body) {
      return orgSetupController.updateEmployeeRole(req);
    }
    if ("status" in body) {
      return orgSetupController.updateEmployeeStatus(req);
    }
    return NextResponse.json({ message: "Invalid request payload parameters" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ message: "Malformed JSON body" }, { status: 400 });
  }
}

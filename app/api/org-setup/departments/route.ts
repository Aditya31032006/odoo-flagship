import { orgSetupController } from "../../../../lib/controllers/orgSetupController";

export async function GET(req: Request) {
  return orgSetupController.getDepartments(req);
}

export async function POST(req: Request) {
  return orgSetupController.createDepartment(req);
}

export async function PUT(req: Request) {
  return orgSetupController.updateDepartment(req);
}

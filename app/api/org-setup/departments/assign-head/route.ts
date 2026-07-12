import { orgSetupController } from "../../../../../lib/controllers/orgSetupController";

export async function POST(req: Request) {
  return orgSetupController.assignDepartmentHead(req);
}

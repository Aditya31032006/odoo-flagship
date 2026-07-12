import { departmentController } from "../../../lib/controllers/departmentController";

export async function GET(req: Request) {
  return departmentController.getDepartments(req);
}

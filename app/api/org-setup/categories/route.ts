import { orgSetupController } from "../../../../lib/controllers/orgSetupController";

export async function GET(req: Request) {
  return orgSetupController.getCategories(req);
}

export async function POST(req: Request) {
  return orgSetupController.createCategory(req);
}

export async function PUT(req: Request) {
  return orgSetupController.updateCategory(req);
}

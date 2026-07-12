import { orgSetupController } from "../../../../lib/controllers/orgSetupController";

export async function GET(req: Request) {
  return orgSetupController.getLocations(req);
}

export async function POST(req: Request) {
  return orgSetupController.createLocation(req);
}

export async function PUT(req: Request) {
  return orgSetupController.updateLocation(req);
}

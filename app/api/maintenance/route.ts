import { maintenanceController } from "../../../lib/controllers/maintenanceController";

export async function GET(req: Request) {
  return maintenanceController.getKanban(req);
}

export async function POST(req: Request) {
  return maintenanceController.raiseRequest(req);
}

export async function PUT(req: Request) {
  return maintenanceController.updateStage(req);
}

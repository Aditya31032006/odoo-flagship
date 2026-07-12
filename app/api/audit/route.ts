import { auditController } from "../../../lib/controllers/auditController";

export async function GET(req: Request) {
  return auditController.getCycles(req);
}

export async function POST(req: Request) {
  return auditController.createCycle(req);
}

export async function PUT(req: Request) {
  return auditController.updateStage(req);
}

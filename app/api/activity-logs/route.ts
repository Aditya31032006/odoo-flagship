import { notificationController } from "../../../lib/controllers/notificationController";

export async function GET(req: Request) {
  return notificationController.getAuditTrail(req);
}

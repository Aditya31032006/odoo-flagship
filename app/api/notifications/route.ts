import { notificationController } from "../../../lib/controllers/notificationController";

export async function GET(req: Request) {
  return notificationController.getNotifications(req);
}

export async function PUT(req: Request) {
  return notificationController.markRead(req);
}

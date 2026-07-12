import { reportController } from "../../../../lib/controllers/reportController";

export async function POST(req: Request) {
  return reportController.triggerExport(req);
}

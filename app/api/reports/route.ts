import { reportController } from "../../../lib/controllers/reportController";

export async function GET(req: Request) {
  return reportController.getReportData(req);
}

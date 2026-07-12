import { allocationController } from "../../../lib/controllers/allocationController";

export async function GET(req: Request) {
  return allocationController.checkAllocation(req);
}

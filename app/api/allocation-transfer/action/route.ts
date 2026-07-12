import { NextResponse } from "next/server";
import { allocationController } from "../../../../lib/controllers/allocationController";

export async function POST(req: Request) {
  try {
    const body = await req.clone().json();
    // If the body contains "reason", it is a transfer request submission
    if ("reason" in body) {
      return allocationController.createTransferRequest(req);
    }
    // Otherwise it is a standard new checkout allocation
    return allocationController.allocateAsset(req);
  } catch (err: any) {
    return NextResponse.json({ message: "Malformed JSON payload" }, { status: 400 });
  }
}

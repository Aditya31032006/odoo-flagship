import { assetController } from "../../../lib/controllers/assetController";

export async function GET(req: Request) {
  return assetController.getAssets(req);
}

export async function POST(req: Request) {
  return assetController.registerAsset(req);
}

import { assetController } from "../../../../lib/controllers/assetController";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  return assetController.getAssetDetails(req, resolvedParams.id);
}

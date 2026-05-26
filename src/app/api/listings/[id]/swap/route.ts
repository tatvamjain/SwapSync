import { NextResponse } from "next/server";
import { getListingStats, markListingSwapped } from "@/lib/listings-store";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const listingId = Number(id);
  if (!Number.isFinite(listingId)) {
    return NextResponse.json({ message: "Invalid listing id." }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const result = await markListingSwapped(listingId, String(body?.swapCode ?? ""));
  const stats = result.ok ? await getListingStats() : undefined;

  return NextResponse.json(
    { message: result.message, stats },
    { status: result.status }
  );
}

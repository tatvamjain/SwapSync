import { NextResponse } from "next/server";
import { markListingSwapped } from "@/lib/listings-store";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const body = await request.json();
  const result = await markListingSwapped(Number(id), String(body?.swapCode ?? ""));

  return NextResponse.json(
    { message: result.message },
    { status: result.status }
  );
}

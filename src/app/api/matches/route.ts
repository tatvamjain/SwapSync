import { NextResponse } from "next/server";
import { getMatches } from "@/lib/listings-store";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const hostel = searchParams.get("hostel");
  const block = searchParams.get("block") ?? undefined;
  const room = searchParams.get("room");

  if (!hostel || !room) {
    return NextResponse.json({ message: "hostel and room query parameters are required" }, { status: 400 });
  }

  try {
    const matches = await getMatches({ hostel, block, room });
    return NextResponse.json(matches);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Unable to retrieve matches" }, { status: 500 });
  }
}

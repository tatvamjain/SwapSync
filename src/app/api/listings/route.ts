import { NextResponse } from "next/server";
import { createListing, getActiveListings } from "@/lib/listings-store";

export const dynamic = "force-dynamic";

export async function GET() {
  const listings = await getActiveListings();
  return NextResponse.json({ listings });
}

export async function POST(request: Request) {
  const body = await request.json();
  if (!body?.hostel || !body?.room || !body?.floor || !body?.roomType || !body?.whatsapp) {
    return NextResponse.json({ message: "Missing required listing fields." }, { status: 400 });
  }

  const result = await createListing({
    hostel: String(body.hostel),
    block: body.block ? String(body.block) : undefined,
    room: String(body.room),
    floor: String(body.floor),
    roomType: String(body.roomType),
    wants: {
      hostels: Array.isArray(body.wants?.hostels) ? body.wants.hostels.map(String) : [],
      blocks: Array.isArray(body.wants?.blocks) ? body.wants.blocks.map(String) : [],
      rooms: Array.isArray(body.wants?.rooms) ? body.wants.rooms.map(String) : [],
      floors: Array.isArray(body.wants?.floors) ? body.wants.floors.map(String) : [],
    },
    whatsapp: String(body.whatsapp),
  });

  return NextResponse.json(result, { status: 201 });
}

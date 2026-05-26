import { NextResponse } from "next/server";
import { createListing, getListingStats, getListingsPageData } from "@/lib/listings-store";

export const dynamic = "force-dynamic";

const floors = ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th"];
const hostels = [
  "A",
  "B",
  "C",
  "D",
  "E",
  "G",
  "H",
  "I",
  "J",
  "K",
  "L",
  "M",
  "N",
  "O",
  "Q",
  "PG I",
  "PG II",
  "FRG",
  "FRF",
];
const blocks = ["A", "B", "C", "D", "E", "F"];
const anyRoomPreference = "Any Room";

function floorForRoom(room: string) {
  const firstDigit = room.trim().match(/\d/)?.[0];
  if (!firstDigit) return "1st";

  return floors[Number(firstDigit) - 1] ?? "1st";
}

function floorOptionsForRoom(room: string) {
  return [floorForRoom(room)];
}

function isRoomNumber(value: string) {
  return /^[1-8]\d*$/.test(value.trim());
}

function normalizeWhatsAppNumber(value: string) {
  const digits = value.replace(/\D/g, "");
  const withoutInternationalPrefix = digits.startsWith("00") ? digits.slice(2) : digits;

  if (withoutInternationalPrefix.length === 10) {
    return `91${withoutInternationalPrefix}`;
  }

  if (withoutInternationalPrefix.length === 11 && withoutInternationalPrefix.startsWith("0")) {
    return `91${withoutInternationalPrefix.slice(1)}`;
  }

  return withoutInternationalPrefix;
}

function isValidWhatsAppNumber(value: string) {
  return /^91[6-9]\d{9}$/.test(normalizeWhatsAppNumber(value));
}

function readStringArray(value: unknown) {
  return Array.isArray(value) ? value.map(String).filter((item) => item.trim()) : [];
}

export async function GET() {
  try {
    const data = await getListingsPageData();
    return NextResponse.json(data);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Unable to load listings." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body?.hostel || !body?.room || !body?.floor || !body?.roomType || !body?.whatsapp) {
    return NextResponse.json({ message: "Missing required listing fields." }, { status: 400 });
  }

  const hostel = String(body.hostel).trim();
  const block = body.block ? String(body.block).trim() : undefined;
  const room = String(body.room);
  const floor = String(body.floor);
  const roomType = String(body.roomType).trim();
  const whatsapp = String(body.whatsapp).trim();
  const wants = {
    hostels: readStringArray(body.wants?.hostels),
    blocks: readStringArray(body.wants?.blocks),
    rooms: readStringArray(body.wants?.rooms),
    floors: readStringArray(body.wants?.floors),
  };

  if (!hostel || !isRoomNumber(room) || !floor || !roomType || !whatsapp) {
    return NextResponse.json({ message: "All fields are required." }, { status: 400 });
  }

  if (!hostels.includes(hostel)) {
    return NextResponse.json({ message: "Invalid hostel." }, { status: 400 });
  }

  if (hostel === "M" && !block) {
    return NextResponse.json({ message: "Block is required for Hostel M." }, { status: 400 });
  }

  if (block && !blocks.includes(block)) {
    return NextResponse.json({ message: "Invalid block." }, { status: 400 });
  }

  if (!isValidWhatsAppNumber(whatsapp)) {
    return NextResponse.json({ message: "Enter a valid Indian WhatsApp number." }, { status: 400 });
  }

  if (!wants.hostels.length || !wants.rooms.length || !wants.floors.length) {
    return NextResponse.json({ message: "All preference fields are required." }, { status: 400 });
  }

  if (!wants.hostels.every((item) => hostels.includes(item))) {
    return NextResponse.json({ message: "Invalid preferred hostel." }, { status: 400 });
  }

  if (wants.hostels.includes("M") && !wants.blocks.length) {
    return NextResponse.json({ message: "Preferred blocks are required for Hostel M." }, { status: 400 });
  }

  if (!wants.blocks.every((item) => blocks.includes(item))) {
    return NextResponse.json({ message: "Invalid preferred block." }, { status: 400 });
  }

  if (!wants.floors.every((item) => floors.includes(item))) {
    return NextResponse.json({ message: "Invalid preferred floor." }, { status: 400 });
  }

  const wantsAnyRoom = wants.rooms.includes(anyRoomPreference);
  if (
    (wantsAnyRoom && wants.rooms.length > 1) ||
    (!wantsAnyRoom && !wants.rooms.every(isRoomNumber))
  ) {
    return NextResponse.json({ message: "Preferred room must be numeric or Any Room." }, { status: 400 });
  }

  if (!floorOptionsForRoom(room).includes(floor)) {
    return NextResponse.json(
      { message: "Floor must match the room number." },
      { status: 400 }
    );
  }

  try {
    const result = await createListing({
      hostel,
      block,
      room,
      floor,
      roomType,
      wants,
      whatsapp,
    });

    const stats = await getListingStats();

    return NextResponse.json({ ...result, stats }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Unable to create listing." }, { status: 500 });
  }
}

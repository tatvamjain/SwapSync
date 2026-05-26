import { randomBytes } from "crypto";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

export type Listing = {
  id: number;
  hostel: string;
  block?: string;
  room: string;
  floor: string;
  roomType: string;
  wants: {
    hostels: string[];
    blocks: string[];
    rooms: string[];
    floors: string[];
  };
  whatsapp: string;
  swapCode: string;
  posted: string;
  createdAt: string;
  status: "active" | "swapped";
};

export type PublicListing = Omit<Listing, "swapCode">;

const dataDir = path.join(process.cwd(), "data");
const dataFile = path.join(dataDir, "listings.json");

function toPublicListing(listing: Listing): PublicListing {
  return {
    id: listing.id,
    hostel: listing.hostel,
    block: listing.block,
    room: listing.room,
    floor: listing.floor,
    roomType: listing.roomType,
    wants: listing.wants,
    whatsapp: listing.whatsapp,
    posted: listing.posted,
    createdAt: listing.createdAt,
    status: listing.status,
  };
}

async function ensureDataFile() {
  await mkdir(dataDir, { recursive: true });
  try {
    await readFile(dataFile, "utf8");
  } catch {
    await writeFile(dataFile, JSON.stringify([], null, 2));
  }
}

async function readListings() {
  await ensureDataFile();
  const raw = await readFile(dataFile, "utf8");
  return JSON.parse(raw) as Listing[];
}

async function writeListings(listings: Listing[]) {
  await mkdir(dataDir, { recursive: true });
  await writeFile(dataFile, JSON.stringify(listings, null, 2));
}

function generateSwapCode(hostel: string, room: string) {
  const randomPart = randomBytes(3).toString("hex").toUpperCase();
  return `SYNC-${hostel.replace(/\s/g, "")}${room}-${randomPart}`.toUpperCase();
}

function buildWhatsAppUrl(listing: Listing) {
  const message = `Your SwapSync post is live.\n\nRoom: Hostel ${listing.hostel}${listing.block ? ` Block ${listing.block}` : ""}, Room ${listing.room}\nSwap completion code: ${listing.swapCode}\n\nKeep this code safe. You will need it to mark your post as swapped.\n\nTap send in WhatsApp to save this message in your chat.`;
  return `https://wa.me/${listing.whatsapp}?text=${encodeURIComponent(message)}`;
}

export async function getActiveListings() {
  const listings = await readListings();
  return listings.filter((listing) => listing.status === "active").map(toPublicListing);
}

export async function createListing(input: Omit<Listing, "id" | "swapCode" | "posted" | "createdAt" | "status">) {
  const listings = await readListings();
  const listing: Listing = {
    ...input,
    id: Date.now(),
    block: input.hostel === "M" ? input.block : undefined,
    swapCode: generateSwapCode(input.hostel, input.room),
    posted: "just now",
    createdAt: new Date().toISOString(),
    status: "active",
  };
  await writeListings([listing, ...listings]);
  return {
    listing: toPublicListing(listing),
    swapCode: listing.swapCode,
    whatsappUrl: buildWhatsAppUrl(listing),
  };
}

export async function markListingSwapped(id: number, swapCode: string) {
  const listings = await readListings();
  const listing = listings.find((item) => item.id === id);
  if (!listing || listing.status !== "active") {
    return { ok: false, status: 404, message: "Listing not found." };
  }
  if (listing.swapCode !== swapCode.trim().toUpperCase()) {
    return { ok: false, status: 403, message: "That code does not match this listing." };
  }
  const nextListings = listings.map((item) =>
    item.id === id ? { ...item, status: "swapped" as const } : item
  );
  await writeListings(nextListings);
  return { ok: true, status: 200, message: "Listing marked as swapped." };
}

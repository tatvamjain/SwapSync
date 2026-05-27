import { randomBytes } from "crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type Listing = {
  id: number;
  hostel: string;
  block?: string;
  room: number;
  floor: string;
  roomType: string;
  wants: {
    hostels: string[];
    blocks: string[];
    rooms: string[];
    floors: string[];
  };
  description?: string;
  whatsapp: string;
  swapCode: string;
  posted: string;
  createdAt: string;
  status: "active" | "swapped";
};

export type PublicListing = Omit<Listing, "swapCode">;

export type ListingStats = {
  activeCount: number;
  mostWanted: string;
  completedSwaps: number;
};

type ListingRow = {
  id: number;
  hostel: string;
  block: string | null;
  room: number;
  floor: string;
  room_type: string;
  wants: Listing["wants"];
  description: string | null;
  whatsapp: string;
  swap_code: string;
  created_at: string;
  status: Listing["status"];
};

type ListingInsert = Omit<ListingRow, "id" | "created_at">;

let supabase: SupabaseClient | null = null;

function getSupabase() {
  if (supabase) return supabase;

  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      "Missing Supabase environment variables. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
    );
  }

  supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return supabase;
}

function toPublicListing(listing: Listing): PublicListing {
  return {
    id: listing.id,
    hostel: listing.hostel,
    block: listing.block,
    room: listing.room,
    floor: listing.floor,
    roomType: listing.roomType,
    wants: listing.wants,
    description: listing.description,
    whatsapp: listing.whatsapp,
    posted: listing.posted,
    createdAt: listing.createdAt,
    status: listing.status,
  };
}

function formatPosted(createdAt: string) {
  const elapsedMs = Date.now() - new Date(createdAt).getTime();
  const elapsedMinutes = Math.max(0, Math.floor(elapsedMs / 60_000));

  if (elapsedMinutes < 1) return "just now";
  if (elapsedMinutes < 60) return `${elapsedMinutes}m ago`;

  const elapsedHours = Math.floor(elapsedMinutes / 60);
  if (elapsedHours < 24) return `${elapsedHours}h ago`;

  const elapsedDays = Math.floor(elapsedHours / 24);
  return `${elapsedDays}d ago`;
}

function rowToListing(row: ListingRow): Listing {
  return {
    id: row.id,
    hostel: row.hostel,
    block: row.block ?? undefined,
    room: row.room,
    floor: row.floor,
    roomType: row.room_type,
    wants: row.wants,
    description: row.description ?? undefined,
    whatsapp: row.whatsapp,
    swapCode: row.swap_code,
    posted: formatPosted(row.created_at),
    createdAt: row.created_at,
    status: row.status,
  };
}

function generateSwapCode(hostel: string, room: string | number) {
  const randomPart = randomBytes(3).toString("hex").toUpperCase();
  return `SYNC-${hostel.replace(/\s/g, "")}${room}-${randomPart}`.toUpperCase();
}

function normalizeWhatsAppNumber(value: string | number) {
  const digits = String(value).replace(/\D/g, "");
  const withoutInternationalPrefix = digits.startsWith("00") ? digits.slice(2) : digits;

  if (withoutInternationalPrefix.length === 10) {
    return `91${withoutInternationalPrefix}`;
  }

  if (withoutInternationalPrefix.length === 11 && withoutInternationalPrefix.startsWith("0")) {
    return `91${withoutInternationalPrefix.slice(1)}`;
  }

  return withoutInternationalPrefix;
}

function buildWhatsAppUrl(listing: Listing) {
  const phoneNumber = normalizeWhatsAppNumber(listing.whatsapp);
  const message = `Your SwapSync secret key is ${listing.swapCode}.\n\nRoom: Hostel ${listing.hostel}${listing.block ? ` Block ${listing.block}` : ""}, Room ${listing.room}\n\nKeep this key safe. You will need it to mark your post as swapped.`;
  return `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
}

function buildContactWhatsAppUrl(listing: PublicListing) {
  const phoneNumber = normalizeWhatsAppNumber(listing.whatsapp);
  const message = `Hey, I saw your SwapSync listing for Hostel ${listing.hostel} Room ${listing.room}. Want to discuss a room swap?`;
  return `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
}

function getMostWanted(rows: ListingRow[]) {
  const counts = new Map<string, number>();

  for (const row of rows) {
    for (const hostel of row.wants.hostels) {
      if (hostel === "M" && row.wants.blocks.length) {
        for (const block of row.wants.blocks) {
          const key = `M Block ${block}`;
          counts.set(key, (counts.get(key) ?? 0) + 1);
        }
      } else {
        counts.set(`Hostel ${hostel}`, (counts.get(`Hostel ${hostel}`) ?? 0) + 1);
      }
    }
  }

  const [mostWanted] = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  return mostWanted?.[0] ?? "No requests yet";
}

async function getCompletedSwaps() {
  const { count, error } = await getSupabase()
    .from("listings")
    .select("id", { count: "exact", head: true })
    .eq("status", "swapped");

  if (error) {
    throw new Error(`Unable to load swap stats: ${error.message}`);
  }

  return count ?? 0;
}

export async function getListingStats(activeRows?: ListingRow[]): Promise<ListingStats> {
  let rows = activeRows;

  if (!rows) {
    const { data, error } = await getSupabase()
      .from("listings")
      .select("*")
      .eq("status", "active");

    if (error) {
      throw new Error(`Unable to load listing stats: ${error.message}`);
    }

    rows = data as ListingRow[];
  }

  const activeListings = rows;

  return {
    activeCount: activeListings.length,
    mostWanted: getMostWanted(activeListings),
    completedSwaps: await getCompletedSwaps(),
  };
}

export async function getActiveListings() {
  const { data, error } = await getSupabase()
    .from("listings")
    .select("*")
    .eq("status", "active")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Unable to load listings: ${error.message}`);
  }

  return (data as ListingRow[]).map(rowToListing).map(toPublicListing);
}

export async function getListingsPageData() {
  const { data, error } = await getSupabase()
    .from("listings")
    .select("*")
    .eq("status", "active")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Unable to load listings: ${error.message}`);
  }

  const rows = data as ListingRow[];

  return {
    listings: rows.map(rowToListing).map(toPublicListing).map((listing) => ({
      ...listing,
      whatsappUrl: buildContactWhatsAppUrl(listing),
    })),
    stats: await getListingStats(rows),
  };
}

export async function createListing(input: Omit<Listing, "id" | "swapCode" | "posted" | "createdAt" | "status">) {
  const listing: ListingInsert = {
    hostel: input.hostel,
    block: input.hostel === "M" ? input.block ?? null : null,
    room: input.room,
    floor: input.floor,
    room_type: input.roomType,
    wants: input.wants,
    description: input.description?.trim() || null,
    whatsapp: normalizeWhatsAppNumber(input.whatsapp),
    swap_code: generateSwapCode(input.hostel, input.room),
    status: "active",
  };

  const { data, error } = await getSupabase()
    .from("listings")
    .insert(listing)
    .select("*")
    .single();

  if (error) {
    throw new Error(`Unable to create listing: ${error.message}`);
  }

  const createdListing = rowToListing(data as ListingRow);

  return {
    listing: toPublicListing(createdListing),
    swapCode: createdListing.swapCode,
    whatsappUrl: buildWhatsAppUrl(createdListing),
  };
}

export async function markListingSwapped(id: number, swapCode: string) {
  const { data, error } = await getSupabase()
    .from("listings")
    .select("*")
    .eq("id", id)
    .eq("status", "active")
    .single();

  if (error || !data) {
    return { ok: false, status: 404, message: "Listing not found." };
  }

  const listing = rowToListing(data as ListingRow);
  if (listing.swapCode !== swapCode.trim().toUpperCase()) {
    return { ok: false, status: 403, message: "That code does not match this listing." };
  }

  const { error: updateError } = await getSupabase()
    .from("listings")
    .update({ status: "swapped" })
    .eq("id", id);

  if (updateError) {
    return { ok: false, status: 500, message: "Unable to mark this listing as swapped." };
  }

  return { ok: true, status: 200, message: "Listing marked as swapped." };
}

/** New: Retrieve reverse room matches with scoring **/
export async function getMatches(query: { hostel: string; block?: string; room: string }) {
  const { data, error } = await getSupabase()
    .from("listings")
    .select("*")
    .eq("status", "active");

  if (error) throw new Error(`Unable to load listings for matches: ${error.message}`);

  const rows = data as ListingRow[];
  const targetFloor = (() => {
    const firstDigit = query.room.trim().match(/\d/);
    if (!firstDigit) return "1st";
    const num = Number(firstDigit[0]);
    const floors = ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th"];
    return floors[num - 1] ?? "1st";
  })();

  const matches = rows.map((row) => {
    const listing = rowToListing(row);
    let score = 0;
    const exactHostel = listing.wants.hostels.includes(query.hostel);
    const exactRoom = listing.wants.rooms.includes(query.room);
    const exactBlock = query.block && listing.wants.blocks.includes(query.block);
    const exactFloor = listing.wants.floors.includes(targetFloor);

    if (exactHostel && exactRoom) {
      score = 100;
    } else {
      if (exactHostel) score += 40;
      if (exactFloor) score += 20;
      if (exactRoom) score += 30;
      if (exactBlock) score += 10;
    }
    return { listing, matchScore: score };
  }).filter((m) => m.matchScore > 0);

  matches.sort((a, b) => b.matchScore - a.matchScore);
  return matches;
}



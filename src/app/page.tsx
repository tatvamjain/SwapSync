"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  BedDouble,
  Check,
  ChevronDown,
  MessageCircle,
  Plus,
  RefreshCw,
  Search,
  SlidersHorizontal,
  X,
  Zap,
} from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

const girlsHostels = ["E", "G", "I", "N", "Q", "PG I", "PG II"];
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
const floors = ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th"];
const anyRoomPreference = "Any Room";
const allRoomTypes = [
  "1S Non-AC",
  "1S AC",
  "1S AC Attached Shared",
  "1S AC Attached",
  "2S Non-AC",
  "2S AC",
  "2S AC Attached (2WAT)",
  "2S AC Attached Shared by 2 Rooms (2S WST)",
  "3S Non-AC",
  "3S AC",
  "4S Non-AC",
  "4S AC",
];
const roomTypeAvailability: Record<string, string[]> = {
  A: ["2S AC Attached Shared by 2 Rooms (2S WST)"],
  B: ["1S AC", "2S AC"],
  C: ["2S AC", "3S AC"],
  D: ["2S AC Attached Shared by 2 Rooms (2S WST)"],
  E: ["1S AC", "2S AC", "3S AC", "4S AC"],
  G: ["1S AC", "3S AC", "4S AC"],
  H: ["2S Non-AC", "2S AC", "3S Non-AC", "3S AC", "4S Non-AC", "4S AC"],
  I: ["1S Non-AC", "1S AC", "2S AC", "3S Non-AC", "3S AC"],
  J: ["1S Non-AC", "1S AC", "2S Non-AC", "2S AC", "3S Non-AC", "4S Non-AC"],
  K: ["2S Non-AC", "2S AC"],
  L: ["2S AC"],
  M: ["1S AC Attached Shared", "1S AC Attached", "2S AC Attached (2WAT)", "2S AC Attached Shared by 2 Rooms (2S WST)"],
  N: ["1S AC Attached Shared", "1S AC Attached", "2S AC Attached Shared by 2 Rooms (2S WST)"],
  O: ["2S AC Attached Shared by 2 Rooms (2S WST)"],
  "PG I": ["2S AC", "2S AC Attached Shared by 2 Rooms (2S WST)"],
  "PG II": ["2S AC", "2S AC Attached Shared by 2 Rooms (2S WST)"],
  Q: ["2S AC Attached Shared by 2 Rooms (2S WST)"],
  FRG: ["3S Non-AC", "3S AC"],
  FRF: ["3S Non-AC", "3S AC"],
};
type Gender = "girls" | "boys";

type Listing = {
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
  description?: string;
  whatsapp: string;
  whatsappUrl?: string;
  swapCode?: string;
  posted: string;
};

type ListingStats = {
  activeCount: number;
  mostWanted: string;
  completedSwaps: number;
};

const isGirlsHostel = (hostel: string) => girlsHostels.includes(hostel);
const genderForHostel = (hostel: string): Gender => (isGirlsHostel(hostel) ? "girls" : "boys");
const hostelsForGender = (gender: Gender) =>
  hostels.filter((hostel) => genderForHostel(hostel) === gender);
const roomTypesForHostel = (hostel: string) => roomTypeAvailability[hostel] ?? allRoomTypes;
const floorForRoom = (room: string) => {
  const firstDigit = room.trim().match(/\d/)?.[0];
  if (!firstDigit) return "1st";

  const inferredFloor = floors[Number(firstDigit) - 1];
  return inferredFloor ?? "1st";
};
const floorOptionsForRoom = (room: string) => {
  return [floorForRoom(room)];
};
const defaultStats: ListingStats = {
  activeCount: 0,
  mostWanted: "No requests yet",
  completedSwaps: 0,
};

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

function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

function isRoomNumber(value: string) {
  return /^[1-8]\d{2}$/.test(value.trim());
}

function isValidWhatsAppNumber(value: string) {
  const normalized = normalizeWhatsAppNumber(value);
  return /^91[6-9]\d{9}$/.test(normalized);
}

function buildContactWhatsAppUrl(listing: Listing) {
  const message = `Hey, I saw your SwapSync listing for Hostel ${listing.hostel} Room ${listing.room}. Want to discuss a room swap?`;
  return `https://wa.me/${normalizeWhatsAppNumber(listing.whatsapp)}?text=${encodeURIComponent(message)}`;
}

const blankListing: Omit<Listing, "id" | "posted"> = {
  hostel: "M",
  block: "A",
  room: "",
  floor: "1st",
  roomType: "2S AC Attached Shared by 2 Rooms (2S WST)",
  wants: {
    hostels: ["M"],
    blocks: ["A"],
    rooms: [],
    floors: ["1st"],
  },
  description: "",
  whatsapp: "",
  swapCode: "",
};

function isCurrentRoomComplete(form: Omit<Listing, "id" | "posted">) {
  return Boolean(
    form.hostel &&
      (form.hostel !== "M" || form.block) &&
      isRoomNumber(form.room) &&
      form.floor &&
      form.roomType
  );
}

function isWantedRoomComplete(form: Omit<Listing, "id" | "posted">) {
  return Boolean(
    form.wants.hostels.length &&
      (!form.wants.hostels.includes("M") || form.wants.blocks.length) &&
      form.wants.rooms.length &&
      form.wants.floors.length &&
      isValidWhatsAppNumber(form.whatsapp)
  );
}

type MatchResult = { listing: Listing; matchScore: number };
type SwapChain = [Listing, Listing, Listing];

function detectThreeWaySwaps(listings: Listing[]): SwapChain[] {
  const cycles: SwapChain[] = [];
  const uniq = new Set<string>();
  for (const a of listings) {
    for (const wantHostel of a.wants.hostels) {
      const possibleB = listings.filter((b) => {
        if (b.id === a.id || b.hostel !== wantHostel) return false;
        if (wantHostel === "M" && a.wants.blocks.length && !a.wants.blocks.includes(b.block ?? "")) return false;
        if (a.wants.rooms.length && !a.wants.rooms.includes(b.room) && !a.wants.rooms.includes(anyRoomPreference)) return false;
        return true;
      });
      for (const b of possibleB) {
        for (const bHostel of b.wants.hostels) {
          const possibleC = listings.filter((c) => {
            if (c.id === a.id || c.id === b.id || c.hostel !== bHostel) return false;
            if (bHostel === "M" && b.wants.blocks.length && !b.wants.blocks.includes(c.block ?? "")) return false;
            if (b.wants.rooms.length && !b.wants.rooms.includes(c.room) && !b.wants.rooms.includes(anyRoomPreference)) return false;
            return true;
          });
          for (const c of possibleC) {
            const cWantsA = c.wants.hostels.includes(a.hostel) &&
              (a.hostel !== "M" || !c.wants.blocks.length || c.wants.blocks.includes(a.block ?? "")) &&
              (!c.wants.rooms.length || c.wants.rooms.includes(a.room) || c.wants.rooms.includes(anyRoomPreference));
            if (cWantsA) {
              const key = [a.id, b.id, c.id].sort((x, y) => x - y).join("-");
              if (!uniq.has(key)) { uniq.add(key); cycles.push([a, b, c]); }
            }
          }
        }
      }
    }
  }
  return cycles;
}

function computeMatchScore(listing: Listing, query: { hostel: string; block?: string; room: string; floor: string }) {
  // ── STRICT FILTERING ──────────────────────────────────────────────────────
  // Every requirement the student set must match. If ANY fails → score 0 (hidden).

  // 1. Hostel must match
  if (!listing.wants.hostels.includes(query.hostel)) return 0;

  // 2. Block must match (only relevant for Hostel M)
  if (query.block && listing.wants.blocks.length && !listing.wants.blocks.includes(query.block)) return 0;

  // 3. Floor must match if the student specified a floor preference
  if (listing.wants.floors.length && !listing.wants.floors.includes(query.floor)) return 0;

  // 4. Room must match if the student specified exact rooms (not "Any Room")
  const wantsAnyRoom = listing.wants.rooms.includes(anyRoomPreference) || listing.wants.rooms.length === 0;
  if (!wantsAnyRoom && !listing.wants.rooms.includes(query.room)) return 0;

  // ── SCORING ───────────────────────────────────────────────────────────────
  // Only reached when ALL requirements match.
  return 100;
}

export default function Home() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [listingStats, setListingStats] = useState<ListingStats>(defaultStats);
  const [modalOpen, setModalOpen] = useState(false);
  const [postingStep, setPostingStep] = useState(1);
  const [form, setForm] = useState(blankListing);
  const [roomTag, setRoomTag] = useState("");
  const [search, setSearch] = useState("");
  const [selectedGender, setSelectedGender] = useState<Gender>("boys");
  const [selectedHostel, setSelectedHostel] = useState("M");
  const [selectedFloor, setSelectedFloor] = useState("");
  const [selectedRoomType, setSelectedRoomType] = useState("");
  const [selectedBlock, setSelectedBlock] = useState("");
  const [onlyAc, setOnlyAc] = useState(false);
  const [onlyAttached, setOnlyAttached] = useState(false);
  const [success, setSuccess] = useState(false);
  const [postedCode, setPostedCode] = useState("");
  const [postedWhatsAppUrl, setPostedWhatsAppUrl] = useState("");
  const [swapCheck, setSwapCheck] = useState<Listing | null>(null);
  const [swapCodeInput, setSwapCodeInput] = useState("");
  const [swapCodeError, setSwapCodeError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Reverse search
  const [rsHostel, setRsHostel] = useState("");
  const [rsBlock, setRsBlock] = useState("");
  const [rsRoom, setRsRoom] = useState("");
  const [rsResults, setRsResults] = useState<MatchResult[] | null>(null);
  const [rsLoading, setRsLoading] = useState(false);
  // Chain swap modal
  const [chainModal, setChainModal] = useState<SwapChain | null>(null);

  const activeGender = selectedGender;

  useEffect(() => {
    let cancelled = false;

    async function loadListings() {
      try {
        const response = await fetch("/api/listings", { cache: "no-store" });
        if (!response.ok) return;
        const data = (await response.json()) as { listings: Listing[]; stats: ListingStats };
        if (!cancelled) {
          setListings(data.listings);
          setListingStats(data.stats ?? defaultStats);
        }
      } catch {
        setListings([]);
        setListingStats(defaultStats);
      }
    }

    loadListings();

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredListings = useMemo(() => {
    return listings.filter((listing) => {
      const sameGender = genderForHostel(listing.hostel) === activeGender;
      const hostelMatch = !selectedHostel || listing.hostel === selectedHostel;
      const floorMatch = !selectedFloor || listing.floor === selectedFloor;
      const typeMatch = !selectedRoomType || listing.roomType === selectedRoomType;
      const blockMatch = !selectedBlock || listing.block === selectedBlock;
      const acMatch = !onlyAc || listing.roomType.includes("AC");
      const attachedMatch = !onlyAttached || listing.roomType.includes("Attached");
      const text = `${listing.hostel} ${listing.block ?? ""} ${listing.room} ${listing.floor} ${listing.roomType} ${listing.wants.hostels.join(" ")} ${listing.wants.rooms.join(" ")}`.toLowerCase();
      const searchMatch = !search || text.includes(search.toLowerCase());
      return sameGender && hostelMatch && floorMatch && typeMatch && blockMatch && acMatch && attachedMatch && searchMatch;
    });
  }, [activeGender, listings, onlyAc, onlyAttached, search, selectedBlock, selectedFloor, selectedHostel, selectedRoomType]);

  const circularSwaps = useMemo(() => detectThreeWaySwaps(listings), [listings]);

  const handleReverseSearch = useCallback(async () => {
    if (!rsHostel || !rsRoom) return;
    setRsLoading(true);
    const floor = floorForRoom(rsRoom);
    const matched = listings
      .map((l) => ({ listing: l, matchScore: computeMatchScore(l, { hostel: rsHostel, block: rsBlock || undefined, room: rsRoom, floor }) }))
      .filter((m) => m.matchScore > 0)
      .sort((a, b) => b.matchScore - a.matchScore);
    setRsResults(matched);
    setRsLoading(false);
  }, [rsHostel, rsBlock, rsRoom, listings]);

  const stats = [
    { label: "Active swap requests", value: listingStats.activeCount },
    { label: "Most wanted hostel", value: listingStats.mostWanted },
    { label: "Completed swaps", value: listingStats.completedSwaps },
  ];

  const trendingHostels = useMemo(() => {
    const counts = new Map<string, number>();

    for (const listing of listings) {
      if (genderForHostel(listing.hostel) !== activeGender) continue;
      const key = listing.block ? `${listing.hostel}-${listing.block}` : listing.hostel;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([key]) => {
        const [hostel, block] = key.split("-");
        return { hostel, block };
      });
  }, [activeGender, listings]);

  function updateForm(next: Partial<typeof form>) {
    setForm((current) => ({ ...current, ...next }));
  }

  function toggleArray(key: keyof Listing["wants"], value: string) {
    setForm((current) => {
      const currentValues = current.wants[key];
      const nextValues = currentValues.includes(value)
        ? currentValues.filter((item) => item !== value)
        : [...currentValues, value];
      const nextWants = { ...current.wants, [key]: nextValues };
      if (key === "hostels") {
        nextWants.blocks = nextValues.includes("M") ? current.wants.blocks : [];
      }
      return { ...current, wants: nextWants };
    });
  }

  function addRoomTag() {
    const value = digitsOnly(roomTag);
    if (!value || form.wants.rooms.includes(value)) return;
    setForm((current) => ({
      ...current,
      wants: {
        ...current.wants,
        rooms: [...current.wants.rooms.filter((room) => room !== anyRoomPreference), value],
      },
    }));
    setRoomTag("");
  }

  function toggleAnyRoom() {
    setForm((current) => ({
      ...current,
      wants: {
        ...current.wants,
        rooms: current.wants.rooms.includes(anyRoomPreference) ? [] : [anyRoomPreference],
      },
    }));
    setRoomTag("");
  }

  async function submitListing(event: FormEvent) {
    event.preventDefault();
    if (!isCurrentRoomComplete(form) || !isWantedRoomComplete(form)) return;

    setIsSubmitting(true);
    const response = await fetch("/api/listings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setIsSubmitting(false);
    if (!response.ok) return;

    const result = (await response.json()) as {
      listing: Listing;
      swapCode: string;
      whatsappUrl: string;
      stats: ListingStats;
    };
    const listing = result.listing;
    setListings((current) => [listing, ...current]);
    setListingStats(result.stats ?? defaultStats);
    setSelectedGender(genderForHostel(form.hostel));
    setSelectedHostel(form.hostel);
    setPostedCode(result.swapCode);
    setPostedWhatsAppUrl(result.whatsappUrl);
    setSuccess(true);
    window.open(result.whatsappUrl, "_blank", "noopener,noreferrer");
    setPostingStep(1);
  }

  async function confirmSwapped() {
    if (!swapCheck) return;
    const response = await fetch(`/api/listings/${swapCheck.id}/swap`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ swapCode: swapCodeInput }),
    });
    const data = (await response.json().catch(() => null)) as { message?: string; stats?: ListingStats } | null;
    if (!response.ok) {
      setSwapCodeError(data?.message ?? "That code does not match this listing.");
      return;
    }
    setListings((current) => current.filter((listing) => listing.id !== swapCheck.id));
    setListingStats(data?.stats ?? defaultStats);
    setSwapCheck(null);
    setSwapCodeInput("");
    setSwapCodeError("");
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#060611] text-white">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_20%_10%,rgba(76,201,240,0.18),transparent_30%),radial-gradient(circle_at_84%_0%,rgba(255,77,141,0.16),transparent_28%),linear-gradient(135deg,#060611_0%,#0c1024_48%,#101322_100%)]" />
      <Navbar
        search={search}
        setSearch={setSearch}
        onPost={() => setModalOpen(true)}
      />
      <Hero stats={stats} featuredListings={listings.slice(0, 4)} onPost={() => setModalOpen(true)} />
      <section id="browse" className="mx-auto w-full max-w-7xl px-4 pb-24 pt-5 sm:px-6 lg:px-8">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p className="mb-2 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/8 px-3 py-1 text-xs font-semibold text-cyan-100">
              <Zap className="h-3.5 w-3.5 text-cyan-300" />
              {activeGender === "girls" ? "Girls hostel network" : "Boys hostel network"}
            </p>
            <h2 className="text-2xl font-black tracking-tight sm:text-4xl">Live swap board</h2>
          </div>
          <button
            onClick={() => setModalOpen(true)}
            className="hidden rounded-full bg-white px-5 py-3 text-sm font-black text-[#070816] shadow-[0_16px_45px_rgba(255,255,255,0.18)] transition hover:scale-105 sm:inline-flex"
          >
            Post Room
          </button>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-2 rounded-full border border-white/10 bg-white/7 p-1 sm:max-w-sm">
          {(["boys", "girls"] as Gender[]).map((gender) => (
            <button
              key={gender}
              onClick={() => {
                const nextHostel = hostelsForGender(gender)[0];
                setSelectedGender(gender);
                setSelectedHostel(nextHostel);
                setSelectedBlock("");
                if (selectedRoomType && !roomTypesForHostel(nextHostel).includes(selectedRoomType)) {
                  setSelectedRoomType("");
                }
              }}
              className={`h-11 rounded-full text-sm font-black transition ${
                activeGender === gender
                  ? "bg-white text-[#070816] shadow-[0_12px_35px_rgba(255,255,255,0.16)]"
                  : "text-white/58 hover:text-white"
              }`}
            >
              {gender === "girls" ? "Girls Hostels" : "Boys Hostels"}
            </button>
          ))}
        </div>

        <FilterBar
          activeGender={activeGender}
          selectedHostel={selectedHostel}
          setSelectedHostel={(value) => {
            setSelectedHostel(value);
            if (selectedRoomType && !roomTypesForHostel(value).includes(selectedRoomType)) {
              setSelectedRoomType("");
            }
            if (value !== "M") {
              setSelectedBlock("");
            }
          }}
          selectedFloor={selectedFloor}
          setSelectedFloor={setSelectedFloor}
          selectedRoomType={selectedRoomType}
          setSelectedRoomType={setSelectedRoomType}
          selectedBlock={selectedBlock}
          setSelectedBlock={setSelectedBlock}
          onlyAc={onlyAc}
          setOnlyAc={setOnlyAc}
          onlyAttached={onlyAttached}
          setOnlyAttached={setOnlyAttached}
          search={search}
          setSearch={setSearch}
        />

        {trendingHostels.length > 0 && (
        <div className="mb-5 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
          {trendingHostels.map(({ hostel, block }) => (
            <button
              key={`${hostel}-${block ?? ""}`}
              onClick={() => {
                setSelectedHostel(hostel);
                setSelectedBlock(block ?? "");
                if (selectedRoomType && !roomTypesForHostel(hostel).includes(selectedRoomType)) {
                  setSelectedRoomType("");
                }
                if (hostel !== "M" || !block) {
                  setSelectedBlock("");
                }
              }}
              className={`shrink-0 rounded-full border px-4 py-2 text-sm font-bold transition ${
                selectedHostel === hostel && (!block || selectedBlock === block)
                  ? "border-cyan-300/70 bg-cyan-300/15 text-cyan-100 shadow-[0_0_28px_rgba(34,211,238,0.22)]"
                  : "border-white/10 bg-white/7 text-white/70 hover:border-white/25 hover:text-white"
              }`}
            >
              Active Hostel {hostel}{block ? ` Block ${block}` : ""}
            </button>
          ))}
        </div>
        )}

        {/* Reverse Room Search Section */}
        <ReverseSearchSection
          hostel={rsHostel}
          block={rsBlock}
          room={rsRoom}
          loading={rsLoading}
          results={rsResults}
          onHostelChange={(v) => { setRsHostel(v); setRsBlock(""); setRsResults(null); }}
          onBlockChange={(v) => { setRsBlock(v); setRsResults(null); }}
          onRoomChange={(v) => { setRsRoom(v); setRsResults(null); }}
          onSearch={handleReverseSearch}
          onClear={() => setRsResults(null)}
          onSwapped={(listing) => { setSwapCheck(listing); setSwapCodeInput(""); setSwapCodeError(""); }}
        />

        {filteredListings.length ? (
          <motion.div layout className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence>
              {filteredListings.map((listing, index) => (
                <ListingCard
                  key={listing.id}
                  listing={listing}
                  index={index}
                  onSwapped={() => {
                    setSwapCheck(listing);
                    setSwapCodeInput("");
                    setSwapCodeError("");
                  }}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        ) : (
          <EmptyState onPost={() => setModalOpen(true)} />
        )}
      </section>

      <button
        onClick={() => setModalOpen(true)}
        className="fixed bottom-5 left-1/2 z-30 inline-flex h-14 -translate-x-1/2 items-center gap-2 rounded-full bg-white px-6 text-sm font-black text-[#060611] shadow-[0_8px_32px_rgba(255,255,255,0.20)] hover:shadow-[0_12px_40px_rgba(255,255,255,0.28)] hover:scale-[1.03] transition sm:hidden"
      >
        <Plus className="h-5 w-5" />
        Post My Room
      </button>

      <AnimatePresence>
        {modalOpen && (
          <PostModal
            form={form}
            setForm={updateForm}
            postingStep={postingStep}
            setPostingStep={setPostingStep}
            roomTag={roomTag}
            setRoomTag={setRoomTag}
            addRoomTag={addRoomTag}
            toggleAnyRoom={toggleAnyRoom}
            toggleArray={toggleArray}
            submitListing={submitListing}
            onClose={() => {
              setModalOpen(false);
              setSuccess(false);
              setPostedCode("");
              setPostedWhatsAppUrl("");
              setForm(blankListing);
            }}
            success={success}
            postedCode={postedCode}
            postedWhatsAppUrl={postedWhatsAppUrl}
            isSubmitting={isSubmitting}
            onSuccessDone={() => {
              setModalOpen(false);
              setSuccess(false);
              setPostedCode("");
              setPostedWhatsAppUrl("");
              setForm(blankListing);
            }}
          />
        )}
      </AnimatePresence>

      {/* Chain Swap Modal */}
      <AnimatePresence>
        {chainModal && (
          <ChainSwapModal chain={chainModal} onClose={() => setChainModal(null)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {swapCheck && (
          <SwapCodeModal
            listing={swapCheck}
            code={swapCodeInput}
            error={swapCodeError}
            setCode={(value) => {
              setSwapCodeInput(value.toUpperCase());
              setSwapCodeError("");
            }}
            onConfirm={confirmSwapped}
            onClose={() => {
              setSwapCheck(null);
              setSwapCodeInput("");
              setSwapCodeError("");
            }}
          />
        )}
      </AnimatePresence>

      <Footer />
    </main>
  );
}

function Navbar({
  search,
  setSearch,
  onPost,
}: {
  search: string;
  setSearch: (value: string) => void;
  onPost: () => void;
}) {
  return (
    <nav className="fixed left-0 right-0 top-0 z-40 border-b border-white/10 bg-[#060611]/72 backdrop-blur-2xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6 lg:px-8">
        <a href="#" className="flex items-baseline gap-1.5">
          <span className="text-xl font-black tracking-tight text-white">Swap</span>
          <span className="text-xl font-black tracking-tight text-cyan-200">Sync</span>
        </a>
        <a href="#browse" className="ml-auto hidden text-sm font-bold text-white/72 transition hover:text-white md:block">
          Browse Swaps
        </a>
        <Link href="/circular" className="ml-auto md:ml-4 text-xs sm:text-sm font-bold text-cyan-200 transition hover:text-cyan-100 block">
          🔄 Circular Swaps
        </Link>
        <label className="relative hidden min-w-72 items-center md:flex">
          <Search className="pointer-events-none absolute left-4 h-4 w-4 text-white/45" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search room, hostel, floor"
            className="h-11 w-full rounded-full border border-white/10 bg-white/8 pl-11 pr-4 text-sm font-semibold outline-none transition placeholder:text-white/35 focus:border-cyan-300/60 focus:bg-white/12"
          />
        </label>
        <button
          onClick={onPost}
          className="hidden rounded-full bg-white px-5 py-3 text-sm font-black text-[#070816] transition hover:scale-105 md:inline-flex"
        >
          Post Room
        </button>
      </div>
    </nav>
  );
}

function Hero({
  stats,
  featuredListings,
  onPost,
}: {
  stats: { label: string; value: string | number }[];
  featuredListings: Listing[];
  onPost: () => void;
}) {
  const positions = [
    { className: "left-[2%] top-20 sm:left-[4%] sm:top-28 block", rotate: "-6deg" },
    { className: "right-[2%] top-16 sm:right-[5%] sm:top-24 block", rotate: "5deg" },
    { className: "left-[2%] bottom-6 sm:left-[14%] sm:bottom-12 block", rotate: "4deg" },
    { className: "right-[2%] bottom-6 sm:right-[16%] sm:bottom-10 block", rotate: "-4deg" },
  ];

  return (
    <section className="relative px-4 pb-10 pt-28 sm:px-6 lg:px-8">
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(115deg,rgba(59,130,246,0.16),rgba(217,70,239,0.10),rgba(34,211,238,0.12))] animated-gradient" />
      {featuredListings.slice(0, positions.length).map((listing, index) => (
        <div
          key={listing.id}
          className={`float-card glass absolute w-24 rounded-2xl p-2.5 opacity-60 sm:opacity-80 sm:w-32 sm:rounded-[1.7rem] sm:p-4 ${positions[index].className}`}
          style={{ "--rotate": positions[index].rotate, animationDelay: `${index * 0.6}s` } as React.CSSProperties}
        >
          <p className="text-[0.6rem] sm:text-xs font-black text-cyan-200">
            Hostel {listing.hostel}{listing.block ? `-${listing.block}` : ""}
          </p>
          <p className="mt-1 text-lg sm:mt-2 sm:text-3xl font-black">{listing.room}</p>
          <p className="mt-0.5 text-[0.55rem] sm:mt-1 sm:text-xs font-bold text-white/55 truncate">{listing.roomType}</p>
        </div>
      ))}
      <div className="mx-auto max-w-4xl text-center">
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/8 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-cyan-100 shadow-[0_0_35px_rgba(34,211,238,0.14)]"
        >
          Find your perfect hostel room swap instantly.
        </motion.p>
        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="text-balance text-4xl font-black tracking-tight sm:text-7xl xl:text-8xl"
        >
          Didn&apos;t get the hostel room you wanted?
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.16 }}
          className="mx-auto mt-5 max-w-2xl text-pretty text-lg font-semibold leading-8 text-white/68 sm:text-2xl"
        >
          Swap rooms with other students instantly.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.24 }}
          className="mt-8 flex flex-col justify-center gap-3 sm:flex-row"
        >
          <a
            href="#browse"
            className="inline-flex h-14 items-center justify-center gap-2 rounded-full bg-white px-7 text-sm font-black text-[#070816] shadow-[0_22px_70px_rgba(255,255,255,0.18)] transition hover:scale-105"
          >
            Find Swap
            <ArrowRight className="h-4 w-4" />
          </a>
          <button
            onClick={onPost}
            className="inline-flex h-14 items-center justify-center rounded-full border border-white/14 bg-white/10 px-7 text-sm font-black text-white backdrop-blur-xl transition hover:scale-105 hover:bg-white/16"
          >
            Post My Room
          </button>
        </motion.div>
      </div>
      <div className="mx-auto mt-10 grid max-w-4xl gap-3 sm:grid-cols-3">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + index * 0.08 }}
            className="glass rounded-[1.5rem] p-5 text-left"
          >
            <p className="text-2xl font-black">{stat.value}</p>
            <p className="mt-1 text-sm font-semibold text-white/52">{stat.label}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

function FilterBar(props: {
  activeGender: Gender;
  selectedHostel: string;
  setSelectedHostel: (value: string) => void;
  selectedFloor: string;
  setSelectedFloor: (value: string) => void;
  selectedRoomType: string;
  setSelectedRoomType: (value: string) => void;
  selectedBlock: string;
  setSelectedBlock: (value: string) => void;
  onlyAc: boolean;
  setOnlyAc: (value: boolean) => void;
  onlyAttached: boolean;
  setOnlyAttached: (value: boolean) => void;
  search: string;
  setSearch: (value: string) => void;
}) {
  const genderHostels = hostelsForGender(props.activeGender);
  return (
    <div className="sticky top-16 z-20 mb-5 rounded-[1.6rem] border border-white/10 bg-[#090a18]/80 p-3 shadow-[0_20px_80px_rgba(0,0,0,0.3)] backdrop-blur-2xl">
      <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
        <FilterSelect value={props.selectedHostel} onChange={props.setSelectedHostel} options={genderHostels} label="Hostel" />
        <FilterSelect value={props.selectedFloor} onChange={props.setSelectedFloor} options={floors} label="Floor" allowAny />
        <FilterSelect value={props.selectedRoomType} onChange={props.setSelectedRoomType} options={roomTypesForHostel(props.selectedHostel)} label="Type" allowAny />
        {props.selectedHostel === "M" && (
          <FilterSelect value={props.selectedBlock} onChange={props.setSelectedBlock} options={blocks} label="Block" allowAny />
        )}
        <ToggleChip label="AC" active={props.onlyAc} onClick={() => props.setOnlyAc(!props.onlyAc)} />
        <ToggleChip label="Attached" active={props.onlyAttached} onClick={() => props.setOnlyAttached(!props.onlyAttached)} />
      </div>
      <label className="relative mt-3 flex md:hidden">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/45" />
        <input
          value={props.search}
          onChange={(event) => props.setSearch(event.target.value)}
          placeholder="Exact room search"
          className="h-12 w-full rounded-full border border-white/10 bg-white/8 pl-11 pr-4 text-sm font-semibold outline-none placeholder:text-white/35 focus:border-cyan-300/60"
        />
      </label>
    </div>
  );
}

function FilterSelect({
  value,
  onChange,
  options,
  label,
  allowAny,
}: {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  label: string;
  allowAny?: boolean;
}) {
  return (
    <label className="relative shrink-0">
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 appearance-none rounded-full border border-white/10 bg-white/9 py-0 pl-4 pr-10 text-sm font-bold text-white outline-none transition hover:border-white/20 focus:border-cyan-300/60"
      >
        {allowAny && <option value="">Any {label}</option>}
        {options.map((option) => (
          <option key={option} value={option} className="bg-[#101322]">
            {label} {option}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/55" />
    </label>
  );
}

function ToggleChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex h-11 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-black transition ${
        active
          ? "border-fuchsia-300/60 bg-fuchsia-300/15 text-fuchsia-100 shadow-[0_0_25px_rgba(217,70,239,0.2)]"
          : "border-white/10 bg-white/8 text-white/72 hover:border-white/25"
      }`}
    >
      <SlidersHorizontal className="h-4 w-4" />
      {label}
    </button>
  );
}

function MatchScoreBadge({ score }: { score: number }) {
  const grad = score === 100
    ? "from-emerald-400 to-cyan-400 shadow-[0_0_18px_rgba(52,211,153,0.5)]"
    : score >= 70
    ? "from-amber-400 to-orange-500 shadow-[0_0_14px_rgba(251,146,60,0.4)]"
    : "from-slate-400 to-slate-600";
  return (
    <span className={`inline-flex items-center rounded-full bg-gradient-to-r px-3 py-1.5 text-[0.65rem] font-black text-white ${grad}`}>
      {score === 100 ? "🔥 Exact Match" : `${score}% Match`}
    </span>
  );
}

function ListingCard({
  listing,
  index,
  onSwapped,
  matchScore,
}: {
  listing: Listing;
  index: number;
  onSwapped: () => void;
  matchScore?: number;
}) {
  const whatsappUrl = listing.whatsappUrl ?? buildContactWhatsAppUrl(listing);

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 24, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 16, scale: 0.96 }}
      transition={{ delay: index * 0.04 }}
      className="group glass relative overflow-hidden rounded-[1.8rem] p-5 transition duration-300 hover:-translate-y-1 hover:border-cyan-300/35 hover:shadow-[0_24px_90px_rgba(34,211,238,0.16)]"
    >
      <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-cyan-200/60 to-transparent opacity-0 transition group-hover:opacity-100" />

      {/* TOP: Hostel + Block / Room Number / Badge */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-cyan-400">
            Hostel {listing.hostel}{listing.block ? ` · Block ${listing.block}` : ""}
          </p>
          <p className="mt-1.5 text-5xl font-black tracking-tight leading-none">{listing.room}</p>
          <p className="mt-1.5 text-sm font-semibold text-white/50">{listing.floor} Floor · {listing.roomType}</p>
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          {matchScore !== undefined && <MatchScoreBadge score={matchScore} />}
        </div>
      </div>

      {/* LOOKING FOR */}
      <div className="mt-4 rounded-[1.25rem] border border-white/8 bg-black/16 p-3">
        <p className="mb-2 text-[0.65rem] font-black uppercase tracking-[0.16em] text-white/40">Looking For</p>
        <div className="flex flex-wrap gap-1.5">
          {[
            ...listing.wants.hostels.map((item) => `Hostel ${item}`),
            ...listing.wants.blocks.map((item) => `Block ${item}`),
            ...listing.wants.rooms.map((item) => (item === anyRoomPreference ? item : `Room ${item}`)),
            ...listing.wants.floors,
          ].map((item) => (
            <span key={item} className="rounded-full bg-cyan-300/10 px-2.5 py-1 text-xs font-bold text-cyan-100">
              {item}
            </span>
          ))}
        </div>
        {listing.description && (
          <p className="mt-2 text-xs font-semibold text-white/60 leading-relaxed border-t border-white/8 pt-2">
            {listing.description}
          </p>
        )}
      </div>

      {/* ACTIONS */}
      <div className="mt-4 flex items-center gap-2">
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-full bg-[#25D366] text-sm font-black text-[#04130a] shadow-[0_8px_24px_rgba(37,211,102,0.28)] transition hover:scale-[1.02]"
        >
          <MessageCircle className="h-4 w-4" />
          WhatsApp
        </a>
        <button
          type="button"
          onClick={onSwapped}
          className="h-11 rounded-full border border-white/10 bg-white/8 px-4 text-xs font-black text-white/72 transition hover:border-emerald-300/45 hover:bg-emerald-300/12 hover:text-emerald-100"
        >
          Mark as Swapped
        </button>
        <span className="text-xs font-bold text-white/38 shrink-0">{listing.posted}</span>
      </div>
    </motion.article>
  );
}

// ─── Reverse Room Search Section ────────────────────────────────────────────

function ReverseSearchSection({
  hostel, block, room, loading, results,
  onHostelChange, onBlockChange, onRoomChange, onSearch, onClear, onSwapped,
}: {
  hostel: string; block: string; room: string;
  loading: boolean; results: MatchResult[] | null;
  onHostelChange: (v: string) => void;
  onBlockChange: (v: string) => void;
  onRoomChange: (v: string) => void;
  onSearch: () => void;
  onClear: () => void;
  onSwapped: (l: Listing) => void;
}) {
  return (
    <div className="mb-6">
      <div className="glass rounded-[1.8rem] p-5">
        <div className="flex items-center gap-2 mb-1">
          <Search className="h-4 w-4 text-cyan-300" />
          <h2 className="text-base font-black text-cyan-100">See Who Wants Your Room</h2>
        </div>
        <p className="text-xs font-semibold text-white/55 mb-4">Enter your room details and instantly check if anyone is looking for it.</p>
        <div className="flex flex-wrap gap-2">
          <select
            value={hostel}
            onChange={(e) => onHostelChange(e.target.value)}
            className="h-11 appearance-none rounded-full border border-white/10 bg-white/9 px-4 pr-8 text-sm font-bold text-white outline-none focus:border-cyan-300/60"
          >
            <option value="">Select Hostel</option>
            {hostels.map((h) => <option key={h} value={h} className="bg-[#101322]">Hostel {h}</option>)}
          </select>
          {hostel === "M" && (
            <select
              value={block}
              onChange={(e) => onBlockChange(e.target.value)}
              className="h-11 appearance-none rounded-full border border-white/10 bg-white/9 px-4 pr-8 text-sm font-bold text-white outline-none focus:border-cyan-300/60"
            >
              <option value="">Any Block</option>
              {blocks.map((b) => <option key={b} value={b} className="bg-[#101322]">Block {b}</option>)}
            </select>
          )}
          <input
            type="text"
            inputMode="numeric"
            maxLength={3}
            placeholder="Room no. e.g. 412"
            value={room}
            onChange={(e) => onRoomChange(e.target.value.replace(/\D/g, "").slice(0, 3))}
            onKeyDown={(e) => e.key === "Enter" && onSearch()}
            className="h-11 w-36 rounded-full border border-white/10 bg-white/9 px-4 text-sm font-bold text-white outline-none placeholder:text-white/35 focus:border-cyan-300/60"
          />
          <button
            onClick={onSearch}
            disabled={!hostel || !room || loading}
            className="inline-flex h-11 items-center gap-2 rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 px-5 text-sm font-black text-white shadow-[0_8px_28px_rgba(56,189,248,0.35)] transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            Find Matches
          </button>
          {results !== null && (
            <button onClick={onClear} className="h-11 rounded-full border border-white/10 bg-white/8 px-4 text-xs font-black text-white/60 transition hover:text-white">
              Clear
            </button>
          )}
        </div>
      </div>

      <AnimatePresence>
        {results !== null && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="mt-4"
          >
            {results.length === 0 ? (
              <div className="glass rounded-[1.5rem] p-6 text-center">
                <p className="text-2xl">😔</p>
                <p className="mt-2 font-black text-white">No exact matches found</p>
                <p className="mt-1 text-sm font-semibold text-white/55">No one is currently looking for your room, but new listings come in daily!</p>
              </div>
            ) : (
              <div>
                <p className="mb-3 text-sm font-black text-white/70">{results.length} student{results.length > 1 ? "s" : ""} looking for your room</p>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {results.map((r, i) => (
                    <ListingCard key={r.listing.id} listing={r.listing} index={i} onSwapped={() => onSwapped(r.listing)} matchScore={r.matchScore} />
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Circular Swaps Section ──────────────────────────────────────────────────

function CircularSwapsSection({ chains, onView }: { chains: SwapChain[]; onView: (c: SwapChain) => void }) {
  return (
    <div className="mb-6">
      <div className="mb-3 flex items-center gap-2">
        <span className="text-lg">🔄</span>
        <h2 className="text-base font-black text-white">Circular Swaps Found</h2>
        <span className="rounded-full bg-fuchsia-400/20 px-2.5 py-0.5 text-xs font-black text-fuchsia-200 border border-fuchsia-400/30">
          {chains.length}
        </span>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 [scrollbar-width:none]">
        {chains.map((chain, i) => (
          <div
            key={i}
            className="shrink-0 rounded-[1.5rem] border border-fuchsia-400/30 bg-gradient-to-br from-fuchsia-900/30 to-blue-900/20 p-4 shadow-[0_0_30px_rgba(217,70,239,0.15)] w-72"
            style={{ animation: `chain-glow 3s ease-in-out infinite`, animationDelay: `${i * 0.4}s` }}
          >
            <p className="text-[0.65rem] font-black uppercase tracking-[0.16em] text-fuchsia-300 mb-2">3-Way Swap Possible</p>
            <p className="text-sm font-black text-white">
              Room {chain[0].room} → Room {chain[1].room} → Room {chain[2].room} → Room {chain[0].room}
            </p>
            <p className="mt-1 text-xs text-white/50">
              H{chain[0].hostel} · H{chain[1].hostel} · H{chain[2].hostel}
            </p>
            <button
              onClick={() => onView(chain)}
              className="mt-3 h-9 w-full rounded-full bg-fuchsia-400/20 border border-fuchsia-400/40 text-xs font-black text-fuchsia-100 transition hover:bg-fuchsia-400/35"
            >
              View Chain
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Chain Swap Modal ────────────────────────────────────────────────────────

function ChainSwapModal({ chain, onClose }: { chain: SwapChain; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] grid place-items-center bg-black/70 p-4 backdrop-blur-xl"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 32, opacity: 0, scale: 0.96 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 32, opacity: 0, scale: 0.96 }}
        onClick={(e) => e.stopPropagation()}
        className="glass w-full max-w-lg rounded-[2rem] p-6"
      >
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-fuchsia-300">3-Way Circular Swap</p>
            <h3 className="mt-1 text-2xl font-black">Swap Chain Details</h3>
          </div>
          <button onClick={onClose} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/10 text-white/75 transition hover:bg-white/16">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex flex-col gap-3">
          {chain.map((listing, i) => (
            <div key={listing.id}>
              <div className="rounded-[1.25rem] border border-white/10 bg-white/6 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-black text-cyan-300 uppercase tracking-wider">Hostel {listing.hostel}{listing.block ? ` Block ${listing.block}` : ""}</p>
                    <p className="text-3xl font-black mt-0.5">{listing.room}</p>
                    <p className="text-xs text-white/50 mt-0.5">{listing.roomType}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[0.65rem] text-white/40 uppercase tracking-wider">Wants</p>
                    <p className="text-sm font-black text-white">
                      {chain[(i + 1) % 3].wants.rooms.includes(anyRoomPreference) ? "Any Room" : `Room ${chain[(i + 1) % 3].room}`}
                    </p>
                    <p className="text-xs text-white/50">H{chain[(i + 1) % 3].hostel}</p>
                  </div>
                </div>
              </div>
              {i < 2 && (
                <div className="flex justify-center my-1">
                  <span className="text-fuchsia-300 text-lg">↓</span>
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="mt-4 rounded-[1.25rem] border border-fuchsia-300/20 bg-fuchsia-300/8 p-3 text-center">
          <p className="text-xs font-black text-fuchsia-200">🔄 Room {chain[2].room} loops back to Room {chain[0].room} — perfect circular swap!</p>
        </div>
        <p className="mt-4 text-xs text-center font-semibold text-white/45">Contact each student via WhatsApp to coordinate the 3-way swap.</p>
      </motion.div>
    </motion.div>
  );
}

function SwapCodeModal({
  listing,
  code,
  error,
  setCode,
  onConfirm,
  onClose,
}: {
  listing: Listing;
  code: string;
  error: string;
  setCode: (value: string) => void;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] grid place-items-center bg-black/64 p-4 backdrop-blur-xl"
    >
      <motion.div
        initial={{ y: 32, opacity: 0, scale: 0.96 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 32, opacity: 0, scale: 0.96 }}
        className="glass w-full max-w-md rounded-[2rem] p-6"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-black text-emerald-200">Mark as swapped</p>
            <h3 className="mt-2 text-2xl font-black tracking-tight">Enter your swap code</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/10 text-white/75 transition hover:bg-white/16 hover:text-white"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="mt-4 text-sm font-semibold leading-6 text-white/58">
          Use the unique code sent to WhatsApp after posting Hostel {listing.hostel}
          {listing.block ? ` Block ${listing.block}` : ""}, Room {listing.room}.
        </p>
        <input
          value={code}
          onChange={(event) => setCode(event.target.value)}
          placeholder="SYNC-M512-ABCDE"
          className="mt-5 h-13 w-full rounded-2xl border border-white/10 bg-white/8 px-4 text-sm font-black uppercase tracking-wide outline-none placeholder:text-white/28 focus:border-emerald-300/60"
        />
        {error && <p className="mt-3 text-sm font-bold text-red-300">{error}</p>}
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="h-12 flex-1 rounded-full border border-white/10 bg-white/8 text-sm font-black text-white/70 transition hover:bg-white/14 hover:text-white"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="h-12 flex-1 rounded-full bg-emerald-300 text-sm font-black text-[#06130b] transition hover:scale-[1.02]"
          >
            Remove Post
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/7 p-3">
      <p className="text-[0.68rem] font-black uppercase tracking-[0.14em] text-white/36">{label}</p>
      <p className="mt-1 text-sm font-black text-white">{value}</p>
    </div>
  );
}

function EmptyState({ onPost }: { onPost: () => void }) {
  return (
    <div className="glass grid min-h-96 place-items-center rounded-[2rem] p-8 text-center">
      <div>
        <div className="mx-auto grid h-24 w-24 place-items-center rounded-[2rem] bg-gradient-to-br from-cyan-300/20 via-blue-400/15 to-fuchsia-400/20">
          <BedDouble className="h-11 w-11 text-cyan-100" />
        </div>
        <h3 className="mt-6 text-2xl font-black">No swaps found</h3>
        <p className="mx-auto mt-2 max-w-sm text-sm font-semibold leading-6 text-white/55">
          Try another hostel network or post your room to pull matching students into the feed.
        </p>
        <button
          onClick={onPost}
          className="mt-6 rounded-full bg-white px-6 py-3 text-sm font-black text-[#070816] transition hover:scale-105"
        >
          Post My Room
        </button>
      </div>
    </div>
  );
}

function SwapCodeBox({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  function copyCode() {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="mx-auto mt-5 max-w-xs w-full rounded-2xl border border-emerald-300/30 bg-emerald-300/10 px-4 py-3">
      <p className="text-[0.6rem] font-black uppercase tracking-[0.18em] text-emerald-300/70">Swap Code</p>
      <div className="mt-1.5 flex items-center justify-between gap-2">
        <p className="text-sm font-black tracking-widest text-white font-mono whitespace-nowrap">{code}</p>
        <button
          type="button"
          onClick={copyCode}
          className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[0.65rem] font-black transition ${
            copied
              ? "bg-emerald-300 text-[#06130b]"
              : "border border-emerald-300/40 bg-emerald-300/15 text-emerald-200 hover:bg-emerald-300/30"
          }`}
        >
          {copied ? (
            <>
              <Check className="h-3 w-3" />
              Copied!
            </>
          ) : (
            "Copy"
          )}
        </button>
      </div>
    </div>
  );
}

function PostModal({
  form,
  setForm,
  postingStep,
  setPostingStep,
  roomTag,
  setRoomTag,
  addRoomTag,
  toggleAnyRoom,
  toggleArray,
  submitListing,
  onClose,
  success,
  postedCode,
  postedWhatsAppUrl,
  isSubmitting,
  onSuccessDone,
}: {
  form: Omit<Listing, "id" | "posted">;
  setForm: (next: Partial<Omit<Listing, "id" | "posted">>) => void;
  postingStep: number;
  setPostingStep: (step: number) => void;
  roomTag: string;
  setRoomTag: (value: string) => void;
  addRoomTag: () => void;
  toggleAnyRoom: () => void;
  toggleArray: (key: keyof Listing["wants"], value: string) => void;
  submitListing: (event: FormEvent) => void;
  onClose: () => void;
  success: boolean;
  postedCode: string;
  postedWhatsAppUrl: string;
  isSubmitting: boolean;
  onSuccessDone: () => void;
}) {
  const currentGender = genderForHostel(form.hostel);
  const allowedHostels = hostelsForGender(currentGender);
  const canContinue = isCurrentRoomComplete(form);
  const canPublish = canContinue && isWantedRoomComplete(form);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 grid place-items-end bg-black/64 p-3 backdrop-blur-xl sm:place-items-center"
    >
      <motion.form
        onSubmit={submitListing}
        initial={{ y: 80, opacity: 0, scale: 0.96 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 80, opacity: 0, scale: 0.96 }}
        className="glass relative max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-[2rem] p-5 sm:p-7"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-5 top-5 grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white/75 transition hover:bg-white/16 hover:text-white"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>
        <AnimatePresence>
          {success && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="absolute inset-0 z-10 grid place-items-center rounded-[2rem] bg-[#080914]/90 backdrop-blur-xl"
            >
              <div className="text-center">
                <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-emerald-300 text-[#06130b]">
                  <Check className="h-10 w-10" />
                </div>
                <p className="mt-5 text-3xl font-black">Posted instantly</p>
                <p className="mt-2 text-sm font-bold text-white/55">
                  Your listing is live. Save this code to mark it swapped later.
                </p>
                <SwapCodeBox code={postedCode} />
                <div className="mx-auto mt-5 grid max-w-xs gap-3">
                  <a
                    href={postedWhatsAppUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-12 items-center justify-center rounded-full bg-[#25D366] text-sm font-black text-[#04130a] transition hover:scale-[1.02]"
                  >
                    Open WhatsApp with Code
                  </a>
                  <button
                    type="button"
                    onClick={onSuccessDone}
                    className="h-12 rounded-full border border-white/10 bg-white/8 text-sm font-black text-white/75 transition hover:bg-white/14 hover:text-white"
                  >
                    Done
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div className="pr-12">
          <p className="text-sm font-black text-blue-400">Post My Room</p>
          <h2 className="mt-2 text-3xl font-black tracking-tight">Create a swap listing</h2>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-2 rounded-full bg-white/8 p-1">
          {["Current room", "What you want"].map((step, index) => (
            <button
              key={step}
              type="button"
              onClick={() => setPostingStep(index + 1)}
              className={`h-11 rounded-full text-sm font-black transition ${
                postingStep === index + 1 ? "bg-white text-[#070816]" : "text-white/55 hover:text-white"
              }`}
            >
              {step}
            </button>
          ))}
        </div>
        {postingStep === 1 ? (
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <FormSelect
              label="Hostel"
              value={form.hostel}
              onChange={(value) =>
                setForm({
                  hostel: value,
                  block: value === "M" ? form.block || "A" : undefined,
                  roomType: roomTypesForHostel(value).includes(form.roomType)
                    ? form.roomType
                    : roomTypesForHostel(value)[0],
                  wants: {
                    ...form.wants,
                    hostels: hostelsForGender(genderForHostel(value)).slice(0, 1),
                    blocks: value === "M" ? form.wants.blocks : [],
                  },
                })
              }
              options={hostels}
            />
            {form.hostel === "M" && (
              <FormSelect label="Block" value={form.block || "A"} onChange={(value) => setForm({ block: value })} options={blocks} />
            )}
            <FormInput
              label="Room Number"
              value={form.room}
              onChange={(value) => {
                const room = digitsOnly(value).slice(0, 3);
                setForm({ room, floor: floorForRoom(room) });
              }}
              placeholder="512"
              inputMode="numeric"
            />
            <FormSelect
              label="Floor"
              value={form.floor}
              onChange={(value) => setForm({ floor: value })}
              options={floorOptionsForRoom(form.room)}
            />
            <div className="sm:col-span-2">
              <FormSelect label="Room Type" value={form.roomType} onChange={(value) => setForm({ roomType: value })} options={roomTypesForHostel(form.hostel)} />
            </div>
            <button
              type="button"
              disabled={!canContinue}
              onClick={() => setPostingStep(2)}
              className="sm:col-span-2 mt-2 h-13 rounded-full bg-white text-sm font-black text-[#070816] transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-45"
            >
              Continue
            </button>
          </div>
        ) : (
          <div className="mt-6 space-y-5">
            <div>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-black text-white/70">Exact Room Numbers</p>
                <Tag
                  label="Any Room"
                  active={form.wants.rooms.includes(anyRoomPreference)}
                  onClick={toggleAnyRoom}
                />
              </div>
              <div className="flex gap-2">
                <input
                  value={roomTag}
                  onChange={(event) => {
                    const val = digitsOnly(event.target.value).slice(0, 3);
                    setRoomTag(val);
                    // Auto-select floor based on first digit
                    if (val.length >= 1) {
                      const autoFloor = floorForRoom(val);
                      if (!form.wants.floors.includes(autoFloor)) {
                        setForm({ wants: { ...form.wants, floors: [autoFloor] } });
                      }
                    }
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      addRoomTag();
                    }
                  }}
                  placeholder="346"
                  inputMode="numeric"
                  disabled={form.wants.rooms.includes(anyRoomPreference)}
                  className="h-12 min-w-0 flex-1 rounded-2xl border border-white/10 bg-white/8 px-4 text-sm font-bold outline-none focus:border-cyan-300/60"
                />
                <button
                  type="button"
                  onClick={addRoomTag}
                  disabled={form.wants.rooms.includes(anyRoomPreference)}
                  className="grid h-12 w-12 place-items-center rounded-2xl bg-cyan-300 text-[#061018] transition disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <Plus className="h-5 w-5" />
                </button>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {form.wants.rooms.filter((room) => room !== anyRoomPreference).map((room) => (
                  <Tag key={room} label={room} active onClick={() => toggleArray("rooms", room)} />
                ))}
              </div>
            </div>
            <ChipGroup title="Preferred Hostel" values={allowedHostels} selected={form.wants.hostels} onToggle={(value) => toggleArray("hostels", value)} prefix="Hostel " />
            {form.wants.hostels.includes("M") && (
              <ChipGroup title="Preferred Blocks" values={blocks} selected={form.wants.blocks} onToggle={(value) => toggleArray("blocks", value)} prefix="Block " />
            )}
            <ChipGroup title="Preferred Floors" values={floors} selected={form.wants.floors} onToggle={(value) => toggleArray("floors", value)} />
            <div>
              <span className="mb-2 block text-sm font-black text-white/70">Description <span className="text-white/35 font-semibold text-xs">(optional)</span></span>
              <textarea
                value={form.description ?? ""}
                onChange={(e) => setForm({ description: e.target.value })}
                placeholder="e.g. Looking for attached washroom only, ground floor not preferred, must be same block..."
                rows={3}
                className="w-full rounded-2xl border border-white/10 bg-white/8 px-4 py-3 text-sm font-semibold text-white outline-none placeholder:text-white/30 focus:border-cyan-300/60 resize-none leading-relaxed"
              />
            </div>
            <FormInput
              label="WhatsApp Number"
              value={form.whatsapp}
              onChange={(value) => setForm({ whatsapp: digitsOnly(value).slice(0, 12) })}
              placeholder="91XXXXXXXXXX"
              inputMode="tel"
            />
            <button
              type="submit"
              disabled={isSubmitting || !canPublish}
              className="h-14 w-full rounded-full bg-blue-500 text-sm font-black text-white shadow-[0_12px_40px_rgba(59,130,246,0.25)] transition hover:bg-blue-400 hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-45"
            >
              {isSubmitting ? "Publishing..." : "Publish Swap Request"}
            </button>
          </div>
        )}
      </motion.form>
    </motion.div>
  );
}

function FormSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-black text-white/70">{label}</span>
      <span className="relative block">
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-13 w-full appearance-none rounded-2xl border border-white/10 bg-white/8 px-4 pr-10 text-sm font-bold outline-none focus:border-cyan-300/60"
        >
          {options.map((option) => (
            <option key={option} value={option} className="bg-[#101322]">
              {option}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/55" />
      </span>
    </label>
  );
}

function FormInput({
  label,
  value,
  onChange,
  placeholder,
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  inputMode?: "numeric" | "tel" | "text";
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-black text-white/70">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        inputMode={inputMode}
        className="h-13 w-full rounded-2xl border border-white/10 bg-white/8 px-4 text-sm font-bold outline-none placeholder:text-white/35 focus:border-cyan-300/60"
      />
    </label>
  );
}

function ChipGroup({
  title,
  values,
  selected,
  onToggle,
  prefix = "",
}: {
  title: string;
  values: string[];
  selected: string[];
  onToggle: (value: string) => void;
  prefix?: string;
}) {
  return (
    <div>
      <p className="mb-2 text-sm font-black text-white/70">{title}</p>
      <div className="flex flex-wrap gap-2">
        {values.map((value) => (
          <Tag key={value} label={`${prefix}${value}`} active={selected.includes(value)} onClick={() => onToggle(value)} />
        ))}
      </div>
    </div>
  );
}

function Tag({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-4 py-2 text-sm font-black transition ${
        active
          ? "border-cyan-300/60 bg-cyan-300/15 text-cyan-100"
          : "border-white/10 bg-white/8 text-white/58 hover:border-white/25 hover:text-white"
      }`}
    >
      {label}
    </button>
  );
}

function Footer() {
  const contributors = [
    {
      name: "Anjani Agarwal",
      url: "https://www.linkedin.com/in/anjani-ag24",
    },
    {
      name: "Tatvam Jain",
      url: "https://www.linkedin.com/in/tatvam-jain-41987b217/",
    },
  ];

  return (
    <footer className="relative border-t border-white/[0.06] bg-[#060611]/60 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center gap-3 text-center">

          {/* Tagline */}
          <p className="text-[0.75rem] font-semibold tracking-[0.16em] text-white/25 uppercase">
            Hostel swaps, simplified.
          </p>

          {/* Soft divider */}
          <span className="h-px w-10 bg-gradient-to-r from-transparent via-white/12 to-transparent" />

          {/* Contributors row */}
          <div className="flex flex-col items-center gap-1.5 sm:flex-row sm:items-center sm:gap-1">
            <span className="text-[0.68rem] font-medium tracking-[0.14em] text-white/18 uppercase">
              Built by
            </span>

            {/* Dot separator — desktop only */}
            <span className="hidden sm:inline text-white/15 mx-1 text-xs">·</span>

            <div className="flex flex-col items-center gap-1.5 sm:flex-row sm:gap-4">
              {contributors.map((c, i) => (
                <span key={c.name} className="inline-flex items-center gap-2 sm:gap-1.5">
                  <a
                    href={c.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group relative inline-flex items-center gap-1 text-[0.75rem] font-semibold text-white/35 transition-all duration-300 hover:text-white/85"
                  >
                    <span className="relative">
                      {c.name}
                      {/* Underline glow on hover */}
                      <span className="absolute -bottom-px left-0 h-px w-0 rounded-full bg-gradient-to-r from-blue-400/50 to-violet-400/50 transition-all duration-300 group-hover:w-full" />
                    </span>
                    {/* External link arrow */}
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-2.5 w-2.5 -translate-y-px text-white/18 transition-all duration-300 group-hover:text-blue-400/60 group-hover:translate-x-px group-hover:-translate-y-0.5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M7 17L17 7" />
                      <path d="M7 7h10v10" />
                    </svg>
                  </a>
                  {/* Middle dot separator between names — desktop */}
                  {i < contributors.length - 1 && (
                    <span className="hidden sm:inline text-white/15 text-xs">·</span>
                  )}
                </span>
              ))}
            </div>
          </div>

        </div>
      </div>
    </footer>
  );
}

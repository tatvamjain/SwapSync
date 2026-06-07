"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  MessageCircle,
  Plus,
  RefreshCw,
  X,
  Zap,
} from "lucide-react";

type Listing = {
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
  posted: string;
  createdAt: string;
  status: "active" | "swapped";
};

type SwapChain = [Listing | any, Listing, Listing];

const hostels = [
  "A", "B", "C", "D", "E", "G", "H", "I", "J", "K", "L", "M", "N", "O", "Q", "PG I", "PG II", "FRG", "FRF"
];
const blocks = ["A", "B", "C", "D", "E", "F"];
const floors = ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th"];

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

const roomTypesForHostel = (hostel: string) => roomTypeAvailability[hostel] ?? allRoomTypes;

export default function CircularSwapsPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states for "Your Room"
  const [myHostel, setMyHostel] = useState("A");
  const [myBlock, setMyBlock] = useState("");
  const [myRoom, setMyRoom] = useState("");
  const [myFloor, setMyFloor] = useState("1st");
  const [myRoomType, setMyRoomType] = useState("2S AC Attached Shared by 2 Rooms (2S WST)");

  // Form states for "Desired Room"
  const [wantsHostels, setWantsHostels] = useState<string[]>(["A"]);
  const [wantsBlocks, setWantsBlocks] = useState<string[]>([]);
  const [wantsRooms, setWantsRooms] = useState<string[]>(["Any Room"]);
  const [wantsFloors, setWantsFloors] = useState<string[]>(["1st"]);
  const [roomTag, setRoomTag] = useState("");

  const [hasSearched, setHasSearched] = useState(false);
  const [results, setResults] = useState<SwapChain[]>([]);

  useEffect(() => {
    async function loadListings() {
      try {
        const response = await fetch("/api/listings", { cache: "no-store" });
        if (response.ok) {
          const data = await response.json();
          setListings(data.listings ?? []);
        }
      } catch (err) {
        console.error("Failed to load listings", err);
      } finally {
        setLoading(false);
      }
    }
    loadListings();
  }, []);

  const handleMyRoomChange = (val: string) => {
    const clean = val.replace(/\D/g, "");
    setMyRoom(clean);
    if (clean.length > 0) {
      const firstDigit = Number(clean[0]);
      if (firstDigit >= 1 && firstDigit <= 8) {
        const floorMap = ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th"];
        setMyFloor(floorMap[firstDigit - 1]);
      }
    }
  };

  const handleSearch = () => {
    if (!myRoom) return;

    // Create a virtual listing representing the User (A)
    const userListing = {
      id: -999, // Virtual ID
      hostel: myHostel,
      block: myHostel === "M" ? myBlock || null : null,
      room: Number(myRoom),
      floor: myFloor,
      roomType: myRoomType,
      wants: {
        hostels: wantsHostels,
        blocks: wantsBlocks,
        rooms: wantsRooms,
        floors: wantsFloors,
      },
      whatsapp: "",
      posted: "now",
      createdAt: new Date().toISOString(),
      status: "active" as const,
    };

    const cycles: SwapChain[] = [];
    const uniq = new Set<string>();

    const matchesPref = (listing: Listing, wants: any) => {
      // 1. Hostel must match
      if (!wants.hostels.includes(listing.hostel)) return false;
      // 2. Block must match
      if (listing.hostel === "M" && wants.blocks.length && !wants.blocks.includes(listing.block ?? "")) return false;
      // 3. Floor must match
      if (wants.floors.length && !wants.floors.includes(listing.floor)) return false;
      // 4. Room must match
      const wantsAnyRoom = wants.rooms.includes("Any Room") || wants.rooms.length === 0;
      if (!wantsAnyRoom && !wants.rooms.includes(String(listing.room))) return false;
      return true;
    };

    // Find all B that match User's wants and have the SAME roomType
    const possibleB = listings.filter((b) => b.roomType === userListing.roomType && matchesPref(b, userListing.wants));

    for (const b of possibleB) {
      // Find all C that match B's wants and have the SAME roomType
      const possibleC = listings.filter((c) => {
        if (c.id === b.id) return false;
        if (c.roomType !== b.roomType) return false;
        return matchesPref(c, b.wants);
      });

      for (const c of possibleC) {
        // Check if User matches C's wants
        if (matchesPref(userListing as any, c.wants)) {
          const key = [b.id, c.id].sort((x, y) => x - y).join("-");
          if (!uniq.has(key)) {
            uniq.add(key);
            cycles.push([userListing, b, c]);
          }
        }
      }
    }

    setResults(cycles);
    setHasSearched(true);
  };

  const toggleArray = (arr: string[], setArr: React.Dispatch<React.SetStateAction<string[]>>, val: string) => {
    if (arr.includes(val)) {
      setArr(arr.filter((x) => x !== val));
    } else {
      setArr([...arr, val]);
    }
  };

  const toggleAnyRoom = () => {
    if (wantsRooms.includes("Any Room")) {
      setWantsRooms([]);
    } else {
      setWantsRooms(["Any Room"]);
    }
  };

  const addRoomTag = () => {
    const trimmed = roomTag.trim();
    if (!trimmed) return;
    if (wantsRooms.includes(trimmed)) {
      setRoomTag("");
      return;
    }
    const nextRooms = wantsRooms.filter((r) => r !== "Any Room");
    setWantsRooms([...nextRooms, trimmed]);
    setRoomTag("");
  };

  const removeRoomTag = (room: string) => {
    setWantsRooms(wantsRooms.filter((r) => r !== room));
  };

  return (
    <main className="min-h-screen bg-[#060611] text-white">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,rgba(59,130,246,0.10),transparent_60%),linear-gradient(180deg,#060611_0%,#080d1a_100%)]" />
      
      {/* Navigation */}
      <nav className="border-b border-white/[0.08] bg-[#060611]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center px-4 sm:px-6 lg:px-8">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold text-white/60 hover:text-white transition">
            <ArrowLeft className="h-4 w-4" /> Back to Home
          </Link>
          <span className="ml-auto text-sm font-black text-white">
            <span className="text-blue-400">🔄</span> Circular Swaps
          </span>
        </div>
      </nav>

      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-blue-400/20 bg-blue-400/8 px-3 py-1 text-[0.7rem] font-black uppercase tracking-[0.16em] text-blue-300">
            3-Way Swap Finder
          </span>
          <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl text-white">
            Find Circular Room Swaps
          </h1>
          <p className="mt-2 text-sm text-white/50 max-w-md mx-auto">
            A 3-way circular swap gets you your desired room even when no direct swap exists.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {/* Step 1: Your Room */}
          <div className="rounded-2xl border border-white/[0.09] bg-white/[0.04] p-5 sm:p-6 flex flex-col gap-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-white/[0.07]">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-blue-500/15 text-blue-400">
                <span className="text-sm">🏠</span>
              </div>
              <div>
                <p className="text-[0.65rem] font-black uppercase tracking-[0.14em] text-blue-400">Step 1</p>
                <h2 className="text-sm font-black text-white leading-tight">Your Current Room</h2>
              </div>
            </div>
            
            <div className={`grid gap-3 ${myHostel === "M" ? "grid-cols-2" : "grid-cols-1"}`}>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-white/45">Hostel</label>
                <select
                  value={myHostel}
                  onChange={(e) => {
                    const selected = e.target.value;
                    setMyHostel(selected);
                    if (selected !== "M") setMyBlock("");
                    const availableTypes = roomTypesForHostel(selected);
                    setMyRoomType(availableTypes[0] ?? "");
                  }}
                  className="h-11 rounded-xl border border-white/[0.09] bg-white/[0.06] px-3 text-sm font-semibold text-white outline-none focus:border-blue-400/40 transition"
                >
                  {hostels.map((h) => (
                    <option key={h} value={h} className="bg-[#0d1020] text-white">Hostel {h}</option>
                  ))}
                </select>
              </div>

              {myHostel === "M" && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-white/45">Block</label>
                  <select
                    value={myBlock}
                    onChange={(e) => setMyBlock(e.target.value)}
                    className="h-11 rounded-xl border border-white/[0.09] bg-white/[0.06] px-3 text-sm font-semibold text-white outline-none focus:border-blue-400/40 transition"
                  >
                    <option value="" className="bg-[#0d1020] text-white">Select Block</option>
                    {blocks.map((b) => (
                      <option key={b} value={b} className="bg-[#0d1020] text-white">Block {b}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-white/45">Room Number</label>
                <input
                  type="text"
                  placeholder="e.g. 312"
                  value={myRoom}
                  onChange={(e) => handleMyRoomChange(e.target.value)}
                  className="h-11 rounded-xl border border-white/[0.09] bg-white/[0.06] px-3 text-sm font-semibold text-white outline-none placeholder:text-white/25 focus:border-blue-400/40 transition"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-white/45">Floor</label>
                <select
                  value={myFloor}
                  onChange={(e) => setMyFloor(e.target.value)}
                  className="h-11 rounded-xl border border-white/[0.09] bg-white/[0.06] px-3 text-sm font-semibold text-white outline-none focus:border-blue-400/40 transition"
                >
                  {floors.map((f) => (
                    <option key={f} value={f} className="bg-[#0d1020] text-white">{f} Floor</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-white/45">Room Type</label>
              <select
                value={myRoomType}
                onChange={(e) => setMyRoomType(e.target.value)}
                className="h-11 rounded-xl border border-white/[0.09] bg-white/[0.06] px-3 text-sm font-semibold text-white outline-none focus:border-blue-400/40 transition"
              >
                {roomTypesForHostel(myHostel).map((rt) => (
                  <option key={rt} value={rt} className="bg-[#0d1020] text-white">{rt}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Step 2: Desired Room */}
          <div className="rounded-2xl border border-white/[0.09] bg-white/[0.04] p-5 sm:p-6 flex flex-col gap-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-white/[0.07]">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-cyan-500/15 text-cyan-400">
                <span className="text-sm">🎯</span>
              </div>
              <div>
                <p className="text-[0.65rem] font-black uppercase tracking-[0.14em] text-cyan-400">Step 2</p>
                <h2 className="text-sm font-black text-white leading-tight">Your Desired Room</h2>
              </div>
            </div>

            {/* Preferred Room Numbers with Tag Input */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-white/45">Preferred Room Numbers</label>
                <button
                  onClick={toggleAnyRoom}
                  className={`h-6 rounded-full px-2.5 text-[0.65rem] font-bold border transition ${
                    wantsRooms.includes("Any Room")
                      ? "bg-blue-500/20 border-blue-400/40 text-blue-200"
                      : "bg-white/[0.05] border-white/[0.09] text-white/50 hover:text-white"
                  }`}
                >
                  Any Room
                </button>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. 346"
                  value={roomTag}
                  onChange={(e) => setRoomTag(e.target.value.replace(/\D/g, "").slice(0, 3))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addRoomTag();
                    }
                  }}
                  disabled={wantsRooms.includes("Any Room")}
                  className="h-11 min-w-0 flex-1 rounded-xl border border-white/[0.09] bg-white/[0.06] px-3 text-sm font-semibold text-white outline-none placeholder:text-white/25 focus:border-blue-400/40 disabled:opacity-40 transition"
                />
                <button
                  onClick={addRoomTag}
                  disabled={wantsRooms.includes("Any Room")}
                  className="grid h-11 w-11 place-items-center rounded-xl bg-blue-500 text-white hover:bg-blue-400 transition disabled:opacity-40"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              
              {/* Render Room Tags */}
              {!wantsRooms.includes("Any Room") && wantsRooms.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {wantsRooms.map((room) => (
                    <button
                      key={room}
                      onClick={() => removeRoomTag(room)}
                      className="inline-flex items-center gap-1.5 h-7 rounded-full bg-blue-500/15 border border-blue-400/30 px-2.5 text-[0.68rem] font-bold text-blue-200 hover:bg-blue-500/25 transition"
                    >
                      {room} <X className="h-3 w-3" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-white/45">Preferred Hostels</label>
              <div className="flex flex-wrap gap-1.5">
                {hostels.map((h) => (
                  <button
                    key={h}
                    onClick={() => toggleArray(wantsHostels, setWantsHostels, h)}
                    className={`h-8 min-w-8 px-2.5 rounded-lg text-xs font-bold transition flex items-center justify-center border ${
                      wantsHostels.includes(h)
                        ? "bg-blue-500/20 border-blue-400/40 text-blue-200"
                        : "bg-white/[0.04] border-white/[0.09] text-white/55 hover:text-white hover:border-white/20"
                    }`}
                  >
                    {h}
                  </button>
                ))}
              </div>
            </div>

            {wantsHostels.includes("M") && (
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-white/45">Preferred Blocks (Hostel M)</label>
                <div className="flex flex-wrap gap-1.5">
                  {blocks.map((b) => (
                    <button
                      key={b}
                      onClick={() => toggleArray(wantsBlocks, setWantsBlocks, b)}
                      className={`h-8 min-w-8 px-2.5 rounded-lg text-xs font-bold transition flex items-center justify-center border ${
                        wantsBlocks.includes(b)
                          ? "bg-blue-500/20 border-blue-400/40 text-blue-200"
                          : "bg-white/[0.04] border-white/[0.09] text-white/55 hover:text-white hover:border-white/20"
                      }`}
                    >
                      {b}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-white/45">Preferred Floors</label>
              <div className="flex flex-wrap gap-1.5">
                {floors.map((f) => (
                  <button
                    key={f}
                    onClick={() => toggleArray(wantsFloors, setWantsFloors, f)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition border ${
                      wantsFloors.includes(f)
                        ? "bg-blue-500/20 border-blue-400/40 text-blue-200"
                        : "bg-white/[0.04] border-white/[0.09] text-white/55 hover:text-white hover:border-white/20"
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 text-center">
          <button
            onClick={handleSearch}
            disabled={!myRoom}
            className="inline-flex h-12 items-center gap-2 rounded-full bg-white px-8 text-sm font-black text-[#060611] shadow-[0_8px_30px_rgba(255,255,255,0.12)] hover:shadow-[0_12px_40px_rgba(255,255,255,0.18)] hover:scale-[1.02] transition disabled:opacity-40 disabled:scale-100 disabled:cursor-not-allowed"
          >
            <RefreshCw className="h-4 w-4" /> Check Circular Swaps
          </button>
        </div>

        {/* Results Section */}
        <div className="mt-10">
          {loading ? (
            <div className="text-center py-12">
              <RefreshCw className="h-7 w-7 animate-spin mx-auto text-blue-400 mb-3" />
              <p className="text-sm text-white/45">Loading live boards...</p>
            </div>
          ) : hasSearched ? (
            results.length > 0 ? (
              <div className="flex flex-col gap-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black text-white">{results.length} swap loop{results.length > 1 ? "s" : ""} found</h3>
                  </div>
                  <span className="rounded-full border border-blue-400/25 bg-blue-400/10 px-2.5 py-0.5 text-xs font-black text-blue-300">
                    Perfect matches
                  </span>
                </div>
                
                <div className="grid gap-4">
                  {results.map((chain, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.06 }}
                      className="rounded-2xl border border-white/[0.09] bg-white/[0.03] p-5"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-[0.65rem] font-black uppercase tracking-[0.14em] text-white/40">
                          Option {index + 1}
                        </span>
                        <span className="text-[0.65rem] font-black uppercase tracking-[0.14em] text-blue-400">
                          3-Way Circular
                        </span>
                      </div>

                      {/* Flow map */}
                      <div className="flex flex-col md:flex-row items-stretch gap-2">
                        {/* Node 1: You */}
                        <div className="flex-1 rounded-xl border border-blue-400/20 bg-blue-400/[0.05] p-3.5 flex flex-col justify-between">
                          <div>
                            <p className="text-[0.6rem] font-black uppercase tracking-[0.14em] text-blue-400 mb-1">You (A)</p>
                            <p className="text-xl font-black">Room {chain[0].room}</p>
                            <p className="text-xs text-white/45 mt-0.5">Hostel {chain[0].hostel}</p>
                            <p className="text-[0.6rem] text-white/35 mt-1">{chain[0].roomType}</p>
                          </div>
                          <p className="text-[0.6rem] text-white/35 mt-3 pt-2 border-t border-white/[0.06]">
                            → wants Room {chain[1].room}
                          </p>
                        </div>

                        {/* Connector 1 */}
                        <div className="flex items-center justify-center text-white/20 py-1 md:py-0">
                          <ArrowRight className="hidden md:block h-4 w-4" />
                          <ArrowDown className="md:hidden h-4 w-4" />
                        </div>

                        {/* Node 2: Student B */}
                        <div className="flex-1 rounded-xl border border-white/[0.08] bg-white/[0.04] p-3.5 flex flex-col justify-between">
                          <div>
                            <p className="text-[0.6rem] font-black uppercase tracking-[0.14em] text-white/40 mb-1">Student B</p>
                            <p className="text-xl font-black">Room {chain[1].room}</p>
                            <p className="text-xs text-white/45 mt-0.5">Hostel {chain[1].hostel}</p>
                            <p className="text-[0.6rem] text-white/35 mt-1">{chain[1].roomType}</p>
                          </div>
                          <div className="mt-3 pt-2 border-t border-white/[0.06] flex items-center justify-between gap-2">
                            <span className="text-[0.6rem] text-white/35">→ wants Room {chain[2].room}</span>
                            <a
                              href={`https://wa.me/${chain[1].whatsapp}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex h-7 items-center gap-1 rounded-full bg-[#25D366] px-2.5 text-[0.62rem] font-black text-[#04130a] hover:opacity-90 transition"
                            >
                              <MessageCircle className="h-3 w-3" /> Chat
                            </a>
                          </div>
                        </div>

                        {/* Connector 2 */}
                        <div className="flex items-center justify-center text-white/20 py-1 md:py-0">
                          <ArrowRight className="hidden md:block h-4 w-4" />
                          <ArrowDown className="md:hidden h-4 w-4" />
                        </div>

                        {/* Node 3: Student C */}
                        <div className="flex-1 rounded-xl border border-white/[0.08] bg-white/[0.04] p-3.5 flex flex-col justify-between">
                          <div>
                            <p className="text-[0.6rem] font-black uppercase tracking-[0.14em] text-white/40 mb-1">Student C</p>
                            <p className="text-xl font-black">Room {chain[2].room}</p>
                            <p className="text-xs text-white/45 mt-0.5">Hostel {chain[2].hostel}</p>
                            <p className="text-[0.6rem] text-white/35 mt-1">{chain[2].roomType}</p>
                          </div>
                          <div className="mt-3 pt-2 border-t border-white/[0.06] flex items-center justify-between gap-2">
                            <span className="text-[0.6rem] text-white/35">→ wants your room</span>
                            <a
                              href={`https://wa.me/${chain[2].whatsapp}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex h-7 items-center gap-1 rounded-full bg-[#25D366] px-2.5 text-[0.62rem] font-black text-[#04130a] hover:opacity-90 transition"
                            >
                              <MessageCircle className="h-3 w-3" /> Chat
                            </a>
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 rounded-lg border border-white/[0.07] bg-white/[0.03] px-3 py-2">
                        <p className="text-[0.65rem] text-white/45">
                          🔄 You give <strong className="text-white/70">{chain[0].room}</strong> to C · C gives <strong className="text-white/70">{chain[2].room}</strong> to B · B gives <strong className="text-white/70">{chain[1].room}</strong> to you
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-white/[0.09] bg-white/[0.03] p-10 text-center">
                <p className="text-3xl mb-3">🔍</p>
                <h3 className="text-base font-black text-white">No loop found</h3>
                <p className="text-sm text-white/45 mt-1.5 max-w-sm mx-auto">
                  Try broadening your room choices or hostels, or post your room on the main board.
                </p>
              </div>
            )
          ) : (
            <div className="rounded-2xl border border-white/[0.09] bg-white/[0.03] p-10 text-center">
              <p className="text-3xl mb-3">☝️</p>
              <h3 className="text-base font-black text-white">Fill in the details above</h3>
              <p className="text-sm text-white/45 mt-1.5">
                We'll scan active listings to find a complete 3-way loop for you.
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

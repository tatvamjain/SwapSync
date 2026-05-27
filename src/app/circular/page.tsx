"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
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
  "A", "B", "C", "D", "E", "G", "H", "I", "J", "K", "L", "M", "N", "O", "Q", "PG I", "PG II"
];
const blocks = ["A", "B", "C", "D", "E", "F"];
const floors = ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th"];
const roomTypes = [
  "2S AC Attached Shared by 2 Rooms (2S WST)",
  "1S AC Attached Shared",
  "1S Non-AC",
  "2S AC Attached (2WAT)",
  "2S Non-AC",
];

export default function CircularSwapsPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states for "Your Room"
  const [myHostel, setMyHostel] = useState("A");
  const [myBlock, setMyBlock] = useState("");
  const [myRoom, setMyRoom] = useState("");
  const [myFloor, setMyFloor] = useState("1st");
  const [myRoomType, setMyRoomType] = useState(roomTypes[0]);

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

    // Find all B that match User's wants
    const possibleB = listings.filter((b) => matchesPref(b, userListing.wants));

    for (const b of possibleB) {
      // Find all C that match B's wants
      const possibleC = listings.filter((c) => {
        if (c.id === b.id) return false;
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
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_20%_10%,rgba(76,201,240,0.15),transparent_30%),radial-gradient(circle_at_80%_90%,rgba(217,70,239,0.12),transparent_30%),linear-gradient(135deg,#060611_0%,#0c1024_100%)]" />
      
      {/* Navigation */}
      <nav className="border-b border-white/10 bg-[#060611]/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center px-4 sm:px-6 lg:px-8">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold text-white/70 hover:text-white transition">
            <ArrowLeft className="h-4 w-4" /> Back to Home
          </Link>
          <span className="ml-auto text-sm font-black text-cyan-200">
            🔄 Circular Swaps Tool
          </span>
        </div>
      </nav>

      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-black tracking-tight sm:text-5xl bg-gradient-to-r from-cyan-300 via-blue-400 to-fuchsia-400 bg-clip-text text-transparent">
            Find Circular Room Swaps
          </h1>
          <p className="mt-3 text-base text-white/60">
            A 3-way circular swap allows you to get your desired room even when direct swaps are not available.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Step 1: Your Room */}
          <div className="glass rounded-[2rem] p-6 flex flex-col gap-4 border border-white/10">
            <h2 className="text-lg font-black text-cyan-100 flex items-center gap-2">
              <span>🏠</span> 1. Enter Your Current Room
            </h2>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-black text-white/50">Hostel</label>
                <select
                  value={myHostel}
                  onChange={(e) => {
                    setMyHostel(e.target.value);
                    if (e.target.value !== "M") setMyBlock("");
                  }}
                  className="h-11 rounded-xl border border-white/10 bg-white/7 px-3 text-sm font-semibold text-white outline-none"
                >
                  {hostels.map((h) => (
                    <option key={h} value={h} className="bg-[#0b0c22] text-white">Hostel {h}</option>
                  ))}
                </select>
              </div>

              {myHostel === "M" && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-black text-white/50">Block</label>
                  <select
                    value={myBlock}
                    onChange={(e) => setMyBlock(e.target.value)}
                    className="h-11 rounded-xl border border-white/10 bg-white/7 px-3 text-sm font-semibold text-white outline-none"
                  >
                    <option value="" className="bg-[#0b0c22] text-white">Select Block</option>
                    {blocks.map((b) => (
                      <option key={b} value={b} className="bg-[#0b0c22] text-white">Block {b}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-black text-white/50">Room Number</label>
                <input
                  type="text"
                  placeholder="e.g. 312"
                  value={myRoom}
                  onChange={(e) => handleMyRoomChange(e.target.value)}
                  className="h-11 rounded-xl border border-white/10 bg-white/7 px-3 text-sm font-semibold text-white outline-none placeholder:text-white/30"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-black text-white/50">Floor</label>
                <select
                  value={myFloor}
                  onChange={(e) => setMyFloor(e.target.value)}
                  className="h-11 rounded-xl border border-white/10 bg-white/7 px-3 text-sm font-semibold text-white outline-none"
                >
                  {floors.map((f) => (
                    <option key={f} value={f} className="bg-[#0b0c22] text-white">{f} Floor</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-black text-white/50">Room Type</label>
              <select
                value={myRoomType}
                onChange={(e) => setMyRoomType(e.target.value)}
                className="h-11 rounded-xl border border-white/10 bg-white/7 px-3 text-sm font-semibold text-white outline-none"
              >
                {roomTypes.map((rt) => (
                  <option key={rt} value={rt} className="bg-[#0b0c22] text-white">{rt}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Step 2: Desired Room */}
          <div className="glass rounded-[2rem] p-6 flex flex-col gap-4 border border-white/10">
            <h2 className="text-lg font-black text-fuchsia-200 flex items-center gap-2">
              <span>🎯</span> 2. Enter Your Desired Room
            </h2>

            {/* Preferred Room Numbers with Tag Input */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-white/50">Preferred Room Numbers</label>
                <button
                  onClick={toggleAnyRoom}
                  className={`h-6 rounded-full px-2.5 text-[0.65rem] font-bold border transition ${
                    wantsRooms.includes("Any Room")
                      ? "bg-fuchsia-500/25 border-fuchsia-400/50 text-fuchsia-200"
                      : "bg-white/5 border-white/10 text-white/60 hover:text-white"
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
                  className="h-11 min-w-0 flex-1 rounded-xl border border-white/10 bg-white/7 px-3 text-sm font-semibold text-white outline-none placeholder:text-white/30 focus:border-fuchsia-400/40 disabled:opacity-40"
                />
                <button
                  onClick={addRoomTag}
                  disabled={wantsRooms.includes("Any Room")}
                  className="grid h-11 w-11 place-items-center rounded-xl bg-fuchsia-400 text-black hover:scale-105 transition disabled:opacity-40 disabled:hover:scale-100"
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
                      className="inline-flex items-center gap-1.5 h-7 rounded-full bg-fuchsia-500/20 border border-fuchsia-400/40 px-2.5 text-[0.68rem] font-bold text-fuchsia-200 hover:bg-fuchsia-500/30 transition"
                    >
                      {room} <X className="h-3 w-3 text-fuchsia-300" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-black text-white/50">Preferred Hostels</label>
              <div className="flex flex-wrap gap-1.5">
                {hostels.map((h) => (
                  <button
                    key={h}
                    onClick={() => toggleArray(wantsHostels, setWantsHostels, h)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition ${
                      wantsHostels.includes(h)
                        ? "bg-fuchsia-500/25 border border-fuchsia-400/50 text-fuchsia-200"
                        : "bg-white/5 border border-white/10 text-white/60 hover:text-white"
                    }`}
                  >
                    Hostel {h}
                  </button>
                ))}
              </div>
            </div>

            {wantsHostels.includes("M") && (
              <div className="flex flex-col gap-2">
                <label className="text-xs font-black text-white/50">Preferred Blocks (Hostel M)</label>
                <div className="flex flex-wrap gap-1.5">
                  {blocks.map((b) => (
                    <button
                      key={b}
                      onClick={() => toggleArray(wantsBlocks, setWantsBlocks, b)}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold transition ${
                        wantsBlocks.includes(b)
                          ? "bg-fuchsia-500/25 border border-fuchsia-400/50 text-fuchsia-200"
                          : "bg-white/5 border border-white/10 text-white/60 hover:text-white"
                      }`}
                    >
                      Block {b}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <label className="text-xs font-black text-white/50">Preferred Floors</label>
              <div className="flex flex-wrap gap-1.5">
                {floors.map((f) => (
                  <button
                    key={f}
                    onClick={() => toggleArray(wantsFloors, setWantsFloors, f)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition ${
                      wantsFloors.includes(f)
                        ? "bg-fuchsia-500/25 border border-fuchsia-400/50 text-fuchsia-200"
                        : "bg-white/5 border border-white/10 text-white/60 hover:text-white"
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center">
          <button
            onClick={handleSearch}
            disabled={!myRoom}
            className="inline-flex h-13 items-center gap-2 rounded-full bg-gradient-to-r from-cyan-300 via-blue-400 to-fuchsia-400 px-8 text-sm font-black text-[#050711] shadow-[0_15px_45px_rgba(56,189,248,0.25)] hover:scale-105 transition disabled:opacity-50 disabled:scale-100"
          >
            <RefreshCw className="h-4 w-4 animate-spin-slow" /> Check Circular Swaps
          </button>
        </div>

        {/* Results Section */}
        <div className="mt-12">
          {loading ? (
            <div className="text-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto text-cyan-300 mb-3" />
              <p className="text-sm text-white/50">Loading live boards...</p>
            </div>
          ) : hasSearched ? (
            results.length > 0 ? (
              <div className="flex flex-col gap-6">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🎉</span>
                  <h3 className="text-xl font-black">We found {results.length} swap loops!</h3>
                </div>
                
                <div className="grid gap-6">
                  {results.map((chain, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="glass border border-fuchsia-400/20 bg-gradient-to-br from-[#0c0d21] to-[#121635] rounded-[2rem] p-6 relative overflow-hidden"
                    >
                      <div className="absolute top-0 right-0 h-24 w-24 bg-fuchsia-400/10 rounded-full blur-2xl" />
                      
                      <div className="flex flex-col gap-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <span className="text-xs font-black uppercase tracking-[0.16em] text-fuchsia-300">
                            3-Way Swap Option {index + 1}
                          </span>
                          <span className="text-xs font-semibold text-emerald-300">
                            Perfect Loop
                          </span>
                        </div>

                        {/* Interactive flow map */}
                        <div className="grid gap-3 md:grid-cols-3">
                          {/* Node 1: You */}
                          <div className="rounded-[1.25rem] border border-cyan-400/20 bg-cyan-400/5 p-4 flex flex-col justify-between">
                            <div>
                              <p className="text-[0.65rem] font-bold text-cyan-300 uppercase">Your Room (A)</p>
                              <p className="text-2xl font-black mt-1">Room {chain[0].room}</p>
                              <p className="text-xs text-white/55 mt-0.5">Hostel {chain[0].hostel}</p>
                            </div>
                            <p className="text-xs text-white/40 mt-3 italic border-t border-white/5 pt-2">
                              Wants Room {chain[1].room}
                            </p>
                          </div>

                          {/* Node 2: Student B */}
                          <div className="rounded-[1.25rem] border border-white/10 bg-white/6 p-4 flex flex-col justify-between">
                            <div>
                              <p className="text-[0.65rem] font-bold text-white/50 uppercase">Student (B)</p>
                              <p className="text-2xl font-black mt-1">Room {chain[1].room}</p>
                              <p className="text-xs text-white/55 mt-0.5">Hostel {chain[1].hostel}</p>
                            </div>
                            <div className="mt-3 border-t border-white/5 pt-2 flex items-center justify-between">
                              <span className="text-xs text-white/40 italic">Wants Room {chain[2].room}</span>
                              <a
                                href={`https://wa.me/${chain[1].whatsapp}`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex h-7 items-center gap-1 rounded-full bg-emerald-400 px-2.5 text-[0.65rem] font-black text-black hover:scale-105 transition"
                              >
                                <MessageCircle className="h-3 w-3" /> Chat
                              </a>
                            </div>
                          </div>

                          {/* Node 3: Student C */}
                          <div className="rounded-[1.25rem] border border-white/10 bg-white/6 p-4 flex flex-col justify-between">
                            <div>
                              <p className="text-[0.65rem] font-bold text-white/50 uppercase">Student (C)</p>
                              <p className="text-2xl font-black mt-1">Room {chain[2].room}</p>
                              <p className="text-xs text-white/55 mt-0.5">Hostel {chain[2].hostel}</p>
                            </div>
                            <div className="mt-3 border-t border-white/5 pt-2 flex items-center justify-between">
                              <span className="text-xs text-white/40 italic">Wants Your Room</span>
                              <a
                                href={`https://wa.me/${chain[2].whatsapp}`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex h-7 items-center gap-1 rounded-full bg-emerald-400 px-2.5 text-[0.65rem] font-black text-black hover:scale-105 transition"
                              >
                                <MessageCircle className="h-3 w-3" /> Chat
                              </a>
                            </div>
                          </div>
                        </div>

                        <div className="text-center rounded-xl bg-fuchsia-400/5 border border-fuchsia-400/10 p-3 mt-2">
                          <p className="text-xs font-semibold text-fuchsia-200">
                            🔄 Loop Map: You give {chain[0].room} to Student C → Student C gives {chain[2].room} to Student B → Student B gives {chain[1].room} to you.
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="glass border border-white/10 rounded-[2rem] p-12 text-center">
                <p className="text-4xl">🔍</p>
                <h3 className="text-xl font-black mt-4">No loop found for this preference</h3>
                <p className="text-sm text-white/50 mt-2 max-w-md mx-auto">
                  Try broadening your desired room choices or matching hostels, or post your own room on the board to let others find you.
                </p>
              </div>
            )
          ) : (
            <div className="glass border border-white/10 rounded-[2rem] p-12 text-center">
              <p className="text-4xl">👈</p>
              <h3 className="text-xl font-black mt-4">Enter details above to check</h3>
              <p className="text-sm text-white/50 mt-2">
                We'll scan the active boards to construct a full 3-way circular loop including your room.
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

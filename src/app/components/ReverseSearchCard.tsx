import React, { useState } from 'react';
import { Search, ChevronsRight } from 'lucide-react';

interface ReverseSearchCardProps {
  onResults: (results: any) => void;
}

export default function ReverseSearchCard({ onResults }: ReverseSearchCardProps) {
  const [hostel, setHostel] = useState('');
  const [block, setBlock] = useState('');
  const [room, setRoom] = useState('');

  const handleSearch = async () => {
    if (!hostel || !room) return;
    const params = new URLSearchParams({ hostel, room });
    if (block) params.append('block', block);
    const res = await fetch(`/api/matches?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      onResults(data);
    }
  };

  const isMHostel = hostel === 'M';

  return (
    <div className="glass rounded-[1.8rem] p-6 mb-6 flex flex-col gap-4">
      <h2 className="text-xl font-black text-cyan-100">🔍 See Who Wants Your Room</h2>
      <p className="text-sm text-white/70">Enter your room and instantly check if anyone is looking for it.</p>
      <div className="flex flex-wrap gap-3">
        <select
          value={hostel}
          onChange={(e) => setHostel(e.target.value)}
          className="h-11 rounded-full border border-white/10 bg-white/9 px-4 text-sm font-bold text-white outline-none"
        >
          <option value="">Select Hostel</option>
          {['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z'].map((h) => (
            <option key={h} value={h}>Hostel {h}</option>
          ))}
        </select>
        {isMHostel && (
          <select
            value={block}
            onChange={(e) => setBlock(e.target.value)}
            className="h-11 rounded-full border border-white/10 bg-white/9 px-4 text-sm font-bold text-white outline-none"
          >
            <option value="">Any Block</option>
            {['A','B','C','D','E','F'].map((b) => (
              <option key={b} value={b}>Block {b}</option>
            ))}
          </select>
        )}
        <input
          type="text"
          placeholder="Room number"
          value={room}
          onChange={(e) => setRoom(e.target.value)}
          className="h-11 flex-1 rounded-full border border-white/10 bg-white/9 px-4 text-sm font-bold text-white outline-none"
        />
        <button
          onClick={handleSearch}
          className="inline-flex items-center gap-2 rounded-full bg-cyan-300 px-4 py-2 text-sm font-black text-white hover:scale-105 transition"
        >
          Find Matches <ChevronsRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

import React from 'react';

export default function MatchBadge({ score }: { score: number }) {
  const color = score >= 90 ? 'bg-gradient-to-r from-emerald-400 to-cyan-400' :
                score >= 70 ? 'bg-gradient-to-r from-amber-400 to-orange-500' :
                'bg-gradient-to-r from-gray-400 to-gray-600';
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[0.65rem] font-black text-white shadow-md ${color}`}>
      {score}% Match
    </span>
  );
}

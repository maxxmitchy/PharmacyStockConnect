import React from 'react';
import { Pharmacy, ResponseStatus } from '../types';
import { ThumbsUp, Clock, AlertCircle } from 'lucide-react';

interface StatsProps {
  pharmacies: Pharmacy[];
}

export const Stats: React.FC<StatsProps> = ({ pharmacies }) => {
  const total = pharmacies.length;
  const available = pharmacies.filter(p => p.responseStatus === ResponseStatus.AVAILABLE).length;
  const pending = pharmacies.filter(p => p.responseStatus === ResponseStatus.PENDING).length;
  
  // Calculate success rate based on resolved queries (Available vs Unavailable)
  const resolved = pharmacies.filter(p => p.responseStatus === ResponseStatus.AVAILABLE || p.responseStatus === ResponseStatus.UNAVAILABLE).length;
  const successRate = resolved === 0 ? 0 : Math.round((available / resolved) * 100);

  return (
    <div className="grid grid-cols-3 gap-4 mb-6">
      
      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-between">
        <span className="text-yellow-600 text-xs font-semibold uppercase tracking-wider flex items-center gap-1">
            <Clock size={14}/> Pending Replies
        </span>
        <div className="flex items-end justify-between mt-2">
            <span className="text-3xl font-bold text-gray-800">{pending}</span>
            <span className="text-xs text-gray-400">of {total} total</span>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-between">
        <span className="text-green-600 text-xs font-semibold uppercase tracking-wider flex items-center gap-1">
            <ThumbsUp size={14}/> Stock Found
        </span>
        <div className="flex items-end justify-between mt-2">
            <span className="text-3xl font-bold text-green-700">{available}</span>
            <span className="text-xs text-gray-400">{successRate}% positive</span>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-between">
         <span className="text-blue-600 text-xs font-semibold uppercase tracking-wider flex items-center gap-1">
            <AlertCircle size={14}/> Action Required
        </span>
        <div className="flex items-end justify-between mt-2">
            <span className="text-3xl font-bold text-blue-700">
                {pharmacies.filter(p => p.responseStatus === ResponseStatus.UNKNOWN).length}
            </span>
            <span className="text-xs text-gray-400">unsent</span>
        </div>
      </div>
      
    </div>
  );
};
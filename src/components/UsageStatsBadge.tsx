import React from 'react';
import { BarChart3 } from 'lucide-react';

interface UsageStatsIconButtonProps {
  onClick: () => void;
}

export const UsageStatsIconButton: React.FC<UsageStatsIconButtonProps> = ({ onClick }) => {
  return (
    <button
      id="usage-stats-trigger-btn"
      onClick={onClick}
      type="button"
      className="inline-flex items-center justify-center p-1.5 text-gray-400 hover:text-emerald-600 bg-white hover:bg-emerald-50/80 border border-gray-200 hover:border-emerald-300 rounded-lg shadow-2xs transition-all duration-150 cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 active:scale-95 group"
      title="View Usage Statistics"
      aria-label="View Usage Statistics"
    >
      <BarChart3 className="w-4 h-4 transition-transform duration-150 group-hover:scale-110" />
    </button>
  );
};

// Also export as UsageStatsBadge for compatibility
export const UsageStatsBadge = UsageStatsIconButton;



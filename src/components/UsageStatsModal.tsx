import React from 'react';
import { 
  Users, 
  Activity, 
  RefreshCw, 
  X, 
  TrendingUp, 
  Calculator 
} from 'lucide-react';
import { GlobalStats, LocalDeviceStats } from '../utils/analytics';

interface UsageStatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  stats: GlobalStats | null;
  localStats: LocalDeviceStats;
  isRefreshing: boolean;
  onRefresh: () => void;
}

export const UsageStatsModal: React.FC<UsageStatsModalProps> = ({
  isOpen,
  onClose,
  stats,
  localStats,
  isRefreshing,
  onRefresh,
}) => {
  if (!isOpen) return null;

  const formatDate = (isoStr?: string) => {
    if (!isoStr) return '--';
    try {
      return new Date(isoStr).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoStr;
    }
  };

  return (
    <div 
      id="usage-stats-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        id="usage-stats-modal-card"
        className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-gray-100 transform transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 px-6 py-5 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white/15 rounded-xl backdrop-blur-sm">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold tracking-tight">Link Usage Statistics</h3>
              <p className="text-xs text-emerald-100">Live tracker of unique visitors & usage count</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              id="refresh-stats-btn"
              onClick={onRefresh}
              disabled={isRefreshing}
              className={`p-2 hover:bg-white/20 rounded-lg text-white transition-all cursor-pointer ${
                isRefreshing ? 'opacity-70 animate-spin' : ''
              }`}
              title="Refresh real-time data"
              aria-label="Refresh real-time data"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
            <button
              id="close-stats-modal-btn"
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg text-white transition-colors cursor-pointer"
              title="Close"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          
          {/* Status Indicator */}
          <div className="flex items-center justify-between text-xs text-gray-500 bg-gray-50 px-3.5 py-2.5 rounded-xl border border-gray-100">
            <span className="flex items-center space-x-2">
              <span className={`w-2 h-2 rounded-full ${stats?.isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'}`} />
              <span className="font-medium text-gray-700">
                {stats?.isOnline ? 'Live Cloud Sync Active' : 'Offline / Local Cache'}
              </span>
            </span>
            <span>Updated: {formatDate(stats?.lastUpdated)}</span>
          </div>

          {/* Key Metric Cards */}
          <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
            {/* Unique Users */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50/60 p-3.5 sm:p-4 rounded-xl border border-blue-100 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs sm:text-sm font-semibold text-blue-900 leading-tight">Unique Users</span>
                <span className="p-1 sm:p-1.5 bg-blue-500/10 text-blue-600 rounded-lg shrink-0 ml-1">
                  <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </span>
              </div>
              <div>
                <div className="flex items-baseline space-x-1">
                  <span className="text-2xl sm:text-3xl font-extrabold text-blue-950 font-mono">
                    {stats ? stats.uniqueUsers.toLocaleString() : '--'}
                  </span>
                  <span className="text-[11px] text-blue-700 font-medium">people</span>
                </div>
                <p className="text-[11px] text-blue-600/80 mt-1 leading-tight">Unique visitors</p>
              </div>
            </div>

            {/* Total Visits */}
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50/60 p-3.5 sm:p-4 rounded-xl border border-emerald-100 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs sm:text-sm font-semibold text-emerald-900 leading-tight">Link Visits</span>
                <span className="p-1 sm:p-1.5 bg-emerald-500/10 text-emerald-600 rounded-lg shrink-0 ml-1">
                  <Activity className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </span>
              </div>
              <div>
                <div className="flex items-baseline space-x-1">
                  <span className="text-2xl sm:text-3xl font-extrabold text-emerald-950 font-mono">
                    {stats ? stats.totalVisits.toLocaleString() : '--'}
                  </span>
                  <span className="text-[11px] text-emerald-700 font-medium">times</span>
                </div>
                <p className="text-[11px] text-emerald-600/80 mt-1 leading-tight">Page sessions</p>
              </div>
            </div>

            {/* Total Calculations */}
            <div className="bg-gradient-to-br from-amber-50 to-orange-50/60 p-3.5 sm:p-4 rounded-xl border border-amber-100 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs sm:text-sm font-semibold text-amber-900 leading-tight">Calculations</span>
                <span className="p-1 sm:p-1.5 bg-amber-500/10 text-amber-600 rounded-lg shrink-0 ml-1">
                  <Calculator className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </span>
              </div>
              <div>
                <div className="flex items-baseline space-x-1">
                  <span className="text-2xl sm:text-3xl font-extrabold text-amber-950 font-mono">
                    {stats ? stats.totalCalculations.toLocaleString() : '--'}
                  </span>
                  <span className="text-[11px] text-amber-700 font-medium">times</span>
                </div>
                <p className="text-[11px] text-amber-600/80 mt-1 leading-tight">Optimizations</p>
              </div>
            </div>
          </div>

          {/* Current Device Details */}
          <div className="grid grid-cols-2 gap-2.5 text-xs">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
              <span className="text-gray-500 font-medium">Visits from this device</span>
              <span className="font-bold text-gray-800 font-mono text-sm">{localStats.localVisits}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
              <span className="text-gray-500 font-medium">Calculations on this device</span>
              <span className="font-bold text-gray-800 font-mono text-sm">{localStats.localCalculations}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end">
          <button
            id="modal-dismiss-btn"
            onClick={onClose}
            className="px-5 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-lg text-sm font-medium transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

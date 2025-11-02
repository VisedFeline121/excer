'use client';

import { Clock, TrendingUp } from 'lucide-react';

interface HeaderProps {
  marketTimer: string;
  lastUpdated: number;
  nextUpdate: number;
  refreshing: boolean;
  formatTimeAgo: (timestamp: number) => string;
  formatTimeToNext: (nextUpdateTime: number) => string;
}

export default function Header({ 
  marketTimer, 
  lastUpdated, 
  nextUpdate, 
  refreshing, 
  formatTimeAgo, 
  formatTimeToNext 
}: HeaderProps) {
  return (
    <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 py-3 md:p-6">
        {/* Mobile: Stack vertically */}
        <div className="flex flex-col space-y-3 md:hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img 
                src="/excer_logo.png" 
                alt="Excer Logo" 
                className="w-8 h-8"
              />
              <div>
                <h1 className="text-lg font-bold text-white bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                  Excer
                </h1>
                <p className="text-gray-400 text-xs">Penny Stock Sentiment Tracker</p>
              </div>
            </div>
          </div>
          
          {/* Market timer - mobile */}
          <div className="flex items-center justify-center">
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600/20 to-purple-600/20 backdrop-blur-sm border border-blue-500/30 rounded-lg px-4 py-2 shadow-lg w-full justify-center">
              <div className="flex items-center gap-1.5">
                <div className="relative">
                  <Clock className="w-4 h-4 text-blue-400" />
                  <div className="absolute -top-1 -right-1 w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></div>
                </div>
                <TrendingUp className="w-3.5 h-3.5 text-green-400" />
              </div>
              <div className="text-white font-semibold text-sm tracking-wide truncate">
                {marketTimer}
              </div>
            </div>
          </div>
          
          {/* Update status - mobile */}
          <div className="flex gap-2">
            <div className="bg-gray-800/50 rounded-lg px-3 py-1.5 border border-gray-700/50 flex-1">
              <div className="text-xs text-gray-400 uppercase tracking-wide">Last updated</div>
              <div className="text-xs text-white font-medium">{formatTimeAgo(lastUpdated)}</div>
            </div>
            <div className="bg-gray-800/50 rounded-lg px-3 py-1.5 border border-gray-700/50 flex-1">
              <div className="text-xs text-gray-400 uppercase tracking-wide">Next update</div>
              <div className="text-xs text-white font-medium flex items-center gap-1.5">
                {refreshing && <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></div>}
                <span className="truncate">{formatTimeToNext(nextUpdate)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Desktop: Horizontal layout */}
        <div className="hidden md:flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img 
            src="/excer_logo.png" 
            alt="Excer Logo" 
            className="w-10 h-10"
          />
          <div>
            <h1 className="text-2xl font-bold text-white bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              Excer
            </h1>
            <p className="text-gray-400 text-sm">Penny Stock Sentiment Tracker</p>
          </div>
        </div>
        <div className="text-center flex-1 mx-12">
          <div className="inline-flex items-center gap-3 bg-gradient-to-r from-blue-600/20 to-purple-600/20 backdrop-blur-sm border border-blue-500/30 rounded-xl px-6 py-3 shadow-lg">
            <div className="flex items-center gap-2">
              <div className="relative">
                <Clock className="w-5 h-5 text-blue-400" />
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              </div>
              <TrendingUp className="w-4 h-4 text-green-400" />
            </div>
            <div className="text-white font-semibold text-base tracking-wide">
              {marketTimer}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="flex gap-6">
            <div className="bg-gray-800/50 rounded-lg px-4 py-2 border border-gray-700/50">
              <div className="text-xs text-gray-400 uppercase tracking-wide">Last updated</div>
              <div className="text-sm text-white font-medium">{formatTimeAgo(lastUpdated)}</div>
            </div>
            <div className="bg-gray-800/50 rounded-lg px-4 py-2 border border-gray-700/50">
              <div className="text-xs text-gray-400 uppercase tracking-wide">Next update</div>
              <div className="text-sm text-white font-medium flex items-center gap-2">
                {refreshing && <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>}
                {formatTimeToNext(nextUpdate)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

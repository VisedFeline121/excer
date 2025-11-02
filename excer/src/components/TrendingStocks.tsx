'use client';

import { ArrowDown, ArrowUp, ArrowUpDown, ChevronDown, MessageCircle, TrendingDown, TrendingUp, Users } from 'lucide-react';
import { SortBy, SortOrder, StockData } from '../types';
import { StockCardSkeleton } from './SkeletonLoader';

interface TrendingStocksProps {
  stocks: StockData[];
  selectedStock: StockData | null;
  sortBy: SortBy;
  sortOrder: SortOrder;
  showSortMenu: boolean;
  onStockSelect: (stock: StockData) => void;
  onSortChange: (newSortBy: SortBy) => void;
  onSortOrderToggle: () => void;
  onSortMenuToggle: () => void;
  getSortedStocks: () => StockData[];
  getSortLabel: () => string;
}

export default function TrendingStocks({
  stocks,
  selectedStock,
  sortBy,
  sortOrder,
  showSortMenu,
  onStockSelect,
  onSortChange,
  onSortOrderToggle,
  onSortMenuToggle,
  getSortedStocks,
  getSortLabel
}: TrendingStocksProps) {
  return (
    <div className="hidden lg:flex lg:col-span-1">
      <div className="bg-gray-800 rounded-lg p-6 w-full flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold flex items-center">
            <TrendingUp className="w-5 h-5 mr-2" />
            Trending Stocks ({stocks.length})
          </h2>
          <div className="relative">
            <div className="flex items-center gap-2">
              <button
                onClick={onSortMenuToggle}
                className="flex items-center gap-2 px-3 py-1 rounded text-sm bg-gray-700 text-gray-300 hover:bg-gray-600 transition-colors"
              >
                <ArrowUpDown className="w-4 h-4" />
                <span>{getSortLabel()}</span>
                <ChevronDown className="w-3 h-3" />
              </button>
              <button
                onClick={onSortOrderToggle}
                className="p-1 rounded bg-gray-700 text-gray-300 hover:bg-gray-600 transition-colors"
                title={sortOrder === 'desc' ? 'Most to least' : 'Least to most'}
              >
                {sortOrder === 'desc' ? (
                  <ArrowUp className="w-4 h-4" />
                ) : (
                  <ArrowDown className="w-4 h-4" />
                )}
              </button>
            </div>

            {showSortMenu && (
              <div className="absolute right-0 top-full mt-1 w-32 bg-gray-700 rounded-lg shadow-lg border border-gray-600 z-10">
                <button
                  onClick={() => onSortChange('posts')}
                  className={`w-full px-3 py-2 text-left text-sm rounded-t-lg transition-colors ${sortBy === 'posts'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-600'
                    }`}
                >
                  Posts
                </button>
                <button
                  onClick={() => onSortChange('sentiment')}
                  className={`w-full px-3 py-2 text-left text-sm transition-colors ${sortBy === 'sentiment'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-600'
                    }`}
                >
                  Sentiment
                </button>
                <button
                  onClick={() => onSortChange('mentions')}
                  className={`w-full px-3 py-2 text-left text-sm rounded-b-lg transition-colors ${sortBy === 'mentions'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-600'
                    }`}
                >
                  Mentions
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 pr-2">
          {stocks.length === 0 ? (
            // Show skeleton loaders when no stocks
            Array.from({ length: 8 }).map((_, index) => (
              <StockCardSkeleton key={index} />
            ))
          ) : (
            getSortedStocks().map((stock) => (
              <div
                key={stock.symbol}
                onClick={() => onStockSelect(stock)}
                className={`p-4 rounded-lg cursor-pointer transition-colors ${selectedStock?.symbol === stock.symbol
                  ? 'bg-blue-600'
                  : 'bg-gray-700 hover:bg-gray-600'
                  }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-lg">${stock.symbol}</span>
                  <div className="flex items-center">
                    {stock.sentimentScore > 0 ? (
                      <TrendingUp className="w-4 h-4 text-green-400" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-red-400" />
                    )}
                    <span className={`ml-1 text-sm ${stock.sentimentScore > 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                      {stock.sentimentScore > 0 ? '+' : ''}{stock.sentimentScore.toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm text-gray-300">
                  <span className="flex items-center">
                    <MessageCircle className="w-4 h-4 mr-1" />
                    {stock.uniquePosts} posts
                  </span>
                  <span className="flex items-center">
                    <Users className="w-4 h-4 mr-1" />
                    {stock.positiveMentions}↑ {stock.negativeMentions}↓
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

'use client';

import { BarChart3, ChartLine, Clock, Info, MessageSquare } from 'lucide-react';
import { useState } from 'react';

export default function WhatIsExcerButton() {
    const [isOpen, setIsOpen] = useState(false);
    const [isClosing, setIsClosing] = useState(false);

    const handleClose = () => {
        setIsClosing(true);
        setTimeout(() => {
            setIsOpen(false);
            setIsClosing(false);
        }, 300); // Match animation duration
    };

    return (
        <>
            {/* Floating Button */}
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-32 sm:bottom-20 right-4 sm:right-6 z-40 flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold px-4 sm:px-5 py-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                aria-label="What is Excer?"
            >
                <Info className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm sm:text-base whitespace-nowrap">What is Excer?</span>
            </button>

            {/* Modal */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-300"
                    onClick={handleClose}
                >
                    {/* Backdrop */}
                    <div className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${isClosing ? 'opacity-0' : 'opacity-100'}`} />

                    {/* Modal Content */}
                    <div
                        className={`relative bg-gray-800 rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden transform transition-all duration-300 ease-out ${isClosing ? 'modalClose' : 'modalReveal'
                            }`}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Close button */}
                        <button
                            onClick={handleClose}
                            className="absolute top-4 right-4 z-50 text-gray-400 hover:text-white transition-colors p-2"
                            aria-label="Close"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>

                        {/* Content */}
                        <div className="p-8 overflow-y-auto max-h-[calc(90vh-100px)]">
                            <div className="space-y-8">
                                {/* Hero Section */}
                                <div className="text-center">
                                    <div className="relative inline-flex items-center justify-center w-24 h-24 mb-6">
                                        {/* Glowing background circle */}
                                        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-500 via-purple-500 to-blue-600 opacity-80 blur-xl animate-pulse"></div>
                                        {/* Logo container - circular mask to hide square corners */}
                                        <div className="relative z-10 w-20 h-20 rounded-full overflow-hidden flex items-center justify-center">
                                            <img
                                                src="/excer_logo.png"
                                                alt="Excer Logo"
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                    </div>
                                    <h3 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent mb-6">
                                        What is Excer?
                                    </h3>
                                    <div className="text-gray-300 space-y-4 text-left max-w-2xl mx-auto text-lg leading-relaxed">
                                        <p className="bg-gray-700/30 rounded-lg p-4 border-l-4 border-blue-500">
                                            Finding which stocks are truly gaining attention is noisy and time-consuming.
                                        </p>
                                        <p className="bg-gray-700/30 rounded-lg p-4 border-l-4 border-purple-500">
                                            Excer tracks and ranks trending stocks — and shows the discussions behind every trend — so you can spot momentum early with full transparency.
                                        </p>
                                    </div>
                                </div>

                                {/* Features Grid */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-gradient-to-br from-gray-700/50 to-gray-800/50 rounded-xl p-5 text-center border border-gray-600/50 hover:border-blue-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/10">
                                        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-500/20 mb-3">
                                            <MessageSquare className="w-6 h-6 text-blue-400" />
                                        </div>
                                        <p className="text-sm font-medium text-gray-200">Reddit Monitoring</p>
                                    </div>
                                    <div className="bg-gradient-to-br from-gray-700/50 to-gray-800/50 rounded-xl p-5 text-center border border-gray-600/50 hover:border-green-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-green-500/10">
                                        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-500/20 mb-3">
                                            <BarChart3 className="w-6 h-6 text-green-400" />
                                        </div>
                                        <p className="text-sm font-medium text-gray-200">Sentiment Analysis</p>
                                    </div>
                                    <div className="bg-gradient-to-br from-gray-700/50 to-gray-800/50 rounded-xl p-5 text-center border border-gray-600/50 hover:border-purple-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/10">
                                        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-purple-500/20 mb-3">
                                            <Clock className="w-6 h-6 text-purple-400" />
                                        </div>
                                        <p className="text-sm font-medium text-gray-200">Updates Every 15min</p>
                                    </div>
                                    <div className="bg-gradient-to-br from-gray-700/50 to-gray-800/50 rounded-xl p-5 text-center border border-gray-600/50 hover:border-yellow-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-yellow-500/10">
                                        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-yellow-500/20 mb-3">
                                            <ChartLine className="w-6 h-6 text-yellow-400" />
                                        </div>
                                        <p className="text-sm font-medium text-gray-200">Price Charts</p>
                                    </div>
                                </div>

                                {/* Disclaimer */}
                                <div className="pt-6 border-t border-gray-700/50">
                                    <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700/50">
                                        <p className="text-xs text-gray-400 text-center leading-relaxed">
                                            <strong className="text-white">Disclaimer:</strong> This tool is for research and entertainment purposes only. It is not financial advice. Always do your own research before making investment decisions.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}


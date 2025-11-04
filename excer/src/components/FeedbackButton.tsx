'use client';

import { MessageSquare } from 'lucide-react';
import { useState } from 'react';

export default function FeedbackButton() {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            {/* Floating Button */}
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-40 flex items-center gap-2 bg-gradient-to-r from-green-500 to-green-400 hover:from-green-600 hover:to-green-500 text-white font-semibold px-4 sm:px-5 py-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                aria-label="Help Shape Excer"
            >
                <MessageSquare className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm sm:text-base whitespace-nowrap">Help Shape Excer!</span>
            </button>

            {/* Modal */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    onClick={() => setIsOpen(false)}
                >
                    {/* Backdrop */}
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

                    {/* Modal Content */}
                    <div
                        className="relative bg-gray-800 rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b border-gray-700">
                            <h2 className="text-xl font-semibold text-white">Help Shape Excer</h2>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="text-gray-400 hover:text-white transition-colors"
                                aria-label="Close"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Tally Form Container */}
                        <div className="p-6 overflow-y-auto max-h-[calc(90vh-100px)]">
                            <div className="tally-form-container">
                                {/* Tally form will be embedded here */}
                                <iframe
                                    src="https://tally.so/embed/your-form-id?transparentBackground=1&hideTitle=1&alignLeft=1"
                                    width="100%"
                                    height="600"
                                    frameBorder="0"
                                    marginHeight={0}
                                    marginWidth={0}
                                    title="Help Shape Excer"
                                    className="w-full"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}


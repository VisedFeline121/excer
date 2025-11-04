'use client';

import { MessageSquare } from 'lucide-react';

export default function FeedbackButton() {
    return (
        <button
            data-tally-open="3EjO8l"
            data-tally-emoji-text="👋"
            data-tally-emoji-animation="wave"
            className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-40 flex items-center gap-2 bg-gradient-to-r from-green-500 to-green-400 hover:from-green-600 hover:to-green-500 text-white font-semibold px-4 sm:px-5 py-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
            aria-label="Help Shape Excer"
        >
            <MessageSquare className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm sm:text-base whitespace-nowrap">Help Shape Excer!</span>
        </button>
    );
}


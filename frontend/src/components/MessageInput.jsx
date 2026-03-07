import React, { useState } from 'react';
import { Send, Terminal } from 'lucide-react';

const MessageInput = ({ onSendMessage }) => {
    const [message, setMessage] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (message.trim()) {
            onSendMessage(message);
            setMessage('');
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
        }
    };

    return (
        <div className="p-3 md:p-6 bg-transparent z-20 relative">
            <form
                onSubmit={handleSubmit}
                className="relative bg-brand-panel border border-brand-border rounded-lg shadow-2xl focus-within:border-brand-mint/50 transition-colors flex items-center overflow-hidden"
            >
                <div className="pl-4 py-3 text-gray-500">
                    <Terminal size={18} className="text-brand-mint/70" />
                </div>
                <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Enter secure payload..."
                    className="flex-1 bg-transparent border-none focus:ring-0 text-gray-200 placeholder-gray-600 px-3 py-4 outline-none font-mono text-sm"
                    autoComplete="off"
                />
                <button
                    type="submit"
                    disabled={!message.trim()}
                    className="px-6 py-4 bg-brand-mint/10 hover:bg-brand-mint/20 text-brand-mint transition-colors disabled:opacity-50 disabled:cursor-not-allowed border-l border-brand-border flex items-center gap-2 font-mono text-sm font-bold uppercase tracking-wider"
                >
                    <span className="hidden sm:inline">Execute</span>
                    <Send size={16} />
                </button>
            </form>
            <div className="mt-2 text-center text-[10px] text-gray-600 font-mono">
                Messages are ephemeral and automatically wiped from view upon execution.
            </div>
        </div>
    );
};

export default MessageInput;

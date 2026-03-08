import React, { useState, useRef, useEffect } from 'react';
import { Send, Terminal, Smile } from 'lucide-react';
import EmojiPicker, { Theme } from 'emoji-picker-react';

const MessageInput = ({ onSendMessage }) => {
    const [message, setMessage] = useState('');
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const pickerRef = useRef(null);

    // Handle click outside to close the emoji picker
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (pickerRef.current && !pickerRef.current.contains(event.target)) {
                setShowEmojiPicker(false);
            }
        };

        if (showEmojiPicker) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showEmojiPicker]);

    const handleEmojiClick = (emojiObject) => {
        setMessage(prev => prev + emojiObject.emoji);
    };

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

            {/* Emoji Picker Popup */}
            {showEmojiPicker && (
                <div ref={pickerRef} className="absolute bottom-full mb-2 left-3 md:left-6 z-50">
                    <EmojiPicker
                        theme={Theme.DARK}
                        onEmojiClick={handleEmojiClick}
                        autoFocusSearch={false}
                        searchDisabled={false}
                        skinTonesDisabled={true}
                        width={300}
                        height={400}
                    />
                </div>
            )}

            <form
                onSubmit={handleSubmit}
                className="relative bg-brand-panel border border-brand-border rounded-lg shadow-2xl focus-within:border-brand-mint/50 transition-colors flex items-center overflow-visible"
            >
                <div className="pl-4 py-3 text-gray-500 flex items-center gap-2">
                    <Terminal size={18} className="text-brand-mint/70 hidden sm:block" />
                    <button
                        type="button"
                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                        className={`hover:text-amber-400 transition-colors ${showEmojiPicker ? 'text-amber-400' : 'text-gray-400'}`}
                    >
                        <Smile size={20} />
                    </button>
                </div>
                <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Enter secure payload..."
                    className="flex-1 bg-transparent border-none focus:ring-0 text-gray-200 placeholder-gray-600 px-3 py-4 outline-none font-mono text-sm min-w-0"
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

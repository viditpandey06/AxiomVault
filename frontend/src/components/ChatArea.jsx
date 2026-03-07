import React, { useState, useEffect, useRef } from 'react';
import ChatHeader from './ChatHeader';
import MessageInput from './MessageInput';
import TerminalBackground from './TerminalBackground';
import { ShieldCheck, ScanSearch, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import useChatStore from '../store/chatStore';

const ChatArea = ({ activeChatInfo }) => {
    const { messages, sendMessageViaSocket } = useChatStore();

    const [isAnimatingTerminal, setIsAnimatingTerminal] = useState(false);
    const [isNewChat, setIsNewChat] = useState(true);
    const [terminalDuration, setTerminalDuration] = useState(2);

    const idleTimerRef = useRef(null);
    const messagesEndRef = useRef(null);

    const chatMessages = activeChatInfo ? (messages[activeChatInfo.id] || []) : [];

    // Auto-scroll to bottom of messages
    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [chatMessages]);

    // Trigger handshake log when chat changes
    useEffect(() => {
        setIsAnimatingTerminal(false); // Reset

        // Tiny timeout to allow React to flush state and re-trigger animation cleanly when swapping chats
        setTimeout(() => {
            setIsNewChat(true);
            setTerminalDuration(3);
            setIsAnimatingTerminal(true);
        }, 50);

        resetIdleTimer();

        return () => {
            if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
        };
    }, [activeChatInfo?.id]);

    const resetIdleTimer = () => {
        if (idleTimerRef.current) clearTimeout(idleTimerRef.current);

        // Idle animation triggers after 20 seconds of inactivity
        idleTimerRef.current = setTimeout(() => {
            setIsAnimatingTerminal(false); // Reset 
            setTimeout(() => {
                setIsNewChat(false); // Maintenance logs
                setTerminalDuration(2.5);
                setIsAnimatingTerminal(true);
            }, 50);
            // Recursively set timer so it happens *every* 20s of idle
            resetIdleTimer();
        }, 20000);
    };

    const handleSendMessage = (text) => {
        if (!activeChatInfo) return;

        // Reset idle timer upon activity
        resetIdleTimer();

        // Determine dynamic duration based on message length (1.5 to 4 seconds)
        const duration = Math.min(Math.max(text.length * 0.05, 2.5), 4);

        // Delegate to Socket.io store action
        sendMessageViaSocket(activeChatInfo.id, text);

        // Stop current animation, trigger new one
        setIsAnimatingTerminal(false);
        setTimeout(() => {
            setIsNewChat(false); // Since we are already in the chat, use maintenance logs
            setTerminalDuration(duration);
            setIsAnimatingTerminal(true);
        }, 50);
    };

    const handleTerminalComplete = () => {
        // The terminal component handles scrolling itself out now.
        setIsAnimatingTerminal(false);
    };

    if (!activeChatInfo) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center bg-brand-bg relative">
                <Lock className="w-16 h-16 text-gray-800 mb-4" />
                <span className="font-mono text-gray-500 text-sm">AWAITING CONNECTION...</span>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col relative overflow-hidden bg-brand-bg">
            <ChatHeader
                chatName={activeChatInfo.name}
                isGroup={activeChatInfo.isGroup}
                chatId={activeChatInfo.id}
                profilePhoto={activeChatInfo.profilePhoto}
                status={activeChatInfo.status}
            />

            {/* Absolute positioned terminal background */}
            <TerminalBackground
                isAnimating={isAnimatingTerminal}
                isNewChat={isNewChat}
                animationDuration={terminalDuration}
                onAnimationComplete={handleTerminalComplete}
            />

            {/* Main chat display area */}
            <div className="flex-1 relative z-10 p-3 md:p-6 overflow-y-auto overflow-x-hidden flex flex-col">
                <div className="flex-1" /> {/* Spacer to push messages to bottom if few */}
                <AnimatePresence mode="popLayout">
                    {chatMessages.map((msg) => (
                        <motion.div
                            key={msg.id}
                            initial={{ opacity: 0, y: 20, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, filter: 'blur(10px)', scale: 1.05 }}
                            transition={{ duration: 0.3 }}
                            className={`w-full flex mb-4 ${msg.isSent ? 'justify-end' : 'justify-start'}`}
                            layout
                        >
                            <div className={`max-w-[70%] border shadow-[0_0_15px_rgba(6,182,212,0.1)] rounded-2xl p-4 text-gray-100 flex flex-col font-inter
                                ${msg.isSent
                                    ? 'bg-brand-panel border-brand-mint/30 rounded-br-sm'
                                    : 'bg-gray-800/80 border-gray-700/50 rounded-bl-sm'}`}
                            >
                                <p className="text-sm md:text-base leading-relaxed break-words">{msg.text}</p>
                                <div className="flex justify-end mt-2 items-center gap-2">
                                    <span className="text-[10px] font-mono text-gray-500">
                                        {msg.timestamp}
                                    </span>

                                    {msg.status === 'scanning' && (
                                        <div className="flex items-center gap-1 text-amber-500 font-mono text-[10px] animate-scan-pulse">
                                            <ScanSearch size={12} />
                                            <span>AI SCANNING...</span>
                                        </div>
                                    )}

                                    {msg.status === 'safe' && (
                                        <div className="flex items-center gap-1 text-blue-400 font-mono text-[10px]">
                                            <ShieldCheck size={12} />
                                            <span>AI SAFE ✓</span>
                                        </div>
                                    )}

                                    {msg.status === 'encrypted' && (
                                        <div className="flex items-center gap-1 text-brand-mint font-mono text-[10px]">
                                            <Lock size={12} />
                                            <span>ENCRYPTED ✓</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
                <div ref={messagesEndRef} />
            </div>

            <MessageInput onSendMessage={handleSendMessage} />
        </div>
    );
};

export default ChatArea;

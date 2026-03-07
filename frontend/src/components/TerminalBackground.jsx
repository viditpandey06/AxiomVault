import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const INITIAL_LOGS = [
    "[SYSTEM] Initializing secure handshake...",
    "[CRYPTO] Generating ephemeral RSA-4096 keypair...",
    "[NETWORK] Establishing encrypted P2P tunnel...",
    "[AUTH] Verifying remote identity signature...",
    "[CRYPTO] AES-256 session key derived.",
    "[SYSTEM] Status: SECURE TUNNEL ACTIVE ✓"
];

const MAINTENANCE_LOGS = [
    "[MAINTENANCE] Re-verifying tunnel integrity...",
    "[AI-GUARD] Scanning message metadata...",
    "[ROUTER] Packet fragmentation complete.",
    "[NETWORK] Forwarding encrypted payload...",
    "[SYSTEM] Status: SECURED AND ENCRYPTED ✓"
];

const TerminalBackground = ({ isAnimating, isNewChat, animationDuration, onAnimationComplete }) => {
    const [visibleLogs, setVisibleLogs] = useState([]);
    const [isScrollingOut, setIsScrollingOut] = useState(false);

    useEffect(() => {
        if (!isAnimating) {
            return;
        }

        setIsScrollingOut(false);
        setVisibleLogs([]);
        const logSet = isNewChat ? INITIAL_LOGS : MAINTENANCE_LOGS;
        let currentIndex = 0;

        // Calculate interval to spread logs evenly across a portion of the duration
        // We leave the last ~1 second for the scroll-out effect
        const totalLogTime = Math.max((animationDuration - 1) * 1000, 500);
        const intervalTime = totalLogTime / logSet.length;

        const interval = setInterval(() => {
            if (currentIndex < logSet.length) {
                setVisibleLogs(prev => [...prev, logSet[currentIndex]]);
                currentIndex++;
            } else {
                clearInterval(interval);
                // Pause briefly, then trigger scroll out
                setTimeout(() => {
                    setIsScrollingOut(true);
                    if (onAnimationComplete) {
                        onAnimationComplete();
                    }
                }, 500);
            }
        }, intervalTime);

        return () => clearInterval(interval);
    }, [isAnimating, isNewChat, animationDuration, onAnimationComplete]);

    // When scrolling out finishes, wipe logs entirely
    useEffect(() => {
        if (isScrollingOut) {
            const timer = setTimeout(() => {
                setVisibleLogs([]);
            }, 800); // Wait for the upward slide animation to finish
            return () => clearTimeout(timer);
        }
    }, [isScrollingOut]);

    return (
        <div
            className="absolute inset-0 pointer-events-none z-0 opacity-40 select-none overflow-hidden flex flex-col justify-start"
            style={{
                maskImage: 'linear-gradient(to bottom, black 40%, transparent 75%)',
                WebkitMaskImage: 'linear-gradient(to bottom, black 40%, transparent 75%)'
            }}
        >
            <motion.div
                className="p-6 pt-20 font-mono text-brand-mint text-xs md:text-sm tracking-tight opacity-70"
                animate={isScrollingOut ? { y: -300, opacity: 0 } : { y: 0, opacity: 1 }}
                initial={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.8, ease: "easeInOut" }}
            >
                <AnimatePresence>
                    {visibleLogs.map((log, index) => (
                        <motion.div
                            key={`${log}-${index}`}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="mb-1"
                        >
                            {log}
                        </motion.div>
                    ))}
                    {(isAnimating && !isScrollingOut) && (
                        <div className="inline-block w-2 h-4 bg-brand-mint ml-1 translate-y-1 animate-blink" />
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    );
};

export default TerminalBackground;

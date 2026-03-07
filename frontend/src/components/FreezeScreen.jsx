import React, { useEffect, useState } from 'react';
import { ShieldAlert, Terminal as TerminalIcon, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';
import useChatStore from '../store/chatStore';

const FreezeScreen = () => {
    const { freezeTimeLeft, completeFreeze } = useChatStore();
    const [seconds, setSeconds] = useState(freezeTimeLeft);

    useEffect(() => {
        // Sync local seconds with store initial, then countdown
        if (seconds <= 0) {
            completeFreeze();
            return;
        }

        const interval = setInterval(() => {
            setSeconds((prev) => {
                if (prev <= 1) {
                    clearInterval(interval);
                    completeFreeze();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [seconds, completeFreeze]);

    return (
        <div className="fixed inset-0 z-[100] bg-red-950/95 flex flex-col items-center justify-center p-4 overflow-hidden selection:bg-red-500/30">
            {/* Warning Scanlines */}
            <div className="absolute inset-0 pointer-events-none opacity-20 bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.5)_50%)] bg-[length:100%_4px] mix-blend-overlay" />

            <div className="w-full max-w-2xl bg-black/50 border-2 border-red-600 shadow-[0_0_50px_rgba(220,38,38,0.3)] rounded-lg p-8 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-red-600 shadow-[0_0_20px_rgba(220,38,38,1)] animate-blink" />

                <div className="flex flex-col items-center text-center">
                    <div className="animate-pulse">
                        <ShieldAlert className="w-24 h-24 text-red-500 mb-6 drop-shadow-[0_0_15px_rgba(220,38,38,0.8)]" />
                    </div>

                    <h1 className="text-3xl md:text-5xl font-mono font-bold text-red-500 tracking-widest mb-4">
                        SECURITY LOCKDOWN
                    </h1>

                    <div className="bg-red-900/30 border border-red-500/50 p-4 rounded w-full mb-8 font-mono text-left">
                        <div className="flex items-center gap-2 mb-2 text-red-400">
                            <TerminalIcon size={16} />
                            <span className="text-xs font-bold uppercase">System Diagnostic Log //</span>
                        </div>
                        <p className="text-sm text-red-300">
                            [FATAL] Local Trust Score depleted to 0.00%.<br />
                            [WARN] Extreme anomalous communication rate detected.<br />
                            [ACTN] Suspending terminal access to prevent network degradation.
                        </p>
                    </div>

                    <div className="flex flex-col items-center">
                        <span className="text-xs font-mono text-gray-400 mb-2 tracking-widest uppercase">
                            Terminal Re-engagement In
                        </span>
                        <div className="text-6xl md:text-8xl font-mono font-bold text-white tracking-widest drop-shadow-[0_0_20px_rgba(255,255,255,0.5)]">
                            00:{seconds.toString().padStart(2, '0')}
                        </div>
                    </div>

                    <div className="mt-8 flex items-center justify-center gap-2 text-xs font-mono text-red-400/70">
                        <AlertTriangle size={14} />
                        CONNECTION WILL BE RESTORED WITH PENALIZED TRUST TIER
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FreezeScreen;

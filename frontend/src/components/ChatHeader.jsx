import React, { useState } from 'react';
import { Lock, Radio, Users, X, Shield, Loader2, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import useChatStore from '../store/chatStore';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const ChatHeader = ({ chatName, isGroup, chatId, profilePhoto, status }) => {
    const { token, setActiveChatId } = useChatStore();
    const [showMembers, setShowMembers] = useState(false);
    const [members, setMembers] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    const handleViewMembers = async () => {
        setShowMembers(true);
        if (members.length > 0) return; // already fetched

        setIsLoading(true);
        try {
            const res = await fetch(`${API_URL}/api/groups/${chatId}/members`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setMembers(data.members || []);
            }
        } catch (err) {
            console.error("Failed to fetch members:", err);
        } finally {
            setIsLoading(false);
        }
    };
    return (
        <div className="h-16 bg-brand-bg border-b border-brand-border flex items-center justify-between px-4 md:px-6 z-20 relative">
            <div className="flex items-center gap-2 md:gap-4">
                <button
                    onClick={() => setActiveChatId(null)}
                    className="md:hidden text-gray-400 hover:text-brand-mint transition-colors p-1"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>

                {/* Profile Photo Avatar */}
                {!isGroup && (
                    <div className="w-9 h-9 rounded-full bg-gray-800 border border-gray-700 flex-shrink-0 overflow-hidden flex items-center justify-center">
                        {profilePhoto ? (
                            <img src={profilePhoto} alt={chatName} className="w-full h-full object-cover" />
                        ) : (
                            <span className="text-sm font-bold text-gray-400">{chatName?.charAt(0).toUpperCase()}</span>
                        )}
                    </div>
                )}

                <div>
                    <h2 className="text-lg font-semibold text-white tracking-wide flex items-center gap-2">
                        {isGroup && <Users className="w-5 h-5 text-gray-400" />}
                        {chatName}
                    </h2>
                    <div className="flex items-center gap-2 mt-0.5">
                        {status ? (
                            <span className="text-xs text-gray-400 font-mono truncate max-w-[200px]">{status}</span>
                        ) : (
                            <>
                                <Lock className="w-3 max-h-3 text-brand-mint" />
                                <span className="text-xs text-brand-mint font-mono opacity-80">
                                    VERIFIED END-TO-END ENCRYPTION {isGroup && '(GROUP)'}
                                </span>
                            </>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-4">
                {isGroup && (
                    <button
                        onClick={handleViewMembers}
                        className="text-xs font-mono text-gray-400 hover:text-brand-mint transition-colors underline underline-offset-4 decoration-gray-600 hover:decoration-brand-mint"
                    >
                        VIEW DEPLOYMENT SQUAD
                    </button>
                )}

                <div className="hidden sm:flex items-center gap-2 bg-brand-panel px-3 py-1.5 rounded border border-gray-800">
                    <div className="animate-pulse-opacity">
                        <Radio className="w-4 h-4 text-brand-mint" />
                    </div>
                    <span className="text-xs text-brand-mint font-mono">SECURE TUNNEL ACTIVE</span>
                </div>
            </div>

            <AnimatePresence>
                {showMembers && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="absolute top-16 right-6 w-64 bg-brand-panel border border-brand-mint/30 rounded-lg shadow-2xl overflow-hidden z-50"
                    >
                        <div className="flex items-center justify-between p-3 border-b border-gray-800 bg-gray-900/50">
                            <span className="text-xs font-mono font-bold text-white">OPERATIVE ROSTER</span>
                            <button onClick={() => setShowMembers(false)} className="text-gray-500 hover:text-white">
                                <X size={14} />
                            </button>
                        </div>
                        <div className="max-h-64 overflow-y-auto p-2">
                            {isLoading ? (
                                <div className="flex justify-center p-4">
                                    <Loader2 className="w-4 h-4 text-brand-mint animate-spin" />
                                </div>
                            ) : (
                                <div className="space-y-1">
                                    {members.map(m => (
                                        <div key={m._id} className="flex justify-between items-center p-2 hover:bg-gray-800 rounded">
                                            <span className="text-sm font-medium text-gray-200">{m.username}</span>
                                            <span className="flex items-center gap-1 text-[10px] font-mono text-gray-500">
                                                <Shield size={10} className={m.trust_score > 90 ? "text-brand-mint" : "text-amber-500"} />
                                                {m.trust_score}%
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ChatHeader;

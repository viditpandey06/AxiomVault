import React, { useState, useEffect } from 'react';
import { Shield, ShieldAlert, Users, MessageSquare, EyeOff, Eye, Plus } from 'lucide-react';
import clsx from 'clsx';
import useChatStore from '../store/chatStore';
import NewChatModal from './NewChatModal';
import ProfileModal from './ProfileModal';

const Sidebar = () => {
    const { user, activeChatId, setActiveChatId, chats, isEphemeralMode, toggleEphemeralMode, fetchChats } = useChatStore();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);

    useEffect(() => {
        fetchChats();
    }, [fetchChats]);

    return (
        <div className="w-full md:w-80 h-full bg-brand-bg border-r border-brand-border flex flex-col z-10 relative">
            <div className="p-4 border-b border-brand-border bg-brand-panel/30">
                <div className="flex items-center justify-between">
                    <h1 className="text-xl font-bold font-mono text-brand-mint flex items-center gap-2">
                        <Shield className="w-5 h-5" />
                        AxiomVault
                    </h1>

                    {user && (
                        <button
                            onClick={() => setIsProfileOpen(true)}
                            className="w-9 h-9 rounded-full bg-brand-mint/20 flex items-center justify-center text-brand-mint font-bold text-sm border border-brand-mint/50 hover:bg-brand-mint/30 hover:shadow-[0_0_12px_rgba(6,182,212,0.3)] transition-all"
                            title="View Profile"
                        >
                            {user.username.charAt(0).toUpperCase()}
                        </button>
                    )}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto overflow-x-hidden p-2 space-y-1">
                <div className="flex justify-between items-center p-2 mb-1">
                    <span className="text-xs font-mono text-gray-500">ACTIVE TUNNELS</span>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="text-brand-mint/70 hover:text-brand-mint hover:bg-brand-mint/10 p-1 rounded transition-colors"
                        title="Deploy New Tunnel"
                    >
                        <Plus size={16} />
                    </button>
                </div>
                {chats.length === 0 && (
                    <div className="text-center text-gray-600 text-[10px] font-mono mt-4">NO ACTIVE TUNNELS</div>
                )}
                {chats.map(chat => (
                    <button
                        key={chat.id}
                        onClick={() => setActiveChatId(chat.id)}
                        className={clsx(
                            "w-full text-left p-3 rounded transition-colors flex items-center gap-3 relative overflow-hidden group",
                            activeChatId === chat.id
                                ? "bg-brand-panel text-white"
                                : "text-gray-400 hover:bg-gray-800/50"
                        )}
                    >
                        {activeChatId === chat.id && (
                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand-mint shadow-[0_0_10px_rgba(6,182,212,0.8)]" />
                        )}
                        <div className="w-10 h-10 rounded-full bg-gray-800 flex flex-shrink-0 items-center justify-center text-gray-400 border border-gray-700">
                            {chat.isGroup ? <Users size={18} /> : <MessageSquare size={18} />}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-center mb-0.5">
                                <span className={clsx("font-medium truncate", activeChatId === chat.id ? "text-white" : "")}>
                                    {chat.name}
                                </span>
                                <span className="text-[10px] text-brand-mint font-mono opacity-60">E2EE</span>
                            </div>
                            <p className="text-xs text-gray-500 truncate font-mono">
                                {chat.lastActivity}
                            </p>
                        </div>
                    </button>
                ))}
            </div>

            <div className="p-4 border-t border-brand-border bg-brand-panel/30">
                {/* Local AI Trust Score Teller */}
                <div className="bg-brand-panel p-3 rounded border border-brand-border mb-3 shadow-inner">
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] text-gray-400 font-mono tracking-wider">LOCAL DEVICE TRUST</span>
                        <span className={clsx("text-sm font-mono font-bold", user?.trust_score > 90 ? "text-brand-mint" : "text-amber-500")}>
                            {user?.trust_score ?? 100}%
                        </span>
                    </div>
                    <div className="w-full h-1 bg-gray-800 rounded-full overflow-hidden">
                        <div
                            className={clsx("h-full transition-all duration-500", user?.trust_score > 90 ? "bg-brand-mint" : "bg-amber-500")}
                            style={{ width: `${user?.trust_score ?? 100}%` }}
                        />
                    </div>
                    <p className="text-[9px] text-gray-500 mt-2 font-mono flex items-center gap-1 uppercase">
                        {(user?.trust_score ?? 100) > 90 ? <Shield className="w-2.5 h-2.5 text-brand-mint" /> : <ShieldAlert className="w-2.5 h-2.5 text-amber-500" />}
                        {(user?.trust_score ?? 100) > 90 ? 'Your End-Node is Secure' : 'Local Anomalies Detected'}
                    </p>
                </div>

                <div className="bg-brand-panel p-3 rounded border border-brand-border mb-3 shadow-inner flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        {isEphemeralMode ? <EyeOff size={14} className="text-brand-mint" /> : <Eye size={14} className="text-gray-400" />}
                        <span className="text-[10px] text-gray-400 font-mono tracking-wider">EPHEMERAL MODE</span>
                    </div>
                    <button
                        onClick={toggleEphemeralMode}
                        className={clsx(
                            "w-8 h-4 rounded-full flex items-center transition-colors p-0.5",
                            isEphemeralMode ? "bg-brand-mint/30" : "bg-gray-700"
                        )}
                    >
                        <div className={clsx(
                            "w-3 h-3 rounded-full bg-white transition-transform",
                            isEphemeralMode ? "translate-x-4 bg-brand-mint" : "translate-x-0 bg-gray-400"
                        )} />
                    </button>
                </div>

                <div className="text-[10px] text-gray-600 font-mono text-center">
                    v2.4.1 [ENCRYPTED]
                </div>
            </div>

            <NewChatModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
            />
            <ProfileModal
                isOpen={isProfileOpen}
                onClose={() => setIsProfileOpen(false)}
            />
        </div>
    );
};

export default Sidebar;

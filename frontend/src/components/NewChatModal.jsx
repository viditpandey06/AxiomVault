import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Search, Users, UserPlus, X, Shield, Plus, Loader2 } from 'lucide-react';
import clsx from 'clsx';
import useChatStore from '../store/chatStore';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
import { generateMessageKey, importPublicKey, wrapMessageKey } from '../utils/crypto';

const NewChatModal = ({ isOpen, onClose }) => {
    const { token, user, addChat, setActiveChatId, fetchChats } = useChatStore();

    const [tab, setTab] = useState('direct'); // 'direct' or 'group'
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);

    // Group State
    const [groupName, setGroupName] = useState('');
    const [selectedMembers, setSelectedMembers] = useState([]); // Array of user objects
    const [isCreatingGroup, setIsCreatingGroup] = useState(false);

    const handleSearch = async (e) => {
        const query = e.target.value;
        setSearchQuery(query);
        if (query.trim().length === 0) {
            setSearchResults([]);
            return;
        }

        setIsSearching(true);
        try {
            const res = await fetch(`${API_URL}/api/users/search?query=${query}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                // Filter out self
                setSearchResults(data.filter(u => u._id !== user._id));
            }
        } catch (err) {
            console.error("Search error:", err);
        } finally {
            setIsSearching(false);
        }
    };

    const startDirectChat = (targetUser) => {
        // Add chat to Sidebar list and activate it
        addChat({
            id: targetUser._id,
            name: targetUser.username,
            publicKey: targetUser.public_key,
            profilePhoto: targetUser.profile_photo || '',
            status: targetUser.status || '',
            lastActivity: new Date().toISOString(),
            isGroup: false
        });
        setActiveChatId(targetUser._id);
        onClose();
    };

    const toggleMemberSelection = (targetUser) => {
        const exists = selectedMembers.find(m => m._id === targetUser._id);
        if (exists) {
            setSelectedMembers(selectedMembers.filter(m => m._id !== targetUser._id));
        } else {
            setSelectedMembers([...selectedMembers, targetUser]);
        }
    };

    const createGroup = async () => {
        if (!groupName.trim() || selectedMembers.length === 0) return;

        setIsCreatingGroup(true);
        try {
            // 1. Generate AES Group Key
            const groupKey = await generateMessageKey();

            // 2. Prep members array (include self!)
            const allMembers = [...selectedMembers, user];
            const memberIds = allMembers.map(m => m._id);

            // 3. Wrap Group Key for every member
            const wrappedKeys = {};
            for (const member of allMembers) {
                const memberPubKey = await importPublicKey(member.public_key);
                const encryptedKeyBase64 = await wrapMessageKey(groupKey, memberPubKey);
                wrappedKeys[member._id] = encryptedKeyBase64;
            }

            // 4. Send to backend
            const payload = {
                group_name: groupName,
                members: memberIds,
                keys: wrappedKeys
            };

            const res = await fetch(`${API_URL}/api/groups/create`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                // Refresh chats
                await fetchChats();
                onClose();
            } else {
                const errorData = await res.json();
                alert(`Failed: ${errorData.error}`);
            }

        } catch (err) {
            console.error("Group creation error:", err);
            alert("Cryptographic or Network error creating group.");
        } finally {
            setIsCreatingGroup(false);
        }
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4" onClick={onClose}>
            <div className="bg-brand-panel w-full max-w-md border border-brand-border rounded-lg shadow-2xl flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-brand-border bg-gray-900/50">
                    <h2 className="text-white font-mono font-bold flex items-center gap-2">
                        {tab === 'direct' ? <Search className="w-4 h-4 text-brand-mint" /> : <Users className="w-4 h-4 text-brand-mint" />}
                        {tab === 'direct' ? 'Establish Direct Tunnel' : 'Create Secure Group'}
                    </h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex p-2 bg-gray-900 border-b border-brand-border">
                    <button
                        className={clsx("flex-1 py-2 text-xs font-mono font-bold rounded", tab === 'direct' ? "bg-brand-mint text-black" : "text-gray-400 hover:bg-gray-800")}
                        onClick={() => setTab('direct')}
                    >
                        DIRECT
                    </button>
                    <button
                        className={clsx("flex-1 py-2 text-xs font-mono font-bold rounded", tab === 'group' ? "bg-brand-mint text-black" : "text-gray-400 hover:bg-gray-800")}
                        onClick={() => setTab('group')}
                    >
                        GROUP
                    </button>
                </div>

                {/* Body */}
                <div className="p-4 flex flex-col flex-1 min-h-[300px] max-h-[60vh]">

                    {tab === 'group' && (
                        <div className="mb-4">
                            <input
                                type="text"
                                placeholder="Group Alias"
                                value={groupName}
                                onChange={e => setGroupName(e.target.value)}
                                className="w-full bg-gray-800 border border-gray-700 text-white px-3 py-2 rounded focus:outline-none focus:border-brand-mint/50 font-mono text-sm"
                            />
                        </div>
                    )}

                    <div className="relative mb-4">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-4 w-4 text-gray-500" />
                        </div>
                        <input
                            type="text"
                            placeholder="Search Operative ID..."
                            value={searchQuery}
                            onChange={handleSearch}
                            className="w-full bg-gray-900 border border-gray-700 text-white pl-10 pr-3 py-2 rounded focus:outline-none focus:border-brand-mint/50 font-mono text-sm"
                        />
                        {isSearching && (
                            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                <Loader2 className="h-4 w-4 text-brand-mint animate-spin" />
                            </div>
                        )}
                    </div>

                    {/* Formatted Selected Members (Group Only) */}
                    {tab === 'group' && selectedMembers.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-4">
                            {selectedMembers.map(m => (
                                <div key={m._id} className="flex items-center gap-1 bg-gray-800 border border-brand-mint/30 px-2 py-1 rounded text-xs text-brand-mint font-mono">
                                    {m.username}
                                    <button onClick={() => toggleMemberSelection(m)} className="text-gray-400 hover:text-white">
                                        <X size={12} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Results List */}
                    <div className="flex-1 overflow-y-auto space-y-2">
                        {searchResults.map(user => (
                            <div key={user._id} className="flex items-center justify-between p-3 bg-gray-800/40 rounded border border-gray-800 hover:border-brand-mint/30 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center border border-gray-600 overflow-hidden">
                                        {user.profile_photo ? (
                                            <img src={user.profile_photo} alt={user.username} className="w-full h-full object-cover" />
                                        ) : (
                                            <UserPlus size={14} className="text-gray-400" />
                                        )}
                                    </div>
                                    <div>
                                        <p className="text-white text-sm font-medium">{user.username}</p>
                                        <div className="flex items-center gap-1 text-[10px] text-gray-500 font-mono mt-0.5">
                                            <Shield size={10} className={user.trust_score > 90 ? "text-brand-mint" : "text-amber-500"} />
                                            Trust: {user.trust_score}%
                                        </div>
                                    </div>
                                </div>

                                {tab === 'direct' ? (
                                    <button
                                        onClick={() => startDirectChat(user)}
                                        className="px-3 py-1 bg-brand-mint/10 text-brand-mint hover:bg-brand-mint hover:text-black font-mono text-xs rounded transition-colors"
                                    >
                                        CONNECT
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => toggleMemberSelection(user)}
                                        className={clsx(
                                            "w-6 h-6 rounded flex items-center justify-center transition-colors border",
                                            selectedMembers.find(m => m._id === user._id)
                                                ? "bg-brand-mint border-brand-mint text-black"
                                                : "bg-transparent border-gray-600 text-gray-400 hover:border-brand-mint"
                                        )}
                                    >
                                        {selectedMembers.find(m => m._id === user._id) ? <X size={14} /> : <Plus size={14} />}
                                    </button>
                                )}
                            </div>
                        ))}
                        {searchQuery && searchResults.length === 0 && !isSearching && (
                            <div className="text-center text-gray-500 font-mono text-xs mt-8">
                                NO OPERATIVES FOUND
                            </div>
                        )}
                    </div>
                </div>

                {/* Group Footer */}
                {tab === 'group' && (
                    <div className="p-4 border-t border-brand-border bg-gray-900/50">
                        <button
                            onClick={createGroup}
                            disabled={!groupName.trim() || selectedMembers.length === 0 || isCreatingGroup}
                            className="w-full bg-brand-mint text-black font-bold font-mono py-2 rounded flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-brand-mint/80 transition-colors"
                        >
                            {isCreatingGroup ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
                            {isCreatingGroup ? 'ENCRYPTING KEYS...' : 'INITIALIZE GROUP TUNNEL'}
                        </button>
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
};

export default NewChatModal;

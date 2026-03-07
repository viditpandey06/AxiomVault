import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { io } from 'socket.io-client';
import {
    generateRSAKeyPair, deriveKeyFromPassphrase, exportPublicKey,
    encryptPrivateKey, decryptPrivateKey, generateMessageKey,
    encryptPayload, decryptPayload, wrapMessageKey, unwrapMessageKey,
    importPublicKey, exportPrivateKeyJWK, importPrivateKeyJWK
} from '../utils/crypto';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const useChatStore = create(persist((set, get) => ({
    // Settings
    isEphemeralMode: true,
    toggleEphemeralMode: () => set((state) => ({ isEphemeralMode: !state.isEphemeralMode })),

    // Freeze State
    isFrozen: false,
    freezeTimeLeft: 0,

    // Auth Actions
    login: async (email, password, passphrase) => {
        set({ isAuthLoading: true, authError: null });
        try {
            const res = await fetch(`${API_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, auth_provider: 'local' })
            });
            const data = await res.json();

            if (!res.ok) throw new Error(data.error || 'Login failed');

            // --- WEBCRYPTO RECOVERY LAYER ---
            // 1. Derive AES key from Passphrase
            const aesKey = await deriveKeyFromPassphrase(passphrase, email);

            // 2. Decrypt the Private Key into memory
            const myPrivateKey = await decryptPrivateKey(data.user.encrypted_private_key, aesKey);

            // 3. Export to JWK and store in sessionStorage so it survives refresh
            const jwk = await exportPrivateKeyJWK(myPrivateKey);
            sessionStorage.setItem('chat_priv_key_jwk', JSON.stringify(jwk));
            sessionStorage.setItem('chat_user', JSON.stringify(data.user));

            localStorage.setItem('chat_token', data.token);
            set({
                user: data.user,
                token: data.token,
                privateKey: myPrivateKey,
                isAuthLoading: false
            });
            return true;
        } catch (err) {
            set({ authError: err.message, isAuthLoading: false });
            return false;
        }
    },

    signup: async (username, email, password, passphrase) => {
        set({ isAuthLoading: true, authError: null });
        try {
            // --- WEBCRYPTO GENERATION LAYER ---
            const keyPair = await generateRSAKeyPair();
            const exportedPublicKey = await exportPublicKey(keyPair.publicKey);
            const aesKey = await deriveKeyFromPassphrase(passphrase, email);
            const encryptedPrivateKeyBase64 = await encryptPrivateKey(keyPair.privateKey, aesKey);

            const res = await fetch(`${API_URL}/api/auth/signup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username,
                    email,
                    password,
                    auth_provider: 'local',
                    public_key: exportedPublicKey,
                    encrypted_private_key: encryptedPrivateKeyBase64
                })
            });
            const data = await res.json();

            if (!res.ok) throw new Error(data.error || 'Signup failed');

            const jwk = await exportPrivateKeyJWK(keyPair.privateKey);
            sessionStorage.setItem('chat_priv_key_jwk', JSON.stringify(jwk));
            sessionStorage.setItem('chat_user', JSON.stringify(data.user));

            localStorage.setItem('chat_token', data.token);
            set({
                user: data.user,
                token: data.token,
                privateKey: keyPair.privateKey,
                isAuthLoading: false
            });
            return true;
        } catch (err) {
            set({ authError: err.message, isAuthLoading: false });
            return false;
        }
    },

    // Google OAuth — Step 1: authenticate with Google
    googleLogin: async (credential) => {
        set({ isAuthLoading: true, authError: null });
        try {
            const res = await fetch(`${API_URL}/api/auth/google`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ credential })
            });
            const data = await res.json();

            if (!res.ok) throw new Error(data.error || 'Google authentication failed');

            if (data.isNewUser) {
                localStorage.setItem('chat_token', data.token);
                set({
                    token: data.token,
                    user: data.user,
                    isAuthLoading: false
                });
                return { isNewUser: true, email: data.user.email };
            } else {
                set({
                    isAuthLoading: false,
                    _pendingGoogleData: data
                });
                return { isNewUser: false, email: data.user.email };
            }
        } catch (err) {
            set({ authError: err.message, isAuthLoading: false });
            return null;
        }
    },

    // Google OAuth — Step 2a: new user creates passphrase & keys
    completeGoogleSignup: async (passphrase, email) => {
        set({ isAuthLoading: true, authError: null });
        try {
            const { token } = get();

            const keyPair = await generateRSAKeyPair();
            const exportedPublicKey = await exportPublicKey(keyPair.publicKey);
            const aesKey = await deriveKeyFromPassphrase(passphrase, email);
            const encryptedPrivateKeyBase64 = await encryptPrivateKey(keyPair.privateKey, aesKey);

            const res = await fetch(`${API_URL}/api/auth/set-keys`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    public_key: exportedPublicKey,
                    encrypted_private_key: encryptedPrivateKeyBase64
                })
            });
            const data = await res.json();

            if (!res.ok) throw new Error(data.error || 'Failed to set keys');

            const jwk = await exportPrivateKeyJWK(keyPair.privateKey);
            sessionStorage.setItem('chat_priv_key_jwk', JSON.stringify(jwk));
            sessionStorage.setItem('chat_user', JSON.stringify(data.user));

            set({
                user: data.user,
                privateKey: keyPair.privateKey,
                isAuthLoading: false
            });
            return true;
        } catch (err) {
            set({ authError: err.message, isAuthLoading: false });
            return false;
        }
    },

    // Google OAuth — Step 2b: returning user enters passphrase to decrypt keys
    completeGoogleLogin: async (passphrase) => {
        set({ isAuthLoading: true, authError: null });
        try {
            const pending = get()._pendingGoogleData;
            if (!pending) throw new Error('No pending Google data');

            const { token, user } = pending;

            const aesKey = await deriveKeyFromPassphrase(passphrase, user.email);
            const myPrivateKey = await decryptPrivateKey(user.encrypted_private_key, aesKey);

            const jwk = await exportPrivateKeyJWK(myPrivateKey);
            sessionStorage.setItem('chat_priv_key_jwk', JSON.stringify(jwk));
            sessionStorage.setItem('chat_user', JSON.stringify(user));

            localStorage.setItem('chat_token', token);
            set({
                user: user,
                token: token,
                privateKey: myPrivateKey,
                isAuthLoading: false,
                _pendingGoogleData: null
            });
            return true;
        } catch (err) {
            set({ authError: err.message, isAuthLoading: false });
            return false;
        }
    },

    _pendingGoogleData: null,

    logout: () => {
        const { disconnectSocket } = get();
        disconnectSocket();
        localStorage.removeItem('chat_token');
        sessionStorage.removeItem('chat_priv_key_jwk');
        sessionStorage.removeItem('chat_user');
        set({ user: null, token: null, privateKey: null, _pendingGoogleData: null });
    },

    // Session Restoration
    restoreSession: async () => {
        const token = localStorage.getItem('chat_token');
        const jwkString = sessionStorage.getItem('chat_priv_key_jwk');
        const userString = sessionStorage.getItem('chat_user');

        if (token && jwkString && userString) {
            try {
                const jwk = JSON.parse(jwkString);
                const user = JSON.parse(userString);
                const restoredPrivateKey = await importPrivateKeyJWK(jwk);

                set({
                    user: user,
                    token: token,
                    privateKey: restoredPrivateKey
                });

                // Check if there's an active freeze that should survive refresh
                const freezeExpiry = sessionStorage.getItem('freeze_expires_at');
                if (freezeExpiry) {
                    const remaining = Math.ceil((parseInt(freezeExpiry) - Date.now()) / 1000);
                    if (remaining > 0) {
                        set({ isFrozen: true, freezeTimeLeft: remaining });
                    } else {
                        sessionStorage.removeItem('freeze_expires_at');
                    }
                }

                return true;
            } catch (err) {
                console.error("Failed to restore session keys:", err);
                get().logout();
                return false;
            }
        } else {
            get().logout();
            return false;
        }
    },

    // Socket State & Actions
    socket: null,
    isConnected: false,
    privateKey: null,

    connectSocket: () => {
        const { token, socket, addMessage } = get();
        if (!token) return;

        if (socket?.connected) return;

        const newSocket = io(API_URL, {
            auth: { token }
        });

        newSocket.on('connect', () => {
            console.log('Socket connected:', newSocket.id);
            set({ isConnected: true });
        });

        newSocket.on('disconnect', () => {
            console.log('Socket disconnected');
            set({ isConnected: false });
        });

        newSocket.on('connect_error', (err) => {
            console.error('Socket connection error:', err.message);
            set({ isConnected: false });
        });

        // Listen for incoming private messages
        newSocket.on('receive_private_message', async (incomingMsg) => {
            const { privateKey, addMessage } = get();
            const chatId = incomingMsg.sender_id;

            try {
                if (privateKey) {
                    const messageKey = await unwrapMessageKey(incomingMsg.encrypted_aes_key, privateKey);
                    const plaintext = await decryptPayload(incomingMsg.ciphertext, messageKey);

                    const formattedMessage = {
                        id: incomingMsg._id || Date.now().toString(),
                        text: plaintext,
                        isSent: false,
                        status: 'encrypted',
                        timestamp: new Date(incomingMsg.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
                    };
                    addMessage(chatId, formattedMessage);

                    const isNewContact = !get().chats.find(c => c.id === chatId);
                    if (isNewContact) {
                        get().fetchChats();
                    }
                } else {
                    console.error("No private key in memory to decrypt incoming message.");
                }
            } catch (err) {
                console.error("Failed to decrypt incoming message:", err);
            }
        });

        // Listen for AI trust score updates
        newSocket.on('trust_score_updated', (data) => {
            const { user } = get();
            if (user) {
                const updatedUser = { ...user, trust_score: data.trust_score };
                set({ user: updatedUser });
                if (sessionStorage.getItem('chat_user')) {
                    sessionStorage.setItem('chat_user', JSON.stringify(updatedUser));
                }

                if (data.trust_score <= 0 && !get().isFrozen) {
                    const expiresAt = Date.now() + 60000;
                    sessionStorage.setItem('freeze_expires_at', expiresAt.toString());
                    set({ isFrozen: true, freezeTimeLeft: 60 });
                }
            }
        });

        // Listen for trust reset confirmation from server
        newSocket.on('trust_reset_complete', (data) => {
            const { user } = get();
            if (user) {
                const updatedUser = { ...user, trust_score: data.trust_score };
                set({ user: updatedUser, isFrozen: false, freezeTimeLeft: 0 });
                if (sessionStorage.getItem('chat_user')) {
                    sessionStorage.setItem('chat_user', JSON.stringify(updatedUser));
                }
            }
        });

        set({ socket: newSocket });
    },

    disconnectSocket: () => {
        const { socket } = get();
        if (socket) {
            socket.disconnect();
            set({ socket: null, isConnected: false });
        }
    },

    sendMessageViaSocket: async (receiverId, text) => {
        const { socket, chats, addMessage, updateMessageStatus } = get();

        const tempId = Date.now().toString();
        const newMessage = {
            id: tempId,
            text,
            isSent: true,
            status: 'scanning',
            timestamp: new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
        };
        addMessage(receiverId, newMessage);

        if (socket && socket.connected) {
            try {
                let targetContact = chats.find(c => c.id === receiverId);
                let receiverPublicKeyBase64 = targetContact?.publicKey;

                if (!receiverPublicKeyBase64) {
                    const { token } = get();
                    const res = await fetch(`${API_URL}/api/users/${receiverId}/public_key`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (res.ok) {
                        const data = await res.json();
                        receiverPublicKeyBase64 = data.public_key;
                    } else {
                        throw new Error("Failed to fetch receiver public key");
                    }
                }

                if (!receiverPublicKeyBase64) {
                    throw new Error("Missing receiver public key");
                }

                const receiverPublicKey = await importPublicKey(receiverPublicKeyBase64);
                const messageKey = await generateMessageKey();
                const ciphertext = await encryptPayload(text, messageKey);
                const wrappedAesKey = await wrapMessageKey(messageKey, receiverPublicKey);

                const payload = {
                    receiver_id: receiverId,
                    ciphertext: ciphertext,
                    encrypted_aes_key: wrappedAesKey
                };

                setTimeout(() => {
                    updateMessageStatus(receiverId, tempId, 'safe');

                    socket.emit('send_private_message', payload, (response) => {
                        if (response.status === 'ok') {
                            updateMessageStatus(receiverId, tempId, 'encrypted');
                        } else {
                            updateMessageStatus(receiverId, tempId, 'error');
                        }
                    });
                }, text.length * 50 + 500);

            } catch (err) {
                console.error("Encryption error:", err);
                updateMessageStatus(receiverId, tempId, 'encryption error');
            }
        } else {
            updateMessageStatus(receiverId, tempId, 'error: not connected');
        }
    },

    // App State
    activeChatId: null,
    setActiveChatId: (id) => set({ activeChatId: id }),

    chats: [],

    fetchChats: async () => {
        const { token } = get();
        if (!token) return;

        try {
            // Fetch DMs
            const dmRes = await fetch(`${API_URL}/api/users/chats`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            let dms = [];
            if (dmRes.ok) {
                dms = await dmRes.json();
            }

            // Fetch Groups
            const groupRes = await fetch(`${API_URL}/api/groups`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            let groups = [];
            if (groupRes.ok) {
                const groupData = await groupRes.json();
                groups = groupData.map(g => ({
                    id: g._id,
                    name: g.group_name,
                    adminId: g.admin_id,
                    lastActivity: g.created_at,
                    isGroup: true
                }));
            }

            const combined = [...dms, ...groups].sort((a, b) => new Date(b.lastActivity) - new Date(a.lastActivity));

            set({ chats: combined });
            if (combined.length > 0 && !get().activeChatId) {
                set({ activeChatId: combined[0].id });
                get().loadChatHistory(combined[0].id);
            }
        } catch (err) {
            console.error("Failed to fetch chats:", err);
        }
    },

    addChat: (chat) => set((state) => {
        const exists = state.chats.find(c => c.id === chat.id);
        if (exists) return state;

        get().loadChatHistory(chat.id);

        return {
            chats: [chat, ...state.chats],
            activeChatId: chat.id
        };
    }),

    // Messages keyed by chatId
    messages: {
        '1': [],
        '2': [],
        '3': []
    },

    loadChatHistory: async (chatId) => {
        const { token, privateKey, user } = get();
        if (!token || !privateKey) return;

        try {
            const res = await fetch(`${API_URL}/api/messages/${chatId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!res.ok) throw new Error("Failed to fetch chat history");

            const rawMessages = await res.json();
            const decryptedMessages = [];

            for (const msg of rawMessages) {
                try {
                    const messageKey = await unwrapMessageKey(msg.encrypted_aes_key, privateKey);
                    const plaintext = await decryptPayload(msg.ciphertext, messageKey);

                    decryptedMessages.push({
                        id: msg._id,
                        text: plaintext,
                        isSent: msg.sender_id === user._id,
                        status: 'encrypted',
                        timestamp: new Date(msg.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
                    });
                } catch (cryptErr) {
                    console.error("Failed to decrypt a historical message", cryptErr);
                    decryptedMessages.push({
                        id: msg._id || Date.now().toString(),
                        text: "[DECRYPTION FAILED - KEY DESTROYED OR CORRUPTED]",
                        isSent: msg.sender_id === user._id,
                        status: 'error',
                        timestamp: new Date(msg.timestamp).toLocaleTimeString()
                    });
                }
            }

            set((state) => ({
                messages: {
                    ...state.messages,
                    [chatId]: decryptedMessages
                }
            }));

        } catch (err) {
            console.error(err);
        }
    },

    addMessage: (chatId, message) => set((state) => {
        const chatMessages = state.messages[chatId] || [];

        if (state.isEphemeralMode) {
            return {
                messages: {
                    ...state.messages,
                    [chatId]: [message]
                }
            };
        }

        return {
            messages: {
                ...state.messages,
                [chatId]: [...chatMessages, message]
            }
        };
    }),

    updateMessageStatus: (chatId, messageId, status) => set((state) => {
        const chatMessages = state.messages[chatId] || [];
        const updatedMessages = chatMessages.map(msg =>
            msg.id === messageId ? { ...msg, status } : msg
        );

        return {
            messages: {
                ...state.messages,
                [chatId]: updatedMessages
            }
        };
    }),

    // Freeze Actions
    completeFreeze: () => {
        const { socket } = get();
        sessionStorage.removeItem('freeze_expires_at');
        if (socket && socket.connected) {
            socket.emit('request_trust_reset', {}, (response) => {
                const { user } = get();
                const newScore = response?.status === 'ok' ? response.trust_score : 50;
                const updatedUser = { ...user, trust_score: newScore };
                set({ user: updatedUser, isFrozen: false, freezeTimeLeft: 0 });
                if (sessionStorage.getItem('chat_user')) {
                    sessionStorage.setItem('chat_user', JSON.stringify(updatedUser));
                }
            });
            setTimeout(() => {
                if (get().isFrozen) {
                    set({ isFrozen: false, freezeTimeLeft: 0 });
                }
            }, 3000);
        } else {
            set({ isFrozen: false, freezeTimeLeft: 0 });
        }
    }
}), {
    name: 'noc-chat-storage',
    partialize: (state) => ({
        messages: state.messages,
        isEphemeralMode: state.isEphemeralMode
    })
}));

export default useChatStore;

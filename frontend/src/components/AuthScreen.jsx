import React, { useState } from 'react';
import { Shield, Fingerprint, Lock, Mail, User as UserIcon, Loader2 } from 'lucide-react';
import useChatStore from '../store/chatStore';

const AuthScreen = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [formData, setFormData] = useState({ username: '', email: '', password: '', passphrase: '' });

    const { login, signup, authError, isAuthLoading } = useChatStore();

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (isLogin) {
            await login(formData.email, formData.password, formData.passphrase);
        } else {
            await signup(formData.username, formData.email, formData.password, formData.passphrase);
        }
    };

    return (
        <div className="min-h-screen w-full bg-brand-bg flex flex-col justify-center items-center relative overflow-hidden">
            {/* Background Decor */}
            <div className="absolute inset-0 z-0 opacity-10 pointer-events-none"
                style={{ backgroundImage: 'radial-gradient(#06b6d4 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

            <div className="z-10 w-[calc(100%-2rem)] max-w-md mx-4 bg-brand-panel p-6 md:p-8 rounded-xl border border-brand-border shadow-2xl relative overflow-hidden">
                {/* Subtle top highlight */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-brand-mint to-transparent opacity-50" />

                <div className="flex flex-col items-center mb-8">
                    <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center border border-gray-700 mb-4 shadow-[0_0_20px_rgba(6,182,212,0.15)] relative">
                        <Shield className="w-8 h-8 text-brand-mint" />
                        <Fingerprint className="w-8 h-8 text-brand-mint absolute opacity-30 animate-pulse" />
                    </div>
                    <h1 className="text-2xl font-mono font-bold text-white tracking-wider">AxiomVault</h1>
                    <p className="text-xs text-brand-mint font-mono mt-2 tracking-widest opacity-80">SECURE TERMINAL ACCESS</p>
                </div>

                {authError && (
                    <div className="bg-red-900/20 border border-red-500/50 text-red-400 p-3 rounded mb-6 text-sm font-mono flex items-center gap-2">
                        <Shield className="w-4 h-4" />
                        {authError}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    {!isLogin && (
                        <div className="relative">
                            <UserIcon className="absolute left-3 top-3 w-5 h-5 text-gray-500" />
                            <input
                                type="text"
                                placeholder="Operative ID (Username)"
                                required
                                className="w-full bg-gray-900 border border-gray-700 text-white pl-10 pr-4 py-3 rounded focus:outline-none focus:border-brand-mint/50 focus:ring-1 focus:ring-brand-mint/50 font-mono text-sm transition-all"
                                value={formData.username}
                                onChange={e => setFormData({ ...formData, username: e.target.value })}
                            />
                        </div>
                    )}

                    <div className="relative">
                        <Mail className="absolute left-3 top-3 w-5 h-5 text-gray-500" />
                        <input
                            type="email"
                            placeholder="Secure Comm Relay (Email)"
                            required
                            className="w-full bg-gray-900 border border-gray-700 text-white pl-10 pr-4 py-3 rounded focus:outline-none focus:border-brand-mint/50 focus:ring-1 focus:ring-brand-mint/50 font-mono text-sm transition-all"
                            value={formData.email}
                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                        />
                    </div>

                    <div className="relative">
                        <Lock className="absolute left-3 top-3 w-5 h-5 text-gray-500" />
                        <input
                            type="password"
                            placeholder="Server Password"
                            required
                            className="w-full bg-gray-900 border border-gray-700 text-white pl-10 pr-4 py-3 rounded focus:outline-none focus:border-brand-mint/50 focus:ring-1 focus:ring-brand-mint/50 font-mono text-sm transition-all"
                            value={formData.password}
                            onChange={e => setFormData({ ...formData, password: e.target.value })}
                        />
                    </div>

                    <div className="relative">
                        <Lock className="absolute left-3 top-3 w-5 h-5 text-brand-mint/50" />
                        <input
                            type="password"
                            placeholder="Local Encryption Passphrase"
                            required
                            className="w-full bg-gray-900 border border-brand-mint/30 text-white pl-10 pr-4 py-3 rounded focus:outline-none focus:border-brand-mint/70 focus:ring-1 focus:ring-brand-mint/70 font-mono text-sm transition-all"
                            value={formData.passphrase}
                            onChange={e => setFormData({ ...formData, passphrase: e.target.value })}
                        />
                        <p className="text-[10px] text-gray-500 font-mono mt-1 text-center font-bold tracking-tighter">NEVER SENT TO SERVER. REQUIRED TO DECRYPT MESSAGES.</p>
                    </div>

                    <button
                        type="submit"
                        disabled={isAuthLoading}
                        className="w-full bg-brand-mint/10 hover:bg-brand-mint/20 text-brand-mint border border-brand-mint/50 rounded py-3 font-mono text-sm font-bold tracking-widest uppercase transition-all flex items-center justify-center gap-2 mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isAuthLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                        {isLogin ? 'Authenticate' : 'Initialize Keys'}
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <button
                        type="button"
                        onClick={() => setIsLogin(!isLogin)}
                        className="text-xs text-gray-500 hover:text-brand-mint font-mono transition-colors"
                    >
                        {isLogin ? "NO ACCESS CODES? DEPLOY NEW INSTANCE" : "RETURNING OPERATIVE? AUTHENTICATE"}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AuthScreen;

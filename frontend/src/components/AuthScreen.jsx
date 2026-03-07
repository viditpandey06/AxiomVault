import React, { useState } from 'react';
import { Shield, Fingerprint, Lock, Mail, User as UserIcon, Loader2, ArrowLeft, Key } from 'lucide-react';
import { useGoogleLogin } from '@react-oauth/google';
import useChatStore from '../store/chatStore';

const AuthScreen = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [formData, setFormData] = useState({ username: '', email: '', password: '', passphrase: '' });

    // Google OAuth multi-step state
    // null = default, 'google_passphrase_new' = new user needs passphrase, 'google_passphrase_existing' = returning user needs passphrase
    const [googleStep, setGoogleStep] = useState(null);
    const [googleEmail, setGoogleEmail] = useState('');
    const [googlePassphrase, setGooglePassphrase] = useState('');
    const [googlePassphraseConfirm, setGooglePassphraseConfirm] = useState('');

    const { login, signup, googleLogin, completeGoogleSignup, completeGoogleLogin, authError, isAuthLoading } = useChatStore();

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (isLogin) {
            await login(formData.email, formData.password, formData.passphrase);
        } else {
            await signup(formData.username, formData.email, formData.password, formData.passphrase);
        }
    };

    const handleGoogleSuccess = async (tokenResponse) => {
        // Use the access token to get the ID token via Google's tokeninfo
        // Actually, useGoogleLogin with flow: 'auth-code' won't work directly.
        // We need the credential (ID token). Let's use the implicit flow.
        // The @react-oauth/google GoogleLogin button gives us the credential directly.
        // But useGoogleLogin gives us an access_token instead.
        // Let's switch to using the GoogleLogin component approach via credential.
    };

    // We'll handle Google auth via a custom button that triggers the Google One Tap / popup
    const handleGoogleAuth = async (credentialResponse) => {
        const result = await googleLogin(credentialResponse.credential);
        if (!result) return; // error was set in store

        setGoogleEmail(result.email);

        if (result.isNewUser) {
            setGoogleStep('google_passphrase_new');
        } else {
            setGoogleStep('google_passphrase_existing');
        }
    };

    const handleGooglePassphraseSubmit = async (e) => {
        e.preventDefault();

        if (googleStep === 'google_passphrase_new') {
            if (googlePassphrase !== googlePassphraseConfirm) {
                useChatStore.setState({ authError: 'Passphrases do not match' });
                return;
            }
            if (googlePassphrase.length < 6) {
                useChatStore.setState({ authError: 'Passphrase must be at least 6 characters' });
                return;
            }
            await completeGoogleSignup(googlePassphrase, googleEmail);
        } else {
            await completeGoogleLogin(googlePassphrase);
        }
    };

    const handleBackToMain = () => {
        setGoogleStep(null);
        setGooglePassphrase('');
        setGooglePassphraseConfirm('');
        useChatStore.setState({ authError: null });
    };

    // Google passphrase step UI
    if (googleStep) {
        const isNewUser = googleStep === 'google_passphrase_new';
        return (
            <div className="min-h-screen w-full bg-brand-bg flex flex-col justify-center items-center relative overflow-hidden">
                <div className="absolute inset-0 z-0 opacity-10 pointer-events-none"
                    style={{ backgroundImage: 'radial-gradient(#06b6d4 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

                <div className="z-10 w-[calc(100%-2rem)] max-w-md mx-4 bg-brand-panel p-6 md:p-8 rounded-xl border border-brand-border shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-brand-mint to-transparent opacity-50" />

                    <button
                        onClick={handleBackToMain}
                        className="flex items-center gap-1 text-xs text-gray-500 hover:text-brand-mint font-mono mb-6 transition-colors"
                    >
                        <ArrowLeft size={14} />
                        BACK TO LOGIN
                    </button>

                    <div className="flex flex-col items-center mb-6">
                        <div className="w-14 h-14 bg-gray-800 rounded-full flex items-center justify-center border border-brand-mint/30 mb-4 shadow-[0_0_20px_rgba(6,182,212,0.15)]">
                            <Key className="w-7 h-7 text-brand-mint" />
                        </div>
                        <h2 className="text-lg font-mono font-bold text-white tracking-wider">
                            {isNewUser ? 'CREATE ENCRYPTION KEY' : 'UNLOCK ENCRYPTION KEY'}
                        </h2>
                        <p className="text-xs text-gray-400 font-mono mt-2 text-center">
                            Signed in as <span className="text-brand-mint">{googleEmail}</span>
                        </p>
                        <p className="text-[10px] text-gray-500 font-mono mt-1 text-center max-w-xs">
                            {isNewUser
                                ? 'Create a passphrase to encrypt your private key. This is never sent to our servers.'
                                : 'Enter your encryption passphrase to unlock your private key.'
                            }
                        </p>
                    </div>

                    {authError && (
                        <div className="bg-red-900/20 border border-red-500/50 text-red-400 p-3 rounded mb-4 text-sm font-mono flex items-center gap-2">
                            <Shield className="w-4 h-4 flex-shrink-0" />
                            {authError}
                        </div>
                    )}

                    <form onSubmit={handleGooglePassphraseSubmit} className="space-y-4">
                        <div className="relative">
                            <Lock className="absolute left-3 top-3 w-5 h-5 text-brand-mint/50" />
                            <input
                                type="password"
                                placeholder={isNewUser ? 'Create Encryption Passphrase' : 'Enter Encryption Passphrase'}
                                required
                                minLength={isNewUser ? 6 : 1}
                                className="w-full bg-gray-900 border border-brand-mint/30 text-white pl-10 pr-4 py-3 rounded focus:outline-none focus:border-brand-mint/70 focus:ring-1 focus:ring-brand-mint/70 font-mono text-sm transition-all"
                                value={googlePassphrase}
                                onChange={e => setGooglePassphrase(e.target.value)}
                                autoFocus
                            />
                        </div>

                        {isNewUser && (
                            <div className="relative">
                                <Lock className="absolute left-3 top-3 w-5 h-5 text-brand-mint/50" />
                                <input
                                    type="password"
                                    placeholder="Confirm Encryption Passphrase"
                                    required
                                    minLength={6}
                                    className="w-full bg-gray-900 border border-brand-mint/30 text-white pl-10 pr-4 py-3 rounded focus:outline-none focus:border-brand-mint/70 focus:ring-1 focus:ring-brand-mint/70 font-mono text-sm transition-all"
                                    value={googlePassphraseConfirm}
                                    onChange={e => setGooglePassphraseConfirm(e.target.value)}
                                />
                            </div>
                        )}

                        <p className="text-[10px] text-gray-500 font-mono text-center font-bold tracking-tighter">
                            {isNewUser
                                ? '⚠ REMEMBER THIS PASSPHRASE. IF LOST, YOUR MESSAGES CANNOT BE RECOVERED.'
                                : 'NEVER SENT TO SERVER. REQUIRED TO DECRYPT MESSAGES.'
                            }
                        </p>

                        <button
                            type="submit"
                            disabled={isAuthLoading}
                            className="w-full bg-brand-mint/10 hover:bg-brand-mint/20 text-brand-mint border border-brand-mint/50 rounded py-3 font-mono text-sm font-bold tracking-widest uppercase transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isAuthLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
                            {isNewUser ? 'GENERATE & ENCRYPT KEYS' : 'DECRYPT PRIVATE KEY'}
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    // Default auth screen
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

                {/* Divider */}
                <div className="flex items-center gap-3 my-6">
                    <div className="flex-1 h-px bg-gray-700" />
                    <span className="text-[10px] text-gray-500 font-mono tracking-widest">OR</span>
                    <div className="flex-1 h-px bg-gray-700" />
                </div>

                {/* Google Sign-In Button */}
                <GoogleAuthButton onSuccess={handleGoogleAuth} disabled={isAuthLoading} />

                <div className="mt-6 text-center">
                    <button
                        type="button"
                        onClick={() => { setIsLogin(!isLogin); useChatStore.setState({ authError: null }); }}
                        className="text-xs text-gray-500 hover:text-brand-mint font-mono transition-colors"
                    >
                        {isLogin ? "NO ACCESS CODES? DEPLOY NEW INSTANCE" : "RETURNING OPERATIVE? AUTHENTICATE"}
                    </button>
                </div>
            </div>
        </div>
    );
};

// Custom Google Auth Button using the credential (ID token) flow
const GoogleAuthButton = ({ onSuccess, disabled }) => {
    // We need to use the Google Identity Services library directly
    // to get the credential (ID token) rather than access_token
    const handleClick = () => {
        if (disabled) return;

        // Use the google.accounts.id API that @react-oauth/google sets up
        if (window.google?.accounts?.id) {
            window.google.accounts.id.prompt((notification) => {
                // One Tap prompt — if dismissed, fall back to popup
                if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
                    // Trigger popup flow
                    window.google.accounts.id.prompt();
                }
            });
        }
    };

    // Register the callback when the component mounts
    React.useEffect(() => {
        const initTimer = setTimeout(() => {
            if (window.google?.accounts?.id) {
                window.google.accounts.id.initialize({
                    client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
                    callback: onSuccess,
                    auto_select: false,
                });

                const buttonDiv = document.getElementById('google-signin-btn');
                if (buttonDiv) {
                    // Clear previous renders
                    buttonDiv.innerHTML = '';
                    window.google.accounts.id.renderButton(buttonDiv, {
                        type: 'standard',
                        theme: 'filled_black',
                        size: 'large',
                        text: 'signin_with',
                        shape: 'rectangular',
                        width: 380,
                    });
                }
            }
        }, 300);
        return () => clearTimeout(initTimer);
    }, [onSuccess]);

    return (
        <div className="w-full flex justify-center">
            <div id="google-signin-btn" />
        </div>
    );
};

export default AuthScreen;

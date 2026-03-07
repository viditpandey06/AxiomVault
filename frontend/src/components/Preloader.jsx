import React from 'react';
import { motion } from 'framer-motion';
import { Shield } from 'lucide-react';

const Preloader = ({ message = "INITIALIZING KERNEL..." }) => {
    return (
        <div className="flex flex-col h-screen w-full items-center justify-center bg-brand-bg relative overflow-hidden">
            {/* Background Decor */}
            <div className="absolute inset-0 z-0 opacity-10 pointer-events-none"
                style={{ backgroundImage: 'radial-gradient(#06b6d4 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

            <div className="z-10 flex flex-col items-center">
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className="flex flex-col items-center"
                >
                    <div className="relative mb-8">
                        {/* Rotating scanner ring */}
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                            className="absolute -inset-6 border border-brand-mint/20 rounded-full border-t-brand-mint/80 border-l-brand-mint/40"
                        />
                        <motion.div
                            animate={{ rotate: -360 }}
                            transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
                            className="absolute -inset-4 border border-brand-mint/10 border-b-brand-mint/60 border-r-brand-mint/30 rounded-full"
                        />
                        <div className="w-20 h-20 bg-gray-900 rounded-full flex items-center justify-center border border-brand-mint/50 shadow-[0_0_30px_rgba(6,182,212,0.3)] relative overflow-hidden">
                            <motion.div
                                animate={{ y: ['-100%', '100%'] }}
                                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                className="absolute inset-0 bg-gradient-to-b from-transparent via-brand-mint/20 to-transparent"
                            />
                            <Shield className="w-10 h-10 text-brand-mint relative z-10" />
                        </div>
                    </div>

                    <motion.div
                        initial={{ y: 20, opacity: 0, filter: 'blur(10px)' }}
                        animate={{ y: 0, opacity: 1, filter: 'blur(0px)' }}
                        transition={{ delay: 0.3, duration: 0.8 }}
                        className="text-center"
                    >
                        <h1 className="text-4xl md:text-5xl font-mono font-bold text-white tracking-[0.2em] mb-2 drop-shadow-[0_0_15px_rgba(6,182,212,0.5)]">
                            AxiomVault
                        </h1>
                        <p className="text-[10px] md:text-xs text-brand-mint font-mono tracking-[0.4em] opacity-80 uppercase">
                            Secure End-to-End Encrypted Terminal
                        </p>
                    </motion.div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1, duration: 1 }}
                    className="mt-16 flex flex-col items-center gap-4"
                >
                    <div className="flex gap-2">
                        {[0, 1, 2].map((i) => (
                            <motion.div
                                key={i}
                                animate={{ opacity: [0.2, 1, 0.2] }}
                                transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
                                className="w-8 h-1 bg-brand-mint rounded-sm shadow-[0_0_5px_rgba(6,182,212,0.5)]"
                            />
                        ))}
                    </div>
                    <span className="text-[10px] font-mono text-gray-500 tracking-widest uppercase animate-pulse">{message}</span>
                </motion.div>
            </div>

            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.5, duration: 1 }}
                className="absolute bottom-8"
            >
                <p className="text-[10px] md:text-xs text-gray-500 font-mono tracking-widest">
                    made with precision by <span className="text-brand-mint font-bold text-sm tracking-widest shadow-brand-mint drop-shadow-md">Vidit</span>
                </p>
            </motion.div>
        </div>
    );
};

export default Preloader;

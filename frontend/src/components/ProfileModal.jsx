import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, Shield, Save, Loader2, User as UserIcon, LogOut, Camera, Check, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Cropper from 'react-easy-crop';
import clsx from 'clsx';
import useChatStore from '../store/chatStore';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Utility: create a cropped image from the crop area
async function getCroppedImg(imageSrc, pixelCrop) {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;

    ctx.drawImage(
        image,
        pixelCrop.x,
        pixelCrop.y,
        pixelCrop.width,
        pixelCrop.height,
        0,
        0,
        pixelCrop.width,
        pixelCrop.height
    );

    return new Promise((resolve) => {
        canvas.toBlob((blob) => {
            resolve(blob);
        }, 'image/jpeg', 0.9);
    });
}

function createImage(url) {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.addEventListener('load', () => resolve(image));
        image.addEventListener('error', (error) => reject(error));
        image.setAttribute('crossOrigin', 'anonymous');
        image.src = url;
    });
}

const ProfileModal = ({ isOpen, onClose }) => {
    const { user, token, logout } = useChatStore();
    const [formData, setFormData] = useState({
        username: '',
        age: '',
        gender: '',
        bio: '',
        status: ''
    });
    const [profilePhoto, setProfilePhoto] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [saveMsg, setSaveMsg] = useState('');
    const fileInputRef = useRef(null);

    // Cropper state
    const [cropImageSrc, setCropImageSrc] = useState(null);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

    useEffect(() => {
        if (isOpen && user) {
            fetchProfile();
        }
    }, [isOpen]);

    const fetchProfile = async () => {
        try {
            const res = await fetch(`${API_URL}/api/users/profile`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setFormData({
                    username: data.username || '',
                    age: data.age ?? '',
                    gender: data.gender || '',
                    bio: data.bio || '',
                    status: data.status || ''
                });
                setProfilePhoto(data.profile_photo || '');
            }
        } catch (err) {
            console.error("Failed to fetch profile:", err);
        }
    };

    const handlePhotoSelect = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            setSaveMsg('Only image files are allowed');
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            setSaveMsg('Image must be under 5MB');
            return;
        }

        // Read as data URL and open cropper
        const reader = new FileReader();
        reader.onload = (ev) => {
            setCropImageSrc(ev.target.result);
            setCrop({ x: 0, y: 0 });
            setZoom(1);
        };
        reader.readAsDataURL(file);
        // Reset file input so re-selecting same file works
        e.target.value = '';
    };

    const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    const handleCropConfirm = async () => {
        if (!croppedAreaPixels || !cropImageSrc) return;

        setIsUploading(true);
        setSaveMsg('');
        try {
            const croppedBlob = await getCroppedImg(cropImageSrc, croppedAreaPixels);

            // Check final size
            if (croppedBlob.size > 2 * 1024 * 1024) {
                setSaveMsg('Cropped image is too large. Try zooming out.');
                setIsUploading(false);
                return;
            }

            const formPayload = new FormData();
            formPayload.append('photo', croppedBlob, 'profile.jpg');

            const res = await fetch(`${API_URL}/api/users/profile/photo`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formPayload
            });
            const data = await res.json();
            if (res.ok) {
                setProfilePhoto(data.profile_photo);
                setCropImageSrc(null);
                setSaveMsg('Photo uploaded successfully');

                const currentUser = useChatStore.getState().user;
                const updatedUser = { ...currentUser, profile_photo: data.profile_photo };
                useChatStore.setState({ user: updatedUser });
                if (sessionStorage.getItem('chat_user')) {
                    sessionStorage.setItem('chat_user', JSON.stringify(updatedUser));
                }
                setTimeout(() => setSaveMsg(''), 2000);
            } else {
                setSaveMsg(data.error || 'Upload failed');
            }
        } catch (err) {
            console.error("Crop upload error:", err);
            setSaveMsg('Failed to upload cropped image');
        } finally {
            setIsUploading(false);
        }
    };

    const handleCropCancel = () => {
        setCropImageSrc(null);
        setCrop({ x: 0, y: 0 });
        setZoom(1);
    };

    const handleSave = async () => {
        setIsSaving(true);
        setSaveMsg('');
        try {
            const res = await fetch(`${API_URL}/api/users/profile`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });
            const data = await res.json();
            if (res.ok) {
                const currentUser = useChatStore.getState().user;
                const updatedUser = { ...currentUser, ...data };
                useChatStore.setState({ user: updatedUser });
                if (sessionStorage.getItem('chat_user')) {
                    sessionStorage.setItem('chat_user', JSON.stringify(updatedUser));
                }
                setSaveMsg('Profile updated successfully');
                setTimeout(() => setSaveMsg(''), 2000);
            } else {
                setSaveMsg(data.error || 'Update failed');
            }
        } catch (err) {
            setSaveMsg('Network error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleLogout = () => {
        logout();
        onClose();
    };

    if (!isOpen) return null;

    // If cropping mode is active, show full-screen cropper
    if (cropImageSrc) {
        return createPortal(
            <div className="fixed inset-0 z-[110] bg-black flex flex-col">
                {/* Cropper Header */}
                <div className="flex items-center justify-between p-4 bg-gray-900 border-b border-brand-border z-10">
                    <h3 className="text-white font-mono font-bold text-sm flex items-center gap-2">
                        <Camera className="w-4 h-4 text-brand-mint" />
                        CROP PROFILE IMAGE
                    </h3>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleCropCancel}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 rounded font-mono text-xs transition-colors"
                        >
                            <RotateCcw size={14} />
                            CANCEL
                        </button>
                        <button
                            onClick={handleCropConfirm}
                            disabled={isUploading}
                            className="flex items-center gap-1.5 px-4 py-1.5 bg-brand-mint text-black rounded font-mono text-xs font-bold hover:bg-brand-mint/80 transition-colors disabled:opacity-50"
                        >
                            {isUploading ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                            {isUploading ? 'UPLOADING...' : 'CONFIRM & UPLOAD'}
                        </button>
                    </div>
                </div>

                {/* Cropper Area */}
                <div className="flex-1 relative">
                    <Cropper
                        image={cropImageSrc}
                        crop={crop}
                        zoom={zoom}
                        aspect={1}
                        cropShape="round"
                        showGrid={false}
                        onCropChange={setCrop}
                        onZoomChange={setZoom}
                        onCropComplete={onCropComplete}
                    />
                </div>

                {/* Zoom Slider */}
                <div className="p-4 bg-gray-900 border-t border-brand-border flex items-center justify-center gap-4">
                    <span className="text-xs font-mono text-gray-500">ZOOM</span>
                    <input
                        type="range"
                        min={1}
                        max={3}
                        step={0.05}
                        value={zoom}
                        onChange={(e) => setZoom(Number(e.target.value))}
                        className="w-48 accent-brand-mint"
                    />
                    <span className="text-xs font-mono text-brand-mint w-8">{zoom.toFixed(1)}x</span>
                </div>
            </div>,
            document.body
        );
    }

    return createPortal(
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.95, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.95, opacity: 0, y: 20 }}
                    transition={{ duration: 0.2 }}
                    className="bg-brand-panel w-full max-w-md border border-brand-border rounded-lg shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
                    onClick={e => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-brand-border bg-gray-900/50">
                        <h2 className="text-white font-mono font-bold flex items-center gap-2">
                            <UserIcon className="w-4 h-4 text-brand-mint" />
                            OPERATIVE PROFILE
                        </h2>
                        <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Profile Avatar with Upload */}
                    <div className="flex flex-col items-center pt-6 pb-4 bg-gradient-to-b from-brand-mint/5 to-transparent">
                        <div
                            className="relative group cursor-pointer"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <div className="w-24 h-24 rounded-full bg-brand-mint/20 flex items-center justify-center border-2 border-brand-mint/50 shadow-[0_0_20px_rgba(6,182,212,0.2)] overflow-hidden">
                                {profilePhoto ? (
                                    <img src={profilePhoto} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-brand-mint text-3xl font-bold">
                                        {user?.username?.charAt(0).toUpperCase() || '?'}
                                    </span>
                                )}
                            </div>
                            {/* Hover overlay */}
                            <div className="absolute inset-0 rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <Camera className="w-6 h-6 text-white" />
                            </div>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handlePhotoSelect}
                            />
                        </div>
                        <p className="text-[10px] text-gray-500 font-mono mt-2">CLICK TO UPLOAD & CROP PHOTO</p>
                        <p className="text-sm text-gray-400 font-mono mt-1">{user?.email}</p>
                        <div className="flex items-center gap-1 mt-1">
                            <Shield size={12} className={user?.trust_score > 90 ? "text-brand-mint" : "text-amber-500"} />
                            <span className={clsx("text-xs font-mono font-bold", user?.trust_score > 90 ? "text-brand-mint" : "text-amber-500")}>
                                Trust: {user?.trust_score ?? 100}%
                            </span>
                        </div>
                    </div>

                    {/* Form */}
                    <div className="p-4 space-y-4">
                        {/* Status */}
                        <div>
                            <label className="text-[10px] text-gray-400 font-mono tracking-wider block mb-1">
                                STATUS <span className="text-gray-600">({(formData.status || '').length}/100)</span>
                            </label>
                            <input
                                type="text"
                                value={formData.status}
                                onChange={e => setFormData({ ...formData, status: e.target.value.slice(0, 100) })}
                                placeholder="What's your status, operative?"
                                className="w-full bg-gray-900 border border-gray-700 text-white px-3 py-2 rounded focus:outline-none focus:border-brand-mint/50 font-mono text-sm"
                            />
                        </div>

                        <div>
                            <label className="text-[10px] text-gray-400 font-mono tracking-wider block mb-1">OPERATIVE ID</label>
                            <input
                                type="text"
                                value={formData.username}
                                onChange={e => setFormData({ ...formData, username: e.target.value })}
                                className="w-full bg-gray-900 border border-gray-700 text-white px-3 py-2 rounded focus:outline-none focus:border-brand-mint/50 font-mono text-sm"
                            />
                        </div>

                        <div className="flex gap-3">
                            <div className="flex-1">
                                <label className="text-[10px] text-gray-400 font-mono tracking-wider block mb-1">AGE</label>
                                <input
                                    type="number"
                                    min="13"
                                    max="120"
                                    value={formData.age}
                                    onChange={e => setFormData({ ...formData, age: e.target.value })}
                                    placeholder="—"
                                    className="w-full bg-gray-900 border border-gray-700 text-white px-3 py-2 rounded focus:outline-none focus:border-brand-mint/50 font-mono text-sm"
                                />
                            </div>
                            <div className="flex-1">
                                <label className="text-[10px] text-gray-400 font-mono tracking-wider block mb-1">GENDER</label>
                                <select
                                    value={formData.gender}
                                    onChange={e => setFormData({ ...formData, gender: e.target.value })}
                                    className="w-full bg-gray-900 border border-gray-700 text-white px-3 py-2 rounded focus:outline-none focus:border-brand-mint/50 font-mono text-sm appearance-none"
                                >
                                    <option value="">—</option>
                                    <option value="male">Male</option>
                                    <option value="female">Female</option>
                                    <option value="other">Other</option>
                                    <option value="prefer_not_to_say">Prefer not to say</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="text-[10px] text-gray-400 font-mono tracking-wider block mb-1">BIO <span className="text-gray-600">({(formData.bio || '').length}/200)</span></label>
                            <textarea
                                value={formData.bio}
                                onChange={e => setFormData({ ...formData, bio: e.target.value.slice(0, 200) })}
                                placeholder="Tell operatives about yourself..."
                                rows={3}
                                className="w-full bg-gray-900 border border-gray-700 text-white px-3 py-2 rounded focus:outline-none focus:border-brand-mint/50 font-mono text-sm resize-none"
                            />
                        </div>

                        {saveMsg && (
                            <div className={clsx("text-xs font-mono text-center py-1 rounded",
                                saveMsg.includes('success') ? "text-brand-mint bg-brand-mint/10" : "text-red-400 bg-red-900/20"
                            )}>
                                {saveMsg}
                            </div>
                        )}

                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="w-full bg-brand-mint/10 hover:bg-brand-mint/20 text-brand-mint border border-brand-mint/50 rounded py-2.5 font-mono text-sm font-bold tracking-widest uppercase transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            {isSaving ? 'SAVING...' : 'SAVE PROFILE'}
                        </button>
                    </div>

                    {/* Logout */}
                    <div className="p-4 border-t border-brand-border">
                        <button
                            onClick={handleLogout}
                            className="w-full bg-red-900/20 hover:bg-red-900/40 text-red-400 border border-red-500/30 rounded py-2 font-mono text-xs font-bold tracking-widest uppercase transition-all flex items-center justify-center gap-2"
                        >
                            <LogOut className="w-3.5 h-3.5" />
                            TERMINATE SESSION
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>,
        document.body
    );
};

export default ProfileModal;

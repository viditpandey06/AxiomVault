import React, { useEffect, useState } from 'react';
import Sidebar from './components/Sidebar';
import ChatArea from './components/ChatArea';
import AuthScreen from './components/AuthScreen';
import Preloader from './components/Preloader';
import FreezeScreen from './components/FreezeScreen';
import useChatStore from './store/chatStore';
import clsx from 'clsx';

function App() {
  const { activeChatId, chats, token, connectSocket, disconnectSocket, restoreSession, isFrozen } = useChatStore();
  const [isRestoring, setIsRestoring] = useState(true);
  const [showPreloader, setShowPreloader] = useState(true);
  const activeChatInfo = chats.find((c) => c.id === activeChatId);

  useEffect(() => {
    const initSession = async () => {
      await restoreSession();
      setIsRestoring(false);
    };
    initSession();

    // Minimum Preloader display time (4.5 seconds)
    const timer = setTimeout(() => {
      setShowPreloader(false);
    }, 4500);
    return () => clearTimeout(timer);
  }, [restoreSession]);

  useEffect(() => {
    if (token) {
      connectSocket();
    }
    return () => {
      disconnectSocket();
    };
  }, [token, connectSocket, disconnectSocket]);

  if (showPreloader || isRestoring) {
    return <Preloader message={isRestoring ? "REHYDRATING SYSTEM KERNEL..." : "INITIALIZING COMMUNICATION PROTOCOLS..."} />;
  }

  if (!token) {
    return <AuthScreen />;
  }

  return (
    <div className="flex h-[100dvh] w-full bg-brand-bg text-gray-200 overflow-hidden selection:bg-brand-mint/30">
      {isFrozen && <FreezeScreen />}

      <div className={clsx("h-full w-full md:w-80 flex-shrink-0 md:flex transition-all duration-300", activeChatId ? "hidden" : "flex")}>
        <Sidebar className="w-full flex-1" />
      </div>

      <div className={clsx("h-full flex-1 min-w-0 md:flex transition-all duration-300", !activeChatId ? "hidden" : "flex")}>
        <ChatArea activeChatInfo={activeChatInfo} />
      </div>
    </div>
  );
}

export default App;

import React, { useEffect, useState } from 'react';
import Sidebar from './components/Sidebar';
import ChatArea from './components/ChatArea';
import AuthScreen from './components/AuthScreen';
import Preloader from './components/Preloader';
import FreezeScreen from './components/FreezeScreen';
import useChatStore from './store/chatStore';
import clsx from 'clsx';

function App() {
  const { activeChatId, chats, token, connectSocket, disconnectSocket, restoreSession, isFrozen, unreadCounts } = useChatStore();
  const [isRestoring, setIsRestoring] = useState(true);
  const [showPreloader, setShowPreloader] = useState(true);
  const [isServerAwake, setIsServerAwake] = useState(false);
  const [preloaderMessage, setPreloaderMessage] = useState("INITIALIZING COMMUNICATION PROTOCOLS...");
  const activeChatInfo = chats.find((c) => c.id === activeChatId);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  useEffect(() => {
    let isMounted = true;
    let pingInterval;

    const initSession = async () => {
      await restoreSession();
      if (isMounted) setIsRestoring(false);
    };
    initSession();

    // Minimum cinematic display time
    const minTimer = new Promise(resolve => setTimeout(resolve, 4500));

    // Ping function to check if backend is online
    const checkServer = async () => {
      try {
        const res = await fetch(`${API_URL}/api/health`);
        if (res.ok) {
          if (isMounted) setIsServerAwake(true);
          return true;
        }
      } catch (err) {
        // Server is likely sleeping
      }
      return false;
    };

    // Execute initial ping
    checkServer().then(awake => {
      if (!awake && isMounted) {
        // If not immediately awake, start pinging every 3s and update message
        setTimeout(() => {
          if (isMounted && !isServerAwake) {
            setPreloaderMessage("WAKING SECURE SERVERS... ESTABLISHING TUNNELS...");
          }
        }, 3000); // Wait 3s before showing the "waking" message to allow for normal network latency

        pingInterval = setInterval(async () => {
          const nowAwake = await checkServer();
          if (nowAwake) {
            clearInterval(pingInterval);
          }
        }, 3000);
      }
    });

    return () => {
      isMounted = false;
      if (pingInterval) clearInterval(pingInterval);
    };
  }, [restoreSession, API_URL]);

  // Combine conditions to hide preloader
  // We hide it only when: minimum time has passed (we can track this with a state) AND server is awake AND restoring is done.
  const [minTimePassed, setMinTimePassed] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMinTimePassed(true), 4500);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    // Hide preloader once all requirements are met
    if (minTimePassed && isServerAwake && !isRestoring) {
      setShowPreloader(false);
    }
  }, [minTimePassed, isServerAwake, isRestoring]);

  useEffect(() => {
    if (token) {
      connectSocket();
    }
    return () => {
      disconnectSocket();
    };
  }, [token, connectSocket, disconnectSocket]);

  useEffect(() => {
    const totalUnread = Object.values(unreadCounts).reduce((sum, count) => sum + count, 0);
    if (totalUnread > 0) {
      document.title = `(${totalUnread}) AxiomVault - Secure Chat`;
    } else {
      document.title = 'AxiomVault';
    }
  }, [unreadCounts]);

  if (showPreloader || isRestoring) {
    return <Preloader message={isRestoring ? "REHYDRATING SYSTEM KERNEL..." : preloaderMessage} />;
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

import React, { useState, useEffect } from 'react';
import { Search, Radio, LogOut, ShieldCheck, Building2, Menu, CloudOff } from 'lucide-react';

export default function TopHeader({ 
  searchQuery, 
  setSearchQuery, 
  currentUser, 
  onLogout,
  isCollapsed,
  setIsCollapsed
}) {
  const [timeStr, setTimeStr] = useState('');
  const [isOnline, setIsOnline] = useState(() => typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [queueCount, setQueueCount] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('roadwatch_offline_queue') || '[]').length;
    } catch {
      return 0;
    }
  });

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    const handleStorage = () => {
      try {
        setQueueCount(JSON.parse(localStorage.getItem('roadwatch_offline_queue') || '[]').length);
      } catch {}
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('storage', handleStorage);

    const timer = setInterval(() => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString() + ' IST');
      try {
        setQueueCount(JSON.parse(localStorage.getItem('roadwatch_offline_queue') || '[]').length);
      } catch {}
    }, 1000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('storage', handleStorage);
      clearInterval(timer);
    };
  }, []);

  const isVendor = currentUser?.role === 'vendor';

  return (
    <header className="top-header">
      {/* Mobile Hamburger Button */}
      <button 
        className="mobile-header-menu-btn"
        onClick={() => setIsCollapsed(!isCollapsed)}
        title="Toggle Menu"
      >
        <Menu className="w-5 h-5 text-slate-700" />
      </button>

      <div className="header-search">
        <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
        <input
          type="text"
          placeholder={isVendor ? "Search tenders, contract ID (#POT-1092)..." : "Search road location or defect ID (#POT-1092)..."}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="header-controls">
        <div className="live-clock">{timeStr || '--:--:-- IST'}</div>

        {/* Global Network Status & Offline Queue Pill (MNC Authority Only) */}
        {!isVendor && (
          <div className={`network-header-pill ${isOnline ? 'online' : 'offline'}`} title={isOnline ? "Network Connected" : "Operating in Offline Field Mode"}>
            {isOnline ? (
              <>
                <span className="network-dot online" />
                <span>Online</span>
                {queueCount > 0 && <span className="queue-chip">{queueCount} pending</span>}
              </>
            ) : (
              <>
                <CloudOff className="w-3.5 h-3.5" />
                <span>Offline</span>
                <span className="queue-chip alert">{queueCount} in queue</span>
              </>
            )}
          </div>
        )}
        {/* Role Pill Indicator */}
        <div className={`role-header-pill ${isVendor ? 'vendor' : 'mnc'}`}>
          {isVendor ? (
            <>
              <Building2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>Vendor Portal</span>
            </>
          ) : (
            <>
              <ShieldCheck className="w-4 h-4 text-indigo-600 flex-shrink-0" />
              <span>MNC Authority</span>
            </>
          )}
        </div>

        {/* Active Telemetry Badge */}
        {!isVendor && (
          <div className="badge-status header-vehicle-badge">
            <Radio className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
            <span>3 Active Vehicles</span>
          </div>
        )}

        {/* User Profile */}
        {currentUser && (
          <div className="user-profile header-user-profile">
            <img src={currentUser.avatar} alt={currentUser.name} />
            <div className="user-info">
              <span className="name">{currentUser.name}</span>
              <span className="role">{currentUser.organization}</span>
            </div>
          </div>
        )}

        {/* Logout Action Button */}
        <button 
          className="header-logout-btn" 
          onClick={onLogout} 
          title="Sign Out / Switch Role"
        >
          <LogOut className="w-4 h-4" />
          <span className="logout-text">Logout</span>
        </button>
      </div>
    </header>
  );
}

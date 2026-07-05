import React, { useState } from 'react';
import { 
  Terminal as TerminalIcon, 
  Bell, 
  ShieldAlert, 
  Search, 
  LogOut, 
  Cpu, 
  Maximize2, 
  Minimize2,
  Settings,
  ChevronDown,
  Activity,
  CheckCircle,
  FileText,
  Sun,
  Moon
} from 'lucide-react';
import { UserPreferences, SignalLog } from '../types';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  type: 'ticket' | 'error';
  isRead: boolean;
}

interface HeaderProps {
  preferences: UserPreferences;
  onOpenTerminal: () => void;
  onOpenSettings: () => void;
  activeAlerts: SignalLog[];
  unreadNotifications: AppNotification[];
  onClearNotification: (id: string) => void;
  onClearAllNotifications: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onSearchSubmit: (query: string) => void;
  onSecureExit: () => void;
  onExportDailyBriefing: () => void;
  onToggleTheme: () => void;
}

export default function Header({
  preferences,
  onOpenTerminal,
  onOpenSettings,
  activeAlerts,
  unreadNotifications,
  onClearNotification,
  onClearAllNotifications,
  searchQuery,
  setSearchQuery,
  onSearchSubmit,
  onSecureExit,
  onExportDailyBriefing,
  onToggleTheme
}: HeaderProps) {
  const [showAlertsDropdown, setShowAlertsDropdown] = useState(false);
  const [requestPermissionLoading, setRequestPermissionLoading] = useState(false);

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) return;
    setRequestPermissionLoading(true);
    try {
      await Notification.requestPermission();
    } catch (err) {
      console.error(err);
    }
    setRequestPermissionLoading(false);
  };

  // Parse custom theme colors
  const headerBgStyle = {
    backgroundColor: preferences.headerColor,
    color: '#ffffff'
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      onSearchSubmit(searchQuery);
    }
  };

  const isLeftHeader = preferences.headerPosition === 'left';

  return (
    <header 
      id="app-header"
      className={`
        transition-all duration-300 z-40 shadow-md flex select-none border-b border-white/10
        ${isLeftHeader 
          ? 'lg:w-64 lg:h-screen lg:flex-col lg:p-6 lg:fixed lg:left-0 lg:top-0 lg:overflow-y-auto w-full h-16 items-center justify-between px-4 sticky top-0 flex-row' 
          : 'w-full h-16 items-center justify-between px-4 lg:px-6 sticky top-0 flex-row'
        }
      `}
      style={headerBgStyle}
    >
      {/* Brand Logo & Name */}
      <div className={`flex items-center gap-3 ${isLeftHeader ? 'lg:flex-col lg:items-start lg:mb-8' : ''}`}>
        <div className="p-2 bg-rose-600 rounded-lg animate-pulse shadow-md shadow-rose-600/30">
          <Cpu className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="font-sans font-bold tracking-tight text-white text-lg flex items-center gap-1.5">
            Kynren <span className="text-rose-400 font-semibold text-xs bg-rose-500/20 px-2 py-0.5 rounded-full uppercase border border-rose-500/30">Tech OPS</span>
          </h1>
          <p className="text-[10px] text-slate-300 font-mono tracking-widest uppercase">Logistics & Realtime Monitor</p>
        </div>
      </div>

      {/* Global Search Bar */}
      <div className={`relative ${isLeftHeader ? 'lg:w-full lg:mb-6 flex-1 max-w-md lg:mx-0 mx-2' : 'flex-1 max-w-md mx-6'}`}>
        <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
          <Search className="w-4 h-4 text-slate-300" />
        </span>
        <input
          id="global-header-search"
          type="text"
          placeholder="Search assets, tickets, knowledge..."
          className="w-full bg-white/10 text-white placeholder-slate-300 text-sm pl-9 pr-4 py-1.5 rounded-lg border border-white/10 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={handleSearchKeyDown}
        />
        {searchQuery && (
          <button 
            onClick={() => { setSearchQuery(''); onSearchSubmit(''); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white px-1"
          >
            Clear
          </button>
        )}
      </div>

      {/* Center diagnostic nodes & security info when top header */}
      {!isLeftHeader && (
        <div className="hidden lg:flex items-center gap-6 text-sm font-mono text-slate-200">
          <div className="flex items-center gap-2 bg-black/20 px-3 py-1.5 rounded-md border border-white/5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
            <span className="text-slate-400">Node IP:</span>
            <span className="text-emerald-400 font-semibold">{preferences.clientIp}</span>
          </div>
          
          <div className="flex items-center gap-2 bg-black/20 px-3 py-1.5 rounded-md border border-white/5">
            <Activity className="w-4 h-4 text-cyan-400" />
            <span className="text-slate-400">Latency:</span>
            <span className="text-cyan-400 font-semibold">12ms</span>
          </div>
        </div>
      )}

      {/* Action Tray */}
      <div className={`flex items-center gap-4 ${isLeftHeader ? 'lg:flex-col lg:items-stretch lg:mt-auto lg:gap-4 lg:w-full flex-row mt-0 w-auto' : ''}`}>
        
        {isLeftHeader && (
          <div className="hidden lg:flex flex-col gap-2 p-3 rounded-lg bg-black/20 font-mono text-xs border border-white/5 mb-4">
            <div className="flex justify-between">
              <span className="text-slate-400">IP Node:</span>
              <span className="text-emerald-400 font-semibold">{preferences.clientIp}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Ping:</span>
              <span className="text-cyan-400 font-semibold">12ms (Stable)</span>
            </div>
          </div>
        )}

        {/* Security Alerts Dropdown Trigger */}
        <div className="relative">
          <button
            id="alerts-dropdown-btn"
            onClick={() => setShowAlertsDropdown(!showAlertsDropdown)}
            className="relative p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer flex items-center justify-center"
          >
            <Bell className="w-5 h-5" />
            {unreadNotifications.length > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white ring-2 ring-slate-800">
                {unreadNotifications.length}
              </span>
            )}
          </button>

          {/* Alerts & Notifications Dropdown List */}
          {showAlertsDropdown && (
            <div className={`
              absolute right-0 mt-2 w-80 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden font-sans
              ${isLeftHeader ? 'lg:bottom-12 lg:left-0 lg:mt-0 lg:mb-2 right-0 mt-2' : ''}
            `}>
              <div className="p-3 bg-slate-800 border-b border-slate-700 flex justify-between items-center">
                <span className="text-sm font-semibold text-white flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-rose-500" /> System Alerts
                </span>
                <div className="flex items-center gap-2">
                  {unreadNotifications.length > 0 && (
                    <button 
                      onClick={onClearAllNotifications}
                      className="text-[10px] text-rose-400 hover:text-rose-300 font-mono font-bold uppercase transition-colors"
                    >
                      Clear All
                    </button>
                  )}
                  <span className="text-xs text-rose-400 font-semibold bg-rose-500/20 px-2 py-0.5 rounded-full">
                    {unreadNotifications.length} Unread
                  </span>
                </div>
              </div>

              {/* Native browser notifications trigger */}
              {typeof window !== 'undefined' && 'Notification' in window && Notification.permission !== 'granted' && (
                <div className="bg-rose-950/20 border-b border-slate-800 p-2 text-center">
                  <button
                    onClick={requestNotificationPermission}
                    disabled={requestPermissionLoading}
                    className="text-[10px] text-rose-300 hover:text-white font-mono uppercase tracking-wider underline disabled:opacity-50"
                  >
                    {requestPermissionLoading ? 'Enabling...' : 'Enable Browser Notifications'}
                  </button>
                </div>
              )}

              <div className="max-h-64 overflow-y-auto divide-y divide-slate-800 scrollbar-thin scrollbar-thumb-slate-800">
                {unreadNotifications.length === 0 ? (
                  <div className="p-6 text-center text-slate-400 text-xs font-sans">
                    <CheckCircle className="w-8 h-8 text-emerald-500/30 mx-auto mb-2 animate-pulse" />
                    No unread notifications. All operational systems nominal.
                  </div>
                ) : (
                  unreadNotifications.map((notification) => (
                    <div key={notification.id} className="p-3 hover:bg-slate-800/40 transition-colors group flex justify-between items-start gap-2">
                      <div className="flex-1">
                        <div className="flex justify-between items-start mb-1">
                          <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                            notification.type === 'error' 
                              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' 
                              : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          }`}>
                            {notification.title}
                          </span>
                          <span className="text-[9px] text-slate-500 font-mono">
                            {new Date(notification.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-xs text-slate-200 line-clamp-2 leading-relaxed">{notification.message}</p>
                      </div>
                      
                      <button
                        onClick={() => onClearNotification(notification.id)}
                        className="text-[10px] text-slate-500 hover:text-white p-1 hover:bg-slate-800 rounded transition-all"
                        title="Dismiss"
                      >
                        ✕
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Global Theme Toggle Button */}
        <button
          id="global-theme-toggle"
          onClick={onToggleTheme}
          className="p-2 px-3 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer flex items-center gap-2 justify-center animate-fade-in border border-white/5"
          title={`Showground Ambient Lighting: Switch to ${preferences.theme === 'dark' ? 'Light' : 'Dark'} mode`}
        >
          {preferences.theme === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-400 animate-pulse" />
          ) : (
            <Moon className="w-4 h-4 text-indigo-300" />
          )}
          <span className="text-[10px] font-mono font-bold hidden md:inline uppercase tracking-wider">
            {preferences.theme === 'dark' ? 'Day Light Mode' : 'Night Dark Mode'}
          </span>
          {isLeftHeader && <span className="text-sm font-medium ml-2 hidden lg:inline">{preferences.theme === 'dark' ? 'Light Theme' : 'Dark Theme'}</span>}
        </button>

        {/* Export Dashboard Summary Button */}
        <button
          onClick={onExportDailyBriefing}
          className="p-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white transition-all cursor-pointer flex items-center gap-1.5 justify-center"
          title="Export Daily Briefing PDF"
        >
          <FileText className="w-5 h-5 text-white animate-pulse" />
          {!isLeftHeader && <span className="text-xs font-semibold px-0.5 hidden sm:inline">Export Briefing</span>}
          {isLeftHeader && <span className="text-sm font-medium hidden lg:inline">Export Briefing</span>}
        </button>

        {/* Terminal Button */}
        <button
          id="terminal-toggle-btn"
          onClick={onOpenTerminal}
          className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer flex items-center gap-1.5 justify-center"
          title="Open Technical Ops Terminal"
        >
          <TerminalIcon className="w-5 h-5 text-emerald-400" />
          {isLeftHeader && <span className="text-sm font-medium hidden lg:inline">Terminal Ops</span>}
        </button>

        {/* Settings Button */}
        <button
          onClick={onOpenSettings}
          className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer flex items-center gap-1.5 justify-center"
          title="System Settings"
        >
          <Settings className="w-5 h-5 text-slate-300" />
          {isLeftHeader && <span className="text-sm font-medium hidden lg:inline">Settings</span>}
        </button>

        {/* User Badge */}
        <div className={`flex items-center gap-2.5 ${isLeftHeader ? 'lg:border-t lg:border-white/10 lg:pt-4 lg:mt-2' : ''}`}>
          <img
            src={preferences.profileImage || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=faces'}
            alt="Profile"
            className="w-8 h-8 rounded-full border border-rose-500/40 object-cover"
          />
          {!isLeftHeader && (
            <div className="hidden md:block text-left">
              <p className="text-xs font-semibold text-white leading-tight">{preferences.displayName}</p>
              <p className="text-[10px] text-rose-300 font-medium">Admin Node</p>
            </div>
          )}
          {isLeftHeader && (
            <div className="flex-1 text-left hidden lg:block">
              <p className="text-sm font-semibold text-white leading-tight">{preferences.displayName}</p>
              <p className="text-xs text-rose-300 font-medium">Technical Logistics Admin</p>
            </div>
          )}
        </div>

        {/* Secure Exit */}
        <button
          id="secure-exit-btn"
          onClick={onSecureExit}
          className={`
            p-2 rounded-lg bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white transition-all cursor-pointer flex items-center justify-center
            ${isLeftHeader ? 'lg:w-full lg:gap-2 lg:mt-2 lg:text-sm lg:font-semibold lg:py-2.5' : ''}
          `}
          title="Secure Exit"
        >
          <LogOut className="w-4 h-4" />
          {isLeftHeader && <span className="hidden lg:inline">Secure Exit</span>}
        </button>

      </div>
    </header>
  );
}

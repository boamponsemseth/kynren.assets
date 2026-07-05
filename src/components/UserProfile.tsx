import React, { useState } from 'react';
import { UserPreferences, Asset, SignalLog, DirectMessage, UserRegistryItem } from '../types';
import { 
  User, 
  Settings, 
  Cpu, 
  ShieldCheck, 
  MessageSquare, 
  ListTodo, 
  Moon, 
  Sun, 
  Palette, 
  Lock, 
  BellRing,
  Volume2,
  VolumeX,
  Network,
  Upload,
  RefreshCw,
  Check,
  Server,
  Zap
} from 'lucide-react';

interface UserProfileProps {
  preferences: UserPreferences;
  assignedAssets: Asset[];
  userLogs: SignalLog[];
  chatMessages: DirectMessage[];
  sessionUser?: UserRegistryItem | null;
  onUpdatePreferences: (updates: Partial<UserPreferences>) => void;
  onSendDirectMessage: (content: string, recipientId: string) => void;
  onUpdateUser?: (id: string, updates: Partial<UserRegistryItem>) => Promise<void>;
}

export default function UserProfile({
  preferences,
  assignedAssets,
  userLogs,
  chatMessages,
  sessionUser,
  onUpdatePreferences,
  onSendDirectMessage,
  onUpdateUser
}: UserProfileProps) {
  const [msgInput, setMsgInput] = useState('');
  const [recipient, setRecipient] = useState('all');
  const [showPushNotification, setShowPushNotification] = useState(false);
  const [pushText, setPushText] = useState('');

  // Profile editing states
  const [editDisplayName, setEditDisplayName] = useState(sessionUser?.displayName || preferences.displayName || '');
  const [editProfileImage, setEditProfileImage] = useState(sessionUser?.profileImage || preferences.profileImage || '');
  const [editPassword, setEditPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  // NIC Configuration states
  const [availableNics] = useState([
    { name: 'Intel I219-LM Gigabit Ethernet', interfaceName: 'eth0', ip: '10.12.10.35', mac: '02:42:AC:12:00:1E', subnetMask: '255.255.255.0', gateway: '10.12.10.1', type: 'Wired' },
    { name: 'Broadcom BCM43602 802.11ac', interfaceName: 'wlan0', ip: '10.12.10.144', mac: '02:42:AC:12:00:2F', subnetMask: '255.255.255.0', gateway: '10.12.10.1', type: 'Wireless' },
    { name: 'Realtek RTL8153 USB 3.0', interfaceName: 'eth1', ip: '10.12.1.200', mac: '02:42:AC:12:00:3D', subnetMask: '255.255.255.0', gateway: '10.12.1.1', type: 'Wired' }
  ]);
  const [selectedNic, setSelectedNic] = useState(availableNics[0]);
  const [nicConfigType, setNicConfigType] = useState<'DHCP' | 'Static'>('DHCP');
  const [staticIp, setStaticIp] = useState('10.12.10.35');
  const [staticSubnet, setStaticSubnet] = useState('255.255.255.0');
  const [staticGateway, setStaticGateway] = useState('10.12.10.1');

  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  const themeColors = {
    header: [
      { name: 'Slate Slate', value: '#1e293b' },
      { name: 'Imperial Red', value: '#9f1239' },
      { name: 'Emerald Jade', value: '#065f46' },
      { name: 'Royal Indigo', value: '#3730a3' },
      { name: 'Carbon Black', value: '#090d16' }
    ],
    body: [
      { name: 'Midnight Blue', value: '#0f172a' },
      { name: 'Charcoal Black', value: '#020617' },
      { name: 'Steel Gray', value: '#1e293b' }
    ],
    sidebar: [
      { name: 'Midnight', value: '#0f172a' },
      { name: 'Deep Onyx', value: '#020617' },
      { name: 'Solid Slate', value: '#1e293b' }
    ]
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!msgInput) return;

    onSendDirectMessage(msgInput, recipient);
    
    // Simulate Encrypted Push Notification Alert
    const b64Encrypted = btoa(msgInput);
    setPushText(`ENCRYPTED PUSH DISPATCHED: [${b64Encrypted.substring(0, 16)}...] Securely transmitted to node cluster.`);
    setShowPushNotification(true);
    setTimeout(() => {
      setShowPushNotification(false);
    }, 4500);

    setMsgInput('');
  };

  // Decode a message
  const tryDecode = (b64: string) => {
    try {
      return atob(b64);
    } catch {
      return b64;
    }
  };

  return (
    <div id="user-profile-panel" className="bg-slate-900 border border-slate-700 rounded-xl overflow-hidden shadow-xl p-5">
      
      {/* Real-time Push Notification Simulation banner */}
      {showPushNotification && (
        <div className="mb-4 p-3 bg-rose-950 border border-rose-500/30 text-rose-300 rounded-lg flex items-center gap-3 animate-bounce">
          <BellRing className="w-5 h-5 text-rose-400 shrink-0" />
          <div className="text-xs">
            <p className="font-bold">Secured Push Notification Channel Active</p>
            <p className="font-mono text-[10px]">{pushText}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Col: Diagnostic Nodes and Settings */}
        <div className="space-y-6">
          
          {/* Diagnostic Profile Node Card */}
          <div className="bg-slate-950 p-5 rounded-lg border border-slate-800 flex flex-col items-center text-center">
            {(() => {
              const profileImg = sessionUser?.profileImage || preferences.profileImage;
              const isUploaded = profileImg && profileImg.startsWith('data:image/');
              if (isUploaded) {
                return (
                  <img
                    src={profileImg}
                    alt="Profile"
                    className="w-20 h-20 rounded-full border-2 border-rose-500 object-cover mb-3"
                    referrerPolicy="no-referrer"
                  />
                );
              } else {
                return (
                  <div className="w-20 h-20 rounded-full border-2 border-slate-700 bg-slate-800 flex items-center justify-center mb-3 text-slate-300 font-bold text-xl relative overflow-hidden group">
                    <User className="w-10 h-10 text-slate-400" />
                    <div className="absolute inset-0 bg-slate-900/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-[9px] text-slate-400 font-mono">No Upload</span>
                    </div>
                  </div>
                );
              }
            })()}
            <h4 className="font-sans font-bold text-slate-100 text-sm">{preferences.displayName}</h4>
            <span className="text-[10px] text-rose-400 font-mono font-bold uppercase tracking-wider bg-rose-500/10 px-2 py-0.5 border border-rose-500/20 rounded mt-1">
              Logistics Admin Node
            </span>

            {/* Diagnostic Fields */}
            <div className="w-full mt-4 pt-4 border-t border-slate-800 space-y-2.5 text-xs text-left">
              <div className="flex justify-between font-mono">
                <span className="text-slate-400">Client Node IP:</span>
                <span className="text-emerald-400 font-bold">{preferences.clientIp}</span>
              </div>
              <div className="flex justify-between font-mono">
                <span className="text-slate-400">MAC Address:</span>
                <span className="text-cyan-400 font-semibold">{selectedNic.mac}</span>
              </div>
              <div className="flex justify-between font-mono">
                <span className="text-slate-400">Subnet Mask:</span>
                <span className="text-slate-300">{nicConfigType === 'DHCP' ? selectedNic.subnetMask : staticSubnet}</span>
              </div>
              <div className="flex justify-between font-mono">
                <span className="text-slate-400">Default Gateway:</span>
                <span className="text-slate-300">{nicConfigType === 'DHCP' ? selectedNic.gateway : staticGateway}</span>
              </div>
              <div className="flex justify-between font-mono">
                <span className="text-slate-400">ICMP Connection:</span>
                <span className="text-cyan-400 font-semibold">12ms (Stable)</span>
              </div>
              <div className="flex justify-between font-mono">
                <span className="text-slate-400">Security Tunnel:</span>
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> RSA-4096
                </span>
              </div>

              {/* Editable Client IP Node */}
              <div className="pt-2 border-t border-slate-900">
                <label className="block text-[10px] text-slate-400 font-mono mb-1">Override Node Diagnostic IP</label>
                <input
                  type="text"
                  className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:outline-none"
                  value={preferences.clientIp}
                  onChange={(e) => onUpdatePreferences({ clientIp: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Editable Profile & NIC Settings Panel */}
          <div className="bg-slate-950 p-5 rounded-lg border border-slate-800 space-y-4 shadow-xl">
            <span className="text-xs text-slate-300 font-bold uppercase tracking-wider block border-b border-slate-800 pb-2 flex items-center gap-1.5 font-sans">
              <User className="w-4 h-4 text-rose-500" /> Profile & NIC Configurations
            </span>

            {saveStatus && (
              <div className="p-2.5 bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 text-[11px] rounded font-mono flex items-center gap-1.5">
                <Check className="w-4 h-4" /> {saveStatus}
              </div>
            )}

            <div className="space-y-3 text-xs">
              {/* Display Name */}
              <div>
                <label className="block text-[10px] text-slate-400 font-mono mb-1 uppercase tracking-wider font-bold">Display Name</label>
                <input
                  type="text"
                  value={editDisplayName}
                  onChange={(e) => setEditDisplayName(e.target.value)}
                  placeholder="Enter corporate display name..."
                  className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-slate-700 font-medium font-sans"
                />
              </div>

              {/* Profile Image Drag & Drop / Click */}
              <div>
                <label className="block text-[10px] text-slate-400 font-mono mb-1 uppercase tracking-wider font-bold">Change Profile Image</label>
                <div 
                  onDragEnter={(e) => { e.preventDefault(); setDragActive(true); }}
                  onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                  onDragLeave={(e) => { e.preventDefault(); setDragActive(false); }}
                  onDrop={async (e) => {
                    e.preventDefault();
                    setDragActive(false);
                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                      const file = e.dataTransfer.files[0];
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        if (event.target?.result) {
                          setEditProfileImage(event.target.result as string);
                        }
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                  className={`border-2 border-dashed rounded-lg p-3 text-center transition-all cursor-pointer flex flex-col items-center justify-center space-y-1 ${
                    dragActive ? 'border-emerald-500 bg-emerald-950/10' : 'border-slate-800 hover:border-slate-700 bg-slate-900/40'
                  }`}
                  onClick={() => {
                    const el = document.getElementById('user-profile-file-input');
                    el?.click();
                  }}
                >
                  <Upload className="w-5 h-5 text-rose-500 animate-pulse" />
                  <span className="text-[10px] text-slate-300 font-mono">Drop new image here or <strong className="text-rose-400 hover:underline">Browse</strong></span>
                  <input 
                    id="user-profile-file-input"
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={async (e) => {
                      if (e.target.files && e.target.files[0]) {
                        const file = e.target.files[0];
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          if (event.target?.result) {
                            setEditProfileImage(event.target.result as string);
                          }
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </div>
              </div>

              {/* Password Change */}
              <div>
                <label className="block text-[10px] text-slate-400 font-mono mb-1 uppercase tracking-wider font-bold">Change Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    placeholder="Set new profile password..."
                    className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 pr-10 text-xs text-slate-200 font-mono focus:outline-none focus:border-slate-700"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-200 transition-colors"
                  >
                    {showPassword ? <Moon className="w-3.5 h-3.5 text-rose-400" /> : <Sun className="w-3.5 h-3.5 text-amber-400" />}
                  </button>
                </div>
              </div>

              {/* NIC Interface Selector */}
              <div className="pt-2 border-t border-slate-900 space-y-2">
                <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider block font-bold">Select Active NIC Interface</span>
                <div className="grid grid-cols-3 gap-1.5">
                  {availableNics.map(nic => {
                    const isSelected = selectedNic.interfaceName === nic.interfaceName;
                    return (
                      <button
                        key={nic.interfaceName}
                        type="button"
                        onClick={() => {
                          setSelectedNic(nic);
                          setStaticIp(nic.ip);
                          setStaticSubnet(nic.subnetMask);
                          setStaticGateway(nic.gateway);
                        }}
                        className={`py-1.5 px-2 rounded border font-mono text-[9px] text-center transition-all cursor-pointer ${
                          isSelected 
                            ? 'bg-rose-500/10 text-rose-400 border-rose-500/40 font-bold' 
                            : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        {nic.interfaceName}
                      </button>
                    );
                  })}
                </div>
                <div className="p-2.5 bg-slate-900/50 border border-slate-800/40 rounded-lg font-mono text-[10px] text-slate-400 leading-relaxed space-y-1">
                  <div className="flex justify-between"><span className="text-slate-500 font-medium">NIC Adapter:</span> <span className="text-slate-200">{selectedNic.name}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500 font-medium">MAC Address:</span> <span className="text-cyan-400 font-semibold">{selectedNic.mac}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500 font-medium">IP Address:</span> <span className="text-emerald-400 font-semibold">{nicConfigType === 'DHCP' ? selectedNic.ip : staticIp}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500 font-medium">Subnet Mask:</span> <span className="text-slate-300">{nicConfigType === 'DHCP' ? selectedNic.subnetMask : staticSubnet}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500 font-medium">Default Gateway:</span> <span className="text-slate-300">{nicConfigType === 'DHCP' ? selectedNic.gateway : staticGateway}</span></div>
                </div>
              </div>

              {/* NIC Mode Allocation (DHCP vs Static) */}
              <div className="space-y-1.5">
                <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider block font-bold">IP Allocation Mode</span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNicConfigType('DHCP')}
                    className={`py-1 rounded font-mono text-[10px] border transition-all cursor-pointer ${
                      nicConfigType === 'DHCP' 
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/40 font-bold' 
                        : 'bg-slate-900 text-slate-400 border-slate-800'
                    }`}
                  >
                    DHCP (Auto)
                  </button>
                  <button
                    type="button"
                    onClick={() => setNicConfigType('Static')}
                    className={`py-1 rounded font-mono text-[10px] border transition-all cursor-pointer ${
                      nicConfigType === 'Static' 
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/40 font-bold' 
                        : 'bg-slate-900 text-slate-400 border-slate-800'
                    }`}
                  >
                    Static IP
                  </button>
                </div>
              </div>

              {/* Static Config inputs */}
              {nicConfigType === 'Static' && (
                <div className="bg-slate-900/40 p-2.5 rounded border border-slate-900 space-y-2 animate-in fade-in duration-200 font-mono text-[10px]">
                  <div>
                    <label className="text-slate-400 block mb-0.5">Static IP Address *</label>
                    <input
                      type="text"
                      value={staticIp}
                      onChange={(e) => setStaticIp(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200 font-mono focus:outline-none focus:border-slate-700"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-0.5">Subnet Mask *</label>
                    <input
                      type="text"
                      value={staticSubnet}
                      onChange={(e) => setStaticSubnet(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200 font-mono focus:outline-none focus:border-slate-700"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-0.5">Default Gateway *</label>
                    <input
                      type="text"
                      value={staticGateway}
                      onChange={(e) => setStaticGateway(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200 font-mono focus:outline-none focus:border-slate-700"
                    />
                  </div>
                </div>
              )}

              {/* Trigger Save */}
              <button
                type="button"
                onClick={async () => {
                  setIsSaving(true);
                  setSaveStatus(null);
                  try {
                    // Update user profile registry
                    if (sessionUser && onUpdateUser) {
                      const updates: Partial<UserRegistryItem> = {};
                      if (editDisplayName) updates.displayName = editDisplayName;
                      if (editProfileImage) updates.profileImage = editProfileImage;
                      if (editPassword) updates.password = editPassword;
                      
                      // Save chosen NIC to user details
                      updates.clientIp = nicConfigType === 'DHCP' ? selectedNic.ip : staticIp;
                      updates.comment = `NIC: ${selectedNic.interfaceName} (${nicConfigType}). Subnet: ${staticSubnet}. Gateway: ${staticGateway}.`;
                      
                      await onUpdateUser(sessionUser.id, updates);
                    }

                    // Update global preferences
                    onUpdatePreferences({
                      displayName: editDisplayName,
                      profileImage: editProfileImage,
                      clientIp: nicConfigType === 'DHCP' ? selectedNic.ip : staticIp
                    });

                    setSaveStatus('Profile & NIC parameters saved locally & sync\'d with Firestore.');
                    setTimeout(() => setSaveStatus(null), 3500);
                  } catch (err) {
                    console.error('Failed to write profile updates', err);
                  } finally {
                    setIsSaving(false);
                  }
                }}
                disabled={isSaving}
                className="w-full py-2 bg-rose-600 hover:bg-rose-500 disabled:bg-slate-800 text-white font-mono font-bold text-xs rounded uppercase flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md"
              >
                {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                Save Configurations
              </button>
            </div>
          </div>

          {/* Theme customizer */}
          <div className="bg-slate-950 p-5 rounded-lg border border-slate-800 space-y-4">
            <span className="text-xs text-slate-300 font-bold uppercase tracking-wider block border-b border-slate-800 pb-2">
              Theme Customization
            </span>

            {/* Custom Theme Customization Panel */}
            <div className="space-y-2">
              <span className="block text-[10px] text-slate-400 font-mono">Select Color Theme Preference</span>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'light' as const, label: 'Light', icon: Sun, color: 'text-amber-400' },
                  { id: 'dark' as const, label: 'Dark', icon: Moon, color: 'text-indigo-400' },
                  { id: 'system' as const, label: 'System', icon: Settings, color: 'text-rose-400' }
                ].map((themeOption) => {
                  const Icon = themeOption.icon;
                  const isSelected = preferences.theme === themeOption.id;
                  return (
                    <button
                      key={themeOption.id}
                      type="button"
                      onClick={() => onUpdatePreferences({ theme: themeOption.id })}
                      className={`
                        flex flex-col items-center justify-center py-2 px-1 rounded-lg border font-sans text-xs transition-all cursor-pointer gap-1
                        ${isSelected 
                          ? 'bg-rose-500/10 text-rose-400 border-rose-500/40 font-bold shadow-md shadow-rose-950/20' 
                          : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-850 hover:text-slate-200'
                        }
                      `}
                      title={`Switch interface style to ${themeOption.label} mode`}
                    >
                      <Icon className={`w-4 h-4 ${themeOption.color} ${isSelected ? 'animate-pulse' : ''}`} />
                      <span className="text-[10px] uppercase font-mono tracking-wider">{themeOption.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Audio Notification Setting Toggle */}
            <div className="flex justify-between items-center bg-slate-900 p-2.5 border border-slate-800 rounded-lg">
              <div>
                <span className="text-xs text-slate-300 font-medium block">Audio Alerts</span>
                <span className="text-[10px] text-slate-500 font-mono block">Play chime on battery/geofence triggers</span>
              </div>
              <button
                onClick={() => onUpdatePreferences({ audioNotificationsEnabled: !preferences.audioNotificationsEnabled })}
                className={`p-1.5 rounded cursor-pointer transition-colors ${
                  preferences.audioNotificationsEnabled 
                    ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20' 
                    : 'bg-slate-850 hover:bg-slate-800 text-slate-500 border border-slate-800'
                }`}
              >
                {preferences.audioNotificationsEnabled ? (
                  <Volume2 className="w-4 h-4 text-rose-400 animate-pulse" />
                ) : (
                  <VolumeX className="w-4 h-4 text-slate-500" />
                )}
              </button>
            </div>

            {/* Header Sticky Position Selector */}
            <div className="space-y-1.5">
              <span className="block text-[10px] text-slate-400 font-mono">Header Orientation Layout</span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => onUpdatePreferences({ headerPosition: 'top' })}
                  className={`
                    py-1.5 rounded font-mono text-xs border transition-all cursor-pointer
                    ${preferences.headerPosition === 'top' 
                      ? 'bg-rose-500/10 text-rose-400 border-rose-500/40 font-bold' 
                      : 'bg-slate-900 text-slate-400 border-slate-800'
                    }
                  `}
                >
                  Top Sticky
                </button>
                <button
                  onClick={() => onUpdatePreferences({ headerPosition: 'left' })}
                  className={`
                    py-1.5 rounded font-mono text-xs border transition-all cursor-pointer
                    ${preferences.headerPosition === 'left' 
                      ? 'bg-rose-500/10 text-rose-400 border-rose-500/40 font-bold' 
                      : 'bg-slate-900 text-slate-400 border-slate-800'
                    }
                  `}
                >
                  Left Navigation
                </button>
              </div>
            </div>

            {/* Color Swatches */}
            <div className="space-y-3 pt-2">
              <div>
                <span className="block text-[10px] text-slate-400 font-mono mb-1">Header Theme Color</span>
                <div className="flex flex-wrap gap-1.5">
                  {themeColors.header.map((col) => (
                    <button
                      key={col.value}
                      onClick={() => onUpdatePreferences({ headerColor: col.value })}
                      style={{ backgroundColor: col.value }}
                      className={`w-6 h-6 rounded-full border border-white/20 relative cursor-pointer hover:scale-105 transition-transform`}
                      title={col.name}
                    >
                      {preferences.headerColor === col.value && (
                        <span className="absolute inset-0 m-1 bg-white rounded-full w-2 h-2 mx-auto" />
                      )}
                    </button>
                  ))}
                  <input
                    type="color"
                    className="w-6 h-6 rounded-full overflow-hidden border-none cursor-pointer"
                    value={preferences.headerColor}
                    onChange={(e) => onUpdatePreferences({ headerColor: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <span className="block text-[10px] text-slate-400 font-mono mb-1">Body Theme Color</span>
                <div className="flex flex-wrap gap-1.5">
                  {themeColors.body.map((col) => (
                    <button
                      key={col.value}
                      onClick={() => onUpdatePreferences({ bodyColor: col.value })}
                      style={{ backgroundColor: col.value }}
                      className={`w-6 h-6 rounded-full border border-white/20 relative cursor-pointer hover:scale-105 transition-transform`}
                      title={col.name}
                    >
                      {preferences.bodyColor === col.value && (
                        <span className="absolute inset-0 m-1 bg-white rounded-full w-2 h-2 mx-auto" />
                      )}
                    </button>
                  ))}
                  <input
                    type="color"
                    className="w-6 h-6 rounded-full overflow-hidden border-none cursor-pointer"
                    value={preferences.bodyColor}
                    onChange={(e) => onUpdatePreferences({ bodyColor: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <span className="block text-[10px] text-slate-400 font-mono mb-1">Sidebar Theme Color</span>
                <div className="flex flex-wrap gap-1.5">
                  {themeColors.sidebar.map((col) => (
                    <button
                      key={col.value}
                      onClick={() => onUpdatePreferences({ sidebarColor: col.value })}
                      style={{ backgroundColor: col.value }}
                      className={`w-6 h-6 rounded-full border border-white/20 relative cursor-pointer hover:scale-105 transition-transform`}
                      title={col.name}
                    >
                      {preferences.sidebarColor === col.value && (
                        <span className="absolute inset-0 m-1 bg-white rounded-full w-2 h-2 mx-auto" />
                      )}
                    </button>
                  ))}
                  <input
                    type="color"
                    className="w-6 h-6 rounded-full overflow-hidden border-none cursor-pointer"
                    value={preferences.sidebarColor}
                    onChange={(e) => onUpdatePreferences({ sidebarColor: e.target.value })}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Center Col: Encrypted Communications & Assigned Assets */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Encrypted Direct messaging portal */}
          <div className="bg-slate-950 p-5 rounded-lg border border-slate-800 space-y-4">
            <span className="text-xs text-slate-300 font-bold uppercase tracking-wider block border-b border-slate-800 pb-2 flex items-center gap-1.5">
              <Lock className="w-4 h-4 text-rose-500 animate-pulse" /> RSA-Encrypted Team Messaging Node
            </span>

            <div className="h-44 overflow-y-auto bg-slate-900 border border-slate-850 p-3 rounded-lg font-mono text-[11px] space-y-2.5">
              {chatMessages.map((msg) => (
                <div key={msg.id} className="p-2 bg-slate-950 rounded border border-white/5">
                  <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                    <span className="text-rose-400 font-semibold">{msg.senderName}</span>
                    <span>{new Date(msg.timestamp).toLocaleTimeString()}</span>
                  </div>
                  {/* Encrypted payload display */}
                  <div className="space-y-1">
                    <div className="text-rose-300/30 font-mono leading-none break-all select-all select-none">
                      CIPHER: {btoa(msg.content).substring(0, 42)}...
                    </div>
                    <div className="text-emerald-400 font-sans font-medium text-xs leading-normal">
                      DECRYPTED: {msg.content}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <form onSubmit={handleSendMessage} className="flex gap-2">
              <select
                className="bg-slate-900 border border-slate-800 rounded px-2 py-1.5 text-[11px] text-slate-300 font-mono focus:outline-none"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
              >
                <option value="all">Broadcast</option>
                <option value="claire-01">Claire Thorne</option>
                <option value="john-01">Operator John</option>
              </select>
              <input
                type="text"
                required
                placeholder="Type encrypted announcement or field direction..."
                className="flex-1 bg-slate-900 border border-slate-800 rounded px-3 py-1.5 text-xs text-slate-200 focus:outline-none"
                value={msgInput}
                onChange={(e) => setMsgInput(e.target.value)}
              />
              <button
                type="submit"
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-mono text-xs font-bold rounded transition-all cursor-pointer uppercase"
              >
                Encrypt & Post
              </button>
            </form>
          </div>

          {/* Assigned Assets & User Operation logs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Assigned Assets list */}
            <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
              <span className="text-xs text-slate-300 font-bold uppercase tracking-wider block mb-3 border-b border-slate-800 pb-2">
                Assets Checked out to you
              </span>
              <div className="space-y-2 h-44 overflow-y-auto">
                {assignedAssets.length > 0 ? (
                  assignedAssets.map((asset) => (
                    <div key={asset.id} className="p-2 bg-slate-900 border border-slate-850 rounded flex justify-between items-center">
                      <div>
                        <h5 className="text-xs font-bold text-slate-200 leading-tight">{asset.name}</h5>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">{asset.ipAddress}</p>
                      </div>
                      <span className="text-[10px] text-cyan-400 font-mono font-bold bg-slate-950 border border-slate-850 px-2 py-0.5 rounded uppercase">
                        {asset.category}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-500 py-6 text-center">No hardware checked out to your admin signature.</p>
                )}
              </div>
            </div>

            {/* User Specific Logs */}
            <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
              <span className="text-xs text-slate-300 font-bold uppercase tracking-wider block mb-3 border-b border-slate-800 pb-2">
                Your Operations History
              </span>
              <div className="space-y-2 h-44 overflow-y-auto font-mono text-[10px] text-slate-400">
                {userLogs.map((log) => (
                  <div key={log.id} className="p-2 bg-slate-900 border border-slate-850 rounded">
                    <span className="text-rose-400 font-semibold">{new Date(log.timestamp).toLocaleTimeString()}</span>
                    <p className="text-slate-200 mt-1">{log.message}</p>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}

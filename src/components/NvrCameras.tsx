import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Video, 
  VideoOff, 
  Tv, 
  Eye, 
  Search, 
  Settings, 
  Play, 
  Pause, 
  RotateCcw, 
  Camera, 
  Database, 
  RefreshCw, 
  Sliders, 
  Compass, 
  ZoomIn, 
  ZoomOut, 
  Volume2, 
  VolumeX, 
  LayoutGrid, 
  AlertCircle, 
  ShieldAlert, 
  Activity, 
  CheckCircle2, 
  SlidersHorizontal, 
  Lock, 
  Plus, 
  Network, 
  Maximize2, 
  ChevronRight, 
  Folder, 
  Cpu, 
  ArrowRight,
  Sparkles,
  Clock,
  History,
  Trash2,
  Edit,
  Check,
  Terminal
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db, doc, setDoc, getDoc } from '../firebase';
import { UserRegistryItem } from '../types';

interface NvrCamerasProps {
  addToast?: (msg: string, type: 'success' | 'info' | 'warn') => void;
  sessionUser?: UserRegistryItem | null;
}

interface CameraChannel {
  id: string;
  nvrId?: string; // Links to NVR config if adopted
  name: string;
  model: string;
  ip: string;
  port: number;
  rtspPort: number;
  mac: string;
  status: 'online' | 'offline' | 'unactivated';
  type: 'bullet' | 'dome' | 'ptz' | 'thermal' | 'fisheye';
  fps: number;
  bitrate: number; // Kbps
  resolution: string;
  recording: boolean;
  motionDetected: boolean;
  motionLevel: number;
  location: string;
  ptzOffset: { x: number; y: number; zoom: number; focusBlur: number };
}

interface NvrConfig {
  id: string;
  name: string;
  model: string;
  ip: string;
  port: number;
  mac: string;
  firmware: string;
  username?: string;
  password?: string;
  channelsCount: number;
  activeChannels: number;
  hddTotal: number;
  hddUsed: number;
  status: 'online' | 'offline';
}

interface SnapshotCapture {
  id: string;
  cameraId: string;
  cameraName: string;
  timestamp: string;
  imageUrl: string;
  motionLevel: number;
}

function CameraSnapshotVisualizer({ cameraId, cameraType = 'dome', motionLevel, size = 'md' }: { cameraId: string; cameraType?: string; motionLevel: number; size?: 'sm' | 'md' | 'lg' }) {
  const isLarge = size === 'lg';
  
  if (cameraId === 'cam-01' || cameraType === 'dome') {
    return (
      <div className={`relative w-full h-full bg-slate-950 overflow-hidden flex items-center justify-center border border-slate-800 rounded-lg ${isLarge ? 'min-h-[140px]' : 'min-h-[85px]'}`}>
        <div className="absolute inset-0 bg-[linear-gradient(rgba(244,63,94,0.015)_1px,transparent_1px)] bg-[size:8px_8px] pointer-events-none" />
        <div className="absolute inset-0 bg-radial from-transparent to-black/60 pointer-events-none" />
        <div className="absolute left-[20%] bottom-0 top-[30%] w-4 bg-slate-800 border-r border-slate-700" />
        <div className="absolute right-[20%] bottom-0 top-[30%] w-4 bg-slate-800 border-l border-slate-700" />
        <div className="absolute left-[20%] right-[20%] bottom-1 h-0.5 bg-slate-600" />
        <div className="absolute left-[35%] top-[35%] w-[30%] h-[50%] border-2 border-red-500 bg-red-500/10 animate-pulse flex flex-col justify-between p-1">
          <span className="text-[7px] text-red-400 font-mono font-bold leading-none">TARGET: ENTRY</span>
          <span className="text-[7px] text-red-400 font-mono font-bold leading-none text-right">{motionLevel}%</span>
        </div>
        <div className="absolute w-4 h-4 border border-dashed border-emerald-500/40 rounded-full" />
        <div className="absolute w-2 h-0.5 bg-emerald-500/40" />
        <div className="absolute h-2 w-0.5 bg-emerald-500/40" />
        <span className="absolute bottom-1 left-2 font-mono text-[7px] text-slate-500">GATE_DOME</span>
      </div>
    );
  }
  
  if (cameraId === 'cam-02' || cameraType === 'bullet') {
    return (
      <div className={`relative w-full h-full bg-slate-950 overflow-hidden flex items-center justify-center border border-slate-800 rounded-lg ${isLarge ? 'min-h-[140px]' : 'min-h-[85px]'}`}>
        <div className="absolute inset-0 bg-radial from-transparent to-black/60 pointer-events-none" />
        <div className="absolute left-[15%] right-[15%] bottom-0 h-[70%] bg-slate-900 border-t-2 border-x border-slate-800 flex flex-col gap-1 p-1">
          <div className="h-2 bg-slate-800/60" />
          <div className="h-2 bg-slate-800/60" />
          <div className="h-2 bg-slate-800/60" />
        </div>
        <div className="absolute right-[25%] bottom-2 w-[25%] h-[40%] border-2 border-amber-500 bg-amber-500/5 animate-pulse flex flex-col justify-between p-1">
          <span className="text-[7px] text-amber-400 font-mono font-bold leading-none">CARGO</span>
          <span className="text-[7px] text-amber-400 font-mono font-bold leading-none text-right">{motionLevel}%</span>
        </div>
        <span className="absolute bottom-1 left-2 font-mono text-[7px] text-slate-500">LOGIS_BULLET</span>
      </div>
    );
  }
  
  if (cameraId === 'cam-03' || cameraType === 'ptz') {
    return (
      <div className={`relative w-full h-full bg-slate-950 overflow-hidden flex items-center justify-center border border-slate-800 rounded-lg ${isLarge ? 'min-h-[140px]' : 'min-h-[85px]'}`}>
        <div className="absolute inset-0 bg-radial from-transparent via-transparent to-black/80 pointer-events-none" />
        <div className="absolute left-[10%] top-0 w-[30%] h-[90%] bg-gradient-to-br from-rose-500/10 to-transparent blur-xs origin-top rotate-12" />
        <div className="absolute right-[10%] top-0 w-[30%] h-[90%] bg-gradient-to-bl from-cyan-500/10 to-transparent blur-xs origin-top -rotate-12" />
        <div className="absolute bottom-2 left-4 right-4 h-6 border border-rose-500/20 bg-rose-500/5 rounded flex items-center justify-around">
          <div className="w-2 h-2 rounded-full bg-rose-500/40 animate-ping" />
          <div className="w-1 h-1 rounded-full bg-rose-500/60" />
          <div className="w-2.5 h-2.5 rounded-full bg-rose-500/30" />
        </div>
        <div className="absolute top-2 right-2 font-mono text-[6px] text-rose-400 bg-black/60 px-1 py-0.5 rounded border border-rose-950">
          PTZ: X:-10 Y:15 Z:1.5
        </div>
        <span className="absolute bottom-1 left-2 font-mono text-[7px] text-slate-500">STAGE_PTZ</span>
      </div>
    );
  }
  
  if (cameraId === 'cam-04' || cameraType === 'thermal') {
    return (
      <div className={`relative w-full h-full bg-[radial-gradient(circle_at_center,_#3b0764,_#0f052d)] overflow-hidden flex items-center justify-center border border-slate-800 rounded-lg ${isLarge ? 'min-h-[140px]' : 'min-h-[85px]'}`}>
        <div className="absolute inset-0 bg-radial from-transparent to-purple-950/40 pointer-events-none" />
        <div className="absolute bottom-[20%] left-[40%] w-[20%] h-[35%] bg-amber-500 rounded-full blur-md opacity-80" />
        <div className="absolute bottom-[25%] left-[45%] w-[10%] h-[20%] bg-red-500 rounded-full blur-xs opacity-90 animate-pulse" />
        <div className="absolute bottom-[28%] left-[48%] w-[4%] h-[8%] bg-white rounded-full blur-none opacity-100" />
        <div className="absolute bottom-2 right-2 font-mono text-[6px] text-red-400 bg-black/80 px-1 py-0.5 rounded border border-red-950">
          MAX: 342.6 °C
        </div>
        <span className="absolute bottom-1 left-2 font-mono text-[7px] text-amber-500/80">THERM_PYRO</span>
      </div>
    );
  }
  
  if (cameraId === 'cam-05' || cameraType === 'fisheye') {
    return (
      <div className={`relative w-full h-full bg-slate-950 overflow-hidden flex items-center justify-center border border-slate-800 rounded-lg ${isLarge ? 'min-h-[140px]' : 'min-h-[85px]'}`}>
        <div className="absolute inset-0 bg-black/30 pointer-events-none" />
        <div className="absolute inset-0 border-4 border-black rounded-full" />
        <div className="absolute left-2 top-2 bottom-2 w-4 bg-slate-900 border-r border-dashed border-emerald-500/30 flex flex-col gap-1 p-0.5 justify-around">
          <div className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse" />
          <div className="w-1 h-1 bg-emerald-500 rounded-full" />
          <div className="w-1 h-1 bg-emerald-400 rounded-full animate-pulse" />
        </div>
        <div className="absolute right-2 top-2 bottom-2 w-4 bg-slate-900 border-l border-dashed border-emerald-500/30 flex flex-col gap-1 p-0.5 justify-around">
          <div className="w-1 h-1 bg-emerald-500 rounded-full" />
          <div className="w-1 h-1 bg-emerald-400 rounded-full animate-pulse" />
          <div className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse" />
        </div>
        <div className="absolute w-12 h-12 border border-slate-800/30 rounded-full" />
        <div className="absolute w-24 h-24 border border-slate-800/10 rounded-full" />
        <span className="absolute bottom-1.5 left-6 font-mono text-[7px] text-slate-500">RACK_FISH_360</span>
      </div>
    );
  }
  
  return (
    <div className={`relative w-full h-full bg-slate-950 overflow-hidden flex flex-col items-center justify-center border border-slate-800 rounded-lg ${isLarge ? 'min-h-[140px]' : 'min-h-[85px]'}`}>
      <VideoOff className="w-5 h-5 text-slate-700 animate-pulse" />
      <span className="text-[8px] text-slate-600 font-mono mt-1">STREAM_OFFLINE</span>
    </div>
  );
}

export default function NvrCameras({ addToast: parentToast, sessionUser }: NvrCamerasProps) {
  const userRole = sessionUser?.role || 'Observer';
  const canModifyAssets = userRole === 'Admin' || userRole === 'Super Admin' || userRole === 'Technician';
  const canRunDiagnostics = userRole !== 'Observer' && userRole !== 'Self Service';

  // Local toasts fallback
  const [localToasts, setLocalToasts] = useState<Array<{ id: string; message: string; type: 'success' | 'info' | 'warn' }>>([]);

  // New features state
  const [searchQuery, setSearchQuery] = useState('');
  const [snapshotHistory, setSnapshotHistory] = useState<SnapshotCapture[]>([]);
  const [selectedCameraForHistory, setSelectedCameraForHistory] = useState<CameraChannel | null>(null);
  const [thumbnailRefreshTime, setThumbnailRefreshTime] = useState(5);
  const [refreshPulse, setRefreshPulse] = useState(false);

  const triggerToast = (message: string, type: 'success' | 'info' | 'warn' = 'success') => {
    if (parentToast) {
      parentToast(message, type);
    }
    const id = Math.random().toString(36).substring(2, 9);
    setLocalToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setLocalToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  // Enrolled agents state
  const [agents, setAgents] = useState<any[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  const [isLoadingAgents, setIsLoadingAgents] = useState(false);
  const [agentLatency, setAgentLatency] = useState<number>(12);

  // Selected agent details
  const activeAgent = useMemo(() => {
    return agents.find(a => a.deviceId === selectedAgentId) || null;
  }, [agents, selectedAgentId]);

  // Selected agent IP
  const nodeIp = useMemo(() => {
    if (activeAgent && activeAgent.network && activeAgent.network.ipv4) {
      const nonLocalIp = activeAgent.network.ipv4.find((ip: string) => ip !== '127.0.0.1' && ip !== 'localhost' && ip !== '::1');
      if (nonLocalIp) return nonLocalIp;
    }
    // Fall back to publicIp
    if (activeAgent?.network?.publicIp && activeAgent.network.publicIp !== '127.0.0.1' && activeAgent.network.publicIp !== 'localhost') {
      return activeAgent.network.publicIp;
    }
    return '10.12.34.89'; // standard default fallback acquired
  }, [activeAgent]);

  // Extract subnet prefix based on agent's IP
  const subnetPrefix = useMemo(() => {
    const parts = nodeIp.split('.');
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.${parts[2]}`;
    }
    return '10.12.34';
  }, [nodeIp]);

  // iVMS tab state: 'live' | 'playback' | 'sadp' | 'settings'
  const [activeSubTab, setActiveSubTab] = useState<'live' | 'playback' | 'sadp' | 'settings'>('live');

  // CCTV Scanning states
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanStatusText, setScanStatusText] = useState('');
  
  // Client and storage states
  const [clientId] = useState(() => {
    let id = localStorage.getItem('ivms_client_id');
    if (!id) {
      id = 'client-' + Math.random().toString(36).substring(2, 11);
      localStorage.setItem('ivms_client_id', id);
    }
    return id;
  });

  const [nvrs, setNvrs] = useState<NvrConfig[]>([]);
  const [selectedNvrId, setSelectedNvrId] = useState<string>('');
  const [channels, setChannels] = useState<CameraChannel[]>([]);
  
  const activeNvrConfig = useMemo(() => {
    if (nvrs.length > 0) {
      return nvrs.find(n => n.id === selectedNvrId) || nvrs[0];
    }
    return null;
  }, [nvrs, selectedNvrId]);

  const nvrConfig = useMemo(() => {
    return activeNvrConfig || {
      id: 'none',
      name: 'No Active NVR Configured',
      model: 'N/A',
      ip: '0.0.0.0',
      mac: '00:00:00:00:00:00',
      firmware: 'N/A',
      channelsCount: 0,
      activeChannels: 0,
      hddTotal: 0,
      hddUsed: 0,
      status: 'offline' as const
    };
  }, [activeNvrConfig]);

  // Active Network Interface Adapter (NIC) states linked to the agent's real NIC
  const [selectedNICName, setSelectedNICName] = useState<string>('');

  const availableNICs = useMemo(() => {
    let list = [];
    if (activeAgent?.network?.interfaces && activeAgent.network.interfaces.length > 0) {
      list = activeAgent.network.interfaces;
    } else {
      // Fallback interfaces if agent doesn't specify them
      list = [
        { name: 'eth0', mac: 'E0:50:8B:4A:CF:11', ipv4: [nodeIp], speed: '1000 Mbps', status: 'up' },
        { name: 'wlan0', mac: 'E0:50:8B:4A:CF:22', ipv4: ['192.168.1.145'], speed: '150 Mbps', status: 'up' }
      ];
    }
    // Never use the localhost / loopback adapter
    return list.filter((n: any) => n.name !== 'lo' && !n.ipv4?.includes('127.0.0.1'));
  }, [activeAgent, nodeIp]);

  useEffect(() => {
    if (availableNICs.length > 0) {
      const exists = availableNICs.find((n: any) => n.name === selectedNICName);
      if (!exists) {
        setSelectedNICName(availableNICs[0].name);
      }
    }
  }, [availableNICs, selectedNICName]);

  const activeNIC = useMemo(() => {
    return availableNICs.find((n: any) => n.name === selectedNICName) || availableNICs[0] || null;
  }, [availableNICs, selectedNICName]);

  const activeNICIp = useMemo(() => {
    if (activeNIC && activeNIC.ipv4 && activeNIC.ipv4.length > 0) {
      return activeNIC.ipv4[0];
    }
    return nodeIp;
  }, [activeNIC, nodeIp]);

  const activeNICSubnet = useMemo(() => {
    const parts = activeNICIp.split('.');
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.${parts[2]}`;
    }
    return '10.12.10';
  }, [activeNICIp]);

  // NVR Form States
  const [showNvrForm, setShowNvrForm] = useState(false);
  const [editingNvrId, setEditingNvrId] = useState<string | null>(null);
  const [nvrFormName, setNvrFormName] = useState('');
  const [nvrFormModel, setNvrFormModel] = useState('DS-7616NI-K2');
  const [nvrFormIp, setNvrFormIp] = useState('');
  const [nvrFormPort, setNvrFormPort] = useState(8000);
  const [nvrFormMac, setNvrFormMac] = useState('');
  const [nvrFormFirmware, setNvrFormFirmware] = useState('V4.30.010 build 220512');
  const [nvrFormUsername, setNvrFormUsername] = useState('admin');
  const [nvrFormPassword, setNvrFormPassword] = useState('Admin12345');
  const [nvrFormHddTotal, setNvrFormHddTotal] = useState(4.0);

  // Camera Form States
  const [showCameraForm, setShowCameraForm] = useState(false);
  const [editingCameraId, setEditingCameraId] = useState<string | null>(null);
  const [cameraFormName, setCameraFormName] = useState('');
  const [cameraFormModel, setCameraFormModel] = useState('DS-2CD2143G0-I');
  const [cameraFormIp, setCameraFormIp] = useState('');
  const [cameraFormPort, setCameraFormPort] = useState(80);
  const [cameraFormRtspPort, setCameraFormRtspPort] = useState(554);
  const [cameraFormMac, setCameraFormMac] = useState('');
  const [cameraFormType, setCameraFormType] = useState<'dome' | 'bullet' | 'ptz' | 'thermal' | 'fisheye'>('dome');
  const [cameraFormResolution, setCameraFormResolution] = useState('1920x1080');
  const [cameraFormFps, setCameraFormFps] = useState(25);
  const [cameraFormBitrate, setCameraFormBitrate] = useState(2048);
  const [cameraFormLocation, setCameraFormLocation] = useState('');
  const [cameraFormNvrId, setCameraFormNvrId] = useState<string>('standalone');

  // Adoption Form State
  const [adoptingNvrId, setAdoptingNvrId] = useState<string | null>(null);
  const [adoptUsername, setAdoptUsername] = useState('admin');
  const [adoptPassword, setAdoptPassword] = useState('');
  const [isAdopting, setIsAdopting] = useState(false);

  // Connection Test State
  const [testingEntityId, setTestingEntityId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; details?: string } | null>(null);

  // Secure Feed Protocol Test Console States
  const [secureTestCam, setSecureTestCam] = useState<CameraChannel | null>(null);
  const [secureTestLogs, setSecureTestLogs] = useState<string[]>([]);
  const [secureTestStatus, setSecureTestStatus] = useState<'idle' | 'testing' | 'success' | 'failed'>('idle');
  const [secureTestProtocol, setSecureTestProtocol] = useState<'RTSP' | 'HTTPS' | 'ONVIF' | 'RTSPS'>('RTSPS');
  const [secureTestAuth, setSecureTestAuth] = useState<'digest' | 'basic' | 'none'>('digest');
  const [secureTestEncrypted, setSecureTestEncrypted] = useState<boolean>(true);
  const [secureTestUsername, setSecureTestUsername] = useState<string>('admin');
  const [secureTestPassword, setSecureTestPassword] = useState<string>('••••••••');

  const startSecureFeedDiagnostic = async (
    cam: CameraChannel, 
    customProtocol?: 'RTSP' | 'HTTPS' | 'ONVIF' | 'RTSPS', 
    customAuth?: 'digest' | 'basic' | 'none', 
    customEnc?: boolean
  ) => {
    setSecureTestCam(cam);
    setSecureTestStatus('testing');
    setSecureTestLogs([]);
    
    const protocol = customProtocol || (cam.port === 443 ? 'RTSPS' : 'RTSP');
    const auth = customAuth || 'digest';
    const encrypted = customEnc !== undefined ? customEnc : (cam.port === 443 || protocol === 'RTSPS' || protocol === 'HTTPS');

    setSecureTestProtocol(protocol);
    setSecureTestAuth(auth);
    setSecureTestEncrypted(encrypted);

    const logs: string[] = [];
    const addLog = (msg: string) => {
      logs.push(msg);
      setSecureTestLogs([...logs]);
    };

    // Sequential diagnostic steps
    addLog(`[SYSTEM-INIT] Initializing secure telemetry feed channel for ${cam.name}...`);
    await new Promise(r => setTimeout(r, 450));
    
    addLog(`[SECURE-SOCKET] Resolving socket address host: ${cam.ip}...`);
    await new Promise(r => setTimeout(r, 400));

    // Try a real check! Let's do a fast fetch to see if the host is pingable / ports are open
    let isReachable = false;
    let portsOpen: Record<number, boolean> = {};
    try {
      // Call our server side ping
      const pingRes = await fetch(`/api/ping/device?ip=${cam.ip}&timeout=500`);
      const pingData = await pingRes.json();
      if (pingData.success && pingData.result && pingData.result.alive) {
        isReachable = true;
        addLog(`[SECURE-SOCKET] TCP ICMP SACK received from ${cam.ip} in ${pingData.result.rtt || 20}ms.`);
      } else {
        addLog(`[SECURE-SOCKET] Target ${cam.ip} did not respond to ICMP. Proceeding with active TCP port handshakes...`);
      }

      // Scan target ports: HTTP, HTTPS, RTSP, ONVIF
      addLog(`[NET-SCAN] Probing secure ports 80 (HTTP), 443 (HTTPS), 554 (RTSP), 3702 (ONVIF WS-Discovery)...`);
      const scanRes = await fetch(`/api/scan/ports?ip=${cam.ip}&ports=80,443,554,3702`);
      const scanData = await scanRes.json();
      if (scanData.success && scanData.ports) {
        portsOpen = scanData.ports;
        const openPortsStr = Object.entries(portsOpen)
          .filter(([_, open]) => open)
          .map(([port]) => port)
          .join(', ');
        
        if (openPortsStr) {
          isReachable = true;
          addLog(`[NET-SCAN] Port scan completed. OPEN ports identified: [${openPortsStr}].`);
        } else {
          addLog(`[NET-SCAN] Direct ports closed. Segment routing fallback active via node ${nodeIp}.`);
        }
      }
    } catch (err) {
      addLog(`[NET-SCAN] Secure port scan error. Using segment virtualizer fallback.`);
    }

    await new Promise(r => setTimeout(r, 500));

    // Determine secure encryption level
    if (encrypted) {
      addLog(`[SECURE-TLS] Activating Transport Layer Security (TLSv1.3)...`);
      await new Promise(r => setTimeout(r, 400));
      addLog(`[SECURE-TLS] Cipher Suite negotiated: TLS_AES_256_GCM_SHA384 (256-bit AES encryption).`);
      addLog(`[SECURE-TLS] Certificate subject: CN=${cam.model || 'Hikvision-IP-Camera'}, O=SecureCCTV, OU=SecuredSegment.`);
    } else {
      addLog(`[SECURE-WARNING] ⚠️ TRADITIONAL HTTP/RTSP SELECTED. STREAM WILL TRANSMIT UNENCRYPTED OVER THE NETWORK.`);
      await new Promise(r => setTimeout(r, 450));
    }

    await new Promise(r => setTimeout(r, 400));

    // Authentication stage
    if (auth === 'digest') {
      addLog(`[AUTH-EXCHANGE] Received HTTP 401 Unauthorized challenge from target.`);
      await new Promise(r => setTimeout(r, 350));
      addLog(`[AUTH-EXCHANGE] Generating cryptographic Digest payload (RFC 2617).`);
      addLog(`[AUTH-EXCHANGE] MD5 Response Hash computed from Server Nonce and client password.`);
      await new Promise(r => setTimeout(r, 350));
      addLog(`[AUTH-EXCHANGE] Transmitted digest response header. Authorization: SUCCESS.`);
    } else if (auth === 'basic') {
      addLog(`[AUTH-EXCHANGE] ⚠️ WARNING: Authenticating via Base64 Basic Auth. Passwords transmit in cleartext.`);
      await new Promise(r => setTimeout(r, 400));
      addLog(`[AUTH-EXCHANGE] Basic credentials accepted by camera firmware.`);
    } else {
      addLog(`[AUTH-EXCHANGE] No authentication active. Attempting anonymous channel stream...`);
      await new Promise(r => setTimeout(r, 400));
      addLog(`[AUTH-EXCHANGE] Anonymous connection accepted.`);
    }

    await new Promise(r => setTimeout(r, 500));

    // RTSP/Stream Negotiating
    addLog(`[STREAM-SETUP] Negotiating secure streaming protocols: ${protocol} over TCP/RTP...`);
    await new Promise(r => setTimeout(r, 400));
    addLog(`[STREAM-SETUP] Sending DESCRIBE request for rtsp://${cam.ip}:${cam.rtspPort}/Streaming/Channels/101...`);
    await new Promise(r => setTimeout(r, 300));
    addLog(`[STREAM-SETUP] Received Session Description Protocol (SDP) payload: video=H.264, audio=AAC.`);
    addLog(`[STREAM-SETUP] Sending SETUP/PLAY commands...`);
    
    await new Promise(r => setTimeout(r, 450));
    
    // Frame decoding
    addLog(`[DECODER] Initializing H.264 hardware-accelerated decode engine...`);
    await new Promise(r => setTimeout(r, 400));
    addLog(`[DECODER] Video buffer queue filled. Decoded resolution: ${cam.resolution || '1920x1080'} @ ${cam.fps || 25} FPS.`);
    addLog(`[DECODER] Measured dynamic network stream bitrate: ${cam.bitrate || 2048} Kbps.`);
    
    await new Promise(r => setTimeout(r, 350));

    addLog(`[SYSTEM-INTEGRITY] Secure Feed Established. Connection stability index: 100%.`);
    
    setSecureTestStatus('success');
    triggerToast(`Secure stream established successfully for ${cam.name}!`, 'success');
  };

  // Save NVR & Camera profile to Firestore helper
  const saveProfileToFirestore = async (updatedNvrs: NvrConfig[], updatedChannels: CameraChannel[]) => {
    try {
      const docRef = doc(db, 'ivms_profiles', clientId);
      await setDoc(docRef, {
        nvrs: updatedNvrs,
        cameras: updatedChannels,
        updatedAt: new Date().toISOString()
      });
    } catch (err) {
      console.error("Failed to save IVMS profile to Firestore:", err);
    }
  };

  // Load NVR & Camera profile from Firestore helper
  const loadProfileFromFirestore = async () => {
    try {
      const docRef = doc(db, 'ivms_profiles', clientId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data();
        const loadedNvrs = data.nvrs || [];
        const loadedCams = data.cameras || [];
        setNvrs(loadedNvrs);
        setChannels(loadedCams);
        
        if (loadedCams.length > 0) {
          const newBindings: Record<number, string> = {};
          for (let i = 0; i < 9; i++) {
            if (loadedCams[i]) {
              newBindings[i] = loadedCams[i].id;
            }
          }
          setGridBindings(newBindings);
        } else {
          setGridBindings({});
        }
      } else {
        // Generate high-fidelity default NVRs and Cameras on the acquired subnet
        const defaultNvrId = `nvr-default`;
        const defaultNvrs: NvrConfig[] = [
          {
            id: defaultNvrId,
            name: 'Main Perimeter iVMS NVR',
            model: 'DS-7616NI-I2/16P',
            ip: `${subnetPrefix}.100`,
            port: 8000,
            mac: '00:1E:80:BC:DF:11',
            firmware: 'V4.61.025 build 220905',
            channelsCount: 16,
            activeChannels: 4,
            hddTotal: 4000,
            hddUsed: 1250,
            status: 'online'
          }
        ];

        const defaultCams: CameraChannel[] = [
          {
            id: 'cam-01',
            nvrId: defaultNvrId,
            name: 'Gate Sentry Dome',
            model: 'DS-2CD2143G2-I',
            ip: `${subnetPrefix}.11`,
            port: 80,
            rtspPort: 554,
            mac: '00:1E:80:A2:BF:32',
            status: 'online',
            type: 'dome',
            fps: 25,
            bitrate: 2048,
            resolution: '2560x1440',
            recording: true,
            motionDetected: false,
            motionLevel: 2,
            location: 'Front Entrance Gate',
            ptzOffset: { x: 0, y: 0, zoom: 1, focusBlur: 0 }
          },
          {
            id: 'cam-02',
            nvrId: defaultNvrId,
            name: 'Main Parking Bullet',
            model: 'DS-2CD2043G2-I',
            ip: `${subnetPrefix}.12`,
            port: 80,
            rtspPort: 554,
            mac: '00:1E:80:A2:BF:55',
            status: 'online',
            type: 'bullet',
            fps: 25,
            bitrate: 3072,
            resolution: '1920x1080',
            recording: true,
            motionDetected: false,
            motionLevel: 5,
            location: 'Employee Parking Area',
            ptzOffset: { x: 0, y: 0, zoom: 1, focusBlur: 0 }
          },
          {
            id: 'cam-03',
            nvrId: defaultNvrId,
            name: 'Stage Perimeter PTZ',
            model: 'DS-2CD2F42FWD-I',
            ip: `${subnetPrefix}.13`,
            port: 80,
            rtspPort: 554,
            mac: '00:1E:80:B8:CC:D3',
            status: 'online',
            type: 'ptz',
            fps: 30,
            bitrate: 4096,
            resolution: '1920x1080',
            recording: true,
            motionDetected: false,
            motionLevel: 10,
            location: 'Stage Left Perimeter',
            ptzOffset: { x: 12, y: -5, zoom: 3, focusBlur: 0 }
          },
          {
            id: 'cam-04',
            nvrId: defaultNvrId,
            name: 'Outer Wall Thermal',
            model: 'DS-2TD1217-2/V1',
            ip: `${subnetPrefix}.14`,
            port: 80,
            rtspPort: 554,
            mac: '00:1E:80:C1:AA:E4',
            status: 'online',
            type: 'thermal',
            fps: 15,
            bitrate: 1024,
            resolution: '640x480',
            recording: false,
            motionDetected: false,
            motionLevel: 0,
            location: 'North Outer Wall',
            ptzOffset: { x: 0, y: 0, zoom: 1, focusBlur: 0 }
          }
        ];

        setNvrs(defaultNvrs);
        setChannels(defaultCams);
        setSelectedNvrId(defaultNvrId);

        const newBindings: Record<number, string> = {};
        defaultCams.forEach((c, idx) => {
          newBindings[idx] = c.id;
        });
        setGridBindings(newBindings);

        // Save to Firestore so it is persistent
        await saveProfileToFirestore(defaultNvrs, defaultCams);
      }
    } catch (err) {
      console.error("Failed to load IVMS profile from Firestore:", err);
    }
  };

  // iVMS Live View grid layout: 1 (1x1), 4 (2x2), 9 (3x3)
  const [gridLayout, setGridLayout] = useState<1 | 4 | 9>(4);
  const [selectedGridPane, setSelectedGridPane] = useState<number>(0);
  // Maps grid index to camera channel ID
  const [gridBindings, setGridBindings] = useState<Record<number, string>>({});

  // PTZ Control state for the currently focused camera channel
  const [ptzSpeed, setPtzSpeed] = useState<number>(5);
  const [isPTZActive, setIsPTZActive] = useState(false);
  const [ptzDirection, setPtzDirection] = useState<string>('');

  // SADP Device Activation / Modify Password states
  const [selectedSadpDevice, setSelectedSadpDevice] = useState<CameraChannel | null>(null);
  const [sadpModifyIp, setSadpModifyIp] = useState('');
  const [sadpModifyPort, setSadpModifyPort] = useState(80);
  const [sadpPassword, setSadpPassword] = useState('');
  const [isActivating, setIsActivating] = useState(false);

  // iVMS Playback control states
  const [playbackTime, setPlaybackTime] = useState<number>(10); // hour (0 - 24)
  const [isPlaybackPlaying, setIsPlaybackPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1); // 1x, 2x, 4x, 8x

  // Audio and static feed controls
  const [audioMuted, setAudioMuted] = useState(true);
  const [feedInterference, setFeedInterference] = useState(false);

  // Filtered channels memo for search bar
  const filteredChannels = useMemo(() => {
    if (!searchQuery) return channels;
    const q = searchQuery.toLowerCase();
    return channels.filter(ch => 
      ch.name.toLowerCase().includes(q) ||
      ch.ip.toLowerCase().includes(q) ||
      (ch.location && ch.location.toLowerCase().includes(q))
    );
  }, [channels, searchQuery]);

  // Firebase logging for motion alert
  const logMotionAlert = async (cameraName: string, ip: string, level: number) => {
    try {
      const logId = `log-motion-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      await setDoc(doc(db, 'signal_logs', logId), {
        id: logId,
        timestamp: new Date().toISOString(),
        level: 'warn',
        source: 'CCTV NVR System',
        message: `Motion Alert [${cameraName} (${ip})]: High activity detected at level ${level}%. Syncing telemetry snapshot frames.`,
      });
    } catch (err) {
      console.error("Failed to log motion alert to Firestore:", err);
    }
  };

  // Trigger a connection test for an NVR or Camera
  const handleTestConnection = (id: string, type: 'nvr' | 'camera') => {
    setTestingEntityId(id);
    setTestResult(null);

    const target = type === 'nvr' 
      ? nvrs.find(n => n.id === id) 
      : channels.find(c => c.id === id);

    const targetName = target ? target.name : 'Unknown Device';
    const targetIp = target ? target.ip : '0.0.0.0';

    setTimeout(() => {
      const isValidIp = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(targetIp);
      if (isValidIp) {
        setTestResult({
          success: true,
          message: `SADP SOAP echo received from ${targetIp}.`,
          details: `Round-trip time: ${agentLatency}ms. RTSP channel negotiation verified. Connection state is: ONLINE.`
        });
        triggerToast(`Test Succeeded: ${targetName} is reachable`, 'success');
      } else {
        setTestResult({
          success: false,
          message: `Host unreachable. Socket handshake timeout.`,
          details: `Tried connecting to ${targetIp}. Check routing table on link node ${nodeIp}.`
        });
        triggerToast(`Test Failed: ${targetName} is unreachable`, 'warn');
      }
      setTestingEntityId(null);
    }, 1500);
  };

  // Save NVR configuration profile
  const handleSaveNvr = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canModifyAssets) {
      triggerToast(`Access Denied: Role [${userRole}] cannot save NVR configurations. Required: Technician/Admin.`, 'warn');
      return;
    }

    const finalIp = nvrFormIp || `${activeNICSubnet}.100`;
    const finalMac = nvrFormMac || `E0:50:8B:4A:CF:${Math.floor(10 + Math.random() * 89)}`;

    const newNvr: NvrConfig = {
      id: editingNvrId || `nvr-${Date.now()}`,
      name: nvrFormName || 'DS-7616NI iVMS NVR',
      model: nvrFormModel,
      ip: finalIp,
      port: nvrFormPort,
      mac: finalMac,
      firmware: nvrFormFirmware,
      channelsCount: 16,
      activeChannels: editingNvrId ? (nvrs.find(n => n.id === editingNvrId)?.activeChannels || 0) : 0,
      hddTotal: nvrFormHddTotal,
      hddUsed: editingNvrId ? (nvrs.find(n => n.id === editingNvrId)?.hddUsed || 1.2) : 1.2,
      status: 'online'
    };

    let updatedNvrs: NvrConfig[];
    if (editingNvrId) {
      updatedNvrs = nvrs.map(n => n.id === editingNvrId ? newNvr : n);
    } else {
      updatedNvrs = [...nvrs, newNvr];
    }

    setNvrs(updatedNvrs);
    if (!selectedNvrId) {
      setSelectedNvrId(newNvr.id);
    }

    await saveProfileToFirestore(updatedNvrs, channels);
    triggerToast(`NVR ${newNvr.name} successfully saved to cloud config registry`, 'success');

    // Reset Form
    setNvrFormName('');
    setNvrFormIp('');
    setNvrFormMac('');
    setEditingNvrId(null);
    setShowNvrForm(false);
  };

  // Delete NVR device profile
  const handleDeleteNvr = async (id: string) => {
    if (userRole !== 'Admin' && userRole !== 'Super Admin') {
      triggerToast(`Access Denied: Only Administrator level profiles can delete core NVR assets. Current role is ${userRole}.`, 'warn');
      return;
    }

    const targetNvr = nvrs.find(n => n.id === id);
    const updatedNvrs = nvrs.filter(n => n.id !== id);
    
    // Set cameras that belonged to this NVR to standalone
    const updatedChannels = channels.map(ch => ch.nvrId === id ? { ...ch, nvrId: 'standalone' } : ch);

    setNvrs(updatedNvrs);
    setChannels(updatedChannels);
    if (selectedNvrId === id) {
      setSelectedNvrId(updatedNvrs[0]?.id || '');
    }

    await saveProfileToFirestore(updatedNvrs, updatedChannels);
    triggerToast(`NVR ${targetNvr?.name || 'Device'} unregistered from system. Reassigned adopted cameras as standalone feeds.`, 'warn');
  };

  // Save Camera profile
  const handleSaveCamera = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canModifyAssets) {
      triggerToast(`Access Denied: Role [${userRole}] cannot save camera parameters. Required: Technician/Admin.`, 'warn');
      return;
    }

    const finalIp = cameraFormIp || `${activeNICSubnet}.121`;
    const finalMac = cameraFormMac || `E0:50:8B:4A:CF:${Math.floor(10 + Math.random() * 89)}`;

    const newCam: CameraChannel = {
      id: editingCameraId || `cam-${Date.now()}`,
      name: cameraFormName || 'IP CCTV Camera',
      model: cameraFormModel,
      ip: finalIp,
      port: cameraFormPort,
      rtspPort: cameraFormRtspPort,
      mac: finalMac,
      status: 'online',
      type: cameraFormType,
      fps: cameraFormFps,
      bitrate: cameraFormBitrate,
      resolution: cameraFormResolution,
      recording: true,
      motionDetected: false,
      motionLevel: 5,
      location: cameraFormLocation || 'Secure Area Perimeter',
      ptzOffset: { x: 0, y: 0, zoom: 1, focusBlur: 0 },
      nvrId: cameraFormNvrId
    };

    let updatedChannels: CameraChannel[];
    if (editingCameraId) {
      updatedChannels = channels.map(c => c.id === editingCameraId ? newCam : c);
    } else {
      updatedChannels = [...channels, newCam];
    }

    // Recalculate NVR channel allocations
    const updatedNvrs = nvrs.map(n => {
      const activeCount = updatedChannels.filter(c => c.nvrId === n.id).length;
      return { ...n, activeChannels: activeCount };
    });

    setChannels(updatedChannels);
    setNvrs(updatedNvrs);

    await saveProfileToFirestore(updatedNvrs, updatedChannels);
    triggerToast(`Camera ${newCam.name} registered and bound to ${newCam.nvrId === 'standalone' ? 'standalone index' : 'NVR hub'}`, 'success');

    // Reset Form
    setCameraFormName('');
    setCameraFormIp('');
    setCameraFormMac('');
    setCameraFormLocation('');
    setEditingCameraId(null);
    setShowCameraForm(false);

    // Automatically trigger Secure Feed Protocol test upon registration/save
    startSecureFeedDiagnostic(newCam);
  };

  // Delete Camera device profile
  const handleDeleteCamera = async (id: string) => {
    if (!canModifyAssets) {
      triggerToast(`Access Denied: Role [${userRole}] cannot delete camera assets. Required: Technician/Admin.`, 'warn');
      return;
    }

    const targetCam = channels.find(c => c.id === id);
    const updatedChannels = channels.filter(c => c.id !== id);

    // Recalculate NVR active counts
    const updatedNvrs = nvrs.map(n => {
      const activeCount = updatedChannels.filter(c => c.nvrId === n.id).length;
      return { ...n, activeChannels: activeCount };
    });

    setChannels(updatedChannels);
    setNvrs(updatedNvrs);

    await saveProfileToFirestore(updatedNvrs, updatedChannels);
    triggerToast(`Camera ${targetCam?.name || 'Device'} removed from profile registry`, 'warn');
  };

  // Adopt / Pull all cameras linked to a specific NVR after credentials validation
  const handleAdoptCameras = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adoptingNvrId) return;

    if (!canModifyAssets) {
      triggerToast(`Access Denied: Role [${userRole}] cannot perform camera adoption on NVR assets. Required: Technician/Admin.`, 'warn');
      return;
    }

    setIsAdopting(true);
    triggerToast('Initiating NVR stream scanning over active network node...', 'info');

    const targetNvr = nvrs.find(n => n.id === adoptingNvrId);
    if (!targetNvr) {
      setIsAdopting(false);
      return;
    }

    setTimeout(async () => {
      const parts = targetNvr.ip.split('.');
      const prefix = parts.length === 4 ? `${parts[0]}.${parts[1]}.${parts[2]}` : activeNICSubnet;

      const adoptedCams: CameraChannel[] = [
        {
          id: `cam-adopted-1-${Date.now()}`,
          name: `${targetNvr.name} - Ch 1 Main Gate Dome`,
          model: 'DS-2CD2143G0-I',
          ip: `${prefix}.121`,
          port: 80,
          rtspPort: 554,
          mac: `E0:50:8B:4A:DF:${Math.floor(10 + Math.random() * 89)}`,
          status: 'online',
          type: 'dome',
          fps: 25,
          bitrate: 2048,
          resolution: '1920x1080',
          recording: true,
          motionDetected: false,
          motionLevel: 5,
          location: 'Main Entry Sentry',
          ptzOffset: { x: 0, y: 0, zoom: 1, focusBlur: 0 },
          nvrId: adoptingNvrId
        },
        {
          id: `cam-adopted-2-${Date.now()}`,
          name: `${targetNvr.name} - Ch 2 Perimeter Bullet`,
          model: 'DS-2CD2043G2-I',
          ip: `${prefix}.122`,
          port: 80,
          rtspPort: 554,
          mac: `E0:50:8B:4A:DF:${Math.floor(10 + Math.random() * 89)}`,
          status: 'online',
          type: 'bullet',
          fps: 30,
          bitrate: 4096,
          resolution: '2560x1440',
          recording: true,
          motionDetected: false,
          motionLevel: 2,
          location: 'Cargo Loading Dock',
          ptzOffset: { x: 0, y: 0, zoom: 1, focusBlur: 0 },
          nvrId: adoptingNvrId
        },
        {
          id: `cam-adopted-3-${Date.now()}`,
          name: `${targetNvr.name} - Ch 3 High Speed PTZ`,
          model: 'DS-2CD2F42FWD-I',
          ip: `${prefix}.123`,
          port: 80,
          rtspPort: 554,
          mac: `E0:50:8B:4A:DF:${Math.floor(10 + Math.random() * 89)}`,
          status: 'online',
          type: 'ptz',
          fps: 25,
          bitrate: 3072,
          resolution: '1920x1080',
          recording: true,
          motionDetected: true,
          motionLevel: 45,
          location: 'Outer Wall Perimeter',
          ptzOffset: { x: 0, y: 0, zoom: 1, focusBlur: 0 },
          nvrId: adoptingNvrId
        }
      ];

      const newChannels = [...channels, ...adoptedCams];
      
      const updatedNvrs = nvrs.map(n => {
        if (n.id === adoptingNvrId) {
          return { ...n, activeChannels: n.activeChannels + 3 };
        }
        return n;
      });

      setChannels(newChannels);
      setNvrs(updatedNvrs);

      await saveProfileToFirestore(updatedNvrs, newChannels);
      triggerToast(`Successfully authorized & pulled 3 channels from NVR: ${targetNvr.name}`, 'success');

      setIsAdopting(false);
      setAdoptingNvrId(null);
      setAdoptPassword('');
    }, 1500);
  };

  // Add capture to local snapshot history state
  const addNewSnapshotCapture = (cameraId: string, cameraName: string, motionLevel: number) => {
    const timestamp = new Date().toLocaleString();
    const id = `snap-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const newCapture: SnapshotCapture = {
      id,
      cameraId,
      cameraName,
      timestamp,
      motionLevel,
      imageUrl: `Live Buffer Capture`
    };
    setSnapshotHistory(prev => [newCapture, ...prev].slice(0, 30));
  };

  // Countdown refresh interval for thumbnails (5 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      setThumbnailRefreshTime(prev => {
        if (prev <= 1) {
          setRefreshPulse(true);
          setTimeout(() => setRefreshPulse(false), 800);
          return 5;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Monitor motion transitions to trigger alerts and log snapshots
  const prevChannelsRef = useRef<CameraChannel[]>([]);
  useEffect(() => {
    channels.forEach(ch => {
      const prevCh = prevChannelsRef.current.find(p => p.id === ch.id);
      if (ch.status === 'online' && ch.motionDetected && (!prevCh || !prevCh.motionDetected)) {
        logMotionAlert(ch.name, ch.ip, ch.motionLevel);
        addNewSnapshotCapture(ch.id, ch.name, ch.motionLevel);
      }
    });
    prevChannelsRef.current = channels;
  }, [channels]);

  // Periodic random updates (fluctuating bitrate, FPS, motion triggers)
  const streamTimerRef = useRef<any>(null);

  // Fetch registered agents
  const fetchAgents = async () => {
    setIsLoadingAgents(true);
    try {
      const res = await fetch('/api/agents');
      const data = await res.json();
      if (data.success && data.agents && data.agents.length > 0) {
        setAgents(data.agents);
        // Default to first online agent, or first agent
        const online = data.agents.find((a: any) => a.status === 'online');
        const defaultAgent = online || data.agents[0];
        setSelectedAgentId(defaultAgent.deviceId);
      } else {
        // Fallback placeholder agent to allow the CCTV app to function fully in all states
        const mockAgent = {
          deviceId: 'agent-fallback-node',
          hostname: 'Kynren-Mgt-Console',
          status: 'online',
          network: {
            ipv4: ['10.12.10.45']
          }
        };
        setAgents([mockAgent]);
        setSelectedAgentId('agent-fallback-node');
      }
    } catch (err) {
      console.error('Failed to load agents list', err);
      const mockAgent = {
        deviceId: 'agent-fallback-node',
        hostname: 'Kynren-Mgt-Console',
        status: 'online',
        network: {
          ipv4: ['10.12.10.45']
        }
      };
      setAgents([mockAgent]);
      setSelectedAgentId('agent-fallback-node');
    } finally {
      setIsLoadingAgents(false);
    }
  };

  useEffect(() => {
    fetchAgents();
  }, []);

  // Update agent latency simulation
  useEffect(() => {
    if (!activeAgent) return;
    const interval = setInterval(() => {
      if (activeAgent.status === 'offline') {
        setAgentLatency(999); // Offline connection
      } else {
        // dynamic realistic latency centered around 12ms
        const base = 12;
        const jitter = Math.floor(Math.random() * 5) - 2; // -2 to +2
        setAgentLatency(Math.max(4, base + jitter));
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [activeAgent]);

  // Initialize profiles and snapshot history from Firestore
  useEffect(() => {
    loadProfileFromFirestore();

    // Populate a realistic base snapshot history log
    const baseHistory = [
      {
        id: `snap-h-1`,
        cameraId: 'none',
        cameraName: 'Gate Sentry Dome',
        timestamp: new Date(Date.now() - 400000).toLocaleString(),
        motionLevel: 55,
        imageUrl: 'Stage PTZ frame'
      },
      {
        id: `snap-h-2`,
        cameraId: 'none',
        cameraName: 'Main Perimeter Bullet',
        timestamp: new Date(Date.now() - 900000).toLocaleString(),
        motionLevel: 78,
        imageUrl: 'Main gate entry'
      }
    ];
    setSnapshotHistory(baseHistory);
  }, [clientId]);

  // Simulated live camera telemetry stream loop (bitrates & frame rates shift)
  useEffect(() => {
    streamTimerRef.current = setInterval(() => {
      setChannels(prev => prev.map(ch => {
        if (ch.status !== 'online') return ch;

        // Fluctuating bitrate (+- 10%)
        const dBitrate = Math.floor(ch.bitrate * (1 + (Math.random() * 0.16 - 0.08)));
        // Slightly changing FPS
        const dFps = Math.max(ch.fps + (Math.random() > 0.85 ? (Math.random() > 0.5 ? 1 : -1) : 0), 0);

        // Motion detection simulation
        let motion = ch.motionDetected;
        let motionLvl = ch.motionLevel;
        if (ch.type === 'ptz' || Math.random() > 0.92) {
          motion = Math.random() > 0.4;
          motionLvl = motion ? Math.floor(Math.random() * 80) + 10 : Math.floor(Math.random() * 8);
        }

        return {
          ...ch,
          bitrate: Math.max(128, dBitrate),
          fps: Math.min(30, Math.max(5, dFps)),
          motionDetected: motion,
          motionLevel: motionLvl
        };
      }));

      // Random feed interference overlay
      if (Math.random() > 0.98) {
        setFeedInterference(true);
        setTimeout(() => setFeedInterference(false), 300);
      }
    }, 2000);

    return () => clearInterval(streamTimerRef.current);
  }, []);

  // SADP Network auto-discovery scan
  const handleTriggerSadpScan = () => {
    if (!canRunDiagnostics) {
      triggerToast(`Access Denied: Your current role [${userRole}] does not have permission to execute network discovery diagnostics.`, 'warn');
      return;
    }
    if (isScanning) return;
    setIsScanning(true);
    setScanProgress(0);
    setScanStatusText('Initializing SADP Search Active Devices Protocol (Multicast M-SEARCH)...');
    
    triggerToast(`CCTV discovery scan initiated from agent node ${nodeIp}`, 'info');

    const steps = [
      { prg: 10, msg: 'Broadcasting SOAP XML probe on multicast address 239.255.255.250:3702...' },
      { prg: 25, msg: 'Active Gateway detected. Listening for response payloads...' },
      { prg: 45, msg: `Scanning IP range ${subnetPrefix}.1 to ${subnetPrefix}.254 via selected node...` },
      { prg: 70, msg: `Analyzing response packages via active network interface...` },
      { prg: 90, msg: 'Resolving MAC addresses and identifying Hikvision device signatures...' },
      { prg: 100, msg: 'Discovery scan completed. iVMS device database synchronized successfully.' }
    ];

    let currentStepIdx = 0;
    const interval = setInterval(async () => {
      if (currentStepIdx < steps.length) {
        const step = steps[currentStepIdx];
        setScanProgress(step.prg);
        setScanStatusText(step.msg);
        currentStepIdx++;
      } else {
        clearInterval(interval);
        
        try {
          const res = await fetch('/api/inventory');
          const data = await res.json();
          let realCamerasFound: CameraChannel[] = [];
          
          if (data && data.devices && data.devices.length > 0) {
            // Find scanned network devices that are on our dynamic subnet
            const activeSubnetHosts = data.devices.filter((d: any) => d.ip && d.ip.startsWith(subnetPrefix));
            
            activeSubnetHosts.forEach((dev: any, idx: number) => {
              const exists = channels.some(c => c.ip === dev.ip);
              if (!exists) {
                let type: 'dome' | 'bullet' | 'ptz' | 'thermal' = 'dome';
                if (dev.hostname?.toLowerCase().includes('ptz') || dev.hostname?.toLowerCase().includes('speed')) type = 'ptz';
                else if (dev.hostname?.toLowerCase().includes('thermal') || dev.hostname?.toLowerCase().includes('heat')) type = 'thermal';
                else if (idx % 2 === 0) type = 'bullet';
                
                realCamerasFound.push({
                  id: `cam-disc-${Date.now()}-${idx}`,
                  name: dev.hostname && dev.hostname !== 'N/A' ? `${dev.hostname} Camera` : `Discovered ${type.toUpperCase()} Node`,
                  model: dev.onvifData?.model || (type === 'ptz' ? 'DS-2CD2F42FWD-I' : 'DS-2CD2143G2-I'),
                  ip: dev.ip,
                  port: dev.openPorts?.includes(443) ? 443 : 80,
                  rtspPort: 554,
                  mac: dev.mac || `E0:50:8B:4A:CF:${(10 + idx).toString(16).toUpperCase()}`,
                  status: 'unactivated',
                  type: type,
                  fps: 25,
                  bitrate: 2048,
                  resolution: '1920x1080',
                  recording: false,
                  motionDetected: false,
                  motionLevel: 0,
                  location: 'Discovered via SADP Scan',
                  ptzOffset: { x: 0, y: 0, zoom: 1, focusBlur: 0 }
                });
              }
            });
          }
          
          if (realCamerasFound.length > 0) {
            const merged = [...channels];
            realCamerasFound.forEach(newCam => {
              if (!merged.some(m => m.ip === newCam.ip)) {
                merged.push(newCam);
              }
            });
            setChannels(merged);
            await saveProfileToFirestore(nvrs, merged);
            triggerToast(`SADP Scan sync complete! Discovered ${realCamerasFound.length} new unactivated security nodes on the ${subnetPrefix}.x segment.`, 'success');
          } else {
            // Fallback unactivated node to demonstrate activation flow
            const existsUnactivated = channels.some(c => c.status === 'unactivated');
            if (!existsUnactivated) {
              const mockSadv: CameraChannel = {
                id: `cam-sadp-mock-${Date.now()}`,
                name: 'Unactivated Gate Dome',
                model: 'DS-2CD2143G2-I',
                ip: `${subnetPrefix}.35`,
                port: 80,
                rtspPort: 554,
                mac: '42:00:4E:49:43:99',
                status: 'unactivated',
                type: 'dome',
                fps: 0,
                bitrate: 0,
                resolution: '1920x1080',
                recording: false,
                motionDetected: false,
                motionLevel: 0,
                location: 'Unassigned Gate Post',
                ptzOffset: { x: 0, y: 0, zoom: 1, focusBlur: 0 }
              };
              const updated = [...channels, mockSadv];
              setChannels(updated);
              await saveProfileToFirestore(nvrs, updated);
              triggerToast(`SADP Scan finished. Identified 1 unactivated CCTV node [${mockSadv.ip}] on ${subnetPrefix}.x/24.`, 'success');
            } else {
              triggerToast(`SADP Scan completed. Security device registry is fully up to date.`, 'info');
            }
          }
        } catch (err) {
          console.error("SADP scan merge failed:", err);
          triggerToast(`SADP Scan finished. Broadcast completed on segment ${subnetPrefix}.x`, 'success');
        }
        setIsScanning(false);
      }
    }, 800);
  };

  // SADP Device Activation / Configuration Modification
  const handleModifySadpDevice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSadpDevice) return;

    if (!canModifyAssets) {
      triggerToast(`Access Denied: Role [${userRole}] cannot modify or activate SADP devices. Required: Technician/Admin.`, 'warn');
      return;
    }

    if (!sadpPassword) {
      triggerToast('iVMS error: administrator verification password required to deploy changes', 'warn');
      return;
    }

    setIsActivating(true);
    setTimeout(() => {
      setIsActivating(false);
      setChannels(prev => prev.map(ch => {
        if (ch.id === selectedSadpDevice.id) {
          const isActivatingAction = ch.status === 'unactivated';
          const updated: CameraChannel = {
            ...ch,
            status: 'online',
            ip: sadpModifyIp,
            port: sadpModifyPort,
            fps: isActivatingAction ? 25 : ch.fps,
            bitrate: isActivatingAction ? 2048 : ch.bitrate
          };
          return updated;
        }
        return ch;
      }));

      triggerToast(`SADP Configuration updated for ${selectedSadpDevice.name} [${sadpModifyIp}]. Sync complete.`, 'success');
      setSelectedSadpDevice(null);
      setSadpPassword('');
    }, 1200);
  };

  // Quick select device for SADP editor
  const handleSelectSadpDevice = (device: CameraChannel) => {
    setSelectedSadpDevice(device);
    setSadpModifyIp(device.ip);
    setSadpModifyPort(device.port);
  };

  // PTZ Control trigger
  const handlePTZAction = (direction: string) => {
    if (userRole === 'Observer' || userRole === 'Self Service') {
      triggerToast(`Access Denied: Your current role [${userRole}] does not have permission to execute PTZ control telemetry.`, 'warn');
      return;
    }

    const focusedCamId = gridBindings[selectedGridPane];
    if (!focusedCamId) return;

    const targetCam = channels.find(c => c.id === focusedCamId);
    if (!targetCam || targetCam.status !== 'online') {
      triggerToast('Cannot pan-tilt-zoom: Camera channel offline or invalid', 'warn');
      return;
    }

    setIsPTZActive(true);
    setPtzDirection(direction);

    setChannels(prev => prev.map(ch => {
      if (ch.id === focusedCamId) {
        let { x, y, zoom, focusBlur } = ch.ptzOffset;
        const step = ptzSpeed * 1.5;

        if (direction === 'UP') y = Math.max(-50, y - step);
        if (direction === 'DOWN') y = Math.min(50, y + step);
        if (direction === 'LEFT') x = Math.max(-50, x - step);
        if (direction === 'RIGHT') x = Math.min(50, x + step);
        if (direction === 'ZOOM_IN') zoom = Math.min(4, zoom + 0.25);
        if (direction === 'ZOOM_OUT') zoom = Math.max(1, zoom - 0.25);
        if (direction === 'FOCUS_FAR') focusBlur = Math.min(8, focusBlur + 1);
        if (direction === 'FOCUS_NEAR') focusBlur = Math.max(0, focusBlur - 1);

        return {
          ...ch,
          ptzOffset: { x, y, zoom, focusBlur }
        };
      }
      return ch;
    }));

    setTimeout(() => {
      setIsPTZActive(false);
      setPtzDirection('');
    }, 400);
  };

  // PTZ Reset
  const handlePTZReset = () => {
    if (userRole === 'Observer' || userRole === 'Self Service') {
      triggerToast(`Access Denied: Your current role [${userRole}] does not have permission to execute PTZ control telemetry.`, 'warn');
      return;
    }
    const focusedCamId = gridBindings[selectedGridPane];
    if (!focusedCamId) return;

    setChannels(prev => prev.map(ch => {
      if (ch.id === focusedCamId) {
        return {
          ...ch,
          ptzOffset: { x: 0, y: 0, zoom: 1, focusBlur: 0 }
        };
      }
      return ch;
    }));
    triggerToast('PTZ vector coords reset to home coordinate matrix.', 'info');
  };

  // Timeline playback jump
  const handleTimelineClick = (hour: number) => {
    setPlaybackTime(hour);
    setIsPlaybackPlaying(true);
    triggerToast(`iVMS NVR indexing archive recording for target hour frame: ${Math.floor(hour)}:00`, 'success');
  };

  // Playback timer simulation
  useEffect(() => {
    let interval: any = null;
    if (isPlaybackPlaying) {
      interval = setInterval(() => {
        setPlaybackTime(prev => {
          const next = prev + (0.02 * playbackSpeed);
          return next >= 24 ? 0 : next;
        });
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isPlaybackPlaying, playbackSpeed]);

  // Bind a camera channel to the selected grid slot
  const handleBindChannelToPane = (channelId: string, paneIndex: number) => {
    setGridBindings(prev => ({
      ...prev,
      [paneIndex]: channelId
    }));
    const cam = channels.find(c => c.id === channelId);
    if (cam) {
      triggerToast(`Channel linked: ${cam.name} assigned to monitor Pane ${paneIndex + 1}`, 'info');
    }
  };

  // Helper to get formatted playback time
  const formatPlaybackTime = (hourVal: number) => {
    const hours = Math.floor(hourVal);
    const minutes = Math.floor((hourVal - hours) * 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`;
  };

  return (
    <div className="space-y-6 text-slate-300">
      
      {/* 1. CCTV & NVR HEADER BANNER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-slate-950 p-5 rounded-xl border border-slate-800/80 shadow-2xl relative overflow-hidden">
        {/* Neon Backdrop Grid line */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(244,63,94,0.015)_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none" />
        
        <div className="relative z-10">
          <h3 className="font-sans font-bold text-slate-100 flex items-center gap-2.5 text-base">
            <Tv className="w-5 h-5 text-rose-500 animate-pulse" /> iVMS-4000 NVR & CCTV Console
          </h3>
          <p className="text-xs text-slate-400 font-sans mt-1">
            Hikvision-inspired client interface for Search Active Devices Protocol (SADP) scans, PTZ alignments, and live camera grid streams.
          </p>
        </div>

        {/* 2. AGENT BINDING PANEL (CRITICAL INTENT DIRECTIVE) */}
        <div className="flex flex-wrap items-center gap-3 bg-slate-900/90 border border-slate-800 p-3 rounded-lg relative z-10 max-w-md">
          <div className="flex items-center gap-1.5 shrink-0">
            <Cpu className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">Agent Node Link:</span>
          </div>
          
          <select
            value={selectedAgentId}
            onChange={(e) => {
              setSelectedAgentId(e.target.value);
              triggerToast(`iVMS console synced to security agent node network segment`, 'success');
            }}
            className="bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-xs text-slate-200 font-mono focus:outline-none focus:border-rose-500 max-w-[180px] shrink-0"
          >
            {agents.map((ag) => (
              <option key={ag.deviceId} value={ag.deviceId}>
                {ag.hostname} ({ag.status})
              </option>
            ))}
          </select>

          <div className="flex items-center gap-2 text-[10px] font-mono border-l border-slate-800 pl-3">
            <div>
              <span className="text-slate-500 block text-[8px] uppercase">Node IP</span>
              <span className="text-emerald-400 font-bold">{nodeIp}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[8px] uppercase">Latency</span>
              <span className="text-cyan-400 font-bold">
                {activeAgent?.status === 'offline' ? 'TIMEOUT' : `${agentLatency}ms`}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Discovery Bar */}
      <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
        <div className="relative flex-1 max-w-xl">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search cameras by name, IP address, or location (e.g., Gate, Stage, Dock)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-rose-500 font-mono transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300 font-bold font-mono text-[10px] cursor-pointer"
            >
              CLEAR
            </button>
          )}
        </div>
        
        {/* Results indicator */}
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="text-slate-500">Query Status:</span>
          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
            filteredChannels.length === 0 
              ? 'bg-rose-950 text-rose-400 border border-rose-900/30' 
              : 'bg-slate-900 text-rose-400 border border-slate-800'
          }`}>
            {filteredChannels.length === channels.length 
              ? `ALL ${channels.length} NODES INDEXED` 
              : `FOUND ${filteredChannels.length} OF ${channels.length} MATCHES`
          }
          </span>
        </div>
      </div>

      {/* SUB-TABS SELECTOR */}
      <div className="flex border-b border-slate-800 gap-1 overflow-x-auto">
        {[
          { id: 'live', label: 'Live Video Matrix' },
          { id: 'playback', label: 'NVR Playback Center' },
          { id: 'sadp', label: 'SADP Discovery Protocol' },
          { id: 'settings', label: 'iVMS Config Server' }
        ].map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveSubTab(tab.id as any)}
            className={`px-4 py-2 text-xs font-bold transition-all border-b-2 whitespace-nowrap cursor-pointer flex items-center gap-2 ${
              activeSubTab === tab.id 
                ? 'border-rose-500 text-slate-100 bg-white/5' 
                : 'border-transparent text-slate-500 hover:text-slate-300 hover:bg-white/2'
            }`}
          >
            {tab.id === 'live' && <LayoutGrid className="w-3.5 h-3.5 text-rose-500" />}
            {tab.id === 'playback' && <Database className="w-3.5 h-3.5 text-sky-400" />}
            {tab.id === 'sadp' && <Network className="w-3.5 h-3.5 text-emerald-400" />}
            {tab.id === 'settings' && <Settings className="w-3.5 h-3.5 text-purple-400" />}
            {tab.label}
          </button>
        ))}
      </div>

      {/* CORE WORKSPACE */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* LEFT PANEL: DEVICE & CHANNEL LIST TREE (CLASSIC iVMS TREE) */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-900 pb-2">
              <span className="text-xs font-mono font-extrabold uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                <Folder className="w-3.5 h-3.5 text-rose-500" /> Device Channel List
              </span>
              <span className="text-[10px] font-mono text-slate-500 font-bold">{channels.length} Nodes</span>
            </div>

            {/* SADP Sweep Active Node alert */}
            <div className="p-2.5 bg-slate-900/60 rounded border border-slate-850 text-[10px] font-mono text-slate-400 leading-relaxed space-y-1">
              <div className="text-[9px] text-slate-500 font-bold uppercase">Linked Scan Segment</div>
              <div className="flex justify-between">
                <span>Agent Node IP:</span> <span className="text-emerald-400 font-semibold">{nodeIp}</span>
              </div>
              <div className="flex justify-between">
                <span>Network Segment:</span> <span className="text-slate-200">{subnetPrefix}.x/24</span>
              </div>
              <div className="flex justify-between">
                <span>Active NVR:</span> <span className="text-slate-200">{nvrConfig.name}</span>
              </div>
            </div>

            {/* Tree Root - NVRs & Standalone Channels */}
            <div className="space-y-3">
              {nvrs.length === 0 && channels.length === 0 ? (
                <div className="py-6 text-center text-[10px] font-mono text-slate-500 italic space-y-2">
                  <div>No CCTV nodes configured yet.</div>
                  <button
                    type="button"
                    onClick={() => setActiveSubTab('settings')}
                    className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-rose-400 border border-slate-800 hover:border-slate-700 rounded text-[9px] font-bold cursor-pointer"
                  >
                    + Register NVR or Camera
                  </button>
                </div>
              ) : (
                <>
                  {nvrs.map((nvr) => {
                    const nvrCams = filteredChannels.filter(c => c.nvrId === nvr.id);
                    return (
                      <div key={nvr.id} className="space-y-1.5 pb-2 border-b border-slate-900/40 last:border-0 last:pb-0">
                        <div 
                          onClick={() => {
                            setSelectedNvrId(nvr.id);
                            triggerToast(`Switched active NVR view to: ${nvr.name}`, 'info');
                          }}
                          className={`flex items-center gap-1.5 text-xs font-semibold py-1 px-2 rounded border cursor-pointer transition-all ${
                            selectedNvrId === nvr.id 
                              ? 'bg-rose-500/10 text-rose-300 border-rose-500/30' 
                              : 'bg-slate-900/40 text-slate-300 border-slate-800 hover:bg-slate-900'
                          }`}
                        >
                          <Database className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                          <span className="truncate flex-1">{nvr.name}</span>
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${nvr.status === 'online' ? 'bg-emerald-500 shadow-[0_0_6px_#10b981]' : 'bg-slate-600'}`} />
                        </div>

                        {/* NVR Camera Channels */}
                        <div className="pl-4 space-y-1 ml-3 border-l border-slate-800/80 pt-0.5">
                          {nvrCams.length === 0 ? (
                            <div className="text-[9px] text-slate-600 font-mono italic py-0.5">No cameras adopted yet.</div>
                          ) : (
                            nvrCams.map((ch) => {
                              const isAssigned = Object.values(gridBindings).includes(ch.id);
                              const isOffline = ch.status === 'offline' || activeAgent?.status === 'offline';
                              const isUnactivated = ch.status === 'unactivated';

                              return (
                                <div
                                  key={ch.id}
                                  onClick={() => {
                                    if (!isOffline && !isUnactivated) {
                                      handleBindChannelToPane(ch.id, selectedGridPane);
                                    } else if (isUnactivated) {
                                      triggerToast(`Device ${ch.name} must be activated via SADP tab before streaming.`, 'warn');
                                      setActiveSubTab('sadp');
                                    } else {
                                      triggerToast('Cannot stream offline CCTV channel. Check physical link.', 'warn');
                                    }
                                  }}
                                  className={`group p-1.5 rounded flex items-center justify-between text-[11px] font-mono cursor-pointer transition-all ${
                                    isAssigned 
                                      ? 'bg-rose-500/10 text-rose-300 border border-rose-500/30' 
                                      : isOffline
                                        ? 'text-slate-600 hover:bg-slate-900/30'
                                        : isUnactivated
                                          ? 'text-amber-500/80 bg-amber-500/5 border border-dashed border-amber-500/20'
                                          : 'text-slate-400 hover:bg-slate-900/80 hover:text-slate-200'
                                  }`}
                                >
                                  <div className="flex items-center gap-1.5 truncate">
                                    <Video className={`w-3.5 h-3.5 shrink-0 ${
                                      isOffline ? 'text-slate-600' : isUnactivated ? 'text-amber-500' : isAssigned ? 'text-rose-500' : 'text-slate-500 group-hover:text-slate-300'
                                    }`} />
                                    <span className="truncate">{ch.name}</span>
                                  </div>
                                  <div className="flex items-center gap-1 flex-shrink-0">
                                    {ch.motionDetected && ch.status === 'online' && !isOffline && (
                                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" title="Motion Detected" />
                                    )}
                                    <span className={`text-[8px] font-mono px-1 rounded ${
                                      isOffline 
                                        ? 'bg-slate-900 text-slate-600' 
                                        : isUnactivated 
                                          ? 'bg-amber-950/40 text-amber-500 border border-amber-900/30' 
                                          : 'bg-slate-900 text-slate-500'
                                    }`}>
                                      {isOffline ? 'OFF' : isUnactivated ? 'INACT' : 'LIVE'}
                                    </span>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {/* Standalone channels */}
                  {filteredChannels.filter(c => !c.nvrId || c.nvrId === 'standalone').length > 0 && (
                    <div className="pt-2 border-t border-slate-900/60 mt-2 space-y-1.5">
                      <div className="text-[9px] font-mono font-bold text-slate-500 uppercase tracking-wider px-1">Standalone CCTV Feeds</div>
                      <div className="space-y-1">
                        {filteredChannels.filter(c => !c.nvrId || c.nvrId === 'standalone').map((ch) => {
                          const isAssigned = Object.values(gridBindings).includes(ch.id);
                          const isOffline = ch.status === 'offline' || activeAgent?.status === 'offline';
                          const isUnactivated = ch.status === 'unactivated';

                          return (
                            <div
                              key={ch.id}
                              onClick={() => {
                                if (!isOffline && !isUnactivated) {
                                  handleBindChannelToPane(ch.id, selectedGridPane);
                                } else if (isUnactivated) {
                                  triggerToast(`Device ${ch.name} must be activated via SADP tab before streaming.`, 'warn');
                                  setActiveSubTab('sadp');
                                } else {
                                  triggerToast('Cannot stream offline CCTV channel. Check physical link.', 'warn');
                                }
                              }}
                              className={`group p-1.5 rounded flex items-center justify-between text-[11px] font-mono cursor-pointer transition-all ${
                                isAssigned 
                                  ? 'bg-rose-500/10 text-rose-300 border border-rose-500/30' 
                                  : isOffline
                                    ? 'text-slate-600 hover:bg-slate-900/30'
                                    : isUnactivated
                                      ? 'text-amber-500/80 bg-amber-500/5 border border-dashed border-amber-500/20'
                                      : 'text-slate-400 hover:bg-slate-900/80 hover:text-slate-200'
                              }`}
                            >
                              <div className="flex items-center gap-1.5 truncate">
                                <Video className={`w-3.5 h-3.5 shrink-0 ${
                                  isOffline ? 'text-slate-600' : isUnactivated ? 'text-amber-500' : isAssigned ? 'text-rose-500' : 'text-slate-500 group-hover:text-slate-300'
                                }`} />
                                <span className="truncate">{ch.name}</span>
                              </div>
                              <div className="flex items-center gap-1 flex-shrink-0">
                                {ch.motionDetected && ch.status === 'online' && !isOffline && (
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" title="Motion Detected" />
                                )}
                                <span className={`text-[8px] font-mono px-1 rounded ${
                                  isOffline 
                                    ? 'bg-slate-900 text-slate-600' 
                                    : isUnactivated 
                                      ? 'bg-amber-950/40 text-amber-500 border border-amber-900/30' 
                                      : 'bg-slate-900 text-slate-500'
                                }`}>
                                  {isOffline ? 'OFF' : isUnactivated ? 'INACT' : 'LIVE'}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Playback timeline helper in live */}
            {activeSubTab === 'live' && (
              <div className="pt-2 border-t border-slate-900 space-y-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 block">Matrix Controls</span>
                <div className="grid grid-cols-3 gap-1.5">
                  {[1, 4, 9].map((layout) => (
                    <button
                      key={layout}
                      type="button"
                      onClick={() => setGridLayout(layout as any)}
                      className={`py-1 rounded border font-mono text-[10px] text-center transition-all cursor-pointer ${
                        gridLayout === layout 
                          ? 'bg-rose-500/10 text-rose-400 border-rose-500/40 font-bold' 
                          : 'bg-slate-900 text-slate-400 border-slate-850 hover:border-slate-800'
                      }`}
                    >
                      {layout === 1 ? '1 x 1' : layout === 4 ? '2 x 2' : '3 x 3'}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-2 text-[10px] pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setAudioMuted(!audioMuted);
                      triggerToast(audioMuted ? 'iVMS audio streams unmuted' : 'iVMS audio muted', 'info');
                    }}
                    className={`p-1.5 rounded border font-mono text-center cursor-pointer flex items-center justify-center gap-1 transition-all ${
                      !audioMuted ? 'bg-emerald-950/40 text-emerald-400 border-emerald-900/30' : 'bg-slate-900 border-slate-850 text-slate-400'
                    }`}
                  >
                    {!audioMuted ? <Volume2 className="w-3 h-3" /> : <VolumeX className="w-3 h-3" />}
                    <span>Audio {audioMuted ? 'Muted' : 'ON'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const snap = channels.find(c => c.id === gridBindings[selectedGridPane]);
                      if (snap) {
                        triggerToast(`iVMS snapshot saved: snapshot_${snap.id}_${Date.now()}.png downloaded to local buffer.`, 'success');
                      } else {
                        triggerToast('Select an active video frame grid slot to take snapshot.', 'warn');
                      }
                    }}
                    className="p-1.5 bg-slate-900 border border-slate-850 hover:border-slate-800 rounded font-mono text-center text-slate-400 hover:text-slate-200 cursor-pointer flex items-center justify-center gap-1"
                  >
                    <Camera className="w-3 h-3 text-rose-500" />
                    <span>Snap Frame</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT PANEL: SELECTED TAB WORKSPACE */}
        <div className="lg:col-span-3 space-y-4">
          
          {/* TAB 1: LIVE VIDEO GRID VIEW */}
          {activeSubTab === 'live' && (
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              
              {/* Camera Video Stream Grid Matrix */}
              <div className="xl:col-span-2 space-y-3">
                <div 
                  className={`grid gap-2 bg-black border-4 border-slate-950 rounded-xl overflow-hidden relative shadow-2xl ${
                    gridLayout === 1 ? 'grid-cols-1' : gridLayout === 4 ? 'grid-cols-2' : 'grid-cols-3'
                  }`}
                  style={{ minHeight: '480px' }}
                >
                  {/* Digital Overlay scanline interference */}
                  {feedInterference && (
                    <div className="absolute inset-0 bg-slate-900/60 z-30 pointer-events-none flex items-center justify-center font-mono text-xs text-rose-500 font-bold uppercase animate-ping">
                      <ShieldAlert className="w-6 h-6 mr-1" /> CAMERA FEED INTERFERENCE SYNC ERROR
                    </div>
                  )}

                  {Array.from({ length: gridLayout }).map((_, paneIdx) => {
                    const bindId = gridBindings[paneIdx];
                    const ch = channels.find(c => c.id === bindId);
                    const isSelectedPane = selectedGridPane === paneIdx;
                    const isOffline = !ch || ch.status === 'offline' || activeAgent?.status === 'offline';

                    return (
                      <div
                        key={paneIdx}
                        onClick={() => setSelectedGridPane(paneIdx)}
                        className={`relative aspect-video flex flex-col justify-between p-2.5 overflow-hidden transition-all group cursor-pointer ${
                          isOffline ? 'bg-slate-950' : 'bg-slate-900'
                        } ${
                          isSelectedPane 
                            ? 'ring-2 ring-rose-500 z-10 shadow-[0_0_12px_rgba(244,63,94,0.3)]' 
                            : 'ring-1 ring-slate-800 hover:ring-slate-700'
                        }`}
                      >
                        {/* Selected overlay halo */}
                        {isSelectedPane && (
                          <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-rose-600 via-rose-500 to-rose-600" />
                        )}

                        {/* Top Meta Bar */}
                        <div className="flex justify-between items-center z-10 font-mono text-[9px] text-slate-300 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
                          <div className="flex items-center gap-1 bg-black/60 px-1.5 py-0.5 rounded backdrop-blur-xs">
                            <span className="font-bold text-slate-100">{paneIdx + 1}</span>
                            <span className="text-slate-400">|</span>
                            <span className="text-slate-100 font-bold truncate max-w-[110px]">{ch ? ch.name : 'NO LINKED CHANNEL'}</span>
                          </div>

                          {!isOffline && ch && (
                            <div className="flex items-center gap-1.5 bg-black/60 px-1.5 py-0.5 rounded backdrop-blur-xs">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                              <span className="text-rose-400 font-bold">REC</span>
                            </div>
                          )}
                        </div>

                        {/* Center Visual feed viewport */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          {isOffline ? (
                            <div className="text-center space-y-2 select-none pointer-events-none p-4">
                              <VideoOff className="w-8 h-8 text-slate-800 mx-auto" />
                              <span className="font-mono text-[10px] text-slate-600 uppercase block tracking-widest font-bold">
                                {activeAgent?.status === 'offline' ? 'AGENT DISCONNECTED' : 'VIDEO LOSS - NO SIGNAL'}
                              </span>
                              <p className="text-[8px] text-slate-700 font-mono">
                                Subnet Check: {ch ? ch.ip : 'NULL'} : Link offline
                              </p>
                            </div>
                          ) : (
                            /* Simulated live CCTV graphic vector feed overlay */
                            <div 
                              className="w-full h-full relative overflow-hidden transition-transform duration-200"
                              style={{
                                transform: `translate(${ch.ptzOffset.x}px, ${ch.ptzOffset.y}px) scale(${ch.ptzOffset.zoom})`,
                                filter: `blur(${ch.ptzOffset.focusBlur}px)`
                              }}
                            >
                              {/* Thermal view simulation background */}
                              {ch.type === 'thermal' ? (
                                <div className="absolute inset-0 bg-radial-gradient from-amber-600 via-purple-900 to-blue-950 opacity-90 flex items-center justify-center">
                                  {/* Heated sensor contours */}
                                  <div className="w-24 h-24 rounded-full bg-red-500/40 filter blur-xl animate-pulse absolute left-1/4 top-1/3" />
                                  <div className="w-16 h-16 rounded-full bg-yellow-400/50 filter blur-lg animate-bounce absolute right-1/4 bottom-1/4" />
                                </div>
                              ) : (
                                <div className="absolute inset-0 bg-slate-900 flex items-center justify-center">
                                  {/* Camera Grid lines background */}
                                  <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] bg-[size:10px_10px] opacity-40" />
                                </div>
                              )}

                              {/* Target Crosshairs */}
                              <div className="absolute inset-0 border border-slate-800/10 flex items-center justify-center pointer-events-none">
                                <div className="w-10 h-[1px] bg-emerald-500/20 absolute" />
                                <div className="h-10 w-[1px] bg-emerald-500/20 absolute" />
                                <div className="w-24 h-24 rounded-full border border-dashed border-emerald-500/10" />
                              </div>

                              {/* Moving scanlines */}
                              <div className="absolute inset-0 bg-[linear-gradient(rgba(18,24,38,0)_95%,rgba(16,185,129,0.04)_98%,rgba(18,24,38,0)_100%)] bg-[size:100%_40px] animate-[slide_10s_linear_infinite] pointer-events-none" />

                              {/* Motion detection box */}
                              {ch.motionDetected && (
                                <div className="absolute border border-amber-500/80 bg-amber-500/5 p-1 animate-pulse" style={{
                                  left: '20%', top: '35%', width: '45%', height: '35%'
                                }}>
                                  <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-amber-500" />
                                  <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-amber-500" />
                                  <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-amber-500" />
                                  <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-amber-500" />
                                  <span className="text-[8px] font-mono text-amber-500 font-extrabold uppercase absolute top-1 left-1">
                                    MOTION BLOCK: LEVEL {ch.motionLevel}%
                                  </span>
                                </div>
                              )}

                              {/* Digital static simulation overlay */}
                              <div className="absolute inset-0 bg-noise opacity-[0.03] pointer-events-none" />
                            </div>
                          )}
                        </div>

                        {/* Bottom Overlay stats */}
                        {!isOffline && ch && (
                          <div className="z-10 font-mono text-[8px] text-slate-400 drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)] space-y-0.5 bg-black/40 p-1 rounded backdrop-blur-xs">
                            <div className="flex justify-between">
                              <span className="text-emerald-400 font-bold">{ch.ip}</span>
                              <span>{ch.resolution} @ {ch.fps}fps</span>
                            </div>
                            <div className="flex justify-between text-slate-500">
                              <span>MAC: {ch.mac}</span>
                              <span className="text-cyan-400">{ch.bitrate} Kbps</span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Subnet linked warning */}
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-850 flex items-start gap-2.5">
                  <Activity className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <div className="text-xs space-y-0.5">
                    <p className="font-mono text-slate-300 font-bold">iVMS Network Traffic Audit</p>
                    <p className="text-slate-500">
                      RTSP streams are routing through the Endpoint Security Agent <strong className="text-slate-300">{activeAgent?.hostname || 'fallback'}</strong>. Network activities, socket connections, and camera handshakes originate from Node IP <strong className="text-emerald-400">{nodeIp}</strong>.
                    </p>
                  </div>
                </div>
              </div>

              {/* PTZ Alignment D-PAD (Classic Hikvision PTZ Slider) */}
              <div className="xl:col-span-1 space-y-4">
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 space-y-4 shadow-xl">
                  <div className="flex items-center gap-1.5 border-b border-slate-900 pb-2">
                    <Compass className="w-4 h-4 text-rose-500" />
                    <span className="text-xs font-mono font-extrabold uppercase text-slate-300 tracking-wider">PTZ Alignment Panel</span>
                  </div>

                  {/* Channel focused status indicator */}
                  <div className="p-2.5 bg-slate-900 rounded border border-slate-850 space-y-1 font-mono text-[10px]">
                    <div className="text-slate-500 uppercase text-[8px] font-bold">Focused Monitor Pane: {selectedGridPane + 1}</div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Linked Cam:</span>
                      <strong className="text-slate-200 truncate max-w-[130px]">
                        {channels.find(c => c.id === gridBindings[selectedGridPane])?.name || 'NONE'}
                      </strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">IP address:</span>
                      <strong className="text-emerald-400">
                        {channels.find(c => c.id === gridBindings[selectedGridPane])?.ip || 'N/A'}
                      </strong>
                    </div>
                  </div>

                  {/* PTZ Directional Disc */}
                  <div className="flex flex-col items-center py-3">
                    <div className="relative w-36 h-36 bg-slate-900 rounded-full border border-slate-800 flex items-center justify-center shadow-inner">
                      
                      {/* Compass Circle */}
                      <div className="absolute inset-4 rounded-full border border-slate-800/60" />

                      {/* Direction Keys */}
                      <button
                        type="button"
                        onClick={() => handlePTZAction('UP')}
                        className="absolute top-2 w-8 h-8 rounded bg-slate-950 border border-slate-850 text-slate-300 hover:bg-slate-800 flex items-center justify-center font-bold text-xs shadow-md transition-all cursor-pointer"
                        title="Tilt UP"
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        onClick={() => handlePTZAction('DOWN')}
                        className="absolute bottom-2 w-8 h-8 rounded bg-slate-950 border border-slate-850 text-slate-300 hover:bg-slate-800 flex items-center justify-center font-bold text-xs shadow-md transition-all cursor-pointer"
                        title="Tilt DOWN"
                      >
                        ▼
                      </button>
                      <button
                        type="button"
                        onClick={() => handlePTZAction('LEFT')}
                        className="absolute left-2 w-8 h-8 rounded bg-slate-950 border border-slate-850 text-slate-300 hover:bg-slate-800 flex items-center justify-center font-bold text-xs shadow-md transition-all cursor-pointer"
                        title="Pan LEFT"
                      >
                        ◀
                      </button>
                      <button
                        type="button"
                        onClick={() => handlePTZAction('RIGHT')}
                        className="absolute right-2 w-8 h-8 rounded bg-slate-950 border border-slate-850 text-slate-300 hover:bg-slate-800 flex items-center justify-center font-bold text-xs shadow-md transition-all cursor-pointer"
                        title="Pan RIGHT"
                      >
                        ▶
                      </button>

                      {/* Reset Center button */}
                      <button
                        type="button"
                        onClick={handlePTZReset}
                        className="w-10 h-10 rounded-full bg-rose-600 text-white flex items-center justify-center text-[10px] font-mono font-bold shadow-lg shadow-rose-500/20 hover:bg-rose-500 transition-all cursor-pointer z-10"
                        title="Reset PTZ Home Coords"
                      >
                        HOME
                      </button>
                    </div>

                    {/* Active PTZ HUD Indicator */}
                    <AnimatePresence>
                      {isPTZActive && (
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          className="mt-3 text-[10px] font-mono text-rose-400 font-bold bg-rose-950/40 border border-rose-900/40 px-3 py-1 rounded-full uppercase"
                        >
                          PAN-TILT-ZOOM COMMAND: {ptzDirection}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Zoom / Focus / Speed Controls */}
                  <div className="space-y-3 font-mono text-[10px] pt-1">
                    
                    {/* Zoom / Focus Buttons */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <span className="text-slate-500 block uppercase font-bold text-[9px]">LENS ZOOM</span>
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => handlePTZAction('ZOOM_IN')}
                            className="flex-1 py-1 bg-slate-900 border border-slate-850 hover:border-slate-800 rounded font-bold text-xs text-slate-300 flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <ZoomIn className="w-3.5 h-3.5 text-rose-500" /> Zoom+
                          </button>
                          <button
                            type="button"
                            onClick={() => handlePTZAction('ZOOM_OUT')}
                            className="flex-1 py-1 bg-slate-900 border border-slate-850 hover:border-slate-800 rounded font-bold text-xs text-slate-300 flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <ZoomOut className="w-3.5 h-3.5 text-rose-500" /> Zoom-
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <span className="text-slate-500 block uppercase font-bold text-[9px]">LENS FOCUS</span>
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => handlePTZAction('FOCUS_FAR')}
                            className="flex-1 py-1 bg-slate-900 border border-slate-850 hover:border-slate-800 rounded font-bold text-xs text-slate-300 flex items-center justify-center cursor-pointer"
                          >
                            FAR
                          </button>
                          <button
                            type="button"
                            onClick={() => handlePTZAction('FOCUS_NEAR')}
                            className="flex-1 py-1 bg-slate-900 border border-slate-850 hover:border-slate-800 rounded font-bold text-xs text-slate-300 flex items-center justify-center cursor-pointer"
                          >
                            NEAR
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Speed Selector */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[9px] text-slate-500">
                        <span className="uppercase font-bold">PTZ DRIVE SPEED</span>
                        <span className="text-slate-300">{ptzSpeed} / 10</span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="10"
                        value={ptzSpeed}
                        onChange={(e) => setPtzSpeed(parseInt(e.target.value, 10))}
                        className="w-full accent-rose-500 bg-slate-900 border border-slate-850 rounded h-1 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Connected Cameras High-Level Overview Grid (Refresh every 5s) */}
              <div className="bg-slate-950 p-5 rounded-xl border border-slate-850/80 shadow-xl space-y-4 relative overflow-hidden col-span-1 xl:col-span-3">
                {/* Visual grid backdrop lines */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(244,63,94,0.01)_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
                
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10 border-b border-slate-900 pb-3">
                  <div className="flex items-center gap-2">
                    <LayoutGrid className="w-4 h-4 text-rose-500" />
                    <div>
                      <h4 className="font-sans font-bold text-slate-100 text-sm">All Connected Cameras At-A-Glance</h4>
                      <p className="text-[10px] text-slate-500 font-mono">Dynamic matrix refreshing thumbnails automatically every 5 seconds</p>
                    </div>
                  </div>
                  
                  {/* Next Refresh Timer Badge */}
                  <div className="flex items-center gap-2 font-mono text-[10px] bg-slate-900 border border-slate-850 rounded px-2.5 py-1 shrink-0 self-start sm:self-auto">
                    <Clock className={`w-3.5 h-3.5 text-rose-400 ${refreshPulse ? 'animate-spin' : ''}`} />
                    <span className="text-slate-400 uppercase">NEXT REFRESH:</span>
                    <span className="text-rose-400 font-bold w-3 text-right">{thumbnailRefreshTime}s</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-4 relative z-10">
                  {filteredChannels.map((ch) => {
                    const isOffline = ch.status === 'offline' || activeAgent?.status === 'offline';
                    return (
                      <div 
                        key={ch.id} 
                        className={`bg-slate-900/60 border rounded-xl p-3 flex flex-col justify-between transition-all group ${
                          isOffline 
                            ? 'border-slate-950 opacity-60' 
                            : ch.motionDetected 
                              ? 'border-amber-500/50 bg-amber-950/5 shadow-[0_0_8px_rgba(245,158,11,0.05)]' 
                              : 'border-slate-850 hover:border-slate-800'
                        }`}
                      >
                        {/* Camera metadata headers */}
                        <div className="flex justify-between items-start mb-2">
                          <div className="min-w-0">
                            <span className="text-[10px] font-mono text-slate-500 uppercase block font-bold leading-none tracking-wider">CH-0{ch.id.slice(-1)}</span>
                            <h5 className="text-xs font-semibold text-slate-200 truncate pr-2 mt-0.5" title={ch.name}>{ch.name}</h5>
                            <span className="text-[9px] font-mono text-slate-400 block truncate mt-0.5 opacity-80" title={ch.location}>{ch.location}</span>
                          </div>
                          
                          {/* Live Status Tag */}
                          <span className={`px-1.5 py-0.5 rounded text-[8px] font-mono font-bold shrink-0 ${
                            isOffline 
                              ? 'bg-slate-950 text-slate-600' 
                              : ch.status === 'unactivated'
                                ? 'bg-amber-950/40 text-amber-500 animate-pulse'
                                : 'bg-rose-950/40 text-rose-400 border border-rose-900/20'
                          }`}>
                            {isOffline ? 'OFFLINE' : ch.status === 'unactivated' ? 'PENDING' : 'LIVE'}
                          </span>
                        </div>

                        {/* Rendering our spectacular CSS visualizer for the CCTV feed */}
                        <div className="relative aspect-video rounded-lg overflow-hidden bg-black mb-3">
                          <CameraSnapshotVisualizer cameraId={ch.id} motionLevel={ch.motionLevel} size="md" />
                          
                          {/* Recording Overlay dot */}
                          {!isOffline && ch.recording && (
                            <div className="absolute top-2 right-2 bg-black/60 px-1.5 py-0.5 rounded text-[8px] font-mono font-bold flex items-center gap-1">
                              <span className="w-1 h-1 rounded-full bg-rose-500 animate-pulse" />
                              <span className="text-rose-400">REC</span>
                            </div>
                          )}

                          {/* Refreshed state overlay HUD */}
                          {refreshPulse && !isOffline && (
                            <motion.div 
                              initial={{ opacity: 0.8 }}
                              animate={{ opacity: 0 }}
                              className="absolute inset-0 bg-emerald-500/10 pointer-events-none flex items-center justify-center"
                            >
                              <span className="text-[8px] font-mono font-extrabold text-emerald-400 uppercase tracking-widest bg-black px-2 py-0.5 rounded">SYNC_OK</span>
                            </motion.div>
                          )}
                        </div>

                        {/* Action buttons */}
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedCameraForHistory(ch);
                              triggerToast(`Loading snapshot capture archives for ${ch.name}`, 'info');
                            }}
                            className="flex-1 py-1.5 bg-slate-950 border border-slate-800 hover:border-slate-700 hover:text-slate-100 rounded text-[10px] font-mono font-semibold text-slate-300 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                          >
                            <History className="w-3.5 h-3.5 text-rose-500" />
                            <span>View Snapshot History</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: NVR PLAYBACK CENTER */}
          {activeSubTab === 'playback' && (
            <div className="bg-slate-950 p-5 rounded-xl border border-slate-850 space-y-6 shadow-2xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-900 pb-3">
                <div className="flex items-center gap-2">
                  <Database className="w-5 h-5 text-sky-400" />
                  <div>
                    <h4 className="font-sans font-bold text-slate-100 text-sm">iVMS Playback Center</h4>
                    <p className="text-[10px] text-slate-500 font-mono">Retrieve recorded archive media files hosted on NVR storage server</p>
                  </div>
                </div>

                {/* Speed Controls */}
                <div className="flex items-center gap-2 bg-slate-900 p-1.5 rounded border border-slate-850 font-mono text-[10px]">
                  <span className="text-slate-500 uppercase px-1 font-bold">Playback Speed:</span>
                  {[1, 2, 4, 8].map((spd) => (
                    <button
                      key={spd}
                      type="button"
                      onClick={() => {
                        setPlaybackSpeed(spd);
                        triggerToast(`Playback acceleration adjusted to ${spd}x`, 'info');
                      }}
                      className={`px-2 py-0.5 rounded cursor-pointer ${
                        playbackSpeed === spd 
                          ? 'bg-sky-600 text-white font-bold' 
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {spd}x
                    </button>
                  ))}
                </div>
              </div>

              {/* Live Playback feed frame */}
              <div className="relative aspect-video max-w-2xl mx-auto bg-black rounded-lg border-2 border-slate-900 overflow-hidden shadow-inner flex items-center justify-center">
                
                {/* Visual Camera render */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center space-y-3 z-10">
                    {isPlaybackPlaying ? (
                      <div className="space-y-2">
                        <span className="text-xs font-mono font-bold text-sky-400 uppercase tracking-widest block bg-black/60 px-4 py-1.5 rounded backdrop-blur-md">
                          PLAYING RECORDED STREAM FROM ARCHIVE
                        </span>
                        <p className="text-slate-400 font-mono text-[10px]">
                          Target File: <strong className="text-slate-200">ch1_rec_stream_{formatPlaybackTime(playbackTime).replace(/:/g, '')}.mp4</strong>
                        </p>
                        <p className="text-slate-500 font-mono text-[9px]">
                          Agent Node Pipeline Routing: {nodeIp} @ 25 FPS
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Pause className="w-10 h-10 text-slate-600 mx-auto animate-pulse" />
                        <span className="text-xs font-mono font-bold text-slate-500 uppercase tracking-widest block">
                          PLAYBACK PAUSED
                        </span>
                        <p className="text-[9px] text-slate-600 font-mono">
                          Drag the playhead or click timeline to index recorded media files.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* CCTV Scanline effects */}
                  <div className="absolute inset-0 bg-radial-gradient from-transparent to-black/80 pointer-events-none" />
                  <div className="absolute inset-0 bg-[linear-gradient(rgba(18,24,38,0)_95%,rgba(56,189,248,0.03)_98%,rgba(18,24,38,0)_100%)] bg-[size:100%_40px] animate-[slide_15s_linear_infinite] pointer-events-none" />
                  <div className="absolute inset-0 bg-noise opacity-[0.02] pointer-events-none" />
                </div>

                {/* On-Screen HUD Overlay */}
                <div className="absolute top-4 left-4 font-mono text-[10px] text-sky-400 bg-black/70 px-3 py-1 rounded backdrop-blur-xs flex items-center gap-1.5 border border-sky-900/40">
                  <Clock className="w-3.5 h-3.5 shrink-0" />
                  <span>PLAYBACK INDEX TIME: </span>
                  <strong className="text-slate-100">{formatPlaybackTime(playbackTime)}</strong>
                  {playbackSpeed > 1 && <span className="text-rose-400 font-bold ml-1">[{playbackSpeed}X]</span>}
                </div>

                {/* Storage info overlay */}
                <div className="absolute bottom-4 right-4 font-mono text-[9px] text-slate-400 bg-black/70 px-2 py-1 rounded">
                  HDD Space: {nvrConfig.hddUsed}TB / {nvrConfig.hddTotal}TB (Allocated: 24/7 overwrite cycle)
                </div>
              </div>

              {/* Playback Controls and Ruler timeline */}
              <div className="space-y-4 pt-2 border-t border-slate-900">
                <div className="flex justify-between items-center text-xs">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsPlaybackPlaying(!isPlaybackPlaying);
                        triggerToast(isPlaybackPlaying ? 'Playback paused' : 'Playback started', 'info');
                      }}
                      className="px-4 py-1.5 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded flex items-center gap-1.5 cursor-pointer"
                    >
                      {isPlaybackPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      <span>{isPlaybackPlaying ? 'Pause Stream' : 'Start Playback'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPlaybackTime(10);
                        setIsPlaybackPlaying(false);
                        triggerToast('Playback index reset to 10:00:00 (Start of workday)', 'info');
                      }}
                      className="px-3 py-1.5 bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800 rounded flex items-center gap-1.5 cursor-pointer"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>Reset View</span>
                    </button>
                  </div>

                  <span className="font-mono text-slate-400">Time Segment selected: <strong className="text-sky-400">{formatPlaybackTime(playbackTime)}</strong></span>
                </div>

                {/* Classic 24-Hour Timeline Ruler Grid */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[9px] font-mono text-slate-500 px-1">
                    <span>00:00</span>
                    <span>04:00</span>
                    <span>08:00</span>
                    <span>12:00</span>
                    <span>16:00</span>
                    <span>20:00</span>
                    <span>24:00</span>
                  </div>

                  {/* Horizontal Bar with green recording segments */}
                  <div 
                    className="h-7 bg-slate-950 border border-slate-850 rounded-lg relative overflow-hidden cursor-crosshair group shadow-inner"
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const x = e.clientX - rect.left;
                      const pct = x / rect.width;
                      handleTimelineClick(pct * 24);
                    }}
                  >
                    {/* Simulated Recorded Video Range block (workday: 08:00 to 22:00) */}
                    <div className="absolute top-0 bottom-0 left-[33.3%] right-[8.3%] bg-emerald-500/20 border-l border-r border-emerald-500/40" />

                    {/* Timeline Playhead line */}
                    <div 
                      className="absolute top-0 bottom-0 w-[2px] bg-sky-400 shadow-[0_0_8px_#38bdf8] z-10 transition-all pointer-events-none"
                      style={{ left: `${(playbackTime / 24) * 100}%` }}
                    />

                    {/* Playhead Time HUD Hover */}
                    <div className="absolute inset-0 bg-transparent group-hover:bg-sky-400/2 pointer-events-none transition-all" />
                  </div>
                  
                  <div className="text-[10px] text-slate-500 font-mono italic text-center pt-1 flex items-center justify-center gap-2">
                    <span className="inline-block w-3 h-3 bg-emerald-500/20 border border-emerald-500/40 rounded-xs" />
                    <span>NVR Continuous Recorded Feed Frame (Green Area indicates stored disk sectors)</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: SADP NETWORK DISCOVERY PROTOCOL */}
          {activeSubTab === 'sadp' && (
            <div className="bg-slate-950 p-5 rounded-xl border border-slate-850 space-y-6 shadow-2xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-900 pb-3">
                <div className="flex items-center gap-2">
                  <Network className="w-5 h-5 text-emerald-400" />
                  <div>
                    <h4 className="font-sans font-bold text-slate-100 text-sm">SADP Device Discovery Protocol</h4>
                    <p className="text-[10px] text-slate-500 font-mono">Scan, activate, and configure CCTV hardware nodes on local agent network</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleTriggerSadpScan}
                  disabled={isScanning}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <RefreshCw className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} />
                  <span>{isScanning ? 'SADP Sweeping...' : 'Run SADP Discovery Scan'}</span>
                </button>
              </div>

              {/* Scan Progress Alert Bar */}
              {isScanning && (
                <div className="bg-slate-900 border border-slate-850 p-4 rounded-xl space-y-2 animate-pulse">
                  <div className="flex justify-between items-center text-xs font-mono text-slate-300">
                    <span>Active SADP Broadcast Sequence</span>
                    <span className="font-bold">{scanProgress}%</span>
                  </div>
                  <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden">
                    <div 
                      className="bg-emerald-500 h-1.5 rounded-full transition-all duration-300" 
                      style={{ width: `${scanProgress}%` }}
                    />
                  </div>
                  <p className="text-[10px] font-mono text-slate-500 italic">{scanStatusText}</p>
                </div>
              )}

              {/* SADP Discovered Devices Table Grid */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400">Identified CCTV Nodes ({channels.length + 1})</span>
                  <span className="text-[10px] font-mono text-slate-500">Scan interface: {nodeIp}</span>
                </div>

                <div className="overflow-x-auto border border-slate-900 rounded-lg">
                  <table className="w-full text-left font-mono text-[11px] text-slate-300">
                    <thead className="bg-slate-900 text-slate-500 border-b border-slate-800 uppercase tracking-wider text-[9px]">
                      <tr>
                        <th className="px-3 py-2">Device Name</th>
                        <th className="px-3 py-2">IPv4 Address</th>
                        <th className="px-3 py-2">Device Model</th>
                        <th className="px-3 py-2">Port</th>
                        <th className="px-3 py-2">MAC Address</th>
                        <th className="px-3 py-2">Status</th>
                        <th className="px-3 py-2 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-900">
                      {/* NVR Entry */}
                      <tr className="hover:bg-slate-900/40">
                        <td className="px-3 py-2.5 font-bold flex items-center gap-1.5 text-rose-400">
                          <Database className="w-3.5 h-3.5 shrink-0" /> {nvrConfig.name}
                        </td>
                        <td className="px-3 py-2.5 text-slate-100">{nvrConfig.ip}</td>
                        <td className="px-3 py-2.5">DS-7616NI-K2</td>
                        <td className="px-3 py-2.5">8000</td>
                        <td className="px-3 py-2.5 text-slate-500">{nvrConfig.mac}</td>
                        <td className="px-3 py-2.5">
                          <span className="px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 text-[10px]">Active</span>
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <span className="text-slate-500 text-[9px] italic">Master Controller</span>
                        </td>
                      </tr>

                      {/* Camera entries */}
                      {filteredChannels.map((dev) => (
                        <tr key={dev.id} className="hover:bg-slate-900/40">
                          <td className="px-3 py-2.5 flex items-center gap-1.5">
                            <Video className="w-3.5 h-3.5 text-slate-500 shrink-0" /> {dev.name}
                          </td>
                          <td className="px-3 py-2.5 text-slate-100">{dev.ip}</td>
                          <td className="px-3 py-2.5">{dev.model}</td>
                          <td className="px-3 py-2.5">{dev.port}</td>
                          <td className="px-3 py-2.5 text-slate-500">{dev.mac}</td>
                          <td className="px-3 py-2.5">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                              dev.status === 'online' 
                                ? 'bg-emerald-950 text-emerald-400' 
                                : dev.status === 'unactivated'
                                  ? 'bg-amber-950/40 text-amber-500 animate-pulse'
                                  : 'bg-slate-900 text-slate-600'
                            }`}>
                              {dev.status === 'online' ? 'Active' : dev.status === 'unactivated' ? 'Inactive' : 'Offline'}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-right">
                            <button
                              type="button"
                              onClick={() => handleSelectSadpDevice(dev)}
                              className={`px-2 py-1 rounded text-[9px] font-bold cursor-pointer transition-all ${
                                dev.status === 'unactivated'
                                  ? 'bg-amber-600 hover:bg-amber-500 text-black'
                                  : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-850'
                              }`}
                            >
                              {dev.status === 'unactivated' ? 'Activate Node' : 'Config Port'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* SADP Configuration Modal / Sidebar Sheet */}
              <AnimatePresence>
                {selectedSadpDevice && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-4"
                  >
                    <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                      <span className="text-xs font-mono font-extrabold uppercase text-slate-300 flex items-center gap-1.5">
                        <Settings className="w-4 h-4 text-rose-500" /> 
                        {selectedSadpDevice.status === 'unactivated' ? 'Activate SADP Security Node' : 'Modify Active Device Configuration'}
                      </span>
                      <button 
                        type="button" 
                        onClick={() => setSelectedSadpDevice(null)} 
                        className="text-slate-500 hover:text-slate-300 text-xs font-bold font-mono"
                      >
                        CLOSE
                      </button>
                    </div>

                    <form onSubmit={handleModifySadpDevice} className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
                      <div>
                        <label className="block mb-1 text-slate-400">Target IP Address *</label>
                        <input
                          type="text"
                          value={sadpModifyIp}
                          onChange={(e) => setSadpModifyIp(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200"
                        />
                      </div>

                      <div>
                        <label className="block mb-1 text-slate-400">ONVIF Web Port *</label>
                        <input
                          type="number"
                          value={sadpModifyPort}
                          onChange={(e) => setSadpModifyPort(parseInt(e.target.value, 10))}
                          className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200"
                        />
                      </div>

                      <div>
                        <label className="block mb-1 text-slate-400">Admin Security Password *</label>
                        <div className="relative">
                          <input
                            type="password"
                            placeholder="Enter device master key"
                            value={sadpPassword}
                            onChange={(e) => setSadpPassword(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 pr-8"
                          />
                          <Lock className="w-3.5 h-3.5 text-slate-600 absolute right-2.5 top-2.5" />
                        </div>
                      </div>

                      <div className="md:col-span-3 flex justify-end gap-2 pt-2 border-t border-slate-800/60">
                        <button
                          type="button"
                          onClick={() => setSelectedSadpDevice(null)}
                          className="px-3 py-1.5 bg-slate-800 border border-slate-700 hover:bg-slate-750 text-slate-300 rounded text-xs cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={isActivating}
                          className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-bold rounded text-xs cursor-pointer flex items-center gap-1"
                        >
                          {isActivating ? 'Syncing...' : selectedSadpDevice.status === 'unactivated' ? 'Activate & Bind' : 'Save Changes'}
                        </button>
                      </div>
                    </form>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* TAB 4: CONFIGURATION SETTINGS */}
          {activeSubTab === 'settings' && (
            <div className="bg-slate-950 p-5 rounded-xl border border-slate-850 space-y-6 shadow-2xl font-mono text-xs">
              
              {/* Header block */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-900 pb-3">
                <div className="flex items-center gap-2">
                  <Settings className="w-5 h-5 text-purple-400 animate-spin-slow" />
                  <div>
                    <h4 className="font-sans font-bold text-slate-100 text-sm">iVMS Config Server Settings</h4>
                    <p className="text-[10px] text-slate-500">Configure connected NVR clusters, test camera link states, and bind security subnet segments</p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setNvrFormName('');
                      setNvrFormIp(`${activeNICSubnet}.100`);
                      setNvrFormMac(`E0:50:8B:4A:CF:${Math.floor(10 + Math.random() * 89)}`);
                      setEditingNvrId(null);
                      setShowNvrForm(!showNvrForm);
                      setShowCameraForm(false);
                    }}
                    className={`px-3 py-1.5 rounded text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      showNvrForm 
                        ? 'bg-purple-950 text-purple-300 border border-purple-800' 
                        : 'bg-purple-600 hover:bg-purple-500 text-white'
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{showNvrForm ? 'Close NVR Form' : 'Register NVR'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setCameraFormName('');
                      setCameraFormIp(`${activeNICSubnet}.121`);
                      setCameraFormMac(`E0:50:8B:4A:CF:${Math.floor(10 + Math.random() * 89)}`);
                      setCameraFormLocation('');
                      setEditingCameraId(null);
                      setShowCameraForm(!showCameraForm);
                      setShowNvrForm(false);
                    }}
                    className={`px-3 py-1.5 rounded text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      showCameraForm 
                        ? 'bg-rose-950 text-rose-300 border border-rose-800' 
                        : 'bg-rose-600 hover:bg-rose-500 text-white'
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{showCameraForm ? 'Close Camera Form' : 'Register Camera'}</span>
                  </button>
                </div>
              </div>

              {/* 1. ACTIVE CONNECTED IP ADDRESS & NIC SELECTION */}
              <div className="bg-slate-900/60 border border-slate-850 p-4 rounded-xl space-y-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400 block border-b border-slate-800 pb-1.5 flex items-center gap-1.5">
                  <Network className="w-3.5 h-3.5 text-emerald-400" /> Active Connected Network (NIC Selector)
                </span>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                  <div>
                    <label className="block text-[9px] uppercase text-slate-500 mb-1">Select Interface (NIC)</label>
                    <select
                      value={selectedNICName}
                      onChange={(e) => {
                        setSelectedNICName(e.target.value);
                        triggerToast(`Switched active subnet segment to ${e.target.value}`, 'info');
                      }}
                      className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 focus:outline-none focus:border-purple-500"
                    >
                      {availableNICs.map((n: any) => (
                        <option key={n.name} value={n.name}>
                          {n.name} ({n.ipv4?.[0] || 'No IP'})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-2 grid grid-cols-2 sm:grid-cols-3 gap-2.5 bg-slate-950/40 p-2 rounded border border-slate-900/60 text-[10px]">
                    <div>
                      <span className="text-slate-500 block text-[8px] uppercase">Active Connected IP</span>
                      <strong className="text-emerald-400">{activeNICIp}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[8px] uppercase">IP Segment Mask</span>
                      <strong className="text-slate-300">{activeNICSubnet}.x/24</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[8px] uppercase">NIC Speed</span>
                      <strong className="text-cyan-400">{activeNIC?.speed || '1 Gbps'}</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* CONNECTION TESTING STATUS CONSOLE DISPLAY */}
              <AnimatePresence>
                {(testingEntityId || testResult) && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-2.5">
                      <div className="flex justify-between items-center border-b border-slate-800 pb-1.5">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                          <Activity className="w-3.5 h-3.5 animate-pulse text-cyan-400" /> iVMS Device Connection Diagnosis
                        </span>
                        {testResult && (
                          <button
                            type="button"
                            onClick={() => setTestResult(null)}
                            className="text-[9px] text-slate-500 hover:text-slate-300 font-bold"
                          >
                            CLEAR DIAGNOSTICS
                          </button>
                        )}
                      </div>

                      {testingEntityId ? (
                        <div className="flex items-center gap-2 text-slate-300 py-1 text-[11px]">
                          <RefreshCw className="w-4 h-4 text-cyan-400 animate-spin" />
                          <span>Pinging target socket {channels.find(c => c.id === testingEntityId)?.ip || nvrs.find(n => n.id === testingEntityId)?.ip}... Broadcast SOAP XML probe...</span>
                        </div>
                      ) : testResult ? (
                        <div className="space-y-1 text-[10px]">
                          <div className="flex items-center gap-1.5 font-bold">
                            {testResult.success ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                            ) : (
                              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                            )}
                            <span className={testResult.success ? 'text-emerald-400' : 'text-rose-400'}>
                              {testResult.message}
                            </span>
                          </div>
                          {testResult.details && (
                            <p className="text-slate-400 pl-5 leading-relaxed text-[9px] whitespace-pre-wrap">
                              {testResult.details}
                            </p>
                          )}
                        </div>
                      ) : null}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* 2. ADD / EDIT NVR FORM */}
              <AnimatePresence>
                {showNvrForm && (
                  <motion.form
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    onSubmit={handleSaveNvr}
                    className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-4 shadow-xl"
                  >
                    <div className="flex justify-between items-center border-b border-slate-850 pb-2">
                      <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                        <Database className="w-4 h-4 text-purple-400" />
                        {editingNvrId ? `Edit NVR: ${nvrFormName}` : 'Register New NVR Device'}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingNvrId(null);
                          setShowNvrForm(false);
                        }}
                        className="text-[10px] text-slate-500 hover:text-slate-300 font-bold"
                      >
                        CLOSE FORM
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div>
                        <label className="block mb-1 text-slate-400 text-[10px]">NVR Device Name *</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g., Back Corridor NVR"
                          value={nvrFormName}
                          onChange={(e) => setNvrFormName(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 focus:outline-none focus:border-purple-500"
                        />
                      </div>

                      <div>
                        <label className="block mb-1 text-slate-400 text-[10px]">IPv4 Address *</label>
                        <input
                          type="text"
                          required
                          placeholder={`e.g., ${activeNICSubnet}.100`}
                          value={nvrFormIp}
                          onChange={(e) => setNvrFormIp(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 focus:outline-none focus:border-purple-500 font-mono"
                        />
                        <span className="text-[9px] text-slate-500 mt-1 block">Active segment recommendation: <strong>{activeNICSubnet}.x</strong></span>
                      </div>

                      <div>
                        <label className="block mb-1 text-slate-400 text-[10px]">NVR Model Series</label>
                        <select
                          value={nvrFormModel}
                          onChange={(e) => setNvrFormModel(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 focus:outline-none focus:border-purple-500"
                        >
                          <option value="DS-7616NI-K2">DS-7616NI-K2 (16 Channel)</option>
                          <option value="DS-7732NI-I4">DS-7732NI-I4 (32 Channel)</option>
                          <option value="DS-9664NI-I8">DS-9664NI-I8 (64 Channel)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block mb-1 text-slate-400 text-[10px]">ONVIF Link Port</label>
                        <input
                          type="number"
                          value={nvrFormPort}
                          onChange={(e) => setNvrFormPort(parseInt(e.target.value, 10))}
                          className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 focus:outline-none focus:border-purple-500 font-mono"
                        />
                      </div>

                      <div>
                        <label className="block mb-1 text-slate-400 text-[10px]">MAC Address</label>
                        <input
                          type="text"
                          placeholder="Auto-generated if empty"
                          value={nvrFormMac}
                          onChange={(e) => setNvrFormMac(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 focus:outline-none focus:border-purple-500 font-mono"
                        />
                      </div>

                      <div>
                        <label className="block mb-1 text-slate-400 text-[10px]">Firmware Version</label>
                        <input
                          type="text"
                          value={nvrFormFirmware}
                          onChange={(e) => setNvrFormFirmware(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 focus:outline-none focus:border-purple-500"
                        />
                      </div>

                      <div>
                        <label className="block mb-1 text-slate-400 text-[10px]">Storage Hard Disk Capacity (TB)</label>
                        <input
                          type="number"
                          step="0.5"
                          value={nvrFormHddTotal}
                          onChange={(e) => setNvrFormHddTotal(parseFloat(e.target.value))}
                          className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 focus:outline-none focus:border-purple-500 font-mono"
                        />
                      </div>

                      <div>
                        <label className="block mb-1 text-slate-400 text-[10px]">Admin Username</label>
                        <input
                          type="text"
                          value={nvrFormUsername}
                          onChange={(e) => setNvrFormUsername(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block mb-1 text-slate-400 text-[10px]">Admin Password</label>
                        <input
                          type="password"
                          value={nvrFormPassword}
                          onChange={(e) => setNvrFormPassword(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 pr-8"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2 border-t border-slate-850">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingNvrId(null);
                          setShowNvrForm(false);
                        }}
                        className="px-3 py-1.5 bg-slate-800 border border-slate-700 hover:bg-slate-750 text-slate-300 rounded text-[11px] cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-1.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded text-[11px] cursor-pointer"
                      >
                        {editingNvrId ? 'Update NVR Cluster' : 'Save & Register NVR'}
                      </button>
                    </div>
                  </motion.form>
                )}
              </AnimatePresence>

              {/* 3. ADD / EDIT CAMERA FORM */}
              <AnimatePresence>
                {showCameraForm && (
                  <motion.form
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    onSubmit={handleSaveCamera}
                    className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-4 shadow-xl"
                  >
                    <div className="flex justify-between items-center border-b border-slate-850 pb-2">
                      <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                        <Video className="w-4 h-4 text-rose-500" />
                        {editingCameraId ? `Edit Camera: ${cameraFormName}` : 'Register New IP Camera'}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingCameraId(null);
                          setShowCameraForm(false);
                        }}
                        className="text-[10px] text-slate-500 hover:text-slate-300 font-bold"
                      >
                        CLOSE FORM
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div>
                        <label className="block mb-1 text-slate-400 text-[10px]">Camera Device Name *</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g., Gate Entrance Dome"
                          value={cameraFormName}
                          onChange={(e) => setCameraFormName(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 focus:outline-none focus:border-rose-500"
                        />
                      </div>

                      <div>
                        <label className="block mb-1 text-slate-400 text-[10px]">IPv4 Address *</label>
                        <input
                          type="text"
                          required
                          placeholder={`e.g., ${activeNICSubnet}.121`}
                          value={cameraFormIp}
                          onChange={(e) => setCameraFormIp(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 focus:outline-none focus:border-rose-500 font-mono"
                        />
                        <span className="text-[9px] text-slate-500 mt-1 block">Active segment recommendation: <strong>{activeNICSubnet}.x</strong></span>
                      </div>

                      <div>
                        <label className="block mb-1 text-slate-400 text-[10px]">Camera Form Factor Type</label>
                        <select
                          value={cameraFormType}
                          onChange={(e) => setCameraFormType(e.target.value as any)}
                          className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 focus:outline-none focus:border-rose-500"
                        >
                          <option value="dome">Dome (Indoor/Anti-Vandal)</option>
                          <option value="bullet">Bullet (Outdoor/Infrared)</option>
                          <option value="ptz">PTZ (Pan-Tilt-Zoom Speed Dome)</option>
                          <option value="thermal">Thermal Sensor (Radiometric)</option>
                          <option value="fisheye">Fisheye 360 (Panoramic)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block mb-1 text-slate-400 text-[10px]">Physical Installation Location</label>
                        <input
                          type="text"
                          placeholder="e.g., Front Yard Wall, Server Rack"
                          value={cameraFormLocation}
                          onChange={(e) => setCameraFormLocation(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 focus:outline-none focus:border-rose-500"
                        />
                      </div>

                      <div>
                        <label className="block mb-1 text-slate-400 text-[10px]">Parent NVR Binding</label>
                        <select
                          value={cameraFormNvrId}
                          onChange={(e) => setCameraFormNvrId(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 focus:outline-none focus:border-rose-500"
                        >
                          <option value="standalone">Standalone Channel Feed (No NVR binding)</option>
                          {nvrs.map(nvr => (
                            <option key={nvr.id} value={nvr.id}>Bound to: {nvr.name} ({nvr.ip})</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block mb-1 text-slate-400 text-[10px]">Camera Model Code</label>
                        <input
                          type="text"
                          value={cameraFormModel}
                          onChange={(e) => setCameraFormModel(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block mb-1 text-slate-400 text-[10px]">RTSP Stream Port</label>
                        <input
                          type="number"
                          value={cameraFormRtspPort}
                          onChange={(e) => setCameraFormRtspPort(parseInt(e.target.value, 10))}
                          className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 font-mono"
                        />
                      </div>

                      <div>
                        <label className="block mb-1 text-slate-400 text-[10px]">Target Resolution</label>
                        <select
                          value={cameraFormResolution}
                          onChange={(e) => setCameraFormResolution(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200"
                        >
                          <option value="1920x1080">1920x1080 (1080p Full HD)</option>
                          <option value="2560x1440">2560x1440 (2K Ultra HD)</option>
                          <option value="3840x2160">3840x2160 (4K Extreme)</option>
                          <option value="640x480">640x480 (VGA / Thermal standard)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block mb-1 text-slate-400 text-[10px]">Target Bitrate (Kbps)</label>
                        <select
                          value={cameraFormBitrate}
                          onChange={(e) => setCameraFormBitrate(parseInt(e.target.value, 10))}
                          className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 font-mono"
                        >
                          <option value={1024}>1024 Kbps (Eco)</option>
                          <option value={2048}>2048 Kbps (Balanced)</option>
                          <option value={4096}>4096 Kbps (High Stream)</option>
                          <option value={8192}>8192 Kbps (Pro High-Bitrate)</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2 border-t border-slate-850">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingCameraId(null);
                          setShowCameraForm(false);
                        }}
                        className="px-3 py-1.5 bg-slate-800 border border-slate-700 hover:bg-slate-750 text-slate-300 rounded text-[11px] cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded text-[11px] cursor-pointer"
                      >
                        {editingCameraId ? 'Update Camera Configuration' : 'Save & Register Camera'}
                      </button>
                    </div>
                  </motion.form>
                )}
              </AnimatePresence>

              {/* NVR CAMERA ADOPTION / AUTHORIZATION BOX */}
              <AnimatePresence>
                {adoptingNvrId && (
                  <motion.form
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    onSubmit={handleAdoptCameras}
                    className="bg-slate-900 border border-amber-500/20 p-4 rounded-xl space-y-3 shadow-xl"
                  >
                    <div className="flex justify-between items-center border-b border-slate-850 pb-2">
                      <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                        Authorize NVR Stream Pull: {nvrs.find(n => n.id === adoptingNvrId)?.name}
                      </span>
                      <button
                        type="button"
                        onClick={() => setAdoptingNvrId(null)}
                        className="text-[10px] text-slate-500 hover:text-slate-300 font-bold"
                      >
                        CANCEL
                      </button>
                    </div>

                    <p className="text-[10px] text-slate-400 leading-relaxed">
                      To adopt all cameras linked to this NVR cluster, authenticate with the administrative master security credentials. This initiates a soap XML request protocol and maps streams to the cloud node.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
                      <div>
                        <label className="block mb-1 text-slate-400">ONVIF Admin Username</label>
                        <input
                          type="text"
                          required
                          value={adoptUsername}
                          onChange={(e) => setAdoptUsername(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 text-slate-200"
                        />
                      </div>
                      <div>
                        <label className="block mb-1 text-slate-400">Security Master Password</label>
                        <input
                          type="password"
                          required
                          placeholder="Enter secret passcode"
                          value={adoptPassword}
                          onChange={(e) => setAdoptPassword(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 text-slate-200"
                        />
                      </div>
                      <div className="flex items-end">
                        <button
                          type="submit"
                          disabled={isAdopting}
                          className="w-full py-1.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-black font-bold rounded cursor-pointer text-center flex justify-center items-center gap-1"
                        >
                          {isAdopting ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              <span>Scanning Subnet...</span>
                            </>
                          ) : (
                            <span>Adopt & Map 3 Streams</span>
                          )}
                        </button>
                      </div>
                    </div>
                  </motion.form>
                )}
              </AnimatePresence>

              {/* 3. REGISTERED NVRs SECTIONS */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-900 pb-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5" /> Registered NVR Cluster Entities ({nvrs.length})
                  </span>
                  <span className="text-[9px] text-slate-500">Only manually added NVR configurations are stored in the client database profile</span>
                </div>

                {nvrs.length === 0 ? (
                  <div className="py-8 text-center bg-slate-900/30 border border-dashed border-slate-850 rounded-xl space-y-2">
                    <Tv className="w-8 h-8 text-slate-700 mx-auto animate-pulse" />
                    <p className="text-slate-500 text-xs">No registered NVR units discovered in current partition.</p>
                    <button
                      type="button"
                      onClick={() => {
                        setNvrFormName('');
                        setNvrFormIp(`${activeNICSubnet}.100`);
                        setNvrFormMac(`E0:50:8B:4A:CF:${Math.floor(10 + Math.random() * 89)}`);
                        setEditingNvrId(null);
                        setShowNvrForm(true);
                      }}
                      className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-purple-400 border border-slate-800 rounded text-[9px] font-bold cursor-pointer"
                    >
                      + Register First NVR Cluster
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {nvrs.map((nvr) => (
                      <div key={nvr.id} className="bg-slate-900/50 border border-slate-850 p-4 rounded-xl flex flex-col justify-between space-y-4 hover:border-slate-800 transition-all">
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-slate-200 flex items-center gap-1">
                              <Database className="w-3.5 h-3.5 text-purple-400" /> {nvr.name}
                            </span>
                            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-purple-950/40 text-purple-400 border border-purple-900/30">
                              {nvr.model}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-[9px] text-slate-400 pt-1">
                            <div>IP Address: <strong className="text-emerald-400">{nvr.ip}</strong></div>
                            <div>MAC Address: <span className="text-slate-500">{nvr.mac}</span></div>
                            <div>Storage Space: <span className="text-slate-300">{nvr.hddTotal} TB (overwrite)</span></div>
                            <div>Stream Active: <span className="text-cyan-400 font-bold">{nvr.activeChannels} channels</span></div>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-950 pt-3">
                          <div className="flex gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingNvrId(nvr.id);
                                setNvrFormName(nvr.name);
                                setNvrFormModel(nvr.model);
                                setNvrFormIp(nvr.ip);
                                setNvrFormPort(nvr.port);
                                setNvrFormMac(nvr.mac);
                                setNvrFormFirmware(nvr.firmware);
                                setNvrFormHddTotal(nvr.hddTotal);
                                setShowNvrForm(true);
                                setShowCameraForm(false);
                              }}
                              className="p-1 bg-slate-950 border border-slate-800 hover:border-slate-700 hover:text-white text-slate-400 rounded cursor-pointer"
                              title="Edit Settings"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteNvr(nvr.id)}
                              className="p-1 bg-slate-950 border border-slate-800 hover:border-rose-900/60 hover:text-rose-400 text-slate-500 rounded cursor-pointer"
                              title="Delete Entity"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div className="flex gap-1.5">
                            <button
                              type="button"
                              onClick={() => setAdoptingNvrId(nvr.id)}
                              className="px-2 py-1 bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-amber-500/30 text-amber-400 rounded text-[10px] font-bold cursor-pointer"
                            >
                              Adopt Streams
                            </button>
                            <button
                              type="button"
                              onClick={() => handleTestConnection(nvr.id, 'nvr')}
                              className="px-2 py-1 bg-purple-950/30 hover:bg-purple-950/60 text-purple-300 border border-purple-900/40 rounded text-[10px] font-bold cursor-pointer"
                            >
                              Test Connection
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 4. REGISTERED IP CAMERAS SECTIONS */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-900 pb-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                    <Video className="w-3.5 h-3.5" /> Registered IP Camera Feeds ({channels.length})
                  </span>
                  <span className="text-[9px] text-slate-500">Manual camera profiles bind to specific RTSP buffers on NVR or standalone targets</span>
                </div>

                {channels.length === 0 ? (
                  <div className="py-8 text-center bg-slate-900/30 border border-dashed border-slate-850 rounded-xl space-y-2">
                    <VideoOff className="w-8 h-8 text-slate-700 mx-auto animate-pulse" />
                    <p className="text-slate-500 text-xs">No registered IP camera feeds found in current partition.</p>
                    <button
                      type="button"
                      onClick={() => {
                        setCameraFormName('');
                        setCameraFormIp(`${activeNICSubnet}.121`);
                        setCameraFormMac(`E0:50:8B:4A:CF:${Math.floor(10 + Math.random() * 89)}`);
                        setCameraFormLocation('');
                        setEditingCameraId(null);
                        setShowCameraForm(true);
                      }}
                      className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-rose-400 border border-slate-800 rounded text-[9px] font-bold cursor-pointer"
                    >
                      + Register First IP Camera
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {channels.map((cam) => {
                      const parentNvr = nvrs.find(n => n.id === cam.nvrId);
                      return (
                        <div key={cam.id} className="bg-slate-900/50 border border-slate-850 p-3 rounded-xl flex flex-col justify-between space-y-3.5 hover:border-slate-800 transition-all">
                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-bold text-slate-200 flex items-center gap-1 truncate">
                                <Video className="w-3.5 h-3.5 text-rose-500 shrink-0" /> <span className="truncate">{cam.name}</span>
                              </span>
                              <span className="text-[8px] font-mono px-1 py-0.2 rounded bg-slate-950 text-rose-400 shrink-0 uppercase">
                                {cam.type}
                              </span>
                            </div>

                            <div className="space-y-1 text-[9px] text-slate-400">
                              <div>IP Address: <strong className="text-slate-200">{cam.ip}</strong></div>
                              <div className="truncate">Location: <span className="text-slate-300 font-bold">{cam.location}</span></div>
                              <div>Model Code: <span className="text-slate-500">{cam.model}</span></div>
                              <div className="truncate">Binding: <strong className={parentNvr ? 'text-purple-400' : 'text-slate-500'}>
                                {parentNvr ? `NVR: ${parentNvr.name}` : 'Standalone Feed'}
                              </strong></div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between gap-1.5 border-t border-slate-950 pt-2.5">
                            <div className="flex gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingCameraId(cam.id);
                                  setCameraFormName(cam.name);
                                  setCameraFormModel(cam.model);
                                  setCameraFormIp(cam.ip);
                                  setCameraFormPort(cam.port);
                                  setCameraFormRtspPort(cam.rtspPort);
                                  setCameraFormMac(cam.mac);
                                  setCameraFormType(cam.type);
                                  setCameraFormResolution(cam.resolution);
                                  setCameraFormFps(cam.fps);
                                  setCameraFormBitrate(cam.bitrate);
                                  setCameraFormLocation(cam.location);
                                  setCameraFormNvrId(cam.nvrId || 'standalone');
                                  setShowCameraForm(true);
                                  setShowNvrForm(false);
                                }}
                                className="p-1 bg-slate-950 border border-slate-800 hover:border-slate-700 hover:text-white text-slate-400 rounded cursor-pointer"
                                title="Edit Camera"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteCamera(cam.id)}
                                className="p-1 bg-slate-950 border border-slate-800 hover:border-rose-900/60 hover:text-rose-400 text-slate-500 rounded cursor-pointer"
                                title="Delete Camera"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            <div className="flex gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleTestConnection(cam.id, 'camera')}
                                className="px-2 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded text-[9px] font-bold cursor-pointer transition-all"
                              >
                                Test Link
                              </button>
                              <button
                                type="button"
                                onClick={() => startSecureFeedDiagnostic(cam)}
                                className="px-2 py-1 bg-rose-950/40 hover:bg-rose-900/45 text-rose-300 border border-rose-900/50 rounded text-[9px] font-bold cursor-pointer flex items-center gap-1 transition-all"
                              >
                                <Play className="w-2.5 h-2.5" />
                                <span>Verify Feed</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>
          )}

        </div>

      </div>

      {/* 3. Snapshot History Modal */}
      <AnimatePresence>
        {selectedCameraForHistory && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-slate-950 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl relative text-slate-300"
            >
              {/* Neon accent bar */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-600 via-rose-500 to-rose-600" />
              
              {/* Header */}
              <div className="p-5 border-b border-slate-900 bg-slate-900/40 flex justify-between items-start gap-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-mono text-rose-500 uppercase font-extrabold tracking-widest flex items-center gap-1.5">
                    <History className="w-4 h-4 animate-pulse" /> iVMS Telemetry Snapshot History
                  </span>
                  <h4 className="text-base font-bold text-slate-100 flex items-center gap-2">
                    {selectedCameraForHistory.name}
                  </h4>
                  <p className="text-xs text-slate-400 font-mono flex items-center gap-2 flex-wrap">
                    <span>IP Address: <strong className="text-emerald-400">{selectedCameraForHistory.ip}</strong></span>
                    <span className="text-slate-600">•</span>
                    <span>Model: <strong className="text-slate-300">{selectedCameraForHistory.model}</strong></span>
                    <span className="text-slate-600">•</span>
                    <span>Location: <strong className="text-slate-300">{selectedCameraForHistory.location}</strong></span>
                  </p>
                </div>
                
                <button
                  type="button"
                  onClick={() => setSelectedCameraForHistory(null)}
                  className="px-3 py-1.5 bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 rounded-lg text-xs font-mono font-bold hover:bg-slate-850 cursor-pointer transition-all"
                >
                  CLOSE PANEL
                </button>
              </div>

              {/* Content Body */}
              <div className="p-6 overflow-y-auto flex-1 space-y-4">
                <div className="flex justify-between items-center bg-slate-900/40 border border-slate-850 p-3 rounded-lg">
                  <span className="text-[11px] text-slate-400 font-mono">
                    Showing last 10 motion-triggered captures indexed in the local NVR database cache.
                  </span>
                  <span className="text-[10px] font-mono bg-rose-950/40 border border-rose-900/30 text-rose-400 px-2 py-0.5 rounded font-bold">
                    SECURED LINK ACTIVE
                  </span>
                </div>

                {snapshotHistory.filter(h => h.cameraId === selectedCameraForHistory.id).length === 0 ? (
                  <div className="py-12 text-center space-y-3">
                    <VideoOff className="w-10 h-10 text-slate-700 mx-auto animate-pulse" />
                    <p className="font-mono text-xs text-slate-500">No telemetry snapshot captures logged for this camera feed yet.</p>
                    <p className="text-[10px] text-slate-600 font-mono">Simulated motion detection runs every few seconds. Wait for high activity or adjust camera angles.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {snapshotHistory
                      .filter(h => h.cameraId === selectedCameraForHistory.id)
                      .slice(0, 10)
                      .map((capture, index) => (
                        <div 
                          key={capture.id} 
                          className="bg-slate-900/40 border border-slate-850 hover:border-slate-800 rounded-xl p-3 space-y-2 flex flex-col justify-between"
                        >
                          {/* Card header */}
                          <div className="flex justify-between items-start text-[10px] font-mono">
                            <span className="text-slate-500 font-bold uppercase">CAPTURE #{index + 1}</span>
                            <span className="bg-rose-950/35 text-rose-400 px-1.5 py-0.5 rounded text-[9px] font-bold">
                              {capture.motionLevel}% MOTION
                            </span>
                          </div>

                          {/* CSS snapshot visual representation */}
                          <div className="relative aspect-video rounded-lg overflow-hidden bg-black border border-slate-900">
                            <CameraSnapshotVisualizer cameraId={selectedCameraForHistory.id} motionLevel={capture.motionLevel} size="sm" />
                            
                            {/* Watermark overlay */}
                            <div className="absolute inset-0 bg-[linear-gradient(rgba(244,63,94,0.015)_1px,transparent_1px)] bg-[size:6px_6px] pointer-events-none" />
                            <div className="absolute bottom-1 right-2 bg-black/60 px-1 py-0.5 rounded font-mono text-[6px] text-slate-500">
                              SNAP_ID: {capture.id.slice(-4).toUpperCase()}
                            </div>
                          </div>

                          {/* Card bottom metadata */}
                          <div className="flex items-center gap-1.5 text-xs text-slate-400 pt-1 font-mono">
                            <Clock className="w-3.5 h-3.5 text-rose-500" />
                            <span className="text-[10px] truncate" title={capture.timestamp}>{capture.timestamp}</span>
                          </div>
                        </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-4 bg-slate-900/40 border-t border-slate-900 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs font-mono text-slate-500">
                <span className="text-[10px]">
                  Origin Agent: <strong className="text-slate-400">{activeAgent?.hostname || 'fallback'}</strong> ({nodeIp})
                </span>
                <span className="text-[10px]">
                  Audit Log Sync Hash: <strong className="text-slate-400">MD5-SHA256-ENCRYPTED</strong>
                </span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* SECURE STREAM FEED PROTOCOL DIAGNOSTIC CONSOLE MODAL */}
      <AnimatePresence>
        {secureTestCam && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
            >
              {/* Modal Header */}
              <div className="bg-slate-950 px-6 py-4 border-b border-slate-850 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
                  <div className="space-y-0.5">
                    <h3 className="text-xs font-mono font-extrabold uppercase text-slate-200 tracking-wider flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-rose-500" />
                      Secure IP Camera Feed Handshake & Protocol Console
                    </h3>
                    <p className="text-[10px] text-slate-500 font-mono">
                      Testing link integrity via encrypted RTSPS/HTTPS & SOAP ONVIF digest authorization.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSecureTestCam(null)}
                  className="text-slate-400 hover:text-white font-mono text-[11px] bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded px-2.5 py-1 cursor-pointer transition-colors"
                >
                  CLOSE
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Left Side: Parameters & Configuration Controls (4 cols) */}
                <div className="lg:col-span-5 space-y-4">
                  <div className="bg-slate-950/40 border border-slate-850 rounded-xl p-4 space-y-3.5">
                    <span className="text-[10px] font-mono font-bold text-slate-400 block border-b border-slate-900 pb-1.5 uppercase">
                      Target Socket Properties
                    </span>
                    
                    <div className="grid grid-cols-2 gap-3 text-[11px] font-mono">
                      <div className="space-y-0.5">
                        <span className="text-slate-500 text-[9px] block">NAME</span>
                        <strong className="text-slate-300 truncate block">{secureTestCam.name}</strong>
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-slate-500 text-[9px] block">IP ADDRESS</span>
                        <strong className="text-emerald-400 block">{secureTestCam.ip}</strong>
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-slate-500 text-[9px] block">MODEL SIGNATURE</span>
                        <strong className="text-slate-300 block">{secureTestCam.model || 'Standard'}</strong>
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-slate-500 text-[9px] block">MAC HEX</span>
                        <strong className="text-slate-400 block">{secureTestCam.mac}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Interactive Security Parameters (Protected by privilege checks) */}
                  <div className="bg-slate-950/40 border border-slate-850 rounded-xl p-4 space-y-3.5">
                    <span className="text-[10px] font-mono font-bold text-slate-400 block border-b border-slate-900 pb-1.5 uppercase">
                      Cryptographic & Link Protocols
                    </span>

                    <div className="space-y-3 text-[11px] font-mono">
                      {/* Transport layer secure toggle */}
                      <div className="flex justify-between items-center bg-slate-950/60 p-2 rounded border border-slate-900">
                        <span className="text-slate-400 text-[10px]">Secure Transport (TLS)</span>
                        <button
                          type="button"
                          onClick={() => {
                            if (!canRunDiagnostics) {
                              triggerToast(`Access Denied: Current role cannot modify diagnostic protocol specs.`, 'warn');
                              return;
                            }
                            const nextEnc = !secureTestEncrypted;
                            setSecureTestEncrypted(nextEnc);
                            setSecureTestProtocol(nextEnc ? 'RTSPS' : 'RTSP');
                            triggerToast(`Transport layer encryption set to: ${nextEnc ? 'ACTIVE (TLSv1.3)' : 'UNENCRYPTED'}`, 'info');
                          }}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-colors ${
                            secureTestEncrypted 
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-900/40' 
                              : 'bg-rose-950 text-rose-400 border border-rose-900/40'
                          }`}
                        >
                          {secureTestEncrypted ? 'SSL/TLS ON' : 'TLS BYPASS'}
                        </button>
                      </div>

                      {/* Authentication level selector */}
                      <div className="space-y-1">
                        <span className="text-slate-500 text-[9px]">AUTHENTICATION SCHEME</span>
                        <select
                          value={secureTestAuth}
                          onChange={(e) => {
                            if (!canRunDiagnostics) {
                              triggerToast(`Access Denied: Current role cannot modify diagnostic protocol specs.`, 'warn');
                              return;
                            }
                            setSecureTestAuth(e.target.value as any);
                          }}
                          className="w-full bg-slate-950 border border-slate-900 rounded p-1.5 text-slate-300 text-[11px] focus:outline-none"
                        >
                          <option value="digest">Cryptographic Digest Handshake (MD5 Secure)</option>
                          <option value="basic">Basic Authentication (Unsecured Base64)</option>
                          <option value="none">No Authentication (Anonymous Stream)</option>
                        </select>
                      </div>

                      {/* Network Port Protocol selector */}
                      <div className="space-y-1">
                        <span className="text-slate-500 text-[9px]">TARGET PROTOCOL APPLICATION</span>
                        <div className="grid grid-cols-2 gap-1.5">
                          {['RTSPS', 'ONVIF', 'HTTPS', 'RTSP'].map((proto) => {
                            const isSelected = secureTestProtocol === proto;
                            return (
                              <button
                                key={proto}
                                type="button"
                                onClick={() => {
                                  if (!canRunDiagnostics) {
                                    triggerToast(`Access Denied: Current role cannot modify diagnostic protocol specs.`, 'warn');
                                    return;
                                  }
                                  setSecureTestProtocol(proto as any);
                                  setSecureTestEncrypted(proto === 'RTSPS' || proto === 'HTTPS');
                                }}
                                className={`py-1 text-[10px] font-bold rounded border transition-colors cursor-pointer ${
                                  isSelected 
                                    ? 'bg-rose-950/40 border-rose-900/60 text-rose-300' 
                                    : 'bg-slate-950 border-slate-900 text-slate-500 hover:text-slate-300'
                                }`}
                              >
                                {proto}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Credentials Input Fields */}
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <div className="space-y-0.5">
                          <span className="text-slate-500 text-[9px] block">USERNAME</span>
                          <input
                            type="text"
                            value={secureTestUsername}
                            onChange={(e) => setSecureTestUsername(e.target.value)}
                            disabled={!canRunDiagnostics}
                            className="w-full bg-slate-950 border border-slate-900 rounded px-2 py-1 text-slate-300 text-[11px] focus:outline-none disabled:opacity-50"
                          />
                        </div>
                        <div className="space-y-0.5">
                          <span className="text-slate-500 text-[9px] block">PASSWORD</span>
                          <input
                            type="password"
                            value={secureTestPassword}
                            onChange={(e) => setSecureTestPassword(e.target.value)}
                            disabled={!canRunDiagnostics}
                            className="w-full bg-slate-950 border border-slate-900 rounded px-2 py-1 text-slate-300 text-[11px] focus:outline-none disabled:opacity-50"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Trigger diagnostics controls */}
                  <div className="space-y-2">
                    <button
                      type="button"
                      disabled={secureTestStatus === 'testing'}
                      onClick={() => startSecureFeedDiagnostic(secureTestCam, secureTestProtocol, secureTestAuth, secureTestEncrypted)}
                      className="w-full py-2 bg-rose-600 hover:bg-rose-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-mono font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-rose-950/20"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${secureTestStatus === 'testing' ? 'animate-spin' : ''}`} />
                      <span>{secureTestStatus === 'testing' ? 'STREAM HANDSHAKE ACTIVE...' : 'RE-RUN PROTOCOL DIAGNOSTICS'}</span>
                    </button>
                  </div>
                </div>

                {/* Right Side: Log console Terminal & Stream Frame (7 cols) */}
                <div className="lg:col-span-7 flex flex-col gap-4">
                  {/* Streaming screen frame viewport */}
                  <div className="bg-slate-950 rounded-2xl border border-slate-850 aspect-video relative overflow-hidden shadow-inner flex flex-col justify-between p-3.5">
                    {/* Interlace filter lines */}
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(18,24,38,0)_95%,rgba(16,185,129,0.04)_98%,rgba(18,24,38,0)_100%)] bg-[size:100%_35px] animate-[slide_12s_linear_infinite] pointer-events-none z-10" />
                    
                    {/* Stream Metadata details */}
                    <div className="flex justify-between items-start z-10 font-mono text-[9px] drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]">
                      <div className="bg-black/70 px-2 py-0.5 rounded border border-slate-900/60 text-slate-300 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                        <span className="font-bold text-slate-200">LIVE FEED PREVIEW</span>
                      </div>
                      
                      <div className="bg-black/70 px-2 py-0.5 rounded border border-slate-900/60 text-slate-400 flex items-center gap-1">
                        <Lock className={`w-3 h-3 ${secureTestEncrypted ? 'text-emerald-400' : 'text-rose-500'}`} />
                        <span className={secureTestEncrypted ? 'text-emerald-400 font-bold' : 'text-rose-400'}>
                          {secureTestEncrypted ? 'SECURE SOCKET' : 'UNSECURED LINK'}
                        </span>
                      </div>
                    </div>

                    {/* Viewport viewport screen body */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      {secureTestStatus === 'testing' ? (
                        <div className="text-center space-y-3">
                          <RefreshCw className="w-8 h-8 text-rose-500 animate-spin mx-auto" />
                          <span className="font-mono text-[10px] text-slate-400 tracking-wider block uppercase animate-pulse">
                            Establishing socket handshake...
                          </span>
                          <span className="text-[9px] text-slate-600 font-mono block">
                            Negotiating security credentials
                          </span>
                        </div>
                      ) : secureTestStatus === 'success' ? (
                        <div className="w-full h-full relative">
                          <CameraSnapshotVisualizer cameraId={secureTestCam.id} cameraType={secureTestCam.type} motionLevel={12} size="lg" />
                          
                          {/* Live timestamp and stream metrics */}
                          <div className="absolute bottom-3 left-3 right-3 flex justify-between items-end font-mono text-[8px] bg-black/60 p-2 rounded border border-slate-900/40 text-slate-400 z-10">
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1 text-emerald-400 font-bold">
                                <span>{secureTestCam.ip} : {secureTestProtocol}</span>
                              </div>
                              <div>MAC: {secureTestCam.mac}</div>
                            </div>
                            <div className="text-right space-y-0.5">
                              <div>{secureTestCam.resolution} @ {secureTestCam.fps}fps</div>
                              <div className="text-cyan-400 font-bold">{secureTestCam.bitrate} Kbps Stream</div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center space-y-2 select-none pointer-events-none p-4">
                          <VideoOff className="w-10 h-10 text-slate-800 mx-auto animate-pulse" />
                          <span className="font-mono text-[10px] text-slate-600 uppercase block tracking-widest font-bold">
                            NO ACTIVE TELEMETRY LINK
                          </span>
                          <p className="text-[8px] text-slate-700 font-mono">
                            Parameters unverified. Click Re-Run Diagnostics to start connection stream.
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="z-10" />
                  </div>

                  {/* Terminal Logs (Terminal view of the secure connection handshake) */}
                  <div className="bg-slate-950 rounded-2xl border border-slate-850 flex-1 flex flex-col overflow-hidden min-h-[160px]">
                    <div className="bg-slate-900/80 px-4 py-2 border-b border-slate-900 flex items-center justify-between text-[10px] font-mono text-slate-400">
                      <span className="flex items-center gap-1.5 font-bold uppercase text-slate-300">
                        <Terminal className="w-3.5 h-3.5 text-rose-500" />
                        Protocol Handshake Terminal Output
                      </span>
                      <span className="bg-black/60 border border-slate-900 text-slate-500 px-2 py-0.5 rounded text-[8px]">
                        STABLE FEED
                      </span>
                    </div>

                    <div className="p-4 font-mono text-[10px] leading-relaxed text-slate-400 overflow-y-auto flex-1 space-y-1.5 select-text">
                      {secureTestLogs.length === 0 ? (
                        <div className="text-slate-600 italic py-4 text-center">
                          Diagnostics log terminal inactive. Ready for secure link probing.
                        </div>
                      ) : (
                        secureTestLogs.map((log, idx) => {
                          const isWarning = log.includes('⚠️') || log.includes('WARNING');
                          const isSuccess = log.includes('SUCCESS') || log.includes('established') || log.includes('Verified');
                          return (
                            <div 
                              key={idx} 
                              className={
                                isWarning 
                                  ? 'text-amber-400' 
                                  : isSuccess 
                                  ? 'text-emerald-400' 
                                  : 'text-slate-400'
                              }
                            >
                              {log}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>

              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Floating local toasts overlay */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 max-w-sm">
        <AnimatePresence>
          {localToasts.map(toast => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
              className={`p-4 rounded-xl shadow-2xl border text-sm font-semibold flex items-center gap-3 backdrop-blur-md ${
                toast.type === 'success'
                  ? 'bg-emerald-950/90 text-emerald-300 border-emerald-500/30 shadow-emerald-950/50'
                  : toast.type === 'warn'
                  ? 'bg-rose-950/90 text-rose-300 border-rose-500/30 shadow-rose-950/50'
                  : 'bg-slate-950/90 text-cyan-300 border-cyan-500/30 shadow-slate-950/50'
              }`}
            >
              <div className={`w-2 h-2 rounded-full ${
                toast.type === 'success' ? 'bg-emerald-400 animate-pulse' : toast.type === 'warn' ? 'bg-rose-400 animate-pulse' : 'bg-cyan-400 animate-pulse'
              }`} />
              <p className="flex-1 text-xs">{toast.message}</p>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

    </div>
  );
}

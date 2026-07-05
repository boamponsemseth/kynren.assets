import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Asset, UserRegistryItem, Ticket, DropdownOption } from '../types';
import D3BatterySignalChart from './D3BatterySignalChart';
import { db, doc, setDoc, updateDoc, collection, getDocs, addDoc } from '../firebase';
import QRCode from 'qrcode';
import { 
  ArrowLeft, 
  Layers, 
  Cpu, 
  HardDrive, 
  Code, 
  Network, 
  Terminal, 
  Briefcase, 
  FileText, 
  File, 
  Globe, 
  Shield, 
  BookOpen, 
  Ticket as TicketIcon, 
  AlertCircle, 
  Calendar, 
  Link as LinkIcon, 
  FileKey, 
  StickyNote, 
  Clock, 
  Database, 
  List, 
  Server, 
  Zap, 
  CheckCircle, 
  Download,
  Plus,
  Trash2,
  Trash,
  HelpCircle,
  Activity,
  History,
  Wrench,
  ToggleLeft,
  User,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  Battery,
  MapPin,
  Compass,
  X
} from 'lucide-react';

interface AssetDetailViewProps {
  asset: Asset;
  onBack: () => void;
  users: UserRegistryItem[];
  tickets: Ticket[];
  onCreateTicket: (ticket: Partial<Ticket>) => void;
  onUpdateAsset?: (id: string, updatedFields: Partial<Asset>) => Promise<void>;
}

// Defining menu list
const SIDEBAR_ITEMS = [
  { id: 'profile', label: 'Asset Profile', icon: User },
  { id: 'impact', label: 'Impact Analysis', icon: Zap },
  { id: 'location_history', label: 'Location History & Map', icon: MapPin },
  { id: 'os', label: 'Operating systems', icon: Layers },
  { id: 'components', label: 'Components', icon: Cpu },
  { id: 'volumes', label: 'Volumes', icon: HardDrive },
  { id: 'software', label: 'Software', icon: Code },
  { id: 'connections', icon: Network, label: 'Connections' },
  { id: 'ports', label: 'Network Ports', icon: Server },
  { id: 'sockets', label: 'Sockets', icon: Activity },
  { id: 'remote_mgt', label: 'Remote management', icon: Terminal },
  { id: 'management', label: 'Management', icon: Briefcase },
  { id: 'contracts', label: 'Contracts', icon: FileText },
  { id: 'documents', label: 'Documents', icon: File },
  { id: 'virtualization', label: 'Virtualization', icon: Globe },
  { id: 'antiviruses', label: 'Antiviruses', icon: Shield },
  { id: 'kb', label: 'Knowledge Base', icon: BookOpen },
  { id: 'tickets', label: 'Tickets', icon: TicketIcon },
  { id: 'problems', label: 'Problems', icon: AlertCircle },
  { id: 'changes', label: 'Changes', icon: History },
  { id: 'links', label: 'Links', icon: LinkIcon },
  { id: 'certificates', label: 'Certificates', icon: FileKey },
  { id: 'notes', label: 'Notes', icon: StickyNote },
  { id: 'reservations', label: 'Reservations', icon: Calendar },
  { id: 'domains', label: 'Domains', icon: Globe },
  { id: 'appliances', label: 'Appliances', icon: Wrench },
  { id: 'db_instances', label: 'Database instances', icon: Database },
  { id: 'historical', label: 'Historical', icon: Clock },
  { id: 'all', label: 'All', icon: List }
];

const compressAssetImage = (file: File, maxWidth = 400, maxHeight = 400, quality = 0.7): Promise<string> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(event.target?.result as string);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.onerror = () => {
        resolve(event.target?.result as string);
      };
      img.src = event.target?.result as string;
    };
    reader.onerror = () => {
      resolve('');
    };
    reader.readAsDataURL(file);
  });
};

export default function AssetDetailView({
  asset,
  onBack,
  users,
  tickets: globalTickets,
  onCreateTicket,
  onUpdateAsset
}: AssetDetailViewProps) {
  const [activeMenu, setActiveMenu] = useState<string>('profile');

  // Profile management local states
  const [localFeaturedImage, setLocalFeaturedImage] = useState<string>(asset.featuredImage || '');
  const [localGalleryImages, setLocalGalleryImages] = useState<string[]>(asset.galleryImages || []);
  const [localAssignedTo, setLocalAssignedTo] = useState<string>(asset.assignedTo || '');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState<boolean>(false);

  useEffect(() => {
    setLocalFeaturedImage(asset.featuredImage || '');
    setLocalGalleryImages(asset.galleryImages || []);
    setLocalAssignedTo(asset.assignedTo || '');
  }, [asset]);

  const generateBatteryHistory = (currentLevel: number) => {
    const points = [];
    const now = new Date();
    for (let i = 7; i >= 0; i--) {
      const time = new Date(now.getTime() - i * 3 * 60 * 60 * 1000);
      let calculatedLevel = currentLevel + i * 4;
      if (calculatedLevel > 100) {
        calculatedLevel = 100 - ((7 - i) * 3) % 15; 
      }
      points.push({
        time: time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        level: Math.round(calculatedLevel),
        voltage: (3.2 + (calculatedLevel / 100) * 1.0).toFixed(2),
      });
    }
    return points;
  };

  // QR Code state and generation effect
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');

  useEffect(() => {
    if (asset && asset.id) {
      QRCode.toDataURL(asset.id, {
        width: 180,
        margin: 2,
        color: {
          dark: '#0f172a', // Deep slate navy
          light: '#ffffff'
        }
      })
      .then(url => {
        setQrCodeUrl(url);
      })
      .catch(err => {
        console.error('Failed to generate QR code:', err);
      });
    }
  }, [asset]);

  // Smart Reassign state and logic
  const [isSmartReassignOpen, setIsSmartReassignOpen] = useState(false);
  const [reassignSuggestions, setReassignSuggestions] = useState<{
    user: UserRegistryItem;
    activeLoad: number;
    resolvedCount: number;
    score: number;
  }[]>([]);

  const handleTriggerSmartReassign = () => {
    const mapped = users.map(user => {
      const activeLoad = globalTickets.filter(t => 
        t.assignedTo === user.displayName && 
        (t.status === 'open' || t.status === 'in_progress')
      ).length;

      const resolvedCount = globalTickets.filter(t => 
        t.assignedTo === user.displayName && 
        (t.status === 'resolved' || t.status === 'closed') &&
        (
          (asset.category === 'Speaker' && t.category === 'Audio') ||
          (asset.category === 'Projector' && (t.category === 'Hardware' || t.description?.toLowerCase().includes('projector'))) ||
          (asset.category === 'DMX' && (t.category === 'Lighting' || t.description?.toLowerCase().includes('dmx'))) ||
          (asset.category === 'Pyrotechnics' && t.category === 'Special Effects') ||
          (asset.category === 'Power' && t.category === 'Power') ||
          (t.category === 'Hardware')
        )
      ).length;

      let score = (resolvedCount * 12) - (activeLoad * 6);
      if (user.role === 'Technician') score += 15;
      if (user.status === 'online') score += 8;

      return { user, activeLoad, resolvedCount, score };
    });

    // Sort by suitability score descending
    mapped.sort((a, b) => b.score - a.score);
    setReassignSuggestions(mapped);
    setIsSmartReassignOpen(true);
  };

  const handleConfirmSmartReassign = async (techName: string) => {
    if (onUpdateAsset) {
      await onUpdateAsset(asset.id, { assignedTo: techName });
      setIsSmartReassignOpen(false);
    }
  };

  // Interactive local states saved to local storage or state to act as real functionality
  const [assetNotes, setAssetNotes] = useState<string>(asset.comments || '');
  const [isSavingNotes, setIsSavingNotes] = useState(false);

  // Components list
  const [components, setComponents] = useState<{ id: string; name: string; spec: string; status: string }[]>([
    { id: 'comp-1', name: 'Intel Xeon D-1541 CPU', spec: '8 Cores, 2.1 GHz', status: 'Healthy' },
    { id: 'comp-2', name: '32GB DDR4 ECC RAM', spec: '2x 16GB RDIMM 2400MHz', status: 'Healthy' },
    { id: 'comp-3', name: '1TB NVMe Enterprise SSD', spec: 'PCIe Gen3 x4, Read 3.2GB/s', status: 'Healthy' }
  ]);
  const [newCompName, setNewCompName] = useState('');
  const [newCompSpec, setNewCompSpec] = useState('');

  // Sockets list
  const [sockets, setSockets] = useState<{ port: number; protocol: string; process: string; state: string }[]>([
    { port: 22, protocol: 'TCP', process: 'sshd', state: 'LISTEN' },
    { port: 80, protocol: 'TCP', process: 'nginx', state: 'LISTEN' },
    { port: 443, protocol: 'TCP', process: 'nginx', state: 'LISTEN' },
    { port: 5000, protocol: 'UDP', process: 'artnet-daemon', state: 'ESTABLISHED' }
  ]);
  const [newSocketPort, setNewSocketPort] = useState('');
  const [newSocketProc, setNewSocketProc] = useState('');

  // Database Instances
  const [dbInstances, setDbInstances] = useState<{ id: string; engine: string; name: string; status: string }[]>(
    asset.category?.toLowerCase() === 'switch' ? [] : [
      { id: 'db-1', engine: 'PostgreSQL 15', name: 'kynren_assets_prod', status: 'Active' },
      { id: 'db-2', engine: 'SQLite 3', name: 'local_cache_db', status: 'Healthy' }
    ]
  );
  const [newDbEngine, setNewDbEngine] = useState('');
  const [newDbName, setNewDbName] = useState('');

  // Documents
  const [documents, setDocuments] = useState<{ id: string; name: string; size: string; type: string; date: string }[]>([
    { id: 'doc-1', name: 'Operating_Manual_v2.pdf', size: '2.4 MB', type: 'PDF', date: '2026-02-15' },
    { id: 'doc-2', name: 'Wiring_Schematics_RackB.dwg', size: '14.8 MB', type: 'CAD', date: '2026-04-10' }
  ]);
  const [newDocName, setNewDocName] = useState('');

  // Softwares
  const [software, setSoftware] = useState<{ id: string; name: string; version: string; license: string }[]>([
    { id: 'soft-1', name: 'Debian Linux OS Kernel', version: '6.1.0-amd64', license: 'GPL v2' },
    { id: 'soft-2', name: 'Art-Net DMX Transceiver Node', version: 'v4.2.1-stable', license: 'MIT' },
    { id: 'soft-3', name: 'LLDP Discovery Agent', version: 'v1.0.8', license: 'Apache 2.0' }
  ]);
  const [newSoftName, setNewSoftName] = useState('');
  const [newSoftVer, setNewSoftVer] = useState('');

  // Volumes
  const [volumes, setVolumes] = useState<{ id: string; mount: string; size: string; used: string; type: string }[]>([
    { id: 'vol-1', mount: '/', size: '120 GB', used: '45 GB (37%)', type: 'ext4' },
    { id: 'vol-2', mount: '/var/log', size: '50 GB', used: '12 GB (24%)', type: 'ext4' }
  ]);
  const [newVolMount, setNewVolMount] = useState('');
  const [newVolSize, setNewVolSize] = useState('');

  // OS Info
  const [osName, setOsName] = useState('Debian GNU/Linux 12 (bookworm)');
  const [osKernel, setOsKernel] = useState('Linux 6.1.0-18-amd64 x86_64');
  const [osInstallDate, setOsInstallDate] = useState('2025-11-20 14:32:00');

  // Network Ports
  const [netPorts, setNetPorts] = useState<{ port: string; speed: string; state: string; vlan: string }[]>([
    { port: 'eth0', speed: '1 Gbps', state: 'Up', vlan: 'VLAN 10 (Ctrl)' },
    { port: 'eth1 (Service)', speed: '100 Mbps', state: 'Down', vlan: 'VLAN 1 (Mgt)' }
  ]);

  // Antivirus
  const [antiviruses, setAntiviruses] = useState<{ name: string; version: string; status: string; lastScan: string }[]>([
    { name: 'ClamAV Endpoint Shield', version: 'v1.2.0-engine', status: 'ACTIVE', lastScan: '2026-06-30 04:12' }
  ]);
  const [isScanningVirus, setIsScanningVirus] = useState(false);
  const [scanVirusLog, setScanVirusLog] = useState<string>('');

  // Location history state
  const [locationLogs, setLocationLogs] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  useEffect(() => {
    const fetchLocationHistory = async () => {
      setIsLoadingHistory(true);
      try {
        const q = collection(db, 'location_history');
        const snapshot = await getDocs(q);
        const docsList = snapshot.docs.map(doc => doc.data());
        const filtered = docsList
          .filter((doc: any) => doc.assetId === asset.id)
          .sort((a: any, b: any) => b.timestamp.localeCompare(a.timestamp));
        
        // If empty, supply high-quality seeds
        if (filtered.length === 0) {
          const seeds = [
            {
              id: 'seed-1',
              assetId: asset.id,
              assetName: asset.name,
              x: asset.coordinates?.x !== undefined ? asset.coordinates.x : 45,
              y: asset.coordinates?.y !== undefined ? asset.coordinates.y : 35,
              timestamp: new Date(Date.now() - 3600 * 2 * 1000).toISOString(),
              operator: 'System Bootstrapper',
              locationName: asset.location || 'Central Lake Area'
            },
            {
              id: 'seed-2',
              assetId: asset.id,
              assetName: asset.name,
              x: asset.coordinates?.x !== undefined ? Math.max(10, asset.coordinates.x - 5) : 50,
              y: asset.coordinates?.y !== undefined ? Math.min(90, asset.coordinates.y + 10) : 60,
              timestamp: new Date(Date.now() - 3600 * 24 * 1000).toISOString(),
              operator: 'Seth Boa Amponsem',
              locationName: 'East Wing Storage Rack'
            }
          ];
          setLocationLogs(seeds);
        } else {
          setLocationLogs(filtered);
        }
      } catch (err) {
        console.error("Failed to load location history:", err);
      } finally {
        setIsLoadingHistory(false);
      }
    };
    if (activeMenu === 'location_history') {
      fetchLocationHistory();
    }
  }, [activeMenu, asset.id, asset.coordinates, asset.location, asset.name]);

  // Knowledge Base articles linked
  const [kbArticles, setKbArticles] = useState<{ title: string; desc: string; link: string }[]>([
    { title: 'Troubleshooting Art-Net Packet Drops', desc: 'Step-by-step guide on how to isolate broadcast noise from Art-Net systems.', link: '#' },
    { title: 'Standard DHCP Lease Drift Workaround', desc: 'Configure static IP mappings or lower TTL settings to mitigate lease duration drifting.', link: '#' }
  ]);

  // Tickets linked to this Asset
  const assetTickets = globalTickets.filter(t => t.assignedTo === asset.id || t.description.includes(asset.name) || t.name.includes(asset.name));

  // Quick Ticket Form in Asset Detail page
  const [ticketName, setTicketName] = useState('');
  const [ticketDesc, setTicketDesc] = useState('');
  const [ticketPriority, setTicketPriority] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [ticketCategory, setTicketCategory] = useState<'Hardware' | 'Network' | 'Power' | 'Lighting' | 'Audio' | 'Special Effects'>('Hardware');

  const handleCreateQuickTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketName.trim()) return;

    onCreateTicket({
      name: ticketName,
      description: `[Asset: ${asset.name} (${asset.ipAddress})] ${ticketDesc}`,
      priority: ticketPriority,
      category: ticketCategory,
      status: 'open',
      createdBy: 'seth-01'
    });

    setTicketName('');
    setTicketDesc('');
  };

  // Historical Changelog list
  const [historyLogs, setHistoryLogs] = useState<{ date: string; user: string; event: string }[]>([
    { date: '2026-07-01 10:45', user: 'Seth (Super Admin)', event: 'Asset selected and live ICMP network ping verified.' },
    { date: '2026-06-15 14:22', user: 'System Deployer', event: 'Asset added to Kynren inventory and assigned IP 10.12.20.18.' }
  ]);

  // Dynamic Save Notes
  const handleSaveNotes = async () => {
    setIsSavingNotes(true);
    try {
      await updateDoc(doc(db, 'assets', asset.id), {
        comments: assetNotes
      });
      setHistoryLogs(prev => [
        { date: new Date().toISOString().replace('T', ' ').substring(0, 16), user: 'Operator', event: 'Updated asset comments/notes.' },
        ...prev
      ]);
    } catch (err) {
      console.error('Failed to update notes:', err);
    } finally {
      setIsSavingNotes(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl overflow-hidden shadow-2xl flex flex-col min-h-[700px] font-sans">
      
      {/* Top Header bar */}
      <div className="bg-slate-950 border-b border-slate-800 p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-lg text-slate-400 hover:text-slate-100 transition-all cursor-pointer flex items-center justify-center"
            title="Back to Asset Inventory"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-100 tracking-tight">{asset.name}</h2>
              <span className="text-[10px] font-mono bg-cyan-950 text-cyan-400 border border-cyan-800/40 px-2 py-0.5 rounded-full font-bold">
                {asset.assetTag || 'NO_TAG'}
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono mt-0.5 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              IP Node: <strong className="text-slate-200">{asset.ipAddress}</strong> | Category: <strong className="text-rose-400 font-sans uppercase">{asset.category}</strong>
            </p>
          </div>
        </div>

        {/* Action badges */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="text-[10px] font-mono text-slate-500 bg-slate-900 px-3 py-1.5 border border-slate-800 rounded-lg flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            Last Seen: {asset.lastSeen ? new Date(asset.lastSeen).toLocaleTimeString() : 'N/A'}
          </div>
          <div className={`text-[10px] font-mono px-3 py-1.5 border rounded-lg font-bold uppercase ${
            asset.status === 'online' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
          }`}>
            {asset.status}
          </div>
        </div>
      </div>

      {/* Main Body */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        
        {/* Left Sidebar Menu */}
        <aside className="lg:w-64 bg-slate-950 border-r border-slate-800 flex flex-col shrink-0">
          <div className="p-3 border-b border-slate-850">
            <span className="text-[10px] text-slate-500 uppercase font-mono font-bold tracking-wider block px-2.5 mb-1">Asset Explorer</span>
          </div>
          <nav className="flex-1 overflow-y-auto max-h-[550px] p-2 space-y-0.5 scrollbar-thin scrollbar-thumb-slate-800">
            {SIDEBAR_ITEMS.map((item) => {
              const IconComp = item.icon;
              const isActive = activeMenu === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveMenu(item.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-left transition-all cursor-pointer ${
                    isActive 
                      ? 'bg-rose-600 text-white shadow-md' 
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
                  }`}
                >
                  <IconComp className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Interactive QR Code Label */}
          <div className="p-4 border-t border-slate-850 bg-slate-950 flex flex-col items-center justify-center text-center">
            <span className="text-[9px] text-slate-500 uppercase font-mono font-bold tracking-wider mb-2">Asset QR Code</span>
            {qrCodeUrl ? (
              <div className="bg-white p-1.5 rounded-lg border border-slate-800 shadow-lg relative group">
                <img src={qrCodeUrl} alt={`QR Code for ${asset.id}`} className="w-24 h-24 select-none pointer-events-none" />
                <button
                  type="button"
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = qrCodeUrl;
                    link.download = `QR_LABEL_${asset.id}_${asset.name.replace(/\s+/g, '_')}.png`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                  title="Download QR Label"
                  className="absolute inset-0 bg-slate-950/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-lg cursor-pointer text-white font-mono text-[9px] font-bold"
                >
                  <Download className="w-4 h-4 mr-1 text-rose-400" /> DOWNLOAD
                </button>
              </div>
            ) : (
              <div className="w-24 h-24 bg-slate-900 animate-pulse rounded-lg border border-slate-800 flex items-center justify-center">
                <span className="text-[9px] text-slate-600 font-mono">Generating...</span>
              </div>
            )}
            <span className="text-[9px] text-slate-400 font-mono font-bold mt-1.5 bg-slate-900 px-2 py-0.5 rounded border border-slate-800 uppercase tracking-wider">{asset.id}</span>
            <p className="text-[8px] text-slate-500 font-sans mt-1 max-w-[140px] leading-tight">Scan with camera to open asset record.</p>
          </div>
        </aside>

        {/* Right Active Panel */}
        <div className="flex-1 p-6 md:p-8 overflow-y-auto bg-slate-900/40">
          {/* Battery Level Monitoring for highValue or mobile status */}
          {(asset.isHighValue || asset.tags?.includes('high-value') || asset.tags?.includes('mobile') || asset.status === 'mobile' || asset.category?.toLowerCase() === 'mobile') && (
            <div className="mb-6 bg-slate-950 border border-slate-800 rounded-xl p-5 shadow-lg">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-3">
                <div className="flex items-center gap-2.5">
                  <div className={`p-2 rounded-lg ${
                    (asset.batteryLevel ?? 100) < 20 
                      ? 'bg-red-500/10 text-red-400' 
                      : (asset.batteryLevel ?? 100) < 50 
                        ? 'bg-amber-500/10 text-amber-400' 
                        : 'bg-emerald-500/10 text-emerald-400'
                  }`}>
                    <Battery className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <h4 className="text-xs font-mono font-bold tracking-wider uppercase text-slate-300">Battery Level Monitoring</h4>
                    <p className="text-[11px] text-slate-500">Continuous telemetry ping for high-value / mobile equipment</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 font-mono text-xs">
                  <span className="text-slate-400">Telemetry:</span>
                  <span className="px-2 py-0.5 bg-emerald-950 text-emerald-400 border border-emerald-900/30 rounded text-[10px] font-bold">ACTIVE</span>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex-1 bg-slate-900 h-3.5 rounded-full overflow-hidden border border-slate-800 p-0.5">
                  <motion.div 
                    className={`h-full rounded-full ${
                      (asset.batteryLevel ?? 100) < 20 
                        ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]' 
                        : (asset.batteryLevel ?? 100) < 50 
                          ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]' 
                          : 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]'
                    }`}
                    initial={{ width: 0 }}
                    animate={{ width: `${asset.batteryLevel ?? 100}%` }}
                    transition={{ type: "spring", stiffness: 60, damping: 15 }}
                  />
                </div>
                <span className={`text-sm font-mono font-bold shrink-0 ${
                  (asset.batteryLevel ?? 100) < 20 
                    ? 'text-red-400' 
                    : (asset.batteryLevel ?? 100) < 50 
                      ? 'text-amber-400' 
                      : 'text-emerald-400'
                }`}>
                  {asset.batteryLevel ?? 100}%
                </span>
              </div>

              {(() => {
                const baseDrainRates: Record<string, number> = {
                  'Projector': 5.2,
                  'Switch': 1.5,
                  'Radio': 3.0,
                  'DMX': 4.1,
                  'Speaker': 2.4,
                  'Pyrotechnics': 6.5
                };
                const assetCat = asset.category || 'Switch';
                const baseR = baseDrainRates[assetCat] ?? 2.5;
                let idHashVal = 0;
                if (asset.id) {
                  for (let i = 0; i < asset.id.length; i++) {
                    idHashVal += asset.id.charCodeAt(i);
                  }
                }
                const assetVariance = 0.8 + (idHashVal % 5) * 0.1; // 0.8 to 1.2
                const assetDrainVelocity = parseFloat((baseR * assetVariance).toFixed(2)); // in %/hour
                const predictedRuntimeHours = asset.batteryLevel !== undefined 
                  ? parseFloat((asset.batteryLevel / assetDrainVelocity).toFixed(1)) 
                  : undefined;

                return (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4 mt-4 pt-3 border-t border-slate-900 text-[10px] font-mono text-slate-500">
                    <div>
                      <span className="block text-slate-400">Battery Status</span>
                      <strong className={`font-semibold uppercase ${
                        (asset.batteryLevel ?? 100) < 20 
                          ? 'text-red-400' 
                          : (asset.batteryLevel ?? 100) < 50 
                            ? 'text-amber-400' 
                            : 'text-emerald-400'
                      }`}>
                        {(asset.batteryLevel ?? 100) < 20 ? 'Critical Low' : (asset.batteryLevel ?? 100) < 50 ? 'Low Charge' : 'Optimal'}
                      </strong>
                    </div>
                    <div>
                      <span className="block text-slate-400">Power Source</span>
                      <strong className="text-slate-300">Internal Li-Ion</strong>
                    </div>
                    <div>
                      <span className="block text-slate-400">Drain Velocity</span>
                      <strong className="text-rose-400 font-bold">{assetDrainVelocity}% / hr</strong>
                    </div>
                    <div>
                      <span className="block text-slate-400">Predicted Runtime</span>
                      <strong className="text-emerald-400 font-bold">
                        {predictedRuntimeHours !== undefined ? `${predictedRuntimeHours} hrs` : 'Continuous AC'}
                      </strong>
                    </div>
                    <div>
                      <span className="block text-slate-400">Est. Remaining</span>
                      <strong className="text-slate-300">
                        {asset.batteryLevel ? Math.ceil(asset.batteryLevel * 0.15 * 10) / 10 : 15} hrs
                      </strong>
                    </div>
                    <div>
                      <span className="block text-slate-400">Voltage</span>
                      <strong className="text-slate-300">
                        {asset.batteryLevel ? (3.2 + (asset.batteryLevel / 100) * 1.0).toFixed(2) : '4.20'}V
                      </strong>
                    </div>
                  </div>
                );
              })()}

              {/* D3 Battery & Signal History Chart */}
              <div className="mt-5 pt-5 border-t border-slate-900">
                <span className="block text-[10px] text-slate-400 font-mono uppercase tracking-wider mb-3">7-Day Battery Level History & Signal Latency (D3.js)</span>
                <div className="w-full bg-slate-950 p-3 rounded-lg border border-slate-900 shadow-inner">
                  <D3BatterySignalChart asset={asset} />
                </div>
              </div>
            </div>
          )}

          <AnimatePresence mode="wait">
            
            {/* Asset Profile Section */}
            {activeMenu === 'profile' && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 5 }}
                className="space-y-6"
              >
                <div className="border-b border-slate-800 pb-3 flex justify-between items-center">
                  <div>
                    <h3 className="font-sans font-bold text-slate-100 flex items-center gap-2 text-base">
                      <User className="w-5 h-5 text-rose-500" /> Asset Profile & Identity
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">Manage asset imagery, visual gallery, and assign staff responsibility.</p>
                  </div>
                  {isUpdatingProfile && (
                    <span className="text-[10px] font-mono text-cyan-400 animate-pulse bg-cyan-950/40 border border-cyan-800/30 px-2 py-1 rounded">
                      Saving...
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Left Column: Featured Image */}
                  <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 flex flex-col space-y-4">
                    <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider border-b border-slate-850 pb-2 flex justify-between items-center">
                      <span>Featured Image</span>
                      {localFeaturedImage && (
                        <span className="text-[9px] font-mono text-emerald-400 bg-emerald-950 px-1.5 py-0.5 rounded">
                          SET
                        </span>
                      )}
                    </h4>

                    <div className="relative group rounded-lg overflow-hidden border border-slate-800 bg-slate-900 flex flex-col justify-center items-center min-h-[220px]">
                      {localFeaturedImage ? (
                        <>
                          <img
                            src={localFeaturedImage}
                            alt={asset.name}
                            className="max-h-[220px] w-full object-contain"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute inset-0 bg-slate-950/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={async () => {
                                if (onUpdateAsset) {
                                  setIsUpdatingProfile(true);
                                  await onUpdateAsset(asset.id, { featuredImage: '' });
                                  setLocalFeaturedImage('');
                                  setIsUpdatingProfile(false);
                                }
                              }}
                              className="p-2 bg-red-600 hover:bg-red-500 text-white rounded transition-colors cursor-pointer"
                              title="Delete Image"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </>
                      ) : (
                        <div className="text-center p-4">
                          <User className="w-12 h-12 text-slate-700 mx-auto mb-2" />
                          <span className="text-xs text-slate-500 block font-mono">No Featured Image</span>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <label className="flex-1 py-2 px-3 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 rounded text-[11px] font-mono text-slate-200 text-center uppercase cursor-pointer transition-colors">
                        Upload Image
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file && onUpdateAsset) {
                              setIsUpdatingProfile(true);
                              try {
                                const compressed = await compressAssetImage(file, 400, 400, 0.7);
                                await onUpdateAsset(asset.id, { featuredImage: compressed });
                                setLocalFeaturedImage(compressed);
                              } catch (err) {
                                console.error('Error uploading image:', err);
                              } finally {
                                setIsUpdatingProfile(false);
                              }
                            }
                          }}
                        />
                      </label>
                      {localFeaturedImage && (
                        <button
                          type="button"
                          onClick={async () => {
                            if (onUpdateAsset) {
                              setIsUpdatingProfile(true);
                              await onUpdateAsset(asset.id, { featuredImage: '' });
                              setLocalFeaturedImage('');
                              setIsUpdatingProfile(false);
                            }
                          }}
                          className="px-3 bg-slate-900 border border-slate-800 hover:bg-slate-850 text-rose-400 rounded hover:border-rose-900 transition-colors cursor-pointer flex items-center justify-center"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Asset Assignment & Ownership */}
                  <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 flex flex-col space-y-4 md:col-span-2">
                    <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider border-b border-slate-850 pb-2">
                      Asset Responsibility & Assignment
                    </h4>

                    <div className="p-4 rounded-lg bg-slate-900 border border-slate-850 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-850 border border-slate-700 flex items-center justify-center overflow-hidden">
                          {(() => {
                            const assignedUserObj = users.find(u => u.displayName === localAssignedTo);
                            if (assignedUserObj?.profileImage) {
                              return <img src={assignedUserObj.profileImage} alt={localAssignedTo} className="w-full h-full object-cover" />;
                            }
                            return <User className="w-5 h-5 text-slate-400" />;
                          })()}
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 font-mono block uppercase">Currently Assigned Operator</span>
                          <span className="text-sm font-bold text-slate-200">
                            {localAssignedTo ? localAssignedTo : 'UNASSIGNED (Unallocated Hardware)'}
                          </span>
                        </div>
                      </div>

                      {localAssignedTo ? (
                        <button
                          type="button"
                          onClick={async () => {
                            if (onUpdateAsset) {
                              setIsUpdatingProfile(true);
                              await onUpdateAsset(asset.id, { assignedTo: '' });
                              setLocalAssignedTo('');
                              setIsUpdatingProfile(false);
                            }
                          }}
                          className="py-1.5 px-3 bg-rose-950/40 border border-rose-900/30 hover:border-rose-900 text-rose-400 rounded text-xs uppercase font-mono cursor-pointer transition-colors"
                        >
                          Un-assign Asset
                        </button>
                      ) : (
                        <span className="px-2.5 py-1 text-[10px] font-mono rounded bg-amber-950 text-amber-400 border border-amber-900/30 font-bold">
                          AVAILABLE
                        </span>
                      )}
                    </div>

                    {!localAssignedTo && (
                      <div className="space-y-2">
                        <label className="text-[10px] font-mono text-slate-400 uppercase">Select Staff Member to Assign:</label>
                        <div className="flex gap-2">
                          <select
                            className="flex-1 bg-slate-900 border border-slate-800 text-slate-200 rounded p-2 text-xs focus:outline-none focus:border-rose-500/40"
                            onChange={async (e) => {
                              const val = e.target.value;
                              if (val && onUpdateAsset) {
                                setIsUpdatingProfile(true);
                                await onUpdateAsset(asset.id, { assignedTo: val });
                                setLocalAssignedTo(val);
                                setIsUpdatingProfile(false);
                              }
                            }}
                            defaultValue=""
                          >
                            <option value="" disabled>-- Select operator --</option>
                            {users.map(u => (
                              <option key={u.id} value={u.displayName}>
                                {u.displayName} ({u.role})
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}

                    {/* Image Gallery */}
                    <div className="mt-4 pt-4 border-t border-slate-850">
                      <div className="flex justify-between items-center mb-3">
                        <h5 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Asset Photo Gallery</h5>
                        <label className="py-1 px-2.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-750 rounded text-[10px] font-mono text-cyan-400 hover:text-cyan-300 uppercase cursor-pointer transition-colors flex items-center gap-1">
                          <Plus className="w-3 h-3" /> Add Photo
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            className="hidden"
                            onChange={async (e) => {
                              const files = Array.from(e.target.files || []) as File[];
                              if (files.length > 0 && onUpdateAsset) {
                                setIsUpdatingProfile(true);
                                const newCompressed: string[] = [];
                                for (const f of files) {
                                  try {
                                    const comp = await compressAssetImage(f, 300, 300, 0.6);
                                    newCompressed.push(comp);
                                  } catch (err) {
                                    console.error('Error compressing gallery photo:', err);
                                  }
                                }
                                const updatedGallery = [...localGalleryImages, ...newCompressed];
                                await onUpdateAsset(asset.id, { galleryImages: updatedGallery });
                                setLocalGalleryImages(updatedGallery);
                                setIsUpdatingProfile(false);
                              }
                            }}
                          />
                        </label>
                      </div>

                      {localGalleryImages.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                          {localGalleryImages.map((img, idx) => (
                            <div key={idx} className="relative group rounded-lg overflow-hidden bg-slate-900 border border-slate-800 aspect-square flex items-center justify-center">
                              <img src={img} alt={`Gallery ${idx}`} className="object-cover w-full h-full" referrerPolicy="no-referrer" />
                              <div className="absolute inset-0 bg-slate-950/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <button
                                  type="button"
                                  onClick={async () => {
                                    if (onUpdateAsset) {
                                      setIsUpdatingProfile(true);
                                      const updatedGallery = localGalleryImages.filter((_, i) => i !== idx);
                                      await onUpdateAsset(asset.id, { galleryImages: updatedGallery });
                                      setLocalGalleryImages(updatedGallery);
                                      setIsUpdatingProfile(false);
                                    }
                                  }}
                                  className="p-1.5 bg-red-600 hover:bg-red-500 text-white rounded transition-colors cursor-pointer"
                                  title="Remove Photo"
                                >
                                  <Trash className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-6 rounded-lg border border-dashed border-slate-800 bg-slate-900/40 text-center text-slate-500 font-mono text-xs">
                          No images logged in this asset's gallery registry.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Impact Analysis Section */}
            {activeMenu === 'impact' && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 5 }}
                className="space-y-6"
              >
                <div className="border-b border-slate-800 pb-3">
                  <h3 className="font-sans font-bold text-slate-100 flex items-center gap-2 text-base">
                    <Zap className="w-5 h-5 text-amber-500" /> Operational Impact Analysis
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">Simulates and visualizes structural dependencies. Helps technicians analyze which hardware segments degrade if this node fails.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 space-y-4">
                    <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider border-b border-slate-850 pb-2">Upstream Connections (Dependencies)</h4>
                    <div className="space-y-3 font-mono text-xs">
                      <div className="p-3 bg-slate-900 border border-slate-850 rounded-lg flex justify-between items-center">
                        <div>
                          <span className="text-[10px] text-slate-500 block">PRIMARY GATEWAY ROUTER</span>
                          <span className="text-slate-200 font-bold">Kynren Main Core (10.12.1.1)</span>
                        </div>
                        <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold uppercase text-[9px]">ONLINE</span>
                      </div>
                      <div className="p-3 bg-slate-900 border border-slate-850 rounded-lg flex justify-between items-center">
                        <div>
                          <span className="text-[10px] text-slate-500 block">VLAN TRUNK ACCESS SWITCH</span>
                          <span className="text-slate-200 font-bold">Rack B - Switch 2 (10.12.10.2)</span>
                        </div>
                        <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold uppercase text-[9px]">ONLINE</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 space-y-4">
                    <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider border-b border-slate-850 pb-2">Downstream Impact (Affected Nodes)</h4>
                    <div className="space-y-3 font-mono text-xs">
                      {asset.category?.toLowerCase() === 'switch' ? (
                        <>
                          <div className="p-3 bg-slate-900 border border-slate-850 rounded-lg flex justify-between items-center border-l-4 border-l-rose-500">
                            <div>
                              <span className="text-[10px] text-rose-400 font-bold block">CRITICAL IMPACT (100% BLOCKED)</span>
                              <span className="text-slate-200 font-bold">Lake Speaker Array 1</span>
                            </div>
                            <span className="text-[10px] text-slate-500">Node spk-01</span>
                          </div>
                          <div className="p-3 bg-slate-900 border border-slate-850 rounded-lg flex justify-between items-center border-l-4 border-l-rose-500">
                            <div>
                              <span className="text-[10px] text-rose-400 font-bold block">CRITICAL IMPACT (100% BLOCKED)</span>
                              <span className="text-slate-200 font-bold">East Projector Tower</span>
                            </div>
                            <span className="text-[10px] text-slate-500">Node proj-01</span>
                          </div>
                        </>
                      ) : (
                        <div className="p-4 text-center text-slate-500 border border-dashed border-slate-800 rounded-lg">
                          No direct critical downstream dependencies. This is an edge device. If it goes offline, only its local service channel is suspended.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Operating Systems Section */}
            {activeMenu === 'os' && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div className="border-b border-slate-800 pb-3">
                  <h3 className="font-sans font-bold text-slate-100 flex items-center gap-2 text-base">
                    <Layers className="w-5 h-5 text-rose-500" /> Operating Systems & Kernels
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">Manage OS platform characteristics, installation logs, and run configuration properties.</p>
                </div>

                <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] text-slate-500 font-mono mb-1 uppercase font-bold">OS Name & Version</label>
                      <input
                        type="text"
                        value={osName}
                        onChange={(e) => setOsName(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-2 text-xs text-slate-200 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500 font-mono mb-1 uppercase font-bold">Kernel Release</label>
                      <input
                        type="text"
                        value={osKernel}
                        onChange={(e) => setOsKernel(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-2 text-xs text-slate-200 font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    <div>
                      <label className="block text-[10px] text-slate-500 font-mono mb-1 uppercase font-bold">OS Installation Timestamp</label>
                      <input
                        type="text"
                        value={osInstallDate}
                        onChange={(e) => setOsInstallDate(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-2 text-xs text-slate-200 font-mono"
                      />
                    </div>
                    <div className="flex items-end">
                      <button
                        onClick={() => {
                          setHistoryLogs(prev => [
                            { date: new Date().toISOString().replace('T', ' ').substring(0, 16), user: 'Operator', event: 'Updated OS profile properties.' },
                            ...prev
                          ]);
                          alert('OS Properties saved successfully!');
                        }}
                        className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-mono text-xs font-bold rounded-lg transition-all"
                      >
                        Save OS Profile
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Components Section */}
            {activeMenu === 'components' && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div className="border-b border-slate-800 pb-3 flex justify-between items-center">
                  <div>
                    <h3 className="font-sans font-bold text-slate-100 flex items-center gap-2 text-base">
                      <Cpu className="w-5 h-5 text-indigo-400" /> Physical Hardware Components
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">Catalogue CPU, RAM, Storage, and other critical subcomponents active inside this device.</p>
                  </div>
                </div>

                <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 space-y-4">
                  <div className="divide-y divide-slate-850">
                    {components.map((comp) => (
                      <div key={comp.id} className="py-3 flex justify-between items-center font-mono text-xs">
                        <div>
                          <span className="font-bold text-slate-200">{comp.name}</span>
                          <span className="text-slate-500 block text-[11px]">{comp.spec}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-bold border border-emerald-500/20">{comp.status}</span>
                          <button
                            onClick={() => setComponents(prev => prev.filter(c => c.id !== comp.id))}
                            className="text-slate-500 hover:text-red-400 p-1 rounded"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <form 
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!newCompName.trim()) return;
                      setComponents(prev => [...prev, { id: `comp-${Date.now()}`, name: newCompName, spec: newCompSpec || 'Generic component', status: 'Healthy' }]);
                      setNewCompName('');
                      setNewCompSpec('');
                    }}
                    className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row gap-2"
                  >
                    <input
                      type="text"
                      placeholder="Add component name (e.g., RAM Module)"
                      value={newCompName}
                      onChange={(e) => setNewCompName(e.target.value)}
                      className="flex-1 bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200"
                    />
                    <input
                      type="text"
                      placeholder="Specifications (e.g., 16GB DDR4)"
                      value={newCompSpec}
                      onChange={(e) => setNewCompSpec(e.target.value)}
                      className="flex-1 bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200"
                    />
                    <button
                      type="submit"
                      className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-mono font-bold rounded flex items-center gap-1 shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add
                    </button>
                  </form>
                </div>
              </motion.div>
            )}

            {/* Volumes Section */}
            {activeMenu === 'volumes' && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div className="border-b border-slate-800 pb-3">
                  <h3 className="font-sans font-bold text-slate-100 flex items-center gap-2 text-base">
                    <HardDrive className="w-5 h-5 text-amber-500" /> Disk Volumes & Storage Partitions
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">Gauges storage thresholds and partitions configured on the system.</p>
                </div>

                <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 space-y-4">
                  <div className="space-y-4 font-mono text-xs">
                    {volumes.map((vol) => (
                      <div key={vol.id} className="space-y-1.5">
                        <div className="flex justify-between text-[11px]">
                          <span className="font-bold text-slate-200">{vol.mount} ({vol.type})</span>
                          <span className="text-slate-400">Used: {vol.used} / Total: {vol.size}</span>
                        </div>
                        <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                          <div className="h-full bg-amber-500 rounded-full" style={{ width: vol.used.includes('37%') ? '37%' : vol.used.includes('24%') ? '24%' : '15%' }} />
                        </div>
                      </div>
                    ))}
                  </div>

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!newVolMount.trim()) return;
                      setVolumes(prev => [...prev, { id: `vol-${Date.now()}`, mount: newVolMount, size: newVolSize || '100 GB', used: '0 GB (0%)', type: 'ext4' }]);
                      setNewVolMount('');
                      setNewVolSize('');
                    }}
                    className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row gap-2"
                  >
                    <input
                      type="text"
                      placeholder="Mount point (e.g., /mnt/data)"
                      value={newVolMount}
                      onChange={(e) => setNewVolMount(e.target.value)}
                      className="flex-1 bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 font-mono"
                    />
                    <input
                      type="text"
                      placeholder="Total Size (e.g., 500 GB)"
                      value={newVolSize}
                      onChange={(e) => setNewVolSize(e.target.value)}
                      className="flex-1 bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 font-mono"
                    />
                    <button
                      type="submit"
                      className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-mono font-bold rounded flex items-center gap-1 shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Partition
                    </button>
                  </form>
                </div>
              </motion.div>
            )}

            {/* Software Section */}
            {activeMenu === 'software' && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div className="border-b border-slate-800 pb-3">
                  <h3 className="font-sans font-bold text-slate-100 flex items-center gap-2 text-base">
                    <Code className="w-5 h-5 text-indigo-400" /> Installed Software Registry
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">Lists media server drivers, transceivers, and firmware applications installed on the asset node.</p>
                </div>

                <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 space-y-4">
                  <div className="divide-y divide-slate-850">
                    {software.map((soft) => (
                      <div key={soft.id} className="py-3 flex justify-between items-center font-mono text-xs">
                        <div>
                          <span className="font-bold text-slate-200">{soft.name}</span>
                          <span className="text-slate-500 block text-[11px]">Version: {soft.version} | License: {soft.license}</span>
                        </div>
                        <button
                          onClick={() => setSoftware(prev => prev.filter(s => s.id !== soft.id))}
                          className="text-slate-500 hover:text-red-400 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!newSoftName.trim()) return;
                      setSoftware(prev => [...prev, { id: `soft-${Date.now()}`, name: newSoftName, version: newSoftVer || 'v1.0.0', license: 'MIT' }]);
                      setNewSoftName('');
                      setNewSoftVer('');
                    }}
                    className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row gap-2"
                  >
                    <input
                      type="text"
                      placeholder="Software Name"
                      value={newSoftName}
                      onChange={(e) => setNewSoftName(e.target.value)}
                      className="flex-1 bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200"
                    />
                    <input
                      type="text"
                      placeholder="Version"
                      value={newSoftVer}
                      onChange={(e) => setNewSoftVer(e.target.value)}
                      className="flex-1 bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 font-mono"
                    />
                    <button
                      type="submit"
                      className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-mono font-bold rounded flex items-center gap-1 shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" /> Install Software
                    </button>
                  </form>
                </div>
              </motion.div>
            )}

            {/* Connections Section */}
            {activeMenu === 'connections' && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div className="border-b border-slate-800 pb-3">
                  <h3 className="font-sans font-bold text-slate-100 flex items-center gap-2 text-base">
                    <Network className="w-5 h-5 text-emerald-400" /> Control & Network Connections
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">Traces Ethernet fiber, DMX control lines, and power links connecting to other showground infrastructure.</p>
                </div>

                <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 space-y-4">
                  <div className="space-y-3 font-mono text-xs">
                    <div className="p-3.5 bg-slate-900/50 border border-slate-850 rounded-lg flex justify-between items-center">
                      <div>
                        <span className="text-[10px] text-cyan-400 uppercase font-bold">ETH CONNECTION</span>
                        <p className="text-slate-200 font-bold mt-0.5">Port 14 → Core Switch (Port 22)</p>
                      </div>
                      <span className="text-[10px] text-slate-500">10G Fiber Link</span>
                    </div>
                    <div className="p-3.5 bg-slate-900/50 border border-slate-850 rounded-lg flex justify-between items-center">
                      <div>
                        <span className="text-[10px] text-purple-400 uppercase font-bold">DMX DAISY CHAIN</span>
                        <p className="text-slate-200 font-bold mt-0.5">DMX Out → Laser Stage Shutter Controller</p>
                      </div>
                      <span className="text-[10px] text-slate-500">Art-Net Ch. 4</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Network Ports Section */}
            {activeMenu === 'ports' && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div className="border-b border-slate-800 pb-3">
                  <h3 className="font-sans font-bold text-slate-100 flex items-center gap-2 text-base">
                    <Server className="w-5 h-5 text-rose-500" /> Active Network Ports
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">Monitors the state of physical Ethernet adapters, MAC addresses, and speed thresholds.</p>
                </div>

                <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 space-y-4">
                  <table className="w-full text-left border-collapse font-mono text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-500">
                        <th className="pb-2">Port</th>
                        <th className="pb-2">Negotiated Speed</th>
                        <th className="pb-2">VLAN Tag</th>
                        <th className="pb-2 text-right">Link Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850">
                      {netPorts.map((p, idx) => (
                        <tr key={idx} className="hover:bg-slate-900/20">
                          <td className="py-2.5 font-bold text-slate-200">{p.port}</td>
                          <td className="py-2.5 text-slate-300">{p.speed}</td>
                          <td className="py-2.5 text-cyan-400 font-bold">{p.vlan}</td>
                          <td className="py-2.5 text-right">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              p.state === 'Up' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            }`}>
                              {p.state}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            {/* Sockets Section */}
            {activeMenu === 'sockets' && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div className="border-b border-slate-800 pb-3">
                  <h3 className="font-sans font-bold text-slate-100 flex items-center gap-2 text-base">
                    <Activity className="w-5 h-5 text-amber-500" /> Live TCP/UDP Sockets
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">Monitors active listening ports and established connections on this hardware interface.</p>
                </div>

                <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 space-y-4">
                  <table className="w-full text-left border-collapse font-mono text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-500">
                        <th className="pb-2">Port</th>
                        <th className="pb-2">Protocol</th>
                        <th className="pb-2">Process / Daemon</th>
                        <th className="pb-2 text-right">State</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850">
                      {sockets.map((s, idx) => (
                        <tr key={idx} className="hover:bg-slate-900/20">
                          <td className="py-2.5 font-bold text-cyan-400">{s.port}</td>
                          <td className="py-2.5 text-slate-300">{s.protocol}</td>
                          <td className="py-2.5 text-slate-400">{s.process}</td>
                          <td className="py-2.5 text-right">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              s.state === 'LISTEN' ? 'bg-indigo-500/10 text-indigo-400' : 'bg-emerald-500/10 text-emerald-400 animate-pulse'
                            }`}>
                              {s.state}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const pNum = parseInt(newSocketPort, 10);
                      if (isNaN(pNum)) return;
                      setSockets(prev => [...prev, { port: pNum, protocol: 'TCP', process: newSocketProc || 'custom-service', state: 'LISTEN' }]);
                      setNewSocketPort('');
                      setNewSocketProc('');
                    }}
                    className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row gap-2"
                  >
                    <input
                      type="number"
                      placeholder="Socket Port (e.g., 8080)"
                      value={newSocketPort}
                      onChange={(e) => setNewSocketPort(e.target.value)}
                      className="flex-1 bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 font-mono"
                    />
                    <input
                      type="text"
                      placeholder="Service Daemon"
                      value={newSocketProc}
                      onChange={(e) => setNewSocketProc(e.target.value)}
                      className="flex-1 bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200"
                    />
                    <button
                      type="submit"
                      className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-mono font-bold rounded flex items-center gap-1 shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" /> Open Socket
                    </button>
                  </form>
                </div>
              </motion.div>
            )}

            {/* Remote Management Section */}
            {activeMenu === 'remote_mgt' && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div className="border-b border-slate-800 pb-3">
                  <h3 className="font-sans font-bold text-slate-100 flex items-center gap-2 text-base">
                    <Terminal className="w-5 h-5 text-rose-500" /> Out-of-Band Remote Management
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">Configure ILO/iDRAC IP terminals, wake-on-lan parameters, or secure SSH keys.</p>
                </div>

                <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 space-y-4 font-mono text-xs text-slate-300">
                  <div className="p-4 bg-slate-900/60 border border-slate-850 rounded-lg space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 font-bold">ILO Management IP</span>
                      <span className="text-rose-400 font-bold">{asset.ipAddress.replace(/\.\d+$/, '.250')}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 font-bold">Out-Of-Band Controller</span>
                      <span className="text-slate-300">iDRAC 9 Enterprise v5.10</span>
                    </div>
                    <div className="flex justify-between items-center border-t border-slate-850 pt-3">
                      <span className="text-slate-400">SSH Shell Access Port</span>
                      <span className="text-cyan-400">Port 22 SSHv2</span>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => alert(`Initiating out-of-band console tunnel to ${asset.ipAddress.replace(/\.\d+$/, '.250')}...`)}
                      className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg transition-all"
                    >
                      Launch OOB HTML5 Console
                    </button>
                    <button
                      onClick={() => alert('Sending magic Wake-On-LAN broadcast frame...')}
                      className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-all"
                    >
                      Power Cycle Node
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Management Section */}
            {activeMenu === 'management' && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div className="border-b border-slate-800 pb-3">
                  <h3 className="font-sans font-bold text-slate-100 flex items-center gap-2 text-base">
                    <Briefcase className="w-5 h-5 text-indigo-400" /> Commercial & Asset Management
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">Tracks hardware procurement dates, corporate warranty intervals, and depreciation.</p>
                </div>

                <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 space-y-4 font-mono text-xs">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-3 bg-slate-900 border border-slate-850 rounded-lg">
                      <span className="text-[10px] text-slate-500 block uppercase font-bold">Serial Number</span>
                      <span className="text-slate-200 font-bold">{asset.serialNumber || 'SN-DEB-1082-CA'}</span>
                    </div>
                    <div className="p-3 bg-slate-900 border border-slate-850 rounded-lg">
                      <span className="text-[10px] text-slate-500 block uppercase font-bold">Purchase Date</span>
                      <span className="text-slate-200 font-bold">2025-08-12</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    <div className="p-3 bg-slate-900 border border-slate-850 rounded-lg">
                      <span className="text-[10px] text-slate-500 block uppercase font-bold">Warranty Period</span>
                      <span className="text-emerald-400 font-bold">3 Years (Active until 2028)</span>
                    </div>
                    <div className="p-3 bg-slate-900 border border-slate-850 rounded-lg flex flex-col justify-between">
                      <div>
                        <span className="text-[10px] text-slate-500 block uppercase font-bold">Assigned Technician</span>
                        <span className="text-slate-200 font-bold">{asset.assignedTo || 'Unassigned'}</span>
                      </div>
                      <button
                        type="button"
                        onClick={handleTriggerSmartReassign}
                        className="mt-3.5 w-full py-1.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded font-mono text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 shadow transition-all cursor-pointer"
                      >
                        <Cpu className="w-3.5 h-3.5" /> Smart Reassign
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Contracts Section */}
            {activeMenu === 'contracts' && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div className="border-b border-slate-800 pb-3">
                  <h3 className="font-sans font-bold text-slate-100 flex items-center gap-2 text-base">
                    <FileText className="w-5 h-5 text-amber-500" /> Vendor Support Contracts
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">Linked maintenance agreements, SLA levels, and manufacturer contacts.</p>
                </div>

                <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 space-y-4">
                  <div className="p-4 bg-slate-900 border border-slate-850 rounded-lg space-y-3 font-mono text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Contract Reference</span>
                      <strong className="text-slate-100">CONT-2026-CHAUVET-GOLD</strong>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Support Level Agreement</span>
                      <strong className="text-emerald-400">SLA Gold - 4-Hour Response</strong>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Annual Cost</span>
                      <strong className="text-slate-200">$1,450.00 / year</strong>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Vendor Helpdesk</span>
                      <strong className="text-cyan-400">support@chauvet-professional.com</strong>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Documents Section */}
            {activeMenu === 'documents' && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div className="border-b border-slate-800 pb-3">
                  <h3 className="font-sans font-bold text-slate-100 flex items-center gap-2 text-base">
                    <File className="w-5 h-5 text-indigo-400" /> Linked Documents & Diagrams
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">Upload and access circuit diagrams, configuration backups, or device manuals.</p>
                </div>

                <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 space-y-4">
                  <div className="divide-y divide-slate-850">
                    {documents.map((docItem) => (
                      <div key={docItem.id} className="py-3 flex justify-between items-center font-mono text-xs">
                        <div>
                          <span className="font-bold text-slate-200">{docItem.name}</span>
                          <span className="text-slate-500 block text-[11px]">Size: {docItem.size} | Uploaded: {docItem.date}</span>
                        </div>
                        <button
                          onClick={() => setDocuments(prev => prev.filter(d => d.id !== docItem.id))}
                          className="text-slate-500 hover:text-red-400 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!newDocName.trim()) return;
                      setDocuments(prev => [...prev, { id: `doc-${Date.now()}`, name: newDocName, size: '4.2 MB', type: 'PDF', date: new Date().toISOString().substring(0, 10) }]);
                      setNewDocName('');
                    }}
                    className="pt-4 border-t border-slate-800 flex gap-2"
                  >
                    <input
                      type="text"
                      placeholder="Add document name (e.g., Rack_B_Topology.vsd)"
                      value={newDocName}
                      onChange={(e) => setNewDocName(e.target.value)}
                      className="flex-1 bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200"
                    />
                    <button
                      type="submit"
                      className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-mono font-bold rounded flex items-center gap-1 shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" /> Attach Document
                    </button>
                  </form>
                </div>
              </motion.div>
            )}

            {/* Virtualization Section */}
            {activeMenu === 'virtualization' && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div className="border-b border-slate-800 pb-3">
                  <h3 className="font-sans font-bold text-slate-100 flex items-center gap-2 text-base">
                    <Globe className="w-5 h-5 text-emerald-400" /> Virtualization & Container Engines
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">Inspects virtual machines or docker microservices active on this system.</p>
                </div>

                <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 space-y-4">
                  {asset.category?.toLowerCase() === 'switch' ? (
                    <div className="py-6 text-center text-slate-500 text-xs font-mono">
                      No virtualization hypervisor active on network switches. This is a dedicated hardware segment.
                    </div>
                  ) : (
                    <div className="space-y-3 font-mono text-xs">
                      <div className="p-3 bg-slate-900 border border-slate-850 rounded-lg flex justify-between items-center">
                        <div>
                          <span className="text-[10px] text-slate-500 block">CONTAINERIZED DAEMON</span>
                          <span className="text-slate-200 font-bold">artnet_transceiver_v4</span>
                        </div>
                        <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-bold">RUNNING</span>
                      </div>
                      <div className="p-3 bg-slate-900 border border-slate-850 rounded-lg flex justify-between items-center">
                        <div>
                          <span className="text-[10px] text-slate-500 block">LIGHTING PROTOCOL MANAGER</span>
                          <span className="text-slate-200 font-bold">sacn_broadcaster_agent</span>
                        </div>
                        <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-bold">RUNNING</span>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* Antiviruses Section */}
            {activeMenu === 'antiviruses' && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div className="border-b border-slate-800 pb-3 flex justify-between items-center">
                  <div>
                    <h3 className="font-sans font-bold text-slate-100 flex items-center gap-2 text-base">
                      <Shield className="w-5 h-5 text-rose-500" /> Endpoint Protection & Antiviruses
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">Tracks threat definition signatures and triggers remote endpoint quick scans.</p>
                  </div>
                </div>

                <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 space-y-4 font-mono text-xs text-slate-300">
                  {antiviruses.map((anti, idx) => (
                    <div key={idx} className="p-4 bg-slate-900 border border-slate-850 rounded-lg space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">Shield Software</span>
                        <strong className="text-slate-200">{anti.name}</strong>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">Signature Definitions</span>
                        <strong className="text-slate-200">{anti.version}</strong>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">Engine Status</span>
                        <strong className="text-emerald-400">{anti.status}</strong>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">Last Scanned</span>
                        <strong className="text-slate-400">{anti.lastScan}</strong>
                      </div>
                    </div>
                  ))}

                  <div className="pt-2">
                    <button
                      onClick={() => {
                        setIsScanningVirus(true);
                        setScanVirusLog('Initializing virus scan... Scanning /bin, /usr/sbin, /var/log...');
                        setTimeout(() => {
                          setScanVirusLog('Scan complete! Checked 14,821 files. Threats Found: 0. Clean.');
                          setIsScanningVirus(false);
                          setAntiviruses(prev => [{ ...prev[0], lastScan: new Date().toISOString().substring(0, 16).replace('T', ' ') }]);
                        }, 2500);
                      }}
                      disabled={isScanningVirus}
                      className="w-full py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg transition-all"
                    >
                      {isScanningVirus ? 'Running ClamAV Scan...' : 'Trigger Endpoint Scan'}
                    </button>
                    {scanVirusLog && (
                      <div className="p-3 bg-slate-900 border border-slate-850 rounded-lg mt-3 text-[11px] text-cyan-400 leading-relaxed font-mono">
                        {scanVirusLog}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Knowledge Base Section */}
            {activeMenu === 'kb' && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div className="border-b border-slate-800 pb-3">
                  <h3 className="font-sans font-bold text-slate-100 flex items-center gap-2 text-base">
                    <BookOpen className="w-5 h-5 text-rose-500" /> Linked Knowledge Base Articles
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">Recommended technical articles and workarounds paired with this asset category.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {kbArticles.map((art, idx) => (
                    <div key={idx} className="bg-slate-950 p-4 border border-slate-800 rounded-lg space-y-2">
                      <span className="text-[10px] text-cyan-400 font-mono font-bold uppercase">TROUBLESHOOTING PROTOCOL</span>
                      <h4 className="font-bold text-slate-200 text-xs">{art.title}</h4>
                      <p className="text-[11px] text-slate-400 leading-relaxed">{art.desc}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Tickets Section */}
            {activeMenu === 'tickets' && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div className="border-b border-slate-800 pb-3">
                  <h3 className="font-sans font-bold text-slate-100 flex items-center gap-2 text-base">
                    <TicketIcon className="w-5 h-5 text-indigo-400" /> Active Operations Tickets
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">Helpdesk and fault tracking entries logged specifically for this asset.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* File Ticket Form */}
                  <div className="lg:col-span-1 bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-4">
                    <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider border-b border-slate-850 pb-2">Log Fault Incident</h4>
                    <form onSubmit={handleCreateQuickTicket} className="space-y-3">
                      <div>
                        <label className="block text-[10px] text-slate-500 font-mono mb-1">Ticket Subject</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Signal Jitter on Channel 3"
                          value={ticketName}
                          onChange={(e) => setTicketName(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-500 font-mono mb-1">Fault Description</label>
                        <textarea
                          placeholder="Provide error output, diagnostics, or port error states..."
                          value={ticketDesc}
                          onChange={(e) => setTicketDesc(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 min-h-[80px]"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] text-slate-500 font-mono mb-1">Priority</label>
                          <select
                            value={ticketPriority}
                            onChange={(e) => setTicketPriority(e.target.value as any)}
                            className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1.5 text-xs text-slate-200"
                          >
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                            <option value="critical">Critical</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-500 font-mono mb-1">Domain</label>
                          <select
                            value={ticketCategory}
                            onChange={(e) => setTicketCategory(e.target.value as any)}
                            className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1.5 text-xs text-slate-200"
                          >
                            <option value="Hardware">Hardware</option>
                            <option value="Network">Network</option>
                            <option value="Power">Power</option>
                            <option value="Lighting">Lighting</option>
                            <option value="Audio">Audio</option>
                            <option value="Special Effects">Special Effects</option>
                          </select>
                        </div>
                      </div>
                      <button
                        type="submit"
                        className="w-full py-2 bg-rose-600 hover:bg-rose-500 text-white font-mono text-xs font-bold rounded uppercase transition-all mt-2 cursor-pointer"
                      >
                        File Helpdesk Ticket
                      </button>
                    </form>
                  </div>

                  {/* Incident Records */}
                  <div className="lg:col-span-2 bg-slate-950 p-4 rounded-xl border border-slate-800">
                    <span className="text-xs text-slate-300 font-bold uppercase tracking-wider block mb-4 border-b border-slate-850 pb-2">Logged Incident Records ({assetTickets.length})</span>
                    <div className="space-y-3 font-mono text-xs">
                      {assetTickets.length === 0 ? (
                        <div className="text-center py-10 text-slate-500 border border-dashed border-slate-800 rounded-lg">
                          No outstanding support or fault tickets logged for this asset node. All systems stable.
                        </div>
                      ) : (
                        assetTickets.map((t) => (
                          <div key={t.id} className="p-3 bg-slate-900/60 border border-slate-850 rounded-lg space-y-1.5">
                            <div className="flex justify-between flex-wrap gap-2">
                              <span className="font-bold text-slate-200">{t.name}</span>
                              <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                                t.priority === 'critical' ? 'bg-rose-500/20 text-rose-400' : 'bg-slate-800 text-slate-400'
                              }`}>{t.priority}</span>
                            </div>
                            <p className="text-[11px] text-slate-400 leading-relaxed font-sans">{t.description}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Problems Section */}
            {activeMenu === 'problems' && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div className="border-b border-slate-800 pb-3">
                  <h3 className="font-sans font-bold text-slate-100 flex items-center gap-2 text-base">
                    <AlertCircle className="w-5 h-5 text-rose-500" /> Active Operations Problems
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">Identified structural problems or chronic faults currently requiring root cause investigation.</p>
                </div>

                <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 space-y-4">
                  <div className="p-4 bg-slate-900 border border-slate-850 rounded-lg border-l-4 border-l-amber-500 space-y-2 font-mono text-xs">
                    <span className="text-[10px] text-amber-400 font-bold uppercase">PROBLEM ROOT CAUSE ANALYSIS</span>
                    <h4 className="font-bold text-slate-200">PROB-412: Unstable DHCP Leases during VLAN Trunks Flapping</h4>
                    <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                      Device shifts its lease IP when core Cisco network interfaces flap. Temporary mitigation is to bind the MAC to static DHCP reservations.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Changes Section */}
            {activeMenu === 'changes' && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div className="border-b border-slate-800 pb-3">
                  <h3 className="font-sans font-bold text-slate-100 flex items-center gap-2 text-base">
                    <History className="w-5 h-5 text-indigo-400" /> RFC & Change History
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">Change requests, scheduled patch upgrades, and scheduled system maintenance logs.</p>
                </div>

                <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 space-y-4">
                  <div className="space-y-3 font-mono text-xs">
                    <div className="p-3 bg-slate-900/60 border border-slate-850 rounded-lg flex justify-between items-center">
                      <div>
                        <span className="text-[10px] text-slate-500 block">SCHEDULED MAINTENANCE</span>
                        <span className="text-slate-200 font-bold">Art-Net Firmware Patch Upgrade</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-bold bg-slate-950 px-2 py-0.5 rounded border border-slate-800">2026-07-15 01:00</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Links Section */}
            {activeMenu === 'links' && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div className="border-b border-slate-800 pb-3">
                  <h3 className="font-sans font-bold text-slate-100 flex items-center gap-2 text-base">
                    <LinkIcon className="w-5 h-5 text-rose-500" /> Associated External Web Links
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">Useful web admin console channels or manufacturer product portals.</p>
                </div>

                <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 space-y-4 font-mono text-xs text-slate-300">
                  <div className="space-y-3">
                    <a
                      href={`http://${asset.ipAddress}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-3 bg-slate-900 border border-slate-850 hover:border-slate-800 rounded-lg flex justify-between items-center transition-all"
                    >
                      <div>
                        <span className="font-bold text-slate-200">Local Device HTTP Web Console</span>
                        <span className="text-[10px] text-slate-500 block mt-0.5">http://{asset.ipAddress}</span>
                      </div>
                      <ExternalLink className="w-4 h-4 text-cyan-400" />
                    </a>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Certificates Section */}
            {activeMenu === 'certificates' && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div className="border-b border-slate-800 pb-3">
                  <h3 className="font-sans font-bold text-slate-100 flex items-center gap-2 text-base">
                    <FileKey className="w-5 h-5 text-amber-500" /> SSL/TLS Security Certificates
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">SSL keys and security certificates configured for https operations on the device.</p>
                </div>

                <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 space-y-4 font-mono text-xs">
                  <div className="p-4 bg-slate-900 border border-slate-850 rounded-lg space-y-3">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Issuer Common Name</span>
                      <strong className="text-slate-200">Kynren CA Root</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Expiration Date</span>
                      <strong className="text-rose-400">2027-02-12 (Valid)</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Encryption Standard</span>
                      <strong className="text-slate-200">RSA 2048-bit (SHA256withRSA)</strong>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Notes Section */}
            {activeMenu === 'notes' && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div className="border-b border-slate-800 pb-3">
                  <h3 className="font-sans font-bold text-slate-100 flex items-center gap-2 text-base">
                    <StickyNote className="w-5 h-5 text-indigo-400" /> Rich Operator Notes
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">Operator notes are persisted securely to Firestore for synchronization across all staff accounts.</p>
                </div>

                <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 space-y-4">
                  <div>
                    <label className="block text-[10px] text-slate-500 font-mono mb-1.5 uppercase font-bold">Operator Notebook & Comments</label>
                    <textarea
                      value={assetNotes}
                      onChange={(e) => setAssetNotes(e.target.value)}
                      placeholder="Enter technical comments, power outlet connections, or maintenance protocols..."
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg p-3 text-xs text-slate-200 font-mono min-h-[160px] focus:outline-none focus:border-rose-500"
                    />
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={handleSaveNotes}
                      disabled={isSavingNotes}
                      className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-mono text-xs font-bold rounded-lg uppercase flex items-center gap-1.5 transition-all"
                    >
                      <CheckCircle className="w-4 h-4" />
                      {isSavingNotes ? 'Saving Notes...' : 'Commit Notes'}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Reservations Section */}
            {activeMenu === 'reservations' && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div className="border-b border-slate-800 pb-3">
                  <h3 className="font-sans font-bold text-slate-100 flex items-center gap-2 text-base">
                    <Calendar className="w-5 h-5 text-rose-500" /> Booking & Show Reservations
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">Logs scheduled booking periods where this specific asset is isolated for rehearsal or show events.</p>
                </div>

                <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 space-y-4">
                  <div className="p-4 bg-slate-900 border border-slate-850 rounded-lg space-y-2 font-mono text-xs">
                    <div className="flex justify-between font-bold text-slate-200">
                      <span>Show Event: Rehearsal Loop</span>
                      <span className="text-emerald-400">Reserved</span>
                    </div>
                    <p className="text-slate-400 text-[11px] leading-normal">
                      Reserved by: <strong className="text-slate-300">Staging Lead</strong> | Interval: <strong className="text-cyan-400">2026-07-02 18:00 - 22:00</strong>
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Domains Section */}
            {activeMenu === 'domains' && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div className="border-b border-slate-800 pb-3">
                  <h3 className="font-sans font-bold text-slate-100 flex items-center gap-2 text-base">
                    <Globe className="w-5 h-5 text-amber-500" /> DNS Domain Names
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">DNS domains or reverse domain mapping registered for the device IP.</p>
                </div>

                <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 space-y-4 font-mono text-xs">
                  <div className="p-3.5 bg-slate-900 border border-slate-850 rounded-lg flex justify-between items-center">
                    <div>
                      <span className="text-[10px] text-slate-500 block">REVERSE DNS PTR RECORD</span>
                      <span className="text-slate-200 font-bold">{asset.name.toLowerCase().replace(/\s+/g, '-')}.kynren.internal</span>
                    </div>
                    <span className="text-[10px] text-slate-500">Local Domain</span>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Appliances Section */}
            {activeMenu === 'appliances' && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div className="border-b border-slate-800 pb-3">
                  <h3 className="font-sans font-bold text-slate-100 flex items-center gap-2 text-base">
                    <Wrench className="w-5 h-5 text-indigo-400" /> Integrated Software Appliances
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">Tracks specialized soft-appliances running on this hardware node.</p>
                </div>

                <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 text-center py-8 text-slate-500 text-xs font-mono">
                  No specialized appliance firmware profiles associated with this asset.
                </div>
              </motion.div>
            )}

            {/* Database Instances Section */}
            {activeMenu === 'db_instances' && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div className="border-b border-slate-800 pb-3">
                  <h3 className="font-sans font-bold text-slate-100 flex items-center gap-2 text-base">
                    <Database className="w-5 h-5 text-rose-500" /> Active Database Instances
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">Database engines, custom connection strings, and status channels active on the device.</p>
                </div>

                <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 space-y-4">
                  <div className="divide-y divide-slate-850">
                    {dbInstances.length > 0 ? (
                      dbInstances.map((dbInst) => (
                        <div key={dbInst.id} className="py-3 flex justify-between items-center font-mono text-xs">
                          <div>
                            <span className="font-bold text-slate-200">{dbInst.name}</span>
                            <span className="text-slate-500 block text-[11px]">Engine: {dbInst.engine} | Status: {dbInst.status}</span>
                          </div>
                          <button
                            onClick={() => setDbInstances(prev => prev.filter(d => d.id !== dbInst.id))}
                            className="text-slate-500 hover:text-red-400 p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))
                    ) : (
                      <div className="py-4 text-center text-slate-500 text-xs">No active database engines.</div>
                    )}
                  </div>

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!newDbName.trim()) return;
                      setDbInstances(prev => [...prev, { id: `db-${Date.now()}`, engine: newDbEngine || 'PostgreSQL 15', name: newDbName, status: 'Active' }]);
                      setNewDbName('');
                      setNewDbEngine('');
                    }}
                    className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row gap-2"
                  >
                    <input
                      type="text"
                      placeholder="Database Name"
                      value={newDbName}
                      onChange={(e) => setNewDbName(e.target.value)}
                      className="flex-1 bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200"
                    />
                    <input
                      type="text"
                      placeholder="Engine (e.g., SQLite 3)"
                      value={newDbEngine}
                      onChange={(e) => setNewDbEngine(e.target.value)}
                      className="flex-1 bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 font-mono"
                    />
                    <button
                      type="submit"
                      className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-mono font-bold rounded flex items-center gap-1 shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" /> Deploy Schema
                    </button>
                  </form>
                </div>
              </motion.div>
            )}

            {/* Location History & Schematic Map Section */}
            {activeMenu === 'location_history' && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div className="border-b border-slate-800 pb-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <div>
                    <h3 className="font-sans font-bold text-slate-100 flex items-center gap-2 text-base">
                      <MapPin className="w-5 h-5 text-rose-500 animate-bounce" /> Location History & Showground Map
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Chronological history of coordinate movements and spatial deployments on Flatts Farm showground.
                    </p>
                  </div>
                  
                  <button
                    onClick={async () => {
                      // Simulate move
                      const newX = Math.round(20 + Math.random() * 60);
                      const newY = Math.round(20 + Math.random() * 60);
                      const locNames = [
                        'Durham Castle Backdrop Wing',
                        'Central Performance Lake Front',
                        'Grandstand Seating Area B',
                        'East Wing Pyrotechnic Platform',
                        'West Gate Laser Array Hub',
                        'Flatts Farm Stage Center Loop'
                      ];
                      const randomLoc = locNames[Math.floor(Math.random() * locNames.length)];
                      
                      try {
                        const locHistId = `loc-${Date.now()}`;
                        await setDoc(doc(db, 'location_history', locHistId), {
                          id: locHistId,
                          assetId: asset.id,
                          assetName: asset.name,
                          x: newX,
                          y: newY,
                          timestamp: new Date().toISOString(),
                          operator: 'Seth Boa Amponsem',
                          locationName: `${randomLoc} [${newX}%, ${newY}%]`
                        });
                        
                        // Fetch history again
                        const q = collection(db, 'location_history');
                        const snapshot = await getDocs(q);
                        const docsList = snapshot.docs.map(doc => doc.data());
                        const filtered = docsList
                          .filter((doc: any) => doc.assetId === asset.id)
                          .sort((a: any, b: any) => b.timestamp.localeCompare(a.timestamp));
                        setLocationLogs(filtered);
                      } catch (err) {
                        console.error('Failed to write mock position:', err);
                      }
                    }}
                    className="px-3 py-1.5 bg-rose-600/20 hover:bg-rose-600 text-rose-400 hover:text-white text-xs font-mono font-bold rounded-lg border border-rose-500/30 transition-all flex items-center gap-1.5 cursor-pointer uppercase shrink-0"
                  >
                    <Compass className="w-3.5 h-3.5" /> Simulate Move Event
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Miniature Schematic Map */}
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3 flex flex-col">
                    <span className="text-[10px] text-slate-400 font-mono font-bold uppercase tracking-widest flex items-center gap-1.5">
                      <Compass className="w-3.5 h-3.5 text-rose-400" /> Schematic Kynren Showground Live Tracker
                    </span>
                    
                    <div className="relative w-full h-[300px] bg-slate-950 rounded-lg overflow-hidden border border-slate-850 select-none shadow-inner flex-1">
                      {/* Showground Schematic Vector Overlay */}
                      <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
                        {/* Central Lake ellipse */}
                        <ellipse cx="50%" cy="55%" rx="35%" ry="20%" className="fill-cyan-950/20 stroke-cyan-500/15 stroke-1 stroke-dasharray-[4_4]" />
                        
                        {/* Seating / Grandstand representation */}
                        <path d="M 20 280 Q 50 265 80 280" className="stroke-slate-800 fill-none" strokeWidth="5" />
                        
                        {/* Castle Backdrop */}
                        <rect x="5%" y="8%" width="90" height="35" rx="3" className="fill-slate-900/60 stroke-slate-800" strokeWidth="1" />
                        <polygon points="5,43 25,25 45,43" className="fill-slate-850/40 stroke-slate-800" />
                        
                        {/* Texts */}
                        <text x="50%" y="94%" textAnchor="middle" className="fill-slate-600 text-[9px] font-sans font-bold uppercase tracking-wider">Grandstand Tribune</text>
                        <text x="50%" y="56%" textAnchor="middle" className="fill-cyan-500/30 text-[9px] font-mono tracking-widest uppercase">Performance Lake</text>
                        <text x="20%" y="16%" className="fill-slate-500 text-[8px] font-mono tracking-wider">Auckland Castle Backdrop</text>
                        
                        {/* Geofence Boundary Outline */}
                        <rect x="20%" y="20%" width="60%" height="60%" className="fill-none stroke-rose-500/15 stroke-1 stroke-dasharray-[4_4]" />
                      </svg>
                      
                      {/* Flashing locator PIN */}
                      {(() => {
                        const x = asset.coordinates?.x !== undefined ? asset.coordinates.x : 50;
                        const y = asset.coordinates?.y !== undefined ? asset.coordinates.y : 50;
                        return (
                          <div
                            className="absolute pointer-events-none z-10 transition-all duration-700"
                            style={{
                              left: `${x}%`,
                              top: `${y}%`,
                              transform: 'translate(-50%, -100%)'
                            }}
                          >
                            <div className="relative flex flex-col items-center">
                              {/* Pulsing visual halo */}
                              <span className="absolute bottom-0 w-8 h-8 bg-rose-500/30 rounded-full animate-ping" />
                              <span className="absolute bottom-1 w-2 h-2 bg-rose-500 rounded-full" />
                              
                              <div className="bg-rose-600 text-white font-mono text-[9px] font-bold px-2 py-0.5 rounded shadow-lg border border-rose-400 flex items-center gap-1 uppercase whitespace-nowrap mb-1">
                                <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" /> {asset.name}
                              </div>
                              <MapPin className="w-5 h-5 text-rose-500 fill-rose-500 filter drop-shadow-md" />
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                    
                    <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-850 font-mono text-[11px] text-slate-400 space-y-1">
                      <div className="flex justify-between">
                        <span>Current Coordinates:</span>
                        <span className="text-rose-400 font-bold">X: {asset.coordinates?.x || 50}%, Y: {asset.coordinates?.y || 50}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Physical Location Group:</span>
                        <span className="text-slate-200">{asset.location || 'Central Stage'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Location History Logs list */}
                  <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 space-y-4 flex flex-col justify-between">
                    <div className="space-y-3">
                      <span className="text-[10px] text-slate-400 font-mono font-bold uppercase tracking-widest flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-indigo-400" /> Chronological Movement History
                      </span>
                      
                      <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                        {isLoadingHistory ? (
                          <div className="py-12 text-center text-slate-500 font-mono text-xs animate-pulse">Loading location logs...</div>
                        ) : locationLogs.length > 0 ? (
                          locationLogs.map((log) => (
                            <div key={log.id} className="p-3 bg-slate-900/60 border border-slate-850 rounded-lg flex justify-between items-start gap-4">
                              <div className="font-mono text-xs">
                                <span className="text-[10px] text-slate-500 block">
                                  {new Date(log.timestamp).toLocaleString()}
                                </span>
                                <div className="text-slate-200 font-bold mt-1">{log.locationName}</div>
                                {log.x && log.y && (
                                  <span className="text-[10px] text-slate-400 block mt-0.5">
                                    Canvas Coordinates: ({log.x}%, {log.y}%)
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded font-bold border border-indigo-500/20 shrink-0">
                                {log.operator || 'Seth Boa Amponsem'}
                              </span>
                            </div>
                          ))
                        ) : (
                          <div className="py-12 text-center text-slate-500 font-mono text-xs space-y-2">
                            <div>No movement history exists for this asset.</div>
                            <div className="text-[10px] text-slate-600">Simulate a move to initialize tracking logs.</div>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="text-[10px] font-mono text-slate-500 border-t border-slate-900 pt-3">
                      * Position tracking is automated and stored persistently in Cloud Firestore.
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Historical Changelog Section */}
            {activeMenu === 'historical' && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div className="border-b border-slate-800 pb-3">
                  <h3 className="font-sans font-bold text-slate-100 flex items-center gap-2 text-base">
                    <Clock className="w-5 h-5 text-indigo-400" /> Historical Audit changelog
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">Audit log of system configurations, edits, and staff assignments.</p>
                </div>

                <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 space-y-3 font-mono text-xs text-slate-300">
                  {historyLogs.map((log, idx) => (
                    <div key={idx} className="p-3 bg-slate-900/50 border border-slate-850 rounded-lg flex justify-between items-start gap-4">
                      <div>
                        <span className="text-[10px] text-slate-500 block">{log.date}</span>
                        <p className="text-slate-200 mt-0.5">{log.event}</p>
                      </div>
                      <span className="text-[10px] text-rose-400 font-bold shrink-0">{log.user}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* ALL Combined Tab */}
            {activeMenu === 'all' && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-12"
              >
                <div className="border-b border-slate-800 pb-3">
                  <h3 className="font-sans font-bold text-slate-100 flex items-center gap-2 text-base">
                    <List className="w-5 h-5 text-rose-500 animate-pulse" /> Comprehensive Asset Profile Overview
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">Scrollable full inspection registry displaying all system tabs simultaneously.</p>
                </div>

                {/* Render Sections sequentially */}
                <div className="space-y-8 divide-y divide-slate-800">
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold text-rose-400 uppercase tracking-widest flex items-center gap-1.5"><Zap className="w-4 h-4" /> Impact Analysis</h4>
                    <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3 font-mono text-xs">
                      <p className="text-slate-400">Upstream gateway dependencies: 10.12.1.1 (ONLINE). Outage of this unit will disrupt sub-trunks.</p>
                    </div>
                  </div>

                  <div className="space-y-4 pt-6">
                    <h4 className="text-xs font-bold text-rose-400 uppercase tracking-widest flex items-center gap-1.5"><Layers className="w-4 h-4" /> Operating Systems</h4>
                    <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2 font-mono text-xs text-slate-300">
                      <div>OS: {osName}</div>
                      <div>Kernel: {osKernel}</div>
                    </div>
                  </div>

                  <div className="space-y-4 pt-6">
                    <h4 className="text-xs font-bold text-rose-400 uppercase tracking-widest flex items-center gap-1.5"><Cpu className="w-4 h-4" /> Physical Components</h4>
                    <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2 font-mono text-xs text-slate-300">
                      {components.map((c, idx) => (
                        <div key={idx}>• {c.name} ({c.spec})</div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4 pt-6">
                    <h4 className="text-xs font-bold text-rose-400 uppercase tracking-widest flex items-center gap-1.5"><HardDrive className="w-4 h-4" /> Volumes</h4>
                    <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2 font-mono text-xs text-slate-300">
                      {volumes.map((v, idx) => (
                        <div key={idx}>• {v.mount} - {v.used} of {v.size} ({v.type})</div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4 pt-6">
                    <h4 className="text-xs font-bold text-rose-400 uppercase tracking-widest flex items-center gap-1.5"><Code className="w-4 h-4" /> Software</h4>
                    <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2 font-mono text-xs text-slate-300">
                      {software.map((s, idx) => (
                        <div key={idx}>• {s.name} ({s.version})</div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4 pt-6">
                    <h4 className="text-xs font-bold text-rose-400 uppercase tracking-widest flex items-center gap-1.5"><StickyNote className="w-4 h-4" /> Notes</h4>
                    <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-slate-300 whitespace-pre-wrap leading-relaxed">
                      {assetNotes || 'No notes written.'}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>

      {/* Smart Reassign Suggestion Modal */}
      <AnimatePresence>
        {isSmartReassignOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-950 border border-slate-800 rounded-xl p-5 w-full max-w-md shadow-2xl space-y-4"
            >
              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Cpu className="w-5 h-5 text-indigo-400 animate-pulse" />
                  <h4 className="font-sans font-bold text-slate-100 text-sm uppercase tracking-wider">AI Smart Reassign</h4>
                </div>
                <button
                  type="button"
                  onClick={() => setIsSmartReassignOpen(false)}
                  className="text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed font-sans">
                Analyzing team workload and technical historical experience on <strong className="text-rose-400">{asset.category || 'General'}</strong> hardware:
              </p>

              <div className="space-y-3 max-h-60 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-850">
                {reassignSuggestions.map((candidate, idx) => {
                  const isTop = idx === 0;
                  return (
                    <div 
                      key={candidate.user.id}
                      className={`p-3 rounded-lg border transition-all flex justify-between items-center ${
                        isTop 
                          ? 'bg-indigo-950/40 border-indigo-500/40 shadow-md shadow-indigo-950/20' 
                          : 'bg-slate-900/60 border-slate-850 hover:border-slate-800'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <img 
                            src={candidate.user.profileImage} 
                            alt={candidate.user.displayName} 
                            className="w-5 h-5 rounded-full object-cover border border-white/10" 
                          />
                          <span className="font-semibold text-slate-200 text-xs font-sans">{candidate.user.displayName}</span>
                          {isTop && (
                            <span className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[8px] font-mono font-bold px-1 rounded uppercase">Recommended</span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-[10px] text-slate-400 font-mono">
                          <span>Active: {candidate.activeLoad} tickets</span>
                          <span>•</span>
                          <span>Resolved: {candidate.resolvedCount}</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleConfirmSmartReassign(candidate.user.displayName)}
                        className={`px-3 py-1.5 rounded text-[10px] font-mono font-bold transition-all uppercase cursor-pointer ${
                          isTop 
                            ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow shadow-indigo-600/30' 
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                        }`}
                      >
                        Assign
                      </button>
                    </div>
                  );
                })}
              </div>

              <div className="text-[10px] text-slate-500 font-sans italic leading-tight pt-2 border-t border-slate-900">
                AI evaluation factors in real-time ticket queues and category proficiency metrics based on resolved tickets.
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

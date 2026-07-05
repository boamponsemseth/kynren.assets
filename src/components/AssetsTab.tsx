import React, { useState, useRef, useEffect, useMemo } from 'react';
import jsQR from 'jsqr';
import { motion, AnimatePresence } from 'motion/react';
import { Asset, UserRegistryItem, Ticket, DropdownOption } from '../types';
import { 
  Cpu, 
  Plus, 
  Trash2, 
  Copy, 
  Settings2, 
  Grid, 
  List, 
  MapPin, 
  Wrench, 
  Eye, 
  Sparkles, 
  Volume2, 
  ServerCrash,
  QrCode,
  Camera,
  X,
  Gem,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Ticket as TicketIcon,
  Activity,
  Map,
  Terminal,
  Network,
  Play,
  User,
  HardDrive,
  Wifi,
  Info,
  ChevronRight,
  ShieldAlert,
  Battery,
  BatteryCharging,
  ChevronUp,
  ChevronDown,
  Database,
  Printer,
  Download,
  Monitor,
  Phone,
  Server,
  Coins
} from 'lucide-react';
import { db, doc, setDoc } from '../firebase';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip,
  RadialBarChart,
  RadialBar,
  PolarAngleAxis
} from 'recharts';

interface AssetsTabProps {
  assets: Asset[];
  users: UserRegistryItem[];
  tickets: Ticket[];
  onAddAsset: (asset: Partial<Asset>) => void;
  onUpdateAsset: (id: string, updates: Partial<Asset>) => void;
  onDeleteAsset: (id: string) => void;
  onCloneAsset: (asset: Asset) => void;
  onCreateTicket: (ticket: Partial<Ticket>) => void;
  dropdowns?: DropdownOption[];
  onAddDropdownOption?: (categoryId: string, option: string) => Promise<void>;
  onAssetClick?: (asset: Asset) => void;
  onPrintReport?: (report: { title: string; headers: string[]; rows: string[][]; summaries: { label: string; value: string }[] }) => void;
}

const AssetStatusDot = ({ status }: { status: string }) => {
  const getDotColorClasses = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]';
      case 'maintenance':
        return 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]';
      case 'offline':
      default:
        return 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]';
    }
  };

  const getPulseRingColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'bg-emerald-500/40';
      case 'maintenance':
        return 'bg-amber-500/40';
      case 'offline':
      default:
        return 'bg-rose-500/40';
    }
  };

  return (
    <span className="relative flex h-2.5 w-2.5 items-center justify-center shrink-0">
      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 transition-all duration-500 ease-in-out ${getPulseRingColor(status)}`}></span>
      <span className={`relative inline-flex rounded-full h-2 w-2 transition-all duration-500 ease-in-out ${getDotColorClasses(status)}`} title={`Status: ${status}`} />
    </span>
  );
};

const getRelativeAge = (dateStr?: string) => {
  if (!dateStr) return null;
  const regDate = new Date(dateStr);
  if (isNaN(regDate.getTime())) return null;
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - regDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays >= 365) {
    const yrs = (diffDays / 365).toFixed(1).replace(/\.0$/, '');
    return `${yrs}yr`;
  } else if (diffDays >= 30) {
    const mos = Math.round(diffDays / 30);
    return `${mos}mo`;
  } else {
    return `${diffDays}d`;
  }
};

const compressImage = (file: File, maxWidth = 400, maxHeight = 400, quality = 0.7): Promise<string> => {
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

const TelemetrySparkline = ({ category, status }: { category: string; status: string }) => {
  const cat = (category || '').toLowerCase();
  let path = "M 0,10 L 100,10";
  let color = "#10b981";
  let text = "4ms 96% up";

  if (cat.includes('computer')) {
    path = "M 0,10 L 15,10 L 30,12 L 45,10 L 60,10 L 75,8 L 90,10 L 100,10";
    color = "#10b981";
    text = "4ms 92% up";
  } else if (cat.includes('phone')) {
    path = "M 0,10 Q 15,2 30,18 T 60,10 T 90,10 L 100,10";
    color = "#10b981";
    text = "14ms 96% up";
  } else if (cat.includes('printer')) {
    path = "M 0,10 L 15,2 L 30,18 L 45,2 L 60,18 L 75,2 L 90,18 L 100,10";
    color = "#f59e0b";
    text = "4ms 100% up";
  } else if (cat.includes('rack')) {
    path = "M 0,10 L 100,10";
    color = "#10b981";
    text = "3ms 96% up";
  } else if (cat.includes('switch') || cat.includes('network')) {
    path = "M 0,10 L 100,10";
    color = "#10b981";
    text = "2ms 96% up";
  } else if (cat.includes('till')) {
    path = "M 0,10 Q 15,2 30,18 T 60,10 T 90,10 L 100,10";
    color = "#10b981";
    text = "7ms 96% up";
  } else {
    path = "M 0,10 L 100,10";
    color = status === 'offline' ? '#f43f5e' : '#10b981';
    text = status === 'offline' ? '0ms 0% up' : '5ms 98% up';
  }

  return (
    <div className="flex items-center gap-2.5 w-28 justify-between select-none">
      <svg className="w-12 h-4 overflow-visible" viewBox="0 0 100 20">
        <path d={path} stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <div className="text-right leading-none flex flex-col">
        <span className="text-[10px] font-bold font-mono text-slate-300">{text.split(' ')[0]}</span>
        <span className="text-[8px] text-slate-500 font-mono font-medium whitespace-nowrap">{text.split(' ').slice(1).join(' ')}</span>
      </div>
    </div>
  );
};

export default function AssetsTab({
  assets,
  users,
  tickets = [],
  onAddAsset,
  onUpdateAsset,
  onDeleteAsset,
  onCloneAsset,
  onCreateTicket,
  dropdowns = [],
  onAddDropdownOption,
  onAssetClick,
  onPrintReport
}: AssetsTabProps) {
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [classFilter, setClassFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [custodyFilter, setCustodyFilter] = useState('all');
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Dragging map coordinates state
  const [isDraggingMap, setIsDraggingMap] = useState(false);

  // Bulk Action Confirmation Dialog State
  const [bulkConfirmAction, setBulkConfirmAction] = useState<{
    type: 'delete' | 'reassign' | 'status';
    techName?: string;
    statusVal?: string;
    count: number;
  } | null>(null);

  const mapRef = useRef<HTMLDivElement>(null);

  const handleMapPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!mapRef.current || !selectedAssetForConfig) return;
    setIsDraggingMap(true);
    mapRef.current.setPointerCapture(e.pointerId);
    updateCoordinatesFromEvent(e, selectedAssetForConfig.id);
  };

  const handleMapPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingMap || !selectedAssetForConfig) return;
    updateCoordinatesFromEvent(e, selectedAssetForConfig.id);
  };

  const handleMapPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingMap) return;
    setIsDraggingMap(false);
    if (mapRef.current) {
      mapRef.current.releasePointerCapture(e.pointerId);
    }
  };

  const updateCoordinatesFromEvent = (e: React.PointerEvent<HTMLDivElement>, assetId: string) => {
    if (!mapRef.current) return;
    const rect = mapRef.current.getBoundingClientRect();
    const xRaw = ((e.clientX - rect.left) / rect.width) * 100;
    const yRaw = ((e.clientY - rect.top) / rect.height) * 100;
    
    // Clamp coordinates to [0, 100]
    const x = Math.min(100, Math.max(0, Math.round(xRaw)));
    const y = Math.min(100, Math.max(0, Math.round(yRaw)));
    
    onUpdateAsset(assetId, {
      coordinates: { x, y }
    });
  };

  // Selected asset for displaying properties in side bar
  const [selectedAssetForConfig, setSelectedAssetForConfig] = useState<Asset | null>(null);
  const [sidebarTab, setSidebarTab] = useState<'profile' | 'performance' | 'floorplan' | 'console'>('profile');
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
  const [terminalInput, setTerminalInput] = useState('');
  const [isPinging, setIsPinging] = useState(false);
  const [isRebooting, setIsRebooting] = useState(false);
  const [customPingIp, setCustomPingIp] = useState('');

  useEffect(() => {
    if (selectedAssetForConfig) {
      setSidebarTab('profile');
      setTerminalLogs([
        `[SYSTEM DIAGNOSTICS INITIALIZED]`,
        `Ready. Session node: ${selectedAssetForConfig.id}`,
        `Host IP: ${selectedAssetForConfig.ipAddress}`,
        `Subsystem: ${selectedAssetForConfig.category}`,
        `State: ${selectedAssetForConfig.status.toUpperCase()}`,
        `Type 'help' or execute commands below.`
      ]);
      setTerminalInput('');
      setCustomPingIp(selectedAssetForConfig.ipAddress || '');
      setIsPinging(false);
      setIsRebooting(false);
    }
  }, [selectedAssetForConfig?.id]);

  // Deletion confirmation state
  const [assetToDelete, setAssetToDelete] = useState<Asset | null>(null);

  // Sorting State
  const [sortField, setSortField] = useState<'name' | 'ipAddress' | 'status' | 'lastSeen' | 'category' | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Multi-select Bulk Actions State
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([]);

  // Sorting Handler
  const handleSort = (field: 'name' | 'ipAddress' | 'status' | 'lastSeen' | 'category') => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // Real-time query search filtering
  const filteredAssets = useMemo(() => {
    let result = assets;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(a => 
        (a.name || '').toLowerCase().includes(query) ||
        (a.serialNumber || '').toLowerCase().includes(query) ||
        (a.ipAddress || '').toLowerCase().includes(query) ||
        (a.assignedTo || '').toLowerCase().includes(query) ||
        (a.category || '').toLowerCase().includes(query)
      );
    }
    if (dateFrom) {
      const fromTime = new Date(dateFrom).getTime();
      result = result.filter(a => {
        const d = a.registrationDate || a.lastSeen;
        return d ? new Date(d).getTime() >= fromTime : true;
      });
    }
    if (dateTo) {
      const toTime = new Date(dateTo).getTime() + 86400000;
      result = result.filter(a => {
        const d = a.registrationDate || a.lastSeen;
        return d ? new Date(d).getTime() <= toTime : true;
      });
    }
    if (classFilter !== 'all') {
      result = result.filter(a => (a.category || '').toLowerCase() === classFilter.toLowerCase());
    }
    if (statusFilter !== 'all') {
      result = result.filter(a => (a.status || '').toLowerCase() === statusFilter.toLowerCase());
    }
    if (custodyFilter === 'assigned') {
      result = result.filter(a => a.assignedTo && a.assignedTo !== '-- Unassigned --' && a.assignedTo !== '');
    } else if (custodyFilter === 'unassigned') {
      result = result.filter(a => !a.assignedTo || a.assignedTo === '-- Unassigned --' || a.assignedTo === '');
    }
    return result;
  }, [assets, searchQuery, dateFrom, dateTo, classFilter, statusFilter, custodyFilter]);

  // Sort Assets Computing Selector
  const sortedAssets = useMemo(() => {
    if (!sortField) return filteredAssets;
    return [...filteredAssets].sort((a, b) => {
      let valA = a[sortField] || '';
      let valB = b[sortField] || '';
      
      // Case-insensitive comparisons for strings
      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();
      
      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredAssets, sortField, sortOrder]);

  // Bulk operation triggers
  const handleBulkDelete = () => {
    setBulkConfirmAction({
      type: 'delete',
      count: selectedAssetIds.length
    });
  };

  const handleBulkReassign = (techName: string) => {
    setBulkConfirmAction({
      type: 'reassign',
      techName,
      count: selectedAssetIds.length
    });
  };

  const handleBulkStatusUpdate = (statusVal: string) => {
    setBulkConfirmAction({
      type: 'status',
      statusVal,
      count: selectedAssetIds.length
    });
  };

  const executeBulkDelete = async () => {
    const selectedAssetsList = assets.filter(a => selectedAssetIds.includes(a.id));
    const namesList = selectedAssetsList.map(a => `${a.name} (${a.ipAddress})`).join(', ');

    selectedAssetIds.forEach(id => {
      onDeleteAsset(id);
    });

    // Log bulk delete action to database
    try {
      const logId = `log-bulk-${Date.now()}`;
      await setDoc(doc(db, 'signal_logs', logId), {
        id: logId,
        timestamp: new Date().toISOString(),
        level: 'warn',
        source: 'Bulk Operations Unit',
        message: `Bulk Delete: Decommissioned and removed ${selectedAssetIds.length} assets: [${namesList}]. Action performed by Seth Boa Amponsem.`,
        user: 'Seth Boa Amponsem'
      });
    } catch (err) {
      console.error('Failed to log bulk delete:', err);
    }

    setSelectedAssetIds([]);
    setBulkConfirmAction(null);
  };

  const executeBulkReassign = async () => {
    if (!bulkConfirmAction?.techName) return;
    const tech = bulkConfirmAction.techName;
    const selectedAssetsList = assets.filter(a => selectedAssetIds.includes(a.id));
    const namesList = selectedAssetsList.map(a => `${a.name} (${a.ipAddress})`).join(', ');

    selectedAssetIds.forEach(id => {
      onUpdateAsset(id, { assignedTo: tech, technicianInCharge: tech });
    });

    // Log bulk reassign action to database
    try {
      const logId = `log-bulk-${Date.now()}`;
      await setDoc(doc(db, 'signal_logs', logId), {
        id: logId,
        timestamp: new Date().toISOString(),
        level: 'info',
        source: 'Bulk Operations Unit',
        message: `Bulk Reassign: Dispatched ${selectedAssetIds.length} assets to ${tech}: [${namesList}]. Action performed by Seth Boa Amponsem.`,
        user: 'Seth Boa Amponsem'
      });
    } catch (err) {
      console.error('Failed to log bulk reassign:', err);
    }

    setSelectedAssetIds([]);
    setBulkConfirmAction(null);
  };

  const executeBulkStatusUpdate = async () => {
    if (!bulkConfirmAction?.statusVal) return;
    const nextStatus = bulkConfirmAction.statusVal;
    const selectedAssetsList = assets.filter(a => selectedAssetIds.includes(a.id));
    const namesList = selectedAssetsList.map(a => `${a.name} (${a.ipAddress})`).join(', ');

    selectedAssetIds.forEach(id => {
      onUpdateAsset(id, { status: nextStatus as any });
    });

    // Log bulk status update action to database
    try {
      const logId = `log-bulk-${Date.now()}`;
      await setDoc(doc(db, 'signal_logs', logId), {
        id: logId,
        timestamp: new Date().toISOString(),
        level: 'info',
        source: 'Bulk Operations Unit',
        message: `Bulk Status Update: Changed status of ${selectedAssetIds.length} assets to ${nextStatus}: [${namesList}]. Action performed by Seth Boa Amponsem.`,
        user: 'Seth Boa Amponsem'
      });
    } catch (err) {
      console.error('Failed to log bulk status update:', err);
    }

    setSelectedAssetIds([]);
    setBulkConfirmAction(null);
  };

  // Selection toggle utilities
  const toggleSelectAsset = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedAssetIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    const activeIds = sortedAssets.map(a => a.id);
    const allSelected = activeIds.every(id => selectedAssetIds.includes(id));
    if (allSelected) {
      setSelectedAssetIds(prev => prev.filter(id => !activeIds.includes(id)));
    } else {
      setSelectedAssetIds(prev => {
        const unique = new Set([...prev, ...activeIds]);
        return Array.from(unique);
      });
    }
  };

  // Status visual indicator helper
  const getStatusDotColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]';
      case 'maintenance':
        return 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]';
      case 'offline':
      default:
        return 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]';
    }
  };

  // Combined asset health and tooltip helper
  const getAssetHealthAndTooltip = (asset: Asset) => {
    const isOffline = asset.status?.toLowerCase() === 'offline';
    const isMaint = asset.status?.toLowerCase() === 'maintenance';
    const bat = asset.batteryLevel !== undefined ? asset.batteryLevel : 100;
    
    let healthLabel = 'Healthy';
    let healthColor = 'text-emerald-400 bg-emerald-950/40 border-emerald-900/30';
    let tooltipText = '';

    if (isOffline) {
      healthLabel = 'Critical';
      healthColor = 'text-rose-400 bg-rose-950/40 border-rose-900/30';
      tooltipText = `Asset offline. Battery level is at ${bat}%. Urgent response recommended.`;
    } else if (bat < 20) {
      healthLabel = 'Warning';
      healthColor = 'text-amber-400 bg-amber-950/40 border-amber-900/30';
      tooltipText = `Asset active but battery is critically low (${bat}%). Recharge required.`;
    } else if (isMaint) {
      healthLabel = 'Degraded';
      healthColor = 'text-cyan-400 bg-cyan-950/40 border-cyan-900/30';
      tooltipText = `Asset undergoing standard diagnostics & maintenance. Battery: ${bat}%.`;
    } else if (bat < 50) {
      healthLabel = 'Fair';
      healthColor = 'text-yellow-400 bg-yellow-950/40 border-yellow-900/30';
      tooltipText = `Connectivity stable. Battery is at ${bat}%. Plan next service cycle.`;
    } else {
      healthLabel = 'Healthy';
      healthColor = 'text-emerald-400 bg-emerald-950/40 border-emerald-900/30';
      tooltipText = `Signal link: 100%. Power cell: ${bat}%. System fully operational.`;
    }

    return { label: healthLabel, colorClass: healthColor, tooltip: tooltipText };
  };

  // Sorting Header UI helper
  const renderSortableHeader = (field: 'name' | 'ipAddress' | 'status' | 'lastSeen' | 'category', label: string, className = "p-4") => {
    const isCurrent = sortField === field;
    return (
      <th 
        onClick={() => handleSort(field)} 
        className={`${className} cursor-pointer hover:text-rose-400 select-none transition-colors`}
      >
        <div className="flex items-center gap-1">
          <span>{label}</span>
          {isCurrent ? (
            sortOrder === 'asc' ? <ChevronUp className="w-3 h-3 text-rose-500 inline" /> : <ChevronDown className="w-3 h-3 text-rose-500 inline" />
          ) : (
            <span className="opacity-30 text-[9px] inline">⇅</span>
          )}
        </div>
      </th>
    );
  };

  // QR Scanner States
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannedAsset, setScannedAsset] = useState<Asset | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scannerFeedback, setScannerFeedback] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // New Ticket Quick Form State (inside scanner)
  const [isFilingQuickTicket, setIsFilingQuickTicket] = useState(false);
  const [quickTicketTitle, setQuickTicketTitle] = useState('');
  const [quickTicketPriority, setQuickTicketPriority] = useState<'low' | 'medium' | 'high' | 'critical'>('high');
  const [quickTicketDesc, setQuickTicketDesc] = useState('');

  // Form State
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Projector');
  const [status, setStatus] = useState('active');
  const [serialNumber, setSerialNumber] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [ipAddress, setIpAddress] = useState('');
  const [isHighValue, setIsHighValue] = useState(false);
  const [isWireless, setIsWireless] = useState(false);
  const [initialBatteryLevel, setInitialBatteryLevel] = useState(100);

  // New user requested states
  const [assetTag, setAssetTag] = useState('');
  const [featuredImage, setFeaturedImage] = useState<string>(''); // Base64 data-url
  const [galleryImages, setGalleryImages] = useState<string[]>([]); // Array of Base64 data-urls
  const [location, setLocation] = useState('');
  const [network, setNetwork] = useState('');
  const [comments, setComments] = useState('');
  const [groupInCharge, setGroupInCharge] = useState('');
  const [manufacturer, setManufacturer] = useState('');
  const [model, setModel] = useState('');
  const [group, setGroup] = useState('');

  // CSV Bulk Import states
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [csvRawText, setCsvRawText] = useState('');
  const [csvFileName, setCsvFileName] = useState<string | null>(null);
  const [parsedAssets, setParsedAssets] = useState<Partial<Asset>[]>([]);
  const [csvError, setCsvError] = useState<string | null>(null);
  const [mappedFields, setMappedFields] = useState<Record<string, string>>({});
  const [isDragging, setIsDragging] = useState(false);

  const parseCSVContent = (text: string) => {
    setCsvError(null);
    setParsedAssets([]);
    
    if (!text.trim()) {
      setCsvError("CSV text is empty.");
      return;
    }

    try {
      const lines = text.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);
      if (lines.length < 2) {
        setCsvError("CSV must contain at least a header row and one data row.");
        return;
      }

      const rawHeaders = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
      const mappings: Record<string, string> = {};
      const targetFields = [
        { key: 'name', patterns: ['name', 'title', 'device', 'label'] },
        { key: 'category', patterns: ['category', 'type', 'group'] },
        { key: 'status', patterns: ['status', 'state', 'condition'] },
        { key: 'serialNumber', patterns: ['serialnumber', 'serial', 'sn', 'serial_number', 'id'] },
        { key: 'assignedTo', patterns: ['assignedto', 'assigned_to', 'officer', 'technician', 'user', 'assignee', 'charge', 'technician_in_charge'] },
        { key: 'ipAddress', patterns: ['ipaddress', 'ip_address', 'ip', 'host'] },
        { key: 'isHighValue', patterns: ['ishighvalue', 'high_value', 'highvalue', 'critical_asset', 'gem'] },
        { key: 'isWireless', patterns: ['iswireless', 'wireless', 'wifi'] },
        { key: 'batteryLevel', patterns: ['batterylevel', 'battery', 'battery_level', 'charge'] }
      ];

      rawHeaders.forEach(header => {
        const normalized = header.toLowerCase().replace(/[\s_-]/g, '');
        const matchedField = targetFields.find(tf => 
          tf.patterns.includes(normalized) || normalized.includes(tf.key.toLowerCase())
        );
        if (matchedField) {
          mappings[header] = matchedField.key;
        }
      });

      setMappedFields(mappings);

      const items: Partial<Asset>[] = [];
      for (let i = 1; i < lines.length; i++) {
        const rowValues = [];
        let currentVal = '';
        let inQuotes = false;
        const line = lines[i];

        for (let j = 0; j < line.length; j++) {
          const char = line[j];
          if (char === '"' || char === "'") {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            rowValues.push(currentVal.trim().replace(/^["']|["']$/g, ''));
            currentVal = '';
          } else {
            currentVal += char;
          }
        }
        rowValues.push(currentVal.trim().replace(/^["']|["']$/g, ''));

        if (rowValues.length < rawHeaders.length) {
          continue;
        }

        const item: any = {
          status: 'active',
          isHighValue: false,
          isWireless: false,
          batteryLevel: 100,
          connectivityStatus: 'online'
        };

        rawHeaders.forEach((header, idx) => {
          const fieldKey = mappings[header];
          if (!fieldKey) return;

          const val = rowValues[idx];
          if (fieldKey === 'isHighValue' || fieldKey === 'isWireless') {
            item[fieldKey] = val.toLowerCase() === 'true' || val === '1' || val.toLowerCase() === 'yes';
          } else if (fieldKey === 'batteryLevel') {
            item[fieldKey] = parseInt(val, 10) || 100;
          } else {
            item[fieldKey] = val;
          }
        });

        if (!item.name) {
          item.name = `Imported Asset #${i}`;
        }
        if (!item.serialNumber) {
          item.serialNumber = `SN-${Math.floor(100000 + Math.random() * 900000)}`;
        }

        items.push(item);
      }

      setParsedAssets(items);
    } catch (err: any) {
      setCsvError(`Parsing failed: ${err.message}`);
    }
  };

  // Plus icon popup modal state
  const [plusCategory, setPlusCategory] = useState<{ id: string; label: string } | null>(null);
  const [plusInput, setPlusInput] = useState('');

  const getDropdownOptions = (categoryId: string): string[] => {
    const found = dropdowns.find(d => d.id === categoryId);
    return found ? found.options : [];
  };

  const renderDropdownField = (
    label: string, 
    categoryId: string, 
    value: string, 
    onChange: (val: string) => void,
    placeholder: string = "Select..."
  ) => {
    const options = getDropdownOptions(categoryId);
    return (
      <div className="relative">
        <div className="flex justify-between items-center mb-1">
          <label className="block text-[10px] text-slate-400 font-mono">{label}</label>
          <button
            type="button"
            onClick={() => {
              setPlusCategory({ id: categoryId, label });
              setPlusInput('');
            }}
            className="text-rose-400 hover:text-rose-300 p-0.5 rounded hover:bg-slate-900 transition-colors flex items-center justify-center cursor-pointer"
            title={`Add option to ${label}`}
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
        <select
          className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-rose-500"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">{placeholder}</option>
          {options.map((opt, idx) => (
            <option key={idx} value={opt}>{opt}</option>
          ))}
        </select>
      </div>
    );
  };

  const handleFeaturedImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressed = await compressImage(file, 400, 400, 0.7);
        setFeaturedImage(compressed);
      } catch (err) {
        console.error('Failed to compress featured image:', err);
        const reader = new FileReader();
        reader.onloadend = () => {
          setFeaturedImage(reader.result as string);
        };
        reader.readAsDataURL(file as any);
      }
    }
  };

  const handleGalleryImagesChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    for (const file of files) {
      try {
        const compressed = await compressImage(file, 300, 300, 0.6);
        setGalleryImages((prev) => [...prev, compressed]);
      } catch (err) {
        console.error('Failed to compress gallery image:', err);
        const reader = new FileReader();
        reader.onloadend = () => {
          setGalleryImages((prev) => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file as any);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !ipAddress) return;

    onAddAsset({
      id: `ast-${Date.now().toString().substring(8)}`,
      name,
      category: category || 'Projector',
      status: status || 'active',
      serialNumber: serialNumber || `SN-MOCK-${Date.now().toString().substring(10)}`,
      assignedTo: assignedTo || 'Seth Boa Amponsem',
      coordinates: { x: Math.floor(Math.random() * 60) + 20, y: Math.floor(Math.random() * 60) + 20 },
      ipAddress,
      lastSeen: new Date().toISOString(),
      isHighValue,
      tags: isHighValue ? ['high-value'] : [],
      batteryLevel: isWireless ? initialBatteryLevel : undefined,
      
      // New user requested fields
      assetTag,
      featuredImage,
      galleryImages,
      location,
      network,
      comments,
      technicianInCharge: assignedTo || 'Seth Boa Amponsem',
      groupInCharge,
      manufacturer,
      model,
      group,
      deviceType: category || 'Projector'
    });

    // Reset Form
    setName('');
    setCategory('Projector');
    setStatus('active');
    setSerialNumber('');
    setAssignedTo('');
    setIpAddress('');
    setIsHighValue(false);
    setIsWireless(false);
    setInitialBatteryLevel(100);
    setAssetTag('');
    setFeaturedImage('');
    setGalleryImages([]);
    setLocation('');
    setNetwork('');
    setComments('');
    setGroupInCharge('');
    setManufacturer('');
    setModel('');
    setGroup('');
    setShowAddForm(false);
  };

  // Sound synthesis trigger to provide tactile confirmation on match
  const playScanChime = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1);  // A5
      
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch (e) {
      console.warn("Audio context chime not permitted before interaction:", e);
    }
  };

  const startCamera = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err: any) {
      console.error("Camera access failed:", err);
      setCameraError("Real camera feed blocked or unavailable. Please ensure camera permissions are granted in your browser settings.");
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
  };

  // Auto-start camera when scanner is opened, and clean up when closed
  useEffect(() => {
    if (isScannerOpen) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isScannerOpen]);

  // Bind camera stream to video element when they become available
  useEffect(() => {
    if (cameraStream && videoRef.current) {
      videoRef.current.srcObject = cameraStream;
    }
  }, [cameraStream, isScannerOpen]);

  // Real-time camera QR scanner loop
  useEffect(() => {
    let active = true;
    let animFrameId: number;

    const scanQrLoop = () => {
      if (!active) return;
      if (!isScannerOpen || !cameraStream) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (ctx) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          
          try {
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const decoded = jsQR(imageData.data, imageData.width, imageData.height, {
              inversionAttempts: 'dontInvert',
            });

            if (decoded && decoded.data) {
              const text = decoded.data.trim();
              // Try to find matching asset by Serial Number, ID, Name or IP
              const matched = assets.find(a => 
                a.serialNumber.toLowerCase() === text.toLowerCase() ||
                a.id.toLowerCase() === text.toLowerCase() ||
                text.toLowerCase().includes(a.serialNumber.toLowerCase()) ||
                text.toLowerCase().includes(a.id.toLowerCase())
              );

              if (matched) {
                playScanChime();
                setScannedAsset(matched);
                setIsFilingQuickTicket(false);
                setScannerFeedback(`Real QR Decoded Signature: [${text}]. Opening ${matched.name}...`);
                
                // Stop camera and trigger opening the asset detail view
                stopCamera();
                active = false;
                
                setTimeout(() => {
                  if (onAssetClick) {
                    onAssetClick(matched);
                    setIsScannerOpen(false);
                    setScannedAsset(null);
                  }
                }, 1500);
                return;
              } else {
                setScannerFeedback(`QR Decoded: "${text}" (No matching asset found)`);
              }
            }
          } catch (e) {
            console.warn("QR parsing frame exception:", e);
          }
        }
      }

      animFrameId = requestAnimationFrame(scanQrLoop);
    };

    if (isScannerOpen && cameraStream) {
      animFrameId = requestAnimationFrame(scanQrLoop);
    }

    return () => {
      active = false;
      cancelAnimationFrame(animFrameId);
    };
  }, [isScannerOpen, cameraStream, assets, onAssetClick]);

  const handleQuickTicketSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scannedAsset || !quickTicketTitle.trim()) return;

    onCreateTicket({
      id: `tkt-${Date.now().toString().substring(9)}`,
      name: `[QR Scan Audit] ${quickTicketTitle}`,
      description: `Asset Affected: ${scannedAsset.name} (SN: ${scannedAsset.serialNumber}, IP: ${scannedAsset.ipAddress}).\n\nNotes:\n${quickTicketDesc}`,
      priority: quickTicketPriority,
      status: 'open',
      category: scannedAsset.category === 'Switch' ? 'Network' : 'Hardware',
      assignedTo: scannedAsset.assignedTo,
      createdAt: new Date().toISOString()
    });

    setQuickTicketTitle('');
    setQuickTicketDesc('');
    setIsFilingQuickTicket(false);
    setScannerFeedback(`Flipped new maintenance ticket for ${scannedAsset.name}!`);
    setTimeout(() => setScannerFeedback(null), 3500);
  };

  const getCategoryIcon = (category: string) => {
    switch ((category || '').toLowerCase()) {
      case 'projector': return <Eye className="w-4 h-4 text-cyan-400" />;
      case 'speaker': return <Volume2 className="w-4 h-4 text-indigo-400" />;
      case 'pyrotechnics': return <Sparkles className="w-4 h-4 text-rose-500" />;
      case 'computer': return <Monitor className="w-4 h-4 text-emerald-400" />;
      case 'phone': return <Phone className="w-4 h-4 text-blue-400" />;
      case 'printer': return <Printer className="w-4 h-4 text-amber-500" />;
      case 'rack': return <Server className="w-4 h-4 text-indigo-400" />;
      case 'network device':
      case 'switch': 
        return <Network className="w-4 h-4 text-cyan-400" />;
      case 'till': return <Coins className="w-4 h-4 text-rose-400" />;
      default: return <Wrench className="w-4 h-4 text-emerald-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active': return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30';
      case 'maintenance': return 'bg-amber-500/10 text-amber-400 border border-amber-500/30';
      default: return 'bg-rose-500/10 text-rose-400 border border-rose-500/30 animate-pulse';
    }
  };

  // Filter tickets linked to scanned asset
  const getLinkedTickets = () => {
    if (!scannedAsset) return [];
    return tickets.filter(t => 
      t.name.toLowerCase().includes(scannedAsset.name.toLowerCase()) ||
      t.description.toLowerCase().includes(scannedAsset.name.toLowerCase()) ||
      t.description.toLowerCase().includes(scannedAsset.id.toLowerCase()) ||
      t.description.toLowerCase().includes(scannedAsset.serialNumber.toLowerCase())
    );
  };

  const linkedTickets = getLinkedTickets();

  return (
    <div 
      id="assets-inventory-panel" 
      className={`${
        isFullscreen 
          ? 'fixed inset-0 z-50 p-6 bg-slate-950 overflow-y-auto font-sans text-slate-200' 
          : 'bg-slate-900 border border-slate-700 rounded-xl overflow-hidden shadow-xl p-5 font-sans text-slate-200'
      }`}
    >
      
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-4 mb-5">
        <div>
          <h3 className="font-sans font-bold text-slate-100 flex items-center gap-2 text-base uppercase tracking-wider font-mono">
            <span className="text-rose-500 font-bold font-mono">✛</span> IT HARDWARE NODE ASSETS REGISTRY
          </h3>
          <p className="text-[10px] text-slate-400 font-mono">
            System Infrastructure Audit node • Active tracking of all corporate workstations, networking relays, printer interfaces, and checkouts.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          {/* Maximize / Fullscreen Toggle button */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className={`px-3 py-1.5 rounded text-[10px] font-mono font-bold tracking-wider transition-all border ${
              isFullscreen 
                ? 'bg-amber-600/15 border-amber-500/30 text-amber-400 hover:bg-amber-500/25' 
                : 'bg-emerald-600/15 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25'
            }`}
          >
            {isFullscreen ? '[ RESTORE WINDOW ]' : '[ MAXIMIZE SCREEN ]'}
          </button>
        </div>
      </div>

      {/* Search and Filters Row */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 mb-5 bg-slate-950/40 p-3 rounded-lg border border-slate-850">
        {/* Search Input */}
        <div className="md:col-span-5 relative">
          <input
            type="text"
            placeholder="Search assets by name, serial, IP, custodian..."
            className="w-full bg-slate-950 border border-slate-800 rounded pl-3 pr-8 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-rose-500 placeholder-slate-500 font-mono"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button 
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer text-xs"
            >
              ×
            </button>
          )}
        </div>

        {/* Dropdowns Row */}
        <div className="md:col-span-7 grid grid-cols-3 gap-2">
          {/* Classes Select */}
          <select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-300 font-mono focus:outline-none focus:ring-1 focus:ring-rose-500 cursor-pointer"
          >
            <option value="all">All Classes</option>
            <option value="computer">Computer</option>
            <option value="phone">Phone</option>
            <option value="printer">Printer</option>
            <option value="rack">Rack</option>
            <option value="network device">Network Device</option>
            <option value="till">Till</option>
            <option value="projector">Projector</option>
            <option value="switch">Switch</option>
            <option value="radio">Radio</option>
            <option value="dmx">DMX</option>
            <option value="speaker">Speaker</option>
            <option value="pyrotechnics">Pyrotechnics</option>
          </select>

          {/* Statuses Select */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-300 font-mono focus:outline-none focus:ring-1 focus:ring-rose-500 cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="maintenance">Maintenance</option>
            <option value="offline">Offline</option>
          </select>

          {/* Custody Select */}
          <select
            value={custodyFilter}
            onChange={(e) => setCustodyFilter(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-300 font-mono focus:outline-none focus:ring-1 focus:ring-rose-500 cursor-pointer"
          >
            <option value="all">Custody: All</option>
            <option value="assigned">Custody: Assigned</option>
            <option value="unassigned">Custody: Unassigned</option>
          </select>
        </div>
      </div>

      {/* Date & Tools Row */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5 bg-slate-900/50 p-2 rounded-lg border border-slate-800/80">
        {/* Date range filters */}
        <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1 rounded border border-slate-850 text-[11px] text-slate-400 font-mono">
          <span className="text-[9px] uppercase text-slate-500">From</span>
          <input 
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="bg-transparent border-none text-slate-200 text-[11px] focus:outline-none focus:ring-0 w-24 [color-scheme:dark]"
          />
          <span className="text-[9px] uppercase text-slate-500">To</span>
          <input 
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="bg-transparent border-none text-slate-200 text-[11px] focus:outline-none focus:ring-0 w-24 [color-scheme:dark]"
          />
          {(dateFrom || dateTo) && (
            <button 
              onClick={() => { setDateFrom(''); setDateTo(''); }}
              className="text-rose-500 hover:text-rose-400 font-bold ml-1 cursor-pointer text-[10px]"
              title="Clear date filters"
            >
              CLEAR
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Print Inventory Button */}
          {onPrintReport && (
            <button
              onClick={() => {
                const rows = sortedAssets.map(a => [
                  a.id || '',
                  a.name || '',
                  a.category || '',
                  a.status || '',
                  a.ipAddress || '',
                  a.assignedTo || '',
                  a.serialNumber || ''
                ]);
                const summaries = [
                  { label: 'Total in View', value: `${sortedAssets.length}` },
                  { label: 'Online/Active', value: `${sortedAssets.filter(a => a.status === 'active' || a.status === 'online').length}` },
                  { label: 'Maintenance', value: `${sortedAssets.filter(a => a.status === 'maintenance').length}` },
                  { label: 'Offline', value: `${sortedAssets.filter(a => a.status === 'offline').length}` }
                ];
                onPrintReport({
                  title: 'Hardware Asset Inventory Report',
                  headers: ['Asset ID', 'Name', 'Category', 'Status', 'IP Address', 'Assigned To', 'Serial Number'],
                  rows,
                  summaries
                });
              }}
              className="px-3 py-1.5 bg-rose-950/40 hover:bg-rose-900/40 text-rose-400 font-mono text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer uppercase border border-rose-500/20 shadow"
            >
              <Printer className="w-4 h-4 text-rose-400" /> Print Inventory
            </button>
          )}

          {/* Export JSON Button */}
          <button
            onClick={() => {
              const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(sortedAssets, null, 2));
              const downloadAnchor = document.createElement('a');
              downloadAnchor.setAttribute("href", dataStr);
              downloadAnchor.setAttribute("download", `hardware_assets_view_export_${Date.now()}.json`);
              document.body.appendChild(downloadAnchor);
              downloadAnchor.click();
              downloadAnchor.remove();
            }}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-rose-400 font-mono text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer uppercase border border-slate-700/60 shadow"
            title="Export the current filtered/sorted assets view to a structured JSON file"
          >
            <Download className="w-4 h-4 text-rose-400" /> Export JSON
          </button>

          {/* QR Scanner Trigger */}
          <button
            onClick={() => {
              setIsScannerOpen(true);
              startCamera();
            }}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer uppercase shadow-md"
          >
            <QrCode className="w-4 h-4" /> Scan QR Label
          </button>

          {/* List/Grid Selector */}
          <div className="flex items-center bg-slate-950 p-1 border border-slate-800 rounded-lg">
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded transition-all cursor-pointer ${viewMode === 'list' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
              title="List View"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded transition-all cursor-pointer ${viewMode === 'grid' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
              title="Grid View"
            >
              <Grid className="w-4 h-4" />
            </button>
          </div>

          {/* CSV Import Button */}
          <button
            onClick={() => {
              setIsCsvModalOpen(true);
              setCsvRawText('');
              setParsedAssets([]);
              setCsvError(null);
              setCsvFileName(null);
            }}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer uppercase border border-slate-700 shadow"
          >
            <Database className="w-4 h-4 text-emerald-400" /> Bulk Import CSV
          </button>

          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-mono text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer uppercase"
          >
            <Plus className="w-4 h-4" /> Add Hardware Asset
          </button>
        </div>
      </div>

      {/* Asset Form */}
      {showAddForm && (
        <form onSubmit={handleSubmit} className="bg-slate-950 p-6 rounded-lg border border-slate-800 space-y-5 mb-6">
          <div className="flex justify-between items-center border-b border-slate-800 pb-3">
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <Cpu className="w-4 h-4 text-rose-500" /> Deploy New Showground Hardware Node
            </h4>
            <button type="button" onClick={() => setShowAddForm(false)} className="text-slate-500 hover:text-white text-xs cursor-pointer">Close</button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-[10px] text-slate-400 font-mono mb-1">Asset Label/Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Laser Tower North"
                className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-rose-500"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-[10px] text-slate-400 font-mono mb-1">Device Subnet IP *</label>
              <input
                type="text"
                required
                placeholder="e.g. 10.12.20.18"
                className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:ring-1 focus:ring-rose-500"
                value={ipAddress}
                onChange={(e) => setIpAddress(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-[10px] text-slate-400 font-mono mb-1">Asset Tag</label>
              <input
                type="text"
                placeholder="e.g. TAG-2026-X"
                className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:ring-1 focus:ring-rose-500"
                value={assetTag}
                onChange={(e) => setAssetTag(e.target.value)}
              />
            </div>
          </div>

          {/* Dynamic Dropdowns Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {renderDropdownField("Device Type (formerly Domain Class) *", "device_type", category, setCategory, "Select Device Type...")}
            {renderDropdownField("Deployment State *", "status", status, setStatus, "Select Status...")}
            {renderDropdownField("Network *", "networks", network, setNetwork, "Select Network...")}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {renderDropdownField("Location", "locations", location, setLocation, "Select Location...")}
            {renderDropdownField("Group", "groups", group, setGroup, "Select Group...")}
            {renderDropdownField("Model Group", "models", model, setModel, "Select Model Group...")}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {renderDropdownField("Manufacturer", "manufacturers", manufacturer, setManufacturer, "Select Manufacturer...")}
            {renderDropdownField("Group in Charge", "groups_in_charge", groupInCharge, setGroupInCharge, "Select Group in Charge...")}
            
            <div>
              <label className="block text-[10px] text-slate-400 font-mono mb-1.5">Technician in Charge (Assigned Staff)</label>
              <select
                className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-rose-500"
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
              >
                <option value="">Select Technician...</option>
                {users.map((u) => (
                  <option key={u.id} value={u.displayName}>{u.displayName}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-1">
              <label className="block text-[10px] text-slate-400 font-mono mb-1">Manufacturer Serial Number</label>
              <input
                type="text"
                placeholder="e.g. SN-PRJ-7722"
                className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:ring-1 focus:ring-rose-500"
                value={serialNumber}
                onChange={(e) => setSerialNumber(e.target.value)}
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-[10px] text-slate-400 font-mono mb-1">Comments & Notes</label>
              <input
                type="text"
                placeholder="e.g. Backup power staging configured, ready to deploy."
                className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-rose-500"
                value={comments}
                onChange={(e) => setComments(e.target.value)}
              />
            </div>
          </div>

          {/* High Value Designation Toggle */}
          <div className="bg-slate-900/60 border border-slate-850 rounded p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Gem className="w-4 h-4 text-indigo-400" />
              <div>
                <span className="text-xs font-semibold text-slate-200 block">Designate as High-Value Asset</span>
                <p className="text-[10px] text-slate-500">Enable real-time geofence tracking alarms and central stage boundary monitoring.</p>
              </div>
            </div>
            <input 
              type="checkbox"
              className="w-4 h-4 accent-rose-600 rounded cursor-pointer"
              checked={isHighValue}
              onChange={(e) => setIsHighValue(e.target.checked)}
            />
          </div>

          {/* Wireless / Battery Power Toggle */}
          <div className="bg-slate-900/60 border border-slate-850 rounded p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wifi className="w-4 h-4 text-emerald-400" />
              <div>
                <span className="text-xs font-semibold text-slate-200 block">Battery Powered / Wireless Device</span>
                <p className="text-[10px] text-slate-500">Enable wireless battery level monitoring with real-time status telemetry.</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {isWireless && (
                <div className="flex items-center gap-1 text-xs font-mono">
                  <span className="text-slate-400">Battery:</span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    className="w-14 bg-slate-950 border border-slate-800 rounded px-1.5 py-0.5 text-center text-emerald-400 focus:outline-none"
                    value={initialBatteryLevel}
                    onChange={(e) => setInitialBatteryLevel(Math.min(100, Math.max(0, Number(e.target.value))))}
                  />
                  <span className="text-slate-400">%</span>
                </div>
              )}
              <input 
                type="checkbox"
                className="w-4 h-4 accent-rose-600 rounded cursor-pointer"
                checked={isWireless}
                onChange={(e) => setIsWireless(e.target.checked)}
              />
            </div>
          </div>

          {/* Featured Image & Gallery Upload */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            
            {/* Featured Image Upload */}
            <div className="bg-slate-900/30 border border-slate-850 rounded-lg p-4 space-y-3">
              <span className="block text-[10px] text-slate-400 font-mono uppercase tracking-wider font-semibold">Asset Featured Image</span>
              
              <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-800 hover:border-slate-700 transition-colors rounded-lg p-4 text-center relative overflow-hidden min-h-[120px]">
                {featuredImage ? (
                  <div className="w-full h-full relative group">
                    <img src={featuredImage} alt="Featured Preview" className="max-h-[100px] mx-auto object-contain rounded" referrerPolicy="no-referrer" />
                    <button
                      type="button"
                      onClick={() => setFeaturedImage('')}
                      className="absolute top-1 right-1 bg-red-600 hover:bg-red-500 text-white p-1 rounded-full transition-colors cursor-pointer"
                      title="Remove image"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <label className="cursor-pointer w-full h-full flex flex-col items-center justify-center p-3">
                    <Camera className="w-6 h-6 text-slate-500 mb-1.5" />
                    <span className="text-xs text-slate-400 font-semibold">Upload Featured Image</span>
                    <span className="text-[10px] text-slate-500 mt-0.5 font-mono">Drag & drop or browse</span>
                    <input 
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleFeaturedImageChange}
                    />
                  </label>
                )}
              </div>
            </div>

            {/* Gallery Images Upload */}
            <div className="bg-slate-900/30 border border-slate-850 rounded-lg p-4 space-y-3">
              <span className="block text-[10px] text-slate-400 font-mono uppercase tracking-wider font-semibold">Asset Image Gallery</span>
              
              <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-800 hover:border-slate-700 transition-colors rounded-lg p-4 text-center relative min-h-[120px]">
                <label className="cursor-pointer w-full flex flex-col items-center justify-center p-2 mb-2">
                  <Plus className="w-5 h-5 text-slate-500 mb-1" />
                  <span className="text-xs text-slate-400 font-semibold">Add Gallery Images</span>
                  <span className="text-[10px] text-slate-500 mt-0.5 font-mono">Upload multiple files</span>
                  <input 
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleGalleryImagesChange}
                  />
                </label>

                {galleryImages.length > 0 && (
                  <div className="grid grid-cols-4 gap-1.5 w-full mt-2 border-t border-slate-850 pt-2">
                    {galleryImages.map((img, idx) => (
                      <div key={idx} className="relative aspect-square border border-slate-800 rounded overflow-hidden group">
                        <img src={img} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        <button
                          type="button"
                          onClick={() => setGalleryImages(prev => prev.filter((_, i) => i !== idx))}
                          className="absolute top-0.5 right-0.5 bg-red-600/90 hover:bg-red-500 text-white p-0.5 rounded-full transition-colors cursor-pointer opacity-0 group-hover:opacity-100"
                          title="Remove from gallery"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

          </div>

          <div className="flex justify-end pt-3 border-t border-slate-800">
            <button
              type="submit"
              className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-mono text-xs font-bold rounded-lg transition-all cursor-pointer uppercase tracking-wider shadow-lg"
            >
              Publish Device to Inventory
            </button>
          </div>
        </form>
      )}

      {/* QR Code Scanner Overlay */}
      {isScannerOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row h-[85vh]">
            
            {/* Left side: Live Camera and Simulator selectors */}
            <div className="flex-1 p-5 border-r border-slate-800 flex flex-col justify-between overflow-y-auto">
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-sans font-bold text-slate-100 flex items-center gap-2 text-sm uppercase tracking-wider">
                    <QrCode className="w-5 h-5 text-indigo-400" /> Showground QR Scanner
                  </h3>
                  <button 
                    onClick={() => {
                      stopCamera();
                      setIsScannerOpen(false);
                      setScannedAsset(null);
                    }}
                    className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                 {/* Laser scan camera viewport frame */}
                <div className="relative bg-black rounded-lg border border-slate-850 overflow-hidden h-64 flex items-center justify-center mb-4 shadow-inner">
                  {cameraStream ? (
                    <>
                      <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                      <canvas ref={canvasRef} className="hidden" style={{ display: 'none' }} />
                    </>
                  ) : (
                    /* High-tech Live Fallback Camera Feed Viewport Simulation */
                    <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center overflow-hidden w-full h-full">
                      {/* Grid overlay */}
                      <div className="absolute inset-0 bg-[linear-gradient(to_right,#111827_1px,transparent_1px),linear-gradient(to_bottom,#111827_1px,transparent_1px)] bg-[size:16px_16px] opacity-45" />
                      
                      {/* Animated Scanner Radar / Sweep lines */}
                      <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/0 via-indigo-500/10 to-indigo-500/0 animate-pulse pointer-events-none" />

                      {/* Moving focus target box in the center */}
                      <div className="absolute w-36 h-36 border border-indigo-500/30 rounded flex items-center justify-center animate-pulse">
                        <div className="w-28 h-28 border border-indigo-500/20 rounded relative">
                          <div className="absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 border-indigo-400" />
                          <div className="absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2 border-indigo-400" />
                          <div className="absolute -bottom-1 -left-1 w-3 h-3 border-b-2 border-l-2 border-indigo-400" />
                          <div className="absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 border-indigo-400" />
                        </div>
                      </div>

                      {/* Simulated ISO Noise */}
                      <div className="absolute inset-0 opacity-[0.08] bg-repeat bg-center mix-blend-overlay pointer-events-none" style={{ backgroundImage: "url('data:image/svg+xml,%3Csvg viewBox=\"0 0 200 200\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cfilter id=\"noise\"%3E%3CfeTurbulence type=\"fractalNoise\" baseFrequency=\"0.65\" numOctaves=\"3\" stitchTiles=\"stitch\"/%3E%3C/filter%3E%3Crect width=\"100%25\" height=\"100%25\" filter=\"url(%23noise)\"/%3E%3C/svg%3E')" }} />

                      {/* Optical status indicator overlay */}
                      <div className="absolute top-3 left-4 flex items-center gap-1.5 font-mono text-[9px] text-indigo-400 bg-slate-900/90 px-2 py-0.5 rounded border border-slate-800">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping" />
                        <span>OPTICAL FEED: ACTIVE (SIM)</span>
                      </div>

                      <div className="absolute bottom-3 right-4 font-mono text-[9px] text-slate-500">
                        ISO 800 | 24 FPS | F/1.8
                      </div>

                      <div className="absolute top-3 right-4 flex items-center gap-1 font-mono text-[9px] text-rose-500">
                        <span className="animate-pulse">● REC</span>
                      </div>

                      {/* Interactive Trigger if no stream */}
                      <div className="z-10 text-center px-4 max-w-xs space-y-2">
                        <p className="text-[10px] text-indigo-300 font-mono font-medium tracking-wide uppercase">Tactical Showground Scan Node</p>
                        <p className="text-[10px] text-slate-400 leading-normal">Real camera feed is restricted by browser sandbox. The simulated optical analyzer is fully operational.</p>
                        <button 
                          type="button"
                          onClick={startCamera}
                          className="mx-auto px-2.5 py-1 bg-indigo-500/20 hover:bg-indigo-500/35 border border-indigo-500/40 text-indigo-300 rounded font-mono text-[9px] uppercase tracking-wider transition-all cursor-pointer"
                        >
                          Retry Hardware Link
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Red flashing cybernetic laser overlay */}
                  <div className="absolute inset-x-0 h-0.5 bg-indigo-500/80 shadow-[0_0_8px_rgba(99,102,241,0.8)] top-1/2 -translate-y-1/2 animate-bounce pointer-events-none" />
                  <div className="absolute inset-0 border border-indigo-500/20 pointer-events-none" />
                </div>

                {/* Simulated QR Select option */}
                <div className="bg-slate-950 p-3 border border-slate-850 rounded-lg space-y-2 mb-4 text-xs">
                  <span className="text-[10px] text-slate-400 uppercase font-mono font-bold tracking-wider block">Or Simulate Optical Decodes</span>
                  <select 
                    className="w-full bg-slate-900 border border-slate-800 text-slate-300 rounded px-2.5 py-1.5 text-xs focus:outline-none"
                    onChange={(e) => {
                      const val = e.target.value;
                      if (!val) return;
                      const matched = assets.find(a => a.id === val);
                      if (matched) {
                        playScanChime();
                        setScannedAsset(matched);
                        setIsFilingQuickTicket(false);
                        setScannerFeedback(`Simulated QR Decoded: [${matched.serialNumber}]. Loaded ${matched.name}.`);
                        if (onAssetClick) {
                          setTimeout(() => {
                            onAssetClick(matched);
                          }, 1500);
                        }
                      }
                    }}
                    value=""
                  >
                    <option value="">-- Click to Mock Scan QR Label --</option>
                    {assets.map(a => (
                      <option key={a.id} value={a.id}>
                        [{a.category}] {a.name} (SN: {a.serialNumber})
                      </option>
                    ))}
                  </select>
                </div>

                {cameraError && (
                  <p className="text-[10px] text-rose-400 font-mono mb-4 leading-tight flex items-start gap-1.5 bg-rose-950/20 p-2.5 rounded border border-rose-500/20">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {cameraError}
                  </p>
                )}

                <div className="bg-slate-950 p-4 border border-slate-800 rounded-lg space-y-2 mt-4 text-xs">
                  <span className="text-[10px] text-slate-400 uppercase font-mono font-bold tracking-wider block">Scan Instructions</span>
                  <p className="text-slate-400 font-sans leading-relaxed">
                    Hold your device's camera up to any asset's QR or Barcode label. The optical scanner auto-detects and decodes the signature in real-time to load its diagnostic audit log.
                  </p>
                </div>
              </div>

              {/* Feedback messages */}
              {scannerFeedback && (
                <div className="bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 p-2.5 rounded-lg text-xs font-mono flex items-center gap-2 mt-4 animate-pulse">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{scannerFeedback}</span>
                </div>
              )}
            </div>

            {/* Right side: Diagnostic Audit and Linked Tickets */}
            <div className="flex-1 p-5 bg-slate-950 overflow-y-auto flex flex-col justify-between">
              {scannedAsset ? (
                <div className="space-y-4">
                  <div className="border-b border-slate-800 pb-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-sm font-bold text-slate-100 flex items-center gap-1">
                          {scannedAsset.isHighValue && <Gem className="w-3.5 h-3.5 text-indigo-400" />}
                          {scannedAsset.name}
                        </h4>
                        <span className="text-[10px] font-mono text-slate-500 uppercase">Serial: {scannedAsset.serialNumber}</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase ${getStatusBadge(scannedAsset.status)}`}>
                        {scannedAsset.status}
                      </span>
                    </div>
                  </div>

                  {/* Specifications */}
                  <div className="grid grid-cols-2 gap-2.5 text-xs">
                    <div className="bg-slate-900 border border-slate-850 p-2 rounded">
                      <span className="text-slate-500 block mb-0.5 font-mono text-[9px] uppercase">IP Address</span>
                      <strong className="text-cyan-400 font-mono font-bold">{scannedAsset.ipAddress}</strong>
                    </div>
                    <div className="bg-slate-900 border border-slate-850 p-2 rounded">
                      <span className="text-slate-500 block mb-0.5 font-mono text-[9px] uppercase">Duty Officer</span>
                      <strong className="text-rose-300 font-sans">{scannedAsset.assignedTo}</strong>
                    </div>
                  </div>

                  {/* Quick Status Update */}
                  <div className="bg-slate-900 border border-slate-800 p-2.5 rounded-lg text-xs space-y-1.5">
                    <span className="text-[10px] text-slate-400 uppercase font-mono font-bold tracking-wider block">Quick Status Update</span>
                    <div className="flex gap-2">
                      {['active', 'maintenance', 'offline'].map((statusOption) => (
                        <button
                          key={statusOption}
                          type="button"
                          onClick={() => {
                            onUpdateAsset(scannedAsset.id, { status: statusOption });
                            setScannedAsset({ ...scannedAsset, status: statusOption });
                            setScannerFeedback(`Asset status updated to ${statusOption.toUpperCase()}!`);
                          }}
                          className={`flex-1 py-1 px-2 rounded font-mono text-[10px] uppercase font-bold border transition-all cursor-pointer ${
                            scannedAsset.status === statusOption
                              ? statusOption === 'active' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500' :
                                statusOption === 'maintenance' ? 'bg-amber-500/20 text-amber-400 border-amber-500' :
                                'bg-rose-500/20 text-rose-400 border-rose-500'
                              : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700'
                          }`}
                        >
                          {statusOption}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Linked Tickets Section */}
                  <div className="space-y-2 border-t border-slate-900 pt-3">
                    <span className="text-[10px] text-slate-400 uppercase font-mono font-bold tracking-wider block">Linked Maintenance Tickets</span>
                    
                    {linkedTickets.length > 0 ? (
                      <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
                        {linkedTickets.map((t) => (
                          <div key={t.id} className="bg-slate-900 border border-slate-800 p-2 rounded text-xs flex justify-between items-start gap-2">
                            <div className="truncate">
                              <p className="font-semibold text-slate-200 truncate">{t.name}</p>
                              <p className="text-[10px] text-slate-400 font-mono truncate">{t.description}</p>
                            </div>
                            <span className={`px-1.5 py-0.5 rounded text-[8px] font-mono uppercase shrink-0 ${
                              t.priority === 'critical' ? 'bg-rose-500/20 text-rose-400' :
                              t.priority === 'high' ? 'bg-amber-500/20 text-amber-400' :
                              'bg-emerald-500/20 text-emerald-400'
                            }`}>
                              {t.priority}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="bg-slate-900/40 border border-slate-900 text-center py-4 rounded text-slate-500 text-[11px] font-sans">
                        No active tickets linked to this hardware profile.
                      </div>
                    )}
                  </div>

                  {/* Open a maintenance ticket form toggle */}
                  {!isFilingQuickTicket ? (
                    <button
                      onClick={() => setIsFilingQuickTicket(true)}
                      className="w-full py-2 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 font-mono text-[11px] font-bold rounded uppercase transition-all cursor-pointer"
                    >
                      + File New Maintenance Ticket for Asset
                    </button>
                  ) : (
                    <form onSubmit={handleQuickTicketSubmit} className="bg-slate-900 border border-slate-800 p-3 rounded-lg space-y-3 animate-fade-in text-xs">
                      <div className="flex justify-between items-center border-b border-slate-800 pb-1.5">
                        <span className="text-[10px] uppercase font-mono font-bold text-slate-300">File Support Ticket</span>
                        <button type="button" onClick={() => setIsFilingQuickTicket(false)} className="text-slate-500 hover:text-white text-[10px]">Cancel</button>
                      </div>

                      <div>
                        <label className="block text-[9px] text-slate-400 font-mono mb-0.5">Ticket Title</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Laser lens alignment issue"
                          className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-200 focus:outline-none focus:ring-1 focus:ring-rose-500 text-[11px]"
                          value={quickTicketTitle}
                          onChange={(e) => setQuickTicketTitle(e.target.value)}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[9px] text-slate-400 font-mono mb-0.5">Priority</label>
                          <select
                            className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-200 text-[11px] focus:outline-none"
                            value={quickTicketPriority}
                            onChange={(e) => setQuickTicketPriority(e.target.value as any)}
                          >
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                            <option value="critical">Critical</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[9px] text-slate-400 font-mono mb-0.5">Assignee</label>
                          <input
                            type="text"
                            disabled
                            className="w-full bg-slate-950 border border-slate-850 rounded px-2 py-1 text-slate-500 text-[11px]"
                            value={scannedAsset.assignedTo}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[9px] text-slate-400 font-mono mb-0.5">Problem Notes / Telemetry</label>
                        <textarea
                          rows={2}
                          placeholder="Provide audit descriptions..."
                          className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-200 focus:outline-none text-[11px]"
                          value={quickTicketDesc}
                          onChange={(e) => setQuickTicketDesc(e.target.value)}
                        />
                      </div>

                      <button
                        type="submit"
                        className="w-full py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-mono text-[10px] font-bold rounded uppercase transition-all"
                      >
                        Publish Maintenance Ticket
                      </button>
                    </form>
                  )}
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-5">
                  <QrCode className="w-12 h-12 text-slate-700 animate-pulse mb-3" />
                  <span className="text-xs font-semibold text-slate-400">Scan Pending...</span>
                  <p className="text-[10px] text-slate-600 mt-1">Simulate scanning by selecting a deployment node on the simulator left panel to parse live hardware telemetry.</p>
                </div>
              )}

              <div className="text-center text-[10px] text-slate-600 font-mono border-t border-slate-900 pt-3 mt-4">
                KYNREN HARDWARE SCANNING APPARATUS
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Asset Display Board with List or Grid View modes */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Main Display Board */}
        <div className={`${selectedAssetForConfig ? 'w-full lg:w-1/2 lg:max-w-[50%]' : 'flex-1 w-full min-w-0'} space-y-4`}>
          
          {/* Multi-select Bulk Actions Toolbar */}
          <AnimatePresence>
            {selectedAssetIds.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex flex-col sm:flex-row justify-between items-center gap-3 bg-slate-900 border border-rose-500/30 p-3 rounded-lg shadow-md mb-2"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                  </span>
                  <span className="text-xs font-mono font-bold text-rose-400">
                    {selectedAssetIds.length} Assets Selected
                  </span>
                  <button 
                    onClick={() => setSelectedAssetIds([])}
                    className="text-[10px] text-slate-400 hover:text-white underline font-mono cursor-pointer"
                  >
                    Clear Selection
                  </button>
                </div>
                
                <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-end">
                  <div className="flex items-center gap-2 bg-slate-950 px-2 py-1 rounded border border-slate-800 text-[10px]">
                    <span className="text-slate-400 font-mono whitespace-nowrap">Update Status:</span>
                    <select
                      className="bg-transparent border-none text-xs text-slate-200 focus:outline-none focus:ring-0 cursor-pointer font-sans"
                      defaultValue=""
                      onChange={(e) => {
                        if (e.target.value) {
                          handleBulkStatusUpdate(e.target.value);
                          e.target.value = "";
                        }
                      }}
                    >
                      <option value="" disabled>Select Status...</option>
                      <option value="active">Active</option>
                      <option value="maintenance">Maintenance</option>
                      <option value="offline">Offline</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2 bg-slate-950 px-2 py-1 rounded border border-slate-800 text-[10px]">
                    <span className="text-slate-400 font-mono whitespace-nowrap">Reassign to:</span>
                    <select
                      className="bg-transparent border-none text-xs text-slate-200 focus:outline-none focus:ring-0 cursor-pointer font-sans"
                      defaultValue=""
                      onChange={(e) => {
                        if (e.target.value) {
                          handleBulkReassign(e.target.value);
                          e.target.value = "";
                        }
                      }}
                    >
                      <option value="" disabled>Select Technician...</option>
                      {users.map((u) => (
                        <option key={`bulk-u-${u.id}`} value={u.displayName}>{u.displayName}</option>
                      ))}
                    </select>
                  </div>

                  <button
                    onClick={handleBulkDelete}
                    className="flex items-center gap-1 px-3 py-1 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white border border-red-500/30 hover:border-transparent rounded text-[11px] font-bold transition-all cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Bulk Delete</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {viewMode === 'list' ? (
            <div className="overflow-x-auto bg-slate-950 border border-slate-800 rounded">
              <table className="w-full text-left border-collapse font-sans text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 text-[10px] font-mono uppercase bg-slate-900/50">
                    <th className="p-4 w-10">
                      <input 
                        type="checkbox" 
                        checked={sortedAssets.length > 0 && sortedAssets.every(a => selectedAssetIds.includes(a.id))}
                        onChange={toggleSelectAll}
                        onClick={(e) => e.stopPropagation()}
                        className="rounded border-slate-700 bg-slate-900 text-rose-600 focus:ring-rose-500 cursor-pointer w-4 h-4"
                      />
                    </th>
                    {renderSortableHeader('name', 'Asset Node')}
                    {renderSortableHeader('category', 'Class')}
                    {renderSortableHeader('status', 'Deploy Status')}
                    {renderSortableHeader('ipAddress', 'Segment IP')}
                    <th className="p-4 font-mono">Telemetry (24H)</th>
                    <th className="p-4 font-mono">Assigned Custodian</th>
                    <th className="p-4 text-center font-mono">Sign-Off</th>
                    <th className="p-4 text-right font-mono">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850">
                  {sortedAssets.map((a) => {
                    const isSelected = selectedAssetForConfig?.id === a.id;
                    const signOffState = (a as any).signOff || 'PENDING';
                    
                    return (
                      <tr 
                        key={a.id} 
                        onClick={() => onAssetClick ? onAssetClick(a) : setSelectedAssetForConfig(a)}
                        className={`transition-all duration-300 cursor-pointer ${
                          isSelected 
                            ? 'bg-rose-500/10 border-l-2 border-l-rose-500' 
                            : 'hover:bg-slate-900/30'
                        }`}
                      >
                        {/* Checkbox Column */}
                        <td className="p-4 w-10" onClick={(e) => e.stopPropagation()}>
                          <input 
                            type="checkbox" 
                            checked={selectedAssetIds.includes(a.id)}
                            onChange={() => toggleSelectAsset(a.id)}
                            className="rounded border-slate-700 bg-slate-900 text-rose-600 focus:ring-rose-500 cursor-pointer w-4 h-4"
                          />
                        </td>

                        {/* Asset Node (Icon + Name + SN) */}
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0">
                              {getCategoryIcon(a.category)}
                            </div>
                            <div className="flex flex-col">
                              <span className="font-semibold text-slate-200 text-xs flex items-center gap-1.5">
                                {a.name}
                                {a.isHighValue && (
                                  <span className="text-[8px] font-bold text-amber-400 bg-amber-950/40 border border-amber-900/30 px-1 py-0.5 rounded">
                                    VIP
                                  </span>
                                )}
                              </span>
                              <span className="text-[10px] text-slate-500 font-mono">ID: {a.id} • SN: {a.serialNumber}</span>
                            </div>
                          </div>
                        </td>

                        {/* Class (Category) */}
                        <td className="p-4 font-mono text-[11px] text-slate-300 capitalize">
                          {a.category}
                        </td>

                        {/* Deploy Status */}
                        <td className="p-4" onClick={(e) => e.stopPropagation()}>
                          <select
                            value={a.status}
                            onChange={(e) => {
                              onUpdateAsset(a.id, { status: e.target.value as any });
                            }}
                            className={`rounded px-2.5 py-1 text-[10px] font-mono font-bold uppercase focus:outline-none focus:ring-1 focus:ring-rose-500 cursor-pointer border ${
                              a.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :
                              a.status === 'maintenance' ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' :
                              'bg-rose-500/10 text-rose-400 border-rose-500/30'
                            }`}
                          >
                            <option value="active" className="bg-slate-950 text-emerald-400">Active</option>
                            <option value="maintenance" className="bg-slate-950 text-amber-400">Maintenance</option>
                            <option value="offline" className="bg-slate-950 text-rose-400">Offline</option>
                          </select>
                        </td>

                        {/* Segment IP */}
                        <td className="p-4 text-cyan-400 font-mono font-bold text-[11px]">
                          {a.ipAddress || '0.0.0.0'}
                        </td>

                        {/* Telemetry Sparkline (24H) */}
                        <td className="p-4">
                          <TelemetrySparkline category={a.category} status={a.status} />
                        </td>

                        {/* Assigned Custodian (Directly editable) */}
                        <td className="p-4" onClick={(e) => e.stopPropagation()}>
                          <select
                            value={a.assignedTo || ''}
                            onChange={(e) => {
                              onUpdateAsset(a.id, { assignedTo: e.target.value });
                            }}
                            className="bg-slate-900 border border-slate-800 text-slate-200 text-xs rounded px-2 py-1 focus:outline-none focus:border-rose-500 font-mono cursor-pointer max-w-[150px]"
                          >
                            <option value="">-- Unassigned --</option>
                            {users.map((u) => (
                              <option key={`cell-u-${u.id}`} value={u.displayName}>
                                {u.displayName}
                              </option>
                            ))}
                          </select>
                        </td>

                        {/* Sign-Off (Click-to-cycle interactive badge) */}
                        <td className="p-4 text-center" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => {
                              const states = ['ACCEPTED', 'PENDING', 'N/A'];
                              const nextIndex = (states.indexOf(signOffState) + 1) % states.length;
                              onUpdateAsset(a.id, { signOff: states[nextIndex] } as any);
                            }}
                            className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold border transition-all ${
                              signOffState === 'ACCEPTED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :
                              signOffState === 'PENDING' ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' :
                              'bg-slate-800 text-slate-500 border-slate-700/50'
                            }`}
                            title="Click to cycle Sign-off status: ACCEPTED -> PENDING -> N/A"
                          >
                            {signOffState}
                          </button>
                        </td>

                        {/* Actions (Inspect, Clone, Delete) */}
                        <td className="p-4 text-right font-mono" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Toggle Maintenance / Wrench */}
                            <button
                              onClick={() => {
                                const newStatus = a.status === 'maintenance' ? 'active' : 'maintenance';
                                onUpdateAsset(a.id, { status: newStatus });
                              }}
                              className={`p-1.5 rounded transition-all cursor-pointer border ${
                                a.status === 'maintenance'
                                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/40 shadow-[0_0_8px_rgba(245,158,11,0.25)]'
                                  : 'text-slate-400 hover:bg-slate-800 hover:text-amber-400 border-transparent'
                              }`}
                              title={a.status === 'maintenance' ? 'Re-activate Asset' : 'Toggle Maintenance Mode'}
                            >
                              <Wrench className="w-3.5 h-3.5" />
                            </button>
                            {/* Clone */}
                            <button
                              onClick={() => onCloneAsset(a)}
                              className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-rose-400 transition-all cursor-pointer"
                              title="Clone Asset"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            {/* Config / Inspector */}
                            <button
                              onClick={() => setSelectedAssetForConfig(a)}
                              className={`p-1.5 rounded transition-all cursor-pointer ${
                                isSelected 
                                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30 shadow-[0_0_8px_rgba(244,63,94,0.2)]' 
                                  : 'text-slate-400 hover:bg-slate-800 hover:text-amber-400'
                              }`}
                              title="Inspect Asset Properties"
                            >
                              <Settings2 className="w-3.5 h-3.5" />
                            </button>
                            {/* Always Red Delete */}
                            <button
                              onClick={() => setAssetToDelete(a)}
                              className="p-1.5 bg-red-500/10 hover:bg-red-500/20 rounded text-red-500 hover:text-red-400 transition-all cursor-pointer border border-red-500/20"
                              title="Delete Asset"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            /* Grid Display mode */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sortedAssets.map((a) => {
                const isSelected = selectedAssetForConfig?.id === a.id;
                return (
                  <div 
                    key={a.id} 
                    onClick={() => onAssetClick ? onAssetClick(a) : setSelectedAssetForConfig(a)}
                    className={`bg-slate-950 p-4 border rounded-lg flex flex-col justify-between space-y-4 transition-all duration-300 cursor-pointer ${
                      isSelected 
                        ? 'border-rose-500 ring-1 ring-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.15)] scale-[1.01]' 
                        : 'border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <input 
                            type="checkbox" 
                            checked={selectedAssetIds.includes(a.id)}
                            onChange={() => toggleSelectAsset(a.id)}
                            className="rounded border-slate-700 bg-slate-900 text-rose-600 focus:ring-rose-500 cursor-pointer w-4 h-4"
                          />
                          <span className="text-[10px] font-mono text-rose-400 font-bold flex items-center gap-1">
                            {a.isHighValue && <Gem className="w-3 h-3 text-indigo-400" />}
                            {a.id}
                          </span>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[9px] uppercase font-mono ${getStatusBadge(a.status)}`}>
                          {a.status}
                        </span>
                      </div>

                      <h4 className="text-slate-200 font-bold text-xs leading-tight mb-1 flex items-center gap-1.5 flex-wrap">
                        <span className={`w-2 h-2 rounded-full ${getStatusDotColor(a.status)}`} title={`Status: ${a.status}`} />
                        {getCategoryIcon(a.category)}
                        <span>{a.name}</span>
                        {a.batteryLevel !== undefined && (
                          <span className="inline-flex items-center gap-0.5 text-[9px] font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-900/30 px-1.5 py-0.5 rounded">
                            <Battery className="w-2.5 h-2.5" />
                            {a.batteryLevel}%
                          </span>
                        )}
                        {a.registrationDate && (
                          <span className="inline-flex items-center gap-0.5 text-[9px] font-mono text-amber-400 bg-amber-950/40 border border-amber-900/30 px-1.5 py-0.5 rounded" title={`Registered on: ${a.registrationDate}`}>
                            <Calendar className="w-2.5 h-2.5 text-amber-400" />
                            {getRelativeAge(a.registrationDate)}
                          </span>
                        )}
                      </h4>
                      <p className="text-[11px] text-slate-400 font-mono">SN: {a.serialNumber}</p>

                      {/* Health Tag with hover tooltip */}
                      {(() => {
                        const health = getAssetHealthAndTooltip(a);
                        return (
                          <div className="relative group inline-block mt-2">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-mono font-bold border cursor-help ${health.colorClass}`}>
                              <span>Health:</span>
                              <span className="uppercase">{health.label}</span>
                            </span>
                            <div className="pointer-events-none absolute left-0 bottom-full mb-1.5 hidden group-hover:block z-50 w-52 bg-slate-900 text-[10px] text-slate-200 p-2 rounded border border-slate-700 shadow-xl font-sans">
                              {health.tooltip}
                            </div>
                          </div>
                        );
                      })()}

                      {a.isHighValue && (
                        <div className="bg-indigo-950/20 border border-indigo-500/20 p-1.5 rounded text-[9px] text-indigo-300 font-mono font-bold mt-2 flex items-center gap-1">
                          <Gem className="w-3 h-3 text-indigo-400 shrink-0" />
                          DESIGNATED HIGH-VALUE HARDWARE
                        </div>
                      )}
                      
                      <div className="grid grid-cols-2 gap-2 text-[10px] font-mono border-t border-slate-900 pt-3 text-slate-400 mt-2">
                        <div>
                          <span>Subnet Address:</span>
                          <p className="text-cyan-400 font-bold">{a.ipAddress}</p>
                        </div>
                        <div>
                          <span>Duty Officer:</span>
                          <p className="text-rose-300 font-sans font-semibold truncate">{a.assignedTo}</p>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-slate-900 pt-3 flex justify-between items-center text-xs">
                      <span className="text-slate-500 font-mono text-[10px]">Pos: {a.coordinates.x}%, {a.coordinates.y}%</span>
                      <div className="flex items-center gap-1">
                        {/* Toggle Maintenance */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const newStatus = a.status === 'maintenance' ? 'active' : 'maintenance';
                            onUpdateAsset(a.id, { status: newStatus });
                          }}
                          className={`p-1 rounded transition-all cursor-pointer border ${
                            a.status === 'maintenance'
                              ? 'bg-amber-500/20 text-amber-400 border-amber-500/40 shadow-[0_0_8px_rgba(245,158,11,0.25)]'
                              : 'text-slate-400 hover:bg-slate-800 hover:text-amber-400 border-transparent'
                          }`}
                          title={a.status === 'maintenance' ? 'Re-activate Asset' : 'Toggle Maintenance Mode'}
                        >
                          <Wrench className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); onCloneAsset(a); }}
                          className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-rose-400 cursor-pointer"
                          title="Clone"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        {/* Config / Inspector */}
                        <button
                          onClick={(e) => { e.stopPropagation(); setSelectedAssetForConfig(a); }}
                          className={`p-1 rounded transition-all cursor-pointer ${
                            isSelected 
                              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' 
                              : 'text-slate-400 hover:bg-slate-800 hover:text-amber-400'
                          }`}
                          title="Inspect Asset Properties"
                        >
                          <Settings2 className="w-3.5 h-3.5" />
                        </button>
                        {/* Always Red Delete */}
                        <button
                          onClick={(e) => { e.stopPropagation(); setAssetToDelete(a); }}
                          className="p-1 bg-red-500/10 hover:bg-red-500/20 rounded text-red-500 hover:text-red-400 cursor-pointer border border-red-500/20"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Sidebar Panel for Selected Asset Config */}
        <AnimatePresence>
          {selectedAssetForConfig && (() => {
            const activeAsset = assets.find(a => a.id === selectedAssetForConfig.id) || selectedAssetForConfig;
            
            // Geofence calculations
            const isOutsideGeofence = activeAsset.coordinates.x < 20 || activeAsset.coordinates.x > 80 || activeAsset.coordinates.y < 20 || activeAsset.coordinates.y > 80;
            
            // Sub-zone calculations
            const getSubZoneName = (x: number, y: number) => {
              if (x < 20 || x > 80 || y < 20 || y > 80) return 'Outside Stage Bounds';
              if (x <= 40 && y <= 50) return 'Front Stage Left';
              if (x > 40 && x <= 60 && y <= 50) return 'Front Stage Center';
              if (x > 60 && y <= 50) return 'Front Stage Right';
              if (x <= 40 && y > 50) return 'Backstage Left';
              if (x > 40 && x <= 60 && y > 50) return 'Backstage Center';
              return 'Backstage Right';
            };
            const currentZone = getSubZoneName(activeAsset.coordinates.x, activeAsset.coordinates.y);

            const handleCommandExecute = (commandStr: string) => {
              const trimmed = commandStr.trim().toLowerCase();
              if (!trimmed) return;

              let responses: string[] = [];
              if (trimmed === 'help') {
                responses = [
                  `root@node-cli:~# help`,
                  `Available Commands:`,
                  `  help      - Show this manual`,
                  `  status    - Display hardware sensor metrics`,
                  `  vlan      - Show VLAN routing parameters`,
                  `  diagnose  - Run self-diagnostic checks`,
                  `  reboot    - Gracefully restart the host`,
                  `  clear     - Wipe console history`
                ];
              } else if (trimmed === 'clear') {
                setTerminalLogs([]);
                setTerminalInput('');
                return;
              } else if (trimmed === 'status') {
                responses = [
                  `root@node-cli:~# status`,
                  `Hardware Status for Node: ${activeAsset.id}`,
                  `---------------------------------`,
                  `Uptime: ${activeAsset.status === 'offline' ? '0s' : '5d 12h 43m'}`,
                  `Status: ${activeAsset.status.toUpperCase()}`,
                  `CPU Temp: ${activeAsset.status === 'offline' ? 'N/A' : '42.8 °C (OK)'}`,
                  `Memory Load: ${activeAsset.status === 'offline' ? '0%' : '34% [||||      ]'}`,
                  `Core Voltage: ${activeAsset.status === 'offline' ? '0.00V' : '1.18V'}`,
                  `SFP Transceiver TX: ${activeAsset.status === 'offline' ? 'OFF' : '-3.5 dBm (Good)'}`
                ];
              } else if (trimmed === 'vlan') {
                const vlanNum = activeAsset.category === 'Switch' ? '10' : activeAsset.category === 'DMX' ? '30' : '20';
                responses = [
                  `root@node-cli:~# vlan`,
                  `IP Interface: ${activeAsset.ipAddress}`,
                  `Default Gateway: 10.12.${vlanNum}.1`,
                  `Segment Mapping: VLAN ${vlanNum} (Production Devices)`,
                  `Subnet Mask: 255.255.255.0`,
                  `DHCP Lease Status: Reserved (Static Bound)`
                ];
              } else if (trimmed === 'diagnose') {
                responses = [
                  `root@node-cli:~# diagnose`,
                  `Starting diagnostic sequence for [${activeAsset.name}]...`,
                  `[OK] Flash memory CRC verification: 0x98AFE4`,
                  `[OK] Local loopback interface testing`,
                  `[OK] Power supply rails: 12V stable (12.04V)`,
                  `[OK] ASIC thermal sensors below warning thresh`,
                  `Status: DIAGNOSTICS SUCCESS. Hardware 100% operational.`
                ];
              } else if (trimmed === 'reboot') {
                if (isRebooting) {
                  responses = [`Reboot already in progress...`];
                } else {
                  setIsRebooting(true);
                  setTerminalLogs(prev => [
                    ...prev,
                    `root@node-cli:~# reboot`,
                    `[WARN] BROADCASTING REMOTE REBOOT SIGNAL...`,
                    `Stopping running threads and clearing registers...`,
                    `Rebooting in 3...`,
                  ]);
                  setTerminalInput('');

                  setTimeout(() => {
                    setTerminalLogs(prev => [...prev, `Rebooting in 2...`]);
                  }, 600);
                  setTimeout(() => {
                    setTerminalLogs(prev => [...prev, `Rebooting in 1...`]);
                  }, 1200);
                  setTimeout(() => {
                    setTerminalLogs(prev => [...prev, `SYSTEM DOWN. Connection severed.`]);
                    onUpdateAsset(activeAsset.id, { status: 'offline' });
                  }, 1800);
                  setTimeout(() => {
                    setTerminalLogs(prev => [
                      ...prev,
                      `System initializing...`,
                      `U-Boot 2024.04-rc2 (May 14 2026)`,
                      `Ready.`
                    ]);
                    onUpdateAsset(activeAsset.id, { status: 'active' });
                    setIsRebooting(false);
                  }, 3500);
                  return;
                }
              } else {
                responses = [
                  `root@node-cli:~# ${commandStr}`,
                  `shell: command not found: "${trimmed}". Type "help" for instructions.`
                ];
              }

              setTerminalLogs(prev => [...prev, ...responses]);
              setTerminalInput('');
            };
             const handleLivePing = () => {
              if (isPinging || isRebooting) return;
              const targetIp = customPingIp.trim() || activeAsset.ipAddress;
              setIsPinging(true);
              setTerminalLogs(prev => [
                ...prev,
                `root@node-cli:~# ping ${targetIp} -c 4`,
                `PING ${targetIp} (${targetIp}): 56 data bytes`
              ]);

              let seq = 0;
              const interval = setInterval(() => {
                if (seq < 4) {
                  if (activeAsset.status === 'offline') {
                    setTerminalLogs(prev => [
                      ...prev,
                      `Request timeout for icmp_seq ${seq}`
                    ]);
                  } else {
                    const pingTime = (Math.random() * 3 + 1.5).toFixed(2);
                    setTerminalLogs(prev => [
                      ...prev,
                      `64 bytes from ${targetIp}: icmp_seq=${seq} ttl=64 time=${pingTime} ms`
                    ]);
                  }
                  seq++;
                } else {
                  clearInterval(interval);
                  if (activeAsset.status === 'offline') {
                    setTerminalLogs(prev => [
                      ...prev,
                      `--- ${targetIp} ping statistics ---`,
                      `4 packets transmitted, 0 packets received, 100% packet loss`
                    ]);
                  } else {
                    setTerminalLogs(prev => [
                      ...prev,
                      `--- ${targetIp} ping statistics ---`,
                      `4 packets transmitted, 4 packets received, 0% packet loss`,
                      `rtt min/avg/max = 1.52/2.84/4.12 ms`
                    ]);
                  }
                  setIsPinging(false);
                }
              }, 400);
            };

            const getVlanNum = (category: string) => {
              if (category === 'Switch') return '10';
              if (category === 'DMX') return '30';
              return '20';
            };

            return (
              <motion.div
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 50 }}
                transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                className="w-full lg:w-1/2 lg:max-w-[50%] bg-slate-950 border border-slate-800 rounded-xl p-5 shrink-0 space-y-4 shadow-2xl relative"
              >
                {/* Sidebar Header */}
                <div className="flex justify-between items-start border-b border-slate-800 pb-3">
                  <div>
                    <h4 className="font-sans font-bold text-slate-100 flex items-center gap-1.5 text-sm uppercase">
                      <Settings2 className="w-4 h-4 text-rose-500" /> Asset Inspector
                    </h4>
                    <span className="text-[10px] font-mono text-slate-500">ID: {activeAsset.id}</span>
                  </div>
                  <button 
                    onClick={() => setSelectedAssetForConfig(null)}
                    className="p-1 bg-slate-900 hover:bg-slate-800 rounded-md text-slate-400 hover:text-white cursor-pointer transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Tab selections */}
                <div className="flex border-b border-slate-800 p-1 bg-slate-900/40 rounded-lg gap-1">
                  <button
                    type="button"
                    onClick={() => setSidebarTab('profile')}
                    className={`flex-1 py-1.5 rounded text-[10px] font-semibold transition-all flex flex-col items-center justify-center gap-1 ${
                      sidebarTab === 'profile' 
                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' 
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                    }`}
                  >
                    <User className="w-3.5 h-3.5" />
                    <span>Profile</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSidebarTab('performance')}
                    className={`flex-1 py-1.5 rounded text-[10px] font-semibold transition-all flex flex-col items-center justify-center gap-1 ${
                      sidebarTab === 'performance' 
                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' 
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                    }`}
                  >
                    <Activity className="w-3.5 h-3.5" />
                    <span>Telemetry</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSidebarTab('floorplan')}
                    className={`flex-1 py-1.5 rounded text-[10px] font-semibold transition-all flex flex-col items-center justify-center gap-1 ${
                      sidebarTab === 'floorplan' 
                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' 
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                    }`}
                  >
                    <Map className="w-3.5 h-3.5" />
                    <span>Floor-plan</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSidebarTab('console')}
                    className={`flex-1 py-1.5 rounded text-[10px] font-semibold transition-all flex flex-col items-center justify-center gap-1 ${
                      sidebarTab === 'console' 
                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' 
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                    }`}
                  >
                    <Terminal className="w-3.5 h-3.5" />
                    <span>Console & Net</span>
                  </button>
                </div>

                {/* Sub-tab content */}
                <div className="space-y-4 max-h-[480px] overflow-y-auto pr-1">
                  {sidebarTab === 'profile' && (
                    <div className="space-y-4">
                      {/* Display name */}
                      <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-850/60">
                        <span className="text-[9px] font-mono text-slate-500 uppercase block mb-1">Display Label</span>
                        <span className="text-slate-200 font-bold text-sm block">{activeAsset.name}</span>
                      </div>

                      {/* Category and Value Tier */}
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="bg-slate-900/40 p-2.5 rounded border border-slate-850/40">
                          <span className="text-slate-500 block mb-0.5 font-mono text-[9px] uppercase">Category</span>
                          <strong className="text-rose-300 font-semibold">{activeAsset.category}</strong>
                        </div>
                        <div className="bg-slate-900/40 p-2.5 rounded border border-slate-850/40">
                          <span className="text-slate-500 block mb-0.5 font-mono text-[9px] uppercase">Value Tier</span>
                          {activeAsset.isHighValue ? (
                            <strong className="text-indigo-400 font-bold flex items-center gap-1 text-[10px] font-mono">
                              <Gem className="w-3 h-3 text-indigo-400" /> HIGH-VALUE
                            </strong>
                          ) : (
                            <strong className="text-slate-400 font-medium font-sans">Standard</strong>
                          )}
                        </div>
                      </div>

                      {/* Deployment Status */}
                      <div className="bg-slate-900/40 p-3 rounded-lg border border-slate-850/40 space-y-1.5">
                        <label className="text-[9px] font-mono text-slate-500 uppercase block">Deployment Status</label>
                        <select
                          value={activeAsset.status}
                          onChange={(e) => onUpdateAsset(activeAsset.id, { status: e.target.value as any })}
                          className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:ring-1 focus:ring-rose-500"
                        >
                          <option value="active">🟢 Active On Showground</option>
                          <option value="maintenance">🟡 Maintenance/Calibration</option>
                          <option value="offline">🔴 Offline / Fault State</option>
                        </select>
                      </div>

                      {/* Power Status & Battery Level Indicator */}
                      <div className="bg-slate-900/40 p-3 rounded-lg border border-slate-850/40 space-y-2.5">
                        <div className="flex justify-between items-center">
                          <label className="text-[9px] font-mono text-slate-500 uppercase flex items-center gap-1.5">
                            <span className="relative flex h-2 w-2">
                              {activeAsset.batteryLevel !== undefined && activeAsset.batteryLevel < 20 && (
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                              )}
                              <span className={`relative inline-flex rounded-full h-2 w-2 ${
                                activeAsset.batteryLevel === undefined ? 'bg-indigo-500' :
                                activeAsset.batteryLevel >= 50 ? 'bg-emerald-500' :
                                activeAsset.batteryLevel >= 20 ? 'bg-amber-500' : 'bg-rose-500'
                              }`}></span>
                            </span>
                            Power Status & Battery Level
                          </label>
                          <span className="text-xs font-mono font-bold text-slate-300 flex items-center gap-1">
                            {activeAsset.batteryLevel !== undefined ? (
                              <>
                                {activeAsset.batteryLevel >= 80 ? (
                                  <BatteryCharging className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                                ) : (
                                  <Battery className={`w-3.5 h-3.5 ${activeAsset.batteryLevel < 20 ? 'text-rose-500 animate-bounce' : 'text-slate-400'}`} />
                                )}
                                {activeAsset.batteryLevel}%
                              </>
                            ) : (
                              '100% (Wired Power)'
                            )}
                          </span>
                        </div>

                        {/* Battery Progress Bar */}
                        <div className="w-full bg-slate-950 rounded-full h-2.5 border border-slate-800 overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${
                              activeAsset.batteryLevel === undefined ? 'bg-gradient-to-r from-indigo-500 to-cyan-400 w-full' :
                              activeAsset.batteryLevel >= 50 ? 'bg-gradient-to-r from-emerald-500 to-teal-400' :
                              activeAsset.batteryLevel >= 20 ? 'bg-gradient-to-r from-amber-500 to-amber-400' :
                              'bg-gradient-to-r from-rose-600 to-red-500 animate-pulse'
                            }`}
                            style={{ width: `${activeAsset.batteryLevel !== undefined ? activeAsset.batteryLevel : 100}%` }}
                          />
                        </div>

                        {/* Slider to adjust battery level */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-[9px] font-mono text-slate-500">
                            <span>Adjust Wireless Power:</span>
                            <span>{activeAsset.batteryLevel !== undefined ? 'Wireless Battery Mode' : 'Wired AC Grid'}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="range"
                              min="0"
                              max="100"
                              className="w-full accent-rose-600 h-1 bg-slate-850 rounded-lg appearance-none cursor-pointer"
                              value={activeAsset.batteryLevel !== undefined ? activeAsset.batteryLevel : 100}
                              onChange={(e) => {
                                const level = Number(e.target.value);
                                onUpdateAsset(activeAsset.id, { batteryLevel: level });
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => {
                                if (activeAsset.batteryLevel === undefined) {
                                  onUpdateAsset(activeAsset.id, { batteryLevel: 85 });
                                } else {
                                  onUpdateAsset(activeAsset.id, { batteryLevel: undefined as any });
                                }
                              }}
                              className="text-[9px] font-mono border border-slate-800 hover:border-slate-700 bg-slate-950 px-1.5 py-0.5 rounded text-slate-400 hover:text-slate-200 cursor-pointer shrink-0"
                            >
                              {activeAsset.batteryLevel === undefined ? 'Wireless' : 'Wired'}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* IP address and reallocation */}
                      <div className="bg-slate-900/40 p-3 rounded-lg border border-slate-850/40 space-y-1.5">
                        <div className="flex justify-between items-center">
                          <label className="text-[9px] font-mono text-slate-500 uppercase">Device Subnet IP</label>
                          <button 
                            onClick={() => onUpdateAsset(activeAsset.id, { ipAddress: '10.12.10.' + Math.floor(Math.random() * 250) })}
                            className="text-[9px] text-amber-400 hover:text-amber-300 font-mono cursor-pointer"
                          >
                            [Reallocate IP]
                          </button>
                        </div>
                        <input
                          type="text"
                          className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-cyan-400 font-mono focus:outline-none focus:ring-1 focus:ring-rose-500"
                          value={activeAsset.ipAddress}
                          onChange={(e) => onUpdateAsset(activeAsset.id, { ipAddress: e.target.value })}
                        />
                      </div>

                      {/* Assignment Selector */}
                      <div className="bg-slate-900/40 p-3 rounded-lg border border-slate-850/40 space-y-1.5">
                        <label className="text-[9px] font-mono text-slate-500 uppercase block">Duty Officer Assignment</label>
                        <select
                          value={activeAsset.assignedTo}
                          onChange={(e) => onUpdateAsset(activeAsset.id, { assignedTo: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-rose-500"
                        >
                          {users.map(u => (
                            <option key={u.id} value={u.displayName}>{u.displayName} ({u.role})</option>
                          ))}
                        </select>
                      </div>

                      {/* Properties list */}
                      <div className="bg-slate-900/40 p-3 rounded-lg border border-slate-850/40 space-y-2">
                        <span className="text-[9px] font-mono text-slate-500 uppercase block">Equipment Properties</span>
                        <div className="space-y-1.5 text-[11px] font-mono">
                          <div className="flex justify-between border-b border-slate-900/60 pb-1">
                            <span className="text-slate-500">Serial No:</span>
                            <span className="text-slate-300 flex items-center gap-1">
                              {activeAsset.serialNumber}
                              <button 
                                type="button" 
                                onClick={() => navigator.clipboard.writeText(activeAsset.serialNumber)}
                                className="text-slate-500 hover:text-cyan-400 cursor-pointer"
                                title="Copy serial to clipboard"
                              >
                                <Copy className="w-3 h-3" />
                              </button>
                            </span>
                          </div>
                          <div className="flex justify-between border-b border-slate-900/60 pb-1">
                            <span className="text-slate-500">Geolocation:</span>
                            <span className="text-slate-300">X: {activeAsset.coordinates.x}% / Y: {activeAsset.coordinates.y}%</span>
                          </div>
                          <div className="flex justify-between border-b border-slate-900/60 pb-1">
                            <span className="text-slate-500">Last Seen:</span>
                            <span className="text-slate-400 text-[10px]">{new Date(activeAsset.lastSeen).toLocaleTimeString()}</span>
                          </div>
                          <div className="flex justify-between border-b border-slate-900/60 pb-1">
                            <span className="text-slate-500">Uptime Metric:</span>
                            <span className={`${activeAsset.status === 'offline' ? 'text-rose-500' : 'text-emerald-400'}`}>
                              {activeAsset.status === 'offline' ? 'Offline' : '5d 12h (99.98%)'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Temp / Core Load:</span>
                            <span className="text-slate-300">
                              {activeAsset.status === 'offline' ? 'N/A' : activeAsset.status === 'maintenance' ? '52°C / 45%' : '42°C / 15%'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Toggle High-Value inside Sidebar */}
                      <div className="bg-slate-900/40 p-3 rounded-lg border border-slate-850/40 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5">
                          <Gem className="w-3.5 h-3.5 text-indigo-400" />
                          <span className="text-slate-300 font-semibold">High-Value Tracking</span>
                        </div>
                        <input 
                          type="checkbox"
                          className="w-3.5 h-3.5 accent-rose-600 rounded cursor-pointer"
                          checked={!!activeAsset.isHighValue}
                          onChange={(e) => {
                            const nextVal = e.target.checked;
                            onUpdateAsset(activeAsset.id, { 
                              isHighValue: nextVal,
                              tags: nextVal ? [...(activeAsset.tags || []), 'high-value'] : (activeAsset.tags || []).filter(t => t !== 'high-value')
                            });
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {sidebarTab === 'performance' && (
                    <div className="space-y-4">
                      <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-850/60 space-y-1">
                        <span className="text-[9px] font-mono text-slate-500 uppercase block">Host Telemetry Flow</span>
                        <h5 className="font-sans font-bold text-slate-100 text-xs">Real-Time ICMP Latency & Jitter Check</h5>
                        <p className="text-[10px] text-slate-400">Historical latency logs over the past 10 minutes on network interface.</p>
                      </div>

                      {/* Performance Health Radial Gauge (aggregating 24h metrics) */}
                      <div className="bg-slate-900/40 p-3 rounded-lg border border-slate-850/40 space-y-3">
                        <div className="flex justify-between items-center border-b border-slate-800/60 pb-2">
                          <div>
                            <span className="text-[9px] font-mono text-rose-400 uppercase font-bold block">24h Performance Health</span>
                            <span className="text-[10px] text-slate-400">Aggregated Latency & Signal strength</span>
                          </div>
                          <span className={`text-xs font-mono font-bold px-1.5 py-0.5 rounded ${
                            activeAsset.status === 'offline' ? 'bg-rose-500/10 text-rose-400' :
                            activeAsset.status === 'maintenance' ? 'bg-amber-500/10 text-amber-400' :
                            'bg-emerald-500/10 text-emerald-400'
                          }`}>
                            {activeAsset.status === 'offline' ? 'CRITICAL' : activeAsset.status === 'maintenance' ? 'DEGRADED' : 'EXCELLENT'}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-3 items-center">
                          {/* Recharts Radial Gauge */}
                          <div className="h-28 w-28 mx-auto relative flex items-center justify-center">
                            <ResponsiveContainer width="100%" height="100%">
                              <RadialBarChart 
                                cx="50%" 
                                cy="50%" 
                                innerRadius="75%" 
                                outerRadius="100%" 
                                barSize={8} 
                                data={[{
                                  name: 'Health',
                                  value: activeAsset.status === 'offline' ? 0 : activeAsset.status === 'maintenance' ? 74 : 96,
                                  fill: activeAsset.status === 'offline' ? '#f43f5e' : activeAsset.status === 'maintenance' ? '#f59e0b' : '#10b981',
                                }]} 
                                startAngle={90} 
                                endAngle={-270}
                              >
                                <PolarAngleAxis
                                  type="number"
                                  domain={[0, 100]}
                                  angleAxisId={0}
                                  tick={false}
                                />
                                <RadialBar
                                  background={{ fill: '#1e293b' }}
                                  dataKey="value"
                                  cornerRadius={4}
                                />
                              </RadialBarChart>
                            </ResponsiveContainer>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                              <span className="text-lg font-bold font-mono text-slate-100">
                                {activeAsset.status === 'offline' ? '0' : activeAsset.status === 'maintenance' ? '74' : '96'}%
                              </span>
                              <span className="text-[8px] font-mono text-slate-500 uppercase tracking-widest">Health</span>
                            </div>
                          </div>

                          {/* Metric details */}
                          <div className="space-y-2 text-[10px] font-mono">
                            <div className="bg-slate-950/40 p-2 border border-slate-800 rounded">
                              <span className="text-slate-500 block">AVG LATENCY (24h)</span>
                              <strong className="text-slate-200">
                                {activeAsset.status === 'offline' ? 'N/A' : activeAsset.status === 'maintenance' ? '24.8 ms' : '5.3 ms'}
                              </strong>
                            </div>
                            <div className="bg-slate-950/40 p-2 border border-slate-800 rounded">
                              <span className="text-slate-500 block">SIGNAL STRENGTH</span>
                              <strong className={
                                activeAsset.status === 'offline' ? 'text-rose-400' :
                                activeAsset.status === 'maintenance' ? 'text-amber-400' :
                                'text-emerald-400'
                              }>
                                {activeAsset.status === 'offline' ? 'N/A' : activeAsset.status === 'maintenance' ? '-78 dBm (Fair)' : '-54 dBm (Strong)'}
                              </strong>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Recharts Area Chart */}
                      <div className="bg-slate-950 p-2 rounded-lg border border-slate-850 h-[140px] flex items-center justify-center relative">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart
                            data={[
                              { time: '10m', latency: 4, loss: 0 },
                              { time: '8m', latency: 5, loss: 0 },
                              { time: '6m', latency: activeAsset.status === 'offline' ? 0 : 3, loss: 0 },
                              { time: '4m', latency: activeAsset.status === 'offline' ? 0 : 8, loss: 0.1 },
                              { time: '2m', latency: activeAsset.status === 'offline' ? 0 : 12, loss: 0.5 },
                              { time: '1m', latency: activeAsset.status === 'offline' ? 0 : 5, loss: 0 },
                              { time: 'now', latency: activeAsset.status === 'offline' ? 0 : activeAsset.status === 'maintenance' ? 7 : 4, loss: 0 },
                            ]}
                            margin={{ top: 10, right: 10, left: -30, bottom: 0 }}
                          >
                            <defs>
                              <linearGradient id="colorLatency" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <XAxis dataKey="time" stroke="#475569" style={{ fontSize: '8px', fontFamily: 'monospace' }} />
                            <YAxis stroke="#475569" style={{ fontSize: '8px', fontFamily: 'monospace' }} />
                            <Tooltip 
                              contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '4px', fontSize: '9px', fontFamily: 'monospace' }}
                              labelStyle={{ color: '#94a3b8' }}
                            />
                            <Area type="monotone" dataKey="latency" stroke="#f43f5e" fillOpacity={1} fill="url(#colorLatency)" strokeWidth={1.5} />
                          </AreaChart>
                        </ResponsiveContainer>
                        {activeAsset.status === 'offline' && (
                          <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center text-rose-500 font-mono text-[10px]">
                            <ServerCrash className="w-8 h-8 text-rose-500 mb-1 animate-bounce" />
                            NODE COMMUNICATOR OFFLINE
                          </div>
                        )}
                      </div>

                      {/* Network Health Stats Cards */}
                      <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                        <div className="bg-slate-900/40 p-2 border border-slate-850/40 rounded">
                          <span className="text-slate-500 block">JITTER RATE</span>
                          <strong className="text-slate-200 text-[11px]">{activeAsset.status === 'offline' ? 'N/A' : '0.84 ms'}</strong>
                        </div>
                        <div className="bg-slate-900/40 p-2 border border-slate-850/40 rounded">
                          <span className="text-slate-500 block">PACKET RETRANSMIT</span>
                          <strong className="text-slate-200 text-[11px]">{activeAsset.status === 'offline' ? '100%' : '0.01%'}</strong>
                        </div>
                        <div className="bg-slate-900/40 p-2 border border-slate-850/40 rounded">
                          <span className="text-slate-500 block">BANDWIDTH USAGE</span>
                          <strong className="text-cyan-400 text-[11px]">{activeAsset.status === 'offline' ? '0 kbps' : '1.42 Mbps'}</strong>
                        </div>
                        <div className="bg-slate-900/40 p-2 border border-slate-850/40 rounded">
                          <span className="text-slate-500 block">HEALTH INDEX</span>
                          <strong className="text-emerald-400 text-[11px]">{activeAsset.status === 'offline' ? '0%' : activeAsset.status === 'maintenance' ? '82%' : '99.9%'}</strong>
                        </div>
                      </div>
                    </div>
                  )}

                  {sidebarTab === 'floorplan' && (
                    <div className="space-y-4">
                      <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-850/60 space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="text-[9px] font-mono text-slate-500 uppercase">Geofence Monitoring</span>
                          {isOutsideGeofence ? (
                            <span className="inline-flex items-center gap-1 bg-red-500/10 text-red-500 border border-red-500/20 px-1.5 py-0.5 rounded text-[8px] font-mono font-bold animate-pulse">
                              <ShieldAlert className="w-2.5 h-2.5" /> GEOFENCE BREACH
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-1.5 py-0.5 rounded text-[8px] font-mono font-bold">
                              <CheckCircle2 className="w-2.5 h-2.5" /> ZONE SECURED
                            </span>
                          )}
                        </div>
                        <h5 className="font-sans font-bold text-slate-100 text-xs">Stage Zone Floor-plan Preview</h5>
                        <p className="text-[10px] text-slate-400">Current sub-zone location based on active coordinates.</p>
                      </div>

                      {/* Zone Position Map Preview Box (Interactive Dragging Enabled) */}
                      <div 
                        ref={mapRef}
                        onPointerDown={handleMapPointerDown}
                        onPointerMove={handleMapPointerMove}
                        onPointerUp={handleMapPointerUp}
                        style={{ touchAction: 'none' }}
                        className="bg-slate-950 p-2 rounded-lg border border-slate-800 h-44 relative overflow-hidden flex flex-col justify-between cursor-crosshair select-none"
                      >
                        
                        {/* Grid Backdrop Lines */}
                        <div className="absolute inset-0 grid grid-cols-10 grid-rows-10 opacity-10 pointer-events-none">
                          {Array.from({ length: 100 }).map((_, i) => (
                            <div key={i} className="border-b border-r border-slate-800"></div>
                          ))}
                        </div>

                        {/* Stage Geofence boundaries (20% to 80% coordinates) */}
                        <div 
                          className="absolute border border-dashed border-rose-500/30 bg-rose-500/5 rounded"
                          style={{
                            left: '20%',
                            top: '20%',
                            width: '60%',
                            height: '60%'
                          }}
                        >
                          <span className="absolute bottom-1 right-1 text-[7px] font-mono text-rose-500/40">GEOFENCE BOUNDARY</span>
                        </div>

                        {/* Current Location Point (Glowing Beacon) */}
                        <div 
                          className="absolute -translate-x-1/2 -translate-y-1/2 z-10"
                          style={{
                            left: `${activeAsset.coordinates.x}%`,
                            top: `${activeAsset.coordinates.y}%`
                          }}
                        >
                          <span className="relative flex h-3.5 w-3.5">
                            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                              activeAsset.status === 'offline' ? 'bg-red-500' : isOutsideGeofence ? 'bg-amber-500' : 'bg-cyan-500'
                            }`}></span>
                            <span className={`relative inline-flex rounded-full h-3.5 w-3.5 border border-white/20 ${
                              activeAsset.status === 'offline' ? 'bg-red-500' : isOutsideGeofence ? 'bg-amber-500' : 'bg-cyan-500'
                            }`}></span>
                          </span>
                          <span className="absolute left-4 top-0 bg-slate-900/90 text-white border border-slate-800 px-1.5 py-0.5 rounded text-[8px] font-mono font-bold whitespace-nowrap shadow-lg">
                            {activeAsset.name}
                          </span>
                        </div>

                        {/* Map Labels */}
                        <div className="text-[8px] font-mono text-slate-600 flex justify-between w-full select-none z-10 pointer-events-none p-1">
                          <span>(0,0) FRONT STAGE LEFT</span>
                          <span>FRONT STAGE RIGHT (100,0)</span>
                        </div>

                        <div className="text-[8px] font-mono text-slate-600 flex justify-between w-full select-none z-10 pointer-events-none p-1 mt-auto">
                          <span>(0,100) BACKSTAGE LEFT</span>
                          <span>BACKSTAGE RIGHT (100,100)</span>
                        </div>
                      </div>

                      {/* Zone Details */}
                      <div className="bg-slate-900/40 p-3 rounded-lg border border-slate-850/40 text-xs space-y-1.5">
                        <div className="flex justify-between font-mono text-[11px]">
                          <span className="text-slate-500">Calculated Zone:</span>
                          <strong className={`${isOutsideGeofence ? 'text-rose-400 animate-pulse' : 'text-cyan-400'} font-semibold`}>
                            {currentZone.toUpperCase()}
                          </strong>
                        </div>
                        <div className="flex justify-between font-mono text-[11px] border-t border-slate-900/60 pt-1.5">
                          <span className="text-slate-500">Relative Offset:</span>
                          <strong className="text-slate-300">X: {activeAsset.coordinates.x}% / Y: {activeAsset.coordinates.y}%</strong>
                        </div>
                        <div className="flex justify-between font-mono text-[11px] border-t border-slate-900/60 pt-1.5">
                          <span className="text-slate-500">Signal Range Index:</span>
                          <strong className="text-slate-300">{isOutsideGeofence ? 'degraded (35%)' : 'excellent (94%)'}</strong>
                        </div>
                      </div>
                    </div>
                  )}

                  {sidebarTab === 'console' && (
                    <div className="space-y-4">
                      {/* Live Ping Utility */}
                      <div className="bg-slate-900/40 p-3 rounded-lg border border-slate-850/40 space-y-2">
                        <div className="flex justify-between items-center">
                          <label className="text-[9px] font-mono text-slate-500 uppercase">Live ICMP Diagnostics</label>
                          <span className="text-[9px] text-cyan-400 font-mono">{activeAsset.ipAddress}</span>
                        </div>
                        <div className="flex gap-2">
                          <div className="flex-1 flex items-center bg-slate-950 border border-slate-800 rounded px-2 py-1 gap-1.5">
                            <span className="text-slate-500 font-mono text-xs select-none">ping</span>
                            <input
                              type="text"
                              className="flex-1 bg-transparent border-none p-0 text-xs text-cyan-300 font-mono focus:outline-none focus:ring-0"
                              value={customPingIp}
                              onChange={(e) => setCustomPingIp(e.target.value)}
                              placeholder={activeAsset.ipAddress}
                              disabled={isPinging || isRebooting}
                            />
                            <span className="text-slate-500 font-mono text-[10px] select-none">-c 4</span>
                          </div>
                          <button
                            onClick={handleLivePing}
                            disabled={isPinging || isRebooting || !customPingIp.trim()}
                            className="px-3 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded text-[10px] font-mono font-bold transition-all cursor-pointer flex items-center gap-1 shrink-0"
                          >
                            <Wifi className="w-3 h-3" /> PING
                          </button>
                        </div>
                      </div>

                      {/* Remote Shell Console Terminal */}
                      <div className="bg-slate-900/40 p-3 rounded-lg border border-slate-850/40 space-y-1.5">
                        <div className="flex justify-between items-center">
                          <label className="text-[9px] font-mono text-slate-500 uppercase flex items-center gap-1">
                            <Terminal className="w-3 h-3 text-emerald-400" /> Interactive Remote Shell
                          </label>
                          <span className="text-[8px] text-emerald-400/60 font-mono">root@node:~#</span>
                        </div>

                        {/* Terminal Black Box */}
                        <div className="bg-slate-950 rounded border border-slate-850/80 p-2.5 h-36 font-mono text-[9px] text-emerald-400 overflow-y-auto space-y-1 leading-relaxed">
                          {terminalLogs.map((log, idx) => (
                            <div key={idx} className="whitespace-pre-wrap break-all">{log}</div>
                          ))}
                          {isRebooting && (
                            <div className="animate-pulse text-amber-400">Connection suspended. Retrying connection...</div>
                          )}
                          <div className="flex items-center gap-1">
                            <span className="text-emerald-500 shrink-0">root@node-cli:~#</span>
                            <input
                              type="text"
                              value={terminalInput}
                              disabled={isRebooting || isPinging}
                              onChange={(e) => setTerminalInput(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleCommandExecute(terminalInput);
                                }
                              }}
                              className="flex-1 bg-transparent border-none text-emerald-400 outline-none p-0 text-[9px] focus:ring-0 focus:outline-none"
                              placeholder="..."
                            />
                          </div>
                        </div>

                        {/* Terminal Command Quick Buttons */}
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          <button
                            type="button"
                            onClick={() => handleCommandExecute('status')}
                            className="px-2 py-0.5 bg-slate-950 hover:bg-slate-800 text-[8px] text-emerald-400 font-mono rounded border border-slate-850/80 cursor-pointer transition-all"
                          >
                            [status]
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCommandExecute('vlan')}
                            className="px-2 py-0.5 bg-slate-950 hover:bg-slate-800 text-[8px] text-emerald-400 font-mono rounded border border-slate-850/80 cursor-pointer transition-all"
                          >
                            [vlan]
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCommandExecute('diagnose')}
                            className="px-2 py-0.5 bg-slate-950 hover:bg-slate-800 text-[8px] text-emerald-400 font-mono rounded border border-slate-850/80 cursor-pointer transition-all"
                          >
                            [diagnose]
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCommandExecute('reboot')}
                            className="px-2 py-0.5 bg-red-950/30 hover:bg-red-950/60 text-[8px] text-rose-400 font-mono rounded border border-red-900/30 cursor-pointer transition-all"
                          >
                            [reboot]
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCommandExecute('clear')}
                            className="px-2 py-0.5 bg-slate-950 hover:bg-slate-800 text-[8px] text-slate-500 font-mono rounded border border-slate-850/80 cursor-pointer ml-auto transition-all"
                          >
                            [clear]
                          </button>
                        </div>
                      </div>

                      {/* Network Topology Hop Diagram */}
                      <div className="bg-slate-900/40 p-3 rounded-lg border border-slate-850/40 space-y-2">
                        <label className="text-[9px] font-mono text-slate-500 uppercase flex items-center gap-1">
                          <Network className="w-3.5 h-3.5 text-indigo-400" /> Segment Topology Hops
                        </label>

                        <div className="bg-slate-950/60 border border-slate-850/50 rounded-lg p-2 flex items-center justify-between font-mono text-[8px]">
                          <div className="flex flex-col items-center">
                            <div className="w-7 h-7 bg-emerald-950 border border-emerald-500/30 rounded-full flex items-center justify-center text-emerald-400 font-bold mb-1 shadow shadow-emerald-500/10">
                              GT
                            </div>
                            <span className="text-slate-300">Gateway</span>
                            <span className="text-slate-500 text-[6px]">10.12.1.1</span>
                          </div>

                          <ChevronRight className="w-3 h-3 text-slate-700 animate-pulse shrink-0" />

                          <div className="flex flex-col items-center">
                            <div className="w-7 h-7 bg-emerald-950 border border-emerald-500/30 rounded-full flex items-center justify-center text-emerald-400 font-bold mb-1 shadow shadow-emerald-500/10">
                              CR
                            </div>
                            <span className="text-slate-300">Core SW</span>
                            <span className="text-slate-500 text-[6px]">10.12.1.5</span>
                          </div>

                          <ChevronRight className="w-3 h-3 text-slate-700 animate-pulse shrink-0" />

                          <div className="flex flex-col items-center">
                            <div className="w-7 h-7 bg-emerald-950 border border-emerald-500/30 rounded-full flex items-center justify-center text-emerald-400 font-bold mb-1 shadow shadow-emerald-500/10">
                              ED
                            </div>
                            <span className="text-slate-300">Edge SW</span>
                            <span className="text-slate-500 text-[6px]">10.12.10.1</span>
                          </div>

                          <ChevronRight className="w-3 h-3 text-slate-700 animate-pulse shrink-0" />

                          <div className="flex flex-col items-center">
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold mb-1 shadow ${
                              activeAsset.status === 'offline' 
                                ? 'bg-red-950 border border-red-500/30 text-red-400 shadow-red-500/10' 
                                : activeAsset.status === 'maintenance' 
                                  ? 'bg-amber-950 border border-amber-500/30 text-amber-400 shadow-amber-500/10'
                                  : 'bg-cyan-950 border border-cyan-500/30 text-cyan-400 shadow-cyan-500/10'
                            }`}>
                              {activeAsset.category.substring(0, 2).toUpperCase()}
                            </div>
                            <span className="text-slate-300 truncate max-w-[50px]">{activeAsset.name}</span>
                            <span className="text-cyan-400 text-[6px]">{activeAsset.ipAddress}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Delete button from Sidebar */}
                <div className="pt-2">
                  <button
                    onClick={() => setAssetToDelete(activeAsset)}
                    className="w-full py-2 bg-red-600 hover:bg-red-500 text-white font-mono text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer uppercase border border-red-500/20 shadow-md animate-pulse"
                  >
                    <Trash2 className="w-4 h-4" /> Delete Asset Node
                  </button>
                </div>
              </motion.div>
            );
          })()}
        </AnimatePresence>
      </div>

      {/* Delete Confirmation Dialog */}
      <AnimatePresence>
        {assetToDelete && (
          <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center gap-3 text-red-500 border-b border-slate-800 pb-3">
                <AlertCircle className="w-6 h-6 shrink-0 text-red-500" />
                <h4 className="font-sans font-bold text-slate-100 text-base">Confirm Deletion</h4>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Are you sure you want to delete <span className="font-semibold text-rose-400">{assetToDelete.name}</span> (<span className="font-mono text-[10px] text-slate-400">{assetToDelete.id}</span>)? 
                This action cannot be undone and will remove the hardware asset from the system.
              </p>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setAssetToDelete(null)}
                  className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold cursor-pointer transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    onDeleteAsset(assetToDelete.id);
                    if (selectedAssetForConfig?.id === assetToDelete.id) {
                      setSelectedAssetForConfig(null);
                    }
                    setAssetToDelete(null);
                  }}
                  className="px-3.5 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-semibold cursor-pointer transition-all uppercase font-mono"
                >
                  Confirm Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Bulk Action Confirmation Modal */}
      <AnimatePresence>
        {bulkConfirmAction && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 font-sans"
            >
              <div className="flex items-center gap-3 text-amber-500 border-b border-slate-800 pb-3">
                <AlertCircle className="w-6 h-6 shrink-0 text-amber-500" />
                <h4 className="font-sans font-bold text-slate-100 text-base uppercase tracking-wider">
                  {bulkConfirmAction.type === 'delete' ? 'Confirm Bulk Deletion' : bulkConfirmAction.type === 'reassign' ? 'Confirm Bulk Reassignment' : 'Confirm Bulk Status Update'}
                </h4>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                You are about to perform a bulk operation modifying{' '}
                <span className="font-bold text-rose-400 font-mono text-sm bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                  {bulkConfirmAction.count} assets
                </span>{' '}
                simultaneously.
              </p>
              {bulkConfirmAction.type === 'reassign' && (
                <div className="bg-slate-950/50 border border-slate-800/80 p-3 rounded-lg text-xs space-y-1">
                  <span className="text-slate-500 font-mono">Target Operator:</span>
                  <strong className="text-cyan-400 block font-semibold text-xs">{bulkConfirmAction.techName}</strong>
                </div>
              )}
              {bulkConfirmAction.type === 'status' && (
                <div className="bg-slate-950/50 border border-slate-800/80 p-3 rounded-lg text-xs space-y-1">
                  <span className="text-slate-500 font-mono">Target Status:</span>
                  <strong className="text-cyan-400 block font-semibold text-xs uppercase">{bulkConfirmAction.statusVal}</strong>
                </div>
              )}
              <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-lg text-[11px] font-mono leading-relaxed text-amber-400 flex gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0 text-amber-500 mt-0.5" />
                <span>
                  <strong>WARNING:</strong> This will batch-update {bulkConfirmAction.count} active catalog indices. Please verify this action before submitting operator authentication commands.
                </span>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setBulkConfirmAction(null)}
                  className="px-4 py-1.5 bg-slate-850 hover:bg-slate-800 border border-slate-700/60 hover:border-slate-600 text-slate-300 hover:text-white rounded-lg text-xs font-semibold cursor-pointer transition-all"
                >
                  Cancel Action
                </button>
                <button
                  onClick={() => {
                    if (bulkConfirmAction.type === 'delete') {
                      executeBulkDelete();
                    } else if (bulkConfirmAction.type === 'reassign') {
                      executeBulkReassign();
                    } else if (bulkConfirmAction.type === 'status') {
                      executeBulkStatusUpdate();
                    }
                  }}
                  className={`px-4 py-1.5 rounded-lg text-xs font-mono font-bold uppercase tracking-wider text-white transition-all cursor-pointer shadow-lg ${
                    bulkConfirmAction.type === 'delete' 
                      ? 'bg-rose-600 hover:bg-rose-500 hover:shadow-rose-500/20' 
                      : 'bg-emerald-600 hover:bg-emerald-500 hover:shadow-emerald-500/20'
                  }`}
                >
                  Confirm Bulk Action
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Plus Icon Category Popup */}
      <AnimatePresence>
        {plusCategory && (
          <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center gap-3 text-rose-500 border-b border-slate-800 pb-3">
                <Plus className="w-5 h-5 shrink-0 text-rose-500" />
                <h4 className="font-sans font-bold text-slate-100 text-sm uppercase tracking-wider">Add Custom Option</h4>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Define one or more new values for <span className="font-semibold text-rose-400">{plusCategory.label}</span>:
                <span className="block text-[10px] text-slate-400 mt-0.5 font-sans">You can enter multiple options separated by commas, semicolons, or newlines.</span>
              </p>
              <textarea
                placeholder="e.g. VLAN 15, Offline Staging&#10;Main Stage, Left Wing"
                rows={3}
                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-rose-500 transition-colors resize-none font-mono"
                value={plusInput}
                onChange={(e) => setPlusInput(e.target.value)}
                autoFocus
                onKeyDown={async (e) => {
                  if (e.key === 'Enter' && !e.shiftKey && plusInput.trim()) {
                    e.preventDefault();
                    if (onAddDropdownOption) {
                      await onAddDropdownOption(plusCategory.id, plusInput.trim());
                    }
                    setPlusCategory(null);
                    setPlusInput('');
                  }
                }}
              />
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setPlusCategory(null);
                    setPlusInput('');
                  }}
                  className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold cursor-pointer transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!plusInput.trim()}
                  onClick={async () => {
                    if (plusInput.trim() && onAddDropdownOption) {
                      await onAddDropdownOption(plusCategory.id, plusInput.trim());
                    }
                    setPlusCategory(null);
                    setPlusInput('');
                  }}
                  className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold cursor-pointer transition-all uppercase font-mono disabled:opacity-50"
                >
                  Add Option
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CSV Bulk Upload Modal */}
      <AnimatePresence>
        {isCsvModalOpen && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-slate-950 border border-slate-700 rounded-xl w-full max-w-2xl shadow-[0_0_50px_rgba(16,185,129,0.1)] overflow-hidden flex flex-col max-h-[90vh] font-sans text-slate-200"
            >
              {/* Header */}
              <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-900/60">
                <div className="flex items-center gap-2.5">
                  <Database className="w-5 h-5 text-emerald-400" />
                  <div>
                    <h3 className="font-sans font-bold text-slate-100 text-sm uppercase tracking-wider">Bulk Import Device Manifest</h3>
                    <p className="text-[10px] text-slate-500">Deploy multiple hardware assets in parallel by parsing standard comma-separated text sheets.</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsCsvModalOpen(false)}
                  className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 overflow-y-auto space-y-5 flex-1 scrollbar-thin text-xs text-slate-300">
                
                {/* Drag and Drop Zone */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    const file = e.dataTransfer.files[0];
                    if (file) {
                      setCsvFileName(file.name);
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        const text = event.target?.result as string;
                        setCsvRawText(text);
                        parseCSVContent(text);
                      };
                      reader.readAsText(file);
                    }
                  }}
                  className={`border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer ${
                    isDragging 
                      ? 'border-emerald-500 bg-emerald-950/20 text-emerald-300' 
                      : 'border-slate-800 bg-slate-900/30 hover:bg-slate-900/50 text-slate-400'
                  }`}
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = '.csv';
                    input.onchange = (e) => {
                      const file = (e.target as HTMLInputElement).files?.[0];
                      if (file) {
                        setCsvFileName(file.name);
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          const text = event.target?.result as string;
                          setCsvRawText(text);
                          parseCSVContent(text);
                        };
                        reader.readAsText(file);
                      }
                    };
                    input.click();
                  }}
                >
                  <Database className={`w-8 h-8 mx-auto mb-2.5 transition-all ${isDragging ? 'text-emerald-400 scale-110' : 'text-slate-500'}`} />
                  <p className="font-bold text-slate-200">
                    {csvFileName ? `File selected: ${csvFileName}` : "Drag & Drop Manifest CSV File here"}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-1">or click to browse local folders (supports .csv format)</p>
                </div>

                {/* Paste fall-back or template guidance */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">Or Paste Raw CSV Text</span>
                    <button 
                      type="button" 
                      onClick={() => {
                        const template = "name,category,status,serialNumber,assignedTo,ipAddress,isWireless,batteryLevel\nShowground Projector Delta,Projector,active,SN-772152,Seth Boa Amponsem,192.168.1.44,false,95\nVIP Sound System C,Speaker,maintenance,SN-881254,Technician Blue,192.168.1.88,true,80";
                        setCsvRawText(template);
                        parseCSVContent(template);
                        setCsvFileName("template_example.csv");
                      }}
                      className="text-[10px] text-emerald-400 hover:underline cursor-pointer font-bold"
                    >
                      Insert Example Template
                    </button>
                  </div>
                  <textarea
                    rows={4}
                    placeholder="name,category,status,serialNumber,assignedTo,ipAddress,isWireless,batteryLevel..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 font-mono text-[11px] text-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    value={csvRawText}
                    onChange={(e) => {
                      setCsvRawText(e.target.value);
                      parseCSVContent(e.target.value);
                    }}
                  />
                </div>

                {csvError && (
                  <div className="bg-rose-950/20 border border-rose-500/30 text-rose-400 p-3 rounded-lg font-mono text-[10px] flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{csvError}</span>
                  </div>
                )}

                {/* Live Mapped Fields Overview */}
                {parsedAssets.length > 0 && (
                  <div className="bg-slate-900/60 border border-slate-850 rounded-lg p-4 space-y-3">
                    <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                      <span className="font-bold text-slate-200">Parsed Header Mapping Summary</span>
                      <span className="text-emerald-400 font-mono font-bold bg-emerald-950/40 border border-emerald-900/40 px-2 py-0.5 rounded text-[10px]">
                        {parsedAssets.length} Record(s) Found
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-[10px] font-mono">
                      {Object.entries(mappedFields).map(([csvHeader, assetField]) => (
                        <div key={csvHeader} className="bg-slate-950 border border-slate-900 p-2 rounded flex flex-col">
                          <span className="text-slate-500 uppercase text-[9px]">CSV Header</span>
                          <span className="font-bold text-slate-300 truncate" title={csvHeader}>"{csvHeader}"</span>
                          <span className="text-emerald-500 mt-1 font-sans">➡ maps to: <strong>{assetField}</strong></span>
                        </div>
                      ))}
                    </div>

                    {/* Preview Table */}
                    <div className="space-y-1.5 pt-2">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 block">Preview (First 3 Rows)</span>
                      <div className="border border-slate-850 rounded overflow-hidden">
                        <table className="w-full text-left text-[10px] font-sans">
                          <thead>
                            <tr className="bg-slate-950 text-slate-400 border-b border-slate-850">
                              <th className="p-2 font-mono">Asset Name</th>
                              <th className="p-2 font-mono">Category</th>
                              <th className="p-2 font-mono">Serial Number</th>
                              <th className="p-2 font-mono">IP Address</th>
                              <th className="p-2 font-mono">Technician</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-850">
                            {parsedAssets.slice(0, 3).map((a, idx) => (
                              <tr key={idx} className="hover:bg-slate-900/40">
                                <td className="p-2 font-semibold text-slate-200">{a.name}</td>
                                <td className="p-2 text-slate-400">{a.category}</td>
                                <td className="p-2 font-mono text-slate-400">{a.serialNumber}</td>
                                <td className="p-2 font-mono text-cyan-400">{a.ipAddress || 'DHCP-LEASE'}</td>
                                <td className="p-2 text-slate-300">{a.assignedTo || 'Unassigned'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-slate-800 bg-slate-900/60 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCsvModalOpen(false)}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-400 hover:text-white rounded-lg transition-all cursor-pointer font-mono"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={parsedAssets.length === 0}
                  onClick={() => {
                    parsedAssets.forEach(item => {
                      onAddAsset({
                        ...item,
                        id: `ast-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
                        createdAt: new Date().toISOString()
                      });
                    });
                    playScanChime();
                    setIsCsvModalOpen(false);
                    alert(`Successfully imported and deployed ${parsedAssets.length} hardware assets!`);
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold font-mono uppercase rounded-lg transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
                >
                  <Database className="w-3.5 h-3.5" /> Deploy {parsedAssets.length} Assets
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

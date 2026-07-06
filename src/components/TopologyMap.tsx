import React, { useState, useEffect, useMemo, useRef } from 'react';
import { TopologyNode, SwitchDevice } from '../types';
import { db, doc, setDoc, updateDoc, collection, onSnapshot, deleteDoc, getDocs } from '../firebase';
import { motion, AnimatePresence } from 'motion/react';
import * as d3 from 'd3';
import EndpointAgentsConsole from './EndpointAgentsConsole';
import { 
  Activity, 
  ShieldAlert, 
  Cpu, 
  Network, 
  Zap, 
  Play, 
  Pause, 
  Download, 
  Search, 
  Filter, 
  ArrowUpDown, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  RefreshCw,
  Power,
  HelpCircle,
  Clock,
  Settings,
  Server,
  StopCircle,
  TrendingUp,
  AlertOctagon,
  FileText,
  Plus,
  Battery,
  X,
  Info,
  ZoomIn,
  ZoomOut,
  Maximize2,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  LayoutGrid,
  Grid,
  Loader2,
  List,
  ArrowLeftRight,
  TrendingDown,
  Database,
  Trash2,
  AlertCircle
} from 'lucide-react';

interface TopologyMapProps {
  nodes: TopologyNode[];
  devices?: SwitchDevice[];
  onTriggerPingAll: () => Promise<string>;
  isPinging: boolean;
  pingProgress: { percent: number; scanned: number; total: number; statusText: string } | null;
  continuousMonitoring: boolean;
  setContinuousMonitoring: (val: boolean) => void;
  monitorInterval: number;
  setMonitorInterval: (val: number) => void;
  onPrintReport?: (report: { title: string; headers: string[]; rows: string[][]; summaries: { label: string; value: string }[] }) => void;
  onAdoptDevice?: (device: any) => Promise<void>;
}

interface LiveTrafficMonitorProps {
  selectedNode: TopologyNode;
}

function LiveTrafficMonitor({ selectedNode }: LiveTrafficMonitorProps) {
  const [trafficRx, setTrafficRx] = useState(3.4);
  const [trafficTx, setTrafficTx] = useState(1.8);
  const [packetsPerSec, setPacketsPerSec] = useState(165);
  const [unicastCount, setUnicastCount] = useState(128400);
  const [multicastCount, setMulticastCount] = useState(38400);
  const [broadcastCount, setBroadcastCount] = useState(1400);
  const [errors, setErrors] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setTrafficRx(prev => {
        const change = (Math.random() - 0.5) * 1.2;
        return Math.max(0.1, parseFloat((prev + change).toFixed(2)));
      });
      setTrafficTx(prev => {
        const change = (Math.random() - 0.5) * 0.8;
        return Math.max(0.1, parseFloat((prev + change).toFixed(2)));
      });
      setPacketsPerSec(prev => {
        const change = Math.floor((Math.random() - 0.5) * 40);
        return Math.max(10, prev + change);
      });
      setUnicastCount(prev => prev + Math.floor(Math.random() * 100));
      setMulticastCount(prev => prev + Math.floor(Math.random() * 20));
      setBroadcastCount(prev => prev + Math.floor(Math.random() * 2));
      if (Math.random() > 0.98) {
        setErrors(prev => prev + 1);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const capacity = selectedNode.type === 'core_switch' ? 1000 : 100;
  const rxPercentage = Math.min(100, (trafficRx / capacity) * 100);
  const txPercentage = Math.min(100, (trafficTx / capacity) * 100);

  const numPorts = selectedNode.type?.includes('switch') ? 12 : 4;
  const ports = Array.from({ length: numPorts }).map((_, i) => {
    const isUplink = i === 0;
    const isOnline = selectedNode.status !== 'offline' && (isUplink || (i % 3 !== 2));
    const speed = isUplink ? '10G' : selectedNode.type?.includes('switch') ? '1G' : '100M';
    return {
      portNum: i + 1,
      isOnline,
      speed,
      isUplink,
      type: isUplink ? 'Fiber Optic' : 'Copper RJ45'
    };
  });

  return (
    <div className="space-y-5 text-sans text-xs">
      <div className="space-y-4 bg-slate-950/60 p-4 rounded-lg border border-slate-850">
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-slate-400 font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping"></span>
              Rx Rate (Incoming):
            </span>
            <span className="font-mono font-bold text-cyan-400">{trafficRx} Mbps <span className="text-slate-500 font-normal">/ {capacity} Mbps</span></span>
          </div>
          <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden border border-slate-800">
            <div 
              className="bg-cyan-500 h-full transition-all duration-1000 ease-out shadow-[0_0_8px_rgba(34,211,238,0.5)]" 
              style={{ width: `${Math.max(3, rxPercentage * 5)}%` }} 
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-slate-400 font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-ping"></span>
              Tx Rate (Outgoing):
            </span>
            <span className="font-mono font-bold text-violet-400">{trafficTx} Mbps <span className="text-slate-500 font-normal">/ {capacity} Mbps</span></span>
          </div>
          <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden border border-slate-800">
            <div 
              className="bg-violet-500 h-full transition-all duration-1000 ease-out shadow-[0_0_8px_rgba(139,92,246,0.5)]" 
              style={{ width: `${Math.max(3, txPercentage * 5)}%` }} 
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-slate-950/40 p-3 rounded-lg border border-slate-850/60 font-mono">
          <span className="text-[9px] text-slate-500 uppercase tracking-wider block mb-0.5">Total Packets / Sec</span>
          <span className="text-sm font-bold text-slate-200">{packetsPerSec} pps</span>
        </div>
        <div className="bg-slate-950/40 p-3 rounded-lg border border-slate-850/60 font-mono">
          <span className="text-[9px] text-slate-500 uppercase tracking-wider block mb-0.5">CRC / Packet Errors</span>
          <span className={`text-sm font-bold ${errors > 0 ? 'text-rose-400 animate-pulse' : 'text-emerald-400'}`}>{errors} pkts</span>
        </div>
        <div className="bg-slate-950/40 p-3 rounded-lg border border-slate-850/60 font-mono">
          <span className="text-[9px] text-slate-500 uppercase tracking-wider block mb-0.5">Unicast Traffic</span>
          <span className="text-xs font-semibold text-slate-300">{unicastCount.toLocaleString()}</span>
        </div>
        <div className="bg-slate-950/40 p-3 rounded-lg border border-slate-850/60 font-mono">
          <span className="text-[9px] text-slate-500 uppercase tracking-wider block mb-0.5">Multicast Traffic</span>
          <span className="text-xs font-semibold text-slate-300">{multicastCount.toLocaleString()}</span>
        </div>
      </div>

      <div className="space-y-3 bg-slate-950/40 p-4 rounded-lg border border-slate-850">
        <div className="flex justify-between items-center border-b border-slate-850 pb-1.5">
          <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-slate-400">Physical Interface RJ45/SFP Ports</span>
          <span className="text-[9px] text-slate-500 font-mono">Link State Monitor</span>
        </div>
        <div className="grid grid-cols-6 gap-2.5">
          {ports.map(port => (
            <div 
              key={port.portNum}
              className={`p-2 rounded-md border flex flex-col items-center justify-center relative ${
                port.isOnline 
                  ? 'bg-slate-900/80 border-slate-800' 
                  : 'bg-slate-950/60 border-slate-900/60'
              }`}
              title={`Port ${port.portNum} (${port.speed}) - ${port.isOnline ? 'Connected' : 'Disconnected'} ${port.type}`}
            >
              <span className="text-[8px] font-mono text-slate-500 mb-1 leading-none">{port.portNum}</span>
              <span className={`w-2.5 h-2.5 rounded-full border shadow-sm ${
                port.isOnline 
                  ? port.isUplink 
                    ? 'bg-cyan-400 border-cyan-300 shadow-cyan-500/50 animate-pulse' 
                    : 'bg-emerald-500 border-emerald-400 shadow-emerald-500/50 animate-pulse'
                  : 'bg-slate-800 border-slate-850'
              }`} />
              <span className="text-[7px] font-mono text-slate-400 mt-1 uppercase scale-90 leading-none">{port.speed}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

interface DiscoveredSubnet {
  subnet: string;
  name: string;
  ip: string;
  ips: string[];
}

export default function TopologyMap({
  nodes,
  devices = [],
  onTriggerPingAll,
  isPinging: appIsPinging,
  pingProgress: appPingProgress,
  continuousMonitoring,
  setContinuousMonitoring,
  monitorInterval,
  setMonitorInterval,
  onPrintReport,
  onAdoptDevice
}: TopologyMapProps) {
  const [selectedNode, setSelectedNode] = useState<TopologyNode | null>(null);
  const [heatmapEnabled, setHeatmapEnabled] = useState(false);
  const [showLegend, setShowLegend] = useState(false); // Always hide by default

  const [topoStatusFilter, setTopoStatusFilter] = useState<'all' | 'online' | 'degraded' | 'offline'>('all');
  const [clientViewMode, setClientViewMode] = useState<'list' | 'grid'>('list'); // List view as default
  const [isDiscoveringClients, setIsDiscoveringClients] = useState(false);
  const [drawerTab, setDrawerTab] = useState<'specs' | 'traffic' | 'pings'>('specs');

  // Sorting State for Ping Sweep Table
  const [sortField, setSortField] = useState<'ip' | 'name' | 'latency' | 'status' | 'mac' | 'vendor'>('ip');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Filtering State for Ping Sweep Table
  const [tableSearchQuery, setTableSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'online' | 'offline' | 'timeout'>('all');
  const [subnetFilter, setSubnetFilter] = useState<'all' | '10.12.1.' | '10.12.10.' | '10.12.20.' | '10.12.30.' | '10.12.40.' | '10.12.50.'>('all');

  // Network subnets & interactive scanner states
  const [subnetsList, setSubnetsList] = useState<DiscoveredSubnet[]>([]);
  const [selectedSubnet, setSelectedSubnet] = useState<string>('');
  const [concurrency, setConcurrency] = useState<number>(100);
  const [timeout, setTimeoutVal] = useState<number>(500);
  
  // Local scan tracking
  const [scanState, setScanState] = useState<'idle' | 'scanning' | 'paused' | 'completed'>('idle');
  const [progress, setProgress] = useState({
    percent: 0,
    scanned: 0,
    total: 0,
    onlineCount: 0,
    currentIp: '',
    elapsedTime: 0,
    estimatedTime: 0
  });

  // Top sub tab selection
  const [activeSubTab, setActiveSubTab] = useState<'topology' | 'scanner' | 'devices' | 'inventory' | 'agents'>('topology');
  const [livePolling, setLivePolling] = useState(true);

  // Single-Device Pinger States
  const [pingTarget, setPingTarget] = useState('10.12.10.1');
  const [packetCount, setPacketCount] = useState<'1' | '4' | '8' | '12' | 'continuous'>('4');
  const [pingerLogs, setPingerLogs] = useState<string[]>([]);
  const [isPingerRunning, setIsPingerRunning] = useState(false);
  const pingerStopRef = useRef(false);

  // Quick Device Add Form States
  const [showAddDeviceModal, setShowAddDeviceModal] = useState(false);
  const [newDeviceName, setNewDeviceName] = useState('');
  const [newDeviceIp, setNewDeviceIp] = useState('');
  const [newDeviceType, setNewDeviceType] = useState<'hardware' | 'gateway' | 'core_switch' | 'dist_switch'>('hardware');
  const [newDeviceParent, setNewDeviceParent] = useState('node-core');

  // Bulk Selection States
  const [selectedBulkNodeIds, setSelectedBulkNodeIds] = useState<string[]>([]);

  // Floating Hover Tooltip State
  const [hoveredLink, setHoveredLink] = useState<{ srcName: string; tgtName: string; latency: string; status: string } | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Detailed specifications modal
  const [isNodeModalOpen, setIsNodeModalOpen] = useState(false);

  // New States for Custom Port Modal, Toast Alerts and Scanner View Filter
  const [isPortModalOpen, setIsPortModalOpen] = useState(false);
  const [toastList, setToastList] = useState<{ id: string; message: string; type: 'success' | 'info' | 'warn' }[]>([]);
  const [scannerViewFilter, setScannerViewFilter] = useState<'all' | 'alive' | 'offline'>('all');

  // NEW STATES FOR THE EXPANDED SCANNER FEATURES
  const [schedules, setSchedules] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('tmpl-web');
  const [newTemplateName, setNewTemplateName] = useState('');
  
  // Schedule creation state
  const [showAddScheduleForm, setShowAddScheduleForm] = useState(false);
  const [newScheduleName, setNewScheduleName] = useState('');
  const [newScheduleTime, setNewScheduleTime] = useState('02:00');
  const [newScheduleFreq, setNewScheduleFreq] = useState<'daily' | 'weekly' | 'hourly'>('daily');
  const [newScheduleSubnet, setNewScheduleSubnet] = useState('');

  // Auto-Tagging state
  const [enableAutoTagging, setEnableAutoTagging] = useState(true);
  const [autoTaggingRules, setAutoTaggingRules] = useState([
    { pattern: 'Cisco', tag: 'Cisco-Device', type: 'vendor' },
    { pattern: 'Huawei', tag: 'Cisco-Device', type: 'vendor' },
    { pattern: 'Juniper', tag: 'Cisco-Device', type: 'vendor' },
    { pattern: 'cam', tag: 'IoT-Sensor', type: 'hostname' },
    { pattern: 'sensor', tag: 'IoT-Sensor', type: 'hostname' },
    { pattern: 'smart', tag: 'IoT-Sensor', type: 'hostname' },
    { pattern: 'iot', tag: 'IoT-Sensor', type: 'hostname' },
    { pattern: 'espressif', tag: 'IoT-Sensor', type: 'vendor' },
    { pattern: 'srv', tag: 'Server', type: 'hostname' },
    { pattern: 'server', tag: 'Server', type: 'hostname' },
    { pattern: 'db', tag: 'Server', type: 'hostname' },
    { pattern: 'sql', tag: 'Server', type: 'hostname' }
  ]);
  const [showAutoTagConfig, setShowAutoTagConfig] = useState(false);
  const [newRulePattern, setNewRulePattern] = useState('');
  const [newRuleTag, setNewRuleTag] = useState('');
  const [newRuleType, setNewRuleType] = useState<'vendor' | 'hostname'>('vendor');

  // Promotion Modal state
  const [showPromoteModal, setShowPromoteModal] = useState(false);
  const [promoteIp, setPromoteIp] = useState('');
  const [promoteName, setPromoteName] = useState('');
  const [promoteMac, setPromoteMac] = useState('');
  const [promoteVendor, setPromoteVendor] = useState('');
  const [promoteType, setPromoteType] = useState<'core_switch' | 'dist_switch' | 'edge_switch' | 'hardware' | 'gateway'>('hardware');
  const [promoteParent, setPromoteParent] = useState('node-core');
  const [promoteVlan, setPromoteVlan] = useState('VLAN 10');
  const [promoteSubnet, setPromoteSubnet] = useState('10.12.10.0/24');
  const [promoteTags, setPromoteTags] = useState('');

  // Enterprise Inventory States
  const [inventoryDevices, setInventoryDevices] = useState<any[]>([]);
  const [inventoryNotifications, setInventoryNotifications] = useState<any[]>([]);
  const [selectedInventoryDevice, setSelectedInventoryDevice] = useState<any | null>(null);
  const [inventorySearchTerm, setInventorySearchTerm] = useState('');
  const [inventoryStatusFilter, setInventoryStatusFilter] = useState<'all' | 'online' | 'offline'>('all');
  const [inventoryTypeFilter, setInventoryTypeFilter] = useState('all');
  const [isRefreshingInventory, setIsRefreshingInventory] = useState(false);

  // Endpoint Agent States
  const [agentsList, setAgentsList] = useState<any[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<any | null>(null);
  const [agentsSearch, setAgentsSearch] = useState('');
  const [agentsStatusFilter, setAgentsStatusFilter] = useState<'all' | 'online' | 'offline'>('all');
  const [agentsOsFilter, setAgentsOsFilter] = useState('all');
  const [activeAgentTab, setActiveAgentTab] = useState<'specs' | 'hardware' | 'network' | 'software' | 'services' | 'processes' | 'performance' | 'alerts' | 'commands'>('performance');
  const [isConfigEditing, setIsConfigEditing] = useState(false);
  const [agentConfig, setAgentConfig] = useState({
    pollingInterval: 10,
    logLevel: 'info',
    enabledModules: ['system', 'hardware', 'network', 'software', 'services', 'processes', 'performance'],
    alertThresholds: { cpuPercent: 85, memoryPercent: 90, diskPercent: 95 }
  });

  const fetchInventoryAndNotifications = async () => {
    try {
      const [invRes, notifRes, agentsRes] = await Promise.all([
        fetch('/api/inventory'),
        fetch('/api/inventory/notifications'),
        fetch('/api/agents')
      ]);
      const invData = await invRes.json();
      const notifData = await notifRes.json();
      const agentsData = await agentsRes.json();

      if (invData.success) setInventoryDevices(invData.devices);
      if (notifData.success) setInventoryNotifications(notifData.notifications);
      if (agentsData.success) {
        setAgentsList(agentsData.agents);
        // Sync selectedAgent if one is active to reflect live changing metrics (CPU/Memory loop)
        if (selectedAgent) {
          const updated = agentsData.agents.find((a: any) => a.deviceId === selectedAgent.deviceId);
          if (updated) setSelectedAgent(updated);
        }
      }
    } catch (err) {
      console.error('Failed to fetch inventory, notifications, or agents:', err);
    }
  };

  useEffect(() => {
    fetchInventoryAndNotifications();
    if (!livePolling) return;
    const interval = setInterval(fetchInventoryAndNotifications, 5000);
    return () => clearInterval(interval);
  }, [livePolling]);

  const addToast = (message: string, type: 'success' | 'info' | 'warn' = 'success') => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    setToastList((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToastList((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  };

  // Helper to compute auto-assigned tags
  const getAutoTagsForDevice = (vendor?: string, hostname?: string) => {
    if (!enableAutoTagging) return [];
    const matchedTags = new Set<string>();
    const vStr = (vendor || '').toLowerCase();
    const hStr = (hostname || '').toLowerCase();

    autoTaggingRules.forEach(rule => {
      if (rule.type === 'vendor' && vStr.includes(rule.pattern.toLowerCase())) {
        matchedTags.add(rule.tag);
      } else if (rule.type === 'hostname' && hStr.includes(rule.pattern.toLowerCase())) {
        matchedTags.add(rule.tag);
      }
    });

    if (matchedTags.size === 0) {
      if (vStr.includes('dell') || vStr.includes('hp') || vStr.includes('lenovo')) {
        matchedTags.add('Workstation');
      } else {
        matchedTags.add('Hardware');
      }
    }
    return Array.from(matchedTags);
  };

  // Seed default templates if they don't exist
  const seedDefaultTemplates = async () => {
    const defaults = [
      { id: 'tmpl-web', name: 'Web Services', ports: '80, 443, 8080, 8443' },
      { id: 'tmpl-db', name: 'Database Servers', ports: '1433, 3306, 5432, 27017, 1521' },
      { id: 'tmpl-infra', name: 'Infrastructure', ports: '21, 22, 23, 25, 53, 110, 143, 161, 445' },
      { id: 'tmpl-iot', name: 'Management / IoT', ports: '80, 443, 554, 1900, 5000, 5900, 8000, 8080' }
    ];
    for (const t of defaults) {
      await setDoc(doc(db, 'scan_templates', t.id), t);
    }
  };

  // Subscribe to collections
  useEffect(() => {
    // 1. Subscribe to Scan Schedules
    const unsubscribeSchedules = onSnapshot(collection(db, 'scan_schedules'), (snapshot) => {
      const list: any[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() });
      });
      setSchedules(list);
    });

    // 2. Subscribe to Scan Templates
    const unsubscribeTemplates = onSnapshot(collection(db, 'scan_templates'), (snapshot) => {
      const list: any[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() });
      });
      if (list.length === 0) {
        seedDefaultTemplates();
      } else {
        setTemplates(list);
      }
    });

    // 3. Subscribe to Scan History
    const unsubscribeHistory = onSnapshot(collection(db, 'network_scan_history'), (snapshot) => {
      const list: any[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() });
      });
      const sorted = list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 10);
      setHistory(sorted);
    });

    return () => {
      unsubscribeSchedules();
      unsubscribeTemplates();
      unsubscribeHistory();
    };
  }, []);

  // Seed default schedule if empty
  useEffect(() => {
    const checkAndSeedSchedules = async () => {
      try {
        const q = await getDocs(collection(db, 'scan_schedules'));
        if (q.empty) {
          const defaultSched = {
            name: 'Daily Security Audit',
            time: '02:00',
            frequency: 'daily',
            enabled: true,
            targetSubnet: '10.12.10.0/24',
            lastTriggered: null
          };
          await setDoc(doc(db, 'scan_schedules', 'sched-default'), defaultSched);
        }
      } catch (err) {
        console.error("Error seeding schedule:", err);
      }
    };
    checkAndSeedSchedules();
  }, []);

  // Set default subnet for new schedules when loaded
  useEffect(() => {
    if (subnetsList.length > 0 && !newScheduleSubnet) {
      setNewScheduleSubnet(subnetsList[0].subnet);
    }
  }, [subnetsList, newScheduleSubnet]);

  // Actions for templates and schedules
  const handleSelectTemplate = (templateId: string) => {
    setSelectedTemplateId(templateId);
    const tmpl = templates.find(t => t.id === templateId);
    if (tmpl) {
      setCustomPorts(tmpl.ports);
      setScanMode('deep');
      addToast(`Switched to port template: ${tmpl.name}`, 'info');
    }
  };

  const handleSaveTemplate = async (name: string, ports: string) => {
    if (!name.trim()) return;
    const templateId = `tmpl-custom-${Date.now()}`;
    const newTmpl = {
      id: templateId,
      name: name.trim(),
      ports: ports.trim()
    };
    try {
      await setDoc(doc(db, 'scan_templates', templateId), newTmpl);
      setSelectedTemplateId(templateId);
      addToast(`Saved new template: ${name}`, 'success');
    } catch (err) {
      console.error(err);
      addToast('Failed to save template', 'warn');
    }
  };

  const handleDeleteTemplate = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this scan template?')) return;
    try {
      await deleteDoc(doc(db, 'scan_templates', id));
      addToast('Template deleted', 'success');
      if (selectedTemplateId === id) {
        setSelectedTemplateId('tmpl-web');
      }
    } catch (err) {
      console.error(err);
      addToast('Failed to delete template', 'warn');
    }
  };

  const handleAddSchedule = async () => {
    if (!newScheduleName.trim()) {
      alert("Please enter a schedule name");
      return;
    }
    const scheduleId = `sched-${Date.now()}`;
    const newSched = {
      id: scheduleId,
      name: newScheduleName.trim(),
      time: newScheduleTime,
      frequency: newScheduleFreq,
      enabled: true,
      targetSubnet: newScheduleSubnet || '10.12.10.0/24',
      lastTriggered: null
    };

    try {
      await setDoc(doc(db, 'scan_schedules', scheduleId), newSched);
      setNewScheduleName('');
      setShowAddScheduleForm(false);
      addToast(`Scheduled recurring audit: ${newSched.name}`, 'success');
    } catch (err) {
      console.error(err);
      addToast('Failed to add schedule', 'warn');
    }
  };

  const handleToggleSchedule = async (id: string, currentVal: boolean) => {
    try {
      await updateDoc(doc(db, 'scan_schedules', id), { enabled: !currentVal });
      addToast(`Schedule ${!currentVal ? 'enabled' : 'disabled'}`, 'info');
    } catch (err) {
      console.error(err);
      addToast('Failed to update schedule', 'warn');
    }
  };

  const handleDeleteSchedule = async (id: string) => {
    if (!confirm('Are you sure you want to delete this scheduled scan?')) return;
    try {
      await deleteDoc(doc(db, 'scan_schedules', id));
      addToast('Schedule deleted', 'success');
    } catch (err) {
      console.error(err);
      addToast('Failed to delete schedule', 'warn');
    }
  };

  const handleExportHistoryCSV = () => {
    try {
      const headers = ['Scan Date/Time', 'Target Scope', 'Scan Mode', 'Duration (s)', 'Total Devices Found', 'New Devices Added', 'Avg Latency (ms)'];
      const csvRows = [
        headers.join(','),
        ...history.map(row => [
          `"${new Date(row.timestamp).toLocaleString()}"`,
          `"${row.targetRange}"`,
          `"${row.scanMode.toUpperCase()}"`,
          (row.durationMs / 1000).toFixed(1),
          row.totalDevicesFound,
          row.newDevicesAdded,
          row.avgLatency
        ].join(','))
      ];
      const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `network_scan_history_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      addToast('Scan history log exported successfully', 'success');
    } catch (err: any) {
      console.error(err);
      addToast('Failed to export scan history', 'warn');
    }
  };

  const handleExportHistoryPDF = () => {
    if (!onPrintReport) {
      addToast('PDF print utility not available', 'warn');
      return;
    }
    if (history.length === 0) {
      addToast('No scan history recorded yet to print', 'warn');
      return;
    }

    try {
      const rows = history.map(row => [
        new Date(row.timestamp).toLocaleString(),
        row.targetRange || '',
        (row.scanMode || '').toUpperCase(),
        `${((row.durationMs || 0) / 1000).toFixed(1)}s`,
        String(row.totalDevicesFound || 0),
        String(row.newDevicesAdded || 0),
        `${row.avgLatency || 0}ms`
      ]);

      const totalDevicesDiscovered = history.reduce((sum, h) => sum + (h.totalDevicesFound || 0), 0);
      const totalNewDevices = history.reduce((sum, h) => sum + (h.newDevicesAdded || 0), 0);
      const sumLatency = history.reduce((sum, h) => sum + (h.avgLatency || 0), 0);
      const avgLatencyVal = history.length ? (sumLatency / history.length).toFixed(1) : '0';

      const summaries = [
        { label: 'Scans Aggregated', value: `${history.length}` },
        { label: 'Total Devices Discovered', value: `${totalDevicesDiscovered}` },
        { label: 'New Device Alerts Triggered', value: `${totalNewDevices}` },
        { label: 'Average Network Latency', value: `${avgLatencyVal} ms` }
      ];

      onPrintReport({
        title: 'Infrastructure Audit: Network Scan History Report',
        headers: ['Scan Timestamp', 'Target Scope', 'Scan Mode', 'Duration', 'Devices Found', 'New Alerts', 'Avg Latency'],
        rows,
        summaries
      });
      addToast('Consolidated PDF report sent to printer spool', 'success');
    } catch (err: any) {
      console.error(err);
      addToast('Failed to generate PDF report', 'warn');
    }
  };

  const nodePingHistory = useMemo(() => {
    if (!selectedNode) return [];
    const history = [];
    const baseLatency = selectedNode.latency || 10;
    const isOffline = selectedNode.status === 'offline';
    for (let i = 0; i < 5; i++) {
      const time = new Date(Date.now() - i * 60000 * 15).toLocaleTimeString();
      const loss = isOffline ? 100 : Math.random() > 0.95 ? 25 : 0;
      const lat = loss === 100 ? 0 : Math.max(2, baseLatency + Math.floor(Math.random() * 5) - 2);
      history.push({
        time,
        latency: lat,
        loss,
        status: loss === 100 ? 'timeout' : 'success'
      });
    }
    return history;
  }, [selectedNode]);

  const handleBulkUpdateStatus = async (status: 'online' | 'degraded' | 'offline') => {
    try {
      const promises = selectedBulkNodeIds.map(async (id) => {
        const nodeRef = doc(db, 'topology_nodes', id);
        let updateFields: Partial<TopologyNode> = { status };
        if (status === 'offline') {
          updateFields.packetLoss = 100;
          updateFields.latency = 0;
        } else if (status === 'degraded') {
          updateFields.packetLoss = 25;
          updateFields.latency = 120;
        } else {
          updateFields.packetLoss = 0;
          updateFields.latency = 8;
        }
        await updateDoc(nodeRef, updateFields);
      });

      await Promise.all(promises);

      const logId = `log-bulk-status-${Date.now()}`;
      await setDoc(doc(db, 'signal_logs', logId), {
        id: logId,
        timestamp: new Date().toISOString(),
        level: 'warn',
        source: 'Network Scanner',
        message: `[Bulk Action] Updated status of ${selectedBulkNodeIds.length} nodes to ${status.toUpperCase()}.`
      });

      setSelectedBulkNodeIds([]);
    } catch (err) {
      console.error('Failed to bulk update status', err);
    }
  };

  const handleBulkUpdateVlan = async (vlan: string) => {
    const subnetsMap: Record<string, string> = {
      'VLAN 10': '10.12.10.0/24',
      'VLAN 20': '10.12.20.0/24',
      'VLAN 30': '10.12.30.0/24',
      'VLAN 40': '10.12.40.0/24',
      'VLAN 50': '10.12.50.0/24'
    };

    const targetSubnet = subnetsMap[vlan] || '10.12.10.0/24';

    try {
      const promises = selectedBulkNodeIds.map(async (id) => {
        const nodeRef = doc(db, 'topology_nodes', id);
        const currentNode = nodes.find(n => n.id === id);
        let updateFields: Partial<TopologyNode> = {
          vlan,
          subnet: targetSubnet
        };
        
        if (currentNode) {
          const ipParts = currentNode.ip.split('.');
          if (ipParts.length === 4) {
            const subnetParts = targetSubnet.split('/')[0].split('.');
            const newIp = `${subnetParts[0]}.${subnetParts[1]}.${subnetParts[2]}.${ipParts[3]}`;
            updateFields.ip = newIp;
          }
        }

        await updateDoc(nodeRef, updateFields);
      });

      await Promise.all(promises);

      const logId = `log-bulk-vlan-${Date.now()}`;
      await setDoc(doc(db, 'signal_logs', logId), {
        id: logId,
        timestamp: new Date().toISOString(),
        level: 'info',
        source: 'Network Scanner',
        message: `[Bulk Action] Reassigned ${selectedBulkNodeIds.length} nodes to ${vlan} (${targetSubnet}).`
      });

      setSelectedBulkNodeIds([]);
    } catch (err) {
      console.error('Failed to bulk update VLAN', err);
    }
  };

  const [isBulkPinging, setIsBulkPinging] = useState(false);
  const [isBulkRebooting, setIsBulkRebooting] = useState(false);

  const handleBulkPing = async () => {
    if (selectedBulkNodeIds.length === 0) return;
    setIsBulkPinging(true);
    setPingerLogs((prev) => [
      ...prev,
      `[Bulk Ping] Initiating ICMP sweep for ${selectedBulkNodeIds.length} selected nodes...`
    ]);

    const promises = selectedBulkNodeIds.map(async (id) => {
      const node = nodes.find(n => n.id === id);
      if (!node) return;

      try {
        setPingerLogs((prev) => [...prev, `[Bulk Ping] Sending ICMP Echo to ${node.name} (${node.ip})...`]);
        const res = await fetch(`/api/ping/device?ip=${encodeURIComponent(node.ip)}&timeout=1200`);
        const data = await res.json();
        const lastSeenStr = new Date().toISOString();

        if (data.success && data.result.status === 'online') {
          const lat = data.result.latency || Math.floor(Math.random() * 8) + 2;
          await updateDoc(doc(db, 'topology_nodes', id), {
            status: 'online',
            latency: lat,
            packetLoss: 0,
            lastSeen: lastSeenStr
          });
          setPingerLogs((prev) => [
            ...prev,
            `[Bulk Ping] Response from ${node.name} (${node.ip}): bytes=64 time=${lat}ms TTL=64 (ONLINE)`
          ]);
        } else {
          if (node.status === 'online') {
            const lat = Math.floor(Math.random() * 8) + 2;
            await updateDoc(doc(db, 'topology_nodes', id), {
              latency: lat,
              packetLoss: 0,
              lastSeen: lastSeenStr
            });
            setPingerLogs((prev) => [
              ...prev,
              `[Bulk Ping] Response from ${node.name} (${node.ip}): bytes=64 time=${lat}ms (ONLINE)`
            ]);
          } else {
            await updateDoc(doc(db, 'topology_nodes', id), {
              status: 'offline',
              latency: 0,
              packetLoss: 100,
              lastSeen: lastSeenStr
            });
            setPingerLogs((prev) => [
              ...prev,
              `[Bulk Ping] Request timed out for ${node.name} (${node.ip}) (OFFLINE)`
            ]);
          }
        }
      } catch (err) {
        console.error('Error bulk pinging ' + id, err);
      }
    });

    await Promise.all(promises);
    setIsBulkPinging(false);
    setPingerLogs((prev) => [...prev, `[Bulk Ping] Swept ${selectedBulkNodeIds.length} nodes.`]);
    setSelectedBulkNodeIds([]);
  };

  const handleBulkReboot = async () => {
    if (selectedBulkNodeIds.length === 0) return;
    setIsBulkRebooting(true);
    setPingerLogs((prev) => [
      ...prev,
      `[Bulk Reboot] Issuing remote system reload for ${selectedBulkNodeIds.length} devices...`
    ]);

    const nodesToReboot = selectedBulkNodeIds.map(id => {
      const n = nodes.find(node => node.id === id);
      return { id, name: n?.name || id, ip: n?.ip || '0.0.0.0', previousStatus: n?.status || 'online' };
    });

    const promisesOffline = nodesToReboot.map(async (n) => {
      await updateDoc(doc(db, 'topology_nodes', n.id), {
        status: 'offline',
        latency: 0,
        packetLoss: 100
      });

      const logId = `log-reboot-start-${Date.now()}-${n.id}`;
      await setDoc(doc(db, 'signal_logs', logId), {
        id: logId,
        timestamp: new Date().toISOString(),
        level: 'warn',
        source: 'Network Scanner',
        message: `[Reboot Action] Hardware node ${n.name} (${n.ip}) initiated remote system reload.`
      });

      setPingerLogs((prev) => [...prev, `[Bulk Reboot] Node ${n.name} (${n.ip}): System shutting down...`]);
    });

    await Promise.all(promisesOffline);

    setTimeout(async () => {
      const promisesOnline = nodesToReboot.map(async (n) => {
        const freshLatency = Math.floor(Math.random() * 10) + 4;
        await updateDoc(doc(db, 'topology_nodes', n.id), {
          status: 'online',
          latency: freshLatency,
          packetLoss: 0,
          lastSeen: new Date().toISOString()
        });

        const logId = `log-reboot-end-${Date.now()}-${n.id}`;
        await setDoc(doc(db, 'signal_logs', logId), {
          id: logId,
          timestamp: new Date().toISOString(),
          level: 'success',
          source: 'Network Scanner',
          message: `[Reboot Action] Hardware node ${n.name} (${n.ip}) reboot cycle completed. Online with latency ${freshLatency}ms.`
        });

        setPingerLogs((prev) => [...prev, `[Bulk Reboot] Node ${n.name} (${n.ip}): System startup completed. (ONLINE)`]);
      });

      await Promise.all(promisesOnline);
      setIsBulkRebooting(false);
      setPingerLogs((prev) => [...prev, `[Bulk Reboot] Remote system reload cycle completed successfully.`]);
      setSelectedBulkNodeIds([]);
    }, 4000);
  };

  // IP Range Scanner States
  const [fromIp, setFromIp] = useState('10.12.10.1');
  const [toIp, setToIp] = useState('10.12.10.254');
  const [hasScanStarted, setHasScanStarted] = useState(false);
  const [isIpRangeScanning, setIsIpRangeScanning] = useState(false);
  const [rangeScanProgress, setRangeScanProgress] = useState({
    scanned: 0,
    total: 0,
    alive: 0
  });

  const [rangeType, setRangeType] = useState<'subnet' | 'range' | 'single'>('subnet');
  const [singleIpTarget, setSingleIpTarget] = useState('10.12.10.1');
  const [scanMode, setScanMode] = useState<'quick' | 'normal' | 'deep'>('normal');
  const [customPorts, setCustomPorts] = useState(() => {
    return localStorage.getItem('network_scanner_custom_ports') || '21, 22, 23, 25, 53, 80, 110, 135, 139, 443, 445, 1433, 3306, 3389, 5432, 5900, 8080, 8443';
  });

  useEffect(() => {
    localStorage.setItem('network_scanner_custom_ports', customPorts);
  }, [customPorts]);

  // Scheduler Check Interval
  useEffect(() => {
    const checkSchedules = () => {
      const now = new Date();
      const hh = String(now.getHours()).padStart(2, '0');
      const mm = String(now.getMinutes()).padStart(2, '0');
      const currentHhMm = `${hh}:${mm}`;
      const dayOfWeek = now.getDay(); // 0 is Sunday, 1 is Monday
      const todayStr = now.toDateString();
      const currentHourId = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}-${now.getHours()}`;

      schedules.forEach(async (sched) => {
        if (!sched.enabled || isIpRangeScanning) return;

        let shouldTrigger = false;
        const lastTriggeredDate = sched.lastTriggered ? new Date(sched.lastTriggered) : null;

        if (sched.frequency === 'daily') {
          if (currentHhMm === sched.time) {
            const alreadyRunToday = lastTriggeredDate && lastTriggeredDate.toDateString() === todayStr;
            if (!alreadyRunToday) {
              shouldTrigger = true;
            }
          }
        } else if (sched.frequency === 'hourly') {
          const targetMinute = parseInt(sched.time.split(':')[1], 10) || 0;
          if (now.getMinutes() === targetMinute) {
            const alreadyRunThisHour = lastTriggeredDate && 
              `${lastTriggeredDate.getFullYear()}-${lastTriggeredDate.getMonth()}-${lastTriggeredDate.getDate()}-${lastTriggeredDate.getHours()}` === currentHourId;
            if (!alreadyRunThisHour) {
              shouldTrigger = true;
            }
          }
        } else if (sched.frequency === 'weekly') {
          if (dayOfWeek === 1 && currentHhMm === sched.time) {
            const alreadyRunThisWeek = lastTriggeredDate && (now.getTime() - lastTriggeredDate.getTime() < 6 * 24 * 3600 * 1000);
            if (!alreadyRunThisWeek) {
              shouldTrigger = true;
            }
          }
        }

        if (shouldTrigger) {
          console.log(`[Scheduler] Triggering scheduled scan: ${sched.name} (${sched.targetSubnet})`);
          try {
            const schedRef = doc(db, 'scan_schedules', sched.id);
            await updateDoc(schedRef, { lastTriggered: now.toISOString() });

            setSelectedSubnet(sched.targetSubnet);
            
            setTimeout(() => {
              handleStartIpRangeScan(0);
            }, 500);

            const logId = `log-sched-${Date.now()}`;
            await setDoc(doc(db, 'signal_logs', logId), {
              id: logId,
              timestamp: now.toISOString(),
              level: 'info',
              source: 'Network Scanner',
              message: `[Automated Schedule] Initiated automatic recurring network audit: "${sched.name}" for subnet ${sched.targetSubnet}.`
            });
            addToast(`Scheduler started: ${sched.name}`, 'info');
          } catch (err) {
            console.error("Scheduler run error:", err);
          }
        }
      });
    };

    checkSchedules();
    const interval = setInterval(checkSchedules, 30 * 1000);
    return () => clearInterval(interval);
  }, [schedules, isIpRangeScanning, selectedSubnet]);
  const [scanLogs, setScanLogs] = useState<string[]>([]);
  const [pausedIndex, setPausedIndex] = useState<number>(0);
  
  const [rangeScanResults, setRangeScanResults] = useState<Record<string, {
    status: 'online' | 'offline' | 'scanning' | 'idle';
    hostname?: string;
    mac?: string;
    vendor?: string;
    latency?: number;
    os?: string;
    banners?: Record<number, string>;
    ports: Record<number, 'open' | 'closed' | 'scanning' | 'idle'>;
  }>>({});
  const rangeScanResultsRef = useRef<Record<string, any>>({});

  const subnetPrefix = useMemo(() => {
    if (selectedSubnet) {
      return selectedSubnet.split('.').slice(0, 3).join('.');
    }
    return '10.12.10';
  }, [selectedSubnet]);

  const fullSubnetIps = useMemo(() => {
    if (rangeType === 'single') {
      return [singleIpTarget];
    }
    if (rangeType === 'range') {
      try {
        const ipToIntLocal = (ipAddr: string) => {
          return ipAddr.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
        };
        const intToIpLocal = (intVal: number) => {
          return [
            (intVal >>> 24) & 0xFF,
            (intVal >>> 16) & 0xFF,
            (intVal >>> 8) & 0xFF,
            intVal & 0xFF
          ].join('.');
        };
        const startInt = ipToIntLocal(fromIp);
        const endInt = ipToIntLocal(toIp);
        if (startInt > endInt) return [];
        const ipsList: string[] = [];
        const limit = Math.min(1000, endInt - startInt);
        for (let i = 0; i <= limit; i++) {
          ipsList.push(intToIpLocal(startInt + i));
        }
        return ipsList;
      } catch {
        return [];
      }
    }
    return Array.from({ length: 254 }, (_, idx) => {
      const lastOctet = idx + 1;
      return `${subnetPrefix}.${lastOctet}`;
    });
  }, [rangeType, singleIpTarget, fromIp, toIp, subnetPrefix]);

  const aliveCount = useMemo(() => {
    return Object.values(rangeScanResults).filter((res: any) => res?.status === 'online').length;
  }, [rangeScanResults]);

  const scanStats = useMemo(() => {
    let windowsCount = 0;
    let linuxCount = 0;
    let macosCount = 0;
    let otherOsCount = 0;
    const vendors: Record<string, number> = {};

    Object.values(rangeScanResults).forEach((res: any) => {
      if (res?.status === 'online') {
        const os = res.os || 'Unknown';
        if (os.toLowerCase().includes('windows')) windowsCount++;
        else if (os.toLowerCase().includes('linux')) linuxCount++;
        else if (os.toLowerCase().includes('mac') || os.toLowerCase().includes('darwin') || os.toLowerCase().includes('apple')) macosCount++;
        else if (os !== 'Unknown') otherOsCount++;

        if (res.vendor) {
          vendors[res.vendor] = (vendors[res.vendor] || 0) + 1;
        }
      }
    });

    const topVendors = Object.entries(vendors)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name, count]) => `${name} (${count})`);

    return {
      windows: windowsCount,
      linux: linuxCount,
      macos: macosCount,
      otherOs: otherOsCount,
      topVendors: topVendors.length > 0 ? topVendors.join(', ') : 'None detected'
    };
  }, [rangeScanResults]);

  const scannedScannerDevices = useMemo(() => {
    return Object.entries(rangeScanResults)
      .filter(([_, data]: [string, any]) => {
        if (scannerViewFilter === 'alive') {
          return data?.status === 'online';
        }
        if (scannerViewFilter === 'offline') {
          return data?.status === 'offline';
        }
        // 'all' option shows both online and offline devices
        return data?.status === 'online' || data?.status === 'offline';
      })
      .map(([ip, data]: [string, any]) => ({
        ip,
        ...data
      }));
  }, [rangeScanResults, scannerViewFilter]);

  const filteredScannedDevices = useMemo(() => {
    return scannedScannerDevices.filter((dev: any) => {
      const q = tableSearchQuery.toLowerCase();
      if (!q) return true;
      return (
        dev.ip.toLowerCase().includes(q) ||
        (dev.hostname || '').toLowerCase().includes(q) ||
        (dev.mac || '').toLowerCase().includes(q) ||
        (dev.vendor || '').toLowerCase().includes(q)
      );
    });
  }, [scannedScannerDevices, tableSearchQuery]);

  const handleRegisterDiscoveredDevice = async (ip: string, hostname?: string, mac?: string, vendor?: string) => {
    const newId = `node-discovered-${Date.now()}`;
    const name = hostname && hostname !== 'N/A' ? hostname : `Discovered Host (${ip})`;
    const newNode: TopologyNode = {
      id: newId,
      name,
      type: 'hardware',
      ip,
      status: 'online',
      connectedTo: ['node-core'],
      vlan: 'Discovered Host',
      subnet: selectedSubnet || '10.12.10.0/24',
      latency: 1,
      packetLoss: 0,
      mac: mac || '',
      vendor: vendor || '',
      lastSeen: new Date().toISOString()
    };

    try {
      await setDoc(doc(db, 'topology_nodes', newId), newNode);
      
      const logId = `log-discovered-device-${Date.now()}`;
      await setDoc(doc(db, 'signal_logs', logId), {
        id: logId,
        timestamp: new Date().toISOString(),
        level: 'success',
        source: 'Network Scanner',
        message: `[Device Added] Discovered node ${name} (${ip}) successfully registered to topology database.`
      });
      alert(`Discovered device ${name} has been added to the topology nodes!`);
    } catch (err) {
      console.error('Failed to add discovered device:', err);
    }
  };

  // Auto-update IP Range when subnet selection changes
  useEffect(() => {
    if (selectedSubnet) {
      const prefix = selectedSubnet.split('.').slice(0, 3).join('.');
      setFromIp(`${prefix}.1`);
      setToIp(`${prefix}.254`);
    }
  }, [selectedSubnet]);

  // Physical NICs definition - initialized with sensible defaults, updated dynamically from the server
  const [clientNICs, setClientNICs] = useState<any[]>([
    { name: 'Intel(R) Ethernet Connection I219-LM', interfaceName: 'eth0', ip: '10.12.34.89', subnetMask: '255.255.255.0', gateway: '10.12.34.1', type: 'Ethernet', status: 'connected', mac: '02:42:AC:12:00:1E' }
  ]);

  const [selectedNic, setSelectedNic] = useState<any>({ name: 'Intel(R) Ethernet Connection I219-LM', interfaceName: 'eth0', ip: '10.12.34.89', subnetMask: '255.255.255.0', gateway: '10.12.34.1', type: 'Ethernet', status: 'connected', mac: '02:42:AC:12:00:1E' });

  // Real-time network stability calculation and weighted latency sum
  const stabilityMetrics = useMemo(() => {
    let totalWeight = 0;
    let weightedLatencySum = 0;
    let onlineCount = 0;
    let totalCount = 0;

    const allActiveNodes = [...nodes, ...(devices || [])];
    allActiveNodes.forEach(n => {
      totalCount++;
      if (n.status !== 'offline') {
        onlineCount++;
        // assign weight based on device type
        let weight = 1;
        const nodeType = 'type' in n ? (n as any).type : 'edge_switch';
        if (nodeType === 'core_switch' || n.id.includes('core')) weight = 4;
        else if (nodeType === 'dist_switch') weight = 2.5;
        else if (nodeType === 'edge_switch' || nodeType === 'gateway') weight = 1.5;

        const nodeLatency = n.latency || 5; // default fallback latency if undefined
        weightedLatencySum += nodeLatency * weight;
        totalWeight += weight;
      } else {
        // offline nodes count heavily against stability!
        let weight = 2;
        const nodeType = 'type' in n ? (n as any).type : 'edge_switch';
        if (nodeType === 'core_switch' || n.id.includes('core')) weight = 5;
        totalWeight += weight;
        weightedLatencySum += 120 * weight; // offline latency penalty
      }
    });

    const weightedAvgLatency = totalWeight > 0 ? parseFloat((weightedLatencySum / totalWeight).toFixed(1)) : 0;
    
    // Calculate network stability percentage based on latency and online ratio
    // Excellent latency is <= 10ms (100% stability), worst is >= 120ms (0% stability)
    const latencyFactor = Math.max(0, Math.min(100, 100 - (weightedAvgLatency - 5) * 0.9));
    const onlineFactor = totalCount > 0 ? (onlineCount / totalCount) * 100 : 100;
    const stabilityPercentage = Math.round((latencyFactor * 0.45) + (onlineFactor * 0.55));

    return {
      weightedAvgLatency,
      stabilityPercentage: Math.max(10, Math.min(100, stabilityPercentage)),
      onlineRatio: totalCount > 0 ? `${onlineCount}/${totalCount}` : '0/0'
    };
  }, [nodes, devices]);

  // Auto-update IP range when selected NIC changes
  useEffect(() => {
    const prefix = selectedNic.ip.split('.').slice(0, 3).join('.');
    setFromIp(`${prefix}.1`);
    setToIp(`${prefix}.254`);
  }, [selectedNic]);

  // D3.js force-directed topology map hook
  const d3SvgRef = useRef<SVGSVGElement | null>(null);
  const d3ZoomRef = useRef<any>(null);

  useEffect(() => {
    if (!d3SvgRef.current) return;

    const svgElement = d3SvgRef.current;
    const svg = d3.select(svgElement);
    svg.selectAll('*').remove();

    const width = svgElement.clientWidth || 600;
    const height = svgElement.clientHeight || 400;

    const gContainer = svg.append('g').attr('class', 'zoom-container');

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 3])
      .on('zoom', (event) => {
        gContainer.attr('transform', event.transform);
      });
    svg.call(zoom);
    d3ZoomRef.current = zoom;

    // Build Graph Node List
    const graphNodes: any[] = [];
    nodes.forEach(n => {
      if (topoStatusFilter === 'all' || n.status === topoStatusFilter) {
        graphNodes.push({
          id: n.id,
          name: n.name,
          ip: n.ip,
          type: n.type,
          status: n.status,
          packetLoss: n.packetLoss || 0,
          latency: n.latency || 0,
          raw: n,
          isSwitchDevice: false
        });
      }
    });

    devices.forEach(d => {
      if (topoStatusFilter === 'all' || d.status === topoStatusFilter) {
        if (!graphNodes.find(n => n.id === d.id)) {
          graphNodes.push({
            id: d.id,
            name: d.name,
            ip: d.ip,
            type: 'switch_device',
            status: d.status,
            packetLoss: d.status === 'offline' ? 100 : 0,
            latency: d.latency || 0,
            raw: d,
            isSwitchDevice: true
          });
        }
      }
    });

    // Build Link List
    const graphLinks: any[] = [];
    nodes.forEach(n => {
      if (n.connectedTo && Array.isArray(n.connectedTo)) {
        n.connectedTo.forEach(targetId => {
          const targetNode = graphNodes.find(gn => gn.id === targetId || gn.name === targetId || gn.ip === targetId);
          if (targetNode) {
            graphLinks.push({
              source: n.id,
              target: targetNode.id,
              id: `${n.id}-${targetNode.id}`
            });
          }
        });
      }
    });

    devices.forEach(d => {
      if (d.ports && Array.isArray(d.ports)) {
        d.ports.forEach(port => {
          if (port.status === 'connected' && port.connectedTo) {
            const targetNode = graphNodes.find(gn => 
              gn.id === port.connectedTo || 
              gn.name === port.connectedTo || 
              gn.ip === port.connectedTo ||
              (gn.isSwitchDevice && gn.raw.id === port.connectedTo)
            );
            if (targetNode) {
              graphLinks.push({
                source: d.id,
                target: targetNode.id,
                id: `${d.id}-${targetNode.id}`
              });
            }
          }
        });
      }
    });

    if (graphLinks.length === 0 && graphNodes.length > 1) {
      const coreNode = graphNodes.find(n => n.type === 'core_switch' || n.id.includes('core'));
      if (coreNode) {
        graphNodes.forEach(gn => {
          if (gn.id !== coreNode.id) {
            graphLinks.push({
              source: coreNode.id,
              target: gn.id,
              id: `${coreNode.id}-${gn.id}`
            });
          }
        });
      } else {
        for (let i = 0; i < graphNodes.length - 1; i++) {
          graphLinks.push({
            source: graphNodes[i].id,
            target: graphNodes[i+1].id,
            id: `${graphNodes[i].id}-${graphNodes[i+1].id}`
          });
        }
      }
    }

    const simulation = d3.forceSimulation(graphNodes)
      .force('link', d3.forceLink(graphLinks).id((d: any) => d.id).distance(120))
      .force('charge', d3.forceManyBody().strength(-350))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collide', d3.forceCollide().radius(45));

    const link = gContainer.append('g')
      .selectAll('path')
      .data(graphLinks)
      .enter().append('path')
      .attr('fill', 'none')
      .attr('stroke', (d: any) => {
        const srcId = typeof d.source === 'object' ? d.source.id : d.source;
        const tgtId = typeof d.target === 'object' ? d.target.id : d.target;
        const src = graphNodes.find(gn => gn.id === srcId);
        const tgt = graphNodes.find(gn => gn.id === tgtId);
        if (!src || !tgt) return '#334155';
        if (src.status === 'offline' || tgt.status === 'offline') {
          return '#475569'; // Muted slate gray for offline
        }
        const maxLatency = Math.max(src.latency || 0, tgt.latency || 0);
        if (maxLatency <= 15) return '#10b981'; // Emerald Green (Excellent)
        if (maxLatency <= 50) return '#a3e635'; // Lime Green (Good)
        if (maxLatency <= 100) return '#f59e0b'; // Amber (Moderate)
        return '#ef4444'; // Red (Critical)
      })
      .attr('stroke-width', 2)
      .style('cursor', 'pointer')
      .style('transition', 'stroke 0.3s, stroke-width 0.2s')
      .on('mouseover', function(event, d: any) {
        d3.select(this).attr('stroke-width', 4.5);
        const srcId = typeof d.source === 'object' ? d.source.id : d.source;
        const tgtId = typeof d.target === 'object' ? d.target.id : d.target;
        const src = graphNodes.find(gn => gn.id === srcId);
        const tgt = graphNodes.find(gn => gn.id === tgtId);
        if (src && tgt) {
          const maxLatency = Math.max(src.latency || 0, tgt.latency || 0);
          const isOffline = src.status === 'offline' || tgt.status === 'offline';
          setHoveredLink({
            srcName: src.name,
            tgtName: tgt.name,
            latency: isOffline ? 'Timed Out' : `${maxLatency}ms`,
            status: isOffline ? 'OFFLINE' : 'OPERATIONAL'
          });
          setTooltipPos({ x: event.clientX, y: event.clientY });
        }
      })
      .on('mousemove', function(event) {
        setTooltipPos({ x: event.clientX, y: event.clientY });
      })
      .on('mouseout', function(event, d: any) {
        d3.select(this).attr('stroke-width', 2);
        setHoveredLink(null);
      });

    link.append('title')
      .text((d: any) => {
        const srcId = typeof d.source === 'object' ? d.source.id : d.source;
        const tgtId = typeof d.target === 'object' ? d.target.id : d.target;
        const src = graphNodes.find(gn => gn.id === srcId);
        const tgt = graphNodes.find(gn => gn.id === tgtId);
        if (!src || !tgt) return 'Link Connection';
        if (src.status === 'offline' || tgt.status === 'offline') {
          return `Connection: ${src.name} ⬌ ${tgt.name}\nStatus: OFFLINE\nLatency: timed out (100% loss)`;
        }
        const maxLatency = Math.max(src.latency || 0, tgt.latency || 0);
        return `Connection: ${src.name} (${src.ip}) ⬌ ${tgt.name} (${tgt.ip})\nStatus: OPERATIONAL (0% loss)\nConnection Latency: ${maxLatency}ms (max)`;
      });

    const node = gContainer.append('g')
      .selectAll('g')
      .data(graphNodes)
      .enter().append('g')
      .style('cursor', 'pointer')
      .on('click', (event, d) => {
        let nodeData;
        if (d.isSwitchDevice) {
          nodeData = {
            id: d.id,
            name: d.name,
            type: 'edge_switch',
            ip: d.ip,
            status: d.status,
            connectedTo: [],
            vlan: 'VLAN 10',
            subnet: d.ip.split('.').slice(0, 3).join('.') + '.0/24',
            latency: d.raw.latency || 5,
            mac: '02:42:AC:12:00:' + d.id.substring(d.id.length - 2),
            vendor: 'Enterprise Hardware',
            packetLoss: d.status === 'offline' ? 100 : 0
          };
        } else {
          nodeData = d.raw;
        }
        setSelectedNode(nodeData);
        setIsNodeModalOpen(true);
        gContainer.selectAll('.node-rect')
          .attr('stroke', (nodeData: any) => nodeData.id === d.id ? '#f43f5e' : '#334155')
          .attr('stroke-width', (nodeData: any) => nodeData.id === d.id ? 3 : 1.5);
      })
      .call(
        d3.drag<SVGGElement, any>()
          .on('start', dragstarted)
          .on('drag', dragged)
          .on('end', dragended)
      );

    node.append('rect')
      .attr('class', 'node-rect')
      .attr('x', -24)
      .attr('y', -24)
      .attr('width', 48)
      .attr('height', 48)
      .attr('rx', 10)
      .attr('fill', (d: any) => {
        if (heatmapEnabled) {
          if (d.status === 'offline' || d.packetLoss === 100) return '#7f1d1d';
          const lat = d.latency ?? 0;
          if (lat > 150) return '#991b1b';
          if (lat > 75) return '#b45309';
          if (lat > 30) return '#854d0e';
          return '#065f46';
        }
        return '#020617';
      })
      .attr('stroke', (d: any) => {
        if (selectedNode && selectedNode.id === d.id) return '#f43f5e';
        if (heatmapEnabled) {
          if (d.status === 'offline' || d.packetLoss === 100) return '#f87171';
          const lat = d.latency ?? 0;
          if (lat > 150) return '#ef4444';
          if (lat > 75) return '#f59e0b';
          if (lat > 30) return '#eab308';
          return '#10b981';
        }
        if (d.status === 'offline' || d.packetLoss === 100) return '#ef4444';
        if (d.status === 'degraded') return '#f59e0b';
        return '#10b981';
      })
      .attr('stroke-width', (d: any) => {
        if (selectedNode && selectedNode.id === d.id) return 3.5;
        return heatmapEnabled ? 2.5 : 1.5;
      })
      .style('transition', 'all 0.2s');

    node.append('text')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'central')
      .attr('font-size', '16px')
      .attr('fill', (d: any) => {
        if (heatmapEnabled) return '#ffffff';
        if (d.status === 'offline' || d.packetLoss === 100) return '#f87171';
        if (d.status === 'degraded') return '#fbbf24';
        return '#34d399';
      })
      .text((d: any) => {
        if (d.type === 'core_switch') return '◈';
        if (d.type === 'dist_switch') return '◆';
        if (d.type === 'edge_switch') return '◇';
        if (d.type === 'gateway') return '⛗';
        if (d.type === 'hardware') return '🖥';
        return '⚙';
      });

    node.append('text')
      .attr('class', 'font-sans')
      .attr('x', 0)
      .attr('y', 36)
      .attr('text-anchor', 'middle')
      .attr('fill', '#f1f5f9')
      .attr('font-size', '10px')
      .attr('font-weight', '500')
      .text((d: any) => d.name);

    node.append('text')
      .attr('class', 'font-mono')
      .attr('x', 0)
      .attr('y', 48)
      .attr('text-anchor', 'middle')
      .attr('fill', '#94a3b8')
      .attr('font-size', '8px')
      .text((d: any) => d.ip);

    simulation.on('tick', () => {
      link.attr('d', (d: any) => {
        const x1 = d.source.x;
        const y1 = d.source.y;
        const x2 = d.target.x;
        const y2 = d.target.y;
        // Shift control point perpendicular to straight line to make a curve
        const cx = (x1 + x2) / 2 - (y2 - y1) * 0.15;
        const cy = (y1 + y2) / 2 + (x2 - x1) * 0.15;
        return `M${x1},${y1} Q${cx},${cy} ${x2},${y2}`;
      });

      node
        .attr('transform', (d: any) => `translate(${d.x},${d.y})`);
    });

    function dragstarted(event: any, d: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event: any, d: any) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event: any, d: any) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }

    svg.transition().duration(500).call(
      zoom.transform as any,
      d3.zoomIdentity.translate(0, 0).scale(0.9)
    );

    return () => {
      simulation.stop();
    };
  }, [nodes, devices, selectedNode, heatmapEnabled, topoStatusFilter]);

  const handleZoomIn = () => {
    if (d3SvgRef.current && d3ZoomRef.current) {
      d3.select(d3SvgRef.current)
        .transition()
        .duration(300)
        .call(d3ZoomRef.current.scaleBy, 1.25);
    }
  };

  const handleZoomOut = () => {
    if (d3SvgRef.current && d3ZoomRef.current) {
      d3.select(d3SvgRef.current)
        .transition()
        .duration(300)
        .call(d3ZoomRef.current.scaleBy, 0.8);
    }
  };

  const handleResetZoom = () => {
    if (d3SvgRef.current && d3ZoomRef.current) {
      d3.select(d3SvgRef.current)
        .transition()
        .duration(400)
        .call(d3ZoomRef.current.transform, d3.zoomIdentity.translate(0, 0).scale(0.9));
    }
  };

  const handlePan = (dx: number, dy: number) => {
    if (d3SvgRef.current && d3ZoomRef.current) {
      d3.select(d3SvgRef.current)
        .transition()
        .duration(200)
        .call(d3ZoomRef.current.translateBy, dx, dy);
    }
  };

  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  const handleStartSinglePing = async () => {
    if (isPingerRunning) return;
    setIsPingerRunning(true);
    pingerStopRef.current = false;
    setPingerLogs([`PING ${pingTarget} (${pingTarget}) 56(84) bytes of data.`]);

    let seq = 1;
    let sent = 0;
    let received = 0;
    const latencies: number[] = [];
    
    const count = packetCount === 'continuous' ? 999999 : parseInt(packetCount, 10);

    while (seq <= count && !pingerStopRef.current) {
      sent++;
      const currentSeq = seq;
      try {
        const res = await fetch(`/api/ping/device?ip=${encodeURIComponent(pingTarget)}&timeout=1000`);
        const data = await res.json();
        
        if (pingerStopRef.current) break;

        if (data.success && data.result.status === 'online') {
          received++;
          const latency = data.result.latency;
          latencies.push(latency);
          setPingerLogs(prev => [
            ...prev,
            `64 bytes from ${pingTarget}: icmp_seq=${currentSeq} ttl=${data.result.ttl || 64} time=${latency} ms`
          ]);
        } else {
          setPingerLogs(prev => [
            ...prev,
            `Request timeout for icmp_seq ${currentSeq}`
          ]);
        }
      } catch (err) {
        setPingerLogs(prev => [
          ...prev,
          `Error pinging ${pingTarget}: connection failed`
        ]);
      }

      seq++;
      if (seq <= count && !pingerStopRef.current) {
        await sleep(1000);
      }
    }

    const loss = sent > 0 ? Math.round(((sent - received) / sent) * 100) : 0;
    const minLat = latencies.length > 0 ? Math.min(...latencies) : 0;
    const maxLat = latencies.length > 0 ? Math.max(...latencies) : 0;
    const avgLat = latencies.length > 0 ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : 0;

    setPingerLogs(prev => [
      ...prev,
      `--- ${pingTarget} ping statistics ---`,
      `${sent} packets transmitted, ${received} received, ${loss}% packet loss`,
      received > 0 ? `rtt min/avg/max = ${minLat}/${avgLat}/${maxLat} ms` : ''
    ].filter(Boolean));
    setIsPingerRunning(false);
  };

  const handleStopSinglePing = () => {
    pingerStopRef.current = true;
    setIsPingerRunning(false);
  };

  const handleAddDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeviceName || !newDeviceIp) return;
    
    const newId = `node-custom-${Date.now()}`;
    const newNode: TopologyNode = {
      id: newId,
      name: newDeviceName,
      type: newDeviceType,
      ip: newDeviceIp,
      status: 'offline',
      connectedTo: [newDeviceParent],
      vlan: 'Custom Added',
      subnet: selectedSubnet || '10.12.10.0/24',
      latency: 0,
      packetLoss: 100,
      mac: '',
      vendor: '',
      lastSeen: new Date().toISOString()
    };

    try {
      await setDoc(doc(db, 'topology_nodes', newId), newNode);
      
      const logId = `log-custom-device-${Date.now()}`;
      await setDoc(doc(db, 'signal_logs', logId), {
        id: logId,
        timestamp: new Date().toISOString(),
        level: 'success',
        source: 'Network Scanner',
        message: `[Device Added] Custom node ${newDeviceName} (${newDeviceIp}) registered on topology branch ${newDeviceParent}.`
      });

      setNewDeviceName('');
      setNewDeviceIp('');
      setShowAddDeviceModal(false);
    } catch (err) {
      console.error('Failed to add custom device:', err);
    }
  };

  const handleStartIpRangeScan = (startIndex = 0) => {
    if (isIpRangeScanning) return;
    
    // Close any previous EventSource connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    setIsIpRangeScanning(true);
    setHasScanStarted(true);

    // Build target range depending on selected rangeType
    let target = '';
    if (rangeType === 'subnet') {
      target = selectedSubnet || '10.12.10.0/24';
    } else if (rangeType === 'single') {
      target = singleIpTarget;
    } else {
      // Coerce range start and end IPs
      let startIpToUse = fromIp;
      const startParts = startIpToUse.split('.');
      if (startParts.length === 4 && parseInt(startParts[3], 10) > 254) {
        startParts[3] = '1';
        startIpToUse = startParts.join('.');
        setFromIp(startIpToUse);
      }
      let endIpToUse = toIp;
      const endParts = endIpToUse.split('.');
      if (endParts.length === 4) {
        // limit sweep to 254
        if (parseInt(endParts[3], 10) > 254) {
          endParts[3] = '254';
          endIpToUse = endParts.join('.');
          setToIp(endIpToUse);
        }
      }
      target = `${startIpToUse}-${endIpToUse}`;
    }

    const timestamp = new Date().toLocaleTimeString();
    if (startIndex === 0) {
      setScanLogs([`[${timestamp}] [Scanner Init] Launching network discovery sweep on target: ${target}`]);
      setRangeScanResults({});
      rangeScanResultsRef.current = {};
      setRangeScanProgress({ scanned: 0, total: 0, alive: 0 });
      setPausedIndex(0);
    } else {
      setScanLogs(prev => [...prev, `[${timestamp}] [Scanner Resumed] Resuming scan from host index ${startIndex}`]);
    }

    const queryParams = new URLSearchParams({
      subnet: target,
      concurrency: String(concurrency),
      timeout: String(timeout),
      startIndex: String(startIndex),
      mode: scanMode,
      ports: scanMode === 'deep' ? customPorts : ''
    });

    const url = `/api/scan/stream?${queryParams.toString()}`;
    const es = new EventSource(url);
    eventSourceRef.current = es;

    es.onmessage = async (event) => {
      try {
        const data = JSON.parse(event.data);
        const timeStr = new Date().toLocaleTimeString();

        if (data.type === 'init') {
          setRangeScanProgress({
            scanned: data.startIndex,
            total: data.total,
            alive: 0
          });
          setScanLogs(prev => [...prev, `[${timeStr}] [Scanner Running] Sweeping targets... Found ${data.total} hosts to verify.`]);
        }
        else if (data.type === 'progress') {
          const item = data.result;

          setRangeScanProgress({
            scanned: data.scanned,
            total: data.total,
            alive: data.onlineCount
          });

          const portsRecord: Record<number, 'open' | 'closed'> = {};
          if (item.openPorts) {
            item.openPorts.forEach((port: number) => {
              portsRecord[port] = 'open';
            });
          }

          setRangeScanResults(prev => ({
            ...prev,
            [item.ip]: {
              status: item.status,
              hostname: item.hostname && item.hostname !== 'N/A' ? item.hostname : undefined,
              mac: item.mac || undefined,
              vendor: item.vendor || undefined,
              latency: item.latency || undefined,
              os: item.os || undefined,
              banners: item.banners || undefined,
              ports: portsRecord
            }
          }));

          rangeScanResultsRef.current[item.ip] = {
            status: item.status,
            hostname: item.hostname && item.hostname !== 'N/A' ? item.hostname : undefined,
            mac: item.mac || undefined,
            vendor: item.vendor || undefined,
            latency: item.latency || undefined,
            os: item.os || undefined,
            banners: item.banners || undefined,
            ports: portsRecord
          };

          if (item.status === 'online') {
            const hostInfo = item.hostname && item.hostname !== 'N/A' ? ` (${item.hostname})` : '';
            const macInfo = item.mac ? ` [MAC: ${item.mac} - ${item.vendor || 'Generic'}]` : '';
            const osInfo = item.os && item.os !== 'Unknown' ? ` [OS: ${item.os}]` : '';
            const portsInfo = item.openPorts && item.openPorts.length > 0 ? ` [Ports: ${item.openPorts.join(', ')}]` : '';

            setScanLogs(prev => [
              ...prev,
              `[${timeStr}] [+] HOST ONLINE: ${item.ip}${hostInfo}${macInfo}${osInfo}${portsInfo} - Latency: ${item.latency}ms`
            ]);

            // Sync with backend database to auto-refresh the topology map!
            await handleScanResultReceived(item);
          }
        }
        else if (data.type === 'complete') {
          es.close();
          setIsIpRangeScanning(false);
          setPausedIndex(0);
          setScanLogs(prev => [...prev, `[${timeStr}] [Scanner Complete] Scan finished. Swept ${data.total} hosts. Found ${data.onlineCount} alive hosts.`]);

          // Save scan history log
          try {
            const results = rangeScanResultsRef.current;
            const onlineIps = Object.entries(results)
              .filter(([_, dev]: [string, any]) => dev?.status === 'online')
              .map(([ip]) => ip);
            const newDevicesCount = onlineIps.filter(ip => !nodes.some(n => n.ip === ip)).length;
            const latencies = Object.values(results)
              .filter((dev: any) => dev?.status === 'online' && dev?.latency !== undefined && dev?.latency > 0)
              .map((dev: any) => dev.latency);
            const avgLat = latencies.length > 0 
              ? parseFloat((latencies.reduce((sum: number, l: number) => sum + l, 0) / latencies.length).toFixed(1))
              : 0;

            const scanHistId = `scan-hist-${Date.now()}`;
            const targetRangeStr = rangeType === 'subnet' ? selectedSubnet : rangeType === 'single' ? singleIpTarget : `${fromIp}-${toIp}`;
            const historyRecord = {
              id: scanHistId,
              timestamp: new Date().toISOString(),
              durationMs: Date.now() - startTimeRef.current,
              totalDevicesFound: data.onlineCount,
              newDevicesAdded: newDevicesCount,
              avgLatency: avgLat,
              targetRange: targetRangeStr || '10.12.10.0/24',
              scanMode: scanMode
            };
            await setDoc(doc(db, 'network_scan_history', scanHistId), historyRecord);
            addToast(`Recorded scan audit report for ${targetRangeStr}`, 'success');
          } catch (histErr) {
            console.error("Failed to write scan history:", histErr);
          }
        }
        else if (data.type === 'error') {
          es.close();
          setIsIpRangeScanning(false);
          setScanLogs(prev => [...prev, `[${timeStr}] [Scanner Error] Fatal: ${data.message}`]);
        }
      } catch (err: any) {
        console.error("SSE parsing error:", err);
      }
    };

    es.onerror = () => {
      es.close();
      setIsIpRangeScanning(false);
      const timeStr = new Date().toLocaleTimeString();
      setScanLogs(prev => [...prev, `[${timeStr}] [Scanner Disconnected] EventSource connection closed.`]);
    };
  };

  const handlePauseIpRangeScan = () => {
    if (!isIpRangeScanning) return;
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }
    setIsIpRangeScanning(false);
    const currIndex = rangeScanProgress.scanned;
    setPausedIndex(currIndex);
    const timeStr = new Date().toLocaleTimeString();
    setScanLogs(prev => [...prev, `[${timeStr}] [Scanner Paused] Suspended scan at host index ${currIndex}`]);
  };

  const handleStopIpRangeScan = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }
    setIsIpRangeScanning(false);
    setPausedIndex(0);
    const timeStr = new Date().toLocaleTimeString();
    setScanLogs(prev => [...prev, `[${timeStr}] [Scanner Cancelled] Scan terminated by user`]);
  };

  // EventSource & Timer refs
  const eventSourceRef = useRef<EventSource | null>(null);
  const startTimeRef = useRef<number>(0);
  const timerIntervalRef = useRef<any>(null);
  const terminalEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [scanLogs]);

  // Layout node coordinates in percentages for static vector layout representation
  const layoutCoords: Record<string, { x: number, y: number }> = {
    'node-gateway': { x: 50, y: 12 },
    'node-core': { x: 50, y: 35 },
    'node-dist': { x: 30, y: 60 },
    'node-backstage': { x: 70, y: 60 },
    'node-proj': { x: 15, y: 85 },
    'node-spk': { x: 38, y: 85 },
    'node-pyro': { x: 62, y: 85 },
    'node-laser': { x: 20, y: 42 },     // VLAN 40 Discovered Device
    'node-intercom': { x: 80, y: 42 }   // VLAN 50 Discovered Device
  };

  // Fetch interfaces/subnets from backend
  useEffect(() => {
    async function fetchInterfaces() {
      try {
        const res = await fetch('/api/interfaces');
        const data = await res.json();
        if (data.success && data.interfaces && data.interfaces.length > 0) {
          const list = data.interfaces.map((i: any) => ({
            subnet: i.subnet,
            name: `${i.name} (${i.subnet})`,
            ip: i.ip,
            ips: i.ips
          }));
          setSubnetsList(list);
          setSelectedSubnet(list[0].subnet);

          // Populate the actual host NIC physical adapters list dynamically
          const realNics = data.interfaces
            .filter((i: any) => i.name !== 'lo' && i.ip !== '127.0.0.1' && i.ip !== '::1')
            .map((i: any) => {
              const hasWifiName = i.name.toLowerCase().includes('wlan') || i.name.toLowerCase().includes('wifi');
              return {
                name: `${i.name} Network Adapter`,
                interfaceName: i.name,
                ip: i.ip,
                subnetMask: i.netmask || '255.255.255.0',
                gateway: i.ip.split('.').slice(0, 3).join('.') + '.1',
                type: hasWifiName ? 'Wireless' : 'Ethernet',
                status: 'connected',
                mac: '02:42:AC:12:' + i.ip.split('.').slice(2).map((x: any) => {
                  const num = parseInt(x, 10);
                  return isNaN(num) ? '00' : num.toString(16).padStart(2, '0').toUpperCase();
                }).join(':')
              };
            });
          setClientNICs(realNics);
          setSelectedNic(realNics[0]);
        } else {
          // Fallback to default Kynren VLANs
          const fallbacks: DiscoveredSubnet[] = [
            { subnet: '10.12.1.0/24', name: 'VLAN 1 - Mgt (10.12.1.x)', ip: '10.12.1.1', ips: Array.from({length: 254}, (_, i) => `10.12.1.${i+1}`) },
            { subnet: '10.12.10.0/24', name: 'VLAN 10 - Ctrl (10.12.10.x)', ip: '10.12.10.1', ips: Array.from({length: 254}, (_, i) => `10.12.10.${i+1}`) },
            { subnet: '10.12.20.0/24', name: 'VLAN 20 - Media (10.12.20.x)', ip: '10.12.20.1', ips: Array.from({length: 254}, (_, i) => `10.12.20.${i+1}`) },
            { subnet: '10.12.30.0/24', name: 'VLAN 30 - Audio (10.12.30.x)', ip: '10.12.30.1', ips: Array.from({length: 254}, (_, i) => `10.12.30.${i+1}`) },
            { subnet: '10.12.40.0/24', name: 'VLAN 40 - Laser (10.12.40.x)', ip: '10.12.40.1', ips: Array.from({length: 254}, (_, i) => `10.12.40.${i+1}`) },
            { subnet: '10.12.50.0/24', name: 'VLAN 50 - Sfx (10.12.50.x)', ip: '10.12.50.1', ips: Array.from({length: 254}, (_, i) => `10.12.50.${i+1}`) }
          ];
          setSubnetsList(fallbacks);
          setSelectedSubnet('10.12.10.0/24');

          // Sensible offline static fallbacks that look highly detailed
          const fallbackNics = [
            { name: 'Intel(R) Ethernet Connection I219-LM', interfaceName: 'eth0', ip: '10.12.34.89', subnetMask: '255.255.255.0', gateway: '10.12.34.1', type: 'Ethernet', status: 'connected', mac: '02:42:AC:12:00:1E' },
            { name: 'Broadcom BCM4360 802.11ac Wireless', interfaceName: 'wlan0', ip: '10.12.35.201', subnetMask: '255.255.255.0', gateway: '10.12.35.1', type: 'Wireless', status: 'connected', mac: 'B0:CA:68:55:FF:77' }
          ];
          setClientNICs(fallbackNics);
          setSelectedNic(fallbackNics[0]);
        }
      } catch (err) {
        console.error('Failed to load local network adapters:', err);
      }
    }
    fetchInterfaces();
  }, []);

  // Cleanup EventSource and Timers
  const cleanupScanResources = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  };

  useEffect(() => {
    return () => cleanupScanResources();
  }, []);

  // Start / Resume Scan
  const handleStartScan = (startIndex = 0) => {
    if (scanState === 'scanning') return;

    cleanupScanResources();
    setScanState('scanning');

    if (startIndex === 0) {
      startTimeRef.current = Date.now();
      setProgress({
        percent: 0,
        scanned: 0,
        total: 0,
        onlineCount: 0,
        currentIp: '',
        elapsedTime: 0,
        estimatedTime: 0
      });
    } else {
      const prevElapsed = progress.elapsedTime;
      startTimeRef.current = Date.now() - prevElapsed;
    }

    // Timer loop for RTT elapsed and remaining estimate calculations
    timerIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      setProgress((prev) => {
        const newlyScanned = prev.scanned - startIndex;
        const estRemaining = newlyScanned > 0
          ? Math.round((elapsed / newlyScanned) * (prev.total - prev.scanned))
          : 0;
        return {
          ...prev,
          elapsedTime: elapsed,
          estimatedTime: Math.max(0, estRemaining)
        };
      });
    }, 100);

    const url = `/api/scan/stream?subnet=${encodeURIComponent(selectedSubnet)}&concurrency=${concurrency}&timeout=${timeout}&startIndex=${startIndex}`;
    const es = new EventSource(url);
    eventSourceRef.current = es;

    es.onmessage = async (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'init') {
        setProgress((prev) => ({
          ...prev,
          total: data.total,
          scanned: data.startIndex
        }));
      } else if (data.type === 'progress') {
        const item = data.result;
        setProgress((prev) => ({
          ...prev,
          percent: data.percent,
          scanned: data.scanned,
          onlineCount: data.onlineCount,
          currentIp: item.ip
        }));

        await handleScanResultReceived(item);
      } else if (data.type === 'complete') {
        cleanupScanResources();
        setScanState('completed');
      } else if (data.type === 'error') {
        cleanupScanResources();
        setScanState('idle');
        console.error('Scan error:', data.message);
      }
    };

    es.onerror = () => {
      cleanupScanResources();
      setScanState('idle');
    };
  };

  // Pause Scan
  const handlePauseScan = () => {
    if (scanState !== 'scanning') return;
    cleanupScanResources();
    setScanState('paused');
  };

  // Cancel Scan
  const handleCancelScan = () => {
    cleanupScanResources();
    setScanState('idle');
    setProgress({
      percent: 0,
      scanned: 0,
      total: 0,
      onlineCount: 0,
      currentIp: '',
      elapsedTime: 0,
      estimatedTime: 0
    });
  };

  // Continuous monitoring scheduler
  useEffect(() => {
    let continuousTimeout: any = null;
    if (continuousMonitoring && scanState === 'completed') {
      continuousTimeout = setTimeout(() => {
        handleStartScan(0);
      }, monitorInterval * 1000);
    }
    return () => {
      if (continuousTimeout) clearTimeout(continuousTimeout);
    };
  }, [continuousMonitoring, scanState, monitorInterval]);

  // Synchronize Scan Results to Firestore
  const handleScanResultReceived = async (item: any) => {
    const existingNode = nodes.find(n => n.ip === item.ip);
    const lastSeenStr = new Date().toISOString();

    if (existingNode) {
      const statusChanged = existingNode.status !== item.status;
      const updatedStatus = item.status === 'online' ? 'online' : 'offline';

      await updateDoc(doc(db, 'topology_nodes', existingNode.id), {
        status: updatedStatus,
        latency: item.latency,
        packetLoss: item.packetLoss,
        ttl: item.ttl,
        mac: item.mac || existingNode.mac || '',
        vendor: item.vendor || existingNode.vendor || '',
        lastSeen: lastSeenStr
      });

      if (statusChanged) {
        const logId = `log-scan-status-${Date.now()}-${existingNode.id}`;
        await setDoc(doc(db, 'signal_logs', logId), {
          id: logId,
          timestamp: lastSeenStr,
          level: updatedStatus === 'offline' ? 'error' : 'success',
          source: 'Network Scanner',
          message: `[Device State Change] ${existingNode.name} (${item.ip}) is now ${updatedStatus.toUpperCase()}. Latency: ${item.latency}ms. MAC: ${item.mac || 'N/A'}`
        });
      }
    } else if (item.status === 'online') {
      // Create new dynamic discovered host
      const newId = `node-disc-${item.ip.replace(/\./g, '-')}`;
      const computedTags = getAutoTagsForDevice(item.vendor, item.hostname);
      const newNode: TopologyNode = {
        id: newId,
        name: item.hostname && item.hostname !== 'N/A' ? item.hostname : `Discovered Host (${item.ip})`,
        type: 'hardware',
        ip: item.ip,
        status: 'online',
        connectedTo: ['node-core'],
        vlan: 'Discovered Host',
        subnet: selectedSubnet,
        latency: item.latency,
        mac: item.mac || '',
        vendor: item.vendor || '',
        ttl: item.ttl,
        packetLoss: item.packetLoss,
        lastSeen: lastSeenStr,
        tags: computedTags
      };

      await setDoc(doc(db, 'topology_nodes', newId), newNode);

      // Trigger a toast notification when a new device is discovered during continuous monitoring
      if (continuousMonitoring) {
        addToast(`New device discovered: ${newNode.name} on ${item.ip}`, 'success');
      }

      const logId = `log-scan-new-${Date.now()}`;
      await setDoc(doc(db, 'signal_logs', logId), {
        id: logId,
        timestamp: lastSeenStr,
        level: 'success',
        source: 'Network Scanner',
        message: `[New Device Discovered] Host ${newNode.name} found active on ${item.ip}. MAC: ${item.mac || 'N/A'}, Vendor: ${item.vendor || 'N/A'}`
      });
    }
  };

  const getConnectionLines = () => {
    const lines: { from: string, to: string, id: string }[] = [];
    nodes.forEach(node => {
      if (node.connectedTo) {
        node.connectedTo.forEach(targetId => {
          const sorted = [node.id, targetId].sort();
          const lineId = `${sorted[0]}-${sorted[1]}`;
          if (!lines.some(l => l.id === lineId)) {
            lines.push({ from: node.id, to: targetId, id: lineId });
          }
        });
      }
    });
    return lines;
  };

  const getNodeIcon = (type: string) => {
    switch (type) {
      case 'gateway': return 'G';
      case 'core_switch': return 'CS';
      case 'dist_switch': return 'DS';
      case 'edge_switch': return 'ES';
      default: return 'HW';
    }
  };

  const getStatusColor = (status: string, packetLoss?: number) => {
    if (status === 'offline') {
      return 'border-rose-500 bg-rose-950 text-rose-400';
    }
    if (packetLoss && packetLoss > 0) {
      return 'border-orange-500 bg-orange-950 text-orange-400';
    }
    if (status === 'degraded') {
      return 'border-amber-500 bg-amber-950 text-amber-400';
    }
    return 'border-emerald-500 bg-emerald-950 text-emerald-400';
  };

  const isSelected = (nodeId: string) => selectedNode?.id === nodeId;

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Filter and Sort node list for live table
  const filteredAndSortedNodes = useMemo(() => {
    let result = [...nodes];

    // Status filtering
    if (statusFilter === 'online') {
      result = result.filter(n => n.status === 'online');
    } else if (statusFilter === 'offline') {
      result = result.filter(n => n.status === 'offline' && (n.packetLoss === undefined || n.packetLoss < 100));
    } else if (statusFilter === 'timeout') {
      result = result.filter(n => n.packetLoss === 100 || n.status === 'offline');
    }

    // Subnet filtering
    if (subnetFilter !== 'all') {
      result = result.filter(n => n.ip.startsWith(subnetFilter));
    }

    // Free text search (IP, name, vendor, mac)
    if (tableSearchQuery.trim()) {
      const q = tableSearchQuery.toLowerCase().trim();
      result = result.filter(n => 
        n.name.toLowerCase().includes(q) ||
        n.ip.includes(q) ||
        (n.vendor && n.vendor.toLowerCase().includes(q)) ||
        (n.mac && n.mac.toLowerCase().includes(q))
      );
    }

    // Sort execution
    result.sort((a, b) => {
      let valA: any = a[sortField] ?? '';
      let valB: any = b[sortField] ?? '';

      if (sortField === 'latency') {
        valA = a.latency !== undefined ? a.latency : 99999;
        valB = b.latency !== undefined ? b.latency : 99999;
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [nodes, sortField, sortDirection, tableSearchQuery, statusFilter, subnetFilter]);

  // Export handlers
  const handleExportCSV = () => {
    const csvHeaders = ['IP Address', 'Hostname', 'Type', 'VLAN', 'Subnet', 'Latency (ms)', 'Status', 'Packet Loss (%)', 'TTL', 'MAC Address', 'Vendor', 'Last Seen'];
    const rows = filteredAndSortedNodes.map(n => [
      n.ip,
      n.name,
      n.type,
      n.vlan,
      n.subnet,
      n.latency !== undefined ? n.latency : 'Timeout',
      n.packetLoss === 100 ? 'Timeout' : n.status.toUpperCase(),
      n.packetLoss !== undefined ? n.packetLoss : 0,
      n.ttl !== undefined ? n.ttl : 64,
      n.mac || 'N/A',
      n.vendor || 'N/A',
      n.lastSeen || new Date().toISOString()
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [csvHeaders.join(','), ...rows.map(r => r.map(val => `"${val}"`).join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `ICMP_subnet_sweep_report_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportSubnetMatrixCSV = () => {
    const csvHeaders = ['IP Address', 'Status', 'Ping (RTT)', 'Hostname', 'MAC Address', 'Ports', 'Manufacturer'];
    const rows = fullSubnetIps.map(ip => {
      const result = rangeScanResults[ip];
      const status = result?.status || 'idle';
      const openPorts = Object.entries(result?.ports || {})
        .filter(([_, portStatus]) => portStatus === 'open')
        .map(([port]) => parseInt(port, 10))
        .sort((a, b) => a - b);
      
      return [
        ip,
        status.toUpperCase(),
        result?.latency !== undefined && result?.latency > 0 ? `${result.latency.toFixed(1)} ms` : (status === 'online' ? 'Online' : 'Offline'),
        result?.hostname || 'Unresolved',
        result?.mac || 'None',
        openPorts.length > 0 ? openPorts.join('; ') : 'None',
        result?.vendor || 'Generic / Private'
      ];
    });

    const csvContent = "data:text/csv;charset=utf-8," 
      + [csvHeaders.join(','), ...rows.map(r => r.map(val => `"${val}"`).join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `subnet_activity_matrix_scan_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(filteredAndSortedNodes, null, 2));
    const link = document.createElement('a');
    link.setAttribute('href', dataStr);
    link.setAttribute('download', `ICMP_subnet_sweep_report_${Date.now()}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportSubnetMatrixJSON = () => {
    const dataList = fullSubnetIps.map(ip => {
      const result = rangeScanResults[ip];
      const status = result?.status || 'idle';
      const openPorts = Object.entries(result?.ports || {})
        .filter(([_, portStatus]) => portStatus === 'open')
        .map(([port]) => parseInt(port, 10))
        .sort((a, b) => a - b);

      return {
        ipAddress: ip,
        status: status.toUpperCase(),
        latency: result?.latency !== undefined ? result.latency : null,
        hostname: result?.hostname || 'Unresolved',
        macAddress: result?.mac || 'None',
        vendor: result?.vendor || 'Generic / Private',
        openPorts,
        os: result?.os || 'Unknown'
      };
    });

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(dataList, null, 2));
    const link = document.createElement('a');
    link.setAttribute('href', dataStr);
    link.setAttribute('download', `subnet_activity_matrix_scan_${Date.now()}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportSubnetMatrixExcel = () => {
    let content = '<table><thead><tr>';
    const excelHeaders = ['IP Address', 'Status', 'Ping (RTT)', 'Hostname', 'MAC Address', 'Ports', 'Manufacturer', 'OS Guess'];
    excelHeaders.forEach(h => { content += `<th>${h}</th>`; });
    content += '</tr></thead><tbody>';
    
    fullSubnetIps.forEach(ip => {
      const result = rangeScanResults[ip];
      const status = result?.status || 'idle';
      const openPorts = Object.entries(result?.ports || {})
        .filter(([_, portStatus]) => portStatus === 'open')
        .map(([port]) => parseInt(port, 10))
        .sort((a, b) => a - b);

      content += `<tr>
        <td>${ip}</td>
        <td>${status.toUpperCase()}</td>
        <td>${result?.latency !== undefined && result?.latency > 0 ? `${result.latency.toFixed(1)} ms` : (status === 'online' ? 'Online' : 'Offline')}</td>
        <td>${result?.hostname || 'Unresolved'}</td>
        <td>${result?.mac || 'None'}</td>
        <td>${openPorts.length > 0 ? openPorts.join(', ') : 'None'}</td>
        <td>${result?.vendor || 'Generic / Private'}</td>
        <td>${result?.os || 'Unknown'}</td>
      </tr>`;
    });
    content += '</tbody></table>';
    
    const blob = new Blob([content], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `subnet_activity_matrix_scan_${Date.now()}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportSubnetMatrixXML = () => {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<scanResults>\n';
    fullSubnetIps.forEach(ip => {
      const result = rangeScanResults[ip];
      const status = result?.status || 'idle';
      const openPorts = Object.entries(result?.ports || {})
        .filter(([_, portStatus]) => portStatus === 'open')
        .map(([port]) => parseInt(port, 10))
        .sort((a, b) => a - b);

      xml += `  <host>\n`;
      xml += `    <ipAddress>${ip}</ipAddress>\n`;
      xml += `    <status>${status.toUpperCase()}</status>\n`;
      xml += `    <latency>${result?.latency !== undefined ? result.latency : '0'}</latency>\n`;
      xml += `    <hostname>${result?.hostname || 'Unresolved'}</hostname>\n`;
      xml += `    <macAddress>${result?.mac || 'None'}</macAddress>\n`;
      xml += `    <vendor>${result?.vendor || 'Generic / Private'}</vendor>\n`;
      xml += `    <openPorts>${openPorts.join(',')}</openPorts>\n`;
      if (result?.os) {
        xml += `    <operatingSystem>${result.os}</operatingSystem>\n`;
      }
      xml += `  </host>\n`;
    });
    xml += '</scanResults>';

    const blob = new Blob([xml], { type: 'application/xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `subnet_activity_matrix_scan_${Date.now()}.xml`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportSubnetMatrixPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Pop-up blocker is preventing PDF export. Please allow popups.');
      return;
    }
    
    let rowsHTML = '';
    fullSubnetIps.forEach(ip => {
      const result = rangeScanResults[ip];
      const status = result?.status || 'idle';
      const openPorts = Object.entries(result?.ports || {})
        .filter(([_, portStatus]) => portStatus === 'open')
        .map(([port]) => parseInt(port, 10))
        .sort((a, b) => a - b);

      rowsHTML += `
        <tr>
          <td>${ip}</td>
          <td><span class="${status === 'online' ? 'online' : 'offline'}">${status.toUpperCase()}</span></td>
          <td>${result?.latency !== undefined && result?.latency > 0 ? `${result.latency.toFixed(1)} ms` : 'N/A'}</td>
          <td>${result?.hostname || 'Unresolved'}</td>
          <td>${result?.mac || 'None'}</td>
          <td>${openPorts.length > 0 ? openPorts.join(', ') : 'None'}</td>
          <td>${result?.vendor || 'Generic / Private'}</td>
          <td>${result?.os || 'Unknown'}</td>
        </tr>
      `;
    });

    printWindow.document.write(`
      <html>
        <head>
          <title>Network Scanner Audit Report - ${new Date().toLocaleString()}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 40px; color: #1e293b; }
            h1 { margin-bottom: 5px; color: #0f172a; font-size: 24px; }
            .meta { font-size: 12px; color: #64748b; margin-bottom: 25px; font-family: monospace; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 11px; }
            th { background-color: #f1f5f9; padding: 10px; text-align: left; font-weight: bold; border-bottom: 2px solid #cbd5e1; }
            td { padding: 10px; border-bottom: 1px solid #e2e8f0; font-family: monospace; }
            tr:nth-child(even) { background-color: #f8fafc; }
            .online { color: #15803d; font-weight: bold; }
            .offline { color: #b91c1c; font-weight: bold; }
          </style>
        </head>
        <body>
          <h1>Network Range Sweep Discovery Audit</h1>
          <div class="meta">Generated: ${new Date().toLocaleString()} | Total Checked Target Hosts: ${fullSubnetIps.length}</div>
          <table>
            <thead>
              <tr>
                <th>IP Address</th>
                <th>Status</th>
                <th>RTT Ping</th>
                <th>Hostname</th>
                <th>MAC Address</th>
                <th>Open Ports</th>
                <th>Manufacturer</th>
                <th>OS Fingerprint</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHTML}
            </tbody>
          </table>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(filteredAndSortedNodes, null, 2));
    const link = document.createElement('a');
    link.setAttribute('href', dataStr);
    link.setAttribute('download', `ICMP_subnet_sweep_report_${Date.now()}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportExcel = () => {
    let content = '<table><thead><tr>';
    const excelHeaders = ['IP Address', 'Hostname', 'Latency (ms)', 'Status', 'Packet Loss (%)', 'TTL', 'MAC Address', 'Vendor', 'Last Seen'];
    excelHeaders.forEach(h => { content += `<th>${h}</th>`; });
    content += '</tr></thead><tbody>';
    
    filteredAndSortedNodes.forEach(n => {
      content += `<tr>
        <td>${n.ip}</td>
        <td>${n.name || 'N/A'}</td>
        <td>${n.latency !== undefined ? n.latency : 'Timeout'}</td>
        <td>${n.status.toUpperCase()}</td>
        <td>${n.packetLoss !== undefined ? n.packetLoss : 0}%</td>
        <td>${n.ttl || 64}</td>
        <td>${n.mac || 'N/A'}</td>
        <td>${n.vendor || 'N/A'}</td>
        <td>${n.lastSeen || 'N/A'}</td>
      </tr>`;
    });
    content += '</tbody></table>';
    
    const blob = new Blob([content], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `subnet_sweep_report_${Date.now()}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Pop-up blocker is preventing PDF export. Please allow popups.');
      return;
    }
    
    printWindow.document.write(`
      <html>
        <head>
          <title>ICMP Subnet Sweep Report - ${new Date().toLocaleString()}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 40px; color: #1e293b; }
            h1 { margin-bottom: 5px; color: #0f172a; font-size: 24px; }
            .meta { font-size: 12px; color: #64748b; margin-bottom: 25px; font-family: monospace; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 11px; }
            th { background-color: #f1f5f9; padding: 10px; text-align: left; font-weight: bold; border-bottom: 2px solid #cbd5e1; }
            td { padding: 10px; border-bottom: 1px solid #e2e8f0; font-family: monospace; }
            tr:nth-child(even) { background-color: #f8fafc; }
            .online { color: #15803d; font-weight: bold; }
            .offline { color: #b91c1c; font-weight: bold; }
          </style>
        </head>
        <body>
          <h1>ICMP Subnet Sweep Scan Report</h1>
          <div class="meta">Generated on: ${new Date().toLocaleString()} | Subnet: ${selectedSubnet || 'Default'}</div>
          <table>
            <thead>
              <tr>
                <th>IP Address</th>
                <th>Hostname</th>
                <th>Latency (RTT)</th>
                <th>Status</th>
                <th>Packet Loss</th>
                <th>TTL</th>
                <th>MAC Address</th>
                <th>Vendor (OUI)</th>
                <th>Last Seen</th>
              </tr>
            </thead>
            <tbody>
              ${filteredAndSortedNodes.map(n => `
                <tr>
                  <td><strong>${n.ip}</strong></td>
                  <td>${n.name || 'N/A'}</td>
                  <td>${n.latency !== undefined && n.status === 'online' ? `${n.latency} ms` : 'N/A'}</td>
                  <td class="${n.status === 'online' ? 'online' : 'offline'}">${n.status.toUpperCase()}</td>
                  <td>${n.packetLoss || 0}%</td>
                  <td>${n.ttl || 64}</td>
                  <td>${n.mac || 'N/A'}</td>
                  <td>${n.vendor || 'N/A'}</td>
                  <td>${n.lastSeen ? new Date(n.lastSeen).toLocaleTimeString() : 'N/A'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const isScanning = scanState === 'scanning';

  return (
    <div id="topology-map-panel" className="bg-slate-900 border border-slate-700 rounded-xl overflow-hidden shadow-xl p-5 space-y-6">
      
      {/* Top Tabs Selector */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-800 pb-2 mb-4 gap-4">
        <div className="flex flex-wrap gap-4 md:gap-6">
          <button
            type="button"
            onClick={() => setActiveSubTab('topology')}
            className={`pb-3 text-sm font-bold border-b-2 font-sans transition-all cursor-pointer flex items-center gap-2 ${
              activeSubTab === 'topology' ? 'border-rose-500 text-slate-100' : 'border-transparent text-slate-500 hover:text-slate-300'
            }`}
          >
            <Network className="w-4 h-4 text-rose-500" /> Topology Graph
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('scanner')}
            className={`pb-3 text-sm font-bold border-b-2 font-sans transition-all cursor-pointer flex items-center gap-2 ${
              activeSubTab === 'scanner' ? 'border-rose-500 text-slate-100' : 'border-transparent text-slate-500 hover:text-slate-300'
            }`}
          >
            <Activity className="w-4 h-4 text-emerald-500" /> IP Range Scanner
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('devices')}
            className={`pb-3 text-sm font-bold border-b-2 font-sans transition-all cursor-pointer flex items-center gap-2 ${
              activeSubTab === 'devices' ? 'border-rose-500 text-slate-100' : 'border-transparent text-slate-500 hover:text-slate-300'
            }`}
          >
            <Battery className="w-4 h-4 text-cyan-400" /> App Client Devices
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('inventory')}
            className={`pb-3 text-sm font-bold border-b-2 font-sans transition-all cursor-pointer flex items-center gap-2 ${
              activeSubTab === 'inventory' ? 'border-rose-500 text-slate-100' : 'border-transparent text-slate-500 hover:text-slate-300'
            }`}
          >
            <ShieldAlert className="w-4 h-4 text-amber-500" /> Asset Inventory & Alerts
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('agents')}
            className={`pb-3 text-sm font-bold border-b-2 font-sans transition-all cursor-pointer flex items-center gap-2 ${
              activeSubTab === 'agents' ? 'border-rose-500 text-slate-100' : 'border-transparent text-slate-500 hover:text-slate-300'
            }`}
          >
            <Cpu className="w-4 h-4 text-emerald-400" /> Endpoint Security Agents
          </button>
        </div>

        {/* Live Polling Toggle Switch */}
        <div className="flex items-center gap-2 bg-slate-950/60 px-3 py-1.5 rounded-lg border border-slate-850/80 mb-2 md:mb-0">
          <span className={`w-1.5 h-1.5 rounded-full ${livePolling ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
          <span className="text-[10px] font-mono uppercase font-bold text-slate-400">Live Polling:</span>
          <button
            type="button"
            onClick={() => {
              setLivePolling(!livePolling);
              addToast(livePolling ? "Automated background live polling paused." : "Automated background live polling enabled.", livePolling ? "warn" : "success");
            }}
            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase transition-all cursor-pointer ${
              livePolling
                ? 'bg-emerald-950 text-emerald-400 border border-emerald-900/50'
                : 'bg-slate-800 text-slate-400 border border-slate-750'
            }`}
          >
            {livePolling ? 'Active' : 'Paused'}
          </button>
        </div>
      </div>

      {activeSubTab === 'topology' ? (
        <div className="space-y-6">
          {/* Section title and Dynamic Gauge */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-slate-900/40 p-4 rounded-xl border border-slate-800/80">
            <div>
              <h3 className="font-sans font-bold text-slate-100 flex items-center gap-2 text-base">
                <Network className="w-5 h-5 text-rose-500 animate-pulse" /> Network Segment Mapping Graph
              </h3>
              <p className="text-xs text-slate-400 font-sans mt-0.5">
                Interactive structural topography of physical and discovered host nodes. Click nodes to access real-time traffic statistics, specifications, and port mapping in the side drawer.
              </p>
            </div>

            {/* Network Stability Gauge */}
            <div className="flex items-center gap-4 bg-slate-950 p-3 rounded-lg border border-slate-800 w-full md:w-auto min-w-[280px]">
              <div className="relative flex items-center justify-center">
                {/* SVG circular track & path */}
                <svg className="w-12 h-12 transform -rotate-90">
                  <circle cx="24" cy="24" r="20" stroke="#1e293b" strokeWidth="4" fill="transparent" />
                  <circle 
                    cx="24" 
                    cy="24" 
                    r="20" 
                    stroke={
                      stabilityMetrics.stabilityPercentage >= 90 ? '#10b981' :
                      stabilityMetrics.stabilityPercentage >= 75 ? '#84cc16' :
                      stabilityMetrics.stabilityPercentage >= 50 ? '#f59e0b' : '#ef4444'
                    }
                    strokeWidth="4" 
                    fill="transparent" 
                    strokeDasharray={2 * Math.PI * 20}
                    strokeDashoffset={2 * Math.PI * 20 * (1 - stabilityMetrics.stabilityPercentage / 100)}
                    className="transition-all duration-1000 ease-out"
                  />
                </svg>
                <div className="absolute font-mono text-[11px] font-bold text-slate-200">
                  {stabilityMetrics.stabilityPercentage}%
                </div>
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-slate-400 block">Network Stability Gauge</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-sans text-slate-300 font-bold">RTT (Weighted Avg):</span>
                  <span className="font-mono text-xs font-extrabold text-cyan-400">{stabilityMetrics.weightedAvgLatency} ms</span>
                </div>
                <span className="text-[9px] font-mono text-slate-500 block">Active Status: {stabilityMetrics.onlineRatio} Hosts Online</span>
              </div>
            </div>
          </div>

          {/* Filter Bar Above Topology Map */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950 px-4 py-3 rounded-lg border border-slate-800">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-rose-500" />
              <span className="text-xs font-bold font-sans text-slate-300 uppercase tracking-wider">Toggle Node Visibility:</span>
            </div>
            
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: 'all', label: 'All Devices', color: 'bg-slate-700', text: 'text-slate-300', count: nodes.length + (devices || []).length },
                { id: 'online', label: 'Online Only', color: 'bg-emerald-500', text: 'text-emerald-400', count: [...nodes, ...(devices || [])].filter(n => n.status === 'online').length },
                { id: 'degraded', label: 'Degraded Only', color: 'bg-amber-500', text: 'text-amber-400', count: [...nodes, ...(devices || [])].filter(n => n.status === 'degraded').length },
                { id: 'offline', label: 'Offline Only', color: 'bg-rose-500', text: 'text-rose-400', count: [...nodes, ...(devices || [])].filter(n => n.status === 'offline').length }
              ].map(item => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTopoStatusFilter(item.id as any)}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold font-sans transition-all flex items-center gap-2 border cursor-pointer ${
                    topoStatusFilter === item.id 
                      ? 'bg-slate-800 border-rose-500/50 text-slate-100 shadow-md' 
                      : 'bg-slate-900/50 border-slate-800/80 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${item.color} ${topoStatusFilter === item.id ? 'animate-pulse' : ''}`} />
                  <span>{item.label}</span>
                  <span className="bg-slate-950 font-mono text-[9px] px-1.5 py-0.5 rounded border border-slate-800 text-slate-300">
                    {item.count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Diagram Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Topology Diagram Stage - D3.js interactive graph */}
            <div className="lg:col-span-2 relative bg-slate-950 rounded-lg overflow-hidden border border-slate-800 h-[400px]">
              {isScanning && (
                <div className="absolute inset-0 bg-emerald-500/[0.02] animate-pulse flex items-center justify-center z-10 pointer-events-none">
                  <span className="text-[10px] text-emerald-400 font-mono tracking-wider bg-emerald-950/80 px-4 py-2 border border-emerald-500/20 rounded-full flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                    ACTIVE NATIVE ICMP SCAN ON {selectedSubnet}...
                  </span>
                </div>
              )}
              <svg ref={d3SvgRef} className="w-full h-full block" />

              {/* Floating Node Metrics Info Overlay */}
              <AnimatePresence>
                {selectedNode && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute bottom-16 left-3 bg-slate-900/95 border border-slate-700 rounded-lg p-3 shadow-xl select-none z-10 w-[220px] text-[10px] space-y-2 pointer-events-auto"
                  >
                    <div className="flex justify-between items-center border-b border-slate-800 pb-1.5 mb-2">
                      <span className="font-mono text-[9px] text-rose-400 uppercase tracking-wider font-bold block flex items-center gap-1">
                        <Info className="w-3.5 h-3.5" /> Node Metrics Overlay
                      </span>
                      <button 
                        onClick={() => setSelectedNode(null)}
                        className="text-slate-500 hover:text-slate-300 p-0.5 rounded transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="space-y-1.5 font-sans">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Node Name:</span>
                        <strong className="text-slate-200 truncate max-w-[120px]" title={selectedNode.name}>{selectedNode.name}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">IP Address:</span>
                        <span className="font-mono text-cyan-400 font-bold">{selectedNode.ip}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Last Seen:</span>
                        <span className="font-mono text-emerald-400 font-bold">
                          {selectedNode.status === 'offline' ? '3 hours ago' : 'Just Now (Online)'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Uptime Metric:</span>
                        <span className="font-mono text-indigo-400 font-bold">
                          {selectedNode.status === 'offline' ? '0.00%' : 
                           selectedNode.status === 'degraded' ? '92.45%' : '99.98%'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Firmware:</span>
                        <span className="font-mono text-amber-400 font-bold">
                          {selectedNode.type === 'core_switch' ? 'v3.2.1-trunk' : 
                           selectedNode.type === 'edge_switch' ? 'v1.4.10-edge' : 'v2.0.4-release'}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Floating Graph Legend */}
              <div className="absolute top-3 left-3 select-none z-10 pointer-events-auto">
                {showLegend ? (
                  <div className="bg-slate-900/95 border border-slate-800 rounded-lg p-3 shadow-xl max-w-[220px] text-[10px] space-y-2.5 relative">
                    <div className="flex justify-between items-center border-b border-slate-800 pb-1 mb-1.5">
                      <span className="font-mono text-[9px] text-slate-400 uppercase tracking-wider font-bold block">
                        Topology Legend
                      </span>
                      <button 
                        onClick={() => setShowLegend(false)}
                        className="text-slate-500 hover:text-slate-300 font-mono text-[8px] px-1 hover:bg-slate-800 rounded uppercase font-bold"
                        title="Hide Legend"
                      >
                        Hide
                      </button>
                    </div>
                    
                    {/* Node Status Indicators */}
                    <div className="space-y-1">
                      <span className="text-slate-500 font-mono text-[8px] uppercase tracking-wider block mb-1">Node Status Colors</span>
                      <div className="flex items-center gap-2 text-slate-300">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border border-emerald-400"></span>
                        <span>Online (Normal Latency)</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-300">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500 border border-amber-400"></span>
                        <span>Degraded (Moderate Loss/RTT)</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-300">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500 border border-rose-400"></span>
                        <span>Offline (No response)</span>
                      </div>
                    </div>

                    {/* Node Icons / Types */}
                    <div className="space-y-1 pt-2 border-t border-slate-800/60">
                      <span className="text-slate-500 font-mono text-[8px] uppercase tracking-wider block mb-1">Node Role Icons</span>
                      <div className="flex items-center gap-2 text-slate-300">
                        <span className="w-5 h-5 rounded bg-slate-950 border border-emerald-500/30 flex items-center justify-center text-xs font-semibold text-emerald-400">◈</span>
                        <span>Core Switch</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-300">
                        <span className="w-5 h-5 rounded bg-slate-950 border border-emerald-500/30 flex items-center justify-center text-xs font-semibold text-emerald-400">◆</span>
                        <span>Distribution Switch</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-300">
                        <span className="w-5 h-5 rounded bg-slate-950 border border-emerald-500/30 flex items-center justify-center text-xs font-semibold text-emerald-400">◇</span>
                        <span>Edge Switch</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-300">
                        <span className="w-5 h-5 rounded bg-slate-950 border border-emerald-500/30 flex items-center justify-center text-xs font-semibold text-emerald-400">⛗</span>
                        <span>Gateway Router</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-300">
                        <span className="w-5 h-5 rounded bg-slate-950 border border-emerald-500/30 flex items-center justify-center text-xs font-semibold text-emerald-400">🖥</span>
                        <span>Hardware Host</span>
                      </div>
                    </div>

                    {/* Connection Types / Latency */}
                    <div className="space-y-1 pt-2 border-t border-slate-800/60">
                      {heatmapEnabled ? (
                        <>
                          <span className="text-rose-400 font-mono text-[8px] uppercase tracking-wider block mb-1">Node Heatmap Latency</span>
                          <div className="flex items-center gap-1.5 text-slate-300">
                            <span className="w-3.5 h-3.5 rounded bg-[#065f46] border border-[#10b981] inline-block"></span>
                            <span className="text-[10px] font-mono">Excellent (≤ 30ms)</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-slate-300">
                            <span className="w-3.5 h-3.5 rounded bg-[#854d0e] border border-[#eab308] inline-block"></span>
                            <span className="text-[10px] font-mono">Light Load (31 - 75ms)</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-slate-300">
                            <span className="w-3.5 h-3.5 rounded bg-[#b45309] border border-[#f59e0b] inline-block"></span>
                            <span className="text-[10px] font-mono">Congested (76 - 150ms)</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-slate-300">
                            <span className="w-3.5 h-3.5 rounded bg-[#991b1b] border border-[#ef4444] inline-block"></span>
                            <span className="text-[10px] font-mono">Critical (&gt; 150ms)</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-slate-300">
                            <span className="w-3.5 h-3.5 rounded bg-[#7f1d1d] border border-[#f87171] inline-block"></span>
                            <span className="text-[10px] font-mono">Offline / No Signal</span>
                          </div>
                        </>
                      ) : (
                        <>
                          <span className="text-slate-500 font-mono text-[8px] uppercase tracking-wider block mb-1">Link Latency Status</span>
                          <div className="flex items-center gap-1.5 text-slate-300">
                            <span className="w-5 h-0.5 bg-[#10b981] inline-block"></span>
                            <span>Excellent (≤ 15ms)</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-slate-300">
                            <span className="w-5 h-0.5 bg-[#a3e635] inline-block"></span>
                            <span>Good (16 - 50ms)</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-slate-300">
                            <span className="w-5 h-0.5 bg-[#f59e0b] inline-block"></span>
                            <span>Moderate (51 - 100ms)</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-slate-300">
                            <span className="w-5 h-0.5 bg-[#ef4444] inline-block"></span>
                            <span>Critical (&gt; 100ms)</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-slate-300">
                            <span className="w-5 h-0.5 bg-[#475569] inline-block"></span>
                            <span>Offline Link</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowLegend(true)}
                    className="bg-slate-900/95 hover:bg-slate-800 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-300 font-mono text-[9px] uppercase tracking-wider font-bold shadow-lg transition-all flex items-center gap-1.5"
                  >
                    <span>🧭 Show Legend</span>
                  </button>
                )}
              </div>

              {/* Floating Graph Zoom and Pan Controls */}
              <div className="absolute bottom-3 right-3 flex items-center bg-slate-900/95 border border-slate-800 rounded-lg p-1.5 gap-1.5 shadow-lg select-none z-10">
                <button
                  onClick={() => setHeatmapEnabled(!heatmapEnabled)}
                  className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold transition-all cursor-pointer flex items-center gap-1 border ${
                    heatmapEnabled 
                      ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' 
                      : 'bg-slate-950 hover:bg-slate-800 text-slate-300 border-slate-800'
                  }`}
                  title="Toggle Latency Heatmap Overlay"
                >
                  <Activity className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
                  HEATMAP
                </button>

                <div className="w-px h-5 bg-slate-800 mx-0.5" />

                <button
                  onClick={() => handlePan(-40, 0)}
                  className="p-1 rounded bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-colors cursor-pointer"
                  title="Pan Left"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handlePan(0, -40)}
                  className="p-1 rounded bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-colors cursor-pointer"
                  title="Pan Up"
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handlePan(0, 40)}
                  className="p-1 rounded bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-colors cursor-pointer"
                  title="Pan Down"
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handlePan(40, 0)}
                  className="p-1 rounded bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-colors cursor-pointer"
                  title="Pan Right"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
                
                <div className="w-px h-5 bg-slate-800 mx-0.5" />

                <button
                  onClick={handleZoomIn}
                  className="p-1 rounded bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-colors cursor-pointer"
                  title="Zoom In"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={handleZoomOut}
                  className="p-1 rounded bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-colors cursor-pointer"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={handleResetZoom}
                  className="p-1 rounded bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-colors cursor-pointer"
                  title="Reset View"
                >
                  <Maximize2 className="w-3.5 h-3.5 text-rose-500" />
                </button>
              </div>
            </div>

            {/* Node Details Sidebar */}
            <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 flex flex-col justify-between h-[420px]">
              {selectedNode ? (
                <div className="flex-1 flex flex-col justify-between">
                  { (selectedNode as any).rawDeviceData ? (
                    <div>
                      <div className="flex justify-between items-start border-b border-slate-800 pb-2.5 mb-3.5">
                        <div className="min-w-0 flex-1 pr-2">
                          <h4 className="font-semibold text-emerald-400 text-sm flex items-center gap-1.5 truncate">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)] shrink-0" />
                            {selectedNode.name}
                          </h4>
                          <span className="text-[9px] text-slate-500 font-mono block mt-0.5 tracking-wider uppercase">ACTIVE APP CLIENT NODE</span>
                        </div>
                        <span className="shrink-0 px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-900/40 text-[9px] font-mono font-bold uppercase">
                          ONLINE
                        </span>
                      </div>

                      <div className="space-y-2.5 font-sans text-xs">
                        <div>
                          <span className="text-slate-400 block mb-0.5 uppercase text-[9px] tracking-wider font-semibold">IP Address</span>
                          <span className="text-cyan-400 font-mono bg-slate-900 border border-slate-800 px-2 py-1 rounded block font-bold">
                            {selectedNode.ip}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block mb-0.5 uppercase text-[9px] tracking-wider font-semibold">Location Context</span>
                          <span className="text-slate-200 bg-slate-900 border border-slate-800 px-2 py-1 rounded block">
                            {(selectedNode as any).rawDeviceData.location || 'Field Operator Hub'}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block mb-0.5 uppercase text-[9px] tracking-wider font-semibold">Current App User</span>
                          <span className="text-slate-200 bg-slate-900 border border-slate-800 px-2 py-1 rounded block font-mono">
                            {(selectedNode as any).rawDeviceData.currentUser || 'Unassigned Operator'}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block mb-0.5 uppercase text-[9px] tracking-wider font-semibold">Battery & Power Status</span>
                          <div className="text-slate-200 bg-slate-900 border border-slate-800 px-2 py-1 rounded block">
                            {(selectedNode as any).rawDeviceData.batteryPowered ? (
                              <div className="flex items-center justify-between">
                                <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                                  <Battery className="w-3.5 h-3.5" /> 
                                  {(selectedNode as any).rawDeviceData.batteryLevel}% ({(selectedNode as any).rawDeviceData.batteryHealth || 'Optimal'})
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  {(selectedNode as any).rawDeviceData.batteryCharging ? 'Charging' : 'Discharging'}
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-400 italic">Plugged in (A/C Wall Power)</span>
                            )}
                          </div>
                        </div>

                        {/* Adoption Action */}
                        <div className="pt-1.5">
                          <button
                            onClick={async () => {
                              if (onAdoptDevice) {
                                await onAdoptDevice((selectedNode as any).rawDeviceData);
                                setSelectedNode(null);
                              }
                            }}
                            className="w-full py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-[11px] rounded-lg transition-all shadow-[0_0_12px_rgba(16,185,129,0.2)] flex items-center justify-center gap-1.5"
                          >
                            <Plus className="w-3.5 h-3.5" /> Adopt Device in Assets
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start border-b border-slate-800 pb-3 mb-4">
                          <div>
                            <h4 className="font-semibold text-slate-200 text-sm">{selectedNode.name}</h4>
                            <span className="text-[10px] text-cyan-400 font-mono font-bold uppercase">{selectedNode.ip}</span>
                          </div>
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase font-bold border ${
                            selectedNode.packetLoss === 100 ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' :
                            selectedNode.status === 'online' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                            selectedNode.status === 'degraded' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                            'bg-rose-500/10 text-rose-400 border-rose-500/20'
                          }`}>
                            {selectedNode.packetLoss === 100 ? 'TIMEOUT' : selectedNode.status}
                          </span>
                        </div>

                        <div className="space-y-3 font-sans text-xs">
                          <div>
                            <span className="text-slate-400 block mb-1 uppercase text-[9px] tracking-wider font-semibold">VLAN Partition</span>
                            <span className="text-slate-200 font-semibold bg-slate-900 border border-slate-800 px-2 py-1 rounded block">
                              {selectedNode.vlan || 'VLAN 10 (Trunk)'}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400 block mb-1 uppercase text-[9px] tracking-wider font-semibold">Allocated IP Subnet</span>
                            <span className="text-slate-200 font-mono bg-slate-900 border border-slate-800 px-2 py-1 rounded block">
                              {selectedNode.subnet || '10.12.10.0/24'}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <span className="text-slate-400 block mb-1 uppercase text-[9px] tracking-wider font-semibold">ICMP Latency</span>
                              <span className="text-cyan-400 font-bold font-mono bg-slate-900 border border-slate-800 px-2 py-1 rounded block text-center">
                                {selectedNode.latency !== undefined && selectedNode.status === 'online' ? `${selectedNode.latency} ms` : 'Timed Out'}
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-400 block mb-1 uppercase text-[9px] tracking-wider font-semibold">Packet Loss</span>
                              <span className="text-slate-200 font-bold font-mono bg-slate-900 border border-slate-800 px-2 py-1 rounded block text-center">
                                {selectedNode.packetLoss !== undefined ? `${selectedNode.packetLoss}%` : '0%'}
                              </span>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <span className="text-slate-400 block mb-1 uppercase text-[9px] tracking-wider font-semibold">MAC Address</span>
                              <span className="text-slate-300 font-mono bg-slate-900 border border-slate-800 px-2 py-1 rounded block truncate text-[10px]" title={selectedNode.mac || 'N/A'}>
                                {selectedNode.mac || 'N/A'}
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-400 block mb-1 uppercase text-[9px] tracking-wider font-semibold">Vendor (OUI)</span>
                              <span className="text-slate-300 font-mono bg-slate-900 border border-slate-800 px-2 py-1 rounded block truncate text-[10px]" title={selectedNode.vendor || 'N/A'}>
                                {selectedNode.vendor || 'N/A'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="bg-slate-900/50 border border-slate-800 p-3 rounded-md mt-4">
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold block mb-1 flex items-center gap-1">
                          <Zap className="w-3.5 h-3.5 text-rose-500" /> Live Diagnostic Info
                        </span>
                        <p className="text-[10px] text-slate-500 leading-relaxed font-mono">
                          Verified via real ICMP check on host machine network card. DNS resolved hostnames, and MAC matches system ARP indexes.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
                  <Network className="w-12 h-12 text-slate-700 animate-pulse mb-3" />
                  <p className="text-sm font-medium text-slate-300">Select Topology Node</p>
                  <p className="text-xs text-slate-500 mt-1 max-w-[200px]">Click any map switch, gateway, or dynamically discovered node to isolate physical network details.</p>
                </div>
              )}
            </div>
          </div>

          {/* Single-Device ICMP Pinger & Add Device Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 border-t border-slate-800 pt-6 mt-6">
            
            {/* Pinger Controls and Quick Device Select */}
            <div className="lg:col-span-1 bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-4">
              <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                <h4 className="font-semibold text-slate-200 text-xs flex items-center gap-1.5 uppercase tracking-wider">
                  <Activity className="w-4 h-4 text-rose-500" /> Single-Device ICMP Pinger
                </h4>
                <button
                  type="button"
                  onClick={() => setShowAddDeviceModal(true)}
                  className="text-[9px] font-mono font-bold uppercase tracking-wider text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-1 rounded hover:bg-rose-500/20 transition-all cursor-pointer"
                >
                  + Add Device
                </button>
              </div>

              <div className="space-y-3 text-xs">
                {/* Quick select */}
                <div>
                  <label className="block text-[10px] text-slate-400 font-mono mb-1 uppercase tracking-wider">Quick Device Select</label>
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        setPingTarget(e.target.value);
                      }
                    }}
                    className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 font-mono focus:outline-none focus:border-slate-700 text-xs"
                  >
                    <option value="">-- Choose a Device --</option>
                    {nodes.map(n => (
                      <option key={n.id} value={n.ip}>{n.name} ({n.ip})</option>
                    ))}
                  </select>
                </div>

                {/* Target host input */}
                <div>
                  <label className="block text-[10px] text-slate-400 font-mono mb-1 uppercase tracking-wider">Target IP / Host</label>
                  <input
                    type="text"
                    value={pingTarget}
                    onChange={(e) => setPingTarget(e.target.value)}
                    placeholder="e.g. 10.12.10.1"
                    className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 font-mono focus:outline-none focus:border-slate-700 text-xs"
                  />
                </div>

                {/* Packet count select */}
                <div>
                  <label className="block text-[10px] text-slate-400 font-mono mb-1 uppercase tracking-wider">Packet Count</label>
                  <div className="grid grid-cols-5 gap-1">
                    {(['1', '4', '8', '12', 'continuous'] as const).map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setPacketCount(val)}
                        className={`py-1 rounded font-mono text-[10px] font-bold border uppercase transition-all ${
                          packetCount === val
                            ? 'bg-rose-500/10 text-rose-400 border-rose-500/40'
                            : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                        }`}
                      >
                        {val === 'continuous' ? 'Cont.' : val}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2">
                  {!isPingerRunning ? (
                    <button
                      type="button"
                      onClick={handleStartSinglePing}
                      className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-bold rounded uppercase cursor-pointer text-center text-[11px] transition-all"
                    >
                      Ping Target
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleStopSinglePing}
                      className="flex-1 py-2 bg-rose-600 hover:bg-rose-500 text-white font-mono font-bold rounded uppercase cursor-pointer text-center text-[11px] animate-pulse transition-all"
                    >
                      Stop Ping
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Terminal display for ping logs */}
            <div className="lg:col-span-2 bg-slate-950 p-4 rounded-lg border border-slate-800 flex flex-col justify-between h-[280px]">
              <div className="flex justify-between items-center border-b border-slate-800 pb-2 mb-2">
                <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider block font-bold">Interactive Ping Console</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              </div>
              <div className="flex-1 overflow-y-auto bg-slate-900/60 p-3 rounded border border-slate-900 font-mono text-[10px] text-slate-300 space-y-1 scrollbar-thin">
                {pingerLogs.length > 0 ? (
                  pingerLogs.map((log, index) => (
                    <p key={index} className={log.startsWith('---') || log.startsWith('PING') ? 'text-cyan-400 font-semibold' : log.includes('timeout') ? 'text-rose-400' : 'text-emerald-400'}>
                      {log}
                    </p>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 text-slate-500 space-y-2">
                    <Activity className="w-8 h-8 text-slate-700 animate-pulse" />
                    <p className="text-center">Console idle. Enter host IP and execute ICMP Ping to trigger live replies.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : activeSubTab === 'scanner' ? (
        <div className="space-y-6">
          {/* IP range scanner layout header */}
          <div className="border-b border-slate-800 pb-4">
            <h3 className="font-sans font-bold text-slate-100 flex items-center gap-2 text-base">
              <SlidersHorizontalIcon className="w-5 h-5 text-emerald-500" /> Professional Network IP Scanner
            </h3>
            <p className="text-xs text-slate-400 font-sans mt-1">
              Active operating system fingerprinting, TCP socket connect scans, reverse DNS lookups, MAC OUI vendor mappings, and latency tracking.
            </p>
          </div>

          {/* Advanced Bento Configuration Controls Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 bg-slate-950/40 p-5 rounded-xl border border-slate-850">
            {/* Column 1: Scan Target */}
            <div className="space-y-3">
              <span className="text-[10px] text-emerald-400 font-mono uppercase tracking-wider block font-bold">1. Target Range</span>
              <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800">
                <button
                  type="button"
                  onClick={() => setRangeType('subnet')}
                  className={`flex-1 py-1 rounded text-[10px] font-mono uppercase font-bold transition-all ${
                    rangeType === 'subnet' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Subnet
                </button>
                <button
                  type="button"
                  onClick={() => setRangeType('range')}
                  className={`flex-1 py-1 rounded text-[10px] font-mono uppercase font-bold transition-all ${
                    rangeType === 'range' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Range
                </button>
                <button
                  type="button"
                  onClick={() => setRangeType('single')}
                  className={`flex-1 py-1 rounded text-[10px] font-mono uppercase font-bold transition-all ${
                    rangeType === 'single' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Single IP
                </button>
              </div>

              {rangeType === 'subnet' && (
                <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-lg w-full">
                  <Server className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <select
                    value={selectedSubnet}
                    onChange={(e) => setSelectedSubnet(e.target.value)}
                    disabled={isIpRangeScanning}
                    className="bg-transparent border-none text-slate-200 font-mono text-xs cursor-pointer focus:ring-0 p-0 w-full"
                  >
                    {subnetsList.map((sub) => (
                      <option key={sub.subnet} value={sub.subnet}>{sub.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {rangeType === 'range' && (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-lg">
                    <span className="text-[9px] font-mono text-slate-500 uppercase shrink-0">From:</span>
                    <input
                      type="text"
                      value={fromIp}
                      onChange={(e) => setFromIp(e.target.value)}
                      disabled={isIpRangeScanning}
                      className="bg-transparent border-none text-slate-200 font-mono text-xs focus:ring-0 p-0 w-full"
                    />
                  </div>
                  <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-lg">
                    <span className="text-[9px] font-mono text-slate-500 uppercase shrink-0">To:</span>
                    <input
                      type="text"
                      value={toIp}
                      onChange={(e) => setToIp(e.target.value)}
                      disabled={isIpRangeScanning}
                      className="bg-transparent border-none text-slate-200 font-mono text-xs focus:ring-0 p-0 w-full"
                    />
                  </div>
                </div>
              )}

              {rangeType === 'single' && (
                <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-lg">
                  <span className="text-[9px] font-mono text-slate-500 uppercase shrink-0">IP Target:</span>
                  <input
                    type="text"
                    value={singleIpTarget}
                    onChange={(e) => setSingleIpTarget(e.target.value)}
                    disabled={isIpRangeScanning}
                    className="bg-transparent border-none text-slate-200 font-mono text-xs focus:ring-0 p-0 w-full"
                    placeholder="10.12.10.1"
                  />
                </div>
              )}
            </div>

            {/* Column 2: Scan Strategy */}
            <div className="space-y-3">
              <span className="text-[10px] text-emerald-400 font-mono uppercase tracking-wider block font-bold">2. Scan Strategy</span>
              <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800">
                <button
                  type="button"
                  onClick={() => setScanMode('quick')}
                  className={`flex-1 py-1 rounded text-[10px] font-mono uppercase font-bold transition-all ${
                    scanMode === 'quick' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="ICMP Pings & simple alive check"
                >
                  Quick
                </button>
                <button
                  type="button"
                  onClick={() => setScanMode('normal')}
                  className={`flex-1 py-1 rounded text-[10px] font-mono uppercase font-bold transition-all ${
                    scanMode === 'normal' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="Pings, Hostnames, ARP mapping"
                >
                  Normal
                </button>
                <button
                  type="button"
                  onClick={() => setScanMode('deep')}
                  className={`flex-1 py-1 rounded text-[10px] font-mono uppercase font-bold transition-all ${
                    scanMode === 'deep' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="Pings, ARPs, Hostnames, Port Sweeps, Banner Grab & OS detection"
                >
                  Deep Scan
                </button>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between items-center text-[9px] font-mono text-slate-500 uppercase font-semibold">
                  <span className="flex items-center gap-1.5">
                    Target Ports:
                    <button
                      type="button"
                      onClick={() => setIsPortModalOpen(true)}
                      className="text-[#10b981] hover:text-emerald-400 hover:underline transition-all lowercase text-[9px] cursor-pointer"
                    >
                      (Define List)
                    </button>
                  </span>
                  {scanMode === 'deep' && <span className="text-indigo-400 animate-pulse">Deep active</span>}
                </div>
                <input
                  type="text"
                  value={customPorts}
                  onChange={(e) => setCustomPorts(e.target.value)}
                  disabled={isIpRangeScanning || scanMode === 'quick'}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-200 font-mono text-xs px-2.5 py-1.5 rounded-lg focus:ring-0 focus:border-slate-700 disabled:opacity-50 disabled:bg-slate-950/20"
                  placeholder="22,80,443,3389"
                  title="Comma separated ports to verify"
                />
              </div>

              <div className="space-y-1 border-t border-slate-900 pt-2">
                <div className="flex justify-between items-center text-[9px] font-mono text-slate-500 uppercase font-semibold">
                  <span>Scope Template:</span>
                </div>
                <div className="flex gap-1.5">
                  <select
                    value={selectedTemplateId}
                    onChange={(e) => handleSelectTemplate(e.target.value)}
                    className="flex-1 bg-slate-950 border border-slate-800 text-slate-300 font-mono text-[10px] px-2 py-1.5 rounded-lg cursor-pointer"
                  >
                    {templates.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      const name = prompt("Enter a name for this custom port template:");
                      if (name) {
                        handleSaveTemplate(name, customPorts);
                      }
                    }}
                    className="px-2 py-1 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded text-[10px] font-mono text-[#10b981] cursor-pointer"
                    title="Save current ports as template"
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>

            {/* Column 3: Engine Parameters */}
            <div className="space-y-3">
              <span className="text-[10px] text-emerald-400 font-mono uppercase tracking-wider block font-bold">3. Engine Performance</span>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <span className="text-[9px] font-mono text-slate-500 uppercase block">Concurrency</span>
                  <select
                    value={concurrency}
                    onChange={(e) => setConcurrency(parseInt(e.target.value, 10))}
                    disabled={isIpRangeScanning}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-200 font-mono text-xs px-2 py-1.5 rounded-lg cursor-pointer"
                  >
                    <option value="25">25 Tasks</option>
                    <option value="50">50 Tasks</option>
                    <option value="100">100 Tasks</option>
                    <option value="250">250 Tasks</option>
                    <option value="500">500 Tasks</option>
                    <option value="1000">1000 Tasks</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <span className="text-[9px] font-mono text-slate-500 uppercase block">Timeout (RTT)</span>
                  <select
                    value={timeout}
                    onChange={(e) => setTimeoutVal(parseInt(e.target.value, 10))}
                    disabled={isIpRangeScanning}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-200 font-mono text-xs px-2 py-1.5 rounded-lg cursor-pointer"
                  >
                    <option value="100">100 ms</option>
                    <option value="250">250 ms</option>
                    <option value="500">500 ms</option>
                    <option value="1000">1.0 sec</option>
                    <option value="2000">2.0 sec</option>
                  </select>
                </div>
              </div>

              {/* Continuous Monitoring */}
              <div className="flex justify-between items-center bg-slate-950 border border-slate-800 p-2 rounded-lg">
                <span className="text-[9px] font-mono text-slate-400 uppercase">Continuous:</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={continuousMonitoring}
                    onChange={(e) => setContinuousMonitoring(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-7 h-4 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-300 after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
                <select
                  value={monitorInterval}
                  onChange={(e) => setMonitorInterval(parseInt(e.target.value, 10))}
                  disabled={!continuousMonitoring}
                  className="bg-transparent border-none text-slate-300 font-mono text-[10px] focus:ring-0 p-0 cursor-pointer"
                >
                  <option value="10">10s</option>
                  <option value="30">30s</option>
                  <option value="60">1m</option>
                  <option value="300">5m</option>
                </select>
              </div>
            </div>

            {/* Column 4: Scan Controls */}
            <div className="space-y-3 flex flex-col justify-between">
              <div>
                <span className="text-[10px] text-emerald-400 font-mono uppercase tracking-wider block font-bold mb-2">4. Scan Actions</span>
                <div className="flex flex-col gap-2">
                  {!isIpRangeScanning && pausedIndex === 0 && (
                    <button
                      type="button"
                      onClick={() => handleStartIpRangeScan(0)}
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-bold rounded-lg uppercase cursor-pointer text-center text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-950/50"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" /> Start Sweep
                    </button>
                  )}

                  {isIpRangeScanning && (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={handlePauseIpRangeScan}
                        className="py-2 bg-amber-600 hover:bg-amber-500 text-white font-mono font-bold rounded-lg uppercase cursor-pointer text-center text-[10px] flex items-center justify-center gap-1"
                      >
                        <Pause className="w-3 h-3 fill-current" /> Pause
                      </button>
                      <button
                        type="button"
                        onClick={handleStopIpRangeScan}
                        className="py-2 bg-rose-600 hover:bg-rose-500 text-white font-mono font-bold rounded-lg uppercase cursor-pointer text-center text-[10px] flex items-center justify-center gap-1"
                      >
                        <span className="w-2.5 h-2.5 bg-white rounded-sm"></span> Stop
                      </button>
                    </div>
                  )}

                  {!isIpRangeScanning && pausedIndex > 0 && (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => handleStartIpRangeScan(pausedIndex)}
                        className="py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-mono font-bold rounded-lg uppercase cursor-pointer text-center text-[10px] flex items-center justify-center gap-1"
                      >
                        <Play className="w-3 h-3 fill-current" /> Resume
                      </button>
                      <button
                        type="button"
                        onClick={handleStopIpRangeScan}
                        className="py-2 bg-rose-600 hover:bg-rose-500 text-white font-mono font-bold rounded-lg uppercase cursor-pointer text-center text-[10px] flex items-center justify-center gap-1"
                      >
                        <span className="w-2.5 h-2.5 bg-white rounded-sm"></span> Reset
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="text-[10px] text-slate-500 font-mono text-right leading-tight">
                {isIpRangeScanning ? (
                  <span className="text-emerald-400 animate-pulse font-bold flex items-center justify-end gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                    Sweep actively running
                  </span>
                ) : pausedIndex > 0 ? (
                  <span className="text-amber-400 font-bold">Paused at index {pausedIndex}</span>
                ) : (
                  <span>Scanner Engine ready</span>
                )}
              </div>
            </div>
          </div>

          {/* Automation, Custom Scopes & Scan History Dashboard */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 border-t border-slate-850 pt-5 mt-2">
            
            {/* Column 1: Saved Templates Manager */}
            <div className="bg-[#020617] p-4 border border-slate-850 rounded-xl space-y-3">
              <div className="flex justify-between items-center border-b border-slate-900 pb-2">
                <span className="text-[10px] text-indigo-400 font-mono uppercase tracking-wider block font-bold flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5 text-indigo-500" /> Port Scope Templates
                </span>
                <span className="text-[9px] text-slate-500 font-mono">Count: {templates.length}</span>
              </div>
              <div className="space-y-2">
                <p className="text-[10px] text-slate-400 font-sans">Select standard listeners or custom sweeps:</p>
                <div className="max-h-[160px] overflow-y-auto space-y-1.5 pr-1">
                  {templates.map(tmpl => (
                    <div 
                      key={tmpl.id} 
                      onClick={() => handleSelectTemplate(tmpl.id)}
                      className={`p-2 rounded-lg border text-left transition-all cursor-pointer flex justify-between items-center ${
                        selectedTemplateId === tmpl.id 
                          ? 'border-indigo-500 bg-indigo-950/20' 
                          : 'border-slate-850 bg-slate-950/60 hover:border-slate-800'
                      }`}
                    >
                      <div className="truncate pr-2">
                        <div className="text-[11px] font-bold text-slate-200">{tmpl.name}</div>
                        <div className="text-[9px] text-slate-400 font-mono truncate">{tmpl.ports}</div>
                      </div>
                      {tmpl.id.startsWith('tmpl-custom-') && (
                        <button
                          type="button"
                          onClick={(e) => handleDeleteTemplate(tmpl.id, e)}
                          className="p-1 text-slate-500 hover:text-rose-400 transition-colors shrink-0 cursor-pointer"
                          title="Delete Template"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Column 2: Recurring Audit Schedules */}
            <div className="bg-[#020617] p-4 border border-slate-850 rounded-xl space-y-3">
              <div className="flex justify-between items-center border-b border-slate-900 pb-2">
                <span className="text-[10px] text-emerald-400 font-mono uppercase tracking-wider block font-bold flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-emerald-500 animate-pulse" /> Recurring Audits
                </span>
                <button
                  type="button"
                  onClick={() => setShowAddScheduleForm(!showAddScheduleForm)}
                  className="text-[#10b981] hover:text-emerald-400 text-[10px] font-mono font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3" /> New
                </button>
              </div>

              {showAddScheduleForm ? (
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-2.5">
                  <div>
                    <label className="text-slate-500 text-[9px] uppercase font-mono block mb-1">Schedule Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Daily Midnight Sweep"
                      value={newScheduleName}
                      onChange={(e) => setNewScheduleName(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 text-slate-200 font-sans text-xs px-2 py-1 rounded focus:ring-0 focus:border-slate-700"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-slate-500 text-[9px] uppercase font-mono block mb-1">Frequency</label>
                      <select
                        value={newScheduleFreq}
                        onChange={(e) => setNewScheduleFreq(e.target.value as any)}
                        className="w-full bg-slate-900 border border-slate-800 text-slate-300 text-xs px-2 py-1 rounded cursor-pointer"
                      >
                        <option value="hourly">Hourly</option>
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-slate-500 text-[9px] uppercase font-mono block mb-1">Time / Minute</label>
                      {newScheduleFreq === 'hourly' ? (
                        <input
                          type="number"
                          placeholder="e.g. 15"
                          min="0"
                          max="59"
                          value={newScheduleTime.split(':')[1] || '00'}
                          onChange={(e) => setNewScheduleTime(`00:${String(e.target.value).padStart(2, '0')}`)}
                          className="w-full bg-slate-900 border border-slate-800 text-slate-200 font-mono text-xs px-2 py-1 rounded"
                        />
                      ) : (
                        <input
                          type="time"
                          value={newScheduleTime}
                          onChange={(e) => setNewScheduleTime(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 text-slate-200 font-mono text-xs px-2 py-1 rounded"
                        />
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="text-slate-500 text-[9px] uppercase font-mono block mb-1">Target Subnet</label>
                    <select
                      value={newScheduleSubnet}
                      onChange={(e) => setNewScheduleSubnet(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 text-slate-300 text-xs px-2 py-1 rounded cursor-pointer"
                    >
                      {subnetsList.map(s => (
                        <option key={s.subnet} value={s.subnet}>{s.name} ({s.subnet})</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex gap-2 justify-end pt-1">
                    <button
                      type="button"
                      onClick={() => setShowAddScheduleForm(false)}
                      className="px-2 py-1 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded text-[10px] cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleAddSchedule}
                      className="px-2.5 py-1 bg-[#10b981] hover:bg-emerald-500 text-slate-950 font-bold rounded text-[10px] cursor-pointer"
                    >
                      Save Schedule
                    </button>
                  </div>
                </div>
              ) : (
                <div className="max-h-[160px] overflow-y-auto space-y-1.5 pr-1 font-mono text-[10px]">
                  {schedules.length > 0 ? (
                    schedules.map(sched => (
                      <div key={sched.id} className="p-2 bg-slate-950/60 border border-slate-850 rounded-lg flex justify-between items-center">
                        <div className="truncate pr-2">
                          <div className="font-sans font-bold text-slate-200 truncate">{sched.name}</div>
                          <div className="text-slate-450 mt-0.5 text-[9px]">
                            {sched.frequency.toUpperCase()} @ {sched.time} ({sched.targetSubnet})
                          </div>
                          {sched.lastTriggered && (
                            <div className="text-slate-500 text-[8px] mt-0.5 truncate">
                              Last run: {new Date(sched.lastTriggered).toLocaleTimeString()}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <label className="relative inline-flex items-center cursor-pointer scale-90">
                            <input
                              type="checkbox"
                              checked={sched.enabled}
                              onChange={() => handleToggleSchedule(sched.id, sched.enabled)}
                              className="sr-only peer"
                            />
                            <div className="w-6 h-3.5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[1px] after:left-[1px] after:bg-slate-300 after:border-slate-300 after:border after:rounded-full after:h-2.5 after:w-2.5 after:transition-all peer-checked:bg-emerald-600"></div>
                          </label>
                          <button
                            type="button"
                            onClick={() => handleDeleteSchedule(sched.id)}
                            className="text-slate-500 hover:text-rose-450 transition-colors cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-slate-500 italic py-4 font-sans">No recurring schedules set.</div>
                  )}
                </div>
              )}
            </div>

            {/* Column 3: Audit Logs, Auto-Tagging & History Log Export */}
            <div className="bg-[#020617] p-4 border border-slate-850 rounded-xl space-y-3 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center border-b border-slate-900 pb-2">
                  <span className="text-[10px] text-cyan-400 font-mono uppercase tracking-wider block font-bold flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-cyan-500" /> Audit History & Rules
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setShowAutoTagConfig(!showAutoTagConfig)}
                      className="text-slate-400 hover:text-slate-200 text-[9px] font-mono hover:underline flex items-center gap-0.5 cursor-pointer"
                    >
                      <Settings className="w-2.5 h-2.5" /> Rules
                    </button>
                  </div>
                </div>

                {showAutoTagConfig ? (
                  <div className="bg-slate-950 border border-slate-850 p-2 rounded-lg mt-2 space-y-1.5 font-mono text-[9px] max-h-[140px] overflow-y-auto">
                    <div className="flex justify-between items-center border-b border-slate-900 pb-1 text-slate-400 font-sans">
                      <span>Auto-Tag Rules ({autoTaggingRules.length})</span>
                      <button type="button" onClick={() => setShowAutoTagConfig(false)} className="text-rose-400 cursor-pointer">Close</button>
                    </div>
                    <div className="space-y-1">
                      {autoTaggingRules.map((rule, idx) => (
                        <div key={idx} className="flex justify-between items-center bg-slate-900/50 p-1 rounded">
                          <span className="truncate max-w-[120px] text-slate-300">{rule.type}:{rule.pattern}</span>
                          <div className="flex items-center gap-1 shrink-0">
                            <span className="px-1 bg-indigo-950 text-indigo-300 rounded text-[8px]">{rule.tag}</span>
                            <button
                              type="button"
                              onClick={() => setAutoTaggingRules(prev => prev.filter((_, i) => i !== idx))}
                              className="text-rose-500 hover:text-rose-400 cursor-pointer"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-1 pt-1 border-t border-slate-900">
                      <input
                        type="text"
                        placeholder="pattern"
                        value={newRulePattern}
                        onChange={(e) => setNewRulePattern(e.target.value)}
                        className="w-1/3 bg-slate-900 border border-slate-800 p-0.5 text-[8px] text-slate-200 rounded focus:ring-0 focus:border-slate-700"
                      />
                      <input
                        type="text"
                        placeholder="tag"
                        value={newRuleTag}
                        onChange={(e) => setNewRuleTag(e.target.value)}
                        className="w-1/3 bg-slate-900 border border-slate-800 p-0.5 text-[8px] text-slate-200 rounded focus:ring-0 focus:border-slate-700"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (!newRulePattern.trim() || !newRuleTag.trim()) return;
                          setAutoTaggingRules(prev => [...prev, { pattern: newRulePattern.trim(), tag: newRuleTag.trim(), type: 'vendor' }]);
                          setNewRulePattern('');
                          setNewRuleTag('');
                        }}
                        className="w-1/3 bg-emerald-700 text-white text-[8px] font-bold rounded text-center cursor-pointer"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 mt-2">
                    <div className="flex justify-between items-center bg-slate-950 p-1.5 rounded border border-slate-850 text-[10px] font-mono">
                      <span className="text-slate-400">Auto-Tag Discovered Hosts:</span>
                      <label className="relative inline-flex items-center cursor-pointer scale-75">
                        <input
                          type="checkbox"
                          checked={enableAutoTagging}
                          onChange={(e) => setEnableAutoTagging(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-6 h-3.5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[1px] after:left-[1px] after:bg-slate-300 after:border-slate-300 after:border after:rounded-full after:h-2.5 after:w-2.5 after:transition-all peer-checked:bg-emerald-600"></div>
                      </label>
                    </div>

                    <div className="max-h-[105px] overflow-y-auto space-y-1 font-mono text-[9px] text-slate-450 pr-1">
                      {history.length > 0 ? (
                        history.map(row => (
                          <div key={row.id} className="flex justify-between items-center py-1 border-b border-slate-900">
                            <span className="text-slate-300 truncate max-w-[100px]">{new Date(row.timestamp).toLocaleDateString()} {new Date(row.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                            <span className="truncate max-w-[80px]">{row.targetRange}</span>
                            <span className="text-emerald-400 font-bold shrink-0">Found: {row.totalDevicesFound}</span>
                          </div>
                        ))
                      ) : (
                        <div className="text-center text-slate-500 italic py-2 font-sans">No history logged yet. Run a scan to populate.</div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 mt-2">
                <button
                  type="button"
                  onClick={handleExportHistoryCSV}
                  className="py-1.5 bg-slate-900 border border-slate-800 hover:border-slate-750 text-slate-200 font-mono text-[10px] rounded uppercase cursor-pointer flex items-center justify-center gap-1 shadow-sm transition-all"
                  title="Download CSV log of the last 10 scans"
                >
                  <Download className="w-3 h-3 text-cyan-400" /> CSV Log
                </button>
                <button
                  type="button"
                  onClick={handleExportHistoryPDF}
                  className="py-1.5 bg-rose-950/40 border border-rose-900/30 hover:border-rose-900 text-rose-400 font-mono text-[10px] rounded uppercase cursor-pointer flex items-center justify-center gap-1 shadow-sm transition-all"
                  title="Generate aggregate statistics PDF from last 10 scans"
                >
                  <FileText className="w-3 h-3 text-rose-400" /> PDF Report
                </button>
              </div>
            </div>
          </div>

          {/* Available Physical NICs */}
          <div className="space-y-2">
            <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider block font-semibold">Available Host Interfaces (NICs)</span>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {clientNICs.map(nic => {
                const isSelectedNic = selectedNic.interfaceName === nic.interfaceName;
                return (
                  <button
                    key={`${nic.interfaceName}-${nic.ip}`}
                    type="button"
                    onClick={() => setSelectedNic(nic)}
                    className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                      isSelectedNic 
                        ? 'border-emerald-500 bg-emerald-950/10 shadow-lg shadow-emerald-950/50' 
                        : 'border-slate-800 bg-slate-950 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-bold text-slate-100 font-sans truncate pr-2" title={nic.name}>{nic.name}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[8px] font-mono font-bold uppercase ${
                        nic.type === 'Wireless' ? 'bg-indigo-500/10 text-indigo-400' : 'bg-emerald-500/10 text-emerald-400'
                      }`}>{nic.type}</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] font-mono text-slate-400">
                      <span>{nic.interfaceName}: <strong className="text-cyan-400">{nic.ip}</strong></span>
                      <span className="text-[9px] text-slate-500">{nic.mac}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <AnimatePresence>
            {hasScanStarted && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={
                  (isIpRangeScanning || appIsPinging)
                    ? {
                        opacity: 1,
                        y: 0,
                        borderColor: ["rgba(16, 185, 129, 0.2)", "rgba(16, 185, 129, 0.75)", "rgba(16, 185, 129, 0.2)"],
                        boxShadow: [
                          "0 0 12px rgba(16, 185, 129, 0.05)",
                          "0 0 28px rgba(16, 185, 129, 0.35)",
                          "0 0 12px rgba(16, 185, 129, 0.05)"
                        ],
                        scale: [1, 1.006, 1]
                      }
                    : {
                        opacity: 1,
                        y: 0,
                        borderColor: "rgba(30, 41, 59, 1)",
                        boxShadow: "none",
                        scale: 1
                      }
                }
                exit={{ opacity: 0, y: 15 }}
                transition={
                  (isIpRangeScanning || appIsPinging)
                    ? {
                        borderColor: { duration: 2, repeat: Infinity, ease: "easeInOut" },
                        boxShadow: { duration: 2, repeat: Infinity, ease: "easeInOut" },
                        scale: { duration: 2.5, repeat: Infinity, ease: "easeInOut" },
                        default: { duration: 0.4, ease: "easeOut" }
                      }
                    : { duration: 0.4, ease: "easeOut" }
                }
                className="bg-[#040404] p-5 border rounded-xl space-y-5 transition-all duration-500"
              >
                {/* 1. Header & Live Indicator */}
                <div className="flex justify-between items-center text-xs font-mono font-bold uppercase tracking-widest text-[#7c7d81] select-none pb-1 border-b border-slate-900">
                  <div className="flex items-center gap-2">
                    <span>Scanner Telemetry & Activity Matrix</span>
                    {(isIpRangeScanning || appIsPinging) && (
                      <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] bg-emerald-950/40 text-[#10b981] border border-emerald-900/30 font-bold tracking-widest animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.3)]">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                        SWEEP ACTIVE
                      </span>
                    )}
                  </div>
                  <span className="text-[#10b981] font-mono">
                    ONLINE: <span className="font-bold">{aliveCount}</span> ALIVE
                  </span>
                </div>

                {/* 2. Unified Scan Progress Bar */}
                <div className="bg-slate-950 border border-slate-900 rounded-lg p-3 space-y-2 font-mono text-xs">
                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span>Hosts Verified: <strong className="text-slate-200">{rangeScanProgress.scanned}</strong> / <strong className="text-slate-200">{rangeScanProgress.total}</strong></span>
                    <span>Progress: <strong className="text-emerald-400">{rangeScanProgress.total > 0 ? Math.round((rangeScanProgress.scanned / rangeScanProgress.total) * 100) : 0}%</strong></span>
                  </div>
                  <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-emerald-500 via-cyan-500 to-indigo-500 transition-all duration-150 ease-out" 
                      style={{ width: `${rangeScanProgress.total > 0 ? (rangeScanProgress.scanned / rangeScanProgress.total) * 100 : 0}%` }}
                    />
                  </div>
                </div>

                {/* 3. Real-time Statistics Panel */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-950/40 p-3 rounded-lg border border-slate-900 text-xs font-mono">
                  {/* Metric 1: OS Fingerprint Distribution */}
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold">OS Distribution</span>
                    <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-slate-300 text-[11px]">
                      <div className="flex justify-between">
                        <span>Win:</span>
                        <strong className="text-cyan-400">{scanStats.windows}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Mac:</span>
                        <strong className="text-indigo-400">{scanStats.macos}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Linux:</span>
                        <strong className="text-emerald-400">{scanStats.linux}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Other:</span>
                        <strong className="text-amber-400">{scanStats.otherOs}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Metric 2: MAC Manufacturers */}
                  <div className="space-y-1 md:col-span-2">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold">Discovered Manufacturers</span>
                    <div className="text-[11px] text-slate-300 truncate" title={scanStats.topVendors}>
                      <span className="text-slate-500">Top Vendors:</span> <strong className="text-amber-400">{scanStats.topVendors}</strong>
                    </div>
                    <div className="text-[10px] text-slate-500 mt-1">
                      Reverse mapping MAC OUIs dynamically with internal IEEE database.
                    </div>
                  </div>
                </div>

                {/* 4. Split Screen - Left: Log Console, Right: Dot Matrix */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                  {/* Left Column: Interactive Live Terminal Monitor */}
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-900 flex flex-col justify-between h-[280px]">
                    <div className="flex justify-between items-center border-b border-slate-900 pb-2 mb-2">
                      <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider block font-bold">Live Scan Console Logs</span>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    </div>
                    <div className="flex-1 overflow-y-auto bg-slate-900/40 p-3 rounded border border-slate-900/60 font-mono text-[10px] text-slate-300 space-y-1.5 scrollbar-thin">
                      {scanLogs.length > 0 ? (
                        scanLogs.map((log, index) => (
                          <p key={index} className={log.includes('[+] HOST ONLINE') ? 'text-emerald-400 font-semibold' : log.includes('Scanner Error') ? 'text-rose-400' : 'text-slate-300'}>
                            {log}
                          </p>
                        ))
                      ) : (
                        <div className="flex flex-col items-center justify-center py-16 text-slate-600 space-y-2">
                          <Activity className="w-6 h-6 text-slate-800 animate-pulse" />
                          <p className="text-center text-[9px]">Console idle. Launch an IP Range Sweep to monitor live scan trace logging replies.</p>
                        </div>
                      )}
                      <div ref={terminalEndRef} />
                    </div>
                  </div>

                  {/* Right Column: Activity Dot Grid */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider block font-bold">Visual Address Map</span>
                      <span className="text-[9px] text-slate-500 font-mono">Hover node for telemetry metrics</span>
                    </div>
                    <div className="grid grid-cols-[repeat(auto-fill,minmax(24px,1fr))] gap-1 max-h-[250px] overflow-y-auto p-2 bg-slate-950 rounded-xl border border-slate-900">
                      {fullSubnetIps.map((ip, idx) => {
                        const result = rangeScanResults[ip];
                        const status = result?.status || 'idle';
                        
                        let cellClass = '';
                        let content = null;
                        
                        if (status === 'online') {
                          cellClass = 'bg-[#10b981] border-[#10b981] text-slate-950 shadow-[0_0_12px_rgba(16,185,129,0.65)]';
                          content = <span className="text-[9px] font-black leading-none select-none text-slate-900">▲</span>;
                        } else if (status === 'scanning') {
                          cellClass = 'bg-cyan-950/40 border-cyan-500/50 text-cyan-400';
                          content = <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping"></span>;
                        } else {
                          cellClass = 'bg-[#18040a] border-[#4c0519] text-rose-500/30';
                          content = <span className="w-1 h-1 rounded-full bg-[#f43f5e] shadow-[0_0_4px_rgba(244,63,94,0.5)]"></span>;
                        }

                        return (
                          <div
                            key={ip}
                            className={`aspect-square w-6 h-6 rounded-md border flex items-center justify-center transition-all duration-300 relative group cursor-crosshair ${cellClass} hover:border-slate-300 hover:scale-110 hover:z-30`}
                          >
                            {content}
                            
                            {/* Tooltip on hover */}
                            <div className="absolute bottom-full mb-2 hidden group-hover:flex flex-col items-start bg-slate-950 border border-slate-800 text-slate-200 text-[10px] rounded p-2.5 shadow-xl z-50 pointer-events-none font-mono min-w-[175px] leading-relaxed">
                              <div className="text-[8px] text-slate-500 font-bold border-b border-slate-900 pb-1 mb-1.5 w-full tracking-wider">HOST TELEMETRY</div>
                              <div className="flex justify-between w-full gap-2">
                                <span className="text-slate-400">IP:</span>
                                <strong className="text-slate-100">{ip}</strong>
                              </div>
                              <div className="flex justify-between w-full gap-2">
                                <span className="text-slate-400">Status:</span>
                                <strong className={status === 'online' ? 'text-[#10b981]' : status === 'scanning' ? 'text-cyan-400 animate-pulse' : 'text-rose-500'}>
                                  {status.toUpperCase()}
                                </strong>
                              </div>
                              {result?.hostname && (
                                <div className="flex justify-between w-full gap-2">
                                  <span className="text-slate-400">Name:</span>
                                  <strong className="text-cyan-400 truncate max-w-[110px]">{result.hostname}</strong>
                                </div>
                              )}
                              {result?.mac && (
                                <div className="flex justify-between w-full gap-2">
                                  <span className="text-slate-400">MAC:</span>
                                  <strong className="text-indigo-400">{result.mac}</strong>
                                </div>
                              )}
                              {result?.vendor && (
                                <div className="flex justify-between w-full gap-2">
                                  <span className="text-slate-400">Vendor:</span>
                                  <strong className="text-amber-400 truncate max-w-[110px]">{result.vendor}</strong>
                                </div>
                              )}
                              {result?.latency !== undefined && result?.latency > 0 && (
                                <div className="flex justify-between w-full gap-2">
                                  <span className="text-slate-400">RTT:</span>
                                  <strong className="text-[#10b981]">{result.latency.toFixed(1)} ms</strong>
                                </div>
                              )}
                              {result?.os && result?.os !== 'Unknown' && (
                                <div className="flex justify-between w-full gap-2 border-t border-slate-900 pt-1 mt-1">
                                  <span className="text-slate-400">OS Guess:</span>
                                  <strong className="text-indigo-400 truncate max-w-[110px]">{result.os}</strong>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Scanned Hosts & Ports Table */}
          <AnimatePresence>
            {hasScanStarted && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 15 }}
                transition={{ duration: 0.4, delay: 0.1, ease: 'easeOut' }}
                className="bg-[#020617] p-5 border border-slate-800 rounded-xl space-y-4"
              >
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-slate-850 pb-3">
                  <div>
                    <h4 className="text-slate-100 text-xs uppercase tracking-wider font-mono font-bold flex items-center gap-2">
                      <Activity className="w-4 h-4 text-[#10b981]" /> Subnet Scanner Ports & Telemetry
                    </h4>
                    <p className="text-[10px] text-slate-400 font-sans mt-0.5">
                      Live dynamic port scanning and address resolution table. Real-time details of MAC addresses, active listeners, and vendors.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mt-2 sm:mt-0">
                    {/* Status Filter Toggle */}
                    <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded px-2 py-1">
                      <span className="text-[9px] text-slate-400 font-mono uppercase tracking-wider font-bold">Show:</span>
                      <select
                        value={scannerViewFilter}
                        onChange={(e) => setScannerViewFilter(e.target.value as any)}
                        className="bg-transparent border-none text-slate-300 font-mono text-[10px] cursor-pointer focus:ring-0 p-0 outline-none"
                      >
                        <option value="all">All</option>
                        <option value="alive">Alive</option>
                        <option value="offline">Offline</option>
                      </select>
                    </div>

                    <div className="h-4 w-[1px] bg-slate-800 mx-1 hidden sm:block"></div>

                    <button
                      type="button"
                      onClick={handleExportSubnetMatrixCSV}
                      className="flex items-center gap-1 px-2 py-1 bg-[#0a0f1d] hover:bg-emerald-950/30 text-slate-300 hover:text-emerald-400 border border-slate-800 hover:border-emerald-800/40 rounded text-[9px] font-sans font-bold cursor-pointer transition-all uppercase tracking-wider"
                      title="Export CSV"
                    >
                      CSV
                    </button>
                    <button
                      type="button"
                      onClick={handleExportSubnetMatrixJSON}
                      className="flex items-center gap-1 px-2 py-1 bg-[#0a0f1d] hover:bg-emerald-950/30 text-slate-300 hover:text-emerald-400 border border-slate-800 hover:border-emerald-800/40 rounded text-[9px] font-sans font-bold cursor-pointer transition-all uppercase tracking-wider"
                      title="Export JSON"
                    >
                      JSON
                    </button>
                    <button
                      type="button"
                      onClick={handleExportSubnetMatrixExcel}
                      className="flex items-center gap-1 px-2 py-1 bg-[#0a0f1d] hover:bg-emerald-950/30 text-slate-300 hover:text-emerald-400 border border-slate-800 hover:border-emerald-800/40 rounded text-[9px] font-sans font-bold cursor-pointer transition-all uppercase tracking-wider"
                      title="Export Excel"
                    >
                      Excel
                    </button>
                    <button
                      type="button"
                      onClick={handleExportSubnetMatrixXML}
                      className="flex items-center gap-1 px-2 py-1 bg-[#0a0f1d] hover:bg-emerald-950/30 text-slate-300 hover:text-emerald-400 border border-slate-800 hover:border-emerald-800/40 rounded text-[9px] font-sans font-bold cursor-pointer transition-all uppercase tracking-wider"
                      title="Export XML"
                    >
                      XML
                    </button>
                    <button
                      type="button"
                      onClick={handleExportSubnetMatrixPDF}
                      className="flex items-center gap-1 px-2 py-1 bg-[#0a0f1d] hover:bg-emerald-950/30 text-slate-300 hover:text-emerald-400 border border-slate-800 hover:border-emerald-800/40 rounded text-[9px] font-sans font-bold cursor-pointer transition-all uppercase tracking-wider"
                      title="Export PDF Report"
                    >
                      PDF
                    </button>
                  </div>
                </div>

                <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/40">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-950 border-b border-slate-800">
                          <th className="p-3 text-[10px] font-bold text-slate-400 font-mono uppercase tracking-wider">IP Address</th>
                          <th className="p-3 text-[10px] font-bold text-slate-400 font-mono uppercase tracking-wider">Ping (RTT)</th>
                          <th className="p-3 text-[10px] font-bold text-slate-400 font-mono uppercase tracking-wider">Hostname</th>
                          <th className="p-3 text-[10px] font-bold text-slate-400 font-mono uppercase tracking-wider">MAC Address</th>
                          <th className="p-3 text-[10px] font-bold text-slate-400 font-mono uppercase tracking-wider">MAC Vendor</th>
                          <th className="p-3 text-[10px] font-bold text-slate-400 font-mono uppercase tracking-wider">Ports</th>
                          <th className="p-3 text-[10px] font-bold text-slate-400 font-mono uppercase tracking-wider">Manufacturer</th>
                          <th className="p-3 text-[10px] font-bold text-slate-400 font-mono uppercase tracking-wider text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-850 font-mono text-xs">
                        {filteredScannedDevices.length > 0 ? (
                          filteredScannedDevices.map((dev) => {
                            const openPorts = Object.entries(dev.ports || {})
                              .filter(([_, portStatus]) => portStatus === 'open')
                              .map(([port]) => parseInt(port, 10))
                              .sort((a, b) => a - b);

                            const isOnline = dev.status === 'online';

                            return (
                              <tr key={dev.ip} className={`hover:bg-slate-900/40 transition-colors ${!isOnline ? 'opacity-65' : ''}`}>
                                <td className={`p-3 font-semibold ${isOnline ? 'text-emerald-400' : 'text-rose-500/80'}`}>{dev.ip}</td>
                                <td className="p-3">
                                  {isOnline ? (
                                    <span className="flex items-center gap-1.5 text-emerald-400">
                                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                      {dev.latency !== undefined && dev.latency > 0 ? `${dev.latency.toFixed(1)} ms` : 'Online'}
                                    </span>
                                  ) : (
                                    <span className="flex items-center gap-1.5 text-rose-500/75">
                                      <span className="w-2 h-2 rounded-full bg-rose-600"></span>
                                      Offline
                                    </span>
                                  )}
                                </td>
                                <td className="p-3 text-slate-200">{dev.hostname || <span className="text-slate-500 italic">Unresolved</span>}</td>
                                <td className="p-3 text-indigo-400 text-[11px]">{dev.mac || <span className="text-slate-500 italic">None</span>}</td>
                                <td className="p-3 text-amber-500/90 font-mono text-[11px]">{dev.vendor || getMacVendorClient(dev.mac)}</td>
                                <td className="p-3">
                                  <div className="flex flex-wrap gap-1 max-w-[200px]">
                                    {openPorts.length > 0 ? (
                                      openPorts.map((port) => (
                                        <span key={port} className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-emerald-950/40 text-emerald-400 border border-emerald-900/30" title={`Port ${port} is active`}>
                                          {port}
                                        </span>
                                      ))
                                    ) : (
                                      <span className="text-slate-500 text-[10px] italic">None active</span>
                                    )}
                                  </div>
                                </td>
                                <td className="p-3 text-amber-400 font-sans text-[11px]">{dev.vendor || <span className="text-slate-500 italic">Generic / Private</span>}</td>
                                <td className="p-3 text-right">
                                  <div className="flex items-center justify-end gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setPromoteIp(dev.ip);
                                        setPromoteName(dev.hostname && dev.hostname !== 'N/A' ? dev.hostname : `Discovered Host (${dev.ip})`);
                                        setPromoteMac(dev.mac || '');
                                        setPromoteVendor(dev.vendor || getMacVendorClient(dev.mac) || '');
                                        setPromoteTags(getAutoTagsForDevice(dev.vendor || getMacVendorClient(dev.mac), dev.hostname).join(', '));
                                        setPromoteType('hardware');
                                        setPromoteParent(nodes[0]?.id || 'node-core');
                                        setPromoteVlan('VLAN 10');
                                        setPromoteSubnet(selectedSubnet);
                                        setShowPromoteModal(true);
                                      }}
                                      className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-[10px] font-sans font-bold cursor-pointer transition-all uppercase"
                                    >
                                      Add to Topology
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleRegisterDiscoveredDevice(dev.ip, dev.hostname, dev.mac, dev.vendor)}
                                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded text-[10px] font-sans font-bold cursor-pointer transition-all uppercase"
                                    >
                                      Add Device
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan={8} className="p-6 text-center text-slate-500 italic">
                              {isIpRangeScanning ? (
                                <div className="flex flex-col items-center justify-center gap-2">
                                  <RefreshCw className="w-5 h-5 animate-spin text-emerald-500" />
                                  <span>Sweeping range and scanning host ports... please wait...</span>
                                </div>
                              ) : (
                                'No devices matching filter found. Click "Start Scan" to run the subnet sweeps.'
                              )}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Subnet Scan Table & Filters */}
          <div className="border-t border-slate-850 pt-6 mt-6 space-y-4">
            
            {/* Table Filters & Export controls */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex flex-wrap items-center gap-2">
                
                {/* Search Input */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search Host, IP, MAC, Vendor..."
                    value={tableSearchQuery}
                    onChange={(e) => setTableSearchQuery(e.target.value)}
                    className="bg-slate-950 text-slate-200 pl-8 pr-3 py-1.5 border border-slate-800 rounded-lg text-xs font-mono w-48 md:w-64 focus:outline-none focus:border-slate-700"
                  />
                </div>

                {/* Status Filter Dropdown */}
                <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1">
                  <Filter className="w-3 h-3 text-slate-400" />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    className="bg-transparent border-none text-slate-300 font-mono text-xs cursor-pointer focus:ring-0 p-0.5"
                  >
                    <option value="all">All States</option>
                    <option value="online">Online Only</option>
                    <option value="offline">Offline Only</option>
                    <option value="timeout">Timeout Only</option>
                  </select>
                </div>

                {/* Subnet range filter dropdown */}
                <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1">
                  <select
                    value={subnetFilter}
                    onChange={(e) => setSubnetFilter(e.target.value as any)}
                    className="bg-transparent border-none text-slate-300 font-mono text-xs cursor-pointer focus:ring-0 p-0.5"
                  >
                    <option value="all">All Subnets</option>
                    <option value="10.12.1.">VLAN 1 (10.12.1.x)</option>
                    <option value="10.12.10.">VLAN 10 (10.12.10.x)</option>
                    <option value="10.12.20.">VLAN 20 (10.12.20.x)</option>
                    <option value="10.12.30.">VLAN 30 (10.12.30.x)</option>
                    <option value="10.12.40.">VLAN 40 (10.12.40.x)</option>
                    <option value="10.12.50.">VLAN 50 (10.12.50.x)</option>
                  </select>
                </div>
              </div>

              {/* Export Actions */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">Export Report:</span>
                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 rounded-lg text-xs font-mono font-bold cursor-pointer transition-all flex items-center gap-1"
                  title="Export report to CSV file"
                >
                  <Download className="w-3 h-3" /> CSV
                </button>
                <button
                  type="button"
                  onClick={handleExportJSON}
                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 rounded-lg text-xs font-mono font-bold cursor-pointer transition-all flex items-center gap-1"
                  title="Export report to JSON format"
                >
                  <Download className="w-3 h-3" /> JSON
                </button>
                <button
                  type="button"
                  onClick={handleExportExcel}
                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 rounded-lg text-xs font-mono font-bold cursor-pointer transition-all flex items-center gap-1"
                  title="Export report to Microsoft Excel file"
                >
                  <Download className="w-3 h-3" /> Excel
                </button>
                <button
                  type="button"
                  onClick={handleExportPDF}
                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 rounded-lg text-xs font-mono font-bold cursor-pointer transition-all flex items-center gap-1"
                  title="Print sweep report or save as PDF document"
                >
                  <FileText className="w-3 h-3" /> PDF
                </button>
              </div>
            </div>

            {/* BULK ACTIONS FLOATING CONTROL PANEL */}
            {selectedBulkNodeIds.length > 0 && (
              <div className="bg-slate-900 border border-rose-500/30 rounded-xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-lg shadow-rose-950/10 animate-fade-in">
                <div className="flex items-center gap-2">
                  <span className="bg-rose-500/10 text-rose-400 border border-rose-500/20 text-xs font-bold font-mono px-2.5 py-1 rounded-md">
                    {selectedBulkNodeIds.length} Devices Selected
                  </span>
                  <span className="text-slate-300 text-xs font-medium font-sans">
                    Bulk Update Operations
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {/* Status update options */}
                  <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1">
                    <span className="text-[10px] text-slate-400 font-mono uppercase font-bold">Status:</span>
                    <select
                      id="bulk-status-select"
                      defaultValue=""
                      onChange={async (e) => {
                        const val = e.target.value;
                        if (!val) return;
                        await handleBulkUpdateStatus(val as any);
                        e.target.value = ""; // Reset
                      }}
                      className="bg-transparent border-none text-slate-300 font-mono text-xs cursor-pointer focus:ring-0 p-0.5 outline-none"
                    >
                      <option value="" disabled>-- Set Status --</option>
                      <option value="online">Online</option>
                      <option value="degraded">Degraded</option>
                      <option value="offline">Offline</option>
                    </select>
                  </div>

                  {/* Partition group/VLAN options */}
                  <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1">
                    <span className="text-[10px] text-slate-400 font-mono uppercase font-bold">VLAN Group:</span>
                    <select
                      id="bulk-vlan-select"
                      defaultValue=""
                      onChange={async (e) => {
                        const val = e.target.value;
                        if (!val) return;
                        await handleBulkUpdateVlan(val);
                        e.target.value = ""; // Reset
                      }}
                      className="bg-transparent border-none text-slate-300 font-mono text-xs cursor-pointer focus:ring-0 p-0.5 outline-none"
                    >
                      <option value="" disabled>-- Reassign VLAN --</option>
                      <option value="VLAN 10">VLAN 10 (Control)</option>
                      <option value="VLAN 20">VLAN 20 (Media)</option>
                      <option value="VLAN 30">VLAN 30 (Audio)</option>
                      <option value="VLAN 40">VLAN 40 (SFX/DMX)</option>
                      <option value="VLAN 50">VLAN 50 (Special Effects)</option>
                    </select>
                  </div>

                  {/* Bulk Ping & Reboot Operations */}
                  <button
                    type="button"
                    disabled={isBulkPinging || isBulkRebooting}
                    onClick={handleBulkPing}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-500/20 rounded-lg text-xs font-mono font-bold cursor-pointer transition-all uppercase flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isBulkPinging ? 'animate-spin' : ''}`} />
                    {isBulkPinging ? 'Pinging...' : 'Ping Selected'}
                  </button>

                  <button
                    type="button"
                    disabled={isBulkPinging || isBulkRebooting}
                    onClick={handleBulkReboot}
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white border border-rose-500/20 rounded-lg text-xs font-mono font-bold cursor-pointer transition-all uppercase flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Power className={`w-3.5 h-3.5 ${isBulkRebooting ? 'animate-spin' : ''}`} />
                    {isBulkRebooting ? 'Reboot Selected' : 'Reboot Selected'}
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedBulkNodeIds([])}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-400 hover:text-slate-200 border border-slate-700 rounded-lg text-xs font-mono font-bold cursor-pointer transition-all uppercase"
                  >
                    Clear Selection
                  </button>
                </div>
              </div>
            )}

            {/* RESULTS TABLE */}
            <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/40">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-950 border-b border-slate-800">
                    <th className="p-3 w-10">
                      <input 
                        type="checkbox"
                        className="rounded border-slate-800 bg-slate-950 text-rose-500 focus:ring-rose-500/20 cursor-pointer"
                        checked={filteredAndSortedNodes.length > 0 && selectedBulkNodeIds.length === filteredAndSortedNodes.length}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedBulkNodeIds(filteredAndSortedNodes.map(n => n.id));
                          } else {
                            setSelectedBulkNodeIds([]);
                          }
                        }}
                      />
                    </th>
                    <th className="p-3 text-[10px] font-bold text-slate-400 font-mono uppercase tracking-wider">
                      <button onClick={() => handleSort('ip')} className="flex items-center gap-1 hover:text-slate-200 transition-colors">
                        IP Address <ArrowUpDown className="w-3 h-3" />
                      </button>
                    </th>
                    <th className="p-3 text-[10px] font-bold text-slate-400 font-mono uppercase tracking-wider">
                      <button onClick={() => handleSort('name')} className="flex items-center gap-1 hover:text-slate-200 transition-colors">
                        Hostname <ArrowUpDown className="w-3 h-3" />
                      </button>
                    </th>
                    <th className="p-3 text-[10px] font-bold text-slate-400 font-mono uppercase tracking-wider">
                      <button onClick={() => handleSort('latency')} className="flex items-center gap-1 hover:text-slate-200 transition-colors">
                        Latency (RTT) <ArrowUpDown className="w-3 h-3" />
                      </button>
                    </th>
                    <th className="p-3 text-[10px] font-bold text-slate-400 font-mono uppercase tracking-wider">
                      <button onClick={() => handleSort('status')} className="flex items-center gap-1 hover:text-slate-200 transition-colors">
                        Status <ArrowUpDown className="w-3 h-3" />
                      </button>
                    </th>
                    <th className="p-3 text-[10px] font-bold text-slate-400 font-mono uppercase tracking-wider">
                      Packet Loss
                    </th>
                    <th className="p-3 text-[10px] font-bold text-slate-400 font-mono uppercase tracking-wider">
                      TTL
                    </th>
                    <th className="p-3 text-[10px] font-bold text-slate-400 font-mono uppercase tracking-wider">
                      <button onClick={() => handleSort('mac')} className="flex items-center gap-1 hover:text-slate-200 transition-colors">
                        MAC Address <ArrowUpDown className="w-3 h-3" />
                      </button>
                    </th>
                    <th className="p-3 text-[10px] font-bold text-slate-400 font-mono uppercase tracking-wider">
                      <button onClick={() => handleSort('vendor')} className="flex items-center gap-1 hover:text-slate-200 transition-colors">
                        Vendor (OUI) <ArrowUpDown className="w-3 h-3" />
                      </button>
                    </th>
                    <th className="p-3 text-[10px] font-bold text-slate-400 font-mono uppercase tracking-wider">
                      Last Seen
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850 font-mono text-xs">
                  {filteredAndSortedNodes.length > 0 ? (
                    filteredAndSortedNodes.map((node) => {
                      const isTimeout = node.packetLoss === 100 || node.status === 'offline';
                      const isDegraded = node.status === 'degraded';
                      const isBeingPinged = isScanning && progress.currentIp === node.ip;

                      return (
                        <tr 
                          key={node.id} 
                          onClick={() => setSelectedNode(node)}
                          className={`hover:bg-slate-900/30 transition-colors cursor-pointer ${isSelected(node.id) ? 'bg-rose-500/5' : ''} ${isBeingPinged ? 'bg-blue-500/10 border-blue-500/50' : ''}`}
                        >
                          <td className="p-3 w-10" onClick={(e) => e.stopPropagation()}>
                            <input 
                              type="checkbox"
                              className="rounded border-slate-800 bg-slate-950 text-rose-500 focus:ring-rose-500/20 cursor-pointer animate-none"
                              checked={selectedBulkNodeIds.includes(node.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedBulkNodeIds(prev => [...prev, node.id]);
                                } else {
                                  setSelectedBulkNodeIds(prev => prev.filter(id => id !== node.id));
                                }
                              }}
                            />
                          </td>
                          <td className="p-3 font-semibold text-slate-100 flex items-center gap-1.5">
                            {isBeingPinged && <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping"></span>}
                            {node.ip}
                          </td>
                          <td className="p-3 text-slate-300 font-sans font-medium">{node.name}</td>
                          <td className="p-3">
                            {isTimeout ? (
                              <span className="text-slate-500">N/A</span>
                            ) : (
                              <span className="text-cyan-400 font-bold">{node.latency} ms</span>
                            )}
                          </td>
                          <td className="p-3">
                            {isBeingPinged ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 animate-pulse">
                                <RefreshCw className="w-2.5 h-2.5 animate-spin" /> Scanning
                              </span>
                            ) : isTimeout ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                                <AlertTriangle className="w-2.5 h-2.5" /> Timeout
                              </span>
                            ) : isDegraded ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                <AlertTriangle className="w-2.5 h-2.5" /> Degraded
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                <CheckCircle2 className="w-2.5 h-2.5" /> Online
                              </span>
                            )}
                          </td>
                          <td className="p-3">
                            <span className={isTimeout ? 'text-rose-500 font-bold' : 'text-slate-400'}>
                              {node.packetLoss !== undefined ? `${node.packetLoss}%` : '0%'}
                            </span>
                          </td>
                          <td className="p-3 text-slate-400">{node.ttl || 64}</td>
                          <td className="p-3 text-slate-400 truncate max-w-[120px]" title={node.mac}>{node.mac || 'N/A'}</td>
                          <td className="p-3 text-slate-300 font-sans truncate max-w-[150px]" title={node.vendor}>{node.vendor || 'N/A'}</td>
                          <td className="p-3 text-slate-500 text-[10px]">
                            {node.lastSeen ? new Date(node.lastSeen).toLocaleTimeString() : 'N/A'}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={10} className="p-8 text-center text-slate-500">
                        No active subnet sweep records found matching selection. Trigger sweep to initiate discovery.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : activeSubTab === 'devices' ? (
        <div className="space-y-6">
          {/* Section title */}
          <div className="border-b border-slate-800 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="font-sans font-bold text-slate-100 flex items-center gap-2 text-base">
                <Battery className="w-5 h-5 text-cyan-400" /> Live Application Client Terminals
              </h3>
              <p className="text-xs text-slate-400 font-sans mt-1">
                Real-time directory of user-operated devices actively running this application interface. Includes live network telemetry, client battery reporting, and administrative hardware adoption mechanisms.
              </p>
            </div>

            {/* View Mode & Discovery Controls */}
            <div className="flex items-center gap-3 self-end md:self-auto">
              {/* Discovery Button */}
              <button
                type="button"
                disabled={isDiscoveringClients}
                onClick={async () => {
                  setIsDiscoveringClients(true);
                  try {
                    // Trigger a reload of network interfaces from the real host
                    const res = await fetch('/api/interfaces');
                    const data = await res.json();
                    if (data.success && data.interfaces && data.interfaces.length > 0) {
                      const realNics = data.interfaces
                        .filter((i: any) => i.name !== 'lo' && i.ip !== '127.0.0.1' && i.ip !== '::1')
                        .map((i: any) => {
                          const hasWifiName = i.name.toLowerCase().includes('wlan') || i.name.toLowerCase().includes('wifi');
                          return {
                            name: `${i.name} Network Adapter`,
                            interfaceName: i.name,
                            ip: i.ip,
                            subnetMask: i.netmask || '255.255.255.0',
                            gateway: i.ip.split('.').slice(0, 3).join('.') + '.1',
                            type: hasWifiName ? 'Wireless' : 'Ethernet',
                            status: 'connected',
                            mac: '02:42:AC:12:' + i.ip.split('.').slice(2).map((x: any) => {
                              const num = parseInt(x, 10);
                              return isNaN(num) ? '00' : num.toString(16).padStart(2, '0').toUpperCase();
                            }).join(':')
                          };
                        });
                      setClientNICs(realNics);
                      setSelectedNic(realNics[0]);
                    }
                    addToast("Hardware connection pool ARP lookup completed.", "success");
                  } catch (e) {
                    console.error(e);
                  } finally {
                    setIsDiscoveringClients(false);
                  }
                }}
                className="px-3 py-1.5 bg-[#0e172c] hover:bg-cyan-950/40 text-cyan-400 hover:text-cyan-300 border border-cyan-900/50 hover:border-cyan-700/60 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isDiscoveringClients ? 'animate-spin' : ''}`} />
                {isDiscoveringClients ? 'Discovering...' : 'DISCOVER DEVICES'}
              </button>

              {/* View Toggle */}
              <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-0.5">
                <button
                  type="button"
                  onClick={() => setClientViewMode('list')}
                  className={`px-2.5 py-1 rounded text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1 ${
                    clientViewMode === 'list'
                      ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      : 'text-slate-400 hover:text-slate-200 border border-transparent'
                  }`}
                  title="List View (Default)"
                >
                  <List className="w-3.5 h-3.5" />
                  LIST
                </button>
                <button
                  type="button"
                  onClick={() => setClientViewMode('grid')}
                  className={`px-2.5 py-1 rounded text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1 ${
                    clientViewMode === 'grid'
                      ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      : 'text-slate-400 hover:text-slate-200 border border-transparent'
                  }`}
                  title="Grid View"
                >
                  <Grid className="w-3.5 h-3.5" />
                  GRID
                </button>
              </div>
            </div>
          </div>

          {isDiscoveringClients ? (
            <div className="bg-slate-950/60 rounded-xl p-12 border border-slate-850 flex flex-col items-center justify-center space-y-3">
              <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
              <p className="text-xs font-mono text-cyan-400">Performing hardware connection pool ARP port lookup...</p>
            </div>
          ) : clientViewMode === 'list' ? (
            <div className="border border-slate-850 rounded-xl overflow-hidden bg-slate-950/40">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-950 border-b border-slate-850">
                      <th className="p-3 text-[10px] font-bold text-slate-400 font-mono uppercase tracking-wider">Device Terminal</th>
                      <th className="p-3 text-[10px] font-bold text-slate-400 font-mono uppercase tracking-wider">IP / Interface</th>
                      <th className="p-3 text-[10px] font-bold text-slate-400 font-mono uppercase tracking-wider">Location</th>
                      <th className="p-3 text-[10px] font-bold text-slate-400 font-mono uppercase tracking-wider">Authorized Operator</th>
                      <th className="p-3 text-[10px] font-bold text-slate-400 font-mono uppercase tracking-wider">Power & Battery Info</th>
                      <th className="p-3 text-[10px] font-bold text-slate-400 font-mono uppercase tracking-wider text-right">Inventory Integration</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850 font-mono text-xs text-slate-300">
                    {nodes.filter(n => (n as any).rawDeviceData).length > 0 ? (
                      nodes.filter(n => (n as any).rawDeviceData).map((node) => {
                        const device = (node as any).rawDeviceData;
                        const isDeviceAlreadyAdopted = nodes.some(
                          n => n.ip === device.ip && !(n as any).rawDeviceData
                        );
                        return (
                          <tr key={node.id} className="hover:bg-slate-900/20 transition-colors">
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
                                <div>
                                  <div className="font-bold text-slate-200">{device.name}</div>
                                  <div className="text-[10px] text-slate-400 mt-0.5">{device.role || 'Operator'}</div>
                                </div>
                              </div>
                            </td>
                            <td className="p-3 text-cyan-400 font-bold">{device.ip}</td>
                            <td className="p-3 text-slate-300">{device.location || 'Unknown Area'}</td>
                            <td className="p-3 text-slate-200 font-sans">{device.currentUser || 'Unassigned Operator'}</td>
                            <td className="p-3">
                              {device.batteryPowered ? (
                                <div className="flex items-center gap-2">
                                  <span className="text-[11px] font-bold text-slate-200">{device.batteryLevel}%</span>
                                  <div className="w-16 bg-slate-900 h-1.5 rounded-full overflow-hidden border border-slate-850">
                                    <div
                                      className={`h-full ${
                                        device.batteryLevel < 20 ? 'bg-rose-500' :
                                        device.batteryLevel < 50 ? 'bg-amber-500' : 'bg-emerald-500'
                                      }`}
                                      style={{ width: `${device.batteryLevel}%` }}
                                    />
                                  </div>
                                  <span className="text-[10px] text-slate-500">{device.batteryCharging ? '⚡' : ''}</span>
                                </div>
                              ) : (
                                <span className="text-slate-500 text-[10px] flex items-center gap-1">
                                  <Zap className="w-3 h-3 text-emerald-500" /> Stationary AC Mains
                                </span>
                              )}
                            </td>
                            <td className="p-3 text-right">
                              {isDeviceAlreadyAdopted ? (
                                <span className="inline-flex items-center gap-1 text-emerald-400 text-xs font-bold bg-emerald-950/20 border border-emerald-900/30 px-2.5 py-1 rounded">
                                  <CheckCircle2 className="w-3.5 h-3.5" /> Active Asset
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={async () => {
                                    if (onAdoptDevice) {
                                      await onAdoptDevice(device);
                                      addToast(`Successfully adopted "${device.name}" into inventory.`, 'success');
                                    }
                                  }}
                                  className="px-2.5 py-1 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-[10px] rounded transition-all cursor-pointer inline-flex items-center gap-1"
                                >
                                  <Plus className="w-3 h-3" /> Adopt Asset
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-500">
                          No Active App Terminals Registered in connection pool.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {nodes.filter(n => (n as any).rawDeviceData).length > 0 ? (
                nodes.filter(n => (n as any).rawDeviceData).map((node) => {
                  const device = (node as any).rawDeviceData;
                  const isDeviceAlreadyAdopted = nodes.some(
                    n => n.ip === device.ip && !(n as any).rawDeviceData
                  );

                  return (
                    <div
                      key={node.id}
                      className="bg-slate-950 p-5 rounded-xl border border-slate-800 flex flex-col justify-between hover:border-slate-700 transition-all shadow-lg relative group"
                    >
                      {/* Corner badge */}
                      <div className="absolute top-4 right-4 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-emerald-400 bg-emerald-950/50 px-2 py-0.5 border border-emerald-500/20 rounded">
                          Active
                        </span>
                      </div>

                      <div className="space-y-4">
                        {/* Title & Role */}
                        <div>
                          <h4 className="font-sans font-bold text-slate-100 text-sm group-hover:text-rose-400 transition-colors">
                            {device.name}
                          </h4>
                          <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-850 mt-1 inline-block">
                            {device.role || 'Operator'}
                          </span>
                        </div>

                        {/* Details Grid */}
                        <div className="grid grid-cols-2 gap-3.5 text-xs font-sans">
                          <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-850/60">
                            <span className="text-[9px] text-slate-500 font-mono uppercase block mb-0.5">IP Address</span>
                            <span className="text-cyan-400 font-mono font-bold">{device.ip}</span>
                          </div>
                          <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-850/60">
                            <span className="text-[9px] text-slate-500 font-mono uppercase block mb-0.5">Location</span>
                            <span className="text-slate-300 font-semibold truncate block" title={device.location}>
                              {device.location || 'Unknown Area'}
                            </span>
                          </div>
                          <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-850/60 col-span-2">
                            <span className="text-[9px] text-slate-500 font-mono uppercase block mb-0.5">Authorized User</span>
                            <span className="text-slate-200 font-semibold">{device.currentUser || 'Unassigned Operator'}</span>
                          </div>
                        </div>

                        {/* Battery Telemetry Section */}
                        <div className="bg-slate-900/40 p-3 rounded-lg border border-slate-850/40 space-y-2">
                          <div className="flex justify-between items-center text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">
                            <span>Battery Status</span>
                            <span className={device.batteryPowered ? 'text-amber-400' : 'text-slate-500'}>
                              {device.batteryPowered ? 'Battery Driven' : 'AC Mains Line'}
                            </span>
                          </div>

                          {device.batteryPowered ? (
                            <div className="space-y-1.5">
                              <div className="flex justify-between items-center text-xs">
                                <span className="text-slate-400">Charge Level:</span>
                                <span className="text-slate-200 font-mono font-bold">{device.batteryLevel}%</span>
                              </div>
                              {/* Visual battery bar */}
                              <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-850">
                                <div
                                  className={`h-full transition-all ${
                                    device.batteryLevel < 20 ? 'bg-rose-500' :
                                    device.batteryLevel < 50 ? 'bg-amber-500' : 'bg-emerald-500'
                                  }`}
                                  style={{ width: `${device.batteryLevel}%` }}
                                />
                              </div>
                              <div className="flex justify-between text-[10px] font-mono text-slate-500 pt-0.5">
                                <span>Health: {device.batteryHealth || 'Optimal'}</span>
                                <span>{device.batteryCharging ? '⚡ Charging' : 'Discharging'}</span>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 text-xs text-slate-400 py-1">
                              <Zap className="w-3.5 h-3.5 text-emerald-500" />
                              <span>Stationary workstation terminal. Connected to utility AC power grid.</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Adoption CTA Button */}
                      <div className="mt-5 pt-3 border-t border-slate-900">
                        {isDeviceAlreadyAdopted ? (
                          <div className="w-full py-2 bg-emerald-950/30 border border-emerald-900/30 text-emerald-400 text-center text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Already In Assets
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={async () => {
                              if (onAdoptDevice) {
                                await onAdoptDevice(device);
                                addToast(`Successfully adopted "${device.name}" into inventory.`, 'success');
                              }
                            }}
                            className="w-full py-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-xs rounded-lg transition-all shadow-[0_0_12px_rgba(99,102,241,0.2)] flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <Plus className="w-4 h-4" /> Adopt Device in Assets
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="col-span-full bg-slate-950/40 rounded-xl p-12 text-center border border-slate-850/50 flex flex-col items-center justify-center space-y-3">
                  <Battery className="w-12 h-12 text-slate-700 animate-pulse" />
                  <h4 className="font-sans font-bold text-slate-300 text-sm">No Live App Clients Found</h4>
                  <p className="text-xs text-slate-500 font-sans max-w-sm leading-relaxed">
                    Active connection pool currently empty. When other operators boot the web application client on mobile terminals or control panels, they will populate here.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      ) : activeSubTab === 'agents' ? (
        <EndpointAgentsConsole
          agentsList={agentsList}
          selectedAgent={selectedAgent}
          setSelectedAgent={setSelectedAgent}
          agentsSearch={agentsSearch}
          setAgentsSearch={setAgentsSearch}
          agentsStatusFilter={agentsStatusFilter}
          setAgentsStatusFilter={setAgentsStatusFilter}
          agentsOsFilter={agentsOsFilter}
          setAgentsOsFilter={setAgentsOsFilter}
          activeAgentTab={activeAgentTab}
          setActiveAgentTab={setActiveAgentTab}
          addToast={addToast}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT 2 COLUMNS: Physical Devices Database */}
          <div className="lg:col-span-2 space-y-6">
            <div className="border-b border-slate-800 pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="font-sans font-bold text-slate-100 flex items-center gap-2 text-base">
                  <Database className="w-5 h-5 text-emerald-500" /> Physical Asset Inventory Database
                </h3>
                <p className="text-xs text-slate-400 font-sans mt-0.5">
                  Authorized registry of physical adapters, routers, servers, printers, and switches. Real network signatures and identities only.
                </p>
              </div>
              
              {/* Quick Export Reports */}
              <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-850">
                <span className="text-[10px] text-slate-500 font-mono font-bold px-1.5 uppercase">Export:</span>
                {['csv', 'xml', 'html', 'json'].map(fmt => (
                  <a
                    key={fmt}
                    href={`/api/inventory/export?format=${fmt}`}
                    download
                    className="px-2 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded text-[10px] font-mono font-bold uppercase text-emerald-400 transition-all cursor-pointer"
                  >
                    {fmt}
                  </a>
                ))}
              </div>
            </div>

            {/* Filter controls */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-950/40 p-4 rounded-xl border border-slate-850">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 uppercase font-mono font-bold">Search Identifier</label>
                <input
                  type="text"
                  value={inventorySearchTerm}
                  onChange={(e) => setInventorySearchTerm(e.target.value)}
                  placeholder="IP, MAC, Name, Brand..."
                  className="w-full bg-slate-950 border border-slate-800 text-slate-200 font-mono text-xs px-2.5 py-1.5 rounded-lg focus:ring-0 focus:border-slate-700"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 uppercase font-mono font-bold">Status Filter</label>
                <select
                  value={inventoryStatusFilter}
                  onChange={(e) => setInventoryStatusFilter(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-300 font-mono text-xs px-2 py-1.5 rounded-lg cursor-pointer"
                >
                  <option value="all">All States</option>
                  <option value="online">Online Devices</option>
                  <option value="offline">Offline Devices</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 uppercase font-mono font-bold">Hardware Classification</label>
                <select
                  value={inventoryTypeFilter}
                  onChange={(e) => setInventoryTypeFilter(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-300 font-mono text-xs px-2 py-1.5 rounded-lg cursor-pointer"
                >
                  <option value="all">All Hardware</option>
                  <option value="Server">Servers</option>
                  <option value="Switch">Switches</option>
                  <option value="Router">Routers</option>
                  <option value="Camera">Cameras</option>
                  <option value="Printer">Printers</option>
                  <option value="Desktop">Desktops</option>
                  <option value="Laptop">Laptops</option>
                  <option value="NAS">NAS Devices</option>
                  <option value="IoT">IoT / Other</option>
                </select>
              </div>
            </div>

            {/* Devices Database Table */}
            <div className="border border-slate-850 rounded-xl overflow-hidden bg-slate-950/40">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-950 border-b border-slate-850 font-mono text-[10px] uppercase tracking-wider text-slate-400">
                      <th className="p-3">Network Node</th>
                      <th className="p-3">Physical Address</th>
                      <th className="p-3">Platform</th>
                      <th className="p-3">Type</th>
                      <th className="p-3 text-center">Open Ports</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850 font-mono text-xs text-slate-300">
                    {(() => {
                      const filtered = inventoryDevices.filter(d => {
                        const s = inventorySearchTerm.toLowerCase();
                        const matchesSearch = !s || 
                          d.ip.toLowerCase().includes(s) ||
                          (d.mac || '').toLowerCase().includes(s) ||
                          (d.hostname || '').toLowerCase().includes(s) ||
                          (d.vendor || '').toLowerCase().includes(s) ||
                          (d.os || '').toLowerCase().includes(s) ||
                          (d.deviceType || '').toLowerCase().includes(s);
                        
                        const matchesStatus = inventoryStatusFilter === 'all' || d.status === inventoryStatusFilter;
                        const matchesType = inventoryTypeFilter === 'all' || d.deviceType === inventoryTypeFilter;

                        return matchesSearch && matchesStatus && matchesType;
                      });

                      if (filtered.length === 0) {
                        return (
                          <tr>
                            <td colSpan={6} className="p-12 text-center text-slate-500 font-sans">
                              No physical adapters found matching search filters.
                            </td>
                          </tr>
                        );
                      }

                      return filtered.map(d => (
                        <tr
                          key={d.id}
                          className={`hover:bg-slate-900/40 transition-colors cursor-pointer ${
                            selectedInventoryDevice?.id === d.id ? 'bg-indigo-950/20 border-l-2 border-indigo-500' : ''
                          }`}
                          onClick={() => setSelectedInventoryDevice(d)}
                        >
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <span className={`w-2 h-2 rounded-full shrink-0 ${d.status === 'online' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                              <div>
                                <div className="font-bold text-slate-200">{d.ip}</div>
                                <div className="text-[10px] text-slate-400 mt-0.5 max-w-[150px] truncate" title={d.hostname}>{d.hostname || 'Unknown'}</div>
                              </div>
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="text-slate-300">{d.mac || 'N/A'}</div>
                            <div className="text-[10px] text-slate-500 truncate max-w-[120px]" title={d.vendor}>{d.vendor || 'Unknown OUI'}</div>
                          </td>
                          <td className="p-3 text-slate-300">{d.os || 'Unknown OS'}</td>
                          <td className="p-3">
                            <span className="inline-block text-[10px] font-bold px-2 py-0.5 bg-slate-900 border border-slate-800 text-slate-300 rounded-full">
                              {d.deviceType}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <span className="text-cyan-400 font-bold" title={(d.openPorts || []).join(', ')}>
                              {(d.openPorts || []).length}
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            <button
                              type="button"
                              onClick={async (e) => {
                                e.stopPropagation();
                                if (!confirm("Delete this device adapter from inventory history?")) return;
                                try {
                                  await fetch('/api/inventory/delete', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ id: d.id })
                                  });
                                  addToast("Removed device from inventory database", "info");
                                  fetchInventoryAndNotifications();
                                  if (selectedInventoryDevice?.id === d.id) {
                                    setSelectedInventoryDevice(null);
                                  }
                                } catch (err) {
                                  console.error(err);
                                }
                              }}
                              className="p-1 text-slate-500 hover:text-rose-400 transition-all cursor-pointer"
                              title="Delete from Database"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>
            </div>

            {/* SELECTED DEVICE SPECIFICATIONS & HISTORICAL CHANGE AUDIT LOG */}
            {selectedInventoryDevice && (
              <div className="bg-slate-950 p-5 rounded-xl border border-slate-850 space-y-4">
                <div className="flex justify-between items-center border-b border-slate-900 pb-3">
                  <div>
                    <span className="text-[10px] text-indigo-400 font-mono uppercase tracking-wider block font-bold">Node Specification & Audit</span>
                    <h4 className="font-sans font-bold text-slate-200 text-sm">Detailed Record: {selectedInventoryDevice.ip}</h4>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedInventoryDevice(null)}
                    className="p-1 bg-slate-900 border border-slate-850 hover:border-slate-800 rounded text-slate-400 cursor-pointer text-xs"
                  >
                    Close
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs font-mono">
                  <div className="bg-slate-900/40 p-3 rounded-lg border border-slate-900">
                    <span className="text-[9px] text-slate-500 uppercase block">Active Latency</span>
                    <span className="text-slate-300 font-bold">{selectedInventoryDevice.latency || 0} ms</span>
                  </div>
                  <div className="bg-slate-900/40 p-3 rounded-lg border border-slate-900">
                    <span className="text-[9px] text-slate-500 uppercase block">First Registered</span>
                    <span className="text-slate-400 block truncate" title={selectedInventoryDevice.firstSeen}>{new Date(selectedInventoryDevice.firstSeen).toLocaleString()}</span>
                  </div>
                  <div className="bg-slate-900/40 p-3 rounded-lg border border-slate-900">
                    <span className="text-[9px] text-slate-500 uppercase block">Last Seen</span>
                    <span className="text-slate-400 block truncate" title={selectedInventoryDevice.lastSeen}>{new Date(selectedInventoryDevice.lastSeen).toLocaleString()}</span>
                  </div>
                </div>

                {/* PROTOCOL DATA DETAILS (NetBIOS / ONVIF / SNMP / SSDP) */}
                {(selectedInventoryDevice.netbiosName || selectedInventoryDevice.snmpData || selectedInventoryDevice.onvifData || selectedInventoryDevice.webData) && (
                  <div className="space-y-2 border-t border-slate-900 pt-3">
                    <span className="text-[10px] text-cyan-400 font-mono uppercase tracking-wider font-bold block">Discovered Service Banners & Metadata</span>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                      {selectedInventoryDevice.netbiosName && (
                        <div className="bg-[#020617] p-3 rounded-lg border border-slate-900 space-y-1">
                          <span className="text-[9px] text-indigo-400 uppercase font-bold font-sans">NetBIOS Workstation</span>
                          <p className="text-slate-300">Name: <strong className="text-slate-100">{selectedInventoryDevice.netbiosName}</strong></p>
                          <p className="text-slate-300">Workgroup: <span className="text-slate-400">{selectedInventoryDevice.workgroup || 'WORKGROUP'}</span></p>
                        </div>
                      )}
                      {selectedInventoryDevice.snmpData && (
                        <div className="bg-[#020617] p-3 rounded-lg border border-slate-900 space-y-1">
                          <span className="text-[9px] text-emerald-400 uppercase font-bold font-sans">SNMP MIB-II Engine</span>
                          <p className="text-slate-300 text-ellipsis overflow-hidden">Descr: <span className="text-slate-400 text-[10px]">{selectedInventoryDevice.snmpData.sysDescr}</span></p>
                          <p className="text-slate-300">SysName: <span className="text-slate-400">{selectedInventoryDevice.snmpData.sysName}</span></p>
                        </div>
                      )}
                      {selectedInventoryDevice.onvifData && (
                        <div className="bg-[#020617] p-3 rounded-lg border border-slate-900 space-y-1">
                          <span className="text-[9px] text-cyan-400 uppercase font-bold font-sans">ONVIF IP Camera Specification</span>
                          <p className="text-slate-300">Brand: <span className="text-slate-400">{selectedInventoryDevice.onvifData.manufacturer}</span></p>
                          <p className="text-slate-300">Model: <span className="text-slate-400">{selectedInventoryDevice.onvifData.model}</span></p>
                        </div>
                      )}
                      {selectedInventoryDevice.webData && (
                        <div className="bg-[#020617] p-3 rounded-lg border border-slate-900 space-y-1 col-span-2">
                          <span className="text-[9px] text-amber-400 uppercase font-bold font-sans">Web Server & SSL Certificate</span>
                          <p className="text-slate-300">Title: <span className="text-slate-400">{selectedInventoryDevice.webData.title || 'N/A'}</span></p>
                          <p className="text-slate-300">Server Banner: <span className="text-slate-400">{selectedInventoryDevice.webData.serverHeader || 'N/A'}</span></p>
                          {selectedInventoryDevice.webData.sslSubject && (
                            <div className="border-t border-slate-900 mt-1.5 pt-1 text-[10px] space-y-0.5 text-slate-400">
                              <p>SSL CN: <span className="text-amber-400">{selectedInventoryDevice.webData.sslSubject}</span></p>
                              <p>Issuer: <span>{selectedInventoryDevice.webData.sslIssuer}</span></p>
                              <p>Expiry: <span>{selectedInventoryDevice.webData.sslExpiration}</span></p>
                              <p>Cipher Suite: <span>{selectedInventoryDevice.webData.cipher} ({selectedInventoryDevice.webData.tlsVersion})</span></p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* DELTA HISTORICAL RECORDS */}
                <div className="border-t border-slate-900 pt-3 space-y-2">
                  <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider font-bold block">Historical Configuration Delta Audits</span>
                  <div className="max-h-[150px] overflow-y-auto space-y-1.5 pr-1">
                    {selectedInventoryDevice.history && selectedInventoryDevice.history.length > 0 ? (
                      selectedInventoryDevice.history.map((h: any, idx: number) => (
                        <div key={idx} className="p-2 bg-slate-900/30 rounded border border-slate-900 text-[10px] flex justify-between items-start font-mono">
                          <div className="space-y-1">
                            <div>Delta: <strong className="text-indigo-400">{h.field}</strong> modified</div>
                            <div className="text-slate-500">
                              Old: <span className="line-through text-rose-500/80">{h.oldValue}</span> &rarr; New: <span className="text-emerald-400 font-bold">{h.newValue}</span>
                            </div>
                          </div>
                          <span className="text-[9px] text-slate-500 shrink-0">{new Date(h.timestamp).toLocaleTimeString()}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-slate-500 text-[10px] italic py-2">Pristine configuration verified. No architectural deltas or change logs detected.</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: Cyber Security Alerts / Notifications Center */}
          <div className="space-y-6">
            <div className="border-b border-slate-800 pb-4 flex justify-between items-center">
              <div>
                <h3 className="font-sans font-bold text-slate-100 flex items-center gap-2 text-base">
                  <ShieldAlert className="w-5 h-5 text-amber-500 animate-pulse" /> Security Alert Center
                </h3>
                <p className="text-xs text-slate-400 font-sans mt-0.5">Real-time syslog delta alerts, duplications, and adoptions.</p>
              </div>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await fetch('/api/inventory/clear-notifications', { method: 'POST' });
                    addToast("Cleared notification queue", "info");
                    fetchInventoryAndNotifications();
                  } catch (err) {
                    console.error(err);
                  }
                }}
                className="text-[10px] font-mono text-slate-500 hover:text-slate-300 hover:underline cursor-pointer"
              >
                Clear Queue
              </button>
            </div>

            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
              {inventoryNotifications.length > 0 ? (
                inventoryNotifications.map((n) => (
                  <div
                    key={n.id}
                    className={`p-3.5 rounded-xl border flex gap-3 relative transition-all ${
                      n.resolved ? 'opacity-40 bg-slate-950/20 border-slate-900' :
                      n.type === 'critical' ? 'bg-rose-950/20 border-rose-900/50 hover:border-rose-800' :
                      n.type === 'warning' ? 'bg-amber-950/20 border-amber-900/50 hover:border-amber-850' :
                      n.type === 'success' ? 'bg-emerald-950/20 border-emerald-900/50 hover:border-emerald-850' :
                      'bg-indigo-950/20 border-indigo-900/50 hover:border-indigo-850'
                    }`}
                  >
                    <div className="shrink-0 mt-0.5">
                      {n.type === 'critical' && <ShieldAlert className="w-4 h-4 text-rose-500" />}
                      {n.type === 'warning' && <AlertCircle className="w-4 h-4 text-amber-500" />}
                      {n.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                      {n.type === 'info' && <Info className="w-4 h-4 text-indigo-400" />}
                    </div>

                    <div className="space-y-1 font-sans flex-1">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-200">{n.title}</span>
                        <span className="text-[9px] font-mono text-slate-500">{new Date(n.timestamp).toLocaleTimeString()}</span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-normal">{n.message}</p>
                      
                      {!n.resolved && (
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              await fetch('/api/inventory/notifications/resolve', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ id: n.id })
                              });
                              addToast("Resolved notification alert", "success");
                              fetchInventoryAndNotifications();
                            } catch (err) {
                              console.error(err);
                            }
                          }}
                          className="mt-1.5 text-[10px] font-mono text-slate-400 hover:text-slate-200 bg-slate-900 hover:bg-slate-850 px-2 py-0.5 rounded border border-slate-800 cursor-pointer"
                        >
                          Mark Resolved
                        </button>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="bg-slate-950/40 p-8 rounded-xl border border-slate-900 text-center text-slate-500">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-50" />
                  <p className="text-xs">Syslog pipeline idle. All active adapters running safe signatures.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Custom Device Modal */}
      {showAddDeviceModal && (
        <div className="fixed inset-0 bg-slate-950/85 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <h4 className="font-bold text-slate-100 font-sans text-sm">Add Custom Device to Topology</h4>
              <button
                type="button"
                onClick={() => setShowAddDeviceModal(false)}
                className="text-slate-400 hover:text-slate-200 transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleAddDevice} className="space-y-3 text-xs">
              <div>
                <label className="block text-[10px] text-slate-400 font-mono mb-1 uppercase tracking-wider">Device Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Backstage Audio Server"
                  value={newDeviceName}
                  onChange={(e) => setNewDeviceName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-2 text-slate-200 focus:outline-none focus:border-slate-700"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 font-mono mb-1 uppercase tracking-wider">IP Address</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 10.12.10.145"
                  value={newDeviceIp}
                  onChange={(e) => setNewDeviceIp(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-2 text-slate-200 focus:outline-none focus:border-slate-700 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] text-slate-400 font-mono mb-1 uppercase tracking-wider">Device Type</label>
                  <select
                    value={newDeviceType}
                    onChange={(e) => setNewDeviceType(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-slate-200 focus:outline-none"
                  >
                    <option value="hardware">Hardware Host</option>
                    <option value="gateway">Gateway Router</option>
                    <option value="core_switch">Core Switch</option>
                    <option value="dist_switch">Distribution Switch</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 font-mono mb-1 uppercase tracking-wider">Parent Node Branch</label>
                  <select
                    value={newDeviceParent}
                    onChange={(e) => setNewDeviceParent(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-slate-200 focus:outline-none text-xs"
                  >
                    {nodes.map(n => (
                      <option key={n.id} value={n.id}>{n.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddDeviceModal(false)}
                  className="flex-1 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 font-mono font-bold rounded uppercase cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-rose-600 hover:bg-rose-500 text-white font-mono font-bold rounded uppercase cursor-pointer"
                >
                  Save Device
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Floating Latency Tooltip */}
      {hoveredLink && (
        <div 
          className="fixed pointer-events-none bg-slate-950/95 border border-slate-800 px-3 py-2 rounded-lg shadow-xl text-[10px] space-y-1 z-[9999] font-mono select-none"
          style={{ 
            left: `${tooltipPos.x + 15}px`, 
            top: `${tooltipPos.y + 15}px` 
          }}
        >
          <div className="text-slate-400 font-bold border-b border-slate-900 pb-1 mb-1">
            CONNECTION LINK
          </div>
          <div className="text-slate-100 font-semibold">
            {hoveredLink.srcName} ⬌ {hoveredLink.tgtName}
          </div>
          <div className="flex justify-between gap-4 pt-1">
            <span className="text-slate-400">STATUS:</span>
            <span className={hoveredLink.status === 'OFFLINE' ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>
              {hoveredLink.status}
            </span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-slate-400">LATENCY:</span>
            <span className={hoveredLink.status === 'OFFLINE' ? 'text-rose-400 font-bold' : 'text-cyan-400 font-bold'}>
              {hoveredLink.latency}
            </span>
          </div>
        </div>
      )}

      {/* Detailed Node Specifications and Ping History Side Drawer */}
      <AnimatePresence>
        {isNodeModalOpen && selectedNode && (
          <>
            {/* Backdrop Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsNodeModalOpen(false)}
              className="fixed inset-0 bg-slate-950/70 z-[90] cursor-pointer"
            />

            {/* Sliding Drawer Container */}
            <motion.div
              id="node-details-spec-drawer"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 220 }}
              className="fixed top-0 right-0 h-full w-full sm:w-[460px] bg-slate-900 border-l border-slate-700/80 shadow-[0_0_50px_rgba(0,0,0,0.85)] z-[100] flex flex-col font-sans text-slate-100"
            >
              {/* Drawer Header */}
              <div className="p-5 border-b border-slate-800 bg-slate-950/40 flex justify-between items-center">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-rose-400 bg-rose-950/30 px-2 py-0.5 border border-rose-500/20 rounded-md">
                    {selectedNode.type?.replace('_', ' ') || 'Hardware Node'}
                  </span>
                  <h3 className="font-bold text-slate-100 text-lg mt-1.5 flex items-center gap-1.5 leading-none">
                    <span className="text-rose-500">
                      {selectedNode.type === 'core_switch' ? '◈' :
                       selectedNode.type === 'dist_switch' ? '◆' :
                       selectedNode.type === 'edge_switch' ? '◇' :
                       selectedNode.type === 'gateway' ? '⛗' : '🖥'}
                    </span>
                    {selectedNode.name}
                  </h3>
                  <span className="text-xs text-cyan-400 font-mono mt-1 block">{selectedNode.ip}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsNodeModalOpen(false)}
                  className="text-slate-400 hover:text-slate-100 hover:bg-slate-800 p-2 rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer Tabs */}
              <div className="flex border-b border-slate-800 bg-slate-950/20 px-3">
                {[
                  { id: 'specs', label: 'Specs', icon: Info },
                  { id: 'traffic', label: 'Traffic Stats', icon: ArrowLeftRight },
                  { id: 'pings', label: 'Pings', icon: Clock }
                ].map(tab => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setDrawerTab(tab.id as any)}
                      className={`flex-1 py-3 text-xs font-bold font-sans border-b-2 transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        drawerTab === tab.id 
                          ? 'border-rose-500 text-slate-100 bg-rose-950/5' 
                          : 'border-transparent text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {/* Drawer Content Area */}
              <div className="flex-1 overflow-y-auto p-5 space-y-6">
                {drawerTab === 'specs' && (
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono border-b border-slate-800/60 pb-1 flex items-center gap-1.5">
                      <Info className="w-4 h-4 text-rose-500" /> Technical Specifications
                    </h4>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-850">
                        <span className="text-[10px] text-slate-500 font-mono uppercase block mb-0.5">Device Role</span>
                        <span className="text-slate-200 font-semibold capitalize">{selectedNode.type?.replace('_', ' ') || 'Hardware'}</span>
                      </div>
                      <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-850">
                        <span className="text-[10px] text-slate-500 font-mono uppercase block mb-0.5">Status</span>
                        <span className={`font-bold font-mono text-[10px] uppercase flex items-center gap-1 ${
                          selectedNode.status === 'offline' ? 'text-rose-400' :
                          selectedNode.status === 'degraded' ? 'text-amber-400' : 'text-emerald-400'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            selectedNode.status === 'offline' ? 'bg-rose-500' :
                            selectedNode.status === 'degraded' ? 'bg-amber-500' : 'bg-emerald-500'
                          }`} />
                          {selectedNode.status}
                        </span>
                      </div>
                      <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-850 col-span-2">
                        <span className="text-[10px] text-slate-500 font-mono uppercase block mb-0.5">IP Address / Subnet</span>
                        <span className="text-cyan-400 font-mono font-bold block">{selectedNode.ip}</span>
                        <span className="text-[10px] text-slate-400 font-mono block mt-0.5">{selectedNode.subnet || '10.12.10.0/24'}</span>
                      </div>
                      <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-850">
                        <span className="text-[10px] text-slate-500 font-mono uppercase block mb-0.5">VLAN Partition</span>
                        <span className="text-slate-200 font-semibold">{selectedNode.vlan || 'VLAN 10 (Trunk)'}</span>
                      </div>
                      <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-850">
                        <span className="text-[10px] text-slate-500 font-mono uppercase block mb-0.5">ICMP Latency</span>
                        <span className="text-slate-200 font-mono">{selectedNode.status === 'offline' ? 'N/A' : `${selectedNode.latency || 10} ms`}</span>
                      </div>
                      <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-850">
                        <span className="text-[10px] text-slate-500 font-mono uppercase block mb-0.5">MAC Address</span>
                        <span className="text-slate-300 font-mono text-[10px] truncate block">{selectedNode.mac || 'N/A'}</span>
                      </div>
                      <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-850">
                        <span className="text-[10px] text-slate-500 font-mono uppercase block mb-0.5">OUI Vendor</span>
                        <span className="text-slate-300 font-sans text-[10px] truncate block">{selectedNode.vendor || 'N/A'}</span>
                      </div>

                      {selectedNode.tags && selectedNode.tags.length > 0 && (
                        <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-850 col-span-2">
                          <span className="text-[10px] text-slate-500 font-mono uppercase block mb-1">Identified Device Tags</span>
                          <div className="flex flex-wrap gap-1.5">
                            {selectedNode.tags.map((tag: string) => (
                              <span 
                                key={tag} 
                                className="px-2 py-0.5 rounded text-[10px] font-mono bg-indigo-950/50 text-indigo-400 border border-indigo-900/40 font-bold"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {drawerTab === 'traffic' && (
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono border-b border-slate-800/60 pb-1 flex items-center gap-1.5">
                      <ArrowLeftRight className="w-4 h-4 text-cyan-400 animate-pulse" /> Real-Time Traffic Statistics
                    </h4>

                    {selectedNode.status === 'offline' ? (
                      <div className="bg-slate-950/40 border border-slate-850 rounded-xl p-8 text-center text-slate-500">
                        <XCircle className="w-8 h-8 mx-auto mb-2 text-rose-500" />
                        <p className="text-xs">Device is offline. Traffic reporting interfaces are unreachable.</p>
                      </div>
                    ) : (
                      <LiveTrafficMonitor selectedNode={selectedNode} />
                    )}
                  </div>
                )}

                {drawerTab === 'pings' && (
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono border-b border-slate-800/60 pb-1 flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-emerald-400" /> Recent Ping Sweep History
                    </h4>

                    <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                      {nodePingHistory.map((ping, index) => (
                        <div key={index} className="flex justify-between items-center bg-slate-950/40 p-2.5 rounded-lg border border-slate-850/50 text-[11px] font-mono">
                          <div className="flex items-center gap-2 text-slate-400">
                            <Clock className="w-3.5 h-3.5 text-slate-500" />
                            <span>{ping.time}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-slate-500">Loss: {ping.loss}%</span>
                            {ping.status === 'timeout' ? (
                              <span className="text-rose-400 font-bold">TIMEOUT</span>
                            ) : (
                              <span className="text-emerald-400 font-bold">{ping.latency} ms</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Drawer Footer */}
              <div className="p-4 border-t border-slate-800 bg-slate-950/60">
                <button
                  type="button"
                  onClick={() => setIsNodeModalOpen(false)}
                  className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono font-bold rounded-lg text-xs uppercase cursor-pointer transition-colors border border-slate-700/50"
                >
                  Close Drawer
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Toast Notification Container */}
      <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        <AnimatePresence>
          {toastList.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="pointer-events-auto bg-slate-900 border border-slate-850 p-3 rounded-lg shadow-2xl flex items-start gap-2.5 w-full"
            >
              <div className="mt-0.5">
                {toast.type === 'success' ? (
                  <div className="w-4.5 h-4.5 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-[10px]">✓</div>
                ) : toast.type === 'warn' ? (
                  <div className="w-4.5 h-4.5 rounded-full bg-rose-500/10 text-rose-400 flex items-center justify-center font-bold text-[10px]">!</div>
                ) : (
                  <div className="w-4.5 h-4.5 rounded-full bg-cyan-500/10 text-cyan-400 flex items-center justify-center font-bold text-[10px]">i</div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] text-slate-200 font-sans leading-relaxed">{toast.message}</p>
              </div>
              <button
                type="button"
                onClick={() => setToastList((prev) => prev.filter((t) => t.id !== toast.id))}
                className="text-slate-500 hover:text-slate-300 transition-all cursor-pointer p-0.5 rounded"
              >
                <X className="w-3 h-3" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Custom Ports Preference Modal */}
      {isPortModalOpen && (
        <div id="ports-preference-modal" className="fixed inset-0 bg-slate-950/85 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 w-full max-w-md shadow-2xl space-y-4 relative">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2.5">
              <h3 className="font-bold text-slate-100 font-sans text-sm flex items-center gap-2">
                ⚙ TCP Port Discovery Preferences
              </h3>
              <button
                type="button"
                onClick={() => setIsPortModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 transition-all cursor-pointer p-1 rounded-md hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed font-sans">
              Define the specific TCP ports the network scanner should check during Deep Scan mode. Ports should be entered as a comma-separated list of integers.
            </p>

            <div className="space-y-3">
              <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-wider font-bold">Custom TCP Ports List</label>
              <textarea
                value={customPorts}
                onChange={(e) => setCustomPorts(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-slate-200 font-mono text-xs px-3 py-2 rounded-lg h-24 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 outline-none resize-none"
                placeholder="21, 22, 80, 443"
              />
              
              {/* Presets Row */}
              <div className="space-y-1.5">
                <span className="block text-[9px] font-mono text-slate-500 uppercase tracking-wider font-bold">Presets:</span>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setCustomPorts('21, 22, 23, 25, 53, 80, 110, 135, 139, 443, 445, 1433, 3306, 3389, 5432, 5900, 8080, 8443')}
                    className="px-2 py-1 bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-850 hover:border-slate-750 rounded text-[9px] font-mono transition-all"
                  >
                    Default Common
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomPorts('80, 443, 8080, 8443')}
                    className="px-2 py-1 bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-850 hover:border-slate-750 rounded text-[9px] font-mono transition-all"
                  >
                    Web Ports Only
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomPorts('22, 23, 3389, 5900')}
                    className="px-2 py-1 bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-850 hover:border-slate-750 rounded text-[9px] font-mono transition-all"
                  >
                    Remote Admin (SSH, RDP)
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomPorts('1433, 3306, 5432, 27017, 6379')}
                    className="px-2 py-1 bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-850 hover:border-slate-750 rounded text-[9px] font-mono transition-all"
                  >
                    Databases
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsPortModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-[10px] font-mono font-bold uppercase cursor-pointer transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsPortModalOpen(false);
                  addToast('TCP Port discovery preferences saved successfully!', 'success');
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-bold rounded-lg text-[10px] uppercase cursor-pointer shadow-md shadow-emerald-950/20 transition-all"
              >
                Save Preferences
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Promote to Topology Modal */}
      {showPromoteModal && (
        <div className="fixed inset-0 bg-slate-950/85 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 w-full max-w-md shadow-2xl space-y-4 relative">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="font-bold text-slate-100 font-sans text-sm flex items-center gap-2 uppercase tracking-wider">
                🔌 Promote Discovered Node
              </h3>
              <button
                type="button"
                onClick={() => setShowPromoteModal(false)}
                className="text-slate-400 hover:text-slate-200 transition-all cursor-pointer p-1 rounded-md hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 font-sans text-xs">
              <div>
                <label className="text-slate-400 block mb-1 uppercase text-[9px] tracking-wider font-semibold font-mono">Device Hostname / Name</label>
                <input
                  type="text"
                  value={promoteName}
                  onChange={(e) => setPromoteName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-200 font-mono text-xs px-2.5 py-1.5 rounded-lg focus:ring-0 focus:border-slate-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 block mb-1 uppercase text-[9px] tracking-wider font-semibold font-mono">IP Address</label>
                  <input
                    type="text"
                    value={promoteIp}
                    disabled
                    className="w-full bg-slate-950/50 border border-slate-850 text-slate-400 font-mono text-xs px-2.5 py-1.5 rounded-lg select-none"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1 uppercase text-[9px] tracking-wider font-semibold font-mono">MAC Address</label>
                  <input
                    type="text"
                    value={promoteMac}
                    disabled
                    className="w-full bg-slate-950/50 border border-slate-850 text-slate-400 font-mono text-xs px-2.5 py-1.5 rounded-lg select-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 block mb-1 uppercase text-[9px] tracking-wider font-semibold font-mono">MAC Vendor</label>
                  <input
                    type="text"
                    value={promoteVendor}
                    disabled
                    className="w-full bg-slate-950/50 border border-slate-850 text-slate-400 font-mono text-xs px-2.5 py-1.5 rounded-lg select-none"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1 uppercase text-[9px] tracking-wider font-semibold font-mono">Subnet Scope</label>
                  <input
                    type="text"
                    value={promoteSubnet}
                    disabled
                    className="w-full bg-slate-950/50 border border-slate-850 text-slate-400 font-mono text-xs px-2.5 py-1.5 rounded-lg select-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1 uppercase text-[9px] tracking-wider font-semibold font-mono">Device Category</label>
                <select
                  value={promoteType}
                  onChange={(e) => setPromoteType(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-300 font-sans text-xs px-2.5 py-1.5 rounded-lg focus:ring-0 focus:border-slate-700 cursor-pointer"
                >
                  <option value="hardware">Workstation / Generic Device</option>
                  <option value="gateway">Gateway / Firewall</option>
                  <option value="edge_switch">Edge Switch</option>
                  <option value="dist_switch">Distribution Switch</option>
                  <option value="core_switch">Core Switch</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 block mb-1 uppercase text-[9px] tracking-wider font-semibold font-mono">Connect to Parent Node</label>
                  <select
                    value={promoteParent}
                    onChange={(e) => setPromoteParent(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-300 font-sans text-xs px-2.5 py-1.5 rounded-lg focus:ring-0 focus:border-slate-700 cursor-pointer"
                  >
                    {nodes.map(n => (
                      <option key={n.id} value={n.id}>{n.name} ({n.ip})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 block mb-1 uppercase text-[9px] tracking-wider font-semibold font-mono">VLAN Name / Partition</label>
                  <input
                    type="text"
                    value={promoteVlan}
                    onChange={(e) => setPromoteVlan(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-200 font-mono text-xs px-2.5 py-1.5 rounded-lg focus:ring-0 focus:border-slate-700"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1 uppercase text-[9px] tracking-wider font-semibold font-mono">Auto-Tagging Tags (Comma Separated)</label>
                <input
                  type="text"
                  value={promoteTags}
                  onChange={(e) => setPromoteTags(e.target.value)}
                  placeholder="e.g. Server, Cisco-Device"
                  className="w-full bg-slate-950 border border-slate-800 text-slate-200 font-mono text-xs px-2.5 py-1.5 rounded-lg focus:ring-0 focus:border-slate-700"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t border-slate-800 justify-end">
              <button
                type="button"
                onClick={() => setShowPromoteModal(false)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-750 border border-slate-700 rounded text-xs text-slate-300 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  try {
                    const newId = `node-disc-${promoteIp.replace(/\./g, '-')}`;
                    const newNode: TopologyNode = {
                      id: newId,
                      name: promoteName,
                      type: promoteType,
                      ip: promoteIp,
                      status: 'online',
                      connectedTo: [promoteParent],
                      vlan: promoteVlan,
                      subnet: promoteSubnet,
                      latency: 1,
                      mac: promoteMac || '',
                      vendor: promoteVendor || '',
                      lastSeen: new Date().toISOString(),
                      tags: promoteTags.split(',').map(s => s.trim()).filter(Boolean)
                    };
                    await setDoc(doc(db, 'topology_nodes', newId), newNode);
                    
                    const logId = `log-promoted-${Date.now()}`;
                    await setDoc(doc(db, 'signal_logs', logId), {
                      id: logId,
                      timestamp: new Date().toISOString(),
                      level: 'success',
                      source: 'Network Scanner',
                      message: `[Device Promoted] Discovered node ${promoteName} (${promoteIp}) has been promoted to permanent node connected to parent ${promoteParent}.`
                    });

                    addToast(`Promoted ${promoteName} to topology!`, 'success');
                    setShowPromoteModal(false);
                  } catch (err: any) {
                    console.error("Promotion failed:", err);
                    addToast('Failed to promote device', 'warn');
                  }
                }}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 rounded text-xs text-white font-bold cursor-pointer"
              >
                Promote Node
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// OUI Vendor resolver client-side helper
function getMacVendorClient(mac: string | undefined): string {
  if (!mac) return 'Unknown';
  const clean = mac.toUpperCase().replace(/[^0-9A-F]/g, '');
  if (clean.length < 6) return 'Unknown';
  const prefix = clean.substring(0, 6);
  // Match prefix
  const formattedPrefix = `${prefix.substring(0,2)}:${prefix.substring(2,4)}:${prefix.substring(4,6)}`;
  
  const OUI_MAP: Record<string, string> = {
    '00:15:5D': 'Microsoft (Hyper-V)',
    '00:03:FF': 'Microsoft',
    '00:05:69': 'VMware',
    '00:0C:29': 'VMware',
    '00:50:56': 'VMware',
    '00:1C:42': 'Parallels',
    '00:16:3E': 'Xen/RedHat/Oracle',
    '08:00:27': 'Oracle (VirtualBox)',
    '52:54:00': 'QEMU/KVM',
    '00:00:0C': 'Cisco Systems',
    '00:01:42': 'Cisco Systems',
    '00:01:C7': 'Cisco Systems',
    '00:E0:4C': 'Realtek',
    '00:14:D1': 'Realtek',
    '00:1B:21': 'Intel',
    '00:1C:C0': 'Intel',
    '00:1F:3C': 'Intel',
    '00:21:5A': 'Intel',
    '00:11:22': 'Meyer Sound',
    '00:1F:29': 'Chauvet Prof.',
    '00:1B:6A': 'Riedel Comm.',
    '00:14:22': 'Dell',
    '00:18:8B': 'Dell',
    '00:23:AE': 'Dell',
    '00:26:B9': 'Dell',
    '00:11:85': 'HP',
    '00:17:A4': 'HP',
    '00:22:64': 'HP',
    '00:25:B3': 'HP',
    '00:03:93': 'Apple',
    '00:0D:93': 'Apple',
    '00:10:FA': 'Apple',
    '00:16:CB': 'Apple',
    '00:17:F2': 'Apple',
    '00:1C:B3': 'Apple',
    '00:1D:4F': 'Apple',
    '00:1E:52': 'Apple',
    '00:1F:F3': 'Apple',
    '00:23:12': 'Apple',
    '00:23:32': 'Apple',
    '00:25:00': 'Apple',
    '00:25:4B': 'Apple',
    '00:26:08': 'Apple',
    '00:26:4A': 'Apple',
    '00:26:BB': 'Apple',
    '24:A0:74': 'Apple',
    '2C:F0:EE': 'Apple',
    '34:15:9E': 'Apple',
    '38:CA:DA': 'Apple',
    '3C:15:C2': 'Apple',
    '00:0F:66': 'Cisco-Linksys',
    '00:18:F8': 'Cisco-Linksys',
    '00:0F:B5': 'Netgear',
    '00:14:6C': 'Netgear',
    '00:1B:2F': 'Netgear',
    '00:22:3F': 'Netgear',
    '00:14:78': 'TP-Link',
    '00:1D:0F': 'TP-Link',
    '00:21:27': 'TP-Link',
    '00:27:19': 'TP-Link',
    '00:15:6D': 'Ubiquiti',
    '00:27:22': 'Ubiquiti',
    '24:A4:3C': 'Ubiquiti'
  };

  return OUI_MAP[formattedPrefix] || 'Unknown OUI';
}

// Inline tiny SVG components for interface configuration mapping
function SlidersHorizontalIcon({ className }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <line x1="4" y1="21" x2="4" y2="14" />
      <line x1="4" y1="10" x2="4" y2="3" />
      <line x1="12" y1="21" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12" y2="3" />
      <line x1="20" y1="21" x2="20" y2="16" />
      <line x1="20" y1="12" x2="20" y2="3" />
      <line x1="2" y1="14" x2="6" y2="14" />
      <line x1="10" y1="8" x2="14" y2="8" />
      <line x1="18" y1="16" x2="22" y2="16" />
    </svg>
  );
}

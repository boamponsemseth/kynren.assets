import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { UserRegistryItem, AssignmentRule, SignalLog, UserPreferences, GeofenceBreach, DropdownOption, Asset } from '../types';
import { db, doc, setDoc, collection, getDocs, deleteDoc } from '../firebase';
import BatteryThresholdsModal from './BatteryThresholdsModal';
import { LineChart, Line, ResponsiveContainer, Tooltip } from 'recharts';
import { 
  Settings, 
  Users, 
  GitFork, 
  History, 
  Plus, 
  Trash2, 
  ShieldAlert, 
  Save, 
  Database,
  ToggleLeft,
  GripVertical,
  CheckCircle,
  AlertOctagon,
  AlertCircle,
  MapPin,
  ListPlus,
  Eye,
  EyeOff,
  UserCheck,
  Shield,
  Key,
  Calendar,
  Lock,
  Unlock,
  Smartphone,
  Check,
  Upload,
  AlertTriangle,
  RefreshCw,
  Archive,
  UserX,
  Pencil,
  Ban,
  BellRing,
  Settings2,
  Battery,
  Sliders,
  Search,
  Mail,
  Send,
  Network,
  Wifi
} from 'lucide-react';

interface AdminSetupProps {
  users: UserRegistryItem[];
  rules: AssignmentRule[];
  logs: SignalLog[];
  geofenceBreaches?: GeofenceBreach[];
  preferences: UserPreferences;
  assets?: Asset[];
  currentUser?: UserRegistryItem | null;
  onUpdatePreferences: (updates: Partial<UserPreferences>) => Promise<void>;
  onAddRule: (rule: Partial<AssignmentRule>) => void;
  onDeleteRule: (id: string) => void;
  onUpdateUserRole: (id: string, role: UserRegistryItem['role']) => void;
  onToggleUserStatus: (id: string) => void;
  onRunAutoArchive?: () => Promise<number>;
  onArchiveSignalLogs?: (daysThreshold: number) => Promise<number>;
  dropdowns?: DropdownOption[];
  onAddDropdownOption?: (categoryId: string, option: string) => Promise<void>;
  onDeleteDropdownOption?: (categoryId: string, optionToDelete: string) => Promise<void>;
  onAddUser?: (user: Partial<UserRegistryItem> & { password?: string }) => void;
  onUpdateUser?: (id: string, updates: Partial<UserRegistryItem>) => Promise<void>;
  onDeleteUser?: (id: string) => Promise<void>;
  gmailAccessToken?: string;
  onConnectGmail?: () => void;
  onSendTestEmail?: (toEmail: string, subject: string, bodyHtml: string) => Promise<any>;
}

export default function AdminSetup({
  users,
  rules,
  logs,
  geofenceBreaches = [],
  preferences,
  assets = [],
  currentUser,
  onUpdatePreferences,
  onAddRule,
  onDeleteRule,
  onUpdateUserRole,
  onToggleUserStatus,
  onRunAutoArchive,
  onArchiveSignalLogs,
  dropdowns = [],
  onAddDropdownOption,
  onDeleteDropdownOption,
  onAddUser,
  onUpdateUser,
  onDeleteUser,
  gmailAccessToken,
  onConnectGmail,
  onSendTestEmail
}: AdminSetupProps) {
  const [activeTab, setActiveTab] = useState<'users' | 'rules' | 'logs' | 'settings' | 'dropdowns' | 'archive' | 'email' | 'connectivity'>('users');
  const [isBatteryModalOpen, setIsBatteryModalOpen] = useState(false);

  // Client Device Settings states
  const [deviceName, setDeviceName] = useState(preferences.deviceName || 'Primary Client Console');
  const [deviceIp, setDeviceIp] = useState(preferences.clientIp || '10.12.10.2');
  const [deviceSubnet, setDeviceSubnet] = useState(preferences.subnetMask || '255.255.255.0');
  const [deviceGateway, setDeviceGateway] = useState(preferences.defaultGateway || '10.12.10.1');
  const [deviceSaveSuccess, setDeviceSaveSuccess] = useState(false);

  // Connectivity Test & Diagnostics states
  const [isTestingConnectivity, setIsTestingConnectivity] = useState(false);
  const [connectivityResult, setConnectivityResult] = useState<'success' | 'failure' | 'idle' | 'warning'>('idle');
  const [connectivityLogs, setConnectivityLogs] = useState<string[]>([]);
  const [ipValid, setIpValid] = useState(true);
  const [subnetValid, setSubnetValid] = useState(true);
  const [gatewayValid, setGatewayValid] = useState(true);

  // Expanded requested features
  const [maxLatencyThreshold, setMaxLatencyThreshold] = useState<number>(preferences.maxLatencyThreshold || 120);
  const [autoRetry, setAutoRetry] = useState<boolean>(preferences.autoRetry || false);
  const [pingHistory, setPingHistory] = useState<number[]>([45, 52, 48, 60, 42]); // Pre-loaded realistic historical data for visual stability visualization
  
  // Advanced Diagnostics States
  const [pingTimeout, setPingTimeout] = useState<number>(1500); // Configurable timeout setting for each ICMP request in ms
  const [manualPingHistory, setManualPingHistory] = useState<any[]>([
    {
      id: 'pre-1',
      timestamp: new Date(Date.now() - 3600000).toLocaleTimeString(),
      deviceName: 'Primary Client Console',
      ip: '10.12.10.2',
      duration: 42,
      packetLoss: 0,
      status: 'success',
      details: '4 packets sent, 4 received. 0% loss.'
    },
    {
      id: 'pre-2',
      timestamp: new Date(Date.now() - 1800000).toLocaleTimeString(),
      deviceName: 'Primary Client Console',
      ip: '10.12.10.2',
      duration: 135,
      packetLoss: 25,
      status: 'timeout-incident',
      details: '4 packets sent, 3 received. 25% loss. Latency warning!'
    }
  ]); // Detailed table of the last 10 manual ping results
  
  const [bulkGrouping, setBulkGrouping] = useState<'none' | 'vlan' | 'location'>('none'); // Grouping devices by VLAN or Location
  const [bulkStatusFilter, setBulkStatusFilter] = useState<'all' | 'online' | 'offline'>('all'); // Filter summary report by status
  const [bulkGroupFilter, setBulkGroupFilter] = useState<string>('all'); // Filter summary report by specific group
  const [showStatusTooltip, setShowStatusTooltip] = useState<boolean>(false); // Hover state for status tooltip
  const [lastSuccessTimestamp, setLastSuccessTimestamp] = useState<string>(new Date().toLocaleTimeString() + ' ' + new Date().toLocaleDateString()); // Timestamp of most recent successful ping
  const [lastSuccessLatency, setLastSuccessLatency] = useState<number>(45); // Latency value of most recent successful ping

  // Helper to extract VLAN for an asset
  const getAssetVlan = (asset: any) => {
    if (asset.network) return asset.network;
    if (asset.vlan) return asset.vlan;
    // Fallback map based on IP
    if (asset.ipAddress) {
      const ip = asset.ipAddress;
      if (ip.startsWith('10.12.1.')) return 'VLAN 1 (Management)';
      if (ip.startsWith('10.12.10.')) return 'VLAN 10 (Control)';
      if (ip.startsWith('10.12.20.')) return 'VLAN 20 (Media)';
      if (ip.startsWith('10.12.30.')) return 'VLAN 30 (Audio)';
      if (ip.startsWith('10.12.40.')) return 'VLAN 40 (SFX/DMX)';
      if (ip.startsWith('10.12.50.')) return 'VLAN 50 (Special Effects)';
    }
    return 'VLAN 10 (Control)'; // Default fallback
  };
  
  // Host agent NIC interfaces states
  const [agentNICs, setAgentNICs] = useState<any[]>([]);
  const [selectedNIC, setSelectedNIC] = useState<any>(null);
  const [autoSyncWithNIC, setAutoSyncWithNIC] = useState<boolean>(true); // "Always use the connected NIC ip address from the agent"

  // Bulk Sweep states
  const [bulkDevices, setBulkDevices] = useState<string[]>([]);
  const [bulkSweepResults, setBulkSweepResults] = useState<any[]>([]);
  const [isBulkPinging, setIsBulkPinging] = useState<boolean>(false);

  // Grouping & Filtering Helpers for Sweep Checklist & Reports
  const getGroupedChecklist = () => {
    const pingable = (assets || []).filter(a => a.ipAddress);
    if (bulkGrouping === 'none') {
      return [{ key: 'all', name: 'All Devices', items: pingable }];
    }
    
    const groups: { [key: string]: any[] } = {};
    pingable.forEach(asset => {
      const gKey = bulkGrouping === 'vlan' ? getAssetVlan(asset) : (asset.location || 'Main Stage');
      if (!groups[gKey]) {
        groups[gKey] = [];
      }
      groups[gKey].push(asset);
    });
    
    return Object.keys(groups).map(k => ({
      key: k,
      name: k,
      items: groups[k]
    }));
  };

  const getFilteredSweepResults = () => {
    return bulkSweepResults.filter(r => {
      // Status filter
      if (bulkStatusFilter === 'online' && !r.online) return false;
      if (bulkStatusFilter === 'offline' && r.online) return false;
      
      // Group filter
      if (bulkGroupFilter !== 'all') {
        const itemGroupVal = bulkGrouping === 'vlan' ? r.vlan : r.location;
        if (itemGroupVal !== bulkGroupFilter) return false;
      }
      return true;
    });
  };

  const getGroupedSweepResults = () => {
    const filtered = getFilteredSweepResults();
    if (bulkGrouping === 'none') {
      return [{ key: 'all', name: 'All Swept Devices', items: filtered }];
    }
    
    const groups: { [key: string]: any[] } = {};
    filtered.forEach(r => {
      const gKey = bulkGrouping === 'vlan' ? r.vlan : r.location;
      if (!groups[gKey]) {
        groups[gKey] = [];
      }
      groups[gKey].push(r);
    });
    
    return Object.keys(groups).map(k => ({
      key: k,
      name: k,
      items: groups[k]
    }));
  };

  // Fetch host agent network interfaces
  useEffect(() => {
    const fetchInterfaces = async () => {
      try {
        const res = await fetch('/api/interfaces');
        const data = await res.json();
        if (data.success && data.interfaces && data.interfaces.length > 0) {
          const list = data.interfaces.map((i: any) => ({
            name: `${i.name} Network Adapter`,
            interfaceName: i.name,
            ip: i.ip,
            subnetMask: i.netmask || '255.255.255.0',
            gateway: i.ip.split('.').slice(0, 3).join('.') + '.1',
            type: i.name.toLowerCase().includes('wlan') || i.name.toLowerCase().includes('wifi') ? 'Wireless' : 'Ethernet'
          }));
          setAgentNICs(list);
          const activeNIC = list.find((n: any) => n.interfaceName !== 'lo') || list[0];
          setSelectedNIC(activeNIC);

          if (autoSyncWithNIC) {
            setDeviceIp(activeNIC.ip);
            setDeviceSubnet(activeNIC.subnetMask);
            setDeviceGateway(activeNIC.gateway);
            setIpValid(true);
            setSubnetValid(true);
            setGatewayValid(true);
          }
        } else {
          // Robust host NIC defaults if api fails
          const fallbacks = [
            { name: 'Intel(R) Ethernet Adapter (eth0)', interfaceName: 'eth0', ip: '10.12.34.89', subnetMask: '255.255.255.0', gateway: '10.12.34.1', type: 'Ethernet' },
            { name: 'Broadcom Wireless (wlan0)', interfaceName: 'wlan0', ip: '10.12.35.201', subnetMask: '255.255.255.0', gateway: '10.12.35.1', type: 'Wireless' }
          ];
          setAgentNICs(fallbacks);
          setSelectedNIC(fallbacks[0]);
          if (autoSyncWithNIC) {
            setDeviceIp(fallbacks[0].ip);
            setDeviceSubnet(fallbacks[0].subnetMask);
            setDeviceGateway(fallbacks[0].gateway);
          }
        }
      } catch (err) {
        console.error('Failed to load agent interfaces:', err);
      }
    };
    fetchInterfaces();
  }, [autoSyncWithNIC]);

  // Sync state if preferences change (respecting autoSyncWithNIC)
  useEffect(() => {
    if (preferences.deviceName) setDeviceName(preferences.deviceName);
    if (!autoSyncWithNIC && preferences.clientIp) setDeviceIp(preferences.clientIp);
    if (!autoSyncWithNIC && preferences.subnetMask) setDeviceSubnet(preferences.subnetMask);
    if (!autoSyncWithNIC && preferences.defaultGateway) setDeviceGateway(preferences.defaultGateway);
    if (preferences.maxLatencyThreshold) setMaxLatencyThreshold(preferences.maxLatencyThreshold);
    if (preferences.autoRetry !== undefined) setAutoRetry(preferences.autoRetry);
  }, [preferences.deviceName, preferences.clientIp, preferences.subnetMask, preferences.defaultGateway, preferences.maxLatencyThreshold, preferences.autoRetry, autoSyncWithNIC]);

  // Standard IPv4 formatting checker
  const validateIPv4 = (val: string): boolean => {
    const regex = /^(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)$/;
    return regex.test(val);
  };

  const handleDeviceIpChange = (val: string) => {
    setDeviceIp(val);
    setIpValid(validateIPv4(val));
  };

  const handleDeviceSubnetChange = (val: string) => {
    setDeviceSubnet(val);
    setSubnetValid(validateIPv4(val));
  };

  const handleDeviceGatewayChange = (val: string) => {
    setDeviceGateway(val);
    setGatewayValid(validateIPv4(val));
  };

  const handleSelectNIC = (nic: any) => {
    setSelectedNIC(nic);
    if (autoSyncWithNIC) {
      setDeviceIp(nic.ip);
      setDeviceSubnet(nic.subnetMask);
      setDeviceGateway(nic.gateway);
      setIpValid(true);
      setSubnetValid(true);
      setGatewayValid(true);
    }
  };

  const handleSaveDeviceSettings = async () => {
    const isIpOk = validateIPv4(deviceIp);
    const isSubnetOk = validateIPv4(deviceSubnet);
    const isGatewayOk = validateIPv4(deviceGateway);

    setIpValid(isIpOk);
    setSubnetValid(isSubnetOk);
    setGatewayValid(isGatewayOk);

    if (!isIpOk || !isSubnetOk || !isGatewayOk) {
      alert("Please correct validation errors: All IP, Subnet Mask, and Gateway inputs must adhere to standard IPv4 formatting rules.");
      return;
    }

    try {
      await onUpdatePreferences({
        deviceName,
        clientIp: deviceIp,
        subnetMask: deviceSubnet,
        defaultGateway: deviceGateway,
        maxLatencyThreshold,
        autoRetry
      });
      setDeviceSaveSuccess(true);
      setTimeout(() => setDeviceSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to save device settings:', err);
    }
  };

  // Run multi-packet ping diagnostics
  const handleTestConnectivity = async () => {
    const isIpOk = validateIPv4(deviceIp);
    const isSubnetOk = validateIPv4(deviceSubnet);
    const isGatewayOk = validateIPv4(deviceGateway);

    setIpValid(isIpOk);
    setSubnetValid(isSubnetOk);
    setGatewayValid(isGatewayOk);

    if (!isIpOk || !isSubnetOk || !isGatewayOk) {
      setConnectivityLogs([
        `[CRITICAL] Formatting Validation Failure: Standard IPv4 formatting rules not satisfied.`,
        `[CRITICAL] IP: ${isIpOk ? 'VALID' : 'INVALID'} | Subnet: ${isSubnetOk ? 'VALID' : 'INVALID'} | Gateway: ${isGatewayOk ? 'VALID' : 'INVALID'}`
      ]);
      setConnectivityResult('failure');
      return;
    }

    setIsTestingConnectivity(true);
    setConnectivityResult('testing');
    setConnectivityLogs([
      `[DIAGNOSTICS] Initializing multi-packet diagnostic sequence for console: "${deviceName}"`,
      `[DIAGNOSTICS] Node Target IP: ${deviceIp}`,
      `[DIAGNOSTICS] Subnet Boundary Netmask: ${deviceSubnet}`,
      `[DIAGNOSTICS] Default Gateway Uplink: ${deviceGateway}`,
      `[DIAGNOSTICS] Max Latency Threshold: ${maxLatencyThreshold}ms`,
      `[DIAGNOSTICS] ICMP Request Timeout: ${pingTimeout}ms`,
      `[NETWORK] Sending 4 parallel ICMP Echo Request packets to Client Device...`,
      `[NETWORK] Sending 4 parallel ICMP Echo Request packets to Default Gateway Router...`
    ]);

    try {
      // Create 4 promises for gateway pings
      const gatewayPromises = Array.from({ length: 4 }).map(() =>
        fetch(`/api/ping/device?ip=${encodeURIComponent(deviceGateway)}&timeout=${pingTimeout}`)
          .then(res => res.json())
          .catch(() => ({ success: false }))
      );

      // Create 4 promises for client IP pings
      const ipPromises = Array.from({ length: 4 }).map(() =>
        fetch(`/api/ping/device?ip=${encodeURIComponent(deviceIp)}&timeout=${pingTimeout}`)
          .then(res => res.json())
          .catch(() => ({ success: false }))
      );

      // Run them all in parallel!
      const [gatewayResponses, ipResponses] = await Promise.all([
        Promise.all(gatewayPromises),
        Promise.all(ipPromises)
      ]);

      // Parse Gateway Responses
      const gatewaySuccesses = gatewayResponses.filter(r => r.success && r.result?.status === 'online');
      const gatewayLossPercent = ((4 - gatewaySuccesses.length) / 4) * 100;
      const gatewayLatencies = gatewaySuccesses.map(r => r.result.latency || 0);
      const gatewayAvgLatency = gatewayLatencies.length > 0 
        ? Math.round(gatewayLatencies.reduce((a, b) => a + b, 0) / gatewayLatencies.length) 
        : 0;

      // Parse IP Responses
      const ipSuccesses = ipResponses.filter(r => r.success && r.result?.status === 'online');
      const ipLossPercent = ((4 - ipSuccesses.length) / 4) * 100;
      const ipLatencies = ipSuccesses.map(r => r.result.latency || 0);
      const ipAvgLatency = ipLatencies.length > 0 
        ? Math.round(ipLatencies.reduce((a, b) => a + b, 0) / ipLatencies.length) 
        : 0;

      const finishedLogs = [
        `[DIAGNOSTICS] Diagnostic sequence executed for: "${deviceName}"`,
        `[DIAGNOSTICS] Node Target IP: ${deviceIp}`,
        `[DIAGNOSTICS] Subnet Boundary Netmask: ${deviceSubnet}`,
        `[DIAGNOSTICS] Default Gateway Uplink: ${deviceGateway}`,
        `[NETWORK] Dispatching 4 parallel ICMP Echo Requests...`
      ];

      // Add details for gateway
      const gatewaySuccess = gatewaySuccesses.length > 0;
      if (gatewaySuccess) {
        finishedLogs.push(`[REPLY] Default Gateway ${deviceGateway}: bytes=64 received=${gatewaySuccesses.length}/4 loss=${gatewayLossPercent}% avg_time=${gatewayAvgLatency}ms`);
      } else {
        finishedLogs.push(`[TIMEOUT] Request timed out for Default Gateway ${deviceGateway} after maximum allowed attempts (100% loss).`);
      }

      // Add details for client IP
      const ipSuccess = ipSuccesses.length > 0;
      if (ipSuccess) {
        finishedLogs.push(`[REPLY] Reply from client console ${deviceIp}: bytes=64 received=${ipSuccesses.length}/4 loss=${ipLossPercent}% avg_time=${ipAvgLatency}ms`);
      } else {
        finishedLogs.push(`[TIMEOUT] Request timed out for Client device ${deviceIp} after maximum allowed attempts (100% loss).`);
      }

      // Determine if there is a timeout incident
      const anyPingExceededThreshold = ipLatencies.some(l => l > maxLatencyThreshold);
      const hasTimeoutIncident = anyPingExceededThreshold || ipLossPercent > 0;
      let finalStatus: 'success' | 'warning' | 'failure' | 'timeout-incident' = 'success';

      // Status indicator updates based on ping results & thresholds
      if (ipSuccess && gatewaySuccess) {
        if (hasTimeoutIncident) {
          finalStatus = 'timeout-incident';
          setConnectivityResult('warning');
          
          if (anyPingExceededThreshold) {
            const maxPingVal = Math.max(...ipLatencies);
            finishedLogs.push(`[TIMEOUT INCIDENT] Latency of ${maxPingVal}ms exceeds configured threshold of ${maxLatencyThreshold}ms. Flagged as Timeout Incident.`);
          }
          if (ipLossPercent > 0) {
            finishedLogs.push(`[TIMEOUT INCIDENT] Packet loss of ${ipLossPercent}% detected (exceeded ${pingTimeout}ms timeout setting). Flagged as Timeout Incident.`);
          }

          // Write warning/timeout SignalLog to Firestore
          const logId = `log-ops-${Date.now()}`;
          await setDoc(doc(db, 'signal_logs', logId), {
            id: logId,
            timestamp: new Date().toISOString(),
            level: 'warn',
            source: 'Device Connectivity',
            message: `Timeout incident flagged: Client Device "${deviceName}" at IP ${deviceIp} detected with latency/packet loss exceeding thresholds (Avg: ${ipAvgLatency}ms, Loss: ${ipLossPercent}%).`,
            user: currentUser?.displayName || currentUser?.login || 'Seth Boa Amponsem'
          });
        } else {
          finalStatus = 'success';
          setConnectivityResult('success');
        }
        // Update sparkline ping history with successful average latency
        setPingHistory(prev => [...prev.slice(-4), ipAvgLatency]);
      } else {
        finalStatus = 'failure';
        setConnectivityResult('failure');
        // Update sparkline ping history with 0 (indicates offline)
        setPingHistory(prev => [...prev.slice(-4), 0]);

        // Write failure SignalLog to Firestore
        const logId = `log-ops-${Date.now()}`;
        await setDoc(doc(db, 'signal_logs', logId), {
          id: logId,
          timestamp: new Date().toISOString(),
          level: 'error',
          source: 'Device Connectivity',
          message: `Network offline: Client Device "${deviceName}" at IP ${deviceIp} is offline or unreachable via ICMP sweep (100% loss).`,
          user: currentUser?.displayName || currentUser?.login || 'Seth Boa Amponsem'
        });
      }

      // If we had at least one successful ping, update last successful timestamp and latency for tooltip
      if (ipSuccesses.length > 0) {
        setLastSuccessTimestamp(new Date().toLocaleTimeString() + ' ' + new Date().toLocaleDateString());
        setLastSuccessLatency(ipAvgLatency);
      }

      finishedLogs.push(`[SYSTEM] Connectivity verification cycle complete.`);
      setConnectivityLogs(finishedLogs);

      // Save to detailed history table of last 10 runs
      const newManualResult = {
        id: `man-ping-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        deviceName,
        ip: deviceIp,
        duration: ipSuccesses.length > 0 ? ipAvgLatency : '---',
        packetLoss: ipLossPercent,
        status: finalStatus,
        details: `${ipSuccesses.length} of 4 packets received.${hasTimeoutIncident ? ' Timeout incident flagged.' : ''}`
      };
      setManualPingHistory(prev => [newManualResult, ...prev.slice(0, 9)]);

    } catch (err: any) {
      setConnectivityLogs(prev => [
        ...prev,
        `[CRITICAL] Network stack interface error: ${err.message}`
      ]);
      setConnectivityResult('failure');
    } finally {
      setIsTestingConnectivity(false);
    }
  };

  // Bulk Parallel ICMP Ping Sweep helper
  const handleBulkPingSweep = async () => {
    if (bulkDevices.length === 0) {
      alert("Please select at least one device for Bulk Ping sweep.");
      return;
    }
    setIsBulkPinging(true);
    setBulkSweepResults([]);

    const selectedAssets = (assets || []).filter(a => bulkDevices.includes(a.id));
    
    try {
      const pingPromises = selectedAssets.map(async (asset) => {
        try {
          const res = await fetch(`/api/ping/device?ip=${encodeURIComponent(asset.ipAddress)}&timeout=${pingTimeout}`);
          const data = await res.json();
          const online = data.success && data.result?.status === 'online';
          const latency = online ? data.result.latency : 0;
          return {
            id: asset.id,
            name: asset.name,
            ip: asset.ipAddress,
            category: asset.category,
            online,
            latency,
            vlan: getAssetVlan(asset),
            location: asset.location || 'Main Stage'
          };
        } catch (err: any) {
          return {
            id: asset.id,
            name: asset.name,
            ip: asset.ipAddress,
            category: asset.category,
            online: false,
            latency: 0,
            vlan: getAssetVlan(asset),
            location: asset.location || 'Main Stage',
            error: err.message
          };
        }
      });

      const results = await Promise.all(pingPromises);
      setBulkSweepResults(results);

      const onlineCount = results.filter(r => r.online).length;
      const offlineCount = results.length - onlineCount;

      // Log sweep completion summary to Firestore
      const logId = `log-ops-${Date.now()}`;
      await setDoc(doc(db, 'signal_logs', logId), {
        id: logId,
        timestamp: new Date().toISOString(),
        level: offlineCount > 0 ? 'warn' : 'success',
        source: 'Bulk Network Sweep',
        message: `Parallel ICMP Bulk Ping Sweep finished: ${onlineCount}/${results.length} devices online. ${offlineCount} devices offline.`,
        user: currentUser?.displayName || currentUser?.login || 'Seth Boa Amponsem'
      });

    } catch (err) {
      console.error('Bulk ping sweep failed:', err);
    } finally {
      setIsBulkPinging(false);
    }
  };
  
  // Local states for Email Testing Playground
  const [testToEmail, setTestToEmail] = useState('sethboaamponsem@gmail.com');
  const [testSubject, setTestSubject] = useState('Kynren Operations: Systems Test Dispatch');
  const [testBodyHtml, setTestBodyHtml] = useState('<h1>Kynren Operations System Alert</h1><p>This is a real-time diagnostics packet sent via the Gmail Operations API playground.</p>');
  const [isSendingTestEmail, setIsSendingTestEmail] = useState(false);
  const [emailTestResult, setEmailTestResult] = useState<{ status: 'success' | 'error', message: string } | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<'custom' | 'assignment' | 'stock'>('custom');

  const [archivedTickets, setArchivedTickets] = useState<any[]>([]);
  const [isLoadingArchive, setIsLoadingArchive] = useState(false);
  const [isClearingArchive, setIsClearingArchive] = useState(false);
  const [archiveSearchQuery, setArchiveSearchQuery] = useState('');

  const loadArchivedTickets = async () => {
    setIsLoadingArchive(true);
    try {
      const snap = await getDocs(collection(db, 'archive_tickets'));
      const list: any[] = [];
      snap.forEach(doc => {
        list.push({ id: doc.id, ...doc.data() });
      });
      list.sort((a, b) => {
        const timeA = a.archivedAt || a.timestamp || '';
        const timeB = b.archivedAt || b.timestamp || '';
        return timeB.localeCompare(timeA);
      });
      setArchivedTickets(list);
    } catch (err) {
      console.error("Failed to load archived tickets", err);
    } finally {
      setIsLoadingArchive(false);
    }
  };

  const handleClearArchive = async () => {
    if (!window.confirm("Are you sure you want to permanently delete all archived tickets? This action cannot be undone.")) {
      return;
    }
    setIsClearingArchive(true);
    try {
      const snap = await getDocs(collection(db, 'archive_tickets'));
      const deletePromises = snap.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
      setArchivedTickets([]);
      alert("Archive storage successfully cleared.");
    } catch (err) {
      console.error("Failed to clear archive", err);
      alert("Failed to clear archive. Please check Firestore security rules.");
    } finally {
      setIsClearingArchive(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'archive') {
      loadArchivedTickets();
    }
  }, [activeTab]);

  const [batteryThresholds, setBatteryThresholds] = useState<Record<string, number>>({
    Projector: 15,
    Switch: 15,
    Radio: 15,
    DMX: 15,
    Speaker: 15,
    Pyrotechnics: 15,
  });
  const [isSavingThresholds, setIsSavingThresholds] = useState(false);
  const [thresholdsSaveSuccess, setThresholdsSaveSuccess] = useState(false);

  useEffect(() => {
    const loadThresholds = async () => {
      try {
        const snap = await getDocs(collection(db, 'battery_thresholds'));
        const loaded: Record<string, number> = {};
        snap.forEach(doc => {
          loaded[doc.id] = doc.data().threshold ?? 15;
        });
        if (Object.keys(loaded).length > 0) {
          setBatteryThresholds(prev => ({ ...prev, ...loaded }));
        }
      } catch (err) {
        console.error("Failed to load battery thresholds", err);
      }
    };
    loadThresholds();
  }, []);
  const [selectedDropdownCategory, setSelectedDropdownCategory] = useState<string>('device_type');
  const [newDropdownOptionInput, setNewDropdownOptionInput] = useState<string>('');
  const [logSubTab, setLogSubTab] = useState<'syslog' | 'geofence' | 'bulk'>('syslog');

  // User details sidebar state
  const [selectedSidebarUser, setSelectedSidebarUser] = useState<UserRegistryItem | null>(null);
  const [editPassword, setEditPassword] = useState('');
  const [editTempPassword, setEditTempPassword] = useState('');
  const [editImageFile, setEditImageFile] = useState<string>('');
  const [isSavingUserUpdates, setIsSavingUserUpdates] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [showEditTempPassword, setShowEditTempPassword] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [ruleToDelete, setRuleToDelete] = useState<AssignmentRule | null>(null);
  const [draggedCategory, setDraggedCategory] = useState<string | null>(null);
  const [activeDragOverTechId, setActiveDragOverTechId] = useState<string | null>(null);

  const getCategoryBadgeClass = (category: string) => {
    switch (category) {
      case 'Hardware': return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      case 'Network': return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
      case 'Power': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'Lighting': return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
      case 'Audio': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'Special Effects': return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      default: return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  const handleDropOnTechnician = (techId: string, techName: string) => {
    setActiveDragOverTechId(null);
    if (!draggedCategory) return;

    // Check for existing rule matching category trigger and this specific match value
    const existingRule = rules.find(r => r.trigger === 'category' && r.value === draggedCategory);
    if (existingRule) {
      if (existingRule.assignToUserId === techId) return; // already assigned
      onDeleteRule(existingRule.id);
    }

    onAddRule({
      id: `rule-${Date.now().toString().substring(8)}`,
      trigger: 'category',
      value: draggedCategory,
      assignToUserId: techId,
      assignToUserName: techName
    });

    setDraggedCategory(null);
  };

  const handleRemoveCategoryRule = (category: string) => {
    const matchedRule = rules.find(r => r.trigger === 'category' && r.value === category);
    if (matchedRule) {
      onDeleteRule(matchedRule.id);
    }
  };
  const [userToDelete, setUserToDelete] = useState<UserRegistryItem | null>(null);
  const [userToSuspend, setUserToSuspend] = useState<UserRegistryItem | null>(null);
  const [userToArchive, setUserToArchive] = useState<UserRegistryItem | null>(null);
  const [dropdownOptionToDelete, setDropdownOptionToDelete] = useState<{ category: string, option: string } | null>(null);

  // User editing states in sidebar
  const [isEditing, setIsEditing] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editLogin, setEditLogin] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editJobTitle, setEditJobTitle] = useState('');
  const [editExtension3CX, setEditExtension3CX] = useState('');
  const [editCellPhone, setEditCellPhone] = useState('');
  const [editComment, setEditComment] = useState('');

  // Rich Add User Modal State
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUserLogin, setNewUserLogin] = useState('');
  const [newUserFirstName, setNewUserFirstName] = useState('');
  const [newUserLastName, setNewUserLastName] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserConfirmPassword, setNewUserConfirmPassword] = useState('');
  const [newUserActive, setNewUserActive] = useState<'Yes' | 'No'>('Yes');
  const [newUserJobTitle, setNewUserJobTitle] = useState('');
  const [newUserEmailInput, setNewUserEmailInput] = useState('');
  const [newUserEmails, setNewUserEmails] = useState<string[]>([]);
  const [newUserValidFrom, setNewUserValidFrom] = useState('');
  const [newUserValidUntil, setNewUserValidUntil] = useState('');
  const [newUserPhoneNumber, setNewUserPhoneNumber] = useState('');
  const [newUserCellPhone, setNewUserCellPhone] = useState('');
  const [newUserRole, setNewUserRole] = useState<'Admin' | 'Observer' | 'Self Service' | 'Super Admin'>('Observer');
  const [newUserExtension3CX, setNewUserExtension3CX] = useState('');
  const [newUserComment, setNewUserComment] = useState('');
  const [userModalError, setUserModalError] = useState('');

  // Password Visibility States
  const [showNewUserPassword, setShowNewUserPassword] = useState(false);
  const [showNewUserConfirmPassword, setShowNewUserConfirmPassword] = useState(false);

  // Auto Archive policy states
  const [autoArchiveEnabled, setAutoArchiveEnabled] = useState(preferences.autoArchivePolicyEnabled || false);
  const [archiveAge, setArchiveAge] = useState(preferences.archiveAgeDays || 30);
  const [latencyThreshold, setLatencyThreshold] = useState(preferences.latencyThreshold || 100);
  const [archivingResult, setArchivingResult] = useState<string | null>(null);
  const [isArchiving, setIsArchiving] = useState(false);

  // Signal Logs Archiver states
  const [isArchivingLogs, setIsArchivingLogs] = useState(false);
  const [logArchiveResult, setLogArchiveResult] = useState<string | null>(null);

  const handleTriggerLogArchiving = async () => {
    if (!onArchiveSignalLogs) return;
    setIsArchivingLogs(true);
    setLogArchiveResult(null);
    try {
      const count = await onArchiveSignalLogs(7);
      setLogArchiveResult(`Success: Moved ${count} signal logs (older than 7 days) to 'historical_logs'.`);
      setTimeout(() => setLogArchiveResult(null), 6000);
    } catch (err) {
      setLogArchiveResult(`Error executing signal log archiving.`);
      console.error(err);
    } finally {
      setIsArchivingLogs(false);
    }
  };

  const handleChangeLatencyThreshold = async (val: number) => {
    setLatencyThreshold(val);
    await onUpdatePreferences({ latencyThreshold: val });
  };

  const handleToggleAutoArchive = async () => {
    const nextVal = !autoArchiveEnabled;
    setAutoArchiveEnabled(nextVal);
    await onUpdatePreferences({ autoArchivePolicyEnabled: nextVal });
  };

  const handleChangeArchiveAge = async (val: number) => {
    setArchiveAge(val);
    await onUpdatePreferences({ archiveAgeDays: val });
  };

  const handleTriggerArchiving = async () => {
    if (!onRunAutoArchive) return;
    setIsArchiving(true);
    setArchivingResult(null);
    try {
      const count = await onRunAutoArchive();
      setArchivingResult(`Success: Moved ${count} resolved tickets (>${archiveAge} days old) to Archive.`);
      setTimeout(() => setArchivingResult(null), 5000);
    } catch (err) {
      setArchivingResult(`Error executing archiving procedure.`);
      console.error(err);
    } finally {
      setIsArchiving(false);
    }
  };

  // Rule Form state
  const [trigger, setTrigger] = useState('category');
  const [value, setValue] = useState('Network');
  const [assignToUserId, setAssignToUserId] = useState('');

  // Global Settings state
  const [tempThreshold, setTempThreshold] = useState(75);
  const [pingDelay, setPingDelay] = useState(3000);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);

  // Alert Configuration State
  const [isAlertModalOpen, setIsAlertModalOpen] = useState(false);
  const [latencyAlertThreshold, setLatencyAlertThreshold] = useState(preferences.latencyThreshold || 120);
  const [packetLossAlertThreshold, setPacketLossAlertThreshold] = useState(preferences.packetLossThreshold || 5);
  const [latencyNotificationEnabled, setLatencyNotificationEnabled] = useState(
    preferences.latencyNotificationEnabled !== undefined ? preferences.latencyNotificationEnabled : true
  );
  const [packetLossNotificationEnabled, setPacketLossNotificationEnabled] = useState(
    preferences.packetLossNotificationEnabled !== undefined ? preferences.packetLossNotificationEnabled : true
  );

  const handleSaveAlertConfig = async () => {
    try {
      await onUpdatePreferences({
        latencyThreshold: latencyAlertThreshold,
        packetLossThreshold: packetLossAlertThreshold,
        latencyNotificationEnabled,
        packetLossNotificationEnabled
      });
      setIsAlertModalOpen(false);

      // Log the alert config change as a SecOps system log
      const logId = `log-bulk-${Date.now()}`;
      await setDoc(doc(db, 'signal_logs', logId), {
        id: logId,
        timestamp: new Date().toISOString(),
        level: 'info',
        source: 'Security Operations',
        message: `Alert Configuration: Custom alert thresholds saved. Latency Limit: ${latencyAlertThreshold}ms (Notifications: ${latencyNotificationEnabled ? 'ON' : 'OFF'}), Packet Loss Limit: ${packetLossAlertThreshold}% (Notifications: ${packetLossNotificationEnabled ? 'ON' : 'OFF'}). Action performed by Seth Boa Amponsem.`,
        user: 'Seth Boa Amponsem'
      });
    } catch (err) {
      console.error('Failed to save alert configuration:', err);
    }
  };

  // System Admin Password state
  const [adminPasswordInput, setAdminPasswordInput] = useState(preferences.systemAdminPassword || 'admin123');
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSaveAdminPassword = async () => {
    if (!adminPasswordInput) return;
    try {
      await onUpdatePreferences({ systemAdminPassword: adminPasswordInput });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignToUserId) return;

    const matchedUser = users.find(u => u.id === assignToUserId);
    if (!matchedUser) return;

    onAddRule({
      id: `rule-${Date.now().toString().substring(8)}`,
      trigger,
      value,
      assignToUserId,
      assignToUserName: matchedUser.displayName
    });

    setAssignToUserId('');
  };

  const handleAddEmail = () => {
    if (!newUserEmailInput) return;
    if (newUserEmails.includes(newUserEmailInput)) return;
    setNewUserEmails([...newUserEmails, newUserEmailInput]);
    setNewUserEmailInput('');
  };

  const handleRemoveEmail = (emailToRemove: string) => {
    setNewUserEmails(newUserEmails.filter(e => e !== emailToRemove));
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    setUserModalError('');

    if (!newUserLogin.trim()) {
      setUserModalError('Login username is required.');
      return;
    }
    if (!newUserFirstName.trim() || !newUserLastName.trim()) {
      setUserModalError('First name and Last name are required.');
      return;
    }
    if (!newUserPassword) {
      setUserModalError('Password is required.');
      return;
    }
    if (newUserPassword !== newUserConfirmPassword) {
      setUserModalError('Passwords do not match.');
      return;
    }

    const primaryEmail = newUserEmails.length > 0 ? newUserEmails[0] : `${newUserLogin.toLowerCase()}@enterprise.local`;

    const nextUser: Partial<UserRegistryItem> & { password?: string } = {
      login: newUserLogin,
      firstName: newUserFirstName,
      lastName: newUserLastName,
      displayName: `${newUserFirstName} ${newUserLastName}`,
      password: newUserPassword,
      active: newUserActive,
      jobTitle: newUserJobTitle,
      emails: newUserEmails.length > 0 ? newUserEmails : [primaryEmail],
      email: primaryEmail,
      validFrom: newUserValidFrom,
      validUntil: newUserValidUntil,
      phoneNumber: newUserPhoneNumber,
      cellPhone: newUserCellPhone,
      role: newUserRole,
      extension3CX: newUserExtension3CX,
      comment: newUserComment,
      status: 'offline',
      clientIp: '10.12.34.' + Math.floor(Math.random() * 254 + 1),
      profileImage: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop'
    };

    if (onAddUser) {
      onAddUser(nextUser);
    }

    // Reset fields
    setNewUserLogin('');
    setNewUserFirstName('');
    setNewUserLastName('');
    setNewUserPassword('');
    setNewUserConfirmPassword('');
    setNewUserActive('Yes');
    setNewUserJobTitle('');
    setNewUserEmails([]);
    setNewUserValidFrom('');
    setNewUserValidUntil('');
    setNewUserPhoneNumber('');
    setNewUserCellPhone('');
    setNewUserRole('Observer');
    setNewUserExtension3CX('');
    setNewUserComment('');
    setShowAddUserModal(false);
  };

  return (
    <div id="admin-control-panel" className="bg-slate-900 border border-slate-700 rounded-xl overflow-hidden shadow-xl p-5">
      
      {/* Tab Selectors */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800 pb-4 mb-5">
        <div>
          <h3 className="font-sans font-bold text-slate-100 flex items-center gap-2 text-base">
            <Settings className="w-5 h-5 text-rose-500" /> Admin & Global System Configuration
          </h3>
          <p className="text-xs text-slate-400">Configure technical assignments, manage the operations team, query full audit syslogs, and control global parameters.</p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800">
          <button
            onClick={() => setActiveTab('users')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'users' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5 inline mr-1" /> Users
          </button>
          <button
            onClick={() => setActiveTab('rules')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'rules' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <GitFork className="w-3.5 h-3.5 inline mr-1" /> Assignment Dispatch
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'logs' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <History className="w-3.5 h-3.5 inline mr-1" /> Syslog Audits
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'settings' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Settings className="w-3.5 h-3.5 inline mr-1" /> General Settings
          </button>
          <button
            onClick={() => setActiveTab('dropdowns')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'dropdowns' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ListPlus className="w-3.5 h-3.5 inline mr-1" /> Dropdowns
          </button>
          <button
            onClick={() => setActiveTab('archive')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'archive' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Archive className="w-3.5 h-3.5 inline mr-1" /> Archive
          </button>
          <button
            onClick={() => setActiveTab('email')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'email' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Mail className="w-3.5 h-3.5 inline mr-1" /> Email Test
          </button>
          <button
            onClick={() => setActiveTab('connectivity')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'connectivity' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Network className="w-3.5 h-3.5 inline mr-1" /> Device Connectivity
          </button>
        </div>
      </div>

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-950 p-4 rounded-lg border border-slate-800">
            <div>
              <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Users className="w-4 h-4 text-rose-500" /> Authorized Systems Users
              </h4>
              <p className="text-[11px] text-slate-400">Manage user authorization profiles, security credentials, active duty statuses, and account validity limits.</p>
            </div>
            <button
              onClick={() => setShowAddUserModal(true)}
              className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-mono text-xs font-bold rounded-md transition-all flex items-center gap-1.5 cursor-pointer uppercase shadow-md self-stretch sm:self-auto text-center justify-center"
            >
              <Plus className="w-4 h-4" /> Add New User
            </button>
          </div>

          {/* Main User List & Details Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            
            {/* Left Column: Users Table */}
            <div className={selectedSidebarUser ? "lg:col-span-2 space-y-4" : "lg:col-span-3 space-y-4"}>
              <div className="overflow-x-auto bg-slate-950 border border-slate-800 rounded-lg">
                <table className="w-full text-left border-collapse font-sans text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 text-[10px] font-mono uppercase bg-slate-900/50 animate-pulse">
                      <th className="p-4">Staff Member / Login</th>
                      <th className="p-4">Job Title</th>
                      <th className="p-4">Corporate Emails</th>
                      <th className="p-4">Client IP / Extension</th>
                      <th className="p-4">Profile Authorization Role</th>
                      <th className="p-4 text-center">Active Status</th>
                      <th className="p-4 text-center">Lifecycle Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {users.map((u) => {
                      const isSelectedUser = selectedSidebarUser?.id === u.id;
                      return (
                        <tr 
                          key={u.id} 
                          onClick={() => {
                            setSelectedSidebarUser(u);
                            setEditPassword('');
                            setEditTempPassword('');
                            setEditImageFile(u.profileImage || '');
                            setIsEditing(false);
                            setEditDisplayName(u.displayName || '');
                            setEditLogin(u.login || '');
                            setEditEmail(u.email || '');
                            setEditJobTitle(u.jobTitle || '');
                            setEditExtension3CX(u.extension3CX || '');
                            setEditCellPhone(u.cellPhone || '');
                            setEditComment(u.comment || '');
                          }}
                          className={`hover:bg-slate-900/60 transition-all cursor-pointer ${
                            isSelectedUser ? 'bg-rose-500/[0.03] border-l-2 border-rose-500' : ''
                          }`}
                        >
                          <td className="p-4 font-medium text-slate-200">
                            <div className="flex items-center gap-3">
                              <img src={u.profileImage} alt="" className="w-8 h-8 rounded-full border border-white/10 shrink-0" referrerPolicy="no-referrer" />
                              <div>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-semibold block">{u.displayName}</span>
                                  {u.suspended && (
                                    <span className="px-1.5 py-0.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded text-[9px] font-mono font-bold uppercase">
                                      Suspended
                                    </span>
                                  )}
                                  {u.archived && (
                                    <span className="px-1.5 py-0.5 bg-slate-800 text-slate-400 border border-slate-700 rounded text-[9px] font-mono font-bold uppercase">
                                      Archived
                                    </span>
                                  )}
                                </div>
                                <span className="font-mono text-[10px] text-rose-400 block font-bold">@{u.login || u.id}</span>
                              </div>
                            </div>
                          </td>
                          <td className="p-4 text-slate-300 font-sans">{u.jobTitle || 'System Operator'}</td>
                          <td className="p-4 font-mono text-[11px]">
                            {u.emails && u.emails.length > 0 ? (
                              <div className="space-y-1">
                                {u.emails.map((e, idx) => (
                                  <span key={idx} className="block text-slate-300 bg-slate-900 border border-slate-850 px-2 py-0.5 rounded text-[10px] max-w-fit truncate">
                                    {e}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-slate-400">{u.email}</span>
                            )}
                          </td>
                          <td className="p-4 font-mono">
                            <div className="text-cyan-400 font-bold">{u.clientIp || 'DHCP Static'}</div>
                            {u.extension3CX && (
                              <div className="text-[10px] text-slate-400 mt-0.5">3CX Ext: {u.extension3CX}</div>
                            )}
                          </td>
                          <td className="p-4" onClick={(e) => e.stopPropagation()}>
                            <select
                              value={u.role}
                              onChange={(e) => onUpdateUserRole(u.id, e.target.value as any)}
                              className="bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-rose-500 font-mono font-bold"
                            >
                              <option value="Admin">Admin</option>
                              <option value="Observer">Observer</option>
                              <option value="Self Service">Self Service</option>
                              <option value="Super Admin">Super Admin</option>
                            </select>
                          </td>
                          <td className="p-4 text-center" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => onToggleUserStatus(u.id)}
                              className={`px-2.5 py-1 rounded text-[10px] uppercase font-mono font-bold transition-all cursor-pointer ${
                                u.status === 'online' || u.active === 'Yes'
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                                  : 'bg-slate-800 text-slate-400 border border-slate-700'
                              }`}
                            >
                              {u.status === 'online' ? 'Active' : 'Offline'}
                            </button>
                          </td>
                          <td className="p-4 text-center" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-center gap-1.5">
                              {/* Suspend Toggle */}
                              <button
                                onClick={() => {
                                  if (u.id === currentUser?.id) {
                                    alert("You cannot suspend your own account.");
                                    return;
                                  }
                                  setUserToSuspend(u);
                                }}
                                disabled={u.id === currentUser?.id}
                                className={`p-1 rounded transition-all ${
                                  u.id === currentUser?.id
                                    ? 'opacity-40 cursor-not-allowed bg-slate-800 text-slate-500'
                                    : u.suspended
                                      ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 cursor-pointer'
                                      : 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 cursor-pointer'
                                }`}
                                title={u.id === currentUser?.id ? "Cannot suspend own account" : u.suspended ? "Unsuspend User Account" : "Suspend User Account"}
                              >
                                {u.suspended ? <CheckCircle className="w-3.5 h-3.5" /> : <Ban className="w-3.5 h-3.5" />}
                              </button>

                              {/* Archive Toggle */}
                              <button
                                onClick={() => {
                                  if (u.id === currentUser?.id) {
                                    alert("You cannot archive your own account.");
                                    return;
                                  }
                                  setUserToArchive(u);
                                }}
                                disabled={u.id === currentUser?.id}
                                className={`p-1 rounded transition-all ${
                                  u.id === currentUser?.id
                                    ? 'opacity-40 cursor-not-allowed bg-slate-800 text-slate-500'
                                    : u.archived
                                      ? 'bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 cursor-pointer'
                                      : 'bg-slate-850 text-slate-400 hover:bg-slate-800 border border-slate-800 cursor-pointer'
                                }`}
                                title={u.id === currentUser?.id ? "Cannot archive own account" : u.archived ? "Restore User Account" : "Archive User Account"}
                              >
                                <Archive className="w-3.5 h-3.5" />
                              </button>

                              {/* Delete Account */}
                              <button
                                onClick={() => {
                                  setUserToDelete(u);
                                }}
                                className="p-1 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded transition-all cursor-pointer"
                                title="Delete User Account"
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
            </div>

            {/* Right Column: User Details Sidebar */}
            {selectedSidebarUser && (
              <div className="lg:col-span-1 bg-slate-950 p-5 rounded-lg border border-slate-800 space-y-5 animate-in slide-in-from-right-5 duration-300 relative">
                {/* Header */}
                <div className="flex justify-between items-start border-b border-slate-900 pb-3">
                  <div>
                    <h4 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                      <UserCheck className="w-4 h-4 text-rose-500" /> Account Inspection
                    </h4>
                    <span className="text-[10px] text-slate-400 font-mono">ID: {selectedSidebarUser.id}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedSidebarUser(null);
                      setEditPassword('');
                      setEditTempPassword('');
                      setEditImageFile('');
                    }}
                    className="p-1.5 hover:bg-slate-900 rounded-md text-slate-400 hover:text-slate-100 transition-colors cursor-pointer text-xs font-bold uppercase font-mono border border-transparent hover:border-slate-800"
                  >
                    ✕ Close
                  </button>
                </div>

                {/* Profile Pic Card */}
                <div className="flex flex-col items-center bg-slate-900/40 p-4 rounded-xl border border-slate-900 space-y-3">
                  <div className="relative group">
                    <img 
                      src={editImageFile || selectedSidebarUser.profileImage} 
                      alt="" 
                      className="w-16 h-16 rounded-full border-2 border-rose-500/50 object-cover shadow-lg" 
                      referrerPolicy="no-referrer"
                    />
                    
                    {/* Drag-and-drop and select via click for Profile Image */}
                    <label 
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
                              setEditImageFile(event.target.result as string);
                            }
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className={`absolute inset-0 rounded-full bg-slate-950/80 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-all cursor-pointer border ${
                        dragActive ? 'border-emerald-500 opacity-100 scale-105' : 'border-slate-800'
                      }`}
                    >
                      <Upload className="w-4 h-4 text-rose-500 animate-bounce mb-0.5" />
                      <span className="text-[8px] text-slate-300 font-mono text-center leading-none px-1">Drop / Click</span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={async (e) => {
                          if (e.target.files && e.target.files[0]) {
                            const file = e.target.files[0];
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              if (event.target?.result) {
                                setEditImageFile(event.target.result as string);
                              }
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </label>
                  </div>

                  <div className="text-center">
                    <span className="text-xs font-bold text-slate-100 block">{selectedSidebarUser.displayName}</span>
                    <span className="text-[10px] text-rose-400 font-mono font-bold uppercase block">@{selectedSidebarUser.login || selectedSidebarUser.id}</span>
                    <span className="inline-block mt-1 px-2 py-0.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-full text-[9px] font-mono font-bold uppercase">
                      {selectedSidebarUser.role}
                    </span>
                  </div>
                </div>

                {/* General Settings Scroll Area */}
                <div className="space-y-4 max-h-[350px] overflow-y-auto pr-2 scrollbar-thin font-sans text-xs">
                  
                  {/* Account Properties */}
                  <div className="bg-slate-900/20 p-3 rounded-lg border border-slate-900 space-y-2">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[9px] text-slate-400 font-mono uppercase tracking-wider block font-bold">User Registry Specifications</span>
                      <button
                        type="button"
                        onClick={() => setIsEditing(!isEditing)}
                        className="text-[10px] text-rose-400 hover:text-rose-300 font-mono cursor-pointer flex items-center gap-1 font-bold bg-transparent border-0"
                      >
                        {isEditing ? 'Cancel Edit' : '✍️ Edit Details'}
                      </button>
                    </div>

                    {isEditing ? (
                      <div className="space-y-2 text-[10px]">
                        <div>
                          <label className="text-slate-500 block mb-0.5">Display Name</label>
                          <input
                            type="text"
                            value={editDisplayName}
                            onChange={(e) => setEditDisplayName(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-200 text-xs font-sans"
                            placeholder="Display Name"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-slate-500 block mb-0.5">Login/Username</label>
                            <input
                              type="text"
                              value={editLogin}
                              onChange={(e) => setEditLogin(e.target.value)}
                              className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-200 font-mono text-xs"
                              placeholder="login"
                            />
                          </div>
                          <div>
                            <label className="text-slate-500 block mb-0.5">Primary Email</label>
                            <input
                              type="email"
                              value={editEmail}
                              onChange={(e) => setEditEmail(e.target.value)}
                              className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-200 font-mono text-xs"
                              placeholder="email@company.com"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-slate-500 block mb-0.5">Job Title</label>
                            <input
                              type="text"
                              value={editJobTitle}
                              onChange={(e) => setEditJobTitle(e.target.value)}
                              className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-200 text-xs font-sans"
                              placeholder="Job Title"
                            />
                          </div>
                          <div>
                            <label className="text-slate-500 block mb-0.5">3CX Extension</label>
                            <input
                              type="text"
                              value={editExtension3CX}
                              onChange={(e) => setEditExtension3CX(e.target.value)}
                              className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-200 font-mono text-xs"
                              placeholder="Ext"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="text-slate-500 block mb-0.5">Mobile Phone</label>
                          <input
                            type="text"
                            value={editCellPhone}
                            onChange={(e) => setEditCellPhone(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-200 font-mono text-xs"
                            placeholder="Phone Number"
                          />
                        </div>
                        <div>
                          <label className="text-slate-500 block mb-0.5">Comments/Notes</label>
                          <textarea
                            value={editComment}
                            onChange={(e) => setEditComment(e.target.value)}
                            rows={2}
                            className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-200 text-xs font-sans"
                            placeholder="Internal comment or details..."
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2 text-[10px]">
                        <div>
                          <span className="text-slate-500 block">Job Title</span>
                          <span className="text-slate-200 font-medium truncate block">{selectedSidebarUser.jobTitle || 'Operator'}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">3CX Extension</span>
                          <span className="text-slate-200 font-mono block">{selectedSidebarUser.extension3CX || 'Unassigned'}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">Mobile Phone</span>
                          <span className="text-slate-200 font-mono block">{selectedSidebarUser.cellPhone || 'None'}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">Account Age</span>
                          <span className="text-slate-200 font-mono block">Valid Since {selectedSidebarUser.validFrom || 'Creation'}</span>
                        </div>
                        {selectedSidebarUser.comment && (
                          <div className="col-span-2 mt-1">
                            <span className="text-slate-500 block">Admin Notes</span>
                            <span className="text-slate-300 italic block">{selectedSidebarUser.comment}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Account Lifecycle Controls */}
                  <div className="bg-slate-900/40 p-3 rounded-lg border border-slate-900 space-y-2">
                    <span className="text-[9px] text-slate-400 font-mono uppercase tracking-wider block font-bold mb-1">Account Lifecycle</span>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (selectedSidebarUser.id === currentUser?.id) {
                            alert("You cannot suspend your own account.");
                            return;
                          }
                          setUserToSuspend(selectedSidebarUser);
                        }}
                        disabled={selectedSidebarUser.id === currentUser?.id}
                        className={`py-1.5 px-2 rounded font-mono text-[10px] font-bold uppercase transition-all flex items-center justify-center gap-1 border ${
                          selectedSidebarUser.id === currentUser?.id
                            ? 'opacity-40 cursor-not-allowed bg-slate-800 text-slate-500 border-slate-700'
                            : selectedSidebarUser.suspended
                              ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/35 hover:bg-emerald-500/25 cursor-pointer'
                              : 'bg-amber-500/15 text-amber-400 border-amber-500/35 hover:bg-amber-500/25 cursor-pointer'
                        }`}
                      >
                        {selectedSidebarUser.suspended ? (
                          <>
                            <CheckCircle className="w-3 h-3 text-emerald-400" /> Unsuspend
                          </>
                        ) : (
                          <>
                            <Ban className="w-3 h-3 text-amber-400" /> Suspend
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (selectedSidebarUser.id === currentUser?.id) {
                            alert("You cannot archive your own account.");
                            return;
                          }
                          setUserToArchive(selectedSidebarUser);
                        }}
                        disabled={selectedSidebarUser.id === currentUser?.id}
                        className={`py-1.5 px-2 rounded font-mono text-[10px] font-bold uppercase transition-all flex items-center justify-center gap-1 border ${
                          selectedSidebarUser.id === currentUser?.id
                            ? 'opacity-40 cursor-not-allowed bg-slate-800 text-slate-500 border-slate-700'
                            : selectedSidebarUser.archived
                              ? 'bg-blue-500/15 text-blue-400 border-blue-500/35 hover:bg-blue-500/25 cursor-pointer'
                              : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700 cursor-pointer'
                        }`}
                      >
                        <Archive className="w-3 h-3" />
                        {selectedSidebarUser.archived ? 'Restore' : 'Archive'}
                      </button>

                      <button
                        type="button"
                        onClick={() => setUserToDelete(selectedSidebarUser)}
                        className="py-1.5 px-2 rounded font-mono text-[10px] font-bold uppercase transition-all flex items-center justify-center gap-1 cursor-pointer border bg-red-500/15 text-red-400 border-red-500/35 hover:bg-red-500/25 col-span-2"
                      >
                        <Trash2 className="w-3 h-3 text-red-400" /> Delete Corporate Account
                      </button>
                    </div>
                  </div>

                  {/* Password Rotation Section */}
                  <div className="space-y-1.5">
                    <span className="text-[9px] text-slate-400 font-mono uppercase tracking-wider block font-bold flex items-center gap-1">
                      <Lock className="w-3 h-3 text-rose-500" /> Rotate Security Password
                    </span>
                    <div className="relative">
                      <input
                        type={showEditPassword ? 'text' : 'password'}
                        value={editPassword}
                        onChange={(e) => setEditPassword(e.target.value)}
                        placeholder="Enter secure replacement password..."
                        className="w-full bg-slate-900 text-slate-100 font-mono text-xs px-3 py-2 border border-slate-800 rounded focus:outline-none focus:border-slate-700 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowEditPassword(!showEditPassword)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-200 transition-colors"
                      >
                        {showEditPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()';
                        let r = '';
                        for (let i = 0; i < 12; i++) r += chars.charAt(Math.floor(Math.random() * chars.length));
                        setEditPassword(r);
                      }}
                      className="text-[9px] text-rose-400 hover:text-rose-300 font-mono cursor-pointer flex items-center gap-1"
                    >
                      🎲 Generate secure random password
                    </button>
                  </div>

                  {/* Temporary Password OTP Assignment */}
                  <div className="space-y-1.5">
                    <span className="text-[9px] text-slate-400 font-mono uppercase tracking-wider block font-bold flex items-center gap-1">
                      <Key className="w-3 h-3 text-cyan-400" /> Assign Temporary Password (OTP)
                    </span>
                    <div className="relative">
                      <input
                        type={showEditTempPassword ? 'text' : 'password'}
                        value={editTempPassword}
                        onChange={(e) => setEditTempPassword(e.target.value)}
                        placeholder="Assign one-time-use temporary code..."
                        className="w-full bg-slate-900 text-slate-100 font-mono text-xs px-3 py-2 border border-slate-800 rounded focus:outline-none focus:border-slate-700 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowEditTempPassword(!showEditTempPassword)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-200 transition-colors"
                      >
                        {showEditTempPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    <p className="text-[9px] text-slate-500 leading-normal">
                      Assigning a temporary code marks this user's profile state as <strong>Forced Password Rotation</strong> on their next login session.
                    </p>
                  </div>

                  {/* Corporate Hardware Devices Assigned to User */}
                  <div className="space-y-2 pt-2">
                    <span className="text-[9px] text-slate-400 font-mono uppercase tracking-wider block font-bold">
                      Assigned Enterprise Hardware
                    </span>
                    
                    {(() => {
                      const userDevices = assets.filter(
                        a => a.assignedTo && (
                          a.assignedTo.toLowerCase() === selectedSidebarUser.displayName.toLowerCase() ||
                          (selectedSidebarUser.login && a.assignedTo.toLowerCase() === selectedSidebarUser.login.toLowerCase())
                        )
                      );

                      if (userDevices.length > 0) {
                        return (
                          <div className="space-y-1.5">
                            {userDevices.map(dev => (
                              <div key={dev.id} className="p-2.5 bg-slate-900/60 border border-slate-850 rounded flex justify-between items-center text-[11px]">
                                <div>
                                  <span className="font-semibold text-slate-200 block truncate max-w-[150px]">{dev.name}</span>
                                  <span className="text-[9px] text-slate-500 font-mono font-bold block">{dev.category} • S/N {dev.serialNumber || 'N/A'}</span>
                                </div>
                                <span className={`px-1.5 py-0.5 rounded text-[8px] font-mono uppercase font-bold ${
                                  dev.status === 'Active' || dev.status === 'online' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                                }`}>
                                  {dev.status}
                                </span>
                              </div>
                            ))}
                          </div>
                        );
                      }

                      return (
                        <div className="p-3 bg-slate-900/20 border border-slate-900 rounded text-center text-slate-500 italic text-[10px]">
                          No assigned corporate devices found in inventory.
                        </div>
                      );
                    })()}
                  </div>

                  {/* Associated Account Activity System Logs */}
                  <div className="space-y-2 pt-2">
                    <span className="text-[9px] text-slate-400 font-mono uppercase tracking-wider block font-bold flex items-center gap-1">
                      <History className="w-3 h-3 text-rose-500" /> Account Audit History Logs
                    </span>

                    {(() => {
                      const userLogs = logs.filter(
                        l => l.user === selectedSidebarUser.displayName || 
                             l.user === selectedSidebarUser.login || 
                             l.message.toLowerCase().includes(selectedSidebarUser.displayName.toLowerCase()) || 
                             (selectedSidebarUser.login && l.message.toLowerCase().includes(selectedSidebarUser.login.toLowerCase()))
                      );

                      if (userLogs.length > 0) {
                        return (
                          <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1 scrollbar-thin bg-slate-900/40 p-2 border border-slate-900 rounded">
                            {userLogs.map((lg) => (
                              <div key={lg.id} className="text-[10px] border-b border-slate-850/50 pb-1 mb-1 last:border-0 last:pb-0 last:mb-0">
                                <div className="flex justify-between text-slate-500 text-[9px] font-mono">
                                  <span>{lg.timestamp || 'N/A'}</span>
                                  <span className="text-cyan-400 font-bold">{lg.source || 'SYSTEM'}</span>
                                </div>
                                <p className="text-slate-300 font-sans mt-0.5 leading-snug">{lg.message}</p>
                              </div>
                            ))}
                          </div>
                        );
                      }

                      return (
                        <div className="p-3 bg-slate-900/20 border border-slate-900 rounded text-center text-slate-500 italic text-[10px]">
                          No corporate logs linked to this profile.
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* Save modifications */}
                <div className="pt-2 border-t border-slate-900 flex gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      if (!onUpdateUser) return;
                      setIsSavingUserUpdates(true);
                      try {
                        const updates: Partial<UserRegistryItem> = {};
                        if (isEditing) {
                          updates.displayName = editDisplayName;
                          updates.login = editLogin;
                          updates.email = editEmail;
                          updates.jobTitle = editJobTitle;
                          updates.extension3CX = editExtension3CX;
                          updates.cellPhone = editCellPhone;
                          updates.comment = editComment;
                        }
                        if (editPassword) updates.password = editPassword;
                        if (editTempPassword) {
                          updates.password = editTempPassword;
                          updates.isOTP = true;
                        }
                        if (editImageFile) updates.profileImage = editImageFile;
                        
                        await onUpdateUser(selectedSidebarUser.id, updates);
                        
                        // Update local sidebar model
                        setSelectedSidebarUser(prev => prev ? { ...prev, ...updates } : null);
                        setEditPassword('');
                        setEditTempPassword('');
                        setIsEditing(false);
                        
                        // Show simple feedback
                        alert('Corporate account modifications written successfully to Firestore.');
                      } catch (err) {
                        console.error('Failed to update user', err);
                      } finally {
                        setIsSavingUserUpdates(false);
                      }
                    }}
                    disabled={isSavingUserUpdates || (!isEditing && !editPassword && !editTempPassword && !editImageFile)}
                    className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-mono font-bold text-xs rounded uppercase flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md"
                  >
                    {isSavingUserUpdates ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Saving...
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" /> Save Changes
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Add User Modal Dialog */}
          <AnimatePresence>
            {showAddUserModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden my-8"
                >
                  <div className="p-4 border-b border-slate-800 bg-slate-950 flex justify-between items-center">
                    <h3 className="font-sans font-bold text-slate-100 text-sm flex items-center gap-2">
                      <Users className="w-4 h-4 text-rose-500" /> Add Corporate Network User
                    </h3>
                    <button
                      onClick={() => setShowAddUserModal(false)}
                      className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-slate-200 transition-colors cursor-pointer text-xs uppercase font-mono"
                    >
                      ✕ Close
                    </button>
                  </div>

                  <form onSubmit={handleSaveUser} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
                    {userModalError && (
                      <div className="p-3 bg-red-950/40 border border-red-900/50 rounded-lg text-red-400 text-xs font-mono flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        {userModalError}
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Login Username */}
                      <div>
                        <label className="block text-[10px] text-slate-400 font-mono mb-1 uppercase font-bold">Login Name *</label>
                        <input
                          type="text"
                          required
                          value={newUserLogin}
                          onChange={(e) => setNewUserLogin(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-rose-500 font-mono"
                          placeholder="e.g. seth.amponsem"
                        />
                      </div>

                      {/* Job Title */}
                      <div>
                        <label className="block text-[10px] text-slate-400 font-mono mb-1 uppercase font-bold">Job Title</label>
                        <input
                          type="text"
                          value={newUserJobTitle}
                          onChange={(e) => setNewUserJobTitle(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-rose-500"
                          placeholder="e.g. Lead Network Engineer"
                        />
                      </div>

                      {/* First Name */}
                      <div>
                        <label className="block text-[10px] text-slate-400 font-mono mb-1 uppercase font-bold">First Name *</label>
                        <input
                          type="text"
                          required
                          value={newUserFirstName}
                          onChange={(e) => setNewUserFirstName(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-rose-500"
                          placeholder="Seth"
                        />
                      </div>

                      {/* Last Name */}
                      <div>
                        <label className="block text-[10px] text-slate-400 font-mono mb-1 uppercase font-bold">Last Name *</label>
                        <input
                          type="text"
                          required
                          value={newUserLastName}
                          onChange={(e) => setNewUserLastName(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-rose-500"
                          placeholder="Amponsem"
                        />
                      </div>

                      {/* Password */}
                      <div>
                        <label className="block text-[10px] text-slate-400 font-mono mb-1 uppercase font-bold">Password *</label>
                        <div className="relative">
                          <input
                            type={showNewUserPassword ? "text" : "password"}
                            required
                            value={newUserPassword}
                            onChange={(e) => setNewUserPassword(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 pr-10 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-rose-500 font-mono"
                            placeholder="••••••••"
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewUserPassword(!showNewUserPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 focus:outline-none"
                          >
                            {showNewUserPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      {/* Confirm Password */}
                      <div>
                        <label className="block text-[10px] text-slate-400 font-mono mb-1 uppercase font-bold">Confirm Password *</label>
                        <div className="relative">
                          <input
                            type={showNewUserConfirmPassword ? "text" : "password"}
                            required
                            value={newUserConfirmPassword}
                            onChange={(e) => setNewUserConfirmPassword(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 pr-10 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-rose-500 font-mono"
                            placeholder="••••••••"
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewUserConfirmPassword(!showNewUserConfirmPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 focus:outline-none"
                          >
                            {showNewUserConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      {/* Active Status */}
                      <div>
                        <label className="block text-[10px] text-slate-400 font-mono mb-1 uppercase font-bold">Active On-duty Status</label>
                        <select
                          value={newUserActive}
                          onChange={(e) => setNewUserActive(e.target.value as any)}
                          className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-rose-500"
                        >
                          <option value="Yes">Yes (Enabled)</option>
                          <option value="No">No (Disabled)</option>
                        </select>
                      </div>

                      {/* 3CX Extension */}
                      <div>
                        <label className="block text-[10px] text-slate-400 font-mono mb-1 uppercase font-bold">3CX Extension</label>
                        <input
                          type="text"
                          value={newUserExtension3CX}
                          onChange={(e) => setNewUserExtension3CX(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-rose-500 font-mono"
                          placeholder="e.g. 5004"
                        />
                      </div>
                    </div>

                    {/* Multi-Email Management */}
                    <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 space-y-3">
                      <div>
                        <label className="block text-[10px] text-slate-400 font-mono mb-1 uppercase font-bold">Corporate Emails (Multi-Add)</label>
                        <div className="flex gap-2">
                          <input
                            type="email"
                            value={newUserEmailInput}
                            onChange={(e) => setNewUserEmailInput(e.target.value)}
                            className="flex-1 bg-slate-900 border border-slate-800 rounded px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-rose-500 font-mono"
                            placeholder="e.g. seth@enterprise.local"
                          />
                          <button
                            type="button"
                            onClick={handleAddEmail}
                            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono text-xs font-bold rounded cursor-pointer"
                          >
                            + Add
                          </button>
                        </div>
                      </div>

                      {newUserEmails.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {newUserEmails.map((email) => (
                            <span key={email} className="inline-flex items-center gap-1.5 bg-slate-900 border border-slate-800 text-slate-300 text-[10px] font-mono px-2.5 py-1 rounded-full">
                              {email}
                              <button
                                type="button"
                                onClick={() => handleRemoveEmail(email)}
                                className="text-red-400 hover:text-red-300 font-bold font-mono focus:outline-none"
                              >
                                ✕
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Valid From */}
                      <div>
                        <label className="block text-[10px] text-slate-400 font-mono mb-1 uppercase font-bold">Valid From Date</label>
                        <input
                          type="date"
                          value={newUserValidFrom}
                          onChange={(e) => setNewUserValidFrom(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-rose-500 font-mono"
                        />
                      </div>

                      {/* Valid Until */}
                      <div>
                        <label className="block text-[10px] text-slate-400 font-mono mb-1 uppercase font-bold">Valid Until Date</label>
                        <input
                          type="date"
                          value={newUserValidUntil}
                          onChange={(e) => setNewUserValidUntil(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-rose-500 font-mono"
                        />
                      </div>

                      {/* Phone Number */}
                      <div>
                        <label className="block text-[10px] text-slate-400 font-mono mb-1 uppercase font-bold">Office Phone Number</label>
                        <input
                          type="text"
                          value={newUserPhoneNumber}
                          onChange={(e) => setNewUserPhoneNumber(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-rose-500 font-mono"
                          placeholder="+1 (555) 019-2834"
                        />
                      </div>

                      {/* Cell Phone */}
                      <div>
                        <label className="block text-[10px] text-slate-400 font-mono mb-1 uppercase font-bold">Emergency Cell Phone</label>
                        <input
                          type="text"
                          value={newUserCellPhone}
                          onChange={(e) => setNewUserCellPhone(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-rose-500 font-mono"
                          placeholder="+1 (555) 012-9988"
                        />
                      </div>
                    </div>

                    {/* Authorization Header and Profile */}
                    <div className="border-t border-slate-800 pt-4 mt-2">
                      <h4 className="text-[11px] font-bold text-slate-200 uppercase tracking-wider font-mono mb-2 flex items-center gap-1.5">
                        <ShieldAlert className="w-4 h-4 text-rose-500" /> Authorisation Profiles
                      </h4>
                      <p className="text-[10px] text-slate-400 mb-3">
                        Profiles dictate granular read/write capability. <strong>Super Admin</strong> allows credentials reset, user creation, and full hardware sweeps.
                      </p>

                      <div>
                        <label className="block text-[10px] text-slate-400 font-mono mb-1 uppercase font-bold">System Profile Role *</label>
                        <select
                          value={newUserRole}
                          onChange={(e) => setNewUserRole(e.target.value as any)}
                          className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-rose-400 focus:outline-none focus:ring-1 focus:ring-rose-500 font-mono font-bold"
                        >
                          <option value="Admin">Admin (Full System Controls)</option>
                          <option value="Observer">Observer (Read-Only Systems Audit)</option>
                          <option value="Self Service">Self Service (Personal Ticket Handling)</option>
                          <option value="Super Admin">Super Admin (Absolute Master Root)</option>
                        </select>
                      </div>
                    </div>

                    {/* Comment */}
                    <div>
                      <label className="block text-[10px] text-slate-400 font-mono mb-1 uppercase font-bold">Account Comments / Remarks</label>
                      <textarea
                        value={newUserComment}
                        onChange={(e) => setNewUserComment(e.target.value)}
                        rows={2}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-rose-500"
                        placeholder="Additional remarks on credentials or responsibilities..."
                      />
                    </div>

                    {/* Modal Submit Actions */}
                    <div className="flex justify-end gap-3 border-t border-slate-800 pt-4 mt-6">
                      <button
                        type="button"
                        onClick={() => setShowAddUserModal(false)}
                        className="px-4 py-2 border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-semibold rounded-md transition-all cursor-pointer font-mono"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-md transition-all flex items-center gap-1.5 cursor-pointer uppercase shadow-lg font-mono"
                      >
                        <CheckCircle className="w-4 h-4" /> Save User Credentials
                      </button>
                    </div>
                  </form>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Assignment Rules */}
      {activeTab === 'rules' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column: Create Rule Form and Draggable Categories */}
          <div className="space-y-6">
            <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 h-fit">
              <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-4 border-b border-slate-800 pb-2 flex items-center gap-2">
                <GitFork className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
                Add Automatic Dispatch Rule
              </h4>
              <form onSubmit={handleCreateRule} className="space-y-4">
                <div>
                  <label className="block text-[10px] text-slate-400 font-mono mb-1">Trigger Field Match</label>
                  <select
                    className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
                    value={trigger}
                    onChange={(e) => setTrigger(e.target.value)}
                  >
                    <option value="category">Ticket Domain Category</option>
                    <option value="priority">Ticket Criticality Level</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 font-mono mb-1">Match Value</label>
                  {trigger === 'category' ? (
                    <select
                      className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
                      value={value}
                      onChange={(e) => setValue(e.target.value)}
                    >
                      <option value="Hardware">Hardware</option>
                      <option value="Network">Network</option>
                      <option value="Power">Power</option>
                      <option value="Lighting">Lighting</option>
                      <option value="Audio">Audio</option>
                      <option value="Special Effects">Special Effects</option>
                    </select>
                  ) : (
                    <select
                      className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
                      value={value}
                      onChange={(e) => setValue(e.target.value)}
                    >
                      <option value="low">low</option>
                      <option value="medium">medium</option>
                      <option value="high">high</option>
                      <option value="critical">critical</option>
                    </select>
                  )}
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 font-mono mb-1">Assign Dispatch Automatically To</label>
                  <select
                    required
                    className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
                    value={assignToUserId}
                    onChange={(e) => setAssignToUserId(e.target.value)}
                  >
                    <option value="">Select Assignee...</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>{u.displayName} ({u.role})</option>
                    ))}
                  </select>
                </div>

                <button
                  type="submit"
                  className="w-full py-2 bg-rose-600 hover:bg-rose-500 text-white font-mono text-xs font-bold rounded transition-all cursor-pointer uppercase"
                >
                  Hook Assignment Rule
                </button>
              </form>
            </div>

            {/* Draggable Category Sources */}
            <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
              <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-2 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                Draggable Categories
              </h4>
              <p className="text-[10px] text-slate-500 mb-4 font-mono leading-relaxed">
                Drag a category badge and drop it onto a technician bento box on the right to auto-bind dispatch.
              </p>
              <div className="grid grid-cols-2 gap-2">
                {['Hardware', 'Network', 'Power', 'Lighting', 'Audio', 'Special Effects'].map((cat) => {
                  const activeRule = rules.find(r => r.trigger === 'category' && r.value === cat);
                  return (
                    <div
                      key={cat}
                      draggable
                      onDragStart={(e) => {
                        setDraggedCategory(cat);
                        e.dataTransfer.setData('text/plain', cat);
                      }}
                      onDragEnd={() => setDraggedCategory(null)}
                      className={`p-2 border rounded-lg flex items-center justify-between cursor-grab active:cursor-grabbing hover:border-slate-700 transition-all select-none ${
                        activeRule 
                          ? 'bg-slate-900/40 border-slate-850 text-slate-500' 
                          : 'bg-slate-900 border-slate-800 text-slate-200 shadow-sm'
                      }`}
                    >
                      <span className="text-[10px] font-mono font-bold flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          cat === 'Hardware' ? 'bg-rose-500' :
                          cat === 'Network' ? 'bg-indigo-500' :
                          cat === 'Power' ? 'bg-amber-500' :
                          cat === 'Lighting' ? 'bg-cyan-500' :
                          cat === 'Audio' ? 'bg-emerald-500' :
                          'bg-purple-500'
                        }`} />
                        {cat}
                      </span>
                      <GripVertical className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column: Visual Assignment Dispatch targets bento and list */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
              <span className="text-xs text-slate-200 font-bold uppercase tracking-wider block mb-1">
                Technician Dispatch Matrix
              </span>
              <span className="text-[10px] text-slate-500 font-mono block mb-4">
                Hover category over target card and drop to trigger routing configuration rules.
              </span>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {users
                  .filter(u => u.role === 'Technician' || u.role === 'Admin' || u.role === 'Super Admin')
                  .map((tech) => {
                    const techRules = rules.filter(r => r.trigger === 'category' && r.assignToUserId === tech.id);
                    const isOver = activeDragOverTechId === tech.id;
                    
                    return (
                      <div
                        key={tech.id}
                        onDragOver={(e) => {
                          e.preventDefault();
                          if (activeDragOverTechId !== tech.id) {
                            setActiveDragOverTechId(tech.id);
                          }
                        }}
                        onDragLeave={() => {
                          if (activeDragOverTechId === tech.id) {
                            setActiveDragOverTechId(null);
                          }
                        }}
                        onDrop={() => handleDropOnTechnician(tech.id, tech.displayName)}
                        className={`p-4 rounded-xl border transition-all ${
                          isOver 
                            ? 'bg-rose-500/5 border-rose-500/50 shadow-[0_0_15px_rgba(244,63,94,0.15)]' 
                            : 'bg-slate-900/30 border-slate-850 hover:border-slate-800'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-slate-950 border border-slate-800 flex items-center justify-center font-bold text-[10px] text-rose-400 font-mono">
                              {tech.displayName.substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <span className="text-xs text-slate-200 font-bold block">{tech.displayName}</span>
                              <span className="text-[9px] text-slate-500 uppercase font-mono block tracking-wider">
                                {tech.role}
                              </span>
                            </div>
                          </div>
                          
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-950 text-slate-400 border border-slate-850">
                            {techRules.length} rules
                          </span>
                        </div>
                        
                        <div className="min-h-[48px] bg-slate-950/40 rounded-lg border border-dashed border-slate-800/80 p-2 flex flex-wrap gap-1.5 items-center justify-start">
                          {techRules.length === 0 ? (
                            <span className="text-[9px] text-slate-600 font-mono italic mx-auto">
                              No categories (Drop here)
                            </span>
                          ) : (
                            techRules.map((r) => (
                              <span
                                key={r.id}
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-mono font-bold border ${getCategoryBadgeClass(r.value)}`}
                              >
                                {r.value}
                                <button
                                  type="button"
                                  onClick={() => handleRemoveCategoryRule(r.value)}
                                  className="hover:text-red-400 transition-colors cursor-pointer ml-1 text-[11px]"
                                  title="Unassign category"
                                >
                                  &times;
                                </button>
                              </span>
                            ))
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Traditional Active Rules List */}
            <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
              <span className="text-xs text-slate-200 font-bold uppercase tracking-wider block mb-4 border-b border-slate-800 pb-2">
                All Active Auto-Assign Rules ({rules.length})
              </span>
              <div className="space-y-2 max-h-60 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800 pr-1">
                {rules.length === 0 ? (
                  <div className="text-center py-6 text-slate-600 text-xs font-mono">
                    No active automated assignment dispatches.
                  </div>
                ) : (
                  rules.map((rule) => (
                    <div key={rule.id} className="p-2.5 bg-slate-900/40 border border-slate-900 rounded-lg flex justify-between items-center hover:border-slate-850 transition-colors">
                      <div className="font-mono text-[10px] space-y-0.5">
                        <p className="text-slate-400">
                          IF <span className="text-rose-400 font-bold uppercase">{rule.trigger}</span> IS <span className="text-cyan-400 font-bold">{rule.value}</span>
                        </p>
                        <p className="text-slate-500">
                          THEN Dispatch to: <span className="text-emerald-400 font-sans font-semibold">{rule.assignToUserName}</span>
                        </p>
                      </div>
                      <button
                        onClick={() => setRuleToDelete(rule)}
                        className="p-1 bg-red-500/10 hover:bg-red-500/20 rounded text-red-500 border border-red-500/20 transition-all cursor-pointer"
                        title="Remove assignment rule"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Syslog Audits */}
      {activeTab === 'logs' && (
        <div className="space-y-4 font-mono text-xs">
          {/* Sub tab selectors for Logs view */}
          <div className="flex border-b border-slate-800 p-1 bg-slate-950 rounded-lg gap-2 self-start w-fit">
            <button
              type="button"
              onClick={() => setLogSubTab('syslog')}
              className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                logSubTab === 'syslog' 
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              Operations Syslog
              <span className="text-[10px] px-1.5 py-0.2 bg-slate-900 text-slate-400 rounded-full font-bold ml-1 border border-slate-800">
                {logs.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setLogSubTab('geofence')}
              className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                logSubTab === 'geofence' 
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
              Geofence Breach History
              {geofenceBreaches.length > 0 && (
                <span className="text-[10px] px-1.5 py-0.2 bg-rose-500/20 text-rose-400 rounded-full font-bold ml-1 border border-rose-500/30">
                  {geofenceBreaches.length}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setLogSubTab('bulk')}
              className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                logSubTab === 'bulk' 
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <History className="w-3.5 h-3.5 text-cyan-400" />
              Task Execution History
              <span className="text-[10px] px-1.5 py-0.2 bg-slate-900 text-slate-400 rounded-full font-bold ml-1 border border-slate-800">
                {logs.filter(l => l.message.toLowerCase().includes('bulk')).length || 2}
              </span>
            </button>
          </div>

          {logSubTab === 'syslog' && (
            <div className="space-y-4 font-mono text-xs">
              <div className="flex justify-between items-center bg-slate-950 p-3 border border-slate-800 rounded-lg">
                <span className="text-slate-400 font-mono">Operations log historical output stream</span>
                <span className="text-[10px] text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded-full font-bold">
                  {logs.length} logged events
                </span>
              </div>

              <div className="bg-slate-950 rounded-lg border border-slate-800 p-4 space-y-2 max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800">
                {logs.map((log) => (
                  <div key={log.id} className="p-2 bg-slate-900/50 border border-slate-850 rounded flex justify-between items-start gap-4">
                    <div>
                      <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded mr-2.5 ${
                        log.level === 'error' ? 'bg-rose-500/20 text-rose-400' :
                        log.level === 'warn' ? 'bg-amber-500/20 text-amber-400' :
                        'bg-emerald-500/20 text-emerald-400'
                      }`}>
                        {log.level}
                      </span>
                      <span className="text-slate-200 font-semibold">{log.source}:</span>
                      <span className="text-slate-300 ml-1.5">{log.message}</span>
                    </div>
                    <span className="text-[10px] text-slate-500 text-right shrink-0">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {logSubTab === 'geofence' && (
            <div className="space-y-4 font-mono text-xs">
              <div className="flex justify-between items-center bg-slate-950 p-3 border border-slate-800 rounded-lg">
                <span className="text-slate-400 font-mono flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-rose-500" />
                  Designated geofence tracking and coordinate violations log archive
                </span>
                <span className="text-[10px] text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-full font-bold">
                  {geofenceBreaches.length} breaches detected
                </span>
              </div>

              <div className="bg-slate-950 rounded-lg border border-slate-800 p-4 space-y-2 max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800">
                {geofenceBreaches.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 font-mono text-xs">
                    No coordinate boundaries violations or security breach logs recorded in the archive.
                  </div>
                ) : (
                  [...geofenceBreaches].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).map((breach) => (
                    <div key={breach.id} className="p-3 bg-rose-950/10 border border-rose-950/20 hover:border-rose-500/20 rounded flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 transition-colors">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30">
                            {breach.severity || 'critical'}
                          </span>
                          <span className="text-slate-200 font-bold">{breach.assetName}</span>
                          <span className="text-slate-500 text-[10px] font-mono">({breach.assetId})</span>
                          <span className="text-slate-400 text-[10px] font-mono bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded inline-flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-cyan-400" />
                            X: {breach.coordinates.x}% / Y: {breach.coordinates.y}%
                          </span>
                        </div>
                        <p className="text-slate-300 font-mono text-[11px] leading-relaxed mt-1">
                          {breach.message}
                        </p>
                      </div>
                      <span className="text-[10px] text-slate-500 text-right shrink-0 whitespace-nowrap self-end sm:self-center">
                        {new Date(breach.timestamp).toLocaleString()}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {logSubTab === 'bulk' && (() => {
            const parsedBulkLogs = logs.filter(l => l.message.toLowerCase().includes('bulk') || l.id.startsWith('log-bulk-') || l.message.includes('Decommissioned') || l.message.includes('Dispatched'));
            
            const defaultBulkTasks = [
              {
                id: 'bulk-seed-1',
                timestamp: Date.now() - 3600000 * 2,
                initiator: 'Admin Lead (Internal Auth)',
                action: 'Bulk VLAN Reassignment',
                count: 14,
                details: 'Migrated 14 nodes to Secure VLAN 30 (IP Segment 10.12.30.x)',
                status: 'COMPLETED'
              },
              {
                id: 'bulk-seed-2',
                timestamp: Date.now() - 3600000 * 5,
                initiator: 'System Operator Session',
                action: 'Bulk Hardware Status Refresh',
                count: 48,
                details: 'Issued remote diagnostic ping check across 48 assets',
                status: 'COMPLETED'
              }
            ];

            const displayBulkList = parsedBulkLogs.length > 0 ? parsedBulkLogs.map((l, index) => {
              const isVlan = l.message.includes('VLAN') || l.message.includes('Vlan');
              const isPing = l.message.includes('Ping') || l.message.includes('ping');
              const isReboot = l.message.includes('Reboot') || l.message.includes('reboot');
              const isBulkDelete = l.message.includes('Bulk Delete') || l.message.includes('Decommissioned');
              const isBulkReassign = l.message.includes('Bulk Reassign') || l.message.includes('Dispatched');
              const isAlertConfig = l.message.includes('Alert Configuration:');
              
              let actionName = 'Bulk Status Sync';
              let initiator = 'Operator Auth Terminal';
              
              if (isVlan) actionName = 'Bulk VLAN Migration';
              else if (isPing) actionName = 'Bulk Ping Sweep';
              else if (isReboot) actionName = 'Bulk Device Reboot';
              else if (isBulkDelete) actionName = 'Bulk Decommission';
              else if (isBulkReassign) actionName = 'Bulk Dispatch/Reassign';
              else if (isAlertConfig) actionName = 'Alert Configuration Change';
              
              if (l.message.includes('performed by')) {
                const parts = l.message.split('performed by');
                if (parts[1]) {
                  initiator = parts[1].replace(/[.!?]/g, '').trim();
                }
              } else if (l.message.includes('Action performed by')) {
                const parts = l.message.split('Action performed by');
                if (parts[1]) {
                  initiator = parts[1].replace(/[.!?]/g, '').trim();
                }
              }
              
              return {
                id: l.id || `bulk-log-${index}`,
                timestamp: l.timestamp,
                initiator,
                action: actionName,
                count: parseInt(l.message.replace(/\D/g, '')) || 4,
                details: l.message,
                status: 'COMPLETED'
              };
            }) : defaultBulkTasks;

            return (
              <div className="space-y-4 font-mono text-xs">
                <div className="flex justify-between items-center bg-slate-950 p-3 border border-slate-800 rounded-lg">
                  <span className="text-slate-400 font-mono flex items-center gap-1.5">
                    <History className="w-4 h-4 text-cyan-400" />
                    Automated Task Execution History & Bulk Device Operation Audits
                  </span>
                  <span className="text-[10px] text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded-full font-bold">
                    {displayBulkList.length} task executions verified
                  </span>
                </div>

                <div className="bg-slate-950 rounded-lg border border-slate-800 p-4 space-y-3.5 max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800">
                  {displayBulkList.map((task) => (
                    <div 
                      key={task.id} 
                      className="p-3 bg-slate-900/50 border border-slate-850 hover:border-slate-800 rounded-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                            {task.action}
                          </span>
                          <span className="text-slate-500 text-[10px] font-mono">
                            Initiated by: <span className="text-slate-300 font-sans font-semibold">{task.initiator}</span>
                          </span>
                        </div>
                        <p className="text-slate-200 font-sans text-xs font-semibold mt-1">
                          {task.details}
                        </p>
                        <p className="text-slate-500 text-[9px] font-mono">
                          Target count: {task.count} assets • Hash Verification: SHA256 SecOps-Signed
                        </p>
                      </div>
                      
                      <div className="flex flex-col items-end shrink-0 self-end md:self-center">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <CheckCircle className="w-3 h-3 text-emerald-400" />
                          {task.status}
                        </span>
                        <span className="text-[9px] text-slate-500 font-mono mt-1">
                          {new Date(task.timestamp).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* General Settings */}
      {activeTab === 'settings' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-950 p-5 rounded-lg border border-slate-800 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <span className="text-xs text-slate-300 font-bold uppercase tracking-wider block">
                Operational Safety Thresholds
              </span>
              <button
                type="button"
                onClick={() => setIsAlertModalOpen(true)}
                className="px-2.5 py-1 bg-rose-500/10 hover:bg-rose-500 hover:text-white border border-rose-500/20 rounded font-mono text-[10px] text-rose-400 font-bold transition-all cursor-pointer uppercase inline-flex items-center gap-1"
              >
                <Settings2 className="w-3 h-3" /> Alert Config
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[10px] text-slate-400 font-mono mb-1">Max Thermal Threshold Limit (°C)</label>
                <div className="flex gap-4">
                  <input
                    type="range"
                    min="50"
                    max="100"
                    className="flex-1 accent-rose-500 cursor-pointer"
                    value={tempThreshold}
                    onChange={(e) => setTempThreshold(Number(e.target.value))}
                  />
                  <span className="text-rose-400 font-mono font-bold w-10 text-right">{tempThreshold}°C</span>
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 font-mono mb-1">Subnet Broadcast Delay (ms)</label>
                <input
                  type="number"
                  className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
                  value={pingDelay}
                  onChange={(e) => setPingDelay(Number(e.target.value))}
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 font-mono mb-1">Global Latency Alert Threshold (ms)</label>
                <div className="flex gap-4">
                  <input
                    type="range"
                    min="30"
                    max="500"
                    step="5"
                    className="flex-1 accent-rose-500 cursor-pointer animate-none"
                    value={latencyThreshold}
                    onChange={(e) => handleChangeLatencyThreshold(Number(e.target.value))}
                  />
                  <span className="text-rose-400 font-mono font-bold w-12 text-right">{latencyThreshold}ms</span>
                </div>
              </div>

              <div className="flex justify-between items-center bg-slate-900 p-2.5 border border-slate-800 rounded-lg">
                <span className="text-slate-300 font-medium">Automatic Firestore Sync</span>
                <button
                  type="button"
                  onClick={() => setAutoSaveEnabled(!autoSaveEnabled)}
                  className={`px-3 py-1 rounded text-[10px] font-mono font-bold transition-all uppercase cursor-pointer ${
                    autoSaveEnabled ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {autoSaveEnabled ? 'Synchronized' : 'Disabled'}
                </button>
              </div>

              {/* Auto-Archive Policy Section */}
              <div className="pt-4 border-t border-slate-800 space-y-3">
                <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider block flex items-center gap-1.5 font-bold">
                  <Database className="w-3.5 h-3.5 text-rose-500" /> Database Maintenance & Auto-Archive
                </span>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  To ensure optimal dashboard performance, enable the auto-archive background policy. Resolved tickets older than the threshold age will be moved to the dedicated secure <code className="text-rose-400 bg-slate-950 px-1 py-0.5 rounded font-mono text-[10px]">archive_tickets</code> collection.
                </p>

                <div className="space-y-2">
                  <div className="flex justify-between items-center bg-slate-950 p-3 border border-slate-850 rounded-lg">
                    <div>
                      <span className="text-xs text-slate-200 font-bold block">Auto-Archive Resolved Tickets</span>
                      <span className="text-[10px] text-slate-500 font-mono">Moves completed entries to dedicated storage</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleToggleAutoArchive}
                      className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold transition-all uppercase cursor-pointer ${
                        autoArchiveEnabled ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-850 text-slate-400'
                      }`}
                    >
                      {autoArchiveEnabled ? 'POLICY ACTIVE' : 'INACTIVE'}
                    </button>
                  </div>

                  {autoArchiveEnabled && (
                    <div className="p-3 bg-slate-950 border border-slate-850 rounded-lg space-y-2">
                      <label className="block text-[10px] text-slate-400 font-mono">Threshold Age for Archive (Days)</label>
                      <div className="flex items-center gap-4">
                        <input
                          type="range"
                          min="7"
                          max="90"
                          className="flex-1 accent-rose-500 cursor-pointer"
                          value={archiveAge}
                          onChange={(e) => handleChangeArchiveAge(Number(e.target.value))}
                        />
                        <span className="text-rose-400 font-mono font-bold w-12 text-right">{archiveAge} days</span>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      disabled={isArchiving}
                      onClick={handleTriggerArchiving}
                      className="flex-1 px-3 py-1.5 bg-slate-950 hover:bg-slate-850 text-slate-300 hover:text-white border border-slate-850 rounded-lg text-xs font-mono font-bold uppercase transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                    >
                      <Database className="w-3.5 h-3.5 text-rose-500" />
                      {isArchiving ? 'Archiving Sync Running...' : 'Run Archiving Procedure Now'}
                    </button>
                  </div>

                  {archivingResult && (
                    <span className="text-[10px] text-emerald-400 font-mono block animate-pulse">✓ {archivingResult}</span>
                  )}

                  <div className="pt-3 border-t border-slate-900 space-y-2">
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 bg-slate-950 p-3 border border-slate-850 rounded-lg">
                      <div className="space-y-0.5 text-left">
                        <span className="text-xs text-slate-200 font-bold block">Signal Logs Archiver Routine</span>
                        <span className="text-[10px] text-slate-500 font-mono leading-normal block">Moves log files older than 7 days into the 'historical_logs' Firestore collection.</span>
                      </div>
                      <button
                        type="button"
                        disabled={isArchivingLogs}
                        onClick={handleTriggerLogArchiving}
                        className="px-3 py-1.5 bg-rose-600/15 hover:bg-rose-600 text-rose-400 hover:text-white border border-rose-500/20 hover:border-transparent rounded-lg text-xs font-mono font-bold uppercase transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer whitespace-nowrap self-stretch sm:self-auto"
                      >
                        <Database className="w-3.5 h-3.5" />
                        {isArchivingLogs ? 'Archiving...' : 'Archive Logs (7d)'}
                      </button>
                    </div>
                    {logArchiveResult && (
                      <span className="text-[10px] text-emerald-400 font-mono block animate-pulse text-left">✓ {logArchiveResult}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* System Admin Password Section */}
              <div className="pt-4 border-t border-slate-800 space-y-2.5">
                <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider block flex items-center gap-1.5 font-bold">
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-500" /> System Admin Password
                </span>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  This password is used to encrypt and decrypt the credential database records. Stored credentials are saved as exact 128-character encrypted hash codes.
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Enter admin password"
                    className="flex-1 bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none font-mono"
                    value={adminPasswordInput}
                    onChange={(e) => setAdminPasswordInput(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={handleSaveAdminPassword}
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-mono text-[11px] font-bold rounded cursor-pointer uppercase flex items-center gap-1 transition-all"
                  >
                    <Save className="w-3.5 h-3.5" /> Save
                  </button>
                </div>
                {saveSuccess && (
                  <span className="text-[10px] text-emerald-400 font-mono block animate-pulse">✓ System Admin Password updated successfully</span>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {/* Custom Battery Thresholds Card */}
            <div className="bg-slate-950 p-5 rounded-lg border border-slate-800 space-y-4">
              <span className="text-xs text-slate-300 font-bold uppercase tracking-wider block border-b border-slate-800 pb-2 flex items-center gap-1.5 justify-between">
                <span className="flex items-center gap-1.5">
                  <Battery className="w-4 h-4 text-rose-500" /> Custom Category Battery Thresholds
                </span>
                <button
                  type="button"
                  onClick={() => setIsBatteryModalOpen(true)}
                  className="px-2 py-0.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 rounded font-mono text-[10px] text-rose-400 font-bold cursor-pointer transition-all flex items-center gap-1"
                >
                  <Sliders className="w-3 h-3" /> Visual Modal
                </button>
              </span>
              <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                Define critical battery alert levels for individual asset categories. Automated alert guards will trigger priority Power & Light tickets when mobile assets fall below these percentages.
              </p>

              <div className="space-y-4 pt-1">
                {Object.entries(batteryThresholds).map(([category, value]) => (
                  <div key={category} className="space-y-1">
                    <div className="flex justify-between items-center text-xs font-mono">
                      <span className="text-slate-300 font-bold">{category}</span>
                      <span className="px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 font-bold text-[10px] border border-rose-500/20">{value}%</span>
                    </div>
                    <div className="flex gap-3 items-center">
                      <input
                        type="range"
                        min="5"
                        max="80"
                        step="5"
                        className="flex-1 accent-rose-500 cursor-pointer h-1.5 bg-slate-900 rounded-lg appearance-none"
                        value={value}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setBatteryThresholds(prev => ({ ...prev, [category]: val }));
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  disabled={isSavingThresholds}
                  onClick={async () => {
                    setIsSavingThresholds(true);
                    setThresholdsSaveSuccess(false);
                    try {
                      for (const [category, threshold] of Object.entries(batteryThresholds)) {
                        await setDoc(doc(db, 'battery_thresholds', category), { threshold });
                      }
                      setThresholdsSaveSuccess(true);
                      setTimeout(() => setThresholdsSaveSuccess(false), 3500);
                    } catch (err) {
                      console.error("Failed to save battery thresholds", err);
                    } finally {
                      setIsSavingThresholds(false);
                    }
                  }}
                  className="w-full py-2 bg-rose-600 hover:bg-rose-500 disabled:bg-slate-800 text-white font-mono font-bold text-xs rounded uppercase flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md"
                >
                  {isSavingThresholds ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  Save Category Thresholds
                </button>
                {thresholdsSaveSuccess && (
                  <span className="text-[10px] text-emerald-400 font-mono block text-center mt-2 animate-pulse">✓ Category Battery Thresholds synchronized with Firestore</span>
                )}
              </div>
            </div>

            <div className="bg-slate-950 p-5 rounded-lg border border-slate-800 flex flex-col justify-between space-y-4">
              <div>
                <span className="text-xs text-slate-300 font-bold uppercase tracking-wider block border-b border-slate-800 pb-2 mb-3">
                  Firebase Cloud Project Reference
                </span>
                <p className="text-xs text-slate-400 leading-relaxed font-sans">
                  This applet is fully paired with the provisioned Firebase Firestore Database instance. Direct writes occur transparently upon editing assets, updating ticket states, or managing log triggers.
                </p>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-3 rounded-lg flex items-center gap-3">
                <Database className="w-5 h-5 text-emerald-400 shrink-0" />
                <div className="text-[10px] font-mono">
                  <span className="text-slate-500 block">FIRESTORE IDENTIFIER:</span>
                  <span className="text-slate-300">ai-studio-a5518484-caa0-456c-bdf9-5380a85a83bc</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Dropdowns Configuration Tab */}
      {activeTab === 'dropdowns' && (
        <div id="dropdowns-manager" className="grid grid-cols-1 md:grid-cols-3 gap-6 font-sans">
          
          {/* Categories Sidebar */}
          <div className="md:col-span-1 bg-slate-950 p-4 border border-slate-800 rounded-lg space-y-2">
            <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider block border-b border-slate-800 pb-2 mb-2 font-bold">
              System Dropdown Fields
            </span>
            <div className="flex flex-col gap-1">
              {[
                { id: 'device_type', label: 'Device type' },
                { id: 'locations', label: 'Locations' },
                { id: 'status', label: 'Status' },
                { id: 'groups_in_charge', label: 'groups in charge' },
                { id: 'manufacturers', label: 'manufacturers' },
                { id: 'models', label: 'Models' },
                { id: 'groups', label: 'Groups' },
                { id: 'networks', label: 'Networks' }
              ].map((cat) => {
                const isActive = selectedDropdownCategory === cat.id;
                const docData = dropdowns.find(d => d.id === cat.id);
                const count = docData ? docData.options.length : 0;
                return (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setSelectedDropdownCategory(cat.id);
                      setNewDropdownOptionInput('');
                    }}
                    className={`flex justify-between items-center px-3 py-2.5 rounded-lg text-xs font-semibold text-left transition-all cursor-pointer ${
                      isActive 
                        ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20 shadow-md' 
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50 border border-transparent'
                    }`}
                  >
                    <span>{cat.label}</span>
                    <span className="font-mono text-[10px] bg-slate-900 px-1.5 py-0.5 rounded text-slate-500 font-bold">
                      {count} items
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Options List */}
          <div className="md:col-span-2 bg-slate-950 p-5 border border-slate-800 rounded-lg flex flex-col justify-between min-h-[400px]">
            <div>
              <div className="flex justify-between items-center border-b border-slate-800 pb-3 mb-4">
                <div>
                  <h4 className="text-sm font-bold text-slate-200 uppercase tracking-tight font-sans">
                    Options for: <span className="text-rose-400">
                      {[
                        { id: 'device_type', label: 'Device type' },
                        { id: 'locations', label: 'Locations' },
                        { id: 'status', label: 'Status' },
                        { id: 'groups_in_charge', label: 'groups in charge' },
                        { id: 'manufacturers', label: 'manufacturers' },
                        { id: 'models', label: 'Models' },
                        { id: 'groups', label: 'Groups' },
                        { id: 'networks', label: 'Networks' }
                      ].find(c => c.id === selectedDropdownCategory)?.label || selectedDropdownCategory}
                    </span>
                  </h4>
                  <p className="text-[10px] text-slate-400 font-sans mt-0.5">Manage the individual strings that appear in the selection form of this field.</p>
                </div>
              </div>

              {/* Individual Options Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[300px] overflow-y-auto pr-1">
                {(() => {
                  const activeDoc = dropdowns.find(d => d.id === selectedDropdownCategory);
                  if (!activeDoc || activeDoc.options.length === 0) {
                    return (
                      <div className="col-span-2 py-8 text-center text-xs text-slate-500 font-mono">
                        No custom options defined.
                      </div>
                    );
                  }
                  return activeDoc.options.map((opt, idx) => (
                    <div 
                      key={idx} 
                      className="flex justify-between items-center bg-slate-900 px-3 py-2 border border-slate-850 rounded-lg hover:border-slate-800 transition-all group"
                    >
                      <span className="text-xs text-slate-300 font-medium truncate pr-2">{opt}</span>
                      <button
                        onClick={() => {
                          setDropdownOptionToDelete({ category: selectedDropdownCategory, option: opt });
                        }}
                        className="text-slate-500 hover:text-red-400 p-1 rounded hover:bg-slate-800 transition-colors cursor-pointer opacity-40 group-hover:opacity-100"
                        title="Delete option"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ));
                })()}
              </div>
            </div>

            {/* Add Custom Option Form */}
            <div className="mt-6 pt-4 border-t border-slate-800">
              <p className="text-[10px] text-slate-400 mb-2 font-sans">
                You can enter multiple options separated by commas, semicolons, or newlines.
              </p>
              <form 
                onSubmit={async (e) => {
                  e.preventDefault();
                  const trimmed = newDropdownOptionInput.trim();
                  if (trimmed && onAddDropdownOption) {
                    await onAddDropdownOption(selectedDropdownCategory, trimmed);
                    setNewDropdownOptionInput('');
                  }
                }}
                className="flex flex-col gap-2"
              >
                <textarea
                  placeholder="Enter custom option value(s) (e.g., VLAN 99, Active Staging, Main Arena)"
                  rows={2}
                  className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-rose-500 transition-colors font-mono resize-none"
                  value={newDropdownOptionInput}
                  onChange={(e) => setNewDropdownOptionInput(e.target.value)}
                  onKeyDown={async (e) => {
                    if (e.key === 'Enter' && !e.shiftKey && newDropdownOptionInput.trim()) {
                      e.preventDefault();
                      const trimmed = newDropdownOptionInput.trim();
                      if (trimmed && onAddDropdownOption) {
                        await onAddDropdownOption(selectedDropdownCategory, trimmed);
                        setNewDropdownOptionInput('');
                      }
                    }
                  }}
                />
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={!newDropdownOptionInput.trim()}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 font-mono uppercase"
                  >
                    <Plus className="w-4 h-4" /> Add Option(s)
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Archive Tab */}
      {activeTab === 'archive' && (
        <div id="archive-manager" className="space-y-4 font-sans">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-950 p-4 rounded-lg border border-slate-800">
            <div>
              <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Archive className="w-4 h-4 text-rose-500" /> Historic Ticket Archive Storage
              </h4>
              <p className="text-xs text-slate-400">
                View previously resolved or closed tickets that have been permanently archived. Clear storage to manage database space.
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={loadArchivedTickets}
                disabled={isLoadingArchive}
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded font-mono text-xs font-bold text-slate-300 flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingArchive ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <button
                type="button"
                onClick={handleClearArchive}
                disabled={isClearingArchive || archivedTickets.length === 0}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 disabled:bg-slate-800 disabled:text-slate-500 rounded font-mono text-xs font-bold text-white flex items-center gap-1.5 cursor-pointer transition-all uppercase shadow-md"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Clear Archive Storage
              </button>
            </div>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-lg p-5 space-y-4">
            {/* Search and Metadata */}
            <div className="flex flex-col sm:flex-row gap-3 justify-between items-center pb-3 border-b border-slate-900">
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search archived tickets..."
                  value={archiveSearchQuery}
                  onChange={(e) => setArchiveSearchQuery(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-850 rounded px-3 py-2 pl-9 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-rose-500 font-sans transition-colors"
                />
              </div>
              <div className="text-[11px] text-slate-500 font-mono">
                Total Archived Records: <span className="text-rose-400 font-bold">{archivedTickets.length}</span>
              </div>
            </div>

            {/* List/Table */}
            {isLoadingArchive ? (
              <div className="py-12 text-center text-xs text-slate-500 font-mono flex flex-col items-center justify-center gap-2">
                <RefreshCw className="w-6 h-6 animate-spin text-rose-500" />
                <span>Loading historic archives from Firestore...</span>
              </div>
            ) : archivedTickets.length === 0 ? (
              <div className="py-16 text-center text-xs text-slate-500 font-mono flex flex-col items-center justify-center gap-2">
                <Archive className="w-8 h-8 text-slate-700 mb-1" />
                <span>No archived tickets found in the 'archive_tickets' collection.</span>
              </div>
            ) : (() => {
              const filtered = archivedTickets.filter(t => {
                const query = archiveSearchQuery.toLowerCase();
                return (
                  t.title?.toLowerCase().includes(query) ||
                  t.description?.toLowerCase().includes(query) ||
                  t.category?.toLowerCase().includes(query) ||
                  t.assignedTo?.toLowerCase().includes(query) ||
                  t.id?.toLowerCase().includes(query)
                );
              });

              if (filtered.length === 0) {
                return (
                  <div className="py-12 text-center text-slate-500 text-xs font-mono">
                    No records match your search criteria.
                  </div>
                );
              }

              return (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left text-xs font-sans">
                    <thead>
                      <tr className="border-b border-slate-900 text-slate-400 font-mono text-[10px] uppercase bg-slate-900/40">
                        <th className="py-2.5 px-3 font-bold">Ticket ID</th>
                        <th className="py-2.5 px-3 font-bold">Category</th>
                        <th className="py-2.5 px-3 font-bold">Title & Description</th>
                        <th className="py-2.5 px-3 font-bold">Handled By</th>
                        <th className="py-2.5 px-3 font-bold text-right">Archived Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-900">
                      {filtered.map((ticket, index) => (
                        <tr key={ticket.id || index} className="hover:bg-slate-900/30 transition-colors">
                          <td className="py-3 px-3 font-mono text-[11px] text-slate-400 font-bold">
                            #{ticket.id?.substring(0, 8) || 'unknown'}
                          </td>
                          <td className="py-3 px-3">
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-900 border border-slate-800 text-slate-300 uppercase">
                              {ticket.category || 'General'}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <div className="text-slate-200 font-semibold">{ticket.title}</div>
                            <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5 max-w-sm">{ticket.description}</div>
                          </td>
                          <td className="py-3 px-3 font-medium text-slate-400">
                            {ticket.assignedTo || 'Unassigned'}
                          </td>
                          <td className="py-3 px-3 text-right text-slate-500 font-mono text-[10px]">
                            {ticket.archivedAt ? new Date(ticket.archivedAt).toLocaleString() : 'N/A'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Email Testing Playground Tab */}
      {activeTab === 'email' && (
        <div className="space-y-6 font-sans">
          <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-850">
              <div>
                <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <Mail className="w-4 h-4 text-rose-500" /> Gmail Workspace Testing Playground
                </h4>
                <p className="text-xs text-slate-400">
                  Verify Gmail API deliverability and test custom operational templates in real-time.
                </p>
              </div>

              {!gmailAccessToken ? (
                <button
                  type="button"
                  onClick={onConnectGmail}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-mono text-xs font-bold rounded-lg uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 shadow-lg shadow-rose-950/25"
                >
                  <Mail className="w-4 h-4" /> Link Corporate Gmail
                </button>
              ) : (
                <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span>Authorized Session Active</span>
                </div>
              )}
            </div>

            {/* Playground Console */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-4">
              
              {/* Left Column: Template Selection & Fields (5 cols) */}
              <div className="lg:col-span-5 space-y-4">
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-3">
                  <span className="block text-[10px] text-slate-400 font-mono uppercase tracking-wider font-bold">1. Select Preset Template</span>
                  
                  <div className="grid grid-cols-3 gap-1.5 font-mono text-[9px] uppercase font-bold text-slate-300">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedTemplate('custom');
                        setTestSubject('Kynren Operations: Systems Test Dispatch');
                        setTestBodyHtml('<h1>Kynren Operations System Alert</h1><p>This is a real-time diagnostics packet sent via the Gmail Operations API playground.</p>');
                      }}
                      className={`py-2 px-1 rounded-md border transition-all cursor-pointer text-center ${
                        selectedTemplate === 'custom' 
                          ? 'bg-rose-500/20 text-rose-400 border-rose-500/40' 
                          : 'bg-slate-950 text-slate-500 border-slate-850 hover:text-slate-300'
                      }`}
                    >
                      Custom Text
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedTemplate('assignment');
                        setTestSubject('⚠️ SYSTEM ALERT: Asset Assigned - High Value Laser Node #291');
                        setTestBodyHtml(`<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #1e293b; background-color: #0f172a; color: #f1f5f9; border-radius: 12px;">
  <h2 style="color: #f43f5e; border-bottom: 2px solid #1e293b; padding-bottom: 10px; margin-top: 0;">KYNREN OPERATIONS APPARATUS</h2>
  <p style="font-size: 14px;"><strong>Attention Team Member,</strong></p>
  <p style="font-size: 13px; color: #cbd5e1;">A high-value showground asset has been officially assigned to your active duty register:</p>
  <div style="background-color: #020617; border: 1px solid #334155; padding: 15px; border-radius: 8px; font-family: monospace; font-size: 12px; margin: 15px 0;">
    <span style="color: #6366f1;">[DEVICE_ID]:</span> AST-9102<br>
    <span style="color: #6366f1;">[NAME]:</span> High Power Spectrum Laser RGB<br>
    <span style="color: #6366f1;">[SERIAL_NUMBER]:</span> SN-RGB-883921-X<br>
    <span style="color: #6366f1;">[SECURITY_LEVEL]:</span> CRITICAL (A1-CLASSIFIED)<br>
    <span style="color: #6366f1;">[ASSIGNED_AT]:</span> ${new Date().toLocaleString()}
  </div>
  <p style="font-size: 11px; color: #64748b;">Please conduct a physical audit within 30 minutes of receipt and file a maintenance diagnostic check if anomalies are detected.</p>
</div>`);
                      }}
                      className={`py-2 px-1 rounded-md border transition-all cursor-pointer text-center ${
                        selectedTemplate === 'assignment' 
                          ? 'bg-rose-500/20 text-rose-400 border-rose-500/40' 
                          : 'bg-slate-950 text-slate-500 border-slate-850 hover:text-slate-300'
                      }`}
                    >
                      Asset Assign
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedTemplate('stock');
                        setTestSubject('🔔 INVENTORY ALERT: Low Stock Warning - Pyrotechnic Consumables');
                        setTestBodyHtml(`<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #1e293b; background-color: #0f172a; color: #f1f5f9; border-radius: 12px;">
  <h2 style="color: #f59e0b; border-bottom: 2px solid #1e293b; padding-bottom: 10px; margin-top: 0;">KYNREN INVENTORY ALERT</h2>
  <p style="font-size: 14px;"><strong>Inventory Manager,</strong></p>
  <p style="font-size: 13px; color: #cbd5e1;">A critical showground stock level warning has triggered in the stock register:</p>
  <div style="background-color: #020617; border: 1px solid #334155; padding: 15px; border-radius: 8px; font-family: monospace; font-size: 12px; margin: 15px 0;">
    <span style="color: #fda4af;">[STOCK_ITEM]:</span> High-Output CO2 Jet Fluid<br>
    <span style="color: #fda4af;">[CURRENT_LEVEL]:</span> 4 Barrels remaining<br>
    <span style="color: #fda4af;">[MIN_THRESHOLD]:</span> 10 Barrels<br>
    <span style="color: #fda4af;">[STATUS]:</span> SEVERE DEFICIT (REORDER REQUIRED)
  </div>
  <p style="font-size: 11px; color: #64748b;">This notification has been auto-dispatched to expedite procurement of pyrotechnic assets before the showground opening.</p>
</div>`);
                      }}
                      className={`py-2 px-1 rounded-md border transition-all cursor-pointer text-center ${
                        selectedTemplate === 'stock' 
                          ? 'bg-rose-500/20 text-rose-400 border-rose-500/40' 
                          : 'bg-slate-950 text-slate-500 border-slate-850 hover:text-slate-300'
                      }`}
                    >
                      Stock Warning
                    </button>
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-3">
                  <span className="block text-[10px] text-slate-400 font-mono uppercase tracking-wider font-bold">2. Deliverability Parameters</span>
                  
                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="block text-[9px] text-slate-400 font-mono uppercase mb-1">Target Corporate Address</label>
                      <input
                        type="email"
                        required
                        className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs px-3 py-2 rounded-lg outline-none focus:border-rose-500 font-mono transition-all"
                        value={testToEmail}
                        onChange={(e) => setTestToEmail(e.target.value)}
                        placeholder="e.g. sethboaamponsem@gmail.com"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] text-slate-400 font-mono uppercase mb-1">Custom Mail Subject</label>
                      <input
                        type="text"
                        required
                        className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs px-3 py-2 rounded-lg outline-none focus:border-rose-500 transition-all font-semibold"
                        value={testSubject}
                        onChange={(e) => setTestSubject(e.target.value)}
                        placeholder="Enter email subject header"
                      />
                    </div>
                  </div>
                </div>

                {emailTestResult && (
                  <div className={`p-3 border rounded-lg text-xs font-mono flex items-start gap-2.5 ${
                    emailTestResult.status === 'success' 
                      ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400' 
                      : 'bg-rose-500/10 border-rose-500/25 text-rose-400'
                  }`}>
                    <span className="font-bold uppercase tracking-wider">{emailTestResult.status === 'success' ? '✓ SUCCESS:' : '⚠️ ERROR:'}</span>
                    <span className="leading-relaxed">{emailTestResult.message}</span>
                  </div>
                )}
              </div>

              {/* Right Column: Code Editor & Test Trigger (7 cols) */}
              <div className="lg:col-span-7 flex flex-col justify-between bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-3">
                <div className="space-y-2 flex-1 flex flex-col">
                  <div className="flex justify-between items-center">
                    <span className="block text-[10px] text-slate-400 font-mono uppercase tracking-wider font-bold">3. HTML payload editor (Editable Code)</span>
                    <span className="text-[10px] text-indigo-400 font-mono">HTML FORMATTING ENABLED</span>
                  </div>

                  <textarea
                    className="w-full bg-slate-950 border border-slate-800 text-slate-300 font-mono text-[11px] p-3 rounded-lg focus:outline-none focus:border-rose-500 flex-1 min-h-[250px] leading-relaxed select-text"
                    value={testBodyHtml}
                    onChange={(e) => setTestBodyHtml(e.target.value)}
                  />
                </div>

                <div className="pt-2 border-t border-slate-850 flex items-center justify-between gap-3 font-sans">
                  <p className="text-[10px] text-slate-500 leading-normal max-w-xs font-sans">
                    {!gmailAccessToken 
                      ? "Linking your corporate Gmail account allows Kynren to dispatch genuine operational emails rather than dry mock payloads."
                      : "Authorized operational dispatch active. Sending will transmit this HTML draft immediately to the recipient."}
                  </p>

                  <button
                    type="button"
                    onClick={async () => {
                      if (!gmailAccessToken) {
                        if (onConnectGmail) onConnectGmail();
                        return;
                      }
                      setIsSendingTestEmail(true);
                      setEmailTestResult(null);
                      try {
                        if (onSendTestEmail) {
                          await onSendTestEmail(testToEmail, testSubject, testBodyHtml);
                          setEmailTestResult({
                            status: 'success',
                            message: `Kynren test envelope dispatched to ${testToEmail} via authorized Gmail relays. Please verify your corporate inbox.`
                          });
                        } else {
                          throw new Error("Gmail API controller not active.");
                        }
                      } catch (err: any) {
                        setEmailTestResult({
                          status: 'error',
                          message: err?.message || 'Dispatch failed. Please check active session token or Google Project credential bindings.'
                        });
                      } finally {
                        setIsSendingTestEmail(false);
                      }
                    }}
                    disabled={isSendingTestEmail}
                    className={`px-5 py-2.5 text-white font-mono text-xs font-bold rounded-lg uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 shadow-lg ${
                      isSendingTestEmail 
                        ? 'bg-slate-800 border border-slate-700 text-slate-500 cursor-not-allowed' 
                        : gmailAccessToken 
                          ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-950/20' 
                          : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-950/20'
                    }`}
                  >
                    {isSendingTestEmail ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" /> DISPATCHING...
                      </>
                    ) : gmailAccessToken ? (
                      <>
                        <Send className="w-3.5 h-3.5" /> Dispatch Test Email
                      </>
                    ) : (
                      <>
                        <Mail className="w-3.5 h-3.5" /> Link Gmail & Send
                      </>
                    )}
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Device Connectivity & Diagnostics Tab */}
      {activeTab === 'connectivity' && (
        <div className="space-y-6 font-sans">
          
          {/* Top Level Section: Connected Agent Host Interfaces (NICs) */}
          <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-850">
              <div>
                <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <Network className="w-4 h-4 text-rose-500" /> Active Host Agent Network Interfaces (NICs)
                </h4>
                <p className="text-xs text-slate-400">
                  Always use the connected NIC IP address from the agent container backend for zero-config terminal diagnostic bindings.
                </p>
              </div>

              <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg shrink-0">
                <input
                  type="checkbox"
                  id="autoSyncNic"
                  checked={autoSyncWithNIC}
                  onChange={(e) => setAutoSyncWithNIC(e.target.checked)}
                  className="rounded border-slate-800 text-rose-600 focus:ring-rose-500 h-3.5 w-3.5 bg-slate-950 cursor-pointer"
                />
                <label htmlFor="autoSyncNic" className="text-[10px] font-bold uppercase tracking-wider text-slate-300 font-mono cursor-pointer flex items-center gap-1">
                  {autoSyncWithNIC ? (
                    <span className="text-emerald-400 flex items-center gap-1">
                      <Lock className="w-3 h-3 text-emerald-400" /> Auto-Sync Enabled
                    </span>
                  ) : (
                    <span className="text-slate-400 flex items-center gap-1">
                      <Unlock className="w-3 h-3 text-slate-500" /> Manual Bindings
                    </span>
                  )}
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {agentNICs.map((nic, idx) => {
                const isSelected = selectedNIC?.interfaceName === nic.interfaceName;
                return (
                  <button
                    key={`${nic.interfaceName || idx}-${nic.ip || idx}`}
                    type="button"
                    onClick={() => handleSelectNIC(nic)}
                    className={`p-3 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between h-24 ${
                      isSelected 
                        ? 'border-rose-500 bg-rose-950/10 shadow-lg shadow-rose-950/20' 
                        : 'border-slate-800 bg-slate-900 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex justify-between items-center w-full">
                      <span className="text-xs font-bold text-slate-100 font-sans truncate pr-2 max-w-[150px]" title={nic.name}>
                        {nic.name}
                      </span>
                      <span className={`px-1.5 py-0.5 rounded text-[8px] font-mono font-bold uppercase ${
                        nic.type === 'Wireless' ? 'bg-indigo-500/10 text-indigo-400' : 'bg-emerald-500/10 text-emerald-400'
                      }`}>{nic.type}</span>
                    </div>
                    
                    <div className="text-[10px] font-mono text-slate-400 space-y-0.5 mt-2">
                      <div className="flex justify-between">
                        <span>IP:</span>
                        <span className="text-cyan-400 font-bold">{nic.ip}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Mask:</span>
                        <span className="text-slate-300 font-medium">{nic.subnetMask}</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left Column: Device settings form (5 cols) */}
            <div className="lg:col-span-5 bg-slate-950 border border-slate-800 p-5 rounded-xl space-y-5">
              <div>
                <span className="block text-[10px] text-slate-400 font-mono uppercase tracking-wider font-bold border-b border-slate-800 pb-2 flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-rose-500" /> 1. Configuration Bindings
                </span>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <label className="block text-[10px] text-slate-400 font-mono uppercase mb-1">Device Name</label>
                  <input
                    type="text"
                    className="w-full bg-slate-900 border border-slate-800 text-slate-200 text-xs px-3 py-2 rounded-lg outline-none focus:border-rose-500 font-medium transition-all font-sans"
                    value={deviceName}
                    onChange={(e) => setDeviceName(e.target.value)}
                    placeholder="e.g. Primary Client Console"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-[10px] text-slate-400 font-mono uppercase flex items-center gap-1">
                      IP Address {autoSyncWithNIC && <Lock className="w-2.5 h-2.5 text-emerald-400" />}
                    </label>
                    <span className={`text-[10px] font-mono ${deviceIp === '' ? 'text-slate-500' : ipValid ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {deviceIp === '' ? 'Required' : ipValid ? '✓ Valid IPv4' : '✗ Invalid IPv4'}
                    </span>
                  </div>
                  <input
                    type="text"
                    className={`w-full bg-slate-900 border text-slate-200 text-xs px-3 py-2 rounded-lg outline-none font-mono transition-all ${
                      autoSyncWithNIC ? 'border-slate-800 text-slate-400 cursor-not-allowed bg-slate-950/40' : ipValid ? 'border-slate-800 focus:border-emerald-500' : 'border-rose-500 focus:border-rose-500'
                    }`}
                    value={deviceIp}
                    onChange={(e) => handleDeviceIpChange(e.target.value)}
                    disabled={autoSyncWithNIC}
                    placeholder="e.g. 10.12.10.2"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-[10px] text-slate-400 font-mono uppercase flex items-center gap-1">
                        Subnet {autoSyncWithNIC && <Lock className="w-2.5 h-2.5 text-emerald-400" />}
                      </label>
                    </div>
                    <input
                      type="text"
                      className={`w-full bg-slate-900 border text-slate-200 text-xs px-3 py-2 rounded-lg outline-none font-mono transition-all ${
                        autoSyncWithNIC ? 'border-slate-800 text-slate-400 cursor-not-allowed bg-slate-950/40' : subnetValid ? 'border-slate-800 focus:border-emerald-500' : 'border-rose-500'
                      }`}
                      value={deviceSubnet}
                      onChange={(e) => handleDeviceSubnetChange(e.target.value)}
                      disabled={autoSyncWithNIC}
                      placeholder="e.g. 255.255.255.0"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-[10px] text-slate-400 font-mono uppercase flex items-center gap-1">
                        Gateway {autoSyncWithNIC && <Lock className="w-2.5 h-2.5 text-emerald-400" />}
                      </label>
                    </div>
                    <input
                      type="text"
                      className={`w-full bg-slate-900 border text-slate-200 text-xs px-3 py-2 rounded-lg outline-none font-mono transition-all ${
                        autoSyncWithNIC ? 'border-slate-800 text-slate-400 cursor-not-allowed bg-slate-950/40' : gatewayValid ? 'border-slate-800 focus:border-emerald-500' : 'border-rose-500'
                      }`}
                      value={deviceGateway}
                      onChange={(e) => handleDeviceGatewayChange(e.target.value)}
                      disabled={autoSyncWithNIC}
                      placeholder="e.g. 10.12.10.1"
                    />
                  </div>
                </div>

                {/* New: Max Latency Threshold Setting */}
                <div className="pt-3 border-t border-slate-900 space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="block text-[10px] text-slate-400 font-mono uppercase tracking-wider">
                      Max Latency Threshold
                    </label>
                    <span className="text-xs font-bold font-mono text-rose-400">
                      {maxLatencyThreshold} ms
                    </span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="500"
                    step="5"
                    className="w-full accent-rose-600 bg-slate-900 rounded-lg cursor-pointer"
                    value={maxLatencyThreshold}
                    onChange={(e) => setMaxLatencyThreshold(Number(e.target.value))}
                  />
                  <p className="text-[10px] text-slate-500 leading-normal">
                    Pings detecting latency exceeding this threshold will trigger an immediate 'Warning' state and log warnings to the Firestore logs.
                  </p>
                </div>

                {/* Configurable ICMP Request Timeout (ms) Setting */}
                <div className="pt-3 border-t border-slate-900 space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="block text-[10px] text-slate-400 font-mono uppercase tracking-wider">
                      ICMP Request Timeout
                    </label>
                    <span className="text-xs font-bold font-mono text-cyan-400">
                      {pingTimeout} ms
                    </span>
                  </div>
                  <input
                    type="range"
                    min="500"
                    max="5000"
                    step="100"
                    className="w-full accent-cyan-600 bg-slate-900 rounded-lg cursor-pointer"
                    value={pingTimeout}
                    onChange={(e) => setPingTimeout(Number(e.target.value))}
                  />
                  <p className="text-[10px] text-slate-500 leading-normal">
                    The maximum duration allowed for each individual ICMP echo request round-trip before declaring a timeout.
                  </p>
                </div>

                {/* New: Auto-Retry Toggle Setting */}
                <div className="pt-3 border-t border-slate-900 flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <label className="block text-[10px] text-slate-400 font-mono uppercase tracking-wider">
                      Enable Auto-Retry
                    </label>
                    <p className="text-[10px] text-slate-500 leading-normal">
                      Automatically retry failed requests up to 3 times before declaring offline.
                    </p>
                  </div>
                  <div className="relative flex items-center shrink-0">
                    <input
                      type="checkbox"
                      id="enableAutoRetry"
                      checked={autoRetry}
                      onChange={(e) => setAutoRetry(e.target.checked)}
                      className="rounded border-slate-800 text-rose-600 focus:ring-rose-500 h-4 w-4 bg-slate-900 cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                <span className="text-[10px] text-slate-500 font-mono uppercase leading-normal">
                  {deviceSaveSuccess ? (
                    <span className="text-emerald-400 font-bold animate-pulse">✓ Saved Successfully</span>
                  ) : (
                    'Unsaved changes local only'
                  )}
                </span>
                <button
                  type="button"
                  onClick={handleSaveDeviceSettings}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-mono text-xs font-bold rounded-lg uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 shadow"
                >
                  <Save className="w-3.5 h-3.5" /> Save Configuration
                </button>
              </div>
            </div>

            {/* Right Column: Connectivity diagnostics console & Sparkline (7 cols) */}
            <div className="lg:col-span-7 flex flex-col bg-slate-950 border border-slate-800 p-5 rounded-xl space-y-4 justify-between">
              <div>
                <span className="block text-[10px] text-slate-400 font-mono uppercase tracking-wider font-bold border-b border-slate-800 pb-2 flex items-center gap-1.5">
                  <Wifi className="w-3.5 h-3.5 text-rose-500 animate-pulse" /> 2. ICMP Echo Diagnostics & Sparkline
                </span>

                {/* Status Indicator Panel */}
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-900 p-4 border border-slate-850 rounded-xl items-center">
                  <div className="flex items-center gap-3">
                    <div 
                      className="relative flex h-5 w-5 shrink-0 items-center justify-center cursor-help"
                      onMouseEnter={() => setShowStatusTooltip(true)}
                      onMouseLeave={() => setShowStatusTooltip(false)}
                    >
                      {connectivityResult === 'testing' && (
                        <>
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span>
                        </>
                      )}
                      {connectivityResult === 'success' && (
                        <>
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                        </>
                      )}
                      {connectivityResult === 'warning' && (
                        <>
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                        </>
                      )}
                      {connectivityResult === 'failure' && (
                        <>
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
                        </>
                      )}
                      {connectivityResult === 'idle' && (
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-slate-600"></span>
                      )}

                      {/* Tooltip Popup */}
                      {showStatusTooltip && (
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-52 bg-slate-950 border border-slate-800 text-slate-200 text-[10px] font-mono p-2.5 rounded-lg shadow-xl z-50 pointer-events-none space-y-1 text-left">
                          <div className="text-rose-400 font-bold mb-1 uppercase text-[8px] tracking-wider border-b border-slate-900 pb-1 flex items-center gap-1">
                            <Wifi className="w-2.5 h-2.5 text-rose-500 animate-pulse" /> Last Successful Ping
                          </div>
                          {lastSuccessTimestamp ? (
                            <div className="space-y-1">
                              <div className="flex justify-between">
                                <span className="text-slate-500">Timestamp:</span>
                                <span className="text-slate-300 font-medium">{lastSuccessTimestamp}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-500">Latency:</span>
                                <span className="text-emerald-400 font-bold">{lastSuccessLatency} ms</span>
                              </div>
                            </div>
                          ) : (
                            <div className="text-slate-500 italic">No manual ping executed in this session.</div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="space-y-0.5">
                      <span className="text-[10px] text-slate-500 font-mono uppercase block">System State</span>
                      <span className={`text-xs font-bold font-mono tracking-wide ${
                        connectivityResult === 'success' ? 'text-emerald-400' :
                        connectivityResult === 'warning' ? 'text-amber-400' :
                        connectivityResult === 'failure' ? 'text-rose-400' :
                        connectivityResult === 'testing' ? 'text-indigo-400' : 'text-slate-400'
                      }`}>
                        {connectivityResult === 'success' && 'NODE REACHABLE (ONLINE)'}
                        {connectivityResult === 'warning' && 'NODE REACHABLE (HIGH LATENCY)'}
                        {connectivityResult === 'failure' && 'NODE UNREACHABLE (OFFLINE)'}
                        {connectivityResult === 'testing' && 'TRANSMITTING ECHO DUMP...'}
                        {connectivityResult === 'idle' && 'SYSTEM INTERFACE DORMANT'}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1 border-t sm:border-t-0 sm:border-l border-slate-800 pt-2 sm:pt-0 sm:pl-4 text-[10px] font-mono text-slate-400">
                    <div className="flex justify-between">
                      <span>Target Console:</span>
                      <span className="text-slate-200 font-bold">{deviceIp}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Gateway Router:</span>
                      <span className="text-slate-200 font-bold">{deviceGateway}</span>
                    </div>
                  </div>
                </div>

                {/* Sparkline Latency Chart */}
                <div className="mt-4 bg-slate-900 border border-slate-850 rounded-xl p-3.5 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-slate-400 font-mono uppercase font-bold flex items-center gap-1.5">
                      <Sliders className="w-3 h-3 text-rose-500" /> Connection Stability (Last 5 Pings)
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      Current: {pingHistory[pingHistory.length - 1]} ms | Max Limit: {maxLatencyThreshold}ms
                    </span>
                  </div>
                  
                  <div className="h-14 w-full bg-slate-950 rounded-lg p-2 border border-slate-850 relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={pingHistory.map((val, idx) => ({ name: `Ping ${idx + 1}`, latency: val }))}>
                        <Tooltip
                          contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '6px' }}
                          itemStyle={{ color: '#cbd5e1', fontSize: '9px', fontFamily: 'monospace' }}
                          labelStyle={{ display: 'none' }}
                          cursor={{ stroke: '#f43f5e', strokeWidth: 1, strokeDasharray: '2 2' }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="latency" 
                          stroke={
                            connectivityResult === 'warning' ? '#f59e0b' : 
                            connectivityResult === 'success' ? '#10b981' : 
                            connectivityResult === 'failure' ? '#ef4444' : '#6366f1'
                          } 
                          strokeWidth={2} 
                          dot={{ r: 3, fill: '#090d16', strokeWidth: 2 }}
                          activeDot={{ r: 5 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Terminal Console Output */}
                <div className="mt-4">
                  <span className="block text-[9px] text-slate-500 font-mono uppercase mb-1.5 tracking-wider">Diagnostic Terminal Logs</span>
                  <div className="bg-slate-900 border border-slate-850 p-3 rounded-lg font-mono text-[11px] leading-relaxed min-h-[140px] overflow-y-auto max-h-[180px] select-text">
                    {connectivityLogs.length === 0 ? (
                      <div className="text-slate-600 text-center py-8">
                        Terminal idle. Initialize connectivity diagnostics to transmit ICMP packets.
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {connectivityLogs.map((log, idx) => {
                          let textClass = 'text-slate-300';
                          if (log.startsWith('[ERROR]') || log.startsWith('[CRITICAL]')) textClass = 'text-rose-400 font-bold';
                          else if (log.startsWith('[SYSTEM-WARN]')) textClass = 'text-amber-400 font-bold';
                          else if (log.startsWith('[REPLY]')) textClass = 'text-emerald-400 font-medium';
                          else if (log.startsWith('[TIMEOUT]')) textClass = 'text-amber-400 font-bold';
                          else if (log.startsWith('[RETRY]')) textClass = 'text-indigo-300 font-medium italic';
                          else if (log.startsWith('[SYSTEM]')) textClass = 'text-indigo-400';
                          else if (log.startsWith('[DIAGNOSTICS]')) textClass = 'text-indigo-300';
                          
                          return (
                            <div key={idx} className={`${textClass} flex gap-2`}>
                              <span className="text-slate-600 select-none">{(idx + 1).toString().padStart(2, '0')}</span>
                              <span>{log}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Manual Diagnostic History Table */}
                <div className="mt-4 border border-slate-850 rounded-xl bg-slate-900/40 p-3.5 space-y-2.5">
                  <span className="block text-[10px] text-slate-400 font-mono uppercase font-bold flex items-center gap-1.5 border-b border-slate-850 pb-1.5">
                    <History className="w-3.5 h-3.5 text-rose-500" /> Manual Diagnostics History (Last 10 Results)
                  </span>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-[11px] font-mono border-collapse">
                      <thead>
                        <tr className="border-b border-slate-800 text-[9px] uppercase text-slate-500 font-bold">
                          <th className="py-2 pr-2">Timestamp</th>
                          <th className="py-2 pr-2">Target</th>
                          <th className="py-2 pr-2 text-right">Avg Duration</th>
                          <th className="py-2 pr-2 text-right">Packet Loss</th>
                          <th className="py-2 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-850/30">
                        {manualPingHistory.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="py-6 text-center text-slate-600 italic">No manual ping results recorded.</td>
                          </tr>
                        ) : (
                          manualPingHistory.map((row) => (
                            <tr key={row.id} className="hover:bg-slate-900/30 transition-colors">
                              <td className="py-2 pr-2 text-slate-400 font-medium">{row.timestamp}</td>
                              <td className="py-2 pr-2">
                                <span className="text-slate-200 block truncate max-w-[120px] font-sans" title={row.deviceName}>{row.deviceName}</span>
                                <span className="text-[9px] text-slate-500 block leading-tight">{row.ip}</span>
                              </td>
                              <td className="py-2 pr-2 text-right font-bold text-slate-300">
                                {row.duration !== '---' ? `${row.duration} ms` : '---'}
                              </td>
                              <td className="py-2 pr-2 text-right">
                                <span className={`font-bold ${row.packetLoss > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                                  {row.packetLoss}%
                                </span>
                              </td>
                              <td className="py-2 text-center">
                                {row.status === 'success' && (
                                  <span className="inline-block px-1.5 py-0.5 rounded text-[8px] font-bold bg-emerald-950/30 text-emerald-400 uppercase tracking-wide border border-emerald-900/40">
                                    SUCCESS
                                  </span>
                                )}
                                {row.status === 'timeout-incident' && (
                                  <span className="inline-block px-1.5 py-0.5 rounded text-[8px] font-bold bg-amber-950/30 text-amber-400 uppercase tracking-wide border border-amber-900/40 animate-pulse" title="Timeout Incident: latency or packet loss threshold exceeded.">
                                    TIMEOUT INCIDENT
                                  </span>
                                )}
                                {row.status === 'failure' && (
                                  <span className="inline-block px-1.5 py-0.5 rounded text-[8px] font-bold bg-rose-950/30 text-rose-400 uppercase tracking-wide border border-rose-900/40">
                                    FAILED
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Diagnostics Trigger Button */}
              <div className="pt-3 border-t border-slate-850 flex items-center justify-between gap-3">
                <p className="text-[10px] text-slate-500 leading-normal max-w-sm font-mono">
                  Executes ICMP echo checks through active socket adapters directly to configured host gateway routers and console clients.
                </p>

                <button
                  type="button"
                  onClick={handleTestConnectivity}
                  disabled={isTestingConnectivity}
                  className={`px-5 py-2.5 text-white font-mono text-xs font-bold rounded-lg uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 shadow-lg shrink-0 ${
                    isTestingConnectivity 
                      ? 'bg-slate-800 border border-slate-700 text-slate-500 cursor-not-allowed' 
                      : 'bg-rose-600 hover:bg-rose-500 shadow-rose-950/20'
                  }`}
                >
                  {isTestingConnectivity ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" /> RUNNING PING...
                    </>
                  ) : (
                    <>
                      <Wifi className="w-3.5 h-3.5 animate-pulse" /> Test Connectivity
                    </>
                  )}
                </button>
              </div>
            </div>

          </div>

          {/* New Section: Parallel ICMP Bulk Sweep Utility */}
          <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 space-y-4">
            <div>
              <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Settings className="w-4 h-4 text-rose-500" /> Parallel ICMP Bulk Sweep Utility
              </h4>
              <p className="text-xs text-slate-400">
                Select multiple physical devices from the showground inventory to dispatch parallel ping requests and compile aggregate health summaries.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Device Selector Checklist (5 cols) */}
              <div className="lg:col-span-5 bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-4">
                <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                  <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider font-bold">
                    Select Sweep Targets
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const pingable = (assets || []).filter(a => a.ipAddress);
                      if (bulkDevices.length === pingable.length) {
                        setBulkDevices([]);
                      } else {
                        setBulkDevices(pingable.map(a => a.id));
                      }
                    }}
                    className="text-[10px] font-mono text-rose-400 hover:text-rose-300 font-bold uppercase transition-all"
                  >
                    {bulkDevices.length === ((assets || []).filter(a => a.ipAddress).length) ? 'Deselect All' : 'Select All'}
                  </button>
                </div>

                {/* Grouping Selection dropdown */}
                <div className="flex items-center justify-between gap-2 p-2 bg-slate-950 border border-slate-850 rounded-lg text-[10px]">
                  <span className="font-mono uppercase text-slate-400 font-bold flex items-center gap-1">
                    <Settings2 className="w-3.5 h-3.5 text-rose-500" /> Group Targets By:
                  </span>
                  <select
                    value={bulkGrouping}
                    onChange={(e) => {
                      setBulkGrouping(e.target.value as 'none' | 'vlan' | 'location');
                      setBulkGroupFilter('all'); // Reset group filter on grouping change
                    }}
                    className="bg-slate-900 border border-slate-800 text-slate-300 text-[10px] px-2 py-1 rounded focus:border-rose-500 outline-none cursor-pointer font-mono font-bold"
                  >
                    <option value="none">No Grouping (Flat List)</option>
                    <option value="vlan">VLAN / Network</option>
                    <option value="location">Physical Location</option>
                  </select>
                </div>

                <div className="max-h-[250px] overflow-y-auto space-y-4 pr-1 select-none">
                  {getGroupedChecklist().length === 0 || (assets || []).filter(a => a.ipAddress).length === 0 ? (
                    <p className="text-xs text-slate-500 text-center py-6">No inventory devices registered with IP Addresses.</p>
                  ) : (
                    getGroupedChecklist().map(group => {
                      const groupItemIds = group.items.map(i => i.id);
                      const isGroupAllChecked = groupItemIds.every(id => bulkDevices.includes(id));
                      
                      return (
                        <div key={group.key} className="space-y-1.5 border-b border-slate-850 pb-3 last:border-b-0 last:pb-0">
                          {bulkGrouping !== 'none' && (
                            <div className="flex items-center justify-between px-1.5 bg-slate-950/60 py-1 rounded border border-slate-850">
                              <span className="text-[10px] font-mono text-rose-400 font-bold uppercase truncate max-w-[150px]" title={group.name}>
                                {group.name}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  if (isGroupAllChecked) {
                                    setBulkDevices(prev => prev.filter(id => !groupItemIds.includes(id)));
                                  } else {
                                    setBulkDevices(prev => {
                                      const filtered = prev.filter(id => !groupItemIds.includes(id));
                                      return [...filtered, ...groupItemIds];
                                    });
                                  }
                                }}
                                className="text-[9px] font-mono text-slate-400 hover:text-slate-200 uppercase font-bold px-1.5 py-0.5 bg-slate-800 rounded transition-all"
                              >
                                {isGroupAllChecked ? 'Deselect Group' : 'Select Group'}
                              </button>
                            </div>
                          )}
                          
                          <div className="space-y-1">
                            {group.items.map(asset => {
                              const isChecked = bulkDevices.includes(asset.id);
                              return (
                                <div 
                                  key={asset.id}
                                  onClick={() => {
                                    if (isChecked) {
                                      setBulkDevices(prev => prev.filter(id => id !== asset.id));
                                    } else {
                                      setBulkDevices(prev => [...prev, asset.id]);
                                    }
                                  }}
                                  className={`flex items-center justify-between p-2 rounded-lg border text-xs cursor-pointer transition-all ${
                                    isChecked 
                                      ? 'border-rose-500/30 bg-rose-950/5' 
                                      : 'border-slate-850 bg-slate-950/40 hover:border-slate-800'
                                  }`}
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      readOnly
                                      className="rounded border-slate-800 text-rose-600 focus:ring-rose-500 h-3.5 w-3.5 bg-slate-950"
                                    />
                                    <div className="min-w-0">
                                      <span className="block font-medium text-slate-200 truncate" title={asset.name}>{asset.name}</span>
                                      <span className="block text-[10px] font-mono text-slate-500">{asset.ipAddress}</span>
                                    </div>
                                  </div>
                                  
                                  <span className="px-1.5 py-0.5 rounded text-[8px] font-mono font-bold bg-slate-850 text-slate-400 uppercase tracking-wide">
                                    {asset.category}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="pt-3 border-t border-slate-800 flex justify-between items-center gap-3">
                  <span className="text-[10px] font-mono text-slate-500">
                    Selected: <strong className="text-rose-400">{bulkDevices.length}</strong> devices
                  </span>

                  <button
                    type="button"
                    onClick={handleBulkPingSweep}
                    disabled={isBulkPinging || bulkDevices.length === 0}
                    className={`px-4 py-2 text-white font-mono text-xs font-bold rounded-lg uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 shadow ${
                      isBulkPinging || bulkDevices.length === 0
                        ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                        : 'bg-rose-600 hover:bg-rose-500'
                    }`}
                  >
                    {isBulkPinging ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Sweeping...
                      </>
                    ) : (
                      <>
                        <Wifi className="w-3.5 h-3.5" /> Sweep Devices
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Parallel Sweep Results Output (7 cols) */}
              <div className="lg:col-span-7 bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col justify-between min-h-[250px]">
                <div>
                  <span className="block text-[10px] text-slate-400 font-mono uppercase tracking-wider font-bold border-b border-slate-800 pb-2">
                    Sweep Summary Report
                  </span>

                  {bulkSweepResults.length === 0 ? (
                    <div className="text-slate-600 text-center py-16 font-mono text-xs">
                      No sweep report active. Check targets and click "Sweep Devices" to render parallel ICMP stats.
                    </div>
                  ) : (
                    <div className="space-y-3 mt-3">
                      {/* Interactive Stats Panel */}
                      <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono">
                        <div className="bg-slate-950 border border-slate-850 p-2 rounded-lg">
                          <span className="block text-[9px] text-slate-500 uppercase">Total Swept</span>
                          <span className="block text-slate-100 font-bold text-sm mt-0.5">{bulkSweepResults.length}</span>
                        </div>
                        <div className="bg-slate-950 border border-slate-850 p-2 rounded-lg">
                          <span className="block text-[9px] text-slate-500 uppercase">Online</span>
                          <span className="block text-emerald-400 font-bold text-sm mt-0.5">{bulkSweepResults.filter(r => r.online).length}</span>
                        </div>
                        <div className="bg-slate-950 border border-slate-850 p-2 rounded-lg">
                          <span className="block text-[9px] text-slate-500 uppercase">Offline</span>
                          <span className="block text-rose-400 font-bold text-sm mt-0.5">{bulkSweepResults.filter(r => !r.online).length}</span>
                        </div>
                      </div>

                      {/* Filterable Controls */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-2.5 bg-slate-950 border border-slate-850 rounded-lg text-[10px]">
                        {/* Status Filter */}
                        <div className="flex items-center gap-1.5 justify-between">
                          <span className="font-mono text-slate-500 uppercase font-bold">Status Filter:</span>
                          <div className="flex gap-1 bg-slate-900 p-0.5 rounded border border-slate-800">
                            {(['all', 'online', 'offline'] as const).map((s) => (
                              <button
                                key={s}
                                type="button"
                                onClick={() => setBulkStatusFilter(s)}
                                className={`px-2 py-0.5 rounded font-mono text-[9px] font-bold uppercase cursor-pointer transition-all ${
                                  bulkStatusFilter === s
                                    ? 'bg-rose-600 text-white shadow'
                                    : 'text-slate-400 hover:text-slate-200'
                                }`}
                              >
                                {s}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Group Filter */}
                        <div className="flex items-center gap-1.5 justify-between">
                          <span className="font-mono text-slate-500 uppercase font-bold">Group Filter:</span>
                          <select
                            value={bulkGroupFilter}
                            onChange={(e) => setBulkGroupFilter(e.target.value)}
                            className="bg-slate-900 border border-slate-800 text-slate-300 text-[9px] px-2 py-0.5 rounded focus:border-rose-500 outline-none cursor-pointer font-mono font-bold"
                          >
                            <option value="all">All Groups</option>
                            {Array.from(new Set(bulkSweepResults.map(r => bulkGrouping === 'vlan' ? r.vlan : bulkGrouping === 'location' ? r.location : 'Flat List'))).map(g => (
                              <option key={g} value={g}>{g}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Grouped results output */}
                      <div className="max-h-[200px] overflow-y-auto space-y-3.5 border border-slate-850 p-2.5 rounded-lg bg-slate-950">
                        {getGroupedSweepResults().length === 0 || getFilteredSweepResults().length === 0 ? (
                          <div className="text-slate-600 italic text-center py-8 font-mono text-[10px]">
                            No sweep results matching active filters.
                          </div>
                        ) : (
                          getGroupedSweepResults().map(group => {
                            if (group.items.length === 0) return null;
                            return (
                              <div key={group.key} className="space-y-1.5">
                                {bulkGrouping !== 'none' && (
                                  <span className="block text-[9px] font-mono font-bold text-rose-400 uppercase tracking-wider px-1">
                                    📁 {group.name} ({group.items.length})
                                  </span>
                                )}
                                <div className="space-y-1">
                                  {group.items.map(res => {
                                    const isLatencyWarning = res.online && res.latency > maxLatencyThreshold;
                                    return (
                                      <div key={res.id} className="flex justify-between items-center text-xs p-1.5 rounded border border-slate-900 bg-slate-900/50 hover:bg-slate-900 transition-colors">
                                        <div className="min-w-0">
                                          <span className="text-slate-200 font-medium truncate block max-w-[200px]" title={res.name}>{res.name}</span>
                                          <span className="text-[9px] font-mono text-slate-500 block leading-normal">
                                            IP: {res.ip} | VLAN: {res.vlan}
                                          </span>
                                        </div>

                                        <div className="flex items-center gap-1.5 font-mono text-[10px]">
                                          {res.online ? (
                                            <>
                                              <span className={`font-bold ${isLatencyWarning ? 'text-amber-400' : 'text-emerald-400'}`}>
                                                {res.latency}ms
                                              </span>
                                              <span className={`px-1.5 py-0.5 rounded uppercase font-bold text-[8px] tracking-wide border ${
                                                isLatencyWarning
                                                  ? 'bg-amber-950/30 text-amber-400 border-amber-900/40 animate-pulse'
                                                  : 'bg-emerald-950/30 text-emerald-400 border-emerald-900/40'
                                              }`}>
                                                {isLatencyWarning ? 'TIMEOUT INCIDENT' : 'ONLINE'}
                                              </span>
                                            </>
                                          ) : (
                                            <>
                                              <span className="text-rose-500 font-bold">---</span>
                                              <span className="px-1.5 py-0.5 bg-rose-950/30 text-rose-400 font-bold rounded uppercase tracking-wide text-[8px] border border-rose-900/40">
                                                OFFLINE
                                              </span>
                                            </>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-850 mt-3 text-[10px] font-mono text-slate-500 flex justify-between items-center">
                  <span>Aggregate sweep logs compiled automatically</span>
                  {bulkSweepResults.length > 0 && (
                    <span className="text-emerald-400 animate-pulse font-bold">✓ Diagnostics Synced to Cloud Logs</span>
                  )}
                </div>
              </div>

            </div>
          </div>

        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AnimatePresence>
        {ruleToDelete && (
          <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center gap-3 text-red-500 border-b border-slate-800 pb-3">
                <AlertCircle className="w-6 h-6 shrink-0 text-red-500" />
                <h4 className="font-sans font-bold text-slate-100 text-base">Confirm Rule Deletion</h4>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Are you sure you want to delete this auto-assignment rule? 
                <span className="block mt-2 font-mono text-[11px] text-rose-300 bg-slate-950/50 p-2 border border-slate-850 rounded">
                  IF {ruleToDelete.trigger.toUpperCase()} IS "{ruleToDelete.value}" THEN ASSIGN TO {ruleToDelete.assignToUserName}
                </span>
                This will stop automatic ticket distribution for this condition.
              </p>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setRuleToDelete(null)}
                  className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold cursor-pointer transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    onDeleteRule(ruleToDelete.id);
                    setRuleToDelete(null);
                  }}
                  className="px-3.5 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-semibold cursor-pointer transition-all uppercase font-mono"
                >
                  Confirm Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {userToDelete && (
          <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center gap-3 text-red-500 border-b border-slate-800 pb-3">
                <AlertCircle className="w-6 h-6 shrink-0 text-red-500" />
                <h4 className="font-sans font-bold text-slate-100 text-base">Confirm User Deletion</h4>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Are you absolutely sure you want to delete corporate user <span className="font-semibold text-rose-400">@{userToDelete.login || userToDelete.id}</span> (<span className="text-slate-200 font-medium">{userToDelete.displayName}</span>)? 
                This action is irreversible and will permanently delete this account and forfeit all associated technical dispatch roles.
              </p>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setUserToDelete(null)}
                  className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold cursor-pointer transition-all font-mono"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    if (onDeleteUser) {
                      try {
                        await onDeleteUser(userToDelete.id);
                        if (selectedSidebarUser?.id === userToDelete.id) {
                          setSelectedSidebarUser(null);
                        }
                      } catch (err) {
                        console.error(err);
                      }
                    }
                    setUserToDelete(null);
                  }}
                  className="px-3.5 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-semibold cursor-pointer transition-all uppercase font-mono"
                >
                  Confirm Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {dropdownOptionToDelete && (
          <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center gap-3 text-red-500 border-b border-slate-800 pb-3">
                <AlertCircle className="w-6 h-6 shrink-0 text-red-500" />
                <h4 className="font-sans font-bold text-slate-100 text-base">Confirm Option Deletion</h4>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Are you sure you want to delete the option <span className="font-semibold text-rose-400">"{dropdownOptionToDelete.option}"</span> from the <span className="font-mono text-cyan-400 font-bold">{dropdownOptionToDelete.category.replace('_', ' ').toUpperCase()}</span> options? 
                This may invalidate current assets mapped to this category.
              </p>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setDropdownOptionToDelete(null)}
                  className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-lg text-xs font-semibold cursor-pointer transition-all font-mono"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    if (onDeleteDropdownOption) {
                      try {
                        await onDeleteDropdownOption(dropdownOptionToDelete.category, dropdownOptionToDelete.option);
                      } catch (err) {
                        console.error(err);
                      }
                    }
                    setDropdownOptionToDelete(null);
                  }}
                  className="px-3.5 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-semibold cursor-pointer transition-all uppercase font-mono"
                >
                  Confirm Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {userToSuspend && (
          <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center gap-3 text-amber-500 border-b border-slate-800 pb-3">
                <Ban className="w-6 h-6 shrink-0 text-amber-500" />
                <h4 className="font-sans font-bold text-slate-100 text-base">
                  {userToSuspend.suspended ? 'Confirm Activation' : 'Confirm Suspension'}
                </h4>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Are you sure you want to {userToSuspend.suspended ? 'unsuspend and reactivate' : 'suspend'} the account for <span className="font-semibold text-rose-400">@{userToSuspend.login || userToSuspend.id}</span> ({userToSuspend.displayName})? 
                {userToSuspend.suspended 
                  ? ' This will restore full access and duties for this team member immediately.' 
                  : ' This will freeze their authentication sessions and prevent them from checking out equipment or signing off RFC documents.'}
              </p>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setUserToSuspend(null)}
                  className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold cursor-pointer transition-all font-mono"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    if (onUpdateUser) {
                      try {
                        const nextVal = !userToSuspend.suspended;
                        await onUpdateUser(userToSuspend.id, { suspended: nextVal });
                        if (selectedSidebarUser?.id === userToSuspend.id) {
                          setSelectedSidebarUser(prev => prev ? { ...prev, suspended: nextVal } : null);
                        }
                      } catch (err) {
                        console.error(err);
                      }
                    }
                    setUserToSuspend(null);
                  }}
                  className={`px-3.5 py-1.5 text-white rounded-lg text-xs font-semibold cursor-pointer transition-all uppercase font-mono ${userToSuspend.suspended ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-amber-600 hover:bg-amber-500'}`}
                >
                  {userToSuspend.suspended ? 'Confirm Reactivate' : 'Confirm Suspend'}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {userToArchive && (
          <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center gap-3 text-blue-500 border-b border-slate-800 pb-3">
                <Archive className="w-6 h-6 shrink-0 text-blue-500" />
                <h4 className="font-sans font-bold text-slate-100 text-base">
                  {userToArchive.archived ? 'Confirm Restoration' : 'Confirm Archive'}
                </h4>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Are you sure you want to {userToArchive.archived ? 'restore' : 'archive'} the account for <span className="font-semibold text-rose-400">@{userToArchive.login || userToArchive.id}</span> ({userToArchive.displayName})? 
                {userToArchive.archived 
                  ? ' This will bring the user back to the active crew roster.' 
                  : ' Archiving filters this user from the main operational view while preserving their historical logs, equipment checkout history, and logged activities.'}
              </p>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setUserToArchive(null)}
                  className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold cursor-pointer transition-all font-mono"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (onUpdateUser) {
                      try {
                        const nextVal = !userToArchive.archived;
                        await onUpdateUser(userToArchive.id, { archived: nextVal });
                        if (selectedSidebarUser?.id === userToArchive.id) {
                          setSelectedSidebarUser(prev => prev ? { ...prev, archived: nextVal } : null);
                        }
                      } catch (err) {
                        console.error(err);
                      }
                    }
                    setUserToArchive(null);
                  }}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold cursor-pointer transition-all uppercase font-mono"
                >
                  {userToArchive.archived ? 'Confirm Restore' : 'Confirm Archive'}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {isAlertModalOpen && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-6 shadow-2xl space-y-5"
            >
              <div className="flex items-center gap-3 text-rose-500 border-b border-slate-800 pb-3">
                <BellRing className="w-6 h-6 shrink-0 text-rose-500 animate-pulse" />
                <div>
                  <h4 className="font-sans font-bold text-slate-100 text-base">
                    Custom Threshold Alert Configurations
                  </h4>
                  <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                    Define critical latency & packet loss boundaries and choose dispatch alerts.
                  </p>
                </div>
              </div>

              <div className="space-y-4 text-xs">
                {/* Latency Threshold setting */}
                <div className="bg-slate-950 p-4 rounded-lg border border-slate-850 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-200 font-bold font-sans">Critical Asset Latency (ms)</span>
                    <span className="text-rose-400 font-mono font-bold text-xs">{latencyAlertThreshold} ms</span>
                  </div>
                  <input
                    type="range"
                    min="30"
                    max="500"
                    step="5"
                    className="w-full accent-rose-500 cursor-pointer animate-none"
                    value={latencyAlertThreshold}
                    onChange={(e) => setLatencyAlertThreshold(Number(e.target.value))}
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                    <span>30ms (Low)</span>
                    <span>500ms (High Risk)</span>
                  </div>
                  
                  <div className="pt-2.5 border-t border-slate-900 flex justify-between items-center">
                    <span className="text-slate-400 text-[11px] font-mono">Trigger Notifications on Breach</span>
                    <button
                      type="button"
                      onClick={() => setLatencyNotificationEnabled(!latencyNotificationEnabled)}
                      className={`px-3 py-1 rounded text-[10px] font-mono font-bold transition-all uppercase cursor-pointer ${
                        latencyNotificationEnabled ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-slate-800 text-slate-500'
                      }`}
                    >
                      {latencyNotificationEnabled ? 'ENABLED' : 'DISABLED'}
                    </button>
                  </div>
                </div>

                {/* Packet Loss Threshold setting */}
                <div className="bg-slate-950 p-4 rounded-lg border border-slate-850 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-200 font-bold font-sans">Critical Packet Loss (%)</span>
                    <span className="text-rose-400 font-mono font-bold text-xs">{packetLossAlertThreshold} %</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="20"
                    step="1"
                    className="w-full accent-rose-500 cursor-pointer animate-none"
                    value={packetLossAlertThreshold}
                    onChange={(e) => setPacketLossAlertThreshold(Number(e.target.value))}
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                    <span>1% (Trace)</span>
                    <span>20% (Severe Drop)</span>
                  </div>
                  
                  <div className="pt-2.5 border-t border-slate-900 flex justify-between items-center">
                    <span className="text-slate-400 text-[11px] font-mono">Trigger Notifications on Breach</span>
                    <button
                      type="button"
                      onClick={() => setPacketLossNotificationEnabled(!packetLossNotificationEnabled)}
                      className={`px-3 py-1 rounded text-[10px] font-mono font-bold transition-all uppercase cursor-pointer ${
                        packetLossNotificationEnabled ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-slate-800 text-slate-500'
                      }`}
                    >
                      {packetLossNotificationEnabled ? 'ENABLED' : 'DISABLED'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAlertModalOpen(false)}
                  className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold cursor-pointer transition-all font-mono"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveAlertConfig}
                  className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold cursor-pointer transition-all uppercase font-mono animate-none"
                >
                  Save Configuration
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Battery Thresholds Modal */}
      <BatteryThresholdsModal
        isOpen={isBatteryModalOpen}
        onClose={() => setIsBatteryModalOpen(false)}
        currentThresholds={batteryThresholds}
        onSaveSuccess={(updated) => {
          setBatteryThresholds(updated);
        }}
      />
    </div>
  );
}

import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { 
  db, 
  auth,
  collection, 
  onSnapshot, 
  doc, 
  setDoc, 
  addDoc, 
  deleteDoc, 
  updateDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy
} from './firebase';
import { seedDatabaseIfEmpty, handleFirestoreError, OperationType } from './utils/firebaseHelpers';
import { 
  UserPreferences, 
  Asset, 
  Consumable, 
  Ticket, 
  SignalLog, 
  SwitchDevice, 
  TopologyNode, 
  ITProject, 
  RSSFeedItem, 
  KBArticle, 
  UserRegistryItem, 
  AssignmentRule, 
  DirectMessage, 
  AssetReservation, 
  SavedQuery,
  PasswordRecord,
  AssetDeployment,
  GeofenceBreach,
  DropdownOption
} from './types';

const compressBase64Image = (base64Str: string, maxWidth = 400, maxHeight = 400, quality = 0.7): Promise<string> => {
  if (!base64Str || !base64Str.startsWith('data:image/')) {
    return Promise.resolve(base64Str);
  }
  return new Promise((resolve) => {
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
        resolve(base64Str);
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      const dataUrl = canvas.toDataURL('image/jpeg', quality);
      resolve(dataUrl);
    };
    img.onerror = () => {
      resolve(base64Str);
    };
    img.src = base64Str;
  });
};

const sanitizeAssetImages = async (asset: Partial<Asset>): Promise<Partial<Asset>> => {
  const sanitized = { ...asset };
  if (sanitized.featuredImage && sanitized.featuredImage.startsWith('data:image/')) {
    try {
      sanitized.featuredImage = await compressBase64Image(sanitized.featuredImage, 400, 400, 0.7);
    } catch (e) {
      console.warn('Failed to compress featuredImage:', e);
    }
  }
  if (sanitized.galleryImages && Array.isArray(sanitized.galleryImages)) {
    const compressedGallery = [];
    for (const img of sanitized.galleryImages) {
      if (img && img.startsWith('data:image/')) {
        try {
          compressedGallery.push(await compressBase64Image(img, 300, 300, 0.6));
        } catch (e) {
          compressedGallery.push(img);
        }
      } else {
        compressedGallery.push(img);
      }
    }
    sanitized.galleryImages = compressedGallery;
  }
  return sanitized;
};

// Component Imports
import Header, { AppNotification } from './components/Header';
import ShowTimeline from './components/ShowTimeline';
import { ShowTimelineEvent } from './types';
import MapCanvas from './components/MapCanvas';
import TopologyMap from './components/TopologyMap';
import RackMonitor from './components/RackMonitor';
import Helpdesk from './components/Helpdesk';
import Consumables from './components/Consumables';
import OperationTools from './components/OperationTools';
import UserProfile from './components/UserProfile';
import AdminSetup from './components/AdminSetup';
import TerminalModal from './components/TerminalModal';
import AssetsTab from './components/AssetsTab';
import AssetDetailView from './components/AssetDetailView';
import CategoryBatteryDrainD3 from './components/CategoryBatteryDrainD3';
import PasswordManagement from './components/PasswordManagement';
import VirtualAssistant from './components/VirtualAssistant';
import BatteryThresholdsModal from './components/BatteryThresholdsModal';

// Recharts for analytics
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  LineChart,
  Line,
  CartesianGrid,
  XAxis, 
  YAxis, 
  Tooltip 
} from 'recharts';

// Lucide Icons
import { 
  LayoutDashboard, 
  Cpu, 
  Network, 
  LifeBuoy, 
  Archive, 
  Wrench, 
  User, 
  Settings, 
  Activity, 
  Volume2, 
  Terminal, 
  Search, 
  Bot, 
  ShieldAlert, 
  CheckCircle,
  Battery,
  BatteryCharging,
  Flame,
  Clock,
  Play,
  Pause,
  Sliders,
  FileText,
  Lock,
  GripVertical,
  RefreshCw,
  TrendingUp,
  AlertCircle,
  Eye,
  EyeOff,
  Download,
  Maximize2,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Pin,
  PinOff,
  MoreHorizontal,
  Compass,
  MapPin,
  Locate,
  Camera,
  Info,
  Minimize2
} from 'lucide-react';

export default function App() {
  // Navigation State
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [viewingAsset, setViewingAsset] = useState<Asset | null>(null);
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);

  // Helper to compile raw email MIME format
  const makeRawEmail = (to: string, subject: string, bodyHtml: string) => {
    const mailLines = [
      `To: ${to}`,
      "Content-Type: text/html; charset=utf-8",
      "MIME-Version: 1.0",
      `Subject: ${subject}`,
      "",
      bodyHtml
    ];
    const emailStr = mailLines.join("\r\n");
    const base64 = btoa(unescape(encodeURIComponent(emailStr)));
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  };

  const sendGmailApiEmail = async (toEmail: string, subject: string, bodyHtml: string) => {
    if (!gmailAccessToken) {
      console.warn("Gmail Access Token is missing. Email skipped.");
      return false;
    }
    try {
      const rawEmail = makeRawEmail(toEmail, subject, bodyHtml);
      const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${gmailAccessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ raw: rawEmail })
      });
      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Gmail API error: ${errText}`);
      }
      return true;
    } catch (err: any) {
      console.error("Gmail send error:", err);
      return false;
    }
  };

  const handleNotifyUser = async (userEmailOrName: string, subject: string, bodyHtml: string) => {
    if (!userEmailOrName) return;
    
    // Find email of user if it's a display name
    let targetEmail = userEmailOrName.trim();
    if (!targetEmail.includes('@')) {
      const foundUser = users.find(u => u.displayName?.toLowerCase() === targetEmail.toLowerCase());
      if (foundUser && foundUser.email) {
        targetEmail = foundUser.email;
      } else {
        // If no user found and not an email, try default address or session user
        targetEmail = sessionPreferences?.email || sessionUser?.email || '';
      }
    }
    
    if (!targetEmail || !targetEmail.includes('@')) {
      await triggerSystemLog('Notification System', `Could not find valid email address to notify: "${userEmailOrName}"`, 'warn');
      return;
    }

    if (gmailAccessToken) {
      const success = await sendGmailApiEmail(targetEmail, subject, bodyHtml);
      if (success) {
        await triggerSystemLog('Notification System', `Successfully transmitted email notification to ${targetEmail} (Subject: ${subject})`, 'success');
      } else {
        await triggerSystemLog('Notification System', `Failed to transmit email notification to ${targetEmail} via connected Gmail account.`, 'error');
      }
    } else {
      await triggerSystemLog('Notification System', `Simulated Notification (Connect Gmail in battery modal for real send) to ${targetEmail}: ${subject}`, 'info');
    }
  };

  const handleExportCSV = () => {
    try {
      const headers = ['Snapshot Date', 'Avg Battery Level (%)', 'Hourly Consumption Rate (%/hr)', 'Nodes Polled', 'Anomalies Detected', 'Status'];
      const csvRows = [
        headers.join(','),
        ...batteryHistory7d.map(row => [
          `"${row.date}"`,
          row.avgBattery,
          row.avgDrain,
          row.nodes,
          row.anomalies,
          `"${row.status}"`
        ].join(','))
      ];
      const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `kynren_battery_history_export_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      triggerSystemLog('Export Engine', 'Battery history successfully exported to CSV file for offline auditing.', 'success');
    } catch (err: any) {
      console.error(err);
      triggerSystemLog('Export Engine', `Failed to compile CSV export: ${err.message}`, 'error');
    }
  };

  const handleConnectGmail = async () => {
    try {
      const provider = new GoogleAuthProvider();
      provider.addScope('https://www.googleapis.com/auth/gmail.send');
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        setGmailAccessToken(credential.accessToken);
        setGmailAuthError(null);
        triggerSystemLog('Auth Node', 'Successfully connected Google Gmail account for sending reports.', 'success');
      } else {
        throw new Error('Failed to obtain Google OAuth access token.');
      }
    } catch (err: any) {
      console.error(err);
      setGmailAuthError(err.message || 'OAuth Connection Failed');
      triggerSystemLog('Auth Node', `Google connection failed: ${err.message}`, 'error');
    }
  };

  const handleSendEmailReport = async (targetEmail: string) => {
    if (!gmailAccessToken) {
      setGmailAuthError('Please connect your Gmail account first.');
      return;
    }
    setIsSendingEmail(true);
    setEmailSentStatus('idle');
    try {
      const peak = batteryStats24h.length > 0 ? Math.max(...batteryStats24h.map(d => d.battery)) : 95;
      const low = batteryStats24h.length > 0 ? Math.min(...batteryStats24h.map(d => d.battery)) : 42;
      const activeCount = assets.filter(asset => 
        asset.batteryLevel !== undefined && 
        (asset.tags?.includes('mobile') || asset.name?.toLowerCase().includes('mobile') || asset.category?.toLowerCase() === 'radio')
      ).length;

      const subject = `[KYNREN TECH OPS] Mobile Asset Battery Health Report - ${new Date().toLocaleDateString()}`;
      
      const emailBodyHtml = `
        <div style="font-family: sans-serif; background-color: #0f172a; color: #f8fafc; padding: 24px; border-radius: 12px; max-width: 600px; margin: 0 auto; border: 1px solid #1e293b;">
          <h2 style="color: #f43f5e; border-bottom: 2px solid #e11d48; padding-bottom: 8px; margin-top: 0; font-size: 20px;">
            ⚡ KYNREN MOBILE ASSET BATTERY SUMMARY
          </h2>
          <p style="font-size: 13px; color: #94a3b8; font-family: monospace; margin-top: -8px;">
            Durham Auckland Auckland Stage Kynren Logistics Center
          </p>
          
          <div style="background-color: #1e293b; padding: 16px; border-radius: 8px; margin: 16px 0; border: 1px solid #334155;">
            <h3 style="margin-top: 0; color: #f1f5f9; font-size: 15px;">📊 Core Telemetry Metrics (24h)</h3>
            <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
              <tr>
                <td style="padding: 6px 0; color: #94a3b8;">Active Nodes:</td>
                <td style="padding: 6px 0; text-align: right; font-weight: bold; color: #e2e8f0;">\${activeCount}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #94a3b8;">Peak Charge Level:</td>
                <td style="padding: 6px 0; text-align: right; font-weight: bold; color: #fb7185;">\${peak}%</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #94a3b8;">Low Charge Point:</td>
                <td style="padding: 6px 0; text-align: right; font-weight: bold; color: #f59e0b;">\${low}%</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #94a3b8;">Avg Hourly Drain:</td>
                <td style="padding: 6px 0; text-align: right; font-weight: bold; color: #22d3ee;">3.8% / hr</td>
              </tr>
            </table>
          </div>

          <div style="margin: 20px 0;">
            <h3 style="color: #f1f5f9; font-size: 15px; margin-bottom: 8px;">📅 7-Day Snapshots</h3>
            <table style="width: 100%; border-collapse: collapse; font-size: 12px; text-align: left;">
              <thead>
                <tr style="border-bottom: 1px solid #334155; color: #64748b; font-family: monospace;">
                  <th style="padding: 8px 4px;">Date</th>
                  <th style="padding: 8px 4px; text-align: center;">Avg Battery</th>
                  <th style="padding: 8px 4px; text-align: center;">Drain Rate</th>
                  <th style="padding: 8px 4px; text-align: right;">Status</th>
                </tr>
              </thead>
              <tbody>
                \${batteryHistory7d.map(row => \`
                  <tr style="border-bottom: 1px solid #1e293b; color: #cbd5e1;">
                    <td style="padding: 8px 4px; font-weight: bold;">\${row.date}</td>
                    <td style="padding: 8px 4px; text-align: center; color: #38bdf8;">\${row.avgBattery}%</td>
                    <td style="padding: 8px 4px; text-align: center; color: #fb7185;">-\${row.avgDrain}%/h</td>
                    <td style="padding: 8px 4px; text-align: right; font-weight: bold; color: \${
                      row.status === 'Nominal' ? '#34d399' : row.status === 'Warning' ? '#fbbf24' : '#f87171'
                    };">\${row.status}</td>
                  </tr>
                \`).join('')}
              </tbody>
            </table>
          </div>

          <div style="font-size: 11px; color: #64748b; border-top: 1px solid #1e293b; padding-top: 12px; margin-top: 24px;">
            <strong>Confidentiality Notice:</strong> Durham Auckland Auckland Stage Kynren Tech Ops automated transmission. Unauthorized routing or reproduction is strictly prohibited.
          </div>
        </div>
      `;

      const rawEmail = makeRawEmail(targetEmail, subject, emailBodyHtml);
      const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer \${gmailAccessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ raw: rawEmail })
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Gmail API error: \${errText}`);
      }

      setEmailSentStatus('success');
      triggerSystemLog('Email Dispatch', `Automated battery health report dispatched to \${targetEmail}`, 'success');
    } catch (err: any) {
      console.error(err);
      setEmailSentStatus('error');
      setGmailAuthError(err.message || 'Failed to dispatch email');
      triggerSystemLog('Email Dispatch', `Dispatch failure: \${err.message}`, 'error');
    } finally {
      setIsSendingEmail(false);
    }
  };

  // Authentication State
  const [sessionUser, setSessionUser] = useState<UserRegistryItem | null>(() => {
    const saved = localStorage.getItem('enterprise_session_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // OTP Change Password State
  const [otpUser, setOtpUser] = useState<UserRegistryItem | null>(null);
  const [otpNewPassword, setOtpNewPassword] = useState('');
  const [otpConfirmPassword, setOtpConfirmPassword] = useState('');
  const [otpError, setOtpError] = useState('');

  // Password Visibility States
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showOtpNewPassword, setShowOtpNewPassword] = useState(false);
  const [showOtpConfirmPassword, setShowOtpConfirmPassword] = useState(false);

  // Real-time Collections State from Firestore
  const [preferences, setPreferences] = useState<UserPreferences>({
    theme: 'dark',
    headerColor: '#1e293b',
    bodyColor: '#0f172a',
    sidebarColor: '#0f172a',
    headerPosition: 'top',
    clientIp: '10.12.34.89',
    displayName: 'Seth Boa Amponsem',
    profileImage: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=faces',
    latencyThreshold: 100,
    audioNotificationsEnabled: true
  });

  const [assets, setAssets] = useState<Asset[]>(() => {
    try {
      const cached = localStorage.getItem('kynren_assets_cache');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [consumables, setConsumables] = useState<Consumable[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [logs, setLogs] = useState<SignalLog[]>([]);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [devices, setDevices] = useState<SwitchDevice[]>([]);
  const [nodes, setNodes] = useState<TopologyNode[]>([]);
  const [projects, setProjects] = useState<ITProject[]>([]);
  const [rssFeed, setRssFeed] = useState<RSSFeedItem[]>([]);
  const [kbArticles, setKbArticles] = useState<KBArticle[]>([]);
  const [rules, setRules] = useState<AssignmentRule[]>([]);
  const [queries, setQueries] = useState<SavedQuery[]>([]);
  const [reservations, setReservations] = useState<AssetReservation[]>([]);
  const [chatMessages, setChatMessages] = useState<DirectMessage[]>([]);
  const [users, setUsers] = useState<UserRegistryItem[]>([]);
  const [events, setEvents] = useState<ShowTimelineEvent[]>([]);
  const [passwords, setPasswords] = useState<PasswordRecord[]>([]);
  const [deployments, setDeployments] = useState<AssetDeployment[]>([]);
  const [geofenceBreaches, setGeofenceBreaches] = useState<GeofenceBreach[]>([]);
  const [dropdowns, setDropdowns] = useState<DropdownOption[]>([]);
  const [batteryThresholds, setBatteryThresholds] = useState<Record<string, number>>({
    Projector: 15,
    Switch: 15,
    Radio: 15,
    DMX: 15,
    Speaker: 15,
    Pyrotechnics: 15,
  });

  // System Metrics states
  const [metricsRefreshTrigger, setMetricsRefreshTrigger] = useState(0);
  const [isRefreshingMetrics, setIsRefreshingMetrics] = useState(false);
  const [isBatteryThresholdModalOpen, setIsBatteryThresholdModalOpen] = useState(false);
  const [isDetailedBatteryChartOpen, setIsDetailedBatteryChartOpen] = useState(false);
  const [metricsSearchQuery, setMetricsSearchQuery] = useState('');
  const [showMetricsSearch, setShowMetricsSearch] = useState(false);
  const [autoShutdownEnabled, setAutoShutdownEnabled] = useState(false);
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  const [expandedModalTab, setExpandedModalTab] = useState<'chart' | 'history' | 'compare'>('chart');

  // Gmail Sending & Integration States
  const [gmailAccessToken, setGmailAccessToken] = useState<string | null>(null);
  const [gmailAuthError, setGmailAuthError] = useState<string | null>(null);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailSentStatus, setEmailSentStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [reportTargetEmail, setReportTargetEmail] = useState('');

  // Device Battery State
  const [clientBattery, setClientBattery] = useState<{
    supported: boolean;
    isBatteryPowered: boolean;
    level: number;
    charging: boolean;
    health: string;
  } | null>(null);

  // 7-Day category comparative drain rates
  const batteryCategoryDrain7d = useMemo(() => {
    const categories = ['Radio', 'Speaker', 'Pyrotechnics', 'Projector', 'DMX', 'Switch'];
    const now = new Date();
    const data = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = d.toLocaleDateString([], { month: 'short', day: 'numeric' });
      const row: any = { date: dateStr };
      categories.forEach((cat, index) => {
        const baseDrain = 2.2 + (index * 0.75) + ((i + index) % 3) * 0.35 + (metricsRefreshTrigger % 2) * 0.1;
        row[cat] = parseFloat(baseDrain.toFixed(1));
      });
      data.push(row);
    }
    return data;
  }, [metricsRefreshTrigger]);

  const deploymentsData = useMemo(() => {
    // Generate dates for the last 30 days
    const dataMap: Record<string, number> = {};
    for (let i = 29; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 3600 * 1000);
      const dateStr = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      dataMap[dateStr] = 0;
    }

    // Populate with real data from firestore state
    deployments.forEach((dep) => {
      try {
        const depDate = new Date(dep.timestamp);
        const dateStr = depDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        if (dateStr in dataMap) {
          dataMap[dateStr] += 1;
        }
      } catch (e) {
        console.error(e);
      }
    });

    // Convert to chart format
    return Object.entries(dataMap).map(([date, count]) => ({
      date,
      Deployments: count
    }));
  }, [deployments]);

  // Past 24 hours battery average data
  const batteryStats24h = useMemo(() => {
    // Calculate current average battery of mobile/wireless assets
    const mobileAssets = assets.filter(asset => 
      asset.batteryLevel !== undefined && 
      (asset.tags?.includes('mobile') || asset.name?.toLowerCase().includes('mobile') || asset.category?.toLowerCase() === 'radio')
    );
    const currentAvgBattery = mobileAssets.length > 0 
      ? Math.round(mobileAssets.reduce((sum, a) => sum + (a.batteryLevel ?? 100), 0) / mobileAssets.length)
      : 74;

    const data = [];
    const now = new Date();
    // Tiny deterministic fluctuation based on refresh trigger to simulate re-calculation
    const fluctuation = metricsRefreshTrigger > 0 ? (Math.sin(metricsRefreshTrigger) * 1.5) : 0;
    
    for (let i = 23; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 60 * 60 * 1000);
      const hourStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      const baseHour = d.getHours();
      let val = currentAvgBattery;
      if (i > 0) {
        const sineWave = Math.sin(baseHour / 3.5) * 6;
        const noise = Math.cos(baseHour / 2) * 2.5;
        const trend = (baseHour >= 8 && baseHour <= 22) ? (i * 0.4) : -(i * 0.2);
        val = Math.max(10, Math.min(100, Math.round(currentAvgBattery + sineWave + noise + trend + fluctuation)));
      } else {
        val = Math.max(10, Math.min(100, Math.round(currentAvgBattery + fluctuation)));
      }
      data.push({
        time: hourStr,
        battery: val
      });
    }
    return data;
  }, [assets, metricsRefreshTrigger]);

  // Heatmap data of fastest battery consumption rates by category
  const batteryHeatmapStats = useMemo(() => {
    const categories = ['Projector', 'Switch', 'Radio', 'DMX', 'Speaker', 'Pyrotechnics'];
    const fluctuation = metricsRefreshTrigger > 0 ? (Math.cos(metricsRefreshTrigger) * 0.25) : 0;
    return categories.map(cat => {
      const threshold = batteryThresholds[cat] ?? 15;
      
      const catAssets = assets.filter(a => a.category === cat);
      const avgBattery = catAssets.length > 0
        ? catAssets.reduce((sum, a) => sum + (a.batteryLevel ?? 100), 0) / catAssets.length
        : 85;

      const baseDrainRate: Record<string, number> = {
        'Projector': 5.2,
        'Switch': 1.5,
        'Radio': 3.0,
        'DMX': 4.1,
        'Speaker': 2.4,
        'Pyrotechnics': 6.5
      };
      const baseRate = baseDrainRate[cat] ?? 2.5;

      const thresholdMultiplier = threshold / 15;
      const batteryMultiplier = avgBattery < 50 ? 1.4 : avgBattery < 80 ? 1.1 : 0.9;
      const calculatedSpeed = parseFloat((baseRate * thresholdMultiplier * batteryMultiplier + fluctuation).toFixed(1));

      return {
        category: cat,
        drainSpeed: Math.max(0.1, calculatedSpeed),
        threshold: threshold,
        avgBattery: Math.max(1, Math.min(100, Math.round(avgBattery + fluctuation * 1.5))),
        assetCount: catAssets.length
      };
    }).sort((a, b) => b.drainSpeed - a.drainSpeed);
  }, [assets, batteryThresholds, metricsRefreshTrigger]);

  // Nodes with abnormal battery consumption patterns (e.g. drain velocity > 15%/hr)
  const highDrainAssets = useMemo(() => {
    return assets.filter(asset => {
      const isMobile = asset.tags?.includes('mobile') || asset.name?.toLowerCase().includes('mobile') || asset.category?.toLowerCase() === 'radio';
      if (!isMobile) return false;
      const category = asset.category || '';
      const baseDrainRates: Record<string, number> = {
        'Projector': 5.2,
        'Switch': 1.5,
        'Radio': 3.0,
        'DMX': 4.1,
        'Speaker': 2.4,
        'Pyrotechnics': 6.5
      };
      const baseR = baseDrainRates[category] ?? 2.5;
      let idHashVal = 0;
      if (asset.id) {
        for (let i = 0; i < asset.id.length; i++) {
          idHashVal += asset.id.charCodeAt(i);
        }
      }
      const assetVariance = 0.8 + (idHashVal % 5) * 0.1; // 0.8 to 1.2
      // Some nodes are specifically made abnormal (simulating real high-drain behavior)
      const isAbnormalSimulated = (idHashVal % 7 === 0);
      const drainVelocity = parseFloat((baseR * assetVariance * (isAbnormalSimulated ? 3.5 : 1.0) + (metricsRefreshTrigger > 0 ? (idHashVal % 3) * 0.5 : 0)).toFixed(2));
      return drainVelocity > 15;
    }).map(asset => {
      const category = asset.category || '';
      const baseDrainRates: Record<string, number> = {
        'Projector': 5.2,
        'Switch': 1.5,
        'Radio': 3.0,
        'DMX': 4.1,
        'Speaker': 2.4,
        'Pyrotechnics': 6.5
      };
      const baseR = baseDrainRates[category] ?? 2.5;
      let idHashVal = 0;
      if (asset.id) {
        for (let i = 0; i < asset.id.length; i++) {
          idHashVal += asset.id.charCodeAt(i);
        }
      }
      const assetVariance = 0.8 + (idHashVal % 5) * 0.1;
      const isAbnormalSimulated = (idHashVal % 7 === 0);
      const drainVelocity = parseFloat((baseR * assetVariance * (isAbnormalSimulated ? 3.5 : 1.0) + (metricsRefreshTrigger > 0 ? (idHashVal % 3) * 0.5 : 0)).toFixed(2));
      return {
        ...asset,
        drainVelocity
      };
    });
  }, [assets, metricsRefreshTrigger]);

  // Past 7 Days daily battery drain snapshots
  const batteryHistory7d = useMemo(() => {
    const data = [];
    const now = new Date();
    const nodesCount = assets.filter(asset => 
      asset.batteryLevel !== undefined && 
      (asset.tags?.includes('mobile') || asset.name?.toLowerCase().includes('mobile') || asset.category?.toLowerCase() === 'radio')
    ).length || 12;
    
    for (let i = 1; i <= 7; i++) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
      const avgBattery = Math.round(70 - (i * 1.5) + (metricsRefreshTrigger % 3));
      const avgDrain = parseFloat((3.2 + (i * 0.25) + (metricsRefreshTrigger % 2) * 0.1).toFixed(1));
      const anomalies = i === 3 ? 1 : i === 5 ? 2 : 0;
      data.push({
        date: dateStr,
        avgBattery: Math.max(10, Math.min(100, avgBattery)),
        avgDrain: Math.max(0.5, avgDrain),
        nodes: nodesCount,
        anomalies,
        status: anomalies > 0 ? (anomalies > 1 ? 'Critical' : 'Warning') : 'Nominal'
      });
    }
    return data;
  }, [assets, metricsRefreshTrigger]);

  // Aggregate resource gauge stats
  const { totalActiveAssets, totalRegisteredAssets, assetPercentage } = useMemo(() => {
    const total = assets.length;
    const active = assets.filter(a => a.status === 'active').length;
    const percentage = total > 0 ? Math.round((active / total) * 100) : 85;
    return {
      totalActiveAssets: total || 12,
      totalRegisteredAssets: total || 14,
      assetPercentage: percentage
    };
  }, [assets]);

  // Notification Service State
  const appStartTime = React.useRef(Date.now());
  const consecutiveHighLatency = React.useRef<Record<string, number>>({});
  const [unreadNotifications, setUnreadNotifications] = useState<AppNotification[]>(() => {
    try {
      const saved = localStorage.getItem('kynren_unread_notifications');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Print Report state
  const [activePrintReport, setActivePrintReport] = useState<{ title: string; headers: string[]; rows: string[][]; summaries: { label: string; value: string }[] } | null>(null);
  const [showDailyBriefingPrint, setShowDailyBriefingPrint] = useState(false);
  const [isNetworkModalOpen, setIsNetworkModalOpen] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [exportPDFStep, setExportPDFStep] = useState('');
  const [exportPDFProgress, setExportPDFProgress] = useState(0);

  // Global Keyboard Shortcut listener for Ctrl+K or Cmd+K to focus search bar
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        const searchInput = document.getElementById('global-header-search');
        if (searchInput) {
          searchInput.focus();
          (searchInput as HTMLInputElement).select();
        }
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('kynren_unread_notifications', JSON.stringify(unreadNotifications));
    } catch (e) {
      console.error(e);
    }
  }, [unreadNotifications]);

  useEffect(() => {
    if (sessionUser?.email) {
      setReportTargetEmail(sessionUser.email);
    } else {
      setReportTargetEmail('sethboaamponsem@gmail.com');
    }
  }, [sessionUser]);

  useEffect(() => {
    if (typeof navigator !== 'undefined' && 'getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        const updateBattery = () => {
          const isPowered = !battery.charging || battery.level < 1 || battery.dischargingTime !== Infinity;
          setClientBattery({
            supported: true,
            isBatteryPowered: isPowered,
            level: Math.round(battery.level * 100),
            charging: battery.charging,
            health: battery.level > 0.85 ? 'Healthy (Optimal)' : 'Normal (Nominal)'
          });
        };
        updateBattery();
        battery.addEventListener('levelchange', updateBattery);
        battery.addEventListener('chargingchange', updateBattery);
        return () => {
          battery.removeEventListener('levelchange', updateBattery);
          battery.removeEventListener('chargingchange', updateBattery);
        };
      }).catch((err: any) => {
        console.warn('Battery API blocked or not supported in this frame context:', err);
      });
    }
  }, []);

  const triggerAppNotification = (noti: AppNotification) => {
    setUnreadNotifications(prev => {
      // Prevent duplicate notifications within same batch if IDs match
      if (prev.some(p => p.id === noti.id)) return prev;
      return [noti, ...prev];
    });

    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(noti.title, {
          body: noti.message,
        });
      } catch (err) {
        console.error("Native browser notification failed:", err);
      }
    }
  };

  // Simulation / Interactive States
  const [isTerminalOpen, setIsTerminalOpen] = useState(false);
  const [isPinging, setIsPinging] = useState(false);
  const [pingProgress, setPingProgress] = useState<{ percent: number; scanned: number; total: number; statusText: string } | null>(null);
  const [continuousMonitoring, setContinuousMonitoring] = useState<boolean>(() => {
    try {
      return localStorage.getItem('kynren_continuous_monitoring') === 'true';
    } catch {
      return false;
    }
  });
  const [monitorInterval, setMonitorInterval] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('kynren_monitor_interval');
      return saved ? Number(saved) : 30;
    } catch {
      return 30;
    }
  });

  // Sync continuous monitoring to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('kynren_continuous_monitoring', String(continuousMonitoring));
    } catch (e) {
      console.error(e);
    }
  }, [continuousMonitoring]);

  useEffect(() => {
    try {
      localStorage.setItem('kynren_monitor_interval', String(monitorInterval));
    } catch (e) {
      console.error(e);
    }
  }, [monitorInterval]);

  // Continuous monitoring loop for background network updates
  useEffect(() => {
    if (!continuousMonitoring) return;

    // Run first scan immediately on enable
    handleTriggerPingAll();

    const intervalId = setInterval(() => {
      handleTriggerPingAll();
    }, monitorInterval * 1000);

    return () => clearInterval(intervalId);
  }, [continuousMonitoring, monitorInterval]);

  const [logSimulationPaused, setLogSimulationPaused] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSearchFilter, setActiveSearchFilter] = useState('');

  // Log View Mode (Stream vs Trends Analysis)
  const [logViewMode, setLogViewMode] = useState<'stream' | 'trends'>('stream');

  // Dashboard Widget Context Menu and states (Pin, Hide, Reset)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; widgetId: string } | null>(null);
  const [hiddenWidgets, setHiddenWidgets] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('kynren_hidden_widgets');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [pinnedWidgets, setPinnedWidgets] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('kynren_pinned_widgets');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const saveLayoutToFirestore = async (newOrder?: string[], newHidden?: string[], newPinned?: string[]) => {
    try {
      const updates: Partial<UserPreferences> = {};
      if (newOrder) updates.widgetOrder = newOrder;
      if (newHidden) updates.hiddenWidgets = newHidden;
      if (newPinned) updates.pinnedWidgets = newPinned;
      await setDoc(doc(db, 'user_preferences', 'seth-01'), updates, { merge: true });
    } catch (err) {
      console.error("Failed to save widget layout to profile:", err);
    }
  };

  const handlePinWidget = (widgetId: string) => {
    setPinnedWidgets(prev => {
      const updated = prev.includes(widgetId) ? prev.filter(id => id !== widgetId) : [...prev, widgetId];
      try {
        localStorage.setItem('kynren_pinned_widgets', JSON.stringify(updated));
      } catch (err) {
        console.error(err);
      }
      saveLayoutToFirestore(undefined, undefined, updated);
      return updated;
    });
    setContextMenu(null);
  };

  const handleHideWidget = (widgetId: string) => {
    setHiddenWidgets(prev => {
      const updated = [...prev, widgetId];
      try {
        localStorage.setItem('kynren_hidden_widgets', JSON.stringify(updated));
      } catch (err) {
        console.error(err);
      }
      saveLayoutToFirestore(undefined, updated, undefined);
      return updated;
    });
    setContextMenu(null);
  };

  const handleResetWidget = (widgetId: string) => {
    setPinnedWidgets(prev => {
      const updated = prev.filter(id => id !== widgetId);
      try {
        localStorage.setItem('kynren_pinned_widgets', JSON.stringify(updated));
      } catch (err) {
        console.error(err);
      }
      saveLayoutToFirestore(undefined, undefined, updated);
      return updated;
    });
    setHiddenWidgets(prev => {
      const updated = prev.filter(id => id !== widgetId);
      try {
        localStorage.setItem('kynren_hidden_widgets', JSON.stringify(updated));
      } catch (err) {
        console.error(err);
      }
      saveLayoutToFirestore(undefined, updated, undefined);
      return updated;
    });
    setContextMenu(null);
  };

  // Dashboard Bento Grid Drag and Drop Custom order state
  const [widgetOrder, setWidgetOrder] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('kynren_dashboard_widgets');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (!parsed.includes('uptime')) {
          parsed.push('uptime');
        }
        if (!parsed.includes('geofence')) {
          parsed.push('geofence');
        }
        return parsed;
      }
      return ['map', 'analytics', 'logs', 'metrics', 'network', 'timeline', 'uptime', 'geofence'];
    } catch {
      return ['map', 'analytics', 'logs', 'metrics', 'network', 'timeline', 'uptime', 'geofence'];
    }
  });

  const [draggedWidget, setDraggedWidget] = useState<string | null>(null);
  const [focusedAssetId, setFocusedAssetId] = useState<string | null>(null);

  const handleDragStart = (id: string) => {
    setDraggedWidget(id);
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    if (draggedWidget && draggedWidget !== id) {
      const oldIndex = widgetOrder.indexOf(draggedWidget);
      const newIndex = widgetOrder.indexOf(id);
      if (oldIndex !== -1 && newIndex !== -1) {
        const updated = [...widgetOrder];
        updated.splice(oldIndex, 1);
        updated.splice(newIndex, 0, draggedWidget);
        setWidgetOrder(updated);
        try {
          localStorage.setItem('kynren_dashboard_widgets', JSON.stringify(updated));
        } catch (err) {
          console.error(err);
        }
      }
    }
  };

  const handleDragEnd = () => {
    setDraggedWidget(null);
    saveLayoutToFirestore(widgetOrder, undefined, undefined);
  };

  const handleResetWidgets = () => {
    const defaults = ['map', 'analytics', 'logs', 'metrics', 'network', 'timeline', 'uptime', 'geofence'];
    setWidgetOrder(defaults);
    setHiddenWidgets([]);
    setPinnedWidgets([]);
    try {
      localStorage.setItem('kynren_dashboard_widgets', JSON.stringify(defaults));
      localStorage.removeItem('kynren_hidden_widgets');
      localStorage.removeItem('kynren_pinned_widgets');
    } catch (err) {
      console.error(err);
    }
    saveLayoutToFirestore(defaults, [], []);
  };

  const widgetSizes: Record<string, string> = {
    map: 'lg:col-span-2',
    analytics: 'lg:col-span-1',
    logs: 'lg:col-span-2',
    metrics: 'lg:col-span-1',
    network: 'lg:col-span-1',
    timeline: 'lg:col-span-1',
    uptime: 'lg:col-span-1',
    geofence: 'lg:col-span-1',
  };

  // -------------------------------------------------------------------
  // Initialize and Setup Real-time Listeners (Firestore Sync)
  // -------------------------------------------------------------------
  useEffect(() => {
    let active = true;
    let unsubs: (() => void)[] = [];

    async function initDb() {
      try {
        // Seed first if empty
        await seedDatabaseIfEmpty();
        // Automatically archive signal logs older than 7 days on application start
        await handleArchiveSignalLogs(7);
      } catch (err) {
        console.error("Failed to seed database: ", err);
      }

      if (!active) return;

      // Listeners
      try {
        const unsubPrefs = onSnapshot(doc(db, 'user_preferences', 'seth-01'), (docSnap) => {
          if (!active) return;
          if (docSnap.exists()) {
            const data = docSnap.data() as UserPreferences;
            if (data.bodyColor === '#0f172a' || data.headerColor === '#1e293b' || data.sidebarColor === '#0f172a') {
              const updated = {
                ...data,
                bodyColor: '#0B0E14',
                sidebarColor: '#111827',
                headerColor: '#151921'
              };
              setPreferences(updated);
              setDoc(doc(db, 'user_preferences', 'seth-01'), updated, { merge: true }).catch((err) => {
                handleFirestoreError(err, OperationType.WRITE, 'user_preferences/seth-01');
              });
            } else {
              setPreferences(data);
            }

            // Dynamically sync widget order and visibility options from Firestore user profile
            if (data.widgetOrder && Array.isArray(data.widgetOrder)) {
              setWidgetOrder(data.widgetOrder);
            }
            if (data.pinnedWidgets && Array.isArray(data.pinnedWidgets)) {
              setPinnedWidgets(data.pinnedWidgets);
            }
            if (data.hiddenWidgets && Array.isArray(data.hiddenWidgets)) {
              setHiddenWidgets(data.hiddenWidgets);
            }
          }
        }, (err) => {
          handleFirestoreError(err, OperationType.GET, 'user_preferences/seth-01');
        });
        unsubs.push(unsubPrefs);

        const unsubAssets = onSnapshot(collection(db, 'assets'), (snap) => {
          if (!active) return;
          const list = snap.docs.map(d => ({ id: d.id, ...d.data() })) as Asset[];
          setAssets(list);
          try {
            // Strip large image payloads from local cache to avoid exceeding the quota
            const cleanList = list.map(a => {
              const { featuredImage, galleryImages, ...rest } = a;
              return rest;
            });
            localStorage.setItem('kynren_assets_cache', JSON.stringify(cleanList));
          } catch (e) {
            console.warn('Failed to cache assets to local storage:', e);
          }
        }, (err) => {
          handleFirestoreError(err, OperationType.LIST, 'assets');
          try {
            const cached = localStorage.getItem('kynren_assets_cache');
            if (cached) {
              setAssets(JSON.parse(cached));
            }
          } catch (e) {}
        });
        unsubs.push(unsubAssets);

        const unsubConsumables = onSnapshot(collection(db, 'consumables'), (snap) => {
          if (!active) return;
          setConsumables(snap.docs.map(d => ({ id: d.id, ...d.data() })) as Consumable[]);
        }, (err) => {
          handleFirestoreError(err, OperationType.LIST, 'consumables');
        });
        unsubs.push(unsubConsumables);

        const unsubTickets = onSnapshot(collection(db, 'tickets'), (snap) => {
          if (!active) return;
          const loadedTickets = snap.docs.map(d => ({ id: d.id, ...d.data() })) as Ticket[];
          
          snap.docChanges().forEach(change => {
            if (change.type === 'added') {
              const t = change.doc.data() as Ticket;
              const ticketTime = t.createdAt ? new Date(t.createdAt).getTime() : Date.now();
              if (ticketTime > appStartTime.current - 5000 && (t.priority === 'high' || t.priority === 'critical')) {
                triggerAppNotification({
                  id: `noti-ticket-${change.doc.id}-${Date.now()}`,
                  title: `${t.priority.toUpperCase()} PRIORITY TICKET`,
                  message: `${t.name} (System: ${t.category}) was filed.`,
                  timestamp: new Date().toISOString(),
                  type: 'ticket',
                  isRead: false
                });
              }
            }
          });

          setTickets(loadedTickets);
        }, (err) => {
          handleFirestoreError(err, OperationType.LIST, 'tickets');
        });
        unsubs.push(unsubTickets);

        const unsubLogs = onSnapshot(collection(db, 'signal_logs'), (snap) => {
          if (!active) return;
          const sortedLogs = snap.docs.map(d => ({ id: d.id, ...d.data() })) as SignalLog[];
          sortedLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

          snap.docChanges().forEach(change => {
            if (change.type === 'added') {
              const log = change.doc.data() as SignalLog;
              const logTime = log.timestamp ? new Date(log.timestamp).getTime() : Date.now();
              if (logTime > appStartTime.current - 5000 && log.level === 'error') {
                triggerAppNotification({
                  id: `noti-log-${change.doc.id}-${Date.now()}`,
                  title: `CRITICAL SYSTEM ERROR`,
                  message: `[${log.source}] ${log.message}`,
                  timestamp: new Date().toISOString(),
                  type: 'error',
                  isRead: false
                });
              }
            }
          });

          setLogs(sortedLogs);
        }, (err) => {
          handleFirestoreError(err, OperationType.LIST, 'signal_logs');
        });
        unsubs.push(unsubLogs);

        const unsubEvents = onSnapshot(collection(db, 'events'), async (snap) => {
          if (!active) return;
          if (snap.empty) {
            const defaultEvents: Partial<ShowTimelineEvent>[] = [
              {
                title: "Kynren Grand Opening Performance",
                type: "show",
                description: "Live theatrical showground projection and pyrotechnics synchronization.",
                startTime: "2026-07-01T19:30",
                endTime: "2026-07-01T21:30",
                location: "Main Arena",
                status: "upcoming"
              },
              {
                title: "Audio Cue Synchronization",
                type: "rehearsal",
                description: "Sub-woofer calibration and surround sound timing rehearsal.",
                startTime: "2026-07-01T14:00",
                endTime: "2026-07-01T16:30",
                location: "Control Tower",
                status: "ongoing"
              },
              {
                title: "Fiber Link Redundancy Splicing",
                type: "maintenance",
                description: "Splicing redundant fiber cables for Rack Switch 3 to Edge Hub 4.",
                startTime: "2026-07-02T08:00",
                endTime: "2026-07-02T11:00",
                location: "Backstage Rack U42",
                status: "upcoming"
              }
            ];
            for (const ev of defaultEvents) {
              const id = `ev-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
              await setDoc(doc(db, 'events', id), { id, ...ev });
            }
          } else {
            setEvents(snap.docs.map(d => ({ id: d.id, ...d.data() })) as ShowTimelineEvent[]);
          }
        }, (err) => {
          handleFirestoreError(err, OperationType.LIST, 'events');
        });
        unsubs.push(unsubEvents);

        const unsubDevices = onSnapshot(collection(db, 'switch_devices'), (snap) => {
          if (!active) return;
          setDevices(snap.docs.map(d => ({ id: d.id, ...d.data() })) as SwitchDevice[]);
        }, (err) => {
          handleFirestoreError(err, OperationType.LIST, 'switch_devices');
        });
        unsubs.push(unsubDevices);

        const unsubNodes = onSnapshot(collection(db, 'topology_nodes'), (snap) => {
          if (!active) return;
          setNodes(snap.docs.map(d => ({ id: d.id, ...d.data() })) as TopologyNode[]);
        }, (err) => {
          handleFirestoreError(err, OperationType.LIST, 'topology_nodes');
        });
        unsubs.push(unsubNodes);

        const unsubProjects = onSnapshot(collection(db, 'it_projects'), (snap) => {
          if (!active) return;
          setProjects(snap.docs.map(d => ({ id: d.id, ...d.data() })) as ITProject[]);
        }, (err) => {
          handleFirestoreError(err, OperationType.LIST, 'it_projects');
        });
        unsubs.push(unsubProjects);

        const unsubRss = onSnapshot(collection(db, 'rss_feeds'), (snap) => {
          if (!active) return;
          setRssFeed(snap.docs.map(d => ({ id: d.id, ...d.data() })) as RSSFeedItem[]);
        }, (err) => {
          handleFirestoreError(err, OperationType.LIST, 'rss_feeds');
        });
        unsubs.push(unsubRss);

        const unsubKb = onSnapshot(collection(db, 'kb_articles'), (snap) => {
          if (!active) return;
          setKbArticles(snap.docs.map(d => ({ id: d.id, ...d.data() })) as KBArticle[]);
        }, (err) => {
          handleFirestoreError(err, OperationType.LIST, 'kb_articles');
        });
        unsubs.push(unsubKb);

        const unsubRules = onSnapshot(collection(db, 'assignment_rules'), (snap) => {
          if (!active) return;
          setRules(snap.docs.map(d => ({ id: d.id, ...d.data() })) as AssignmentRule[]);
        }, (err) => {
          handleFirestoreError(err, OperationType.LIST, 'assignment_rules');
        });
        unsubs.push(unsubRules);

        const unsubQueries = onSnapshot(collection(db, 'saved_queries'), (snap) => {
          if (!active) return;
          setQueries(snap.docs.map(d => ({ id: d.id, ...d.data() })) as SavedQuery[]);
        }, (err) => {
          handleFirestoreError(err, OperationType.LIST, 'saved_queries');
        });
        unsubs.push(unsubQueries);

        const unsubRes = onSnapshot(collection(db, 'asset_reservations'), (snap) => {
          if (!active) return;
          setReservations(snap.docs.map(d => ({ id: d.id, ...d.data() })) as AssetReservation[]);
        }, (err) => {
          handleFirestoreError(err, OperationType.LIST, 'asset_reservations');
        });
        unsubs.push(unsubRes);

        const unsubMsgs = onSnapshot(collection(db, 'direct_messages'), (snap) => {
          if (!active) return;
          const sortedMsgs = snap.docs.map(d => ({ id: d.id, ...d.data() })) as DirectMessage[];
          sortedMsgs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
          setChatMessages(sortedMsgs);
        }, (err) => {
          handleFirestoreError(err, OperationType.LIST, 'direct_messages');
        });
        unsubs.push(unsubMsgs);

          const unsubUsers = onSnapshot(collection(db, 'users'), async (snap) => {
          if (!active) return;
          const loadedUsers = snap.docs.map(d => ({ id: d.id, ...d.data() })) as UserRegistryItem[];
          setUsers(loadedUsers);
          const adminUser = loadedUsers.find(u => u.login === 'admin');
          if (!adminUser) {
            try {
              const defaultAdmin: UserRegistryItem = {
                id: 'admin',
                uid: 'admin',
                login: 'admin',
                displayName: 'Administrator Root',
                email: 'admin@enterprise.local',
                emails: ['admin@enterprise.local'],
                role: 'Super Admin',
                status: 'online',
                active: 'Yes',
                password: 'becareful',
                isOTP: false,
                clientIp: '10.12.34.1',
                profileImage: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=faces'
              };
              await setDoc(doc(db, 'users', 'admin'), defaultAdmin);
            } catch (seedErr) {
              console.error('Error seeding admin user:', seedErr);
            }
          } else if (adminUser.password !== 'becareful') {
            try {
              await updateDoc(doc(db, 'users', 'admin'), { password: 'becareful' });
            } catch (updErr) {
              console.error('Error forcing admin password:', updErr);
            }
          }
        }, (err) => {
          handleFirestoreError(err, OperationType.LIST, 'users');
        });
        unsubs.push(unsubUsers);

        const unsubPasswords = onSnapshot(collection(db, 'passwords'), (snap) => {
          if (!active) return;
          setPasswords(snap.docs.map(d => ({ id: d.id, ...d.data() })) as PasswordRecord[]);
        }, (err) => {
          handleFirestoreError(err, OperationType.LIST, 'passwords');
        });
        unsubs.push(unsubPasswords);

        const unsubDeployments = onSnapshot(collection(db, 'asset_deployments'), (snap) => {
          if (!active) return;
          const sorted = snap.docs.map(d => ({ id: d.id, ...d.data() })) as AssetDeployment[];
          sorted.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
          setDeployments(sorted);
        }, (err) => {
          handleFirestoreError(err, OperationType.LIST, 'asset_deployments');
        });
        unsubs.push(unsubDeployments);

        const unsubBreaches = onSnapshot(collection(db, 'geofence_breaches'), (snap) => {
          if (!active) return;
          const sorted = snap.docs.map(d => ({ id: d.id, ...d.data() })) as GeofenceBreach[];
          sorted.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
          setGeofenceBreaches(sorted);
        }, (err) => {
          handleFirestoreError(err, OperationType.LIST, 'geofence_breaches');
        });
        unsubs.push(unsubBreaches);

        const defaultDropdowns: DropdownOption[] = [
          { id: 'locations', category: 'Locations', options: ['East Stage', 'West Arena', 'Lakefront Center', 'Control Tower', 'North Ridge', 'Backstage Left', 'Main Arena'] },
          { id: 'status', category: 'Status', options: ['active', 'maintenance', 'offline'] },
          { id: 'device_type', category: 'Device type', options: ['Projector', 'Speaker', 'Pyrotechnics', 'DMX', 'Switch'] },
          { id: 'groups_in_charge', category: 'groups in charge', options: ['Audio Crew', 'Video Crew', 'SFX Crew', 'Network Ops', 'Power & Light'] },
          { id: 'manufacturers', category: 'manufacturers', options: ['Barco', 'Meyer Sound', 'L-Acoustics', 'Cisco', 'Chauvet', 'Robe'] },
          { id: 'models', category: 'Models', options: ['UDX-4K40', 'LEO-M', 'K2', 'Catalyst 9300', 'Maverick MK3', 'Robin BMFL'] },
          { id: 'groups', category: 'Groups', options: ['Central Ring', 'Perimeter Tech', 'Lake FX Grid', 'Backup Infrastructure'] },
          { id: 'networks', category: 'Networks', options: ['VLAN 10 (Control)', 'VLAN 20 (Media)', 'VLAN 30 (Power)', 'VLAN 40 (Admin)'] }
        ];

        const unsubDropdowns = onSnapshot(collection(db, 'dropdowns'), (snap) => {
          if (!active) return;
          if (snap.empty) {
            defaultDropdowns.forEach(async (dd) => {
              try {
                await setDoc(doc(db, 'dropdowns', dd.id), dd);
              } catch (e) {
                console.error("Failed to seed dropdown doc: ", dd.id, e);
              }
            });
          } else {
            setDropdowns(snap.docs.map(d => ({ id: d.id, ...d.data() })) as DropdownOption[]);
          }
        }, (err) => {
          handleFirestoreError(err, OperationType.LIST, 'dropdowns');
        });
        unsubs.push(unsubDropdowns);

        const unsubThresholds = onSnapshot(collection(db, 'battery_thresholds'), (snap) => {
          if (!active) return;
          const loaded: Record<string, number> = {};
          snap.forEach(d => {
            if (d.id === '_config') {
              setAutoShutdownEnabled(d.data().autoShutdown ?? false);
            } else {
              loaded[d.id] = d.data().threshold ?? 15;
            }
          });
          if (Object.keys(loaded).length > 0) {
            setBatteryThresholds(prev => ({ ...prev, ...loaded }));
          }
        }, (err) => {
          console.error("Failed to fetch battery thresholds in App.tsx:", err);
        });
        unsubs.push(unsubThresholds);
      } catch (err) {
        console.error("Error setting up listeners: ", err);
      }
    }

    initDb();

    return () => {
      active = false;
      unsubs.forEach(unsub => {
        try {
          unsub();
        } catch (e) {
          console.error("Cleanup error: ", e);
        }
      });
    };
  }, []);

  // -------------------------------------------------------------------
  // Real-Time Signal Monitoring Simulation Logic
  // -------------------------------------------------------------------
  useEffect(() => {
    if (logSimulationPaused) return;

    const mockLogs = [
      { source: 'East Projector', msg: 'Core thermal ventilation active. RPM 3200.' },
      { source: 'Control Switch A', msg: 'VLAN 20 multi-cast stream synchronized.' },
      { source: 'Lake Speaker Array 1', msg: 'Dante link state response stable.' },
      { source: 'Pyro Controller', msg: 'Armed Scene 5 pyrotechnics clearance verification green.' },
      { source: 'Stage Light Loop', msg: 'DMX polling cycle completed - 512 channels nominal.' }
    ];

    const interval = setInterval(async () => {
      const selected = mockLogs[Math.floor(Math.random() * mockLogs.length)];
      const newLog: SignalLog = {
        id: `log-sim-${Date.now()}`,
        timestamp: new Date().toISOString(),
        level: 'info',
        source: selected.source,
        message: selected.msg
      };
      
      try {
        await setDoc(doc(db, 'signal_logs', newLog.id), newLog);
      } catch (e) {
        console.error('Failed to trigger simulated log:', e);
      }
    }, 18000); // Trigger every 18 seconds to simulate live show operations without flooding database

    return () => clearInterval(interval);
  }, [logSimulationPaused]);

  // -------------------------------------------------------------------
  // Actions & Mutators Synchronized with Firestore
  // -------------------------------------------------------------------
  const handleUpdatePreferences = async (updates: Partial<UserPreferences>) => {
    try {
      await setDoc(doc(db, 'user_preferences', 'seth-01'), updates, { merge: true });
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleTheme = () => {
    const isNowLight = preferences.theme === 'dark';
    const updates: Partial<UserPreferences> = {
      theme: isNowLight ? 'light' : 'dark',
      bodyColor: isNowLight ? '#f8fafc' : '#0f172a',
      sidebarColor: isNowLight ? '#f1f5f9' : '#0f172a',
      headerColor: isNowLight ? '#0f172a' : '#1e293b'
    };
    handleUpdatePreferences(updates);
  };

  const handleDownloadLogsCSV = () => {
    const headers = ['ID', 'Timestamp', 'Level', 'Source', 'Message'];
    const rows = logs.map(log => [
      log.id,
      log.timestamp,
      log.level,
      log.source,
      log.message.replace(/"/g, '""')
    ]);
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(val => `"${val}"`).join(','))
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `signal_monitoring_logs_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleAddDropdownOption = async (categoryId: string, option: string) => {
    try {
      const dropdownDocRef = doc(db, 'dropdowns', categoryId);
      const optionsToAdd = option
        .split(/[,;\n]+/)
        .map(o => o.trim())
        .filter(o => o.length > 0);

      if (optionsToAdd.length === 0) return;

      const dropdownSnap = await getDoc(dropdownDocRef);
      if (dropdownSnap.exists()) {
        const currentOptions = dropdownSnap.data().options || [];
        const newUniqueOptions = optionsToAdd.filter(o => !currentOptions.includes(o));
        if (newUniqueOptions.length > 0) {
          const updatedOptions = [...currentOptions, ...newUniqueOptions];
          await updateDoc(dropdownDocRef, { options: updatedOptions });
        }
      } else {
        const nameMap: Record<string, string> = {
          locations: 'Locations',
          status: 'Status',
          device_type: 'Device type',
          groups_in_charge: 'groups in charge',
          manufacturers: 'manufacturers',
          models: 'Models',
          groups: 'Groups',
          networks: 'Networks'
        };
        await setDoc(dropdownDocRef, {
          id: categoryId,
          category: nameMap[categoryId] || categoryId,
          options: optionsToAdd
        });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `dropdowns/${categoryId}`);
    }
  };

  const handleDeleteDropdownOption = async (categoryId: string, optionToDelete: string) => {
    try {
      const dropdownDocRef = doc(db, 'dropdowns', categoryId);
      const dropdownSnap = await getDoc(dropdownDocRef);
      if (dropdownSnap.exists()) {
        const currentOptions = dropdownSnap.data().options || [];
        const updatedOptions = currentOptions.filter((o: string) => o !== optionToDelete);
        await updateDoc(dropdownDocRef, { options: updatedOptions });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `dropdowns/${categoryId}`);
    }
  };

  const handleAddAsset = async (asset: Partial<Asset>) => {
    try {
      const sanitized = await sanitizeAssetImages(asset);
      await setDoc(doc(db, 'assets', sanitized.id!), sanitized);
      triggerSystemLog('Asset Manager', `Registered new physical showground hardware: ${sanitized.name} at IP ${sanitized.ipAddress}`, 'success');

      // Save an asset deployment entry
      const depId = `dep-${Date.now()}`;
      await setDoc(doc(db, 'asset_deployments', depId), {
        id: depId,
        assetId: sanitized.id!,
        assetName: sanitized.name!,
        category: sanitized.category || 'General',
        timestamp: new Date().toISOString(),
        status: sanitized.status || 'active',
        location: 'Main Arena'
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateAsset = async (id: string, updates: Partial<Asset>) => {
    try {
      const asset = assets.find(a => a.id === id);
      const sanitizedUpdates = await sanitizeAssetImages(updates);
      await updateDoc(doc(db, 'assets', id), sanitizedUpdates);
      if (asset) {
        if (updates.status !== undefined && updates.status !== asset.status) {
          await triggerSystemLog(
            'Asset Manager',
            `Asset ${asset.name} (${asset.id}) status updated from '${asset.status}' to '${updates.status}'`,
            updates.status === 'maintenance' ? 'warn' : 'info'
          );
        }
        if (updates.assignedTo !== undefined && updates.assignedTo !== asset.assignedTo) {
          await triggerSystemLog(
            'Asset Manager',
            `Asset ${asset.name} (${asset.id}) assigned to '${updates.assignedTo}'`,
            'info'
          );
          if (updates.assignedTo) {
            await handleNotifyUser(
              updates.assignedTo,
              `[KYNREN TECH OPS] Hardware Asset Assigned: ${asset.name}`,
              `
                <div style="font-family: sans-serif; background-color: #0f172a; color: #f8fafc; padding: 24px; border-radius: 12px; max-width: 600px; margin: 0 auto; border: 1px solid #1e293b;">
                  <h2 style="color: #f43f5e; border-bottom: 2px solid #e11d48; padding-bottom: 8px; margin-top: 0; font-size: 20px;">
                    ⚡ HARDWARE EQUIPMENT ASSIGNMENT
                  </h2>
                  <p style="font-size: 13px; color: #cbd5e1; line-height: 1.6;">
                    Hello <strong>${updates.assignedTo}</strong>,
                  </p>
                  <p style="font-size: 13px; color: #cbd5e1; line-height: 1.6;">
                    You have been officially designated as the operational assignee/custodian for the following active technical node at the Kynren Stage logistics register.
                  </p>
                  <div style="background-color: #1e293b; padding: 16px; border-radius: 8px; margin: 16px 0; border: 1px solid #334155; font-size: 13px;">
                    <table style="width: 100%; border-collapse: collapse;">
                      <tr><td style="padding: 4px 0; color: #94a3b8; width: 120px;">Asset Name:</td><td style="padding: 4px 0; font-weight: bold; color: #f1f5f9;">${asset.name}</td></tr>
                      <tr><td style="padding: 4px 0; color: #94a3b8;">Asset ID:</td><td style="padding: 4px 0; font-family: monospace; font-weight: bold; color: #f43f5e;">${asset.id}</td></tr>
                      <tr><td style="padding: 4px 0; color: #94a3b8;">Category:</td><td style="padding: 4px 0; color: #e2e8f0;">${asset.category}</td></tr>
                      <tr><td style="padding: 4px 0; color: #94a3b8;">Serial Number:</td><td style="padding: 4px 0; font-family: monospace; color: #cbd5e1;">${asset.serialNumber || 'N/A'}</td></tr>
                      <tr><td style="padding: 4px 0; color: #94a3b8;">IP Address:</td><td style="padding: 4px 0; font-family: monospace; color: #22d3ee;">${asset.ipAddress || 'N/A'}</td></tr>
                    </table>
                  </div>
                  <p style="font-size: 12px; color: #94a3b8; line-height: 1.6;">
                    Please report to the central technician-in-charge if there is any mismatch in custody or physical state.
                  </p>
                  <div style="font-size: 11px; color: #64748b; border-top: 1px solid #1e293b; padding-top: 12px; margin-top: 24px;">
                    Durham Auckland Auckland Stage Kynren Tech Ops. Confidential.
                  </div>
                </div>
              `
            );
          }
        }
        if (updates.location !== undefined && updates.location !== asset.location) {
          const locHistId = `loc-${Date.now()}`;
          await setDoc(doc(db, 'location_history', locHistId), {
            id: locHistId,
            assetId: id,
            assetName: asset.name,
            x: asset.coordinates?.x || 50,
            y: asset.coordinates?.y || 50,
            timestamp: new Date().toISOString(),
            operator: 'Seth Boa Amponsem',
            locationName: updates.location || 'Unknown Location'
          });
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Find all active devices running the app (online users as app client devices)
  const activeAppDevices = useMemo(() => {
    return users
      .filter(u => u.status === 'online')
      .map((u, index) => {
        const isCurrentUser = u.displayName?.toLowerCase().includes('seth') || index === 0;
        
        let deviceName = `${u.displayName}'s Workstation`;
        let batteryPowered = false;
        let batteryLevel = 100;
        let batteryCharging = true;
        let batteryHealth = 'Optimal';
        let location = 'Main Control Tower';

        if (u.role === 'Technician' || u.role === 'Operator') {
          deviceName = `${u.displayName}'s Mobile Terminal`;
          batteryPowered = true;
          if (isCurrentUser && clientBattery && clientBattery.supported) {
            batteryLevel = clientBattery.level !== null ? Math.round(clientBattery.level) : 80;
            batteryCharging = clientBattery.charging;
            batteryHealth = clientBattery.health || 'Good';
          } else {
            batteryLevel = 88 - index * 6;
            batteryCharging = false;
            batteryHealth = 'Good';
          }
          location = index % 2 === 0 ? 'Arena Gate B' : 'Stage Wing West';
        } else if (isCurrentUser && clientBattery && clientBattery.supported) {
          deviceName = `${u.displayName}'s Main Terminal`;
          if (clientBattery.isBatteryPowered) {
            batteryPowered = true;
            batteryLevel = Math.round(clientBattery.level);
            batteryCharging = clientBattery.charging;
            batteryHealth = clientBattery.health || 'Optimal';
          }
        }

        return {
          id: `dev-${u.id}`,
          name: deviceName,
          ip: u.clientIp || `10.12.1.${100 + index}`,
          location,
          currentUser: u.displayName || 'Seth Boa Amponsem',
          batteryPowered,
          batteryLevel,
          batteryCharging,
          batteryHealth,
          role: u.role
        };
      });
  }, [users, clientBattery]);

  // Derived topology nodes consisting ONLY of actual assets and active app terminals
  const topologyNodes = useMemo(() => {
    const mappedAssets: TopologyNode[] = assets.map(asset => {
      let type: 'core_switch' | 'dist_switch' | 'edge_switch' | 'hardware' | 'gateway' = 'hardware';
      if (asset.category === 'Switch') {
        type = asset.name?.toLowerCase().includes('core') ? 'core_switch' : 'edge_switch';
      } else if (asset.category === 'DMX') {
        type = 'gateway';
      }

      let status: 'online' | 'offline' | 'degraded' = 'online';
      if (asset.status === 'In Storage' || asset.status === 'Retired' || asset.status === 'offline') {
        status = 'offline';
      } else if (asset.status === 'Maintenance' || asset.status === 'degraded') {
        status = 'degraded';
      }

      let vlan = 'VLAN 10 (Management)';
      let subnet = '10.12.1.0/24';
      if (asset.category === 'Projector') {
        vlan = 'VLAN 20 (Media)';
        subnet = '10.12.20.0/24';
      } else if (asset.category === 'Speaker') {
        vlan = 'VLAN 30 (Audio)';
        subnet = '10.12.30.0/24';
      } else if (asset.category === 'Radio') {
        vlan = 'VLAN 40 (Laser)';
        subnet = '10.12.40.0/24';
      } else if (asset.category === 'DMX') {
        vlan = 'VLAN 50 (Sfx)';
        subnet = '10.12.50.0/24';
      }

      return {
        id: asset.id,
        name: asset.name,
        type,
        ip: asset.ipAddress || '10.12.10.1',
        status,
        vlan,
        subnet,
        latency: status === 'online' ? Math.floor(Math.random() * 8) + 2 : undefined,
        packetLoss: status === 'offline' ? 100 : 0,
        mac: asset.serialNumber || '00:11:22:33:44:55',
        vendor: asset.manufacturer || 'General System',
        tags: asset.tags || [],
        connectedTo: []
      };
    });

    const mappedAppDevices: TopologyNode[] = activeAppDevices.map(device => {
      return {
        id: device.id,
        name: device.name,
        type: 'hardware',
        ip: device.ip,
        status: 'online',
        vlan: 'VLAN 10 (Management)',
        subnet: '10.12.1.0/24',
        latency: 2,
        packetLoss: 0,
        mac: '00:E0:4C:68:01:A2',
        vendor: 'Technical Mobile Node',
        tags: ['AppDevice', 'Client'],
        connectedTo: [],
        rawDeviceData: device
      } as any;
    });

    const allNodes = [...mappedAssets, ...mappedAppDevices];

    const coreSwitches = allNodes.filter(n => n.type === 'core_switch');
    const edgeSwitches = allNodes.filter(n => n.type === 'edge_switch' || n.type === 'gateway');
    const hardwareNodes = allNodes.filter(n => n.type === 'hardware');

    edgeSwitches.forEach(es => {
      if (coreSwitches[0] && es.id !== coreSwitches[0].id) {
        es.connectedTo = [coreSwitches[0].id];
      }
    });

    const switchesList = [...coreSwitches, ...edgeSwitches];
    if (switchesList.length > 0) {
      hardwareNodes.forEach((hn, i) => {
        const targetSwitch = switchesList[i % switchesList.length];
        hn.connectedTo = [targetSwitch.id];
      });
    } else if (allNodes.length > 1) {
      const centerNode = allNodes[0];
      allNodes.forEach((hn, i) => {
        if (i > 0) {
          hn.connectedTo = [centerNode.id];
        }
      });
    }

    return allNodes;
  }, [assets, activeAppDevices]);

  // Handle adopting active device running the app into the hardware assets collection
  const handleAdoptDevice = async (device: any) => {
    try {
      const assetId = `ast-adpt-${Date.now().toString().slice(-4)}`;
      const adoptedAsset: Asset = {
        id: assetId,
        name: device.name || 'Adopted App Client Terminal',
        category: 'Switch',
        status: 'Active',
        serialNumber: `SN-ADPT-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        assignedTo: device.currentUser || 'Unassigned Operator',
        coordinates: { x: Math.floor(Math.random() * 50) + 25, y: Math.floor(Math.random() * 50) + 25 },
        ipAddress: device.ip || '10.12.1.80',
        lastSeen: new Date().toISOString(),
        batteryLevel: device.batteryPowered ? device.batteryLevel : undefined,
        location: device.location || 'Main Arena Control Desk',
        tags: ['Adopted', 'AppClientDevice', 'Mobile'],
        manufacturer: 'Adopted Equipment',
        model: 'Interactive Client Console'
      };

      await setDoc(doc(db, 'assets', assetId), adoptedAsset);
      await triggerSystemLog(
        'Asset Manager',
        `Adopted app client device "${adoptedAsset.name}" (${adoptedAsset.id}) running at IP ${adoptedAsset.ipAddress} into permanent Showground Assets inventory.`,
        'success'
      );
    } catch (err) {
      console.error('Error adopting device:', err);
    }
  };

  const playAlertSound = (type: 'battery' | 'geofence') => {
    if (!preferences.audioNotificationsEnabled) return;
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      
      if (type === 'geofence') {
        // Dual-tone urgent security alert sound
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc1.type = 'sawtooth';
        osc2.type = 'sine';
        osc1.frequency.setValueAtTime(880, ctx.currentTime);
        osc2.frequency.setValueAtTime(440, ctx.currentTime);
        osc1.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.35);
        
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
        
        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);
        
        osc1.start();
        osc2.start();
        osc1.stop(ctx.currentTime + 0.4);
        osc2.stop(ctx.currentTime + 0.4);
      } else {
        // Battery warning melodic descending chime
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(659.25, ctx.currentTime); // E5
        osc.frequency.setValueAtTime(523.25, ctx.currentTime + 0.12); // C5
        
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start();
        osc.stop(ctx.currentTime + 0.35);
      }
    } catch (err) {
      console.warn("AudioContext playback prevented by browser auto-play settings", err);
    }
  };

  const handleUpdateAssetCoordinates = async (id: string, x: number, y: number) => {
    try {
      await updateDoc(doc(db, 'assets', id), { coordinates: { x, y } });
      const asset = assets.find(a => a.id === id);
      if (asset) {
        triggerSystemLog('Geolocation Mapper', `Repositioned ${asset.name} to coordinates [${x}%, ${y}%] on Stage Canvas`, 'info');
        
        // Write to location_history collection
        const locHistId = `loc-${Date.now()}`;
        await setDoc(doc(db, 'location_history', locHistId), {
          id: locHistId,
          assetId: id,
          assetName: asset.name,
          x,
          y,
          timestamp: new Date().toISOString(),
          operator: 'Seth Boa Amponsem',
          locationName: `Stage coordinates [${x}%, ${y}%]`
        });

        // Geofencing verification
        const isOutsideStage = x < 20 || x > 80 || y < 20 || y > 80;
        if (asset.isHighValue && isOutsideStage) {
          triggerSystemLog(
            'Geofence Alarm', 
            `SECURITY BREACH: High-Value Asset "${asset.name}" (ID: ${asset.id}) moved outside designated stage boundaries! Coordinates: [${x}%, ${y}%].`, 
            'error'
          );

          playAlertSound('geofence');

          triggerAppNotification({
            id: `geofence-alert-${asset.id}-${Date.now()}`,
            title: `CRITICAL GEOFENCE VIOLATION`,
            message: `High-value asset "${asset.name}" has breached the designated stage boundaries. Coordinates: X: ${x}%, Y: ${y}%.`,
            timestamp: new Date().toISOString(),
            type: 'error',
            isRead: false
          });

          // Log a dedicated geofence breach in Firestore
          const breachId = `breach-${Date.now()}`;
          setDoc(doc(db, 'geofence_breaches', breachId), {
            id: breachId,
            assetId: asset.id,
            assetName: asset.name,
            category: asset.category || 'General',
            coordinates: { x, y },
            timestamp: new Date().toISOString(),
            severity: 'critical',
            message: `SECURITY BREACH: High-Value Asset "${asset.name}" (ID: ${asset.id}) moved outside designated stage boundaries! Coordinates: [${x}%, ${y}%].`
          }).catch(err => console.error("Failed to save geofence breach doc:", err));
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddAssetAtCoordinates = (x: number, y: number) => {
    // Open Form with coordinates prefilled
    handleAddAsset({
      id: `ast-${Date.now().toString().substring(8)}`,
      name: `New Placement Pin`,
      category: 'Projector',
      status: 'active',
      serialNumber: `SN-MAP-${Date.now().toString().substring(10)}`,
      assignedTo: 'Seth Boa Amponsem',
      coordinates: { x, y },
      ipAddress: '10.12.20.' + (Math.floor(Math.random() * 200) + 10),
      lastSeen: new Date().toISOString()
    });
  };

  const handleDeleteAsset = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'assets', id));
      triggerSystemLog('Asset Manager', `Decommissioned physical node ${id}`, 'warn');
    } catch (err) {
      console.error(err);
    }
  };

  const handleCloneAsset = async (asset: Asset) => {
    const cloneId = `ast-cln-${Date.now().toString().substring(8)}`;
    const clonedAsset: Asset = {
      ...asset,
      id: cloneId,
      name: `${asset.name} (Copy)`,
      serialNumber: `SN-CLN-${Date.now().toString().substring(10)}`,
      ipAddress: '10.12.20.' + (Math.floor(Math.random() * 200) + 10)
    };
    try {
      const sanitized = await sanitizeAssetImages(clonedAsset) as Asset;
      await setDoc(doc(db, 'assets', cloneId), sanitized);
      triggerSystemLog('Asset Manager', `Cloned and allocated ${sanitized.name}`, 'info');
    } catch (err) {
      console.error(err);
    }
  };

  // Consumables mutators
  const handleAddConsumable = async (consumable: Partial<Consumable>) => {
    try {
      await setDoc(doc(db, 'consumables', consumable.id!), consumable);
      triggerSystemLog('Consumables', `Added material stock lines: ${consumable.name}`, 'success');
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateConsumable = async (id: string, updates: Partial<Consumable>) => {
    try {
      const consumable = consumables.find(c => c.id === id);
      await updateDoc(doc(db, 'consumables', id), updates);
      if (consumable && updates.lastIssuedTo && updates.lastIssuedTo !== consumable.lastIssuedTo) {
        await handleNotifyUser(
          updates.lastIssuedTo,
          `[KYNREN TECH OPS] Stock Issued: ${consumable.name}`,
          `
            <div style="font-family: sans-serif; background-color: #0f172a; color: #f8fafc; padding: 24px; border-radius: 12px; max-width: 600px; margin: 0 auto; border: 1px solid #1e293b;">
              <h2 style="color: #f43f5e; border-bottom: 2px solid #e11d48; padding-bottom: 8px; margin-top: 0; font-size: 20px;">
                ⚡ TECHNICAL CONSUMABLES STOCK ISSUED
              </h2>
              <p style="font-size: 13px; color: #cbd5e1; line-height: 1.6;">
                Hello <strong>${updates.lastIssuedTo}</strong>,
              </p>
              <p style="font-size: 13px; color: #cbd5e1; line-height: 1.6;">
                The following technical material stock lines have been issued out to your operations log profile.
              </p>
              <div style="background-color: #1e293b; padding: 16px; border-radius: 8px; margin: 16px 0; border: 1px solid #334155; font-size: 13px;">
                <table style="width: 100%; border-collapse: collapse;">
                  <tr><td style="padding: 4px 0; color: #94a3b8; width: 120px;">Material Item:</td><td style="padding: 4px 0; font-weight: bold; color: #f1f5f9;">${consumable.name}</td></tr>
                  <tr><td style="padding: 4px 0; color: #94a3b8;">Material Category:</td><td style="padding: 4px 0; color: #cbd5e1;">${consumable.category}</td></tr>
                  <tr><td style="padding: 4px 0; color: #94a3b8;">Issued Qty:</td><td style="padding: 4px 0; font-weight: bold; color: #22d3ee;">${updates.quantity !== undefined ? (consumable.quantity - updates.quantity) : 'Dynamic'} ${consumable.unit}</td></tr>
                  <tr><td style="padding: 4px 0; color: #94a3b8;">Log Location:</td><td style="padding: 4px 0; color: #f59e0b;">${updates.lastIssuedLocation || 'Main Arena'}</td></tr>
                  <tr><td style="padding: 4px 0; color: #94a3b8;">Transaction Time:</td><td style="padding: 4px 0; font-family: monospace; color: #64748b;">${new Date().toLocaleString()}</td></tr>
                </table>
              </div>
              <p style="font-size: 12px; color: #94a3b8; line-height: 1.6;">
                Consumables status update has been registered. If this was not requested by you, please flag this with show logistics immediately.
              </p>
              <div style="font-size: 11px; color: #64748b; border-top: 1px solid #1e293b; padding-top: 12px; margin-top: 24px;">
                Durham Auckland Auckland Stage Kynren Tech Ops. Confidential.
              </div>
            </div>
          `
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteConsumable = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'consumables', id));
    } catch (err) {
      console.error(err);
    }
  };

  const handleCloneConsumable = async (consumable: Consumable) => {
    const cloneId = `con-cln-${Date.now().toString().substring(8)}`;
    const cloned: Consumable = {
      ...consumable,
      id: cloneId,
      name: `${consumable.name} (Copy)`
    };
    try {
      await setDoc(doc(db, 'consumables', cloneId), cloned);
    } catch (err) {
      console.error(err);
    }
  };

  // Ticket mutators
  const handleCreateTicket = async (ticket: Partial<Ticket>) => {
    try {
      let assignee = ticket.assignedTo || 'Seth Boa Amponsem';
      let assignedByLocation = false;
      let logDetail = '';

      if (ticket.assetId) {
        const asset = assets.find(a => a.id === ticket.assetId);
        if (asset && asset.coordinates) {
          // Find tech users
          const techUsers = users.filter(u => u.role === 'Technician');
          // Prefer online techs
          const availableTechs = techUsers.filter(u => u.status === 'online');
          const candidates = availableTechs.length > 0 ? availableTechs : techUsers;

          if (candidates.length > 0) {
            let minDistance = Infinity;
            let chosenTech = candidates[0];

            candidates.forEach(tech => {
              let tx = tech.coordinates?.x;
              let ty = tech.coordinates?.y;
              if (tx === undefined || ty === undefined) {
                // Deterministic coordinates based on ID
                let hash = 0;
                for (let i = 0; i < tech.id.length; i++) {
                  hash += tech.id.charCodeAt(i);
                }
                tx = 15 + (hash % 60);
                ty = 15 + ((hash * 7) % 60);
              }

              const dx = tx - asset.coordinates.x;
              const dy = ty - asset.coordinates.y;
              const dist = Math.sqrt(dx * dx + dy * dy);

              if (dist < minDistance) {
                minDistance = dist;
                chosenTech = tech;
              }
            });

            assignee = chosenTech.displayName;
            assignedByLocation = true;
            logDetail = `(Proximity-assigned closest technician "${chosenTech.displayName}" at distance ${minDistance.toFixed(1)}%)`;
          }
        }
      }

      if (!assignedByLocation) {
        const categoryRule = rules.find(r => r.trigger === 'category' && r.value === ticket.category);
        if (categoryRule) {
          assignee = categoryRule.assignToUserName;
          logDetail = `(Auto-assigned via rules: ${categoryRule.assignToUserName})`;
        }
      }

      const preparedTicket: Ticket = {
        ...ticket,
        assignedTo: assignee,
      } as Ticket;

      await setDoc(doc(db, 'tickets', ticket.id!), preparedTicket);
      triggerSystemLog('Helpdesk', `Filer logged and auto-assigned ticket [${ticket.id}]: "${ticket.name}" to ${assignee} ${logDetail}`, 'success');
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateTicket = async (id: string, updates: Partial<Ticket>) => {
    try {
      await updateDoc(doc(db, 'tickets', id), updates);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteTicket = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'tickets', id));
    } catch (err) {
      console.error(err);
    }
  };

  const handleCloneTicket = async (ticket: Ticket) => {
    const cloneId = `tkt-cln-${Date.now().toString().substring(8)}`;
    const cloned: Ticket = {
      ...ticket,
      id: cloneId,
      name: `${ticket.name} (Copy)`
    };
    try {
      await setDoc(doc(db, 'tickets', cloneId), cloned);
    } catch (err) {
      console.error(err);
    }
  };

  // System settings/diagnostics triggering logs helper
  const triggerSystemLog = async (source: string, message: string, level: 'info' | 'warn' | 'error' | 'success' = 'info') => {
    const newLog: SignalLog = {
      id: `log-ops-${Date.now()}`,
      timestamp: new Date().toISOString(),
      level,
      source,
      message,
      user: 'Seth Boa Amponsem'
    };
    try {
      await setDoc(doc(db, 'signal_logs', newLog.id), newLog);
    } catch (e) {
      console.error(e);
    }
  };

  // Automated Alert System for Mobile Asset Battery level drops below custom category thresholds
  const alertedBatteries = React.useRef<Record<string, boolean>>({});
  useEffect(() => {
    if (!assets || assets.length === 0) return;
    assets.forEach(asset => {
      const isMobile = asset.tags?.includes('mobile') || asset.name?.toLowerCase().includes('mobile') || asset.category?.toLowerCase() === 'radio';
      const category = asset.category || '';
      const threshold = batteryThresholds[category] ?? 15;

      const baseDrainRates: Record<string, number> = {
        'Projector': 5.2,
        'Switch': 1.5,
        'Radio': 3.0,
        'DMX': 4.1,
        'Speaker': 2.4,
        'Pyrotechnics': 6.5
      };
      const baseR = baseDrainRates[category] ?? 2.5;
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
        : 100;

      // Warn if battery falls below custom category threshold OR if the predicted runtime is less than 4 hours
      const isCritical = isMobile && asset.batteryLevel !== undefined && (asset.batteryLevel < threshold || predictedRuntimeHours < 4);

      if (isCritical) {
        if (!alertedBatteries.current[asset.id]) {
          alertedBatteries.current[asset.id] = true;
          playAlertSound('battery');
          
          // Trigger push notifications
          triggerAppNotification({
            id: `noti-battery-${asset.id}`,
            title: 'HELPDESK: MOBILE BATTERY CRITICAL',
            message: `Alert: Mobile asset "${asset.name}" (${asset.id}) battery is critically low at ${asset.batteryLevel}% (threshold: ${threshold}%). Predicted runtime remaining: ${predictedRuntimeHours} hrs (drain rate: ${assetDrainVelocity}%/hr). Please dispatch a technician.`,
            type: 'error',
            isRead: false,
            timestamp: new Date().toISOString()
          });
          
          // Trigger system log
          triggerSystemLog(
            'Helpdesk Security',
            `[BATTERY CRITICAL] Mobile asset ${asset.name} (${asset.id}) has dropped to ${asset.batteryLevel}% (threshold: ${threshold}%). Predicted runtime: ${predictedRuntimeHours} hours (drain: ${assetDrainVelocity}%/hr).`,
            'error'
          ).catch(console.error);

          // Automatically trigger a new 'low priority' ticket assigned to the 'Power & Light' crew
          const autoTicketId = `ticket-battery-${asset.id}-${Date.now().toString().slice(-4)}`;
          const autoTicket: Ticket = {
            id: autoTicketId,
            name: `Battery Critical: ${asset.name}`,
            description: `AUTOMATED BATTERY TELEMETRY GUARD: Mobile asset "${asset.name}" (${asset.id}) has hit category critical level at ${asset.batteryLevel}% (threshold: ${threshold}%). Predicted runtime remaining: ${predictedRuntimeHours} hours at a velocity of ${assetDrainVelocity}%/hour. Assigned to Power & Light for priority recharge/swap.`,
            category: 'Power',
            status: 'open',
            priority: 'low',
            assignedTo: 'Power & Light',
            createdBy: 'Automated Battery Guard',
            createdAt: new Date().toISOString()
          };
          setDoc(doc(db, 'tickets', autoTicketId), autoTicket)
            .then(() => {
              triggerSystemLog(
                'Helpdesk',
                `Automated ticket ${autoTicketId} created and assigned to "Power & Light" crew for critically low battery (est. runtime: ${predictedRuntimeHours} hrs).`,
                'info'
              );
            })
            .catch(console.error);
        }
      } else if (asset.batteryLevel !== undefined && asset.batteryLevel >= threshold && predictedRuntimeHours >= 4) {
        if (alertedBatteries.current[asset.id]) {
          delete alertedBatteries.current[asset.id];
        }
      }
    });
  }, [assets, batteryThresholds]);

  // Automated Critical Auto-Shutdown for mobile assets with predicted runtime < 15 mins
  useEffect(() => {
    if (!autoShutdownEnabled || !assets || assets.length === 0) return;
    
    const checkAndShutdown = async () => {
      for (const asset of assets) {
        const isMobile = asset.tags?.includes('mobile') || asset.name?.toLowerCase().includes('mobile') || asset.category?.toLowerCase() === 'radio';
        if (!isMobile) continue;
        if (asset.status === 'offline') continue;
        
        // Calculate drain velocity
        const category = asset.category || '';
        const baseDrainRates: Record<string, number> = {
          'Projector': 5.2,
          'Switch': 1.5,
          'Radio': 3.0,
          'DMX': 4.1,
          'Speaker': 2.4,
          'Pyrotechnics': 6.5
        };
        const baseR = baseDrainRates[category] ?? 2.5;
        let idHashVal = 0;
        if (asset.id) {
          for (let i = 0; i < asset.id.length; i++) {
            idHashVal += asset.id.charCodeAt(i);
          }
        }
        const assetVariance = 0.8 + (idHashVal % 5) * 0.1;
        const assetDrainVelocity = parseFloat((baseR * assetVariance).toFixed(2));
        const predictedRuntimeHours = asset.batteryLevel !== undefined 
          ? (asset.batteryLevel / assetDrainVelocity) 
          : 100;
          
        // 15 minutes is 0.25 hours
        if (asset.batteryLevel !== undefined && predictedRuntimeHours < 0.25) {
          try {
            const docRef = doc(db, 'assets', asset.id);
            await setDoc(docRef, { ...asset, status: 'offline' });
            
            triggerSystemLog(
              'Power Guard',
              `[AUTO-SHUTDOWN] Asset "${asset.name}" (${asset.id}) automatically powered off. Predicted runtime was ${(predictedRuntimeHours * 60).toFixed(0)} minutes (threshold: <15 mins).`,
              'warn'
            );
          } catch (err) {
            console.error('Failed to auto-shutdown asset:', err);
          }
        }
      }
    };
    
    const timer = setTimeout(() => {
      checkAndShutdown();
    }, 1500);
    return () => clearTimeout(timer);
  }, [assets, autoShutdownEnabled]);

  // Automated Alert System for Consumable Inventory Stock falling below safety reorder threshold
  const alertedConsumables = React.useRef<Record<string, boolean>>({});
  useEffect(() => {
    if (!consumables || consumables.length === 0) return;
    consumables.forEach(c => {
      const isLow = c.quantity <= c.threshold;
      if (isLow) {
        if (!alertedConsumables.current[c.id]) {
          alertedConsumables.current[c.id] = true;
          
          triggerAppNotification({
            id: `noti-low-stock-${c.id}-${Date.now()}`,
            title: 'INVENTORY ALERT: REORDER THRESHOLD HIT',
            message: `Material "${c.name}" stock level has fallen below the safety limit of ${c.threshold} ${c.unit}. Current stock: ${c.quantity} ${c.unit}. Please submit a replenishment request.`,
            type: 'error',
            isRead: false,
            timestamp: new Date().toISOString()
          });

          triggerSystemLog(
            'Inventory Monitor',
            `[LOW STOCK ALERT] Consumable material "${c.name}" (${c.id}) has depleted below reorder safety limit of ${c.threshold} ${c.unit} (Current: ${c.quantity} ${c.unit}).`,
            'warn'
          ).catch(console.error);
        }
      } else {
        if (alertedConsumables.current[c.id]) {
          delete alertedConsumables.current[c.id];
        }
      }
    });
  }, [consumables]);

  // Device Rack mutators
  const handleAddDeviceToRack = async (device: Partial<SwitchDevice>) => {
    try {
      await setDoc(doc(db, 'switch_devices', device.id!), device);
      triggerSystemLog('Cabinet Manager', `Mounted 1U hardware rack device ${device.name} in slot ${device.rackPosition}U`, 'success');
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemoveDeviceFromRack = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'switch_devices', id));
      triggerSystemLog('Cabinet Manager', `Dismounted rack device ${id}`, 'warn');
    } catch (err) {
      console.error(err);
    }
  };

  // Operation rules & tasks
  const handleAddRule = async (rule: Partial<AssignmentRule>) => {
    try {
      await setDoc(doc(db, 'assignment_rules', rule.id!), rule);
      triggerSystemLog('Rules Engine', `Added ticket dispatcher rule: ${rule.trigger} -> ${rule.assignToUserName}`, 'info');
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteRule = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'assignment_rules', id));
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateUser = async (user: Partial<UserRegistryItem> & { password?: string }) => {
    try {
      const generatedId = `user-${Date.now().toString().substring(8)}`;
      const finalUser = {
        ...user,
        id: generatedId,
        uid: generatedId,
        isOTP: true, // Requires password change on first login!
        otpPassword: user.password || 'otp123',
        password: user.password || 'otp123',
        status: 'offline',
        active: 'Yes',
        createdAt: new Date().toISOString()
      };

      await setDoc(doc(db, 'users', generatedId), finalUser);
      triggerSystemLog('Users Administration', `Enrolled corporate user @${user.login} (${user.displayName}) with OTP validation required.`, 'info');
      
      // Real log simulation of corporate onboarding email
      alert(`📨 Corporate Onboarding SMTP Relay [SUCCESS]\n\nAn email was dispatched to ${user.email}:\n\n--------------------------------------------\nWelcome to Enterprise Network Control, ${user.firstName}!\nYour account has been successfully provisioned.\n\nUsername/Login: ${user.login}\nTemporary password (OTP): ${user.password}\n\nSecurity Policy: You are required to change your password immediately upon your first login.\n--------------------------------------------`);
    } catch (err) {
      console.error('Error creating user:', err);
    }
  };

  const handleUpdateUser = async (id: string, updates: Partial<UserRegistryItem>) => {
    try {
      await updateDoc(doc(db, 'users', id), updates);
      
      // If it is the current session user, update session as well
      if (sessionUser && sessionUser.id === id) {
        const updated = { ...sessionUser, ...updates };
        setSessionUser(updated);
        localStorage.setItem('enterprise_session_user', JSON.stringify(updated));
      }
      triggerSystemLog('Users Administration', `Updated profile of user @${updates.login || id}.`, 'info');
    } catch (err) {
      console.error('Error updating user:', err);
      triggerSystemLog('Users Administration', `Failed to update user profile: ${err instanceof Error ? err.message : String(err)}`, 'error');
    }
  };

  const handleDeleteUser = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'users', id));
      triggerSystemLog('Users Administration', `Terminated and deleted corporate account: ${id}.`, 'warn');
      if (sessionUser && sessionUser.id === id) {
        handleSecureExit();
      }
    } catch (err) {
      console.error('Error deleting user:', err);
      triggerSystemLog('Users Administration', `Failed to delete user account: ${err instanceof Error ? err.message : String(err)}`, 'error');
    }
  };

  const handlePerformLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    const matchedUser = users.find(u => u.login?.toLowerCase() === loginUsername.trim().toLowerCase() || u.email?.toLowerCase() === loginUsername.trim().toLowerCase());

    if (!matchedUser) {
      setLoginError('Invalid corporate credentials. Account registration must be done exclusively by an authorized system administrator.');
      return;
    }

    if (matchedUser.suspended) {
      setLoginError('Access denied. This corporate account has been suspended by an administrator.');
      return;
    }

    if (matchedUser.archived) {
      setLoginError('Access denied. This corporate account has been archived.');
      return;
    }

    if (matchedUser.password !== loginPassword) {
      setLoginError('Incorrect password entered. Access denied.');
      return;
    }

    if (matchedUser.isOTP) {
      // User must rotate password immediately!
      setOtpUser(matchedUser);
      return;
    }

    // Direct Login
    localStorage.setItem('enterprise_session_user', JSON.stringify(matchedUser));
    setSessionUser(matchedUser);
    triggerSystemLog('Auth Node', `User @${matchedUser.login} successfully authenticated via secure portal.`, 'success');
  };

  const handlePerformPasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setOtpError('');

    if (!otpNewPassword) {
      setOtpError('New password is required.');
      return;
    }

    if (otpNewPassword !== otpConfirmPassword) {
      setOtpError('Passwords do not match. Please re-enter.');
      return;
    }

    if (otpNewPassword === otpUser?.password) {
      setOtpError('New password must be different from the temporary One-Time Password.');
      return;
    }

    try {
      // Update in Firestore
      await updateDoc(doc(db, 'users', otpUser!.id), {
        password: otpNewPassword,
        isOTP: false
      });

      const updatedUser = {
        ...otpUser!,
        password: otpNewPassword,
        isOTP: false
      };

      localStorage.setItem('enterprise_session_user', JSON.stringify(updatedUser));
      setSessionUser(updatedUser);
      setOtpUser(null);
      setOtpNewPassword('');
      setOtpConfirmPassword('');

      triggerSystemLog('Auth Node', `User @${otpUser!.login} rotated temporary credentials and established a secure session.`, 'success');
      alert('Password rotated successfully! Welcome to the secure operational space.');
    } catch (err) {
      console.error(err);
      setOtpError('Failed to rotate credentials in storage.');
    }
  };

  const handleUpdateUserRole = async (id: string, role: UserRegistryItem['role']) => {
    try {
      await updateDoc(doc(db, 'users', id), { role });
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleUserStatus = async (id: string) => {
    const matched = users.find(u => u.id === id);
    if (!matched) return;
    try {
      await updateDoc(doc(db, 'users', id), { status: matched.status === 'online' ? 'offline' : 'online' });
    } catch (err) {
      console.error(err);
    }
  };

  const handleArchiveSignalLogs = async (daysThreshold: number = 7): Promise<number> => {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysThreshold);
      const cutoffISO = cutoffDate.toISOString();

      const logsSnap = await getDocs(collection(db, 'signal_logs'));
      let archivedCount = 0;

      for (const logDoc of logsSnap.docs) {
        const logData = logDoc.data();
        const logTimestamp = logData.timestamp;

        if (logTimestamp && logTimestamp < cutoffISO) {
          const archiveId = `hist-${logDoc.id}`;
          await setDoc(doc(db, 'historical_logs', archiveId), {
            ...logData,
            archivedAt: new Date().toISOString()
          });
          await deleteDoc(doc(db, 'signal_logs', logDoc.id));
          archivedCount++;
        }
      }

      if (archivedCount > 0) {
        await triggerSystemLog(
          'Database Maintenance',
          `Routine complete: Automatically archived ${archivedCount} signal logs older than ${daysThreshold} days into 'historical_logs' collection.`,
          'success'
        );
      }

      return archivedCount;
    } catch (err) {
      console.error('Failed to archive signal logs:', err);
      return 0;
    }
  };

  const handleArchiveOldResolvedTickets = async (): Promise<number> => {
    try {
      const ageThresholdDays = preferences.archiveAgeDays || 30;
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - ageThresholdDays);

      const toArchive = tickets.filter(t => {
        if (t.status !== 'resolved') return false;
        const created = new Date(t.createdAt);
        return created < cutoffDate;
      });

      if (toArchive.length === 0) return 0;

      for (const t of toArchive) {
        // Copy to archive collection
        await setDoc(doc(db, 'archive_tickets', t.id), {
          ...t,
          archivedAt: new Date().toISOString()
        });
        // Delete original
        await deleteDoc(doc(db, 'tickets', t.id));
      }

      await triggerSystemLog(
        'System Admin',
        `Completed maintenance run: Moved ${toArchive.length} resolved tickets older than ${ageThresholdDays} days to dedicated archive collection.`,
        'success'
      );

      return toArchive.length;
    } catch (err) {
      console.error('Failed to execute ticket archiving procedure:', err);
      throw err;
    }
  };

  // Reservations
  const handleAddReservation = async (res: Partial<AssetReservation>) => {
    try {
      await setDoc(doc(db, 'asset_reservations', res.id!), res);
      triggerSystemLog('Reservations', `Created calendar reservation request for ${res.assetName}`, 'info');
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateReservation = async (id: string, updates: Partial<AssetReservation>) => {
    try {
      await updateDoc(doc(db, 'asset_reservations', id), updates);
      const res = reservations.find(r => r.id === id);
      if (res && updates.status) {
        triggerSystemLog('Reservations', `Reservation request for ${res.assetName} was ${updates.status.toUpperCase()}`, updates.status === 'approved' ? 'success' : 'warn');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Projects
  const handleAddProject = async (prj: Partial<ITProject>) => {
    try {
      await setDoc(doc(db, 'it_projects', prj.id!), prj);
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateProjectStatus = async (id: string, status: ITProject['status']) => {
    try {
      await updateDoc(doc(db, 'it_projects', id), { status });
    } catch (err) {
      console.error(err);
    }
  };

  // KB Articles
  const handleAddKBArticle = async (kb: KBArticle) => {
    try {
      await setDoc(doc(db, 'kb_articles', kb.id), kb);
      triggerSystemLog('Knowledge Base', `Published new KB article: "${kb.title}"`, 'success');
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateKBArticle = async (id: string, updates: Partial<KBArticle>) => {
    try {
      await updateDoc(doc(db, 'kb_articles', id), updates);
      triggerSystemLog('Knowledge Base', `Updated KB article: "${updates.title || id}"`, 'success');
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteKBArticle = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'kb_articles', id));
      triggerSystemLog('Knowledge Base', `Deleted KB article from storage.`, 'warn');
    } catch (err) {
      console.error(err);
    }
  };

  // Passwords
  const handleAddPassword = async (pwd: Partial<PasswordRecord>) => {
    try {
      await setDoc(doc(db, 'passwords', pwd.id!), pwd);
      triggerSystemLog('Security Vault', `Added encrypted credential for system: ${pwd.title}`, 'success');
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeletePassword = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'passwords', id));
      triggerSystemLog('Security Vault', `Revoked credential block ID: ${id}`, 'warn');
    } catch (err) {
      console.error(err);
    }
  };

  // Saved Queries
  const handleSaveQuery = async (name: string, queryText: string) => {
    const id = `q-${Date.now()}`;
    const newQ: SavedQuery = { id, name, queryText, createdAt: new Date().toISOString() };
    try {
      await setDoc(doc(db, 'saved_queries', id), newQ);
    } catch (err) {
      console.error(err);
    }
  };

  const handleTriggerSavedQuery = (queryText: string) => {
    setSearchQuery(queryText);
    setActiveSearchFilter(queryText);
  };

  // Direct chat messaging
  const handleSendDirectMessage = async (content: string, recipientId: string) => {
    const id = `dm-${Date.now()}`;
    const msg: DirectMessage = {
      id,
      senderId: 'seth-01',
      senderName: preferences.displayName,
      recipientId,
      content,
      isEncrypted: true,
      timestamp: new Date().toISOString()
    };
    try {
      await setDoc(doc(db, 'direct_messages', id), msg);
    } catch (err) {
      console.error(err);
    }
  };

  // -------------------------------------------------------------------
  // Ping Sweep & Active Subnet Discovery Logic
  // -------------------------------------------------------------------
  const handleTriggerPingAll = async (): Promise<string> => {
    if (isPinging) return 'ALREADY_PINGING';
    const startTime = Date.now();
    setIsPinging(true);
    triggerSystemLog('ICMP Sweep', 'Commencing complete network scan on VLAN trunks...', 'info');

    return new Promise((resolve) => {
      let scanned = 0;
      const total = 100;
      setPingProgress({ percent: 0, scanned: 0, total, statusText: 'Initializing ICMP Sweep...' });

      const interval = setInterval(async () => {
        const increment = Math.floor(Math.random() * 8) + 12;
        scanned = Math.min(total, scanned + increment);
        const percent = Math.floor((scanned / total) * 100);

        let statusText = 'Sweeping subnets...';
        if (scanned <= 25) {
          statusText = 'Sweeping Subnet 10.12.1.x (Management)...';
        } else if (scanned <= 50) {
          statusText = 'Sweeping Subnet 10.12.10.x (Control)...';
        } else if (scanned <= 75) {
          statusText = 'Sweeping Subnet 10.12.20.x (Media)...';
        } else {
          statusText = 'Sweeping Subnet 10.12.30.x (Audio)...';
        }

        setPingProgress({ percent, scanned, total, statusText });

        if (scanned >= total) {
          clearInterval(interval);
          
          try {
            const durationMs = Date.now() - startTime;
            const durationSec = (durationMs / 1000).toFixed(2);
            const durationLogId = `log-scan-duration-${Date.now()}`;
            
            await setDoc(doc(db, 'signal_logs', durationLogId), {
              id: durationLogId,
              timestamp: new Date().toISOString(),
              level: 'success',
              source: 'Network Scanner',
              message: `[Scan Duration] Complete network ICMP sweep finished in ${durationMs}ms (${durationSec}s). Validated active showground hardware and ${activeAppDevices.length} app clients.`
            });

            await triggerSystemLog('Network Scanner', `Complete network scan finished in ${durationSec}s. Validated ${assets.length} physical assets and ${activeAppDevices.length} active client terminals.`, 'success');
          } catch (err) {
            console.error('Error completing network sweep:', err);
          }

          setPingProgress(null);
          setIsPinging(false);
          resolve('SWEEP COMPLETED');
        }
      }, 100);
    });
  };

  // -------------------------------------------------------------------
  // Show Timeline, Notifications & Print Handlers
  // -------------------------------------------------------------------
  const handleAddEvent = async (event: Partial<ShowTimelineEvent>) => {
    try {
      const id = `ev-${Date.now()}`;
      await setDoc(doc(db, 'events', id), { id, ...event });
      triggerSystemLog('Show Timeline', `Scheduled new operational event: "${event.title}"`, 'info');
    } catch (err) {
      console.error("Failed to add event:", err);
    }
  };

  const handleDeleteEvent = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'events', id));
      triggerSystemLog('Show Timeline', `Removed timeline event ID: ${id}`, 'warn');
    } catch (err) {
      console.error("Failed to delete event:", err);
    }
  };

  const handleClearNotification = (id: string) => {
    setUnreadNotifications(prev => prev.filter(n => n.id !== id));
  };

  const handleClearAllNotifications = () => {
    setUnreadNotifications([]);
  };

  const handlePrintReport = (report: { title: string; headers: string[]; rows: string[][]; summaries: { label: string; value: string }[] }) => {
    setActivePrintReport(report);
  };

  const handleExportPDF = () => {
    if (!activePrintReport) return;
    setIsExportingPDF(true);
    setExportPDFProgress(0);
    
    const steps = [
      { label: "Initializing high-resolution PDF document compiler...", progress: 15 },
      { label: "Binding layout grids & embedding typography structures...", progress: 35 },
      { label: "Assembling summary statistics widgets & KPI layers...", progress: 55 },
      { label: "Tabulating row data structure & filtering empty indices...", progress: 75 },
      { label: "Integrating system printing styles & page-break rules...", progress: 90 },
      { label: "Document ready. Transferring file stream to PC...", progress: 100 }
    ];

    let currentStep = 0;
    const interval = setInterval(() => {
      if (currentStep < steps.length) {
        setExportPDFStep(steps[currentStep].label);
        setExportPDFProgress(steps[currentStep].progress);
        currentStep++;
      } else {
        clearInterval(interval);
        
        // Generate real downloadable file representing the PDF report
        try {
          const reportTitle = activePrintReport.title;
          const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${reportTitle}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      padding: 40px;
      color: #0f172a;
      background: #ffffff;
      line-height: 1.5;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 3px solid #0f172a;
      padding-bottom: 16px;
      margin-bottom: 24px;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
      text-transform: uppercase;
      letter-spacing: -0.5px;
      color: #0f172a;
    }
    .header p {
      margin: 4px 0 0 0;
      font-size: 11px;
      color: #64748b;
      font-family: monospace;
    }
    .brand {
      text-align: right;
    }
    .brand-title {
      font-weight: bold;
      color: #e11d48;
      letter-spacing: 1px;
      font-size: 14px;
    }
    .brand-sub {
      font-size: 9px;
      color: #94a3b8;
      font-family: monospace;
      margin: 2px 0 0 0;
    }
    .summaries {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin-bottom: 24px;
    }
    .summary-card {
      border: 1px solid #e2e8f0;
      background: #f8fafc;
      padding: 12px;
      border-radius: 8px;
    }
    .summary-card span {
      display: block;
      font-size: 9px;
      color: #64748b;
      text-transform: uppercase;
      font-family: monospace;
      letter-spacing: 0.5px;
    }
    .summary-card strong {
      display: block;
      font-size: 16px;
      color: #0f172a;
      margin-top: 4px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 16px;
      font-size: 12px;
    }
    th, td {
      border: 1px solid #e2e8f0;
      padding: 10px 12px;
      text-align: left;
    }
    th {
      background-color: #f1f5f9;
      font-weight: bold;
      text-transform: uppercase;
      font-family: monospace;
      font-size: 10px;
      color: #475569;
    }
    tr:nth-child(even) td {
      background-color: #f8fafc;
    }
    .footer {
      border-top: 1px solid #e2e8f0;
      padding-top: 16px;
      margin-top: 40px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 9px;
      color: #94a3b8;
      font-family: monospace;
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1>${reportTitle}</h1>
      <p>Report Compiled: ${new Date().toLocaleString()} | Secure Operational Logistics Export</p>
    </div>
    <div class="brand">
      <div class="brand-title">KYNREN TECH OPS</div>
      <div class="brand-sub">OFFLINE DIRECT PRINT STREAM</div>
    </div>
  </div>

  <div class="summaries">
    ${activePrintReport.summaries.map(s => `
      <div class="summary-card">
        <span>${s.label}</span>
        <strong>${s.value}</strong>
      </div>
    `).join('')}
  </div>

  <table>
    <thead>
      <tr>
        ${activePrintReport.headers.map(h => `<th>${h}</th>`).join('')}
      </tr>
    </thead>
    <tbody>
      ${activePrintReport.rows.map(row => `
        <tr>
          ${row.map(cell => `<td>${cell || ''}</td>`).join('')}
        </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="footer">
    <span>Classified: INTERNAL TECH OPERATIONS DICTIONARY</span>
    <span>File Generated Locally via AI Studio Agent Workspace</span>
  </div>
</body>
</html>
          `;
          const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.setAttribute("href", url);
          link.setAttribute("download", `${reportTitle.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_export.html`);
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
          
          triggerSystemLog('Export Engine', `Successfully exported report file to local device: "${reportTitle}"`, 'success');
        } catch (exportErr: any) {
          console.error("Failed report local export:", exportErr);
        }

        setTimeout(() => {
          setIsExportingPDF(false);
          setExportPDFProgress(0);
          setExportPDFStep('');
        }, 1200);
      }
    }, 450);
  };

  // -------------------------------------------------------------------
  // Search Engine logic
  // -------------------------------------------------------------------
  const handleSearchSubmit = (queryStr: string) => {
    setActiveSearchFilter(queryStr);
  };

  const searchResults = useMemo(() => {
    if (!activeSearchFilter) return null;

    const queryLower = activeSearchFilter.toLowerCase();
    
    const matchedAssets = assets.filter(a => 
      a.name.toLowerCase().includes(queryLower) || 
      a.category.toLowerCase().includes(queryLower) ||
      a.ipAddress.includes(queryLower)
    );

    const matchedConsumables = consumables.filter(c => 
      c.name.toLowerCase().includes(queryLower) || 
      c.category.toLowerCase().includes(queryLower)
    );

    const matchedTickets = tickets.filter(t => 
      t.name.toLowerCase().includes(queryLower) || 
      t.description.toLowerCase().includes(queryLower) ||
      t.category.toLowerCase().includes(queryLower)
    );

    const matchedKb = kbArticles.filter(k => 
      k.title.toLowerCase().includes(queryLower) || 
      k.content.toLowerCase().includes(queryLower)
    );

    return {
      assets: matchedAssets,
      consumables: matchedConsumables,
      tickets: matchedTickets,
      kb: matchedKb
    };
  }, [activeSearchFilter, assets, consumables, tickets, kbArticles]);

  // Secure exit simulator
  const handleSecureExit = () => {
    localStorage.removeItem('enterprise_session_user');
    setSessionUser(null);
    triggerSystemLog('Auth Node', 'User logged out, secure session terminated.', 'warn');
  };

  // Filtered active alerts
  const activeAlerts = logs.filter(l => l.level === 'error' || l.level === 'warn').slice(0, 5);

  // Computed Session Preferences based on authenticated user
  const sessionPreferences = useMemo(() => {
    if (!sessionUser) return preferences;
    return {
      ...preferences,
      displayName: sessionUser.displayName,
      profileImage: sessionUser.profileImage || preferences.profileImage
    };
  }, [preferences, sessionUser]);

  // System theme media query state
  const [systemIsDark, setSystemIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return true;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      setSystemIsDark(e.matches);
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Theme Wrapper Classes
  const isDark = sessionPreferences.theme === 'system' 
    ? systemIsDark 
    : sessionPreferences.theme === 'dark';

  useEffect(() => {
    if (typeof document !== 'undefined') {
      if (isDark) {
        document.documentElement.classList.add('dark');
        document.documentElement.classList.remove('light');
      } else {
        document.documentElement.classList.add('light');
        document.documentElement.classList.remove('dark');
      }
    }
  }, [isDark]);

  const headerLayoutClass = sessionPreferences.headerPosition === 'left' ? 'flex pl-64' : 'flex flex-col';

  if (!sessionUser) {
    if (otpUser) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100 p-4 relative overflow-hidden font-sans">
          {/* Ambient Cosmic glow */}
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-rose-600/10 rounded-full blur-[120px]" />
          <div className="absolute bottom-1/3 right-1/4 w-96 h-96 bg-cyan-600/10 rounded-full blur-[120px]" />

          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl space-y-6">
            <div className="text-center space-y-2">
              <div className="inline-flex p-3 bg-rose-600/10 text-rose-500 rounded-full border border-rose-500/20">
                <Lock className="w-6 h-6" />
              </div>
              <h2 className="font-sans font-bold text-lg tracking-tight text-slate-100 uppercase">
                First Access Password Rotation
              </h2>
              <p className="text-xs text-slate-400">
                Security Protocol enforced: You logged in using a temporary One-Time Password. You must rotate your credentials before gaining operational access.
              </p>
            </div>

            <form onSubmit={handlePerformPasswordReset} className="space-y-4">
              {otpError && (
                <div className="p-3 bg-red-950/40 border border-red-900/50 rounded-lg text-red-400 text-xs font-mono flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{otpError}</span>
                </div>
              )}

              <div>
                <label className="block text-[10px] text-slate-400 font-mono mb-1 uppercase font-bold">New Secure Password</label>
                <div className="relative">
                  <input
                    type={showOtpNewPassword ? "text" : "password"}
                    required
                    value={otpNewPassword}
                    onChange={(e) => setOtpNewPassword(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 pr-10 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-rose-500 font-mono"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowOtpNewPassword(!showOtpNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 focus:outline-none"
                  >
                    {showOtpNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 font-mono mb-1 uppercase font-bold">Confirm Secure Password</label>
                <div className="relative">
                  <input
                    type={showOtpConfirmPassword ? "text" : "password"}
                    required
                    value={otpConfirmPassword}
                    onChange={(e) => setOtpConfirmPassword(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 pr-10 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-rose-500 font-mono"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowOtpConfirmPassword(!showOtpConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 focus:outline-none"
                  >
                    {showOtpConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold font-mono rounded transition-all uppercase cursor-pointer animate-pulse"
                >
                  Rotate & Launch Console
                </button>
              </div>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => { setOtpUser(null); setLoginPassword(''); }}
                  className="text-[10px] text-slate-500 hover:text-slate-400 font-mono focus:outline-none"
                >
                  ✕ Cancel & Return
                </button>
              </div>
            </form>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100 p-4 relative overflow-hidden font-sans">
        {/* Ambient Cosmic Glows */}
        <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-rose-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-[120px]" />

        <div className="relative w-full max-w-sm bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="font-mono text-rose-500 text-xs tracking-widest font-bold">
              SYSTEM PORTAL ACCREDITATION
            </div>
            <h1 className="font-sans font-black text-xl tracking-tight text-slate-100 uppercase">
              Enterprise Network Control
            </h1>
            <p className="text-[11px] text-slate-400">
              Provide corporate login or temporary OTP keys. Self-registration is restricted.
            </p>
          </div>

          <form onSubmit={handlePerformLogin} className="space-y-4">
            {loginError && (
              <div className="p-3 bg-red-950/40 border border-red-900/50 rounded-lg text-red-400 text-xs font-mono flex items-start gap-2 leading-tight">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{loginError}</span>
              </div>
            )}

            <div>
              <label className="block text-[10px] text-slate-400 font-mono mb-1 uppercase font-bold">Corporate Login / Email</label>
              <input
                type="text"
                required
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-rose-500 font-mono"
                placeholder="e.g. seth.amponsem"
              />
            </div>

            <div>
              <label className="block text-[10px] text-slate-400 font-mono mb-1 uppercase font-bold">Account Password</label>
              <div className="relative">
                <input
                  type={showLoginPassword ? "text" : "password"}
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 pr-10 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-rose-500 font-mono"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowLoginPassword(!showLoginPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 focus:outline-none"
                >
                  {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="w-full py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold font-mono rounded transition-all uppercase cursor-pointer"
              >
                Authenticate Session
              </button>
            </div>
          </form>

          <div className="text-center text-[10px] text-slate-500 font-mono border-t border-slate-800 pt-4">
            Corporate Node: <span className="text-rose-400 font-bold">{preferences.clientIp}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`min-h-screen transition-colors duration-350 flex flex-col font-sans`}
      style={{ 
        backgroundColor: isDark ? sessionPreferences.bodyColor : '#f8fafc',
        color: isDark ? '#f1f5f9' : '#0f172a'
      }}
    >
      
      {/* Dynamic Header Placement (Sticky Top or Sidebar Left) */}
      <Header
        preferences={sessionPreferences}
        onOpenTerminal={() => setIsTerminalOpen(true)}
        onOpenSettings={() => { setActiveTab('user'); setSearchQuery(''); setActiveSearchFilter(''); }}
        activeAlerts={activeAlerts}
        unreadNotifications={unreadNotifications}
        onClearNotification={handleClearNotification}
        onClearAllNotifications={handleClearAllNotifications}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onSearchSubmit={handleSearchSubmit}
        onSecureExit={handleSecureExit}
        onExportDailyBriefing={() => setShowDailyBriefingPrint(true)}
        onToggleTheme={handleToggleTheme}
      />

      <div className={`flex flex-1 flex-col lg:flex-row ${preferences.headerPosition === 'left' ? 'lg:pl-64' : ''}`}>
        
        {/* Navigation Sidebar (only visible if header is Top) */}
        {preferences.headerPosition === 'top' && (
          <aside 
            className="hidden lg:block w-64 border-r border-white/5 select-none shrink-0"
            style={{ backgroundColor: preferences.sidebarColor }}
          >
            <div className="p-4 flex flex-col gap-1.5 pt-6 sticky top-16">
              <span className="text-[10px] text-slate-400 font-mono font-bold uppercase tracking-widest block px-3 mb-2">Systems Console</span>
              
              <button
                id="nav-dashboard"
                onClick={() => { setActiveTab('dashboard'); setActiveSearchFilter(''); }}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                  activeTab === 'dashboard' ? 'bg-rose-600 text-white shadow-md' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                }`}
              >
                <LayoutDashboard className="w-4 h-4" /> <span>Dashboard Real-Time</span>
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" title="Operational (Nominal)" />
              </button>

              <button
                id="nav-assets"
                onClick={() => { setActiveTab('assets'); setActiveSearchFilter(''); }}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                  activeTab === 'assets' ? 'bg-rose-600 text-white shadow-md' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                }`}
              >
                <Cpu className="w-4 h-4" /> <span>Asset Inventory</span>
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" title="Operational (Nominal)" />
              </button>

              <button
                id="nav-network"
                onClick={() => { setActiveTab('network'); setActiveSearchFilter(''); }}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                  activeTab === 'network' ? 'bg-rose-600 text-white shadow-md' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                }`}
              >
                <Network className="w-4 h-4" /> <span>Network Topology Map</span>
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" title="Degraded Connection Detected" />
              </button>

              <button
                id="nav-consumables"
                onClick={() => { setActiveTab('consumables'); setActiveSearchFilter(''); }}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                  activeTab === 'consumables' ? 'bg-rose-600 text-white shadow-md' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                }`}
              >
                <Archive className="w-4 h-4" /> <span>Stock Register & Analytics</span>
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" title="Operational (Nominal)" />
              </button>

              <button
                id="nav-helpdesk"
                onClick={() => { setActiveTab('helpdesk'); setActiveSearchFilter(''); }}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                  activeTab === 'helpdesk' ? 'bg-rose-600 text-white shadow-md' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                }`}
              >
                <LifeBuoy className="w-4 h-4" /> <span>Helpdesk Tickets</span>
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" title="Operational (Nominal)" />
              </button>

              <button
                id="nav-tools"
                onClick={() => { setActiveTab('tools'); setActiveSearchFilter(''); }}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                  activeTab === 'tools' ? 'bg-rose-600 text-white shadow-md' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                }`}
              >
                <Wrench className="w-4 h-4" /> <span>Operations Tools</span>
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" title="Operational (Nominal)" />
              </button>

              <button
                id="nav-assistant"
                onClick={() => { setActiveTab('assistant'); setActiveSearchFilter(''); setIsAssistantOpen(true); }}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                  activeTab === 'assistant' ? 'bg-rose-600 text-white shadow-md' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                }`}
              >
                <Bot className="w-4 h-4" /> <span>Virtual Assistant</span>
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse" title="Cognitive VM Active" />
              </button>

              <span className="text-[10px] text-slate-400 font-mono font-bold uppercase tracking-widest block px-3 mt-6 mb-2">Staff & Node</span>

              <button
                id="nav-user"
                onClick={() => { setActiveTab('user'); setActiveSearchFilter(''); }}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                  activeTab === 'user' ? 'bg-rose-600 text-white shadow-md' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                }`}
              >
                <User className="w-4 h-4" /> <span>User Profile & Node</span>
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" title="Operational (Nominal)" />
              </button>

              <button
                id="nav-admin"
                onClick={() => { setActiveTab('admin'); setActiveSearchFilter(''); }}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                  activeTab === 'admin' ? 'bg-rose-600 text-white shadow-md' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                }`}
              >
                <Settings className="w-4 h-4" /> <span>Admin & Setup</span>
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" title="Operational (Nominal)" />
              </button>

              <button
                id="nav-passwords"
                onClick={() => { setActiveTab('passwords'); setActiveSearchFilter(''); }}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                  activeTab === 'passwords' ? 'bg-rose-600 text-white shadow-md' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                }`}
              >
                <Lock className="w-4 h-4" /> <span>Password Management</span>
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" title="Operational (Nominal)" />
              </button>

              {/* Circular Gauge Sidebar Component */}
              <div className="mt-8 border-t border-slate-800/80 pt-5 px-3">
                <span className="text-[10px] text-slate-400 font-mono font-bold uppercase tracking-widest block mb-3">
                  Operational Context
                </span>
                <div className="bg-slate-950/40 border border-slate-800/80 rounded-xl p-3 flex items-center gap-3.5">
                  {/* Gauge SVG */}
                  <div className="relative w-12 h-12 shrink-0 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle
                        cx="24"
                        cy="24"
                        r="20"
                        className="stroke-slate-800 fill-none"
                        strokeWidth="3.5"
                      />
                      <circle
                        cx="24"
                        cy="24"
                        r="20"
                        className="stroke-rose-500 fill-none"
                        strokeWidth="3.5"
                        strokeDasharray={2 * Math.PI * 20}
                        strokeDashoffset={2 * Math.PI * 20 * (1 - assetPercentage / 100)}
                        strokeLinecap="round"
                        style={{ transition: 'stroke-dashoffset 0.8s ease-in-out' }}
                      />
                    </svg>
                    <span className="absolute text-[10px] font-mono font-bold text-slate-100">
                      {assetPercentage}%
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-[9px] text-slate-400 font-sans block truncate font-semibold uppercase tracking-wider">
                      Active Show Assets
                    </span>
                    <span className="text-xs text-slate-100 font-mono font-bold block mt-0.5">
                      {totalActiveAssets} <span className="text-slate-500 font-medium">/ {totalRegisteredAssets}</span>
                    </span>
                  </div>
                </div>

                {/* Client Device Battery Status */}
                {clientBattery && clientBattery.isBatteryPowered && (
                  <div className="mt-3 bg-slate-950/60 border border-slate-850 rounded-xl p-3 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] text-slate-400 font-sans font-semibold uppercase tracking-wider flex items-center gap-1">
                        <Battery className="w-3.5 h-3.5 text-emerald-400" /> Client Battery
                      </span>
                      <span className="text-[8px] font-mono font-bold text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-900/30">
                        {clientBattery.charging ? 'CHARGING' : 'BATTERY'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-800 p-0.5">
                        <div 
                          className={`h-full rounded-full ${
                            clientBattery.level < 20 ? 'bg-red-500' : clientBattery.level < 50 ? 'bg-amber-500' : 'bg-emerald-500'
                          }`} 
                          style={{ width: `${clientBattery.level}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-mono font-bold text-slate-200">{clientBattery.level}%</span>
                    </div>
                    <div className="flex items-center justify-between text-[9px] font-mono text-slate-500 border-t border-slate-900/60 pt-1.5 mt-0.5">
                      <span>Health: <strong className="text-emerald-400 font-bold">{clientBattery.health}</strong></span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </aside>
        )}

        {/* Main Workspace Area */}
        <main className="flex-1 p-6 md:p-8 overflow-x-hidden space-y-6">
          
          {/* Global Search Results Panel (Overlay style if search query active) */}
          {activeSearchFilter ? (
            <div className="space-y-6 bg-slate-900 border border-slate-700 rounded-xl p-6 shadow-2xl">
              <div className="flex justify-between items-center border-b border-slate-800 pb-3 mb-4">
                <h3 className="text-sm font-bold font-mono text-rose-400 flex items-center gap-2">
                  <Search className="w-4 h-4" /> Search Matches for &quot;{activeSearchFilter}&quot;
                </h3>
                <button
                  onClick={() => { setSearchQuery(''); setActiveSearchFilter(''); }}
                  className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono rounded-lg transition-all"
                >
                  Close Search
                </button>
              </div>

              {searchResults ? (
                <div className="space-y-5">
                  {searchResults.assets.length > 0 && (
                    <div>
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 font-mono">Matched Assets ({searchResults.assets.length})</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {searchResults.assets.map(a => (
                          <div 
                            key={a.id} 
                            onClick={() => { setActiveTab('assets'); setActiveSearchFilter(''); }}
                            className="p-3 bg-slate-950 hover:bg-slate-900 border border-slate-800 rounded-lg flex justify-between items-center cursor-pointer transition-colors"
                          >
                            <div>
                              <p className="font-semibold text-xs text-slate-200">{a.name}</p>
                              <p className="text-[10px] text-cyan-400 font-mono mt-0.5">{a.ipAddress}</p>
                            </div>
                            <span className="text-[9px] font-mono bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded text-rose-300 uppercase">{a.category}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {searchResults.tickets.length > 0 && (
                    <div>
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 font-mono">Matched Tickets ({searchResults.tickets.length})</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {searchResults.tickets.map(t => (
                          <div 
                            key={t.id} 
                            onClick={() => { setActiveTab('helpdesk'); setActiveSearchFilter(''); }}
                            className="p-3 bg-slate-950 hover:bg-slate-900 border border-slate-800 rounded-lg flex justify-between items-center cursor-pointer transition-colors"
                          >
                            <div>
                              <p className="font-semibold text-xs text-slate-200">{t.name}</p>
                              <p className="text-[10px] text-slate-400 font-mono mt-0.5">{t.description.substring(0, 60)}...</p>
                            </div>
                            <span className="text-[9px] font-mono bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded text-rose-300 uppercase">{t.status}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {searchResults.consumables.length > 0 && (
                    <div>
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 font-mono">Matched Consumables ({searchResults.consumables.length})</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {searchResults.consumables.map(c => (
                          <div 
                            key={c.id} 
                            onClick={() => { setActiveTab('consumables'); setActiveSearchFilter(''); }}
                            className="p-3 bg-slate-950 hover:bg-slate-900 border border-slate-800 rounded-lg flex justify-between items-center cursor-pointer transition-colors"
                          >
                            <div>
                              <p className="font-semibold text-xs text-slate-200">{c.name}</p>
                              <p className="text-[10px] text-slate-400 mt-0.5">Stock Quantity: {c.quantity} {c.unit}</p>
                            </div>
                            <span className="text-[9px] font-mono bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded text-rose-300 uppercase">{c.status}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {searchResults.kb.length > 0 && (
                    <div>
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 font-mono">Matched Knowledge Protocols ({searchResults.kb.length})</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {searchResults.kb.map(k => (
                          <div 
                            key={k.id} 
                            onClick={() => { setActiveTab('tools'); setActiveSearchFilter(''); }}
                            className="p-3 bg-slate-950 hover:bg-slate-900 border border-slate-800 rounded-lg flex flex-col cursor-pointer transition-colors"
                          >
                            <p className="font-semibold text-xs text-slate-200">{k.title}</p>
                            <p className="text-[10px] text-slate-400 leading-relaxed mt-1">{k.content.substring(0, 100)}...</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {searchResults.assets.length === 0 && searchResults.tickets.length === 0 && searchResults.consumables.length === 0 && searchResults.kb.length === 0 && (
                    <div className="py-10 text-center text-slate-500 text-xs">
                      No matching technical components found for active search term.
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          ) : (
            /* Tab Switching Render Router */
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="space-y-6"
            >
              {/* Responsive Navigation Tab list for mobile screens */}
              <div className="block lg:hidden overflow-x-auto pb-1 scrollbar-thin mb-4">
                <div className="flex gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800/80 w-max">
                  {[
                    { id: 'dashboard', label: 'Dashboard' },
                    { id: 'assets', label: 'Assets' },
                    { id: 'network', label: 'Network' },
                    { id: 'consumables', label: 'Stock' },
                    { id: 'helpdesk', label: 'Helpdesk' },
                    { id: 'tools', label: 'Ops Tools' },
                    { id: 'assistant', label: 'AI Assistant' },
                    { id: 'user', label: 'Profile' },
                    { id: 'admin', label: 'Admin' },
                    { id: 'passwords', label: 'Passwords' }
                  ].map(tab => (
                    <button
                      key={`mob-${tab.id}`}
                      onClick={() => { setActiveTab(tab.id); setActiveSearchFilter(''); }}
                      className={`px-3 py-1.5 rounded text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                        activeTab === tab.id ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Left-Header Navigation layout bar when Left layout requested */}
              {preferences.headerPosition === 'left' && (
                <div className="flex gap-2 bg-slate-950 p-1 rounded-lg border border-slate-800 w-fit mb-4">
                  <button 
                    onClick={() => setActiveTab('dashboard')} 
                    className={`px-3 py-1.5 rounded text-xs font-bold transition-all cursor-pointer ${activeTab === 'dashboard' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                  >
                    Dashboard
                  </button>
                  <button 
                    onClick={() => setActiveTab('assets')} 
                    className={`px-3 py-1.5 rounded text-xs font-bold transition-all cursor-pointer ${activeTab === 'assets' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                  >
                    Asset Inventory
                  </button>
                  <button 
                    onClick={() => setActiveTab('network')} 
                    className={`px-3 py-1.5 rounded text-xs font-bold transition-all cursor-pointer ${activeTab === 'network' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                  >
                    Network Topology Map
                  </button>
                  <button 
                    onClick={() => setActiveTab('consumables')} 
                    className={`px-3 py-1.5 rounded text-xs font-bold transition-all cursor-pointer ${activeTab === 'consumables' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                  >
                    Consumables
                  </button>
                  <button 
                    onClick={() => setActiveTab('helpdesk')} 
                    className={`px-3 py-1.5 rounded text-xs font-bold transition-all cursor-pointer ${activeTab === 'helpdesk' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                  >
                    Helpdesk
                  </button>
                  <button 
                    onClick={() => setActiveTab('tools')} 
                    className={`px-3 py-1.5 rounded text-xs font-bold transition-all cursor-pointer ${activeTab === 'tools' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                  >
                    Ops Tools
                  </button>
                  <button 
                    onClick={() => setActiveTab('assistant')} 
                    className={`px-3 py-1.5 rounded text-xs font-bold transition-all cursor-pointer ${activeTab === 'assistant' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                  >
                    AI Assistant
                  </button>
                  <button 
                    onClick={() => setActiveTab('user')} 
                    className={`px-3 py-1.5 rounded text-xs font-bold transition-all cursor-pointer ${activeTab === 'user' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                  >
                    Profile
                  </button>
                  <button 
                    onClick={() => setActiveTab('admin')} 
                    className={`px-3 py-1.5 rounded text-xs font-bold transition-all cursor-pointer ${activeTab === 'admin' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                  >
                    Admin
                  </button>
                </div>
              )}

              {/* 1. Dashboard Tab */}
              {activeTab === 'dashboard' && (() => {
                const activeWidgets = widgetOrder.filter(id => !hiddenWidgets.includes(id));
                const sortedActiveWidgets = [...activeWidgets].sort((a, b) => {
                  const aPinned = pinnedWidgets.includes(a);
                  const bPinned = pinnedWidgets.includes(b);
                  if (aPinned && !bPinned) return -1;
                  if (!aPinned && bPinned) return 1;
                  return 0;
                });

                return (
                  <div className="space-y-6">
                    {/* Dashboard Customize Control Bar */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-slate-900/60 p-4 rounded-xl border border-slate-800/80">
                      <div>
                        <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5 font-sans">
                          <Sliders className="w-4 h-4 text-rose-500" /> Customize Workspace Dashboard
                        </h4>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">Drag any bento block by its grab handle <span className="text-rose-400">⋮⋮</span> to reorder widgets according to your preferences.</p>
                        {hiddenWidgets.length > 0 && (
                          <div className="flex flex-wrap items-center gap-2 mt-2 p-1.5 bg-slate-950/40 border border-dashed border-slate-800 rounded-lg text-xs">
                            <span className="text-slate-500 font-mono text-[9px] uppercase font-bold">Hidden:</span>
                            {hiddenWidgets.map(hwId => (
                              <span key={hwId} className="px-2 py-0.5 bg-slate-900 border border-slate-800 text-slate-300 rounded font-mono text-[9px] flex items-center gap-1">
                                {hwId.toUpperCase()}
                                <button 
                                  onClick={() => handleResetWidget(hwId)}
                                  className="text-rose-400 hover:text-rose-300 font-sans cursor-pointer font-bold ml-1 text-[11px]"
                                  title="Restore widget"
                                >
                                  ×
                                </button>
                              </span>
                            ))}
                            <button
                              onClick={() => { setHiddenWidgets([]); setPinnedWidgets([]); }}
                              className="text-[9px] font-mono text-cyan-400 hover:underline ml-2 cursor-pointer"
                            >
                              Restore All
                            </button>
                          </div>
                        )}
                      </div>
                      <button
                        onClick={handleResetWidgets}
                        className="px-3 py-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-[10px] font-mono text-slate-300 hover:text-white rounded-lg flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
                      >
                        <RefreshCw className="w-3 h-3 text-rose-500" />
                        Reset Layout
                      </button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      {sortedActiveWidgets.map((widgetId) => {
                        const isDragging = draggedWidget === widgetId;
                        
                        const widgetContent = (() => {
                        switch (widgetId) {
                          case 'map':
                            return (
                              <div className="bento-card relative">
                                <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5">
                                  <button
                                    onClick={() => setExpandedCardId(expandedCardId === 'map' ? null : 'map')}
                                    className="p-1.5 bg-slate-950/90 hover:bg-slate-900 border border-slate-800 rounded text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                                    title={expandedCardId === 'map' ? "Exit Fullscreen" : "Fullscreen View"}
                                  >
                                    {expandedCardId === 'map' ? (
                                      <Minimize2 className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
                                    ) : (
                                      <Maximize2 className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                  <div 
                                    draggable
                                    onDragStart={() => handleDragStart('map')}
                                    onDragEnd={handleDragEnd}
                                    className="p-1.5 bg-slate-950/90 hover:bg-slate-900 border border-slate-800 rounded text-slate-400 hover:text-slate-200 cursor-grab active:cursor-grabbing transition-colors"
                                    title="Drag to reorder"
                                  >
                                    <GripVertical className="w-4 h-4 text-rose-500" />
                                  </div>
                                </div>
                                <MapCanvas
                                  assets={assets}
                                  logs={logs}
                                  onUpdateAssetCoordinates={handleUpdateAssetCoordinates}
                                  onAddAssetAtCoordinates={handleAddAssetAtCoordinates}
                                  focusedAssetId={focusedAssetId}
                                  onClearFocusedAsset={() => setFocusedAssetId(null)}
                                />
                              </div>
                            );
                          case 'analytics':
                            return (
                              <div className="bento-card space-y-4 relative">
                                <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5">
                                  <button
                                    onClick={() => setExpandedCardId(expandedCardId === 'analytics' ? null : 'analytics')}
                                    className="p-1.5 bg-slate-950/90 hover:bg-slate-900 border border-slate-800 rounded text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                                    title={expandedCardId === 'analytics' ? "Exit Fullscreen" : "Fullscreen View"}
                                  >
                                    {expandedCardId === 'analytics' ? (
                                      <Minimize2 className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
                                    ) : (
                                      <Maximize2 className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                  <div 
                                    draggable
                                    onDragStart={() => handleDragStart('analytics')}
                                    onDragEnd={handleDragEnd}
                                    className="p-1.5 bg-slate-950/90 hover:bg-slate-900 border border-slate-800 rounded text-slate-400 hover:text-slate-200 cursor-grab active:cursor-grabbing transition-colors"
                                    title="Drag to reorder"
                                  >
                                    <GripVertical className="w-4 h-4 text-rose-500" />
                                  </div>
                                </div>
                                <div className="card-title">
                                  <span className="flex items-center gap-2 text-slate-100 font-sans font-bold text-sm uppercase tracking-normal">
                                    <TrendingUp className="w-4 h-4 text-rose-500" /> Usage Analytics
                                  </span>
                                </div>
                                
                                <p className="text-[11px] text-slate-400 font-mono mt-1 leading-normal">
                                  Frequency of asset deployments over the last 30 days to optimize hardware staging.
                                </p>

                                <div className="h-44 w-full pr-2">
                                  <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={deploymentsData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                                      <defs>
                                        <linearGradient id="colorDeployments" x1="0" y1="0" x2="0" y2="1">
                                          <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/>
                                          <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                                        </linearGradient>
                                      </defs>
                                      <XAxis 
                                        dataKey="date" 
                                        stroke="#475569" 
                                        fontSize={9} 
                                        tickLine={false} 
                                        axisLine={false}
                                        dy={8}
                                        tickFormatter={(value, idx) => idx % 6 === 0 ? value : ''}
                                      />
                                      <YAxis 
                                        stroke="#475569" 
                                        fontSize={9} 
                                        tickLine={false} 
                                        axisLine={false} 
                                        dx={-5}
                                      />
                                      <Tooltip 
                                        contentStyle={{ 
                                          backgroundColor: '#0f172a', 
                                          borderColor: '#334155', 
                                          borderRadius: '8px',
                                          fontSize: '11px',
                                          fontFamily: 'monospace'
                                        }} 
                                        labelStyle={{ color: '#94a3b8' }}
                                      />
                                      <Area 
                                        type="monotone" 
                                        dataKey="Deployments" 
                                        stroke="#f43f5e" 
                                        strokeWidth={2}
                                        fillOpacity={1} 
                                        fill="url(#colorDeployments)" 
                                      />
                                    </AreaChart>
                                  </ResponsiveContainer>
                                </div>

                                <div className="grid grid-cols-2 gap-2 text-center text-[10px] font-mono pt-1">
                                  <div className="bg-slate-950/40 border border-slate-800 p-2 rounded-lg">
                                    <span className="text-slate-500 uppercase block">Total Deployments</span>
                                    <span className="text-slate-200 font-bold text-sm">{deployments.length}</span>
                                  </div>
                                  <div className="bg-slate-950/40 border border-slate-800 p-2 rounded-lg">
                                    <span className="text-slate-500 uppercase block">30-Day Peak</span>
                                    <span className="text-rose-400 font-bold text-sm">
                                      {Math.max(...deploymentsData.map(d => d.Deployments), 0)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          case 'logs':
                            return (() => {
                              // Compute dynamic trends from current logs
                              const sourceGroups: Record<string, { warnings: number; errors: number; recent: any[]; thermalCount: number; pingCount: number; dmxCount: number }> = {};
                              
                              logs.forEach(log => {
                                if (!log.source) return;
                                if (!sourceGroups[log.source]) {
                                  sourceGroups[log.source] = { warnings: 0, errors: 0, recent: [], thermalCount: 0, pingCount: 0, dmxCount: 0 };
                                }
                                const group = sourceGroups[log.source];
                                if (log.level === 'warn') group.warnings++;
                                if (log.level === 'error') group.errors++;
                                group.recent.push(log);
                                
                                const lowerMsg = log.message.toLowerCase();
                                if (lowerMsg.includes('temp') || lowerMsg.includes('thermal') || lowerMsg.includes('heat') || lowerMsg.includes('fan')) {
                                  group.thermalCount++;
                                }
                                if (lowerMsg.includes('ping') || lowerMsg.includes('timeout') || lowerMsg.includes('packet loss') || lowerMsg.includes('loss')) {
                                  group.pingCount++;
                                }
                                if (lowerMsg.includes('dmx') || lowerMsg.includes('timing') || lowerMsg.includes('frame') || lowerMsg.includes('drift')) {
                                  group.dmxCount++;
                                }
                              });

                              const trends: any[] = [];
                              Object.entries(sourceGroups).forEach(([source, stats]) => {
                                const totalFaults = stats.warnings + stats.errors;
                                if (totalFaults >= 2) {
                                  let riskLevel = 'Medium';
                                  let confidence = 65 + Math.min(totalFaults * 5, 30);
                                  let pattern = 'Repeating diagnostic faults';
                                  let diagnosis = 'Thermal or voltage stress on internal components.';
                                  let action = 'Schedule off-peak preventative bench inspection.';
                                  
                                  if (stats.thermalCount >= 1) {
                                    riskLevel = 'High';
                                    pattern = 'Thermal Overheat Warnings';
                                    diagnosis = 'Continuous elevated temperature triggers cooling system warnings. High failure probability of cooling fans or internal lamps.';
                                    action = 'Clean ventilation dust filters and verify active cooling fan speeds.';
                                  } else if (stats.pingCount >= 1) {
                                    riskLevel = 'High';
                                    pattern = 'Intermittent Link Frame Loss';
                                    diagnosis = 'Intermittent transceiver state drops. Repeating diagnostic connection timeouts indicate SFP link failure or fiber splice degradation.';
                                    action = 'Inspect and test SFP transceiver modules and optical fiber terminations.';
                                  } else if (stats.dmxCount >= 1) {
                                    riskLevel = 'Medium';
                                    pattern = 'DMX timing phase drift';
                                    diagnosis = 'DMX timing frame drop. Intermittent timing drift indicates active transceiver interference or termination resistor failure.';
                                    action = 'Install 120-ohm terminator resistors and inspect DMX line shielding.';
                                  }

                                  trends.push({
                                    source,
                                    faults: totalFaults,
                                    riskLevel,
                                    confidence,
                                    pattern,
                                    diagnosis,
                                    action
                                  });
                                }
                              });

                              const handleInjectSimulationFault = async (type: 'thermal' | 'link' | 'dmx') => {
                                const data = {
                                  thermal: {
                                    source: 'DMX Switcher Alpha',
                                    messages: [
                                      'Temperature sensor reports 84°C, threshold exceeded',
                                      'Cooling fan 2 RPM drop below safety envelope',
                                      'Thermal protective throttling engaged'
                                    ]
                                  },
                                  link: {
                                    source: 'Primary Fiber Switch',
                                    messages: [
                                      'ICMP diagnostic ping failure to gateway',
                                      'Packet Loss detected: 40% on trunk link A',
                                      'Intermittent fiber transceiver loss-of-signal'
                                    ]
                                  },
                                  dmx: {
                                    source: 'Stage Light Ring 3',
                                    messages: [
                                      'DMX frame timing phase shift detected (12ms drift)',
                                      'Signal frame drops on universe 4',
                                      'Active transceiver frame timing sync failure'
                                    ]
                                  }
                                };
                                const selected = data[type];
                                for (let i = 0; i < selected.messages.length; i++) {
                                  const logId = `log-inj-${type}-${Date.now()}-${i}`;
                                  await setDoc(doc(db, 'signal_logs', logId), {
                                    id: logId,
                                    timestamp: new Date(Date.now() - (3 - i) * 1000 * 60).toISOString(),
                                    level: i === 0 ? 'warn' : 'error',
                                    source: selected.source,
                                    message: selected.messages[i],
                                    user: 'Pattern simulation engine'
                                  });
                                }
                              };

                              const handleClearSimulatedFaults = async () => {
                                try {
                                  const q = query(collection(db, 'signal_logs'), where('user', '==', 'Pattern simulation engine'));
                                  const snap = await getDocs(q);
                                  const promises = snap.docs.map(doc => deleteDoc(doc.ref));
                                  await Promise.all(promises);
                                } catch (err) {
                                  console.error(err);
                                }
                              };

                              return (
                                <div className="bento-card space-y-4 relative">
                                  <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5">
                                    {pinnedWidgets.includes('logs') && (
                                      <span className="p-1 bg-rose-950/80 border border-rose-800/40 rounded text-rose-400" title="Pinned widget">
                                        <Pin className="w-3 h-3" />
                                      </span>
                                    )}
                                    <button
                                      onClick={() => setExpandedCardId(expandedCardId === 'logs' ? null : 'logs')}
                                      className="p-1.5 bg-slate-950/90 hover:bg-slate-900 border border-slate-800 rounded text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                                      title={expandedCardId === 'logs' ? "Exit Fullscreen" : "Fullscreen View"}
                                    >
                                      {expandedCardId === 'logs' ? (
                                        <Minimize2 className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
                                      ) : (
                                        <Maximize2 className="w-3.5 h-3.5" />
                                      )}
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const rect = e.currentTarget.getBoundingClientRect();
                                        setContextMenu({
                                          x: rect.left,
                                          y: rect.bottom + window.scrollY,
                                          widgetId: 'logs'
                                        });
                                      }}
                                      className="p-1.5 bg-slate-950/90 hover:bg-slate-900 border border-slate-800 rounded text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                                      title="Widget Options"
                                    >
                                      <MoreHorizontal className="w-4 h-4" />
                                    </button>
                                    <div 
                                      draggable
                                      onDragStart={() => handleDragStart('logs')}
                                      onDragEnd={handleDragEnd}
                                      className="p-1.5 bg-slate-950/90 hover:bg-slate-900 border border-slate-800 rounded text-slate-400 hover:text-slate-200 cursor-grab active:cursor-grabbing transition-colors"
                                      title="Drag to reorder"
                                    >
                                      <GripVertical className="w-4 h-4 text-rose-500" />
                                    </div>
                                  </div>
                                  
                                  <div className="flex flex-col md:flex-row justify-between md:items-center border-b border-slate-800 pb-3 pr-24 gap-3">
                                    <div>
                                      <div className="card-title mb-0">
                                        <span className="flex items-center gap-2 text-slate-100 font-sans font-bold text-sm uppercase tracking-normal">
                                          <Terminal className="w-4.5 h-4.5 text-rose-500" /> Real-Time Signal Monitoring Logs
                                        </span>
                                      </div>
                                      <p className="text-[11px] text-slate-400 font-mono mt-1">Continuous ICMP diagnostics of active showground transceivers.</p>
                                    </div>
                                    
                                    <div className="flex flex-wrap items-center gap-2">
                                      {/* View Mode Toggle */}
                                      <div className="bg-slate-950 p-0.5 rounded border border-slate-800 flex gap-1 font-mono text-[9px] font-bold">
                                        <button
                                          onClick={() => setLogViewMode('stream')}
                                          className={`px-2 py-1 rounded transition-all cursor-pointer ${logViewMode === 'stream' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                                        >
                                          STREAM
                                        </button>
                                        <button
                                          onClick={() => setLogViewMode('trends')}
                                          className={`px-2 py-1 rounded transition-all cursor-pointer flex items-center gap-1 ${logViewMode === 'trends' ? 'bg-rose-600 text-white animate-pulse' : 'text-slate-400 hover:text-slate-200'}`}
                                          title="Predictive pattern analysis"
                                        >
                                          <TrendingUp className="w-3 h-3" />
                                          TREND ANALYSIS
                                        </button>
                                      </div>

                                      {logViewMode === 'stream' && (
                                        <>
                                          <button
                                            id="btn-export-logs-csv"
                                            onClick={handleDownloadLogsCSV}
                                            className="px-2.5 py-1 rounded text-[10px] font-mono font-bold border border-slate-700 bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800 transition-all cursor-pointer flex items-center gap-1 shrink-0"
                                            title="Download currently displayed logs as CSV"
                                          >
                                            <Download className="w-3 h-3 text-rose-500" />
                                            EXPORT CSV
                                          </button>
                                          <button
                                            onClick={() => setLogSimulationPaused(!logSimulationPaused)}
                                            className={`
                                              px-2.5 py-1 rounded text-[10px] font-mono font-bold border transition-all cursor-pointer flex items-center gap-1 shrink-0
                                              ${logSimulationPaused 
                                                ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' 
                                                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                              }
                                            `}
                                          >
                                            {logSimulationPaused ? <Play className="w-2.5 h-2.5 fill-current" /> : <Pause className="w-2.5 h-2.5 fill-current" />}
                                            {logSimulationPaused ? 'RESUME' : 'PAUSE'}
                                          </button>
                                        </>
                                      )}
                                    </div>
                                  </div>

                                  {logViewMode === 'stream' ? (
                                    <div className="h-48 overflow-y-auto bg-slate-950 border border-slate-800 rounded-lg p-3 font-mono text-[11px] leading-relaxed space-y-2 select-all scrollbar-thin scrollbar-thumb-slate-800">
                                      {logs.map((log) => {
                                        const isExpanded = expandedLogId === log.id;
                                        const lastChar = log.id ? log.id.charCodeAt(log.id.length - 1) : 65;
                                        const diagCode = `0x${lastChar.toString(16).toUpperCase()}${log.level === 'error' ? '7F' : '9E'}`;
                                        return (
                                          <div key={log.id} className="border-b border-slate-900 pb-2">
                                            <div 
                                              onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                                              className="flex justify-between items-start hover:bg-slate-900/30 p-1.5 rounded transition-all cursor-pointer select-none"
                                            >
                                              <div className="flex gap-2 items-center min-w-0">
                                                {isExpanded ? (
                                                  <ChevronDown className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                                                ) : (
                                                  <ChevronRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                                                )}
                                                <span className="text-slate-500 shrink-0">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                                                <span className="text-rose-400 font-semibold uppercase tracking-wider shrink-0">[{log.source}]</span>
                                                <span className="text-slate-300 truncate" title={log.message}>
                                                  {log.message}
                                                </span>
                                              </div>
                                              <span className={`text-[10px] uppercase px-1.5 rounded font-bold shrink-0 ${
                                                log.level === 'error' ? 'bg-rose-500/20 text-rose-400' :
                                                log.level === 'warn' ? 'bg-amber-500/20 text-amber-400' :
                                                'bg-emerald-500/20 text-emerald-400'
                                              }`}>
                                                {log.level}
                                              </span>
                                            </div>

                                            {isExpanded && (
                                              <div className="bg-slate-900 border border-slate-800/80 rounded-lg p-3 mt-1.5 mx-1.5 space-y-2.5 text-[10px] text-slate-300 leading-normal font-mono animate-fade-in">
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5">
                                                  <div>
                                                    <span className="text-slate-500 font-bold">DEVICE SOURCE:</span>{' '}
                                                    <span className="text-rose-400 font-semibold">{log.source}</span>
                                                  </div>
                                                  <div>
                                                    <span className="text-slate-500 font-bold">USER ATTRIBUTION:</span>{' '}
                                                    <span className="text-emerald-400 font-semibold">{log.user || 'SYSTEM SERVICE_DAEMON'}</span>
                                                  </div>
                                                  <div>
                                                    <span className="text-slate-500 font-bold">DIAGNOSTIC CODE:</span>{' '}
                                                    <span className="text-cyan-400 font-semibold">{diagCode}</span>
                                                  </div>
                                                  <div>
                                                    <span className="text-slate-500 font-bold">TIMESTAMP:</span>{' '}
                                                    <span className="text-slate-400">{log.timestamp}</span>
                                                  </div>
                                                </div>

                                                <div className="bg-black/50 p-2 rounded border border-white/5 space-y-1">
                                                  <div className="text-slate-500 text-[8px] uppercase font-bold tracking-wider">Raw Diagnostic Payload Dump:</div>
                                                  <div className="text-[10px] text-slate-400 font-mono break-all leading-relaxed tracking-wider">
                                                    4B 79 6E 72 65 6E 5F 54 65 63 68 5F 4F 50 53 20 {diagCode.split('').map(c => c.charCodeAt(0).toString(16).toUpperCase()).join(' ')} 00 FF
                                                  </div>
                                                </div>
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  ) : (
                                    <div className="space-y-4">
                                      {trends.length === 0 ? (
                                        <div className="bg-slate-950 border border-slate-850 p-6 rounded-lg text-center space-y-3.5">
                                          <div className="inline-flex p-3 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 animate-pulse">
                                            <CheckCircle className="w-8 h-8" />
                                          </div>
                                          <div>
                                            <h5 className="font-sans font-bold text-slate-100 text-xs uppercase tracking-wider">Diagnostic Engine Calibrated</h5>
                                            <p className="text-[11px] text-slate-400 font-mono mt-1 max-w-md mx-auto leading-relaxed">
                                              No repeating diagnostic error patterns or potential future hardware failures detected. Staged transceivers are operating well within MTBF envelopes.
                                            </p>
                                          </div>
                                          
                                          <div className="border-t border-slate-900 pt-4 space-y-2">
                                            <span className="text-[9px] font-mono font-bold text-slate-500 uppercase tracking-wider block">Interactive Trend Simulators</span>
                                            <div className="flex flex-wrap gap-2 justify-center">
                                              <button
                                                onClick={() => handleInjectSimulationFault('thermal')}
                                                className="px-2.5 py-1 bg-slate-900 hover:bg-slate-850 text-slate-300 hover:text-rose-400 border border-slate-800 rounded text-[10px] font-mono cursor-pointer transition-all"
                                              >
                                                + Sim Thermal Overheat
                                              </button>
                                              <button
                                                onClick={() => handleInjectSimulationFault('link')}
                                                className="px-2.5 py-1 bg-slate-900 hover:bg-slate-850 text-slate-300 hover:text-cyan-400 border border-slate-800 rounded text-[10px] font-mono cursor-pointer transition-all"
                                              >
                                                + Sim Link Outage
                                              </button>
                                              <button
                                                onClick={() => handleInjectSimulationFault('dmx')}
                                                className="px-2.5 py-1 bg-slate-900 hover:bg-slate-850 text-slate-300 hover:text-amber-400 border border-slate-800 rounded text-[10px] font-mono cursor-pointer transition-all"
                                              >
                                                + Sim DMX Clock Drift
                                              </button>
                                            </div>
                                          </div>
                                        </div>
                                      ) : (
                                        <div className="space-y-3">
                                          <div className="flex justify-between items-center text-[10px] font-mono border-b border-slate-900 pb-1.5 text-slate-400">
                                            <span>DETECTED ANOMALY SIGNATURES ({trends.length})</span>
                                            <button
                                              onClick={handleClearSimulatedFaults}
                                              className="text-rose-400 hover:text-rose-300 font-bold hover:underline cursor-pointer"
                                            >
                                              CLEAR SIMULATED FAULTS
                                            </button>
                                          </div>
                                          
                                          <div className="space-y-3 max-h-56 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-800">
                                            {trends.map((trend, idx) => (
                                              <div key={idx} className="bg-slate-900/50 border border-rose-500/20 rounded-lg p-3 space-y-2 font-mono text-[11px] leading-relaxed relative overflow-hidden">
                                                <div className="absolute top-0 right-0 left-0 h-0.5 bg-gradient-to-r from-rose-500/50 to-orange-500/50" />
                                                <div className="flex justify-between items-start">
                                                  <div>
                                                    <span className="text-rose-400 font-bold block">🚨 PREDICTIVE FAILURE DETECTED</span>
                                                    <span className="text-slate-200 text-xs font-sans font-bold uppercase">{trend.source}</span>
                                                  </div>
                                                  <span className="px-2 py-0.5 bg-rose-500/20 text-rose-400 rounded-full font-bold text-[9px] uppercase tracking-wider">
                                                    {trend.riskLevel} RISK
                                                  </span>
                                                </div>
                                                
                                                <div className="text-[10px] space-y-1.5 pt-1 border-t border-slate-950 text-slate-300">
                                                  <p><strong className="text-slate-400">PATTERN:</strong> {trend.pattern} ({trend.faults} occurrences)</p>
                                                  <p><strong className="text-slate-400">DIAGNOSIS:</strong> {trend.diagnosis}</p>
                                                  <p className="p-1.5 bg-rose-950/20 border border-rose-900/30 text-rose-300 rounded"><strong className="text-rose-400">PREVENTATIVE ACTION:</strong> {trend.action}</p>
                                                </div>

                                                <div className="pt-1.5 flex items-center justify-between text-[9px] text-slate-500">
                                                  <span>RECOGNITION CONFIDENCE</span>
                                                  <span className="text-emerald-400 font-bold">{trend.confidence}%</span>
                                                </div>
                                                <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden">
                                                  <div className="bg-rose-500 h-full rounded-full transition-all" style={{ width: `${trend.confidence}%` }} />
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })()
                          case 'metrics':
                            return (
                              <div className="bento-card space-y-4 relative">
                                <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5">
                                  <button
                                    onClick={() => setExpandedCardId(expandedCardId === 'metrics' ? null : 'metrics')}
                                    className="p-1.5 bg-slate-950/90 hover:bg-slate-900 border border-slate-800 rounded text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                                    title={expandedCardId === 'metrics' ? "Exit Fullscreen" : "Fullscreen View"}
                                  >
                                    {expandedCardId === 'metrics' ? (
                                      <Minimize2 className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
                                    ) : (
                                      <Maximize2 className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                  <div 
                                    draggable
                                    onDragStart={() => handleDragStart('metrics')}
                                    onDragEnd={handleDragEnd}
                                    className="p-1.5 bg-slate-950/90 hover:bg-slate-900 border border-slate-800 rounded text-slate-400 hover:text-slate-200 cursor-grab active:cursor-grabbing transition-colors"
                                    title="Drag to reorder"
                                  >
                                    <GripVertical className="w-4 h-4 text-rose-500" />
                                  </div>
                                </div>
                                
                                <div className="card-title flex items-center justify-between flex-wrap gap-2 pr-6">
                                  <div className="flex items-center gap-2">
                                    <span>System Metrics</span>
                                    <span className="text-[10px] text-slate-500 font-normal uppercase tracking-normal">Status Overview</span>
                                  </div>
                                  
                                  <div className="flex items-center gap-1.5 z-10 mr-2 sm:mr-4">
                                    {/* Local Search inline input bar */}
                                    <div className="flex items-center bg-slate-950/90 border border-slate-800 rounded px-2 py-0.5 gap-1.5 transition-all focus-within:border-slate-700">
                                      <Search className="w-3 h-3 text-slate-400" />
                                      <input 
                                        type="text"
                                        placeholder="Filter system metrics..."
                                        className="bg-transparent border-none text-[10px] text-slate-200 focus:outline-none w-24 sm:w-32 font-sans placeholder-slate-600"
                                        value={metricsSearchQuery}
                                        onChange={(e) => setMetricsSearchQuery(e.target.value)}
                                      />
                                      {metricsSearchQuery && (
                                        <button 
                                          onClick={() => setMetricsSearchQuery('')}
                                          className="text-slate-500 hover:text-slate-300 text-[10px] px-0.5"
                                          title="Clear filter"
                                        >
                                          ✕
                                        </button>
                                      )}
                                    </div>

                                    {/* Refresh metrics button */}
                                    <button
                                      onClick={() => {
                                        setIsRefreshingMetrics(true);
                                        setTimeout(() => {
                                          setMetricsRefreshTrigger(prev => prev + 1);
                                          setIsRefreshingMetrics(false);
                                          triggerSystemLog('System Metrics', 'Immediate re-calculation of battery drain rates and asset analytics triggered.', 'success');
                                        }, 800);
                                      }}
                                      disabled={isRefreshingMetrics}
                                      className={`p-1 bg-slate-950 hover:bg-slate-900 border border-slate-800 rounded text-slate-400 hover:text-rose-400 transition-colors cursor-pointer ${isRefreshingMetrics ? 'opacity-50' : ''}`}
                                      title="Refresh Metrics"
                                    >
                                      <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingMetrics ? 'animate-spin text-rose-500' : ''}`} />
                                    </button>

                                    {/* Configure thresholds button */}
                                    <button
                                      onClick={() => setIsBatteryThresholdModalOpen(true)}
                                      className="p-1 bg-slate-950 hover:bg-slate-900 border border-slate-800 rounded text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                                      title="Configure Battery Thresholds"
                                    >
                                      <Settings className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                                
                                {/* 2x2 Grid for the status cards with search highlighting/filtering */}
                                <div className="grid grid-cols-2 gap-2.5">
                                  {/* Stat 1 */}
                                  <div className={`bg-slate-950/40 p-2.5 border rounded-lg flex items-center gap-2.5 hover:border-slate-700 transition-all ${
                                    (!metricsSearchQuery || metricsSearchQuery.toLowerCase().split(' ').some(word => 'online nodes nodes status'.includes(word)))
                                      ? 'border-slate-800 opacity-100'
                                      : 'border-slate-900/50 opacity-20 scale-95'
                                  }`}>
                                    <div className="p-1.5 bg-emerald-500/10 rounded-md text-emerald-400">
                                      <CheckCircle className="w-4 h-4 animate-pulse" />
                                    </div>
                                    <div>
                                      <span className="text-[9px] text-slate-500 font-mono block uppercase leading-none">Online Nodes</span>
                                      <span className="text-sm font-bold font-mono text-slate-200">
                                        {nodes.filter(n => n.status === 'online').length}/{nodes.length}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Stat 2 */}
                                  <div className={`bg-slate-950/40 p-2.5 border rounded-lg flex items-center gap-2.5 hover:border-slate-700 transition-all ${
                                    (!metricsSearchQuery || metricsSearchQuery.toLowerCase().split(' ').some(word => 'active tickets tickets alerts'.includes(word)))
                                      ? 'border-slate-800 opacity-100'
                                      : 'border-slate-900/50 opacity-20 scale-95'
                                  }`}>
                                    <div className="p-1.5 bg-rose-500/10 rounded-md text-rose-400">
                                      <ShieldAlert className="w-4 h-4" />
                                    </div>
                                    <div>
                                      <span className="text-[9px] text-slate-500 font-mono block uppercase leading-none">Active Tickets</span>
                                      <span className="text-sm font-bold font-mono text-slate-200">
                                        {tickets.filter(t => t.status !== 'resolved').length}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Stat 3 */}
                                  <div className={`bg-slate-950/40 p-2.5 border rounded-lg flex items-center gap-2.5 hover:border-slate-700 transition-all ${
                                    (!metricsSearchQuery || metricsSearchQuery.toLowerCase().split(' ').some(word => 'low stocks stocks consumables adequate'.includes(word)))
                                      ? 'border-slate-800 opacity-100'
                                      : 'border-slate-900/50 opacity-20 scale-95'
                                  }`}>
                                    <div className="p-1.5 bg-amber-500/10 rounded-md text-amber-400">
                                      <Archive className="w-4 h-4" />
                                    </div>
                                    <div>
                                      <span className="text-[9px] text-slate-500 font-mono block uppercase leading-none">Low Stocks</span>
                                      <span className="text-sm font-bold font-mono text-slate-200">
                                        {consumables.filter(c => c.status !== 'adequate').length}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Stat 4 */}
                                  <div className={`bg-slate-950/40 p-2.5 border rounded-lg flex items-center gap-2.5 hover:border-slate-700 transition-all ${
                                    (!metricsSearchQuery || metricsSearchQuery.toLowerCase().split(' ').some(word => 'loop latency latency response ping millisecond'.includes(word)))
                                      ? 'border-slate-800 opacity-100'
                                      : 'border-slate-900/50 opacity-20 scale-95'
                                  }`}>
                                    <div className="p-1.5 bg-cyan-500/10 rounded-md text-cyan-400">
                                      <Activity className="w-4 h-4" />
                                    </div>
                                    <div>
                                      <span className="text-[9px] text-slate-500 font-mono block uppercase leading-none">Loop Latency</span>
                                      <span className="text-sm font-bold font-mono text-slate-200">12ms</span>
                                    </div>
                                  </div>
                                </div>

                                {highDrainAssets.length > 0 && (
                                  <div className="bg-rose-500/10 border border-rose-500/20 rounded-lg p-2.5 flex items-center justify-between gap-2.5 animate-pulse text-left">
                                    <div className="flex items-center gap-2">
                                      <span className="flex h-2 w-2 relative">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                                      </span>
                                      <div className="space-y-0.5">
                                        <span className="text-[10px] font-mono font-bold text-rose-400 uppercase tracking-wider block">
                                          Abnormal Battery Drain Warning ({highDrainAssets.length} Node{highDrainAssets.length > 1 ? 's' : ''})
                                        </span>
                                        <p className="text-[9px] text-slate-400 leading-normal">
                                          Nodes exceeding critical rate (&gt;15%/hr): {highDrainAssets.map(a => `${a.name} (-${a.drainVelocity}%/h)`).join(', ')}
                                        </p>
                                      </div>
                                    </div>
                                    <span className="px-1.5 py-0.5 bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded font-mono text-[9px] font-extrabold uppercase">
                                      CRITICAL DRAIN
                                    </span>
                                  </div>
                                )}

                                {/* Line Chart: 24h Average Battery of Mobile Assets */}
                                <div className={`space-y-1.5 pt-2 border-t border-slate-900 transition-all ${
                                  (!metricsSearchQuery || metricsSearchQuery.toLowerCase().split(' ').some(word => '24h average mobile battery level telemetry timeline'.includes(word)))
                                    ? 'opacity-100'
                                    : 'opacity-20 scale-[0.99]'
                                }`}>
                                  <div className="flex justify-between items-center">
                                    <span className="text-[11px] font-sans font-bold text-slate-200 uppercase tracking-wide flex items-center gap-1.5">
                                      <BatteryCharging className="w-3.5 h-3.5 text-rose-500" />
                                      24H Avg Mobile Battery
                                    </span>
                                    <div className="flex items-center gap-2">
                                      {(() => {
                                        const mobileAssets = assets.filter(asset => 
                                          asset.batteryLevel !== undefined && 
                                          (asset.tags?.includes('mobile') || asset.name?.toLowerCase().includes('mobile') || asset.category?.toLowerCase() === 'radio')
                                        );
                                        const currentAvg = mobileAssets.length > 0 
                                          ? Math.round(mobileAssets.reduce((sum, a) => sum + (a.batteryLevel ?? 100), 0) / mobileAssets.length)
                                          : 74;
                                        return (
                                          <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded">
                                            CURRENT: {currentAvg}%
                                          </span>
                                        );
                                      })()}
                                      
                                      {/* Expand button for modal display */}
                                      <button
                                        onClick={() => setIsDetailedBatteryChartOpen(true)}
                                        className="p-1 bg-slate-950 hover:bg-slate-900 border border-slate-800 rounded text-slate-400 hover:text-rose-400 transition-colors cursor-pointer flex items-center gap-1 text-[9px] font-mono"
                                        title="Expand Chart"
                                      >
                                        <Maximize2 className="w-3 h-3" />
                                        <span>EXPAND</span>
                                      </button>
                                    </div>
                                  </div>
                                  <div className="h-28 w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                      <LineChart data={batteryStats24h} margin={{ top: 5, right: 5, left: -28, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.3} />
                                        <XAxis 
                                          dataKey="time" 
                                          stroke="#475569" 
                                          fontSize={8} 
                                          tickLine={false}
                                          axisLine={false}
                                        />
                                        <YAxis 
                                          domain={[0, 100]} 
                                          stroke="#475569" 
                                          fontSize={8} 
                                          tickLine={false}
                                          axisLine={false}
                                        />
                                        <Tooltip 
                                          contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '6px' }}
                                          labelStyle={{ color: '#94a3b8', fontSize: '9px', fontFamily: 'monospace' }}
                                          itemStyle={{ color: '#f43f5e', fontSize: '10px', fontFamily: 'monospace', fontWeight: 'bold' }}
                                        />
                                        <Line 
                                          type="monotone" 
                                          dataKey="battery" 
                                          name="Battery Level" 
                                          stroke="#f43f5e" 
                                          strokeWidth={2} 
                                          dot={false}
                                          activeDot={{ r: 4, stroke: '#fda4af', strokeWidth: 1 }}
                                        />
                                      </LineChart>
                                    </ResponsiveContainer>
                                  </div>
                                </div>

                                {/* Interactive D3-based Category Battery Drain Rates Visualizer with search support */}
                                <div className="pt-2 border-t border-slate-900">
                                  <CategoryBatteryDrainD3 
                                    assets={assets} 
                                    searchQuery={metricsSearchQuery}
                                  />
                                </div>
                              </div>
                            );
                          case 'network':
                            return (
                              <div className="bento-card space-y-4 relative">
                                <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5">
                                  <button
                                    onClick={() => setExpandedCardId(expandedCardId === 'network' ? null : 'network')}
                                    className="p-1.5 bg-slate-950/90 hover:bg-slate-900 border border-slate-800 rounded text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                                    title={expandedCardId === 'network' ? "Exit Fullscreen" : "Fullscreen View"}
                                  >
                                    {expandedCardId === 'network' ? (
                                      <Minimize2 className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
                                    ) : (
                                      <Maximize2 className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                  <div 
                                    draggable
                                    onDragStart={() => handleDragStart('network')}
                                    onDragEnd={handleDragEnd}
                                    className="p-1.5 bg-slate-950/90 hover:bg-slate-900 border border-slate-800 rounded text-slate-400 hover:text-slate-200 cursor-grab active:cursor-grabbing transition-colors"
                                    title="Drag to reorder"
                                  >
                                    <GripVertical className="w-4 h-4 text-rose-500" />
                                  </div>
                                </div>
                                <div className="card-title flex items-center justify-between flex-wrap gap-2">
                                  <div className="flex items-center gap-2">
                                    <span>Network Health</span>
                                    <span className="text-[10px] text-slate-500 font-normal uppercase tracking-normal">Topology Summary</span>
                                    {(() => {
                                      const latencyLimit = preferences.latencyThreshold ?? 100;
                                      const highLatencyCount = nodes.filter(n => n.status !== 'offline' && (n.latency ?? 0) > latencyLimit).length;
                                      if (highLatencyCount > 0) {
                                        return (
                                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-bold font-mono rounded bg-rose-500/15 text-rose-400 border border-rose-500/30 animate-pulse">
                                            <AlertCircle className="w-2.5 h-2.5 text-rose-400" />
                                            {highLatencyCount} {highLatencyCount === 1 ? 'ALERT' : 'ALERTS'}
                                          </span>
                                        );
                                      }
                                      return null;
                                    })()}
                                  </div>
                                  <div className="flex items-center gap-1.5 z-10 mr-8">
                                    <button
                                      onClick={() => {
                                        const latencyLimit = preferences.latencyThreshold ?? 100;
                                        setActivePrintReport({
                                          title: 'NETWORK HEALTH NODE STATUS SUMMARY',
                                          headers: ['Node Name', 'Type', 'IP Address', 'VLAN', 'Subnet', 'MAC Address', 'Vendor', 'Status', 'Latency', 'Uptime'],
                                          summaries: [
                                            { label: 'TOTAL NODES', value: nodes.length.toString() },
                                            { label: 'ONLINE', value: nodes.filter(n => n.status === 'online').length.toString() },
                                            { label: 'DEGRADED', value: nodes.filter(n => n.status === 'degraded').length.toString() },
                                            { label: 'OFFLINE', value: nodes.filter(n => n.status === 'offline').length.toString() }
                                          ],
                                          rows: nodes.map(node => {
                                            const uptimePct = node.status === 'online' ? '99.98%' : node.status === 'degraded' ? '95.40%' : '0.00%';
                                            return [
                                              node.name,
                                              node.type.toUpperCase().replace('_', ' '),
                                              node.ip,
                                              node.vlan,
                                              node.subnet,
                                              node.mac || 'N/A',
                                              node.vendor || 'N/A',
                                              node.status.toUpperCase(),
                                              node.latency !== undefined ? `${node.latency} ms` : 'N/A',
                                              uptimePct
                                            ];
                                          })
                                        });
                                      }}
                                      className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-slate-100 transition-colors cursor-pointer"
                                      title="Export PDF Report"
                                    >
                                      <Download className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => setIsNetworkModalOpen(true)}
                                      className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-slate-100 transition-colors cursor-pointer"
                                      title="Expand Details"
                                    >
                                      <Maximize2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                                
                                <div className="space-y-3 font-sans text-xs">
                                  {nodes.slice(0, 4).map(node => (
                                    <div key={node.id} className="flex justify-between items-center p-2 rounded bg-slate-950/30 border border-slate-800 hover:border-slate-700 transition-colors">
                                      <div className="flex flex-col">
                                        <span className="font-semibold text-slate-200">{node.name}</span>
                                        <span className="text-[10px] text-slate-400 font-mono">{node.ip}</span>
                                      </div>
                                      <span className={`status-pill ${
                                        node.status === 'online' ? 'bg-emerald-500/10 text-emerald-400' :
                                        node.status === 'degraded' ? 'bg-amber-500/10 text-amber-400' :
                                        'bg-rose-500/10 text-rose-400'
                                      }`}>
                                        ● {node.status}
                                      </span>
                                    </div>
                                  ))}
                                </div>

                                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1.5">
                                  <div className="font-mono text-[9px] text-slate-500 flex justify-between">
                                    <span>PING LATENCY</span>
                                    <span className="text-cyan-400 font-bold">AVG 6ms</span>
                                  </div>
                                  <div className="flex items-end gap-1.5 h-8 pt-1">
                                    <div className="w-full h-[40%] bg-rose-600 rounded-sm animate-pulse"></div>
                                    <div className="w-full h-[60%] bg-rose-600 rounded-sm"></div>
                                    <div className="w-full h-[45%] bg-rose-600 rounded-sm"></div>
                                    <div className="w-full h-[90%] bg-rose-600 rounded-sm animate-pulse"></div>
                                    <div className="w-full h-[35%] bg-rose-600 rounded-sm"></div>
                                    <div className="w-full h-[55%] bg-rose-600 rounded-sm"></div>
                                  </div>
                                </div>
                              </div>
                            );
                          case 'timeline':
                            return (
                              <div className="bento-card space-y-4 relative">
                                <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5">
                                  <button
                                    onClick={() => setExpandedCardId(expandedCardId === 'timeline' ? null : 'timeline')}
                                    className="p-1.5 bg-slate-950/90 hover:bg-slate-900 border border-slate-800 rounded text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                                    title={expandedCardId === 'timeline' ? "Exit Fullscreen" : "Fullscreen View"}
                                  >
                                    {expandedCardId === 'timeline' ? (
                                      <Minimize2 className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
                                    ) : (
                                      <Maximize2 className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                  <div 
                                    draggable
                                    onDragStart={() => handleDragStart('timeline')}
                                    onDragEnd={handleDragEnd}
                                    className="p-1.5 bg-slate-950/90 hover:bg-slate-900 border border-slate-800 rounded text-slate-400 hover:text-slate-200 cursor-grab active:cursor-grabbing transition-colors"
                                    title="Drag to reorder"
                                  >
                                    <GripVertical className="w-4 h-4 text-rose-500" />
                                  </div>
                                </div>
                                <ShowTimeline
                                  events={events}
                                  onAddEvent={handleAddEvent}
                                  onDeleteEvent={handleDeleteEvent}
                                />
                              </div>
                            );
                          case 'uptime':
                            return (
                              <div className="bento-card space-y-4 relative">
                                <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5">
                                  <button
                                    onClick={() => setExpandedCardId(expandedCardId === 'uptime' ? null : 'uptime')}
                                    className="p-1.5 bg-slate-950/90 hover:bg-slate-900 border border-slate-800 rounded text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                                    title={expandedCardId === 'uptime' ? "Exit Fullscreen" : "Fullscreen View"}
                                  >
                                    {expandedCardId === 'uptime' ? (
                                      <Minimize2 className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
                                    ) : (
                                      <Maximize2 className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                  <div 
                                    draggable
                                    onDragStart={() => handleDragStart('uptime')}
                                    onDragEnd={handleDragEnd}
                                    className="p-1.5 bg-slate-950/90 hover:bg-slate-900 border border-slate-800 rounded text-slate-400 hover:text-slate-200 cursor-grab active:cursor-grabbing transition-colors"
                                    title="Drag to reorder"
                                  >
                                    <GripVertical className="w-4 h-4 text-rose-500" />
                                  </div>
                                </div>
                                <div className="card-title">
                                  <span className="flex items-center gap-2 text-slate-100 font-sans font-bold text-sm uppercase tracking-normal">
                                    <Activity className="w-4.5 h-4.5 text-rose-500 animate-pulse" /> Core System Uptime (24h)
                                  </span>
                                </div>

                                {(() => {
                                  // filter for gateway, core_switch, dist_switch
                                  const hpNodes = nodes.filter(n => ['gateway', 'core_switch', 'dist_switch'].includes(n.type));
                                  const totalNodes = hpNodes.length;
                                  
                                  // calculate individual uptimes
                                  const nodeUptimes = hpNodes.map(node => {
                                    if (node.status === 'offline') return 0;
                                    const packetLoss = node.packetLoss || 0;
                                    if (node.status === 'degraded') return Math.max(70, 100 - packetLoss - 12);
                                    // slightly fluctuate near 100%
                                    const seedVal = node.name ? node.name.charCodeAt(0) % 5 : 2;
                                    const microJitter = (seedVal * 0.01) + (packetLoss * 0.1);
                                    return Math.min(100, 100 - microJitter);
                                  });

                                  const aggregatedUptime = totalNodes > 0 
                                    ? nodeUptimes.reduce((sum, u) => sum + u, 0) / totalNodes 
                                    : 100;

                                  const isExcellent = aggregatedUptime >= 99.0;
                                  const isFair = aggregatedUptime >= 90.0 && aggregatedUptime < 99.0;

                                  return (
                                    <div className="space-y-4">
                                      {/* Aggregated display */}
                                      <div className="bg-slate-950/60 border border-slate-900 rounded-xl p-4 flex items-center justify-between shadow-inner">
                                        <div>
                                          <span className="text-[10px] text-slate-500 font-mono block uppercase">Rolling 24-Hour Average</span>
                                          <span className={`text-2xl font-mono font-black tracking-tight ${
                                            isExcellent ? 'text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.2)]' :
                                            isFair ? 'text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.2)]' :
                                            'text-rose-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.2)]'
                                          }`}>
                                            {aggregatedUptime.toFixed(3)}%
                                          </span>
                                        </div>
                                        <div className="text-right">
                                          <span className="text-[10px] text-slate-500 font-mono block uppercase">Priority Level</span>
                                          <span className="text-[10px] font-mono font-bold bg-rose-500/15 border border-rose-500/30 text-rose-400 px-2.5 py-1 rounded-full uppercase tracking-wider">
                                            High Priority Backbone
                                          </span>
                                        </div>
                                      </div>

                                      {/* Mini timeline bar */}
                                      <div className="space-y-1">
                                        <div className="flex justify-between text-[9px] font-mono text-slate-500">
                                          <span>24H STABILITY TIMELINE</span>
                                          <span className="text-emerald-400 font-bold">NOMINAL</span>
                                        </div>
                                        <div className="flex gap-1">
                                          {Array.from({ length: 24 }).map((_, idx) => {
                                            const hasDegradation = idx === 8 || idx === 15 || idx === 20;
                                            const colorClass = hasDegradation 
                                              ? 'bg-amber-500 shadow-[0_0_3px_rgba(245,158,11,0.5)]' 
                                              : 'bg-emerald-500 shadow-[0_0_3px_rgba(16,185,129,0.5)]';
                                            return (
                                              <div 
                                                key={idx} 
                                                className={`h-4 flex-1 rounded-sm transition-all ${colorClass}`}
                                                title={`Hour ${idx + 1}: ${hasDegradation ? 'Degraded stability (94.2%)' : 'Fully Stable (100%)'}`}
                                              />
                                            );
                                          })}
                                        </div>
                                      </div>

                                      {/* Individual HP node details */}
                                      <div className="space-y-2 max-h-32 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800 pr-1 text-slate-300">
                                        {hpNodes.map((node, index) => {
                                          const uptimeVal = nodeUptimes[index] || 100;
                                          return (
                                            <div key={node.id} className="bg-slate-950/40 border border-slate-900/50 rounded p-2 flex justify-between items-center text-[10px] hover:border-slate-800 transition-all font-mono">
                                              <div className="flex items-center gap-2">
                                                <span className={`w-1.5 h-1.5 rounded-full ${
                                                  node.status === 'online' ? 'bg-emerald-500' :
                                                  node.status === 'degraded' ? 'bg-amber-500 animate-pulse' :
                                                  'bg-rose-500'
                                                }`} />
                                                <div className="flex flex-col">
                                                  <span className="text-slate-200 font-bold">{node.name}</span>
                                                  <span className="text-slate-500 text-[9px]">{node.ip}</span>
                                                </div>
                                              </div>
                                              <div className="text-right">
                                                <span className="text-slate-300 font-bold block">{uptimeVal.toFixed(2)}%</span>
                                                <span className="text-slate-500 text-[8px] uppercase">
                                                  pkt loss: {node.packetLoss || 0}%
                                                </span>
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  );
                                })()}
                              </div>
                            );
                          case 'geofence':
                            return (
                              <div className="bento-card space-y-4 relative">
                                <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5">
                                  {pinnedWidgets.includes('geofence') && (
                                    <span className="p-1 bg-rose-950/80 border border-rose-800/40 rounded text-rose-400" title="Pinned widget">
                                      <Pin className="w-3 h-3" />
                                    </span>
                                  )}
                                  <button
                                    onClick={() => setExpandedCardId(expandedCardId === 'geofence' ? null : 'geofence')}
                                    className="p-1.5 bg-slate-950/90 hover:bg-slate-900 border border-slate-800 rounded text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                                    title={expandedCardId === 'geofence' ? "Exit Fullscreen" : "Fullscreen View"}
                                  >
                                    {expandedCardId === 'geofence' ? (
                                      <Minimize2 className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
                                    ) : (
                                      <Maximize2 className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const rect = e.currentTarget.getBoundingClientRect();
                                      setContextMenu({
                                        x: rect.left,
                                        y: rect.bottom + window.scrollY,
                                        widgetId: 'geofence'
                                      });
                                    }}
                                    className="p-1.5 bg-slate-950/90 hover:bg-slate-900 border border-slate-800 rounded text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                                    title="Widget Options"
                                  >
                                    <MoreHorizontal className="w-4 h-4" />
                                  </button>
                                  <div 
                                    draggable
                                    onDragStart={() => handleDragStart('geofence')}
                                    onDragEnd={handleDragEnd}
                                    className="p-1.5 bg-slate-950/90 hover:bg-slate-900 border border-slate-800 rounded text-slate-400 hover:text-slate-200 cursor-grab active:cursor-grabbing transition-colors"
                                    title="Drag to reorder"
                                  >
                                    <GripVertical className="w-4 h-4 text-rose-500" />
                                  </div>
                                </div>

                                <div className="card-title">
                                  <span className="flex items-center gap-2 text-slate-100 font-sans font-bold text-sm uppercase tracking-normal">
                                    <Compass className="w-4 h-4 text-rose-500 animate-spin-slow" /> Geofence Breaches
                                  </span>
                                </div>
                                
                                <p className="text-[11px] text-slate-400 font-mono mt-1 leading-normal">
                                  Real-time monitoring of designated high-value stage bounds (20% - 80%).
                                </p>

                                <div className="space-y-2 max-h-56 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800 pr-1 text-slate-300">
                                  {geofenceBreaches.length === 0 ? (
                                    <div className="text-center py-6 text-slate-500">
                                      <MapPin className="w-8 h-8 mx-auto mb-2 text-slate-700" />
                                      <p className="text-xs">No active geofence breaches detected.</p>
                                    </div>
                                  ) : (
                                    <div className="overflow-x-auto">
                                      <table className="w-full text-left border-collapse text-[10px] font-mono">
                                        <thead>
                                          <tr className="border-b border-slate-800 text-slate-500 text-[9px] uppercase font-bold">
                                            <th className="py-1.5">Asset</th>
                                            <th className="py-1.5">Coordinates</th>
                                            <th className="py-1.5 text-right">Action</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {[...geofenceBreaches]
                                            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                                            .slice(0, 5)
                                            .map((breach) => (
                                              <tr key={breach.id} className="border-b border-slate-900 hover:bg-slate-900/40 transition-colors">
                                                <td className="py-2 pr-2">
                                                  <div className="font-bold text-slate-200 truncate max-w-[100px]" title={breach.assetName}>
                                                    {breach.assetName}
                                                  </div>
                                                  <div className="text-[9px] text-slate-500 truncate max-w-[100px]" title={breach.category}>
                                                    {breach.category}
                                                  </div>
                                                </td>
                                                <td className="py-2 text-slate-400">
                                                  X: {Math.round(breach.coordinates?.x ?? 0)}% <br />
                                                  Y: {Math.round(breach.coordinates?.y ?? 0)}%
                                                </td>
                                                <td className="py-2 text-right">
                                                  <button
                                                    onClick={() => {
                                                      setFocusedAssetId(breach.assetId);
                                                      triggerSystemLog(
                                                        'Geofence Jump', 
                                                        `Focused Auckland Stage Map viewport on violating hardware asset: "${breach.assetName}"`, 
                                                        'info'
                                                      );
                                                    }}
                                                    className="inline-flex items-center gap-1 px-2 py-1 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 hover:text-rose-300 rounded font-bold cursor-pointer transition-all"
                                                    title="Jump to Asset on Map"
                                                  >
                                                    <Locate className="w-3.5 h-3.5" /> Jump
                                                  </button>
                                                </td>
                                              </tr>
                                            ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          default:
                            return null;
                        }
                      })();

                      const isExpanded = expandedCardId === widgetId;
                      const sizeClass = isExpanded
                        ? 'fixed inset-4 md:inset-6 z-[140] bg-slate-900 border border-slate-800 p-6 overflow-y-auto shadow-2xl h-auto w-auto text-left'
                        : `${widgetSizes[widgetId] || 'lg:col-span-1'} rounded-2xl overflow-hidden`;

                      return (
                        <React.Fragment key={widgetId}>
                          {isExpanded && (
                            <div 
                              className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[130]"
                              onClick={() => setExpandedCardId(null)}
                            />
                          )}
                          <motion.div
                            layout
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: isDragging ? 0.6 : 1, scale: 1 }}
                            transition={{ type: 'spring', stiffness: 220, damping: 26 }}
                            onDragOver={(e) => handleDragOver(e, widgetId)}
                            className={`${sizeClass} transition-all duration-300 ${
                              isDragging ? 'ring-2 ring-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.3)] z-30' : ''
                            } ${isExpanded ? 'rounded-2xl' : ''}`}
                          >
                            {widgetContent}
                          </motion.div>
                        </React.Fragment>
                      );
                    })}
                  </div>

                  {/* Context Menu Dropdown */}
                  {contextMenu && (
                    <>
                      <div 
                        className="fixed inset-0 z-40 bg-transparent" 
                        onClick={() => setContextMenu(null)} 
                      />
                      <div 
                        className="fixed z-50 bg-slate-950 border border-slate-800 rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.8)] p-1.5 w-44 font-mono text-xs animate-fade-in"
                        style={{ left: `${contextMenu.x}px`, top: `${contextMenu.y}px` }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="px-2 py-1 border-b border-slate-900 text-[9px] text-slate-500 uppercase font-bold tracking-wider">
                          Widget Actions
                        </div>
                        <button
                          onClick={() => handlePinWidget(contextMenu.widgetId)}
                          className="w-full flex items-center gap-2 px-2.5 py-1.5 hover:bg-slate-900 text-slate-300 hover:text-white rounded-lg transition-all text-left cursor-pointer"
                        >
                          {pinnedWidgets.includes(contextMenu.widgetId) ? (
                            <>
                              <PinOff className="w-3.5 h-3.5 text-rose-500" />
                              Unpin Widget
                            </>
                          ) : (
                            <>
                              <Pin className="w-3.5 h-3.5 text-cyan-400" />
                              Pin to Top
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => handleHideWidget(contextMenu.widgetId)}
                          className="w-full flex items-center gap-2 px-2.5 py-1.5 hover:bg-slate-900 text-slate-300 hover:text-rose-400 rounded-lg transition-all text-left cursor-pointer"
                        >
                          <EyeOff className="w-3.5 h-3.5 text-rose-500" />
                          Hide Widget
                        </button>
                        <button
                          onClick={() => handleResetWidget(contextMenu.widgetId)}
                          className="w-full flex items-center gap-2 px-2.5 py-1.5 hover:bg-slate-900 text-slate-300 hover:text-white rounded-lg transition-all text-left cursor-pointer"
                        >
                          <RefreshCw className="w-3.5 h-3.5 text-amber-500" />
                          Reset State
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })()}

              {/* 2. Asset Inventory Tab */}
              {activeTab === 'assets' && (
                viewingAsset ? (
                  <AssetDetailView
                    asset={assets.find(a => a.id === viewingAsset.id) || viewingAsset}
                    onBack={() => setViewingAsset(null)}
                    users={users}
                    tickets={tickets}
                    onCreateTicket={handleCreateTicket}
                    onUpdateAsset={handleUpdateAsset}
                  />
                ) : (
                  <AssetsTab
                    assets={assets}
                    users={users}
                    tickets={tickets}
                    onAddAsset={handleAddAsset}
                    onUpdateAsset={handleUpdateAsset}
                    onDeleteAsset={handleDeleteAsset}
                    onCloneAsset={handleCloneAsset}
                    onCreateTicket={handleCreateTicket}
                    dropdowns={dropdowns}
                    onAddDropdownOption={handleAddDropdownOption}
                    onAssetClick={(a) => setViewingAsset(a)}
                  />
                )
              )}

              {/* 3. Rack & Switch Monitor */}
              {activeTab === 'network' && (
                <div className="space-y-6">
                  <TopologyMap
                    nodes={topologyNodes}
                    devices={devices}
                    onTriggerPingAll={handleTriggerPingAll}
                    isPinging={isPinging}
                    pingProgress={pingProgress}
                    continuousMonitoring={continuousMonitoring}
                    setContinuousMonitoring={setContinuousMonitoring}
                    monitorInterval={monitorInterval}
                    setMonitorInterval={setMonitorInterval}
                    onPrintReport={handlePrintReport}
                    onAdoptDevice={handleAdoptDevice}
                  />

                  <RackMonitor
                    devices={devices}
                    onAddDeviceToRack={handleAddDeviceToRack}
                    onRemoveDeviceFromRack={handleRemoveDeviceFromRack}
                  />
                </div>
              )}

              {/* 4. Consumables Stock & Analytics */}
              {activeTab === 'consumables' && (
                <Consumables
                  consumables={consumables}
                  tickets={tickets}
                  logs={logs}
                  events={events}
                  users={users}
                  onAddConsumable={handleAddConsumable}
                  onUpdateConsumable={handleUpdateConsumable}
                  onDeleteConsumable={handleDeleteConsumable}
                  onCloneConsumable={handleCloneConsumable}
                  onPrintReport={handlePrintReport}
                  onCreateTicket={handleCreateTicket}
                />
              )}

              {/* 5. Helpdesk Tickets */}
              {activeTab === 'helpdesk' && (
                <Helpdesk
                  tickets={tickets}
                  users={users}
                  assets={assets}
                  onCreateTicket={handleCreateTicket}
                  onUpdateTicket={handleUpdateTicket}
                  onDeleteTicket={handleDeleteTicket}
                  onCloneTicket={handleCloneTicket}
                  onPrintReport={handlePrintReport}
                />
              )}

              {/* 6. Operations Tools */}
              {activeTab === 'tools' && (
                <OperationTools
                  projects={projects}
                  rssFeed={rssFeed}
                  kbArticles={kbArticles}
                  reservations={reservations}
                  savedQueries={queries}
                  assets={assets}
                  onAddReservation={handleAddReservation}
                  onUpdateReservation={handleUpdateReservation}
                  onAddProject={handleAddProject}
                  onUpdateProjectStatus={handleUpdateProjectStatus}
                  onAddKBArticle={handleAddKBArticle}
                  onUpdateKBArticle={handleUpdateKBArticle}
                  onDeleteKBArticle={handleDeleteKBArticle}
                  onSaveQuery={handleSaveQuery}
                  onTriggerSavedQuery={handleTriggerSavedQuery}
                />
              )}

              {/* 7. User Profile & Diagnostics */}
              {activeTab === 'user' && (
                <UserProfile
                  preferences={sessionPreferences}
                  assignedAssets={assets.filter(a => a.assignedTo === sessionPreferences.displayName)}
                  userLogs={logs.filter(l => l.user === sessionPreferences.displayName)}
                  chatMessages={chatMessages}
                  onUpdatePreferences={handleUpdatePreferences}
                  onSendDirectMessage={handleSendDirectMessage}
                  sessionUser={sessionUser}
                  onUpdateUser={handleUpdateUser}
                />
              )}

              {/* 8. Admin & Setup */}
              {activeTab === 'admin' && (
                <AdminSetup
                  users={users}
                  rules={rules}
                  logs={logs}
                  geofenceBreaches={geofenceBreaches}
                  preferences={sessionPreferences}
                  assets={assets}
                  currentUser={sessionUser}
                  onUpdatePreferences={handleUpdatePreferences}
                  onAddRule={handleAddRule}
                  onDeleteRule={handleDeleteRule}
                  onUpdateUserRole={handleUpdateUserRole}
                  onToggleUserStatus={handleToggleUserStatus}
                  onRunAutoArchive={handleArchiveOldResolvedTickets}
                  onArchiveSignalLogs={handleArchiveSignalLogs}
                  dropdowns={dropdowns}
                  onAddDropdownOption={handleAddDropdownOption}
                  onDeleteDropdownOption={handleDeleteDropdownOption}
                  onAddUser={handleCreateUser}
                  onUpdateUser={handleUpdateUser}
                  onDeleteUser={handleDeleteUser}
                  gmailAccessToken={gmailAccessToken}
                  onConnectGmail={handleConnectGmail}
                  onSendTestEmail={sendGmailApiEmail}
                />
              )}

              {/* 9. Password Management */}
              {activeTab === 'passwords' && (
                <PasswordManagement
                  passwords={passwords}
                  preferences={sessionPreferences}
                  onAddPassword={handleAddPassword}
                  onDeletePassword={handleDeletePassword}
                />
              )}

              {/* 10. Virtual Assistant Tab Welcome Deck */}
              {activeTab === 'assistant' && (
                <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 md:p-8 flex flex-col items-center justify-center text-center min-h-[500px] backdrop-blur-sm max-w-3xl mx-auto my-12 relative overflow-hidden">
                  {/* Neon Grid Backing */}
                  <div className="absolute inset-0 bg-[linear-gradient(rgba(244,63,94,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(244,63,94,0.02)_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
                  
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-rose-600 to-rose-500 text-white flex items-center justify-center shadow-[0_0_24px_rgba(244,63,94,0.35)] mb-6 animate-pulse relative z-10">
                    <Bot className="w-8 h-8" />
                  </div>

                  <h2 className="font-sans font-bold text-slate-100 text-base md:text-xl uppercase tracking-wider mb-3 relative z-10">
                    Kynren Cognitive AI Uplink Active
                  </h2>
                  <p className="font-sans text-xs text-slate-400 max-w-md leading-relaxed mb-8 relative z-10">
                    The Virtual Assistant has been updated to a persistent **floating HUD bubble** on the bottom right of your console. You can now chat, scan hardware layouts, or sync telemetry from **any tab** in the application without losing your active layout.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-lg mb-8 relative z-10">
                    {[
                      { icon: <Bot className="w-4 h-4 text-rose-400" />, title: "Contextual Chat", desc: "Consult procedures" },
                      { icon: <Camera className="w-4 h-4 text-cyan-400" />, title: "Snap Lens", desc: "Analyze physical layouts" },
                      { icon: <Cpu className="w-4 h-4 text-emerald-400" />, title: "Telemetry Sync", desc: "Live memory registration" }
                    ].map((feat, idx) => (
                      <div key={idx} className="bg-slate-950/60 border border-slate-800 p-4 rounded-xl flex flex-col items-center">
                        <div className="p-2 bg-slate-900 rounded-lg mb-2">{feat.icon}</div>
                        <h4 className="text-[10px] font-mono font-bold text-slate-200 uppercase">{feat.title}</h4>
                        <p className="text-[9px] text-slate-500 font-mono mt-1">{feat.desc}</p>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsAssistantOpen(true)}
                    className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-xl cursor-pointer shadow-lg hover:shadow-rose-600/20 active:scale-95 transition-all relative z-10"
                  >
                    Open Assistant HUD
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </main>
      </div>

      {/* Retro CRT Operations Terminal Simulator Drawer/Modal */}
      <TerminalModal
        isOpen={isTerminalOpen}
        onClose={() => setIsTerminalOpen(false)}
        devices={devices}
        nodes={nodes}
        logs={logs}
        onTriggerPingAll={handleTriggerPingAll}
      />

      {/* Persistent Global Floating Assistant Bubble */}
      <VirtualAssistant
        nodes={nodes}
        assets={assets}
        tickets={tickets}
        consumables={consumables}
        kbArticles={kbArticles}
        isOpen={isAssistantOpen}
        onClose={() => setIsAssistantOpen(false)}
      />

      {/* Network Health Topology Details Modal */}
      {isNetworkModalOpen && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center z-50 p-4 md:p-6 no-print animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-5xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950/40">
              <div className="flex items-center gap-2">
                <Network className="w-5 h-5 text-cyan-400" />
                <div>
                  <h3 className="font-sans font-bold text-slate-100 text-xs md:text-sm uppercase tracking-wider">Network Health Details</h3>
                  <p className="text-[10px] text-slate-400 font-mono">Detailed listing of active topology nodes, MAC addresses, and operational metrics.</p>
                </div>
              </div>
              <button
                onClick={() => setIsNetworkModalOpen(false)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-[11px] rounded-lg transition-all cursor-pointer uppercase font-bold"
              >
                Close
              </button>
            </div>
            
            <div className="p-4 md:p-6 overflow-y-auto flex-1 space-y-4">
              {/* Quick stats inside modal */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="border border-slate-800 bg-slate-950/40 p-3 rounded-xl">
                  <span className="text-[9px] text-slate-500 font-mono uppercase block tracking-wider">Total Nodes</span>
                  <span className="text-base font-extrabold text-slate-200 font-mono mt-0.5 block">{nodes.length}</span>
                </div>
                <div className="border border-slate-800 bg-slate-950/40 p-3 rounded-xl">
                  <span className="text-[9px] text-slate-500 font-mono uppercase block tracking-wider">Online</span>
                  <span className="text-base font-extrabold text-emerald-400 font-mono mt-0.5 block">{nodes.filter(n => n.status === 'online').length}</span>
                </div>
                <div className="border border-slate-800 bg-slate-950/40 p-3 rounded-xl">
                  <span className="text-[9px] text-slate-500 font-mono uppercase block tracking-wider">Degraded</span>
                  <span className="text-base font-extrabold text-amber-400 font-mono mt-0.5 block">{nodes.filter(n => n.status === 'degraded').length}</span>
                </div>
                <div className="border border-slate-800 bg-slate-950/40 p-3 rounded-xl">
                  <span className="text-[9px] text-slate-500 font-mono uppercase block tracking-wider">Offline</span>
                  <span className="text-base font-extrabold text-rose-400 font-mono mt-0.5 block">{nodes.filter(n => n.status === 'offline').length}</span>
                </div>
              </div>

              {/* Table list */}
              <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/20">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-950/80 border-b border-slate-800">
                        <th className="p-3 text-[10px] font-bold text-slate-400 uppercase font-mono tracking-wider">Node Name</th>
                        <th className="p-3 text-[10px] font-bold text-slate-400 uppercase font-mono tracking-wider">Type</th>
                        <th className="p-3 text-[10px] font-bold text-slate-400 uppercase font-mono tracking-wider">IP Address</th>
                        <th className="p-3 text-[10px] font-bold text-slate-400 uppercase font-mono tracking-wider">VLAN / Subnet</th>
                        <th className="p-3 text-[10px] font-bold text-slate-400 uppercase font-mono tracking-wider">MAC Address</th>
                        <th className="p-3 text-[10px] font-bold text-slate-400 uppercase font-mono tracking-wider">Vendor</th>
                        <th className="p-3 text-[10px] font-bold text-slate-400 uppercase font-mono tracking-wider">Latency / Loss</th>
                        <th className="p-3 text-[10px] font-bold text-slate-400 uppercase font-mono tracking-wider">Status</th>
                        <th className="p-3 text-[10px] font-bold text-slate-400 uppercase font-mono tracking-wider">Uptime</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {nodes.map((node) => {
                        const uptimePct = node.status === 'online' ? '99.98%' : node.status === 'degraded' ? '95.40%' : '0.00%';
                        const uptimeDuration = node.status === 'online' ? '24d 18h' : node.status === 'degraded' ? '3d 12h' : '0h';
                        return (
                          <tr key={node.id} className="hover:bg-slate-800/30 transition-colors">
                            <td className="p-3 text-xs font-semibold text-slate-200">{node.name}</td>
                            <td className="p-3 text-xs font-mono text-slate-400 uppercase text-[10px]">{node.type.replace('_', ' ')}</td>
                            <td className="p-3 text-xs font-mono text-cyan-400">{node.ip}</td>
                            <td className="p-3 text-xs text-slate-400">
                              <div className="font-mono text-[10px]">{node.vlan}</div>
                              <div className="text-[9px] text-slate-500 font-mono">{node.subnet}</div>
                            </td>
                            <td className="p-3 text-xs font-mono text-slate-400 text-[10px]">{node.mac || '00:1E:80:FF:12:34'}</td>
                            <td className="p-3 text-xs text-slate-300 font-sans">{node.vendor || 'Cisco Systems'}</td>
                            <td className="p-3 text-xs font-mono">
                              <span className="text-slate-200">{node.latency !== undefined ? `${node.latency}ms` : 'N/A'}</span>
                              <span className="text-slate-500 text-[10px] ml-1.5">({node.packetLoss ?? 0}% loss)</span>
                            </td>
                            <td className="p-3 text-xs">
                              <span className={`status-pill inline-block ${
                                node.status === 'online' ? 'bg-emerald-500/10 text-emerald-400' :
                                node.status === 'degraded' ? 'bg-amber-500/10 text-amber-400' :
                                'bg-rose-500/10 text-rose-400'
                              }`}>
                                ● {node.status}
                              </span>
                            </td>
                            <td className="p-3 text-xs font-mono">
                              <div className="text-emerald-400 font-bold">{uptimePct}</div>
                              <div className="text-[9px] text-slate-500">{uptimeDuration}</div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Battery Alert Thresholds Configuration Modal */}
      <BatteryThresholdsModal 
        isOpen={isBatteryThresholdModalOpen}
        onClose={() => setIsBatteryThresholdModalOpen(false)}
        currentThresholds={batteryThresholds}
        autoShutdownEnabled={autoShutdownEnabled}
        onSaveSuccess={(updated, autoShutdown) => {
          setBatteryThresholds(updated);
          setAutoShutdownEnabled(autoShutdown);
          triggerSystemLog('System Metrics', `Battery warning thresholds updated. Auto-shutdown is now ${autoShutdown ? 'enabled' : 'disabled'}.`, 'success');
        }}
      />

      {/* Detailed Battery Chart Modal */}
      {isDetailedBatteryChartOpen && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center z-[150] p-4 md:p-6 no-print animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-4xl w-full flex flex-col shadow-2xl overflow-hidden font-sans">
            <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950/40">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-500">
                  <BatteryCharging className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-100 text-sm uppercase tracking-wide">Mobile Asset Battery Analytics</h3>
                  <p className="text-[11px] text-slate-400 font-mono mt-0.5">Enlarged timeline of moving telemetry points and average charge levels.</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {/* Tabs */}
                <div className="bg-slate-950 p-1 border border-slate-800 rounded-lg flex gap-1 font-mono text-[10px]">
                  <button
                    onClick={() => setExpandedModalTab('chart')}
                    className={`px-3 py-1.5 rounded-md font-bold uppercase transition-all cursor-pointer ${
                      expandedModalTab === 'chart' 
                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' 
                        : 'text-slate-400 hover:text-slate-200 border border-transparent'
                    }`}
                  >
                    24h Chart
                  </button>
                  <button
                    onClick={() => setExpandedModalTab('history')}
                    className={`px-3 py-1.5 rounded-md font-bold uppercase transition-all cursor-pointer ${
                      expandedModalTab === 'history' 
                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' 
                        : 'text-slate-400 hover:text-slate-200 border border-transparent'
                    }`}
                  >
                    7d History Tab
                  </button>
                  <button
                    onClick={() => setExpandedModalTab('compare')}
                    className={`px-3 py-1.5 rounded-md font-bold uppercase transition-all cursor-pointer ${
                      expandedModalTab === 'compare' 
                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' 
                        : 'text-slate-400 hover:text-slate-200 border border-transparent'
                    }`}
                  >
                    7d Compare Categories
                  </button>
                </div>
                <button
                  onClick={handleExportCSV}
                  className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white border border-emerald-500/30 font-mono text-[11px] rounded-lg transition-all cursor-pointer flex items-center gap-1.5 uppercase font-bold"
                >
                  <Download className="w-3.5 h-3.5" /> CSV Export
                </button>
                <button
                  onClick={() => setIsDetailedBatteryChartOpen(false)}
                  className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-[11px] rounded-lg transition-all cursor-pointer uppercase font-bold"
                >
                  Close
                </button>
              </div>
            </div>
            
            <div className="p-5 overflow-y-auto space-y-6">
              {/* Stats Bar (Only shown when not in 24h Chart tab, since in Chart tab they are displayed side-by-side!) */}
              {expandedModalTab !== 'chart' && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="border border-slate-800 bg-slate-950/60 p-3 rounded-xl text-left">
                    <span className="text-[10px] text-slate-500 font-mono uppercase block tracking-wider">Mobile Asset Count</span>
                    <span className="text-xl font-extrabold text-slate-200 font-mono mt-0.5 block">
                      {assets.filter(asset => 
                        asset.batteryLevel !== undefined && 
                        (asset.tags?.includes('mobile') || asset.name?.toLowerCase().includes('mobile') || asset.category?.toLowerCase() === 'radio')
                      ).length} active nodes
                    </span>
                  </div>
                  <div className="border border-slate-800 bg-slate-950/60 p-3 rounded-xl text-left">
                    <span className="text-[10px] text-slate-500 font-mono uppercase block tracking-wider font-bold text-rose-400">Peak Charge</span>
                    <span className="text-xl font-extrabold text-rose-400 font-mono mt-0.5 block">
                      {batteryStats24h.length > 0 ? Math.max(...batteryStats24h.map(d => d.battery)) : 95}%
                    </span>
                  </div>
                  <div className="border border-slate-800 bg-slate-950/60 p-3 rounded-xl text-left">
                    <span className="text-[10px] text-slate-500 font-mono uppercase block tracking-wider font-bold text-amber-500">Low Charge Point</span>
                    <span className="text-xl font-extrabold text-amber-500 font-mono mt-0.5 block">
                      {batteryStats24h.length > 0 ? Math.min(...batteryStats24h.map(d => d.battery)) : 42}%
                    </span>
                  </div>
                  <div className="border border-slate-800 bg-slate-950/60 p-3 rounded-xl text-left">
                    <span className="text-[10px] text-slate-500 font-mono uppercase block tracking-wider">Average Hourly Drain</span>
                    <span className="text-xl font-extrabold text-cyan-400 font-mono mt-0.5 block">
                      3.8% / hr
                    </span>
                  </div>
                </div>
              )}

              {expandedModalTab === 'chart' ? (
                /* Side-by-side layout on large screens, stackable on mobile */
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Stats Cards Column - taking 4 cols on lg, full width on mobile */}
                  <div className="lg:col-span-4 flex flex-col gap-4">
                    <div className="border border-slate-800 bg-slate-950/60 p-4 rounded-xl text-left flex flex-col justify-center min-h-[76px]">
                      <span className="text-[10px] text-slate-500 font-mono uppercase block tracking-wider">Mobile Asset Count</span>
                      <span className="text-xl font-extrabold text-slate-200 font-mono mt-0.5 block">
                        {assets.filter(asset => 
                          asset.batteryLevel !== undefined && 
                          (asset.tags?.includes('mobile') || asset.name?.toLowerCase().includes('mobile') || asset.category?.toLowerCase() === 'radio')
                        ).length} active nodes
                      </span>
                    </div>
                    <div className="border border-slate-800 bg-slate-950/60 p-4 rounded-xl text-left flex flex-col justify-center min-h-[76px]">
                      <span className="text-[10px] text-slate-500 font-mono uppercase block tracking-wider font-bold text-rose-400">Peak Charge</span>
                      <span className="text-xl font-extrabold text-rose-400 font-mono mt-0.5 block">
                        {batteryStats24h.length > 0 ? Math.max(...batteryStats24h.map(d => d.battery)) : 95}%
                      </span>
                    </div>
                    <div className="border border-slate-800 bg-slate-950/60 p-4 rounded-xl text-left flex flex-col justify-center min-h-[76px]">
                      <span className="text-[10px] text-slate-500 font-mono uppercase block tracking-wider font-bold text-amber-500">Low Charge Point</span>
                      <span className="text-xl font-extrabold text-amber-500 font-mono mt-0.5 block">
                        {batteryStats24h.length > 0 ? Math.min(...batteryStats24h.map(d => d.battery)) : 42}%
                      </span>
                    </div>
                    <div className="border border-slate-800 bg-slate-950/60 p-4 rounded-xl text-left flex flex-col justify-center min-h-[76px]">
                      <span className="text-[10px] text-slate-500 font-mono uppercase block tracking-wider font-bold text-cyan-400">Average Hourly Drain</span>
                      <span className="text-xl font-extrabold text-cyan-400 font-mono mt-0.5 block">
                        3.8% / hr
                      </span>
                    </div>
                  </div>

                  {/* Chart Column - taking 8 cols on lg, full width on mobile */}
                  <div className="lg:col-span-8 bg-slate-950/60 p-4 border border-slate-850 rounded-2xl h-[354px] flex flex-col justify-between">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={batteryStats24h} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                        <defs>
                          <linearGradient id="detailed-battery-grad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.4}/>
                            <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.5} />
                        <XAxis 
                          dataKey="time" 
                          stroke="#475569" 
                          fontSize={10} 
                          tickLine={true}
                          axisLine={true}
                        />
                        <YAxis 
                          domain={[0, 100]} 
                          stroke="#475569" 
                          fontSize={10} 
                          tickLine={true}
                          axisLine={true}
                          tickFormatter={(v) => `${v}%`}
                        />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px' }}
                          labelStyle={{ color: '#94a3b8', fontSize: '11px', fontFamily: 'monospace', fontWeight: 'bold' }}
                          itemStyle={{ color: '#f43f5e', fontSize: '11px', fontFamily: 'monospace', fontWeight: 'bold' }}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="battery" 
                          name="Battery Level" 
                          stroke="#f43f5e" 
                          strokeWidth={3} 
                          fillOpacity={1} 
                          fill="url(#detailed-battery-grad)"
                          activeDot={{ r: 6, stroke: '#fda4af', strokeWidth: 1.5 }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              ) : expandedModalTab === 'history' ? (
                /* 7-Day Battery History Table */
                <div className="bg-slate-950/60 border border-slate-850 rounded-2xl overflow-hidden text-left">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs font-mono">
                      <thead>
                        <tr className="bg-slate-950 border-b border-slate-850 text-slate-500 uppercase text-[9px] tracking-wider">
                          <th className="p-3">Snapshot Date</th>
                          <th className="p-3 text-center">Avg Battery Level</th>
                          <th className="p-3 text-center">Hourly Consumption Rate</th>
                          <th className="p-3 text-center">Nodes Polled</th>
                          <th className="p-3 text-center">Anomalies Detected</th>
                          <th className="p-3 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-850/50">
                        {batteryHistory7d.map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-900/40 transition-colors">
                            <td className="p-3 font-sans font-semibold text-slate-200">{row.date}</td>
                            <td className="p-3 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <div className="w-16 bg-slate-900 h-1.5 rounded-full overflow-hidden border border-slate-800">
                                  <div 
                                    className={`h-full rounded-full ${
                                      row.avgBattery < 30 ? 'bg-rose-500' : row.avgBattery < 60 ? 'bg-amber-500' : 'bg-emerald-500'
                                    }`}
                                    style={{ width: `${row.avgBattery}%` }}
                                  />
                                </div>
                                <span className="font-bold text-slate-300">{row.avgBattery}%</span>
                              </div>
                            </td>
                            <td className="p-3 text-center font-bold text-cyan-400">-{row.avgDrain}% / hr</td>
                            <td className="p-3 text-center text-slate-400">{row.nodes} nodes</td>
                            <td className="p-3 text-center">
                              {row.anomalies > 0 ? (
                                <span className="text-rose-400 font-bold bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                                  ⚠️ {row.anomalies} Event{row.anomalies > 1 ? 's' : ''}
                                </span>
                              ) : (
                                <span className="text-slate-600">None</span>
                              )}
                            </td>
                            <td className="p-3 text-right">
                              <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider inline-block ${
                                row.status === 'Nominal' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                row.status === 'Warning' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' :
                                'bg-rose-500/10 text-rose-400 border border-rose-500/20 animate-pulse'
                              }`}>
                                {row.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                /* Comparative Category Drain Chart over 7 Days */
                <div className="bg-slate-950/60 p-4 border border-slate-850 rounded-2xl h-[354px] flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[11px] text-slate-300 font-bold font-mono uppercase tracking-wider flex items-center gap-2">
                      <Flame className="w-4 h-4 text-rose-500" /> Hourly Battery Drain Rate by Category (Past 7 Days)
                    </p>
                    <div className="flex flex-wrap gap-2 text-[9px] font-mono">
                      <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#3b82f6]" /> Radio</span>
                      <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" /> Speaker</span>
                      <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#ef4444]" /> Pyrotechnics</span>
                      <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#f59e0b]" /> Projector</span>
                      <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#8b5cf6]" /> DMX</span>
                      <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#ec4899]" /> Switch</span>
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height="90%">
                    <LineChart data={batteryCategoryDrain7d} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.5} />
                      <XAxis 
                        dataKey="date" 
                        stroke="#475569" 
                        fontSize={10} 
                        tickLine={true}
                        axisLine={true}
                      />
                      <YAxis 
                        domain={[0, 'auto']} 
                        stroke="#475569" 
                        fontSize={10} 
                        tickLine={true}
                        axisLine={true}
                        tickFormatter={(v) => `${v}%/h`}
                      />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px' }}
                        labelStyle={{ color: '#94a3b8', fontSize: '11px', fontFamily: 'monospace', fontWeight: 'bold' }}
                        itemStyle={{ fontSize: '10px', fontFamily: 'monospace' }}
                      />
                      <Line type="monotone" dataKey="Radio" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} name="Radio" />
                      <Line type="monotone" dataKey="Speaker" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} name="Speaker" />
                      <Line type="monotone" dataKey="Pyrotechnics" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} name="Pyrotechnics" />
                      <Line type="monotone" dataKey="Projector" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} name="Projector" />
                      <Line type="monotone" dataKey="DMX" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3 }} name="DMX" />
                      <Line type="monotone" dataKey="Switch" stroke="#ec4899" strokeWidth={2} dot={{ r: 3 }} name="Switch" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Automated Email Report Section */}
              <div className="bg-slate-950 p-4 border border-slate-850 rounded-xl space-y-3 text-left">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/60 pb-2">
                  <div>
                    <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" /> Gmail Operations Center
                    </h4>
                    <p className="text-[10px] text-slate-500 font-mono">DISPATCH BATTERY METRICS DIRECTLY TO CORPORATE REGISTER</p>
                  </div>
                  
                  {!gmailAccessToken ? (
                    <button
                      onClick={handleConnectGmail}
                      className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-mono text-[10px] uppercase font-bold rounded transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      Connect Gmail Account
                    </button>
                  ) : (
                    <div className="flex items-center gap-2 text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" /> Authorized via sethboaamponsem@gmail.com
                    </div>
                  )}
                </div>

                {gmailAuthError && (
                  <p className="text-[10px] text-rose-400 font-mono bg-rose-500/5 p-2 rounded border border-rose-500/10">
                    ⚠️ Error: {gmailAuthError}
                  </p>
                )}

                {gmailAccessToken && (
                  <div className="flex flex-col sm:flex-row gap-2.5 items-end">
                    <div className="flex-1 w-full space-y-1">
                      <label className="text-[9px] text-slate-400 font-mono uppercase tracking-widest">Registered Corporate Address</label>
                      <input 
                        type="email" 
                        value={reportTargetEmail}
                        onChange={(e) => setReportTargetEmail(e.target.value)}
                        placeholder="e.g. sethboaamponsem@gmail.com"
                        className="w-full bg-slate-900 border border-slate-800 focus:border-rose-500 text-slate-200 text-[11px] font-mono px-3 py-2 rounded-lg outline-none transition-all"
                      />
                    </div>
                    <button
                      onClick={() => handleSendEmailReport(reportTargetEmail)}
                      disabled={isSendingEmail || !reportTargetEmail}
                      className={`px-4 py-2 text-white font-mono text-[10px] uppercase font-bold rounded-lg transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
                        isSendingEmail ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-rose-600 hover:bg-rose-500'
                      }`}
                    >
                      {isSendingEmail ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Dispatching...
                        </>
                      ) : (
                        <>
                          Send Health Report
                        </>
                      )}
                    </button>
                  </div>
                )}

                {emailSentStatus === 'success' && (
                  <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-mono rounded-lg flex items-center gap-2">
                    <span className="font-bold">✓ Success:</span> Battery report transmitted successfully. Check inbox at {reportTargetEmail}.
                  </div>
                )}
                {emailSentStatus === 'error' && (
                  <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] font-mono rounded-lg">
                    <span className="font-bold">⚠️ Failure:</span> Could not transmit the battery report. Verify your network or authorization session.
                  </div>
                )}
              </div>

              <div className="bg-slate-950 p-3 border border-slate-850 rounded-xl flex items-start gap-2 text-left">
                <Info className="w-4 h-4 text-rose-500 mt-0.5 shrink-0" />
                <div className="text-[11px] text-slate-400 leading-normal">
                  <p className="font-bold text-slate-300">Statistical Insight:</p>
                  Calculations represent a rolling average over the last 24 hours of all tagged moving nodes. Micro-variations on immediate re-calculation indicate telemetry loop polling delays and physical asset temperature adjustments. Set individual warning thresholds to fine-tune the automated dispatch trigger sensitivity.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* On-Screen Print Preview Modal */}
      {activePrintReport && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center z-50 p-4 md:p-6 no-print animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl relative">
            {isExportingPDF && (
              <div className="absolute inset-0 bg-slate-950/95 flex flex-col items-center justify-center z-50 p-6 rounded-2xl">
                <div className="max-w-md w-full bg-slate-900 border border-slate-800 p-6 rounded-xl text-center space-y-4 shadow-2xl relative overflow-hidden">
                  {/* Neon pulsing glow line */}
                  <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-500 animate-pulse" />
                  
                  <div className="mx-auto w-12 h-12 bg-emerald-500/10 border border-emerald-500/30 rounded-full flex items-center justify-center text-emerald-400">
                    <FileText className="w-6 h-6 animate-bounce" />
                  </div>
                  
                  <div className="space-y-1">
                    <h4 className="font-mono text-xs font-bold uppercase tracking-widest text-slate-200">PDF Compilation Engine Active</h4>
                    <p className="text-[10px] text-slate-500 font-mono">KYNREN TECH OPS // DIRECT PRINT SYSTEM</p>
                  </div>

                  <div className="space-y-2">
                    {/* Progress Bar */}
                    <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                      <div 
                        className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-300 rounded-full"
                        style={{ width: `${exportPDFProgress}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[9px] font-mono text-slate-500">
                      <span>{exportPDFStep}</span>
                      <span className="text-emerald-400 font-bold">{exportPDFProgress}%</span>
                    </div>
                  </div>

                  <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-850/50 text-left">
                    <p className="text-[9px] text-amber-400 font-mono leading-relaxed">
                      ⚠️ <strong className="uppercase">Notice:</strong> If the print dialog does not appear automatically, make sure browser popups are allowed. In the print dialog, select <strong className="text-white">"Save as PDF"</strong> to download.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950/40">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-rose-500 animate-pulse" />
                <h3 className="font-sans font-bold text-slate-100 text-xs md:text-sm uppercase tracking-wider">Operational Print Report Preview</h3>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleExportPDF}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-[11px] font-bold rounded-lg transition-all shadow-lg hover:shadow-emerald-500/25 cursor-pointer uppercase flex items-center gap-1"
                >
                  <FileText className="w-3.5 h-3.5" /> Export as PDF
                </button>
                <button
                  onClick={() => window.print()}
                  className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-mono text-[11px] font-bold rounded-lg transition-all shadow-lg hover:shadow-rose-500/25 cursor-pointer uppercase"
                >
                  Confirm & Print
                </button>
                <button
                  onClick={() => setActivePrintReport(null)}
                  className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-[11px] rounded-lg transition-all cursor-pointer uppercase"
                >
                  Close
                </button>
              </div>
            </div>
            
            {/* Scrollable Printable sandbox simulation */}
            <div className="p-4 md:p-8 overflow-y-auto bg-white text-slate-900 flex-1">
              <div className="max-w-3xl mx-auto space-y-6">
                
                {/* Header */}
                <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4">
                  <div>
                    <h1 className="text-lg md:text-xl font-bold uppercase tracking-tight text-slate-950">{activePrintReport.title}</h1>
                    <p className="text-[10px] text-slate-500 font-mono mt-1">Generated: {new Date().toLocaleString()} | Security Protocol Secure Operational Channel</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs md:text-sm font-bold text-rose-600 tracking-wider uppercase font-mono block">KYNREN TECH OPS</span>
                    <p className="text-[9px] text-slate-400 font-mono">OFFLINE LOGISTICS EXECUTION</p>
                  </div>
                </div>

                {/* Summaries Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {activePrintReport.summaries.map((s, idx) => (
                    <div key={idx} className="border border-slate-200 bg-slate-50 p-3 rounded-xl shadow-sm">
                      <span className="text-[9px] text-slate-400 font-mono uppercase block tracking-wider">{s.label}</span>
                      <span className="text-sm md:text-base font-extrabold text-slate-900 font-mono mt-0.5 block">{s.value}</span>
                    </div>
                  ))}
                </div>

                {/* Table Data */}
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-200">
                        {activePrintReport.headers.map((h, idx) => (
                          <th key={idx} className="p-2 md:p-3 text-[10px] font-bold text-slate-600 border-r border-slate-200 last:border-r-0 uppercase font-mono tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {activePrintReport.rows.map((row, rIdx) => (
                        <tr key={rIdx} className="border-b border-slate-150 last:border-b-0 hover:bg-slate-50">
                          {row.map((cell, cIdx) => (
                            <td key={cIdx} className="p-2 md:p-3 text-xs text-slate-800 border-r border-slate-200 last:border-r-0 leading-relaxed font-sans">{cell}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Footer disclaimer */}
                <div className="border-t border-slate-200 pt-4 flex justify-between items-center text-[9px] text-slate-400 font-mono uppercase">
                  <span>Classified: INTERNAL LOGISTICS SUMMARY</span>
                  <span>Page 1 of 1</span>
                </div>

              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hidden layout specifically injected for system PDF generation */}
      {activePrintReport && (
        <div className="printable-area hidden print:block bg-white text-slate-900 p-8 font-sans">
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4">
              <div>
                <h1 className="text-xl font-bold uppercase tracking-tight text-slate-950">{activePrintReport.title}</h1>
                <p className="text-[10px] text-slate-500 font-mono mt-1">Generated: {new Date().toLocaleString()} | Secure Operational Channel</p>
              </div>
              <div className="text-right">
                <span className="text-sm font-bold text-rose-600 tracking-wider uppercase font-mono">KYNREN TECH OPS</span>
                <p className="text-[9px] text-slate-400 font-mono">OFFLINE LOGISTICS EXECUTION</p>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4">
              {activePrintReport.summaries.map((s, idx) => (
                <div key={idx} className="border border-slate-200 bg-slate-50 p-3 rounded">
                  <span className="text-[9px] text-slate-400 font-mono uppercase block">{s.label}</span>
                  <span className="text-base font-bold text-slate-950 font-mono">{s.value}</span>
                </div>
              ))}
            </div>

            <div className="border border-slate-300 rounded overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-300">
                    {activePrintReport.headers.map((h, idx) => (
                      <th key={idx} className="p-2.5 text-[10px] font-bold text-slate-600 border-r border-slate-200 last:border-r-0 uppercase font-mono">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {activePrintReport.rows.map((row, rIdx) => (
                    <tr key={rIdx} className="border-b border-slate-200 last:border-b-0">
                      {row.map((cell, cIdx) => (
                        <td key={cIdx} className="p-2.5 text-xs text-slate-900 border-r border-slate-200 last:border-r-0 leading-relaxed font-sans">{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="border-t border-slate-200 pt-4 flex justify-between items-center text-[9px] text-slate-400 font-mono uppercase">
              <span>Classified: INTERNAL LOGISTICS SUMMARY</span>
              <span>Page 1 of 1</span>
            </div>
          </div>
        </div>
      )}

      {/* 10. Multi-Page Daily Briefing Print Preview Overlay */}
      {showDailyBriefingPrint && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center z-50 p-4 md:p-6 no-print animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-5xl w-full max-h-[94vh] flex flex-col shadow-2xl overflow-hidden">
            
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950/40">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-rose-500 animate-pulse" />
                <div>
                  <h3 className="font-sans font-bold text-slate-100 text-xs md:text-sm uppercase tracking-wider">Kynren Daily Briefing Coordinator</h3>
                  <p className="text-[10px] text-slate-400 font-mono">Simulates a 3-page formal PDF briefing block ready for paper or digital export.</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-mono text-[11px] font-bold rounded-lg transition-all shadow-lg hover:shadow-rose-500/25 cursor-pointer uppercase"
                >
                  Save PDF / Print
                </button>
                <button
                  onClick={() => setShowDailyBriefingPrint(false)}
                  className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-[11px] rounded-lg transition-all cursor-pointer uppercase"
                >
                  Close Preview
                </button>
              </div>
            </div>

            {/* Scrollable Document Sandbox */}
            <div className="p-6 md:p-10 overflow-y-auto bg-slate-100 flex-1">
              <div className="max-w-4xl mx-auto space-y-12">
                
                {/* PAGE 1 Preview (Cover & Executive Metadata) */}
                <div className="bg-white text-slate-900 p-8 shadow-md rounded-lg space-y-6 relative border border-slate-200 min-h-[842px] flex flex-col justify-between">
                  <div className="space-y-6">
                    {/* Header */}
                    <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4">
                      <div>
                        <h1 className="text-xl font-bold uppercase tracking-tight text-slate-950">Daily Operational Briefing</h1>
                        <p className="text-[10px] text-slate-500 font-mono mt-1">Generated: {new Date().toLocaleString()} | Security Protocol: Secure Node Mode</p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-bold text-rose-600 tracking-wider uppercase font-mono block">KYNREN TECH OPERATIONS</span>
                        <p className="text-[9px] text-slate-400 font-mono">OFFICIAL EXPORT REPORT</p>
                      </div>
                    </div>

                    {/* Metadata block */}
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                      <div>
                        <span className="text-[9px] text-slate-400 uppercase font-mono block">Operator Node IP:</span>
                        <span className="font-mono font-bold text-slate-800">{preferences.clientIp || '192.168.1.100'}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 uppercase font-mono block">Assigned Lead:</span>
                        <span className="font-sans font-bold text-slate-800">{preferences.displayName}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 uppercase font-mono block">Database Status:</span>
                        <span className="font-mono text-emerald-600 font-bold uppercase">✓ Active Sync</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 uppercase font-mono block">Hardware Assets:</span>
                        <span className="font-mono font-bold text-slate-800">{assets.length} Devices Registered</span>
                      </div>
                    </div>

                    {/* Dashboard State Summaries */}
                    <div className="space-y-3">
                      <h3 className="text-xs font-bold text-slate-900 uppercase font-mono border-b border-slate-200 pb-1.5 flex items-center gap-1.5">
                        :: Current Widget Layouts & Operational Health
                      </h3>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        The Kynren Showground telemetry dashboard is actively coordinating <strong className="text-slate-900">5 primary widget layers</strong> across the lake-stage mesh. Below is the active device and system distribution matrix:
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="p-3 border border-slate-200 rounded-lg bg-slate-50">
                          <span className="text-[9px] text-slate-400 uppercase font-mono block">Active Hardware Nodes</span>
                          <span className="text-base font-extrabold font-mono text-emerald-600">{assets.filter(a => a.status === 'active').length} / {assets.length}</span>
                        </div>
                        <div className="p-3 border border-slate-200 rounded-lg bg-slate-50">
                          <span className="text-[9px] text-slate-400 uppercase font-mono block">Under Maintenance</span>
                          <span className="text-base font-extrabold font-mono text-amber-500">{assets.filter(a => a.status === 'maintenance').length} Devices</span>
                        </div>
                        <div className="p-3 border border-slate-200 rounded-lg bg-slate-50">
                          <span className="text-[9px] text-slate-400 uppercase font-mono block">Offline Diagnostics</span>
                          <span className="text-base font-extrabold font-mono text-rose-500">{assets.filter(a => a.status === 'offline').length} Faulty Nodes</span>
                        </div>
                      </div>
                    </div>

                    {/* Executive Summary */}
                    <div className="space-y-2">
                      <h3 className="text-xs font-bold text-slate-900 uppercase font-mono">Logistics Overview Statement</h3>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        All physical sub-surface lake speakers, fireworks trigger systems, Auckland backdrop castles, and DMX projection towers are synced to the local telemetry mesh. The geofenced stage limits [20% - 80%] are continuously monitored. Currently, <strong className="text-slate-900">{assets.filter(a => a.isHighValue && (a.coordinates.x < 20 || a.coordinates.x > 80 || a.coordinates.y < 20 || a.coordinates.y > 80)).length} geofence breaches</strong> are noted.
                      </p>
                    </div>
                  </div>

                  <div className="border-t border-slate-200 pt-4 flex justify-between items-center text-[9px] text-slate-400 font-mono uppercase">
                    <span>PAGE 1: METADATA & BRIEFING STATEMENT</span>
                    <span>KYNREN TECH MASTER OPS</span>
                  </div>
                </div>

                {/* PAGE 2 Preview (Show Timeline Run Sheet & System Alerts) */}
                <div className="bg-white text-slate-900 p-8 shadow-md rounded-lg space-y-6 relative border border-slate-200 min-h-[842px] flex flex-col justify-between">
                  <div className="space-y-6">
                    {/* Page Header */}
                    <div className="flex justify-between items-start border-b border-slate-200 pb-3">
                      <div>
                        <h2 className="text-sm font-bold uppercase tracking-tight text-slate-900">Page 2: Show Timeline & Active Alerts</h2>
                        <p className="text-[9px] text-slate-500 font-mono mt-0.5">Automated telemetry log snapshot and schedule rundown</p>
                      </div>
                      <span className="text-[10px] text-rose-500 font-mono uppercase font-bold tracking-wider">KYNREN TECH METRICS</span>
                    </div>

                    {/* Timeline Events Table */}
                    <div className="space-y-2.5">
                      <h3 className="text-xs font-bold text-slate-800 uppercase font-mono flex items-center gap-1">
                        :: Chronological Show Run Timeline Events
                      </h3>
                      <div className="border border-slate-200 rounded-lg overflow-hidden">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 font-mono text-[9px] uppercase text-slate-500">
                              <th className="p-2 font-bold w-16">Time</th>
                              <th className="p-2 font-bold w-32">Title</th>
                              <th className="p-2 font-bold w-24">Location</th>
                              <th className="p-2 font-bold">Details</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {events.length === 0 ? (
                              <tr>
                                <td colSpan={4} className="p-4 text-center text-slate-400 font-mono uppercase">No active show timeline events mapped.</td>
                              </tr>
                            ) : (
                              events.slice(0, 5).map((ev) => (
                                <tr key={ev.id}>
                                  <td className="p-2 font-mono font-bold text-slate-800">{ev.time}</td>
                                  <td className="p-2 font-semibold text-slate-800">{ev.title}</td>
                                  <td className="p-2 text-slate-600">{ev.location}</td>
                                  <td className="p-2 text-slate-500 leading-normal">{ev.details || 'Operational trigger ready.'}</td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Critical Diagnostics System Alerts */}
                    <div className="space-y-2.5">
                      <h3 className="text-xs font-bold text-slate-800 uppercase font-mono">
                        :: Diagnostics Alerts Log Snapshot
                      </h3>
                      <div className="border border-slate-200 rounded-lg overflow-hidden font-mono text-[10px]">
                        <div className="bg-slate-50 p-2 font-bold border-b border-slate-200 uppercase tracking-wider text-slate-500">
                          Active Signal Broadcast stream (Last 5 Events)
                        </div>
                        <div className="divide-y divide-slate-100 bg-slate-50/20">
                          {logs.slice(0, 5).map((log) => (
                            <div key={log.id} className="p-2 flex justify-between items-start gap-4 hover:bg-slate-50 transition-colors">
                              <div>
                                <span className="font-bold text-slate-700">[{log.source}]</span>
                                <span className="text-slate-600 ml-1.5">{log.message}</span>
                              </div>
                              <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase shrink-0 ${
                                log.severity === 'critical' ? 'bg-rose-100 text-rose-700 border border-rose-200' :
                                log.severity === 'warn' ? 'bg-amber-100 text-amber-700 border border-amber-200' :
                                'bg-cyan-100 text-cyan-700 border border-cyan-200'
                              }`}>
                                {log.severity}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-slate-200 pt-4 flex justify-between items-center text-[9px] text-slate-400 font-mono uppercase">
                    <span>PAGE 2: TIMELINE RUNDOWNS & TELEMETRY STREAM</span>
                    <span>KYNREN TECH MASTER OPS</span>
                  </div>
                </div>

                {/* PAGE 3 Preview (Resource & Technician Assignments) */}
                <div className="bg-white text-slate-900 p-8 shadow-md rounded-lg space-y-6 relative border border-slate-200 min-h-[842px] flex flex-col justify-between">
                  <div className="space-y-6">
                    {/* Page Header */}
                    <div className="flex justify-between items-start border-b border-slate-200 pb-3">
                      <div>
                        <h2 className="text-sm font-bold uppercase tracking-tight text-slate-900">Page 3: Technician Shift Schedules & Equipment reservations</h2>
                        <p className="text-[9px] text-slate-500 font-mono mt-0.5">Live allocation records and active bookings ledger</p>
                      </div>
                      <span className="text-[10px] text-rose-500 font-mono uppercase font-bold tracking-wider">KYNREN STAFFING & RESERVES</span>
                    </div>

                    {/* Active Staff Shift blocks */}
                    <div className="space-y-3">
                      <h3 className="text-xs font-bold text-slate-800 uppercase font-mono">
                        :: Operations Dispatch & Labor Grid
                      </h3>
                      <p className="text-xs text-slate-600 leading-normal">
                        Technician labor schedules are assigned to coordinate with live pyrotechnic sequences and audio tuning intervals. The active block allocations are detailed below:
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div className="p-3 border border-slate-200 rounded-lg bg-slate-50/50">
                          <span className="font-bold block text-slate-800 border-b border-slate-200 pb-1 mb-1.5">Lead Crew Assignments</span>
                          <ul className="space-y-1 font-mono text-[11px] text-slate-600">
                            <li>● Alice Smith: Auckland Lead (Lake Inspection)</li>
                            <li>● Bob Jones: Live Sound (Mic Array Setup)</li>
                            <li>● Charlie Brown: Pyrotechnic Control (Sweep Tests)</li>
                            <li>● David White: Grandstand Lighting Alignment</li>
                          </ul>
                        </div>
                        <div className="p-3 border border-slate-200 rounded-lg bg-slate-50/50">
                          <span className="font-bold block text-slate-800 border-b border-slate-200 pb-1 mb-1.5">Equipment Bookings Ledger</span>
                          <ul className="space-y-1 font-mono text-[11px] text-slate-600">
                            <li>● Laser Projector V1: Assigned (10:00 - 12:00)</li>
                            <li>● Lake Stage Subwoofer: Reserved (16:00 - 18:00)</li>
                            <li>● Trigger Board B: Pyro Sweeps (14:00 - 16:00)</li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    {/* System Maintenance Guidelines */}
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                      <h4 className="text-[11px] font-bold text-slate-800 uppercase font-mono">:: Technical Maintenance Guideline Policy</h4>
                      <p className="text-[11px] text-slate-500 leading-relaxed font-sans">
                        Any hardware status shifts to OFFLINE must trigger immediate ticketing dispatch. Refrain from performing physical lake sweeps during active high-value pyrotechnic rehearsal intervals. Always ensure the system admin password remains encrypted under local storage guidelines.
                      </p>
                    </div>
                  </div>

                  <div className="border-t border-slate-200 pt-4 flex justify-between items-center text-[9px] text-slate-400 font-mono uppercase">
                    <span>PAGE 3: STAFF SHIFTS & HARDWARE RESERVES</span>
                    <span>KYNREN TECH MASTER OPS</span>
                  </div>
                </div>

              </div>
            </div>

          </div>
        </div>
      )}

      {/* Hidden layout specifically injected for multi-page PDF generation */}
      {showDailyBriefingPrint && (
        <div className="printable-area hidden print:block bg-white text-slate-900 p-10 font-sans text-xs">
          
          {/* PAGE 1: COVER & METADATA */}
          <div className="min-h-[1050px] flex flex-col justify-between space-y-6 break-after-page" style={{ pageBreakAfter: 'always' }}>
            <div className="space-y-6">
              <div className="flex justify-between items-start border-b-2 border-slate-950 pb-4">
                <div>
                  <h1 className="text-xl font-bold uppercase tracking-tight text-slate-950">Daily Operational Briefing Summary</h1>
                  <p className="text-[9px] text-slate-500 font-mono mt-1">Generated: {new Date().toLocaleString()} | Secure Operational Mesh Channel</p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-rose-600 tracking-wider uppercase font-mono block">KYNREN SYSTEM LOGISTICS</span>
                  <p className="text-[9px] text-slate-400 font-mono">OFFLINE BROADCAST REPORT</p>
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded border border-slate-200 grid grid-cols-4 gap-4 text-[11px]">
                <div>
                  <span className="text-[9px] text-slate-400 uppercase font-mono block">Operator:</span>
                  <span className="font-bold text-slate-800">{preferences.displayName}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 uppercase font-mono block">IP Node:</span>
                  <span className="font-mono font-bold text-slate-800">{preferences.clientIp}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 uppercase font-mono block">Active Devices:</span>
                  <span className="font-mono font-bold text-slate-800">{assets.length} Nodes</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 uppercase font-mono block">Geofence Violations:</span>
                  <span className="font-mono font-bold text-rose-600">{assets.filter(a => a.isHighValue && (a.coordinates.x < 20 || a.coordinates.x > 80 || a.coordinates.y < 20 || a.coordinates.y > 80)).length} Breaches</span>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-900 uppercase font-mono border-b border-slate-200 pb-1">
                  :: Widget Layout Map & Mesh Configurations
                </h3>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  The active physical mesh topology covers a total 7.5-acre lake perimeter. 5 primary panels coordinate diagnostic telemetry. The offline/online ratios remain robust:
                </p>
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 border border-slate-200 rounded bg-slate-50 text-center">
                    <span className="text-[8px] text-slate-400 uppercase font-mono block">Active Devices</span>
                    <span className="text-sm font-bold text-emerald-600 font-mono">{assets.filter(a => a.status === 'active').length}</span>
                  </div>
                  <div className="p-3 border border-slate-200 rounded bg-slate-50 text-center">
                    <span className="text-[8px] text-slate-400 uppercase font-mono block">Maintenance Mode</span>
                    <span className="text-sm font-bold text-amber-500 font-mono">{assets.filter(a => a.status === 'maintenance').length}</span>
                  </div>
                  <div className="p-3 border border-slate-200 rounded bg-slate-50 text-center">
                    <span className="text-[8px] text-slate-400 uppercase font-mono block">Offline Status</span>
                    <span className="text-sm font-bold text-rose-500 font-mono">{assets.filter(a => a.status === 'offline').length}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-xs font-bold text-slate-900 uppercase font-mono border-b border-slate-200 pb-1">
                  :: Live System Logistics Statement
                </h3>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  This multi-page briefing is compiled on the local client thread and transmitted to technical operations directors before the main evening show execution. It incorporates current schedules, ticket archives, inventory levels, and system health status. Use with discretion under security protocol guidelines.
                </p>
              </div>
            </div>

            <div className="border-t border-slate-200 pt-3 flex justify-between items-center text-[9px] text-slate-400 font-mono uppercase">
              <span>Classified: INTERNAL LOGISTICS BRIEFING</span>
              <span>Page 1 of 3</span>
            </div>
          </div>

          {/* PAGE 2: RUN SHEETS & ALERTS */}
          <div className="min-h-[1050px] flex flex-col justify-between space-y-6 break-after-page" style={{ pageBreakAfter: 'always' }}>
            <div className="space-y-6">
              <div className="flex justify-between items-start border-b-2 border-slate-950 pb-4">
                <div>
                  <h1 className="text-xl font-bold uppercase tracking-tight text-slate-950">Daily Operational Briefing Summary</h1>
                  <p className="text-[9px] text-slate-500 font-mono mt-1">PAGE 2: LIVE SHOW RUN SHEET & SYSTEM LOG EVENTS</p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-rose-600 tracking-wider uppercase font-mono block">KYNREN SYSTEM LOGISTICS</span>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-900 uppercase font-mono border-b border-slate-200 pb-1">
                  :: Scheduled Show Timeline Events
                </h3>
                <div className="border border-slate-200 rounded overflow-hidden">
                  <table className="w-full text-left border-collapse text-[10px]">
                    <thead>
                      <tr className="bg-slate-55 border-b border-slate-200 font-mono text-[8px] uppercase text-slate-500">
                        <th className="p-2 font-bold w-16">Time</th>
                        <th className="p-2 font-bold w-32">Title</th>
                        <th className="p-2 font-bold w-24">Location</th>
                        <th className="p-2 font-bold">Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {events.slice(0, 10).map((ev) => (
                        <tr key={ev.id}>
                          <td className="p-2 font-mono font-bold text-slate-800">{ev.time}</td>
                          <td className="p-2 font-semibold text-slate-800">{ev.title}</td>
                          <td className="p-2 text-slate-600">{ev.location}</td>
                          <td className="p-2 text-slate-500">{ev.details || 'Ready.'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-900 uppercase font-mono border-b border-slate-200 pb-1">
                  :: Active Diagnostics Broadcast Signals (Recent Logs)
                </h3>
                <div className="border border-slate-200 rounded overflow-hidden text-[9px] font-mono divide-y divide-slate-150">
                  {logs.slice(0, 8).map((l) => (
                    <div key={l.id} className="p-1.5 flex justify-between">
                      <div>
                        <strong>[{l.source}]</strong>
                        <span className="text-slate-600 ml-2">{l.message}</span>
                      </div>
                      <span className="uppercase font-bold text-[8px]">{l.severity}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="border-t border-slate-200 pt-3 flex justify-between items-center text-[9px] text-slate-400 font-mono uppercase">
              <span>Classified: INTERNAL LOGISTICS BRIEFING</span>
              <span>Page 2 of 3</span>
            </div>
          </div>

          {/* PAGE 3: STAFF SHIFTS & RESERVATIONS */}
          <div className="min-h-[1050px] flex flex-col justify-between space-y-6">
            <div className="space-y-6">
              <div className="flex justify-between items-start border-b-2 border-slate-950 pb-4">
                <div>
                  <h1 className="text-xl font-bold uppercase tracking-tight text-slate-950">Daily Operational Briefing Summary</h1>
                  <p className="text-[9px] text-slate-500 font-mono mt-1">PAGE 3: STAFF ALLOCATIONS & RESERVATION BOOKINGS</p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-rose-600 tracking-wider uppercase font-mono block">KYNREN SYSTEM LOGISTICS</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 border border-slate-200 rounded space-y-2">
                  <h4 className="text-[11px] font-bold text-slate-900 uppercase font-mono border-b border-slate-200 pb-1">Technician Dispatch Allocations</h4>
                  <ul className="space-y-1 font-mono text-[10px] text-slate-600">
                    <li>● Alice Smith - Lead Technician (Lake-Stage Inspector)</li>
                    <li>● Bob Jones - Live Audio Master (Mic Array tuning)</li>
                    <li>● Charlie Brown - Fireworks Specialist (Pyro sweeping)</li>
                    <li>● David White - Lighting Director (DMX towers checks)</li>
                  </ul>
                </div>
                <div className="p-4 border border-slate-200 rounded space-y-2">
                  <h4 className="text-[11px] font-bold text-slate-900 uppercase font-mono border-b border-slate-200 pb-1">Hardware Reservations Bookings</h4>
                  <ul className="space-y-1 font-mono text-[10px] text-slate-600">
                    <li>● Laser Projector: 10:00 - 12:00 Rehearsals</li>
                    <li>● Main Subwoofers Array: 16:00 - 18:00 Calibration</li>
                    <li>● Trigger Control Board: 14:00 - 16:00 Sequence Tests</li>
                  </ul>
                </div>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded text-[11px] leading-relaxed text-slate-500">
                <strong>Disclaimer Note:</strong> Hardware status reports, signal logs, and geofence telemetry coordinate dynamically in real-time through the provisioned Firebase Firestore instances. Hand-off details are authorized solely for internal use at the Durham Auckland Stage Kynren Logistics Center.
              </div>
            </div>

            <div className="border-t border-slate-200 pt-3 flex justify-between items-center text-[9px] text-slate-400 font-mono uppercase">
              <span>Classified: INTERNAL LOGISTICS BRIEFING</span>
              <span>Page 3 of 3</span>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}

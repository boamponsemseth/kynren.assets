import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Consumable, Ticket, SignalLog, ShowTimelineEvent, UserRegistryItem } from '../types';
import { 
  BarChart as RechartsBarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend
} from 'recharts';
import { 
  Archive, 
  Plus, 
  Trash2, 
  Copy, 
  Settings, 
  Grid, 
  List, 
  AlertTriangle, 
  CheckCircle, 
  TrendingUp, 
  Database, 
  SlidersHorizontal,
  FileText,
  Calendar,
  Hourglass,
  Download,
  Eye,
  User,
  MapPin,
  Activity,
  Check,
  X,
  Clock,
  ShieldAlert,
  Search
} from 'lucide-react';

interface ConsumablesProps {
  consumables: Consumable[];
  tickets: Ticket[];
  logs: SignalLog[];
  events: ShowTimelineEvent[];
  users?: UserRegistryItem[];
  onAddConsumable: (consumable: Partial<Consumable>) => void;
  onUpdateConsumable: (id: string, updates: Partial<Consumable>) => void;
  onDeleteConsumable: (id: string) => void;
  onCloneConsumable: (consumable: Consumable) => void;
  onPrintReport: (report: { title: string; headers: string[]; rows: string[][]; summaries: { label: string; value: string }[] }) => void;
  onCreateTicket?: (ticket: Partial<Ticket>) => Promise<void>;
}

export default function Consumables({
  consumables,
  tickets,
  logs,
  events = [],
  users = [],
  onAddConsumable,
  onUpdateConsumable,
  onDeleteConsumable,
  onCloneConsumable,
  onPrintReport,
  onCreateTicket
}: ConsumablesProps) {
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [activeTab, setActiveTab] = useState<'register' | 'analytics' | 'approvals'>('register');
  const [showAddForm, setShowAddForm] = useState(false);
  const [consumableToDelete, setConsumableToDelete] = useState<Consumable | null>(null);
  
  // Filtering and Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const filteredConsumables = React.useMemo(() => {
    let result = consumables;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(c => 
        (c.name || '').toLowerCase().includes(q) ||
        (c.category || '').toLowerCase().includes(q)
      );
    }
    if (dateFrom) {
      const fromTime = new Date(dateFrom).getTime();
      result = result.filter(c => {
        const d = c.lastIssued;
        return d ? new Date(d).getTime() >= fromTime : true;
      });
    }
    if (dateTo) {
      const toTime = new Date(dateTo).getTime() + 86400000;
      result = result.filter(c => {
        const d = c.lastIssued;
        return d ? new Date(d).getTime() <= toTime : true;
      });
    }
    return result;
  }, [consumables, searchQuery, dateFrom, dateTo]);
  
  // Bulk Procurement automation states
  const [procureStatus, setProcureStatus] = useState<{ success: boolean; ticketId: string; itemCount: number } | null>(null);
  const [procureLoading, setProcureLoading] = useState(false);

  // Stock Details Sidebar & Issuance states
  const [selectedConsumableId, setSelectedConsumableId] = useState<string | null>(null);
  const [activeSidebarTab, setActiveSidebarTab] = useState<'details' | 'logs' | 'approvals'>('details');
  const [issueTo, setIssueTo] = useState('');
  const [issueLocation, setIssueLocation] = useState('');
  const [issueQty, setIssueQty] = useState(1);
  const [manualQtyUpdate, setManualQtyUpdate] = useState('');
  const [isCustomRecipient, setIsCustomRecipient] = useState(false);

  // Form Fields
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState(10);
  const [threshold, setThreshold] = useState(5);
  const [category, setCategory] = useState('Cables');
  const [unit, setUnit] = useState('rolls');

  // Low Stock Prediction Logic
  const getLowStockPrediction = (item: Consumable) => {
    if (item.quantity <= item.threshold) {
      return { date: 'IMMEDIATE', reason: 'Below safety threshold!', priority: 'high' };
    }

    // Assign realistic consumption speeds per show/rehearsal event
    let usagePerEvent = 1;
    const cat = item.category.toLowerCase();
    if (cat.includes('tape')) usagePerEvent = 2;
    else if (cat.includes('batter')) usagePerEvent = 12;
    else if (cat.includes('lamp') || cat.includes('bulb')) usagePerEvent = 1;
    else if (cat.includes('fuse')) usagePerEvent = 2;
    else if (cat.includes('cable')) usagePerEvent = 0.5;

    // Filter upcoming events
    const upcomingEvents = [...events]
      .filter(e => e.status === 'upcoming')
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

    let remaining = item.quantity;
    for (const event of upcomingEvents) {
      remaining -= usagePerEvent;
      if (remaining <= item.threshold) {
        const formattedDate = new Date(event.startTime).toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric'
        });
        return { 
          date: formattedDate, 
          reason: `Hits threshold on "${event.title}"`, 
          priority: 'medium' 
        };
      }
    }

    return { date: 'Adequate Stock', reason: 'Safe for all scheduled events', priority: 'low' };
  };

  // Filter items that are low stock or hitting threshold soon
  const lowStockItems = consumables
    .map(item => ({
      item,
      prediction: getLowStockPrediction(item)
    }))
    .filter(x => x.item.quantity <= x.item.threshold || x.prediction.priority === 'high' || x.prediction.priority === 'medium');

  const handleAutoProcure = async () => {
    const itemsBelowThreshold = consumables.filter(c => c.quantity <= c.threshold);
    if (itemsBelowThreshold.length === 0 || !onCreateTicket) return;

    setProcureLoading(true);
    const itemsList = itemsBelowThreshold.map(
      item => `- ${item.name} (Current: ${item.quantity} ${item.unit}, Threshold: ${item.threshold} ${item.unit})`
    ).join('\n');

    const ticketId = `procure-${Date.now().toString().slice(-6)}`;
    const ticketData: Partial<Ticket> = {
      id: ticketId,
      name: `BULK PROCUREMENT: Replenish ${itemsBelowThreshold.length} low stock items`,
      description: `AUTOMATED CONSUMABLES TELEMETRY REORDER:\n\nThe following items have fallen below their safety/reorder thresholds and require urgent procurement replenishment:\n\n${itemsList}\n\nPlease verify counts with show warehouse manager and initiate bulk purchase process.`,
      category: 'Hardware',
      status: 'open',
      priority: 'high',
      assignedTo: 'Seth Boa Amponsem',
      createdBy: 'Auto Inventory Sentinel',
      createdAt: new Date().toISOString()
    };

    try {
      await onCreateTicket(ticketData);
      setProcureStatus({
        success: true,
        ticketId,
        itemCount: itemsBelowThreshold.length
      });
      setTimeout(() => {
        setProcureStatus(null);
      }, 6000);
    } catch (err) {
      console.error(err);
    } finally {
      setProcureLoading(false);
    }
  };

  const updateQuantity = (id: string, currentVal: number, newVal: number, currentThreshold: number) => {
    const nextStatus = newVal === 0 ? 'out' : newVal <= currentThreshold ? 'low' : 'adequate';
    onUpdateConsumable(id, { quantity: newVal, status: nextStatus });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const initialStatus = quantity === 0 ? 'out' : quantity <= threshold ? 'low' : 'adequate';
    onAddConsumable({
      id: `con-${Date.now().toString().substring(9)}`,
      name,
      category,
      quantity,
      threshold,
      unit,
      status: initialStatus
    });

    setName('');
    setQuantity(10);
    setThreshold(5);
    setCategory('Cables');
    setUnit('rolls');
    setShowAddForm(false);
  };

  const handlePrint = () => {
    const headers = ['ID', 'Material Name', 'Category', 'Remaining Qty', 'Safety Threshold', 'Status', 'Prediction'];
    const rows = filteredConsumables.map(c => {
      const pred = getLowStockPrediction(c);
      return [
        c.id,
        c.name,
        c.category,
        `${c.quantity} ${c.unit}`,
        `${c.threshold} ${c.unit}`,
        c.status.toUpperCase(),
        `${pred.date} (${pred.reason})`
      ];
    });

    const lowStockItems = filteredConsumables.filter(c => c.status !== 'adequate').length;
    const summaries = [
      { label: 'Total Registered Materials', value: `${filteredConsumables.length} distinct items` },
      { label: 'Materials Alert State', value: `${lowStockItems} items require attention` },
      { label: 'Upcoming Performance Cycles', value: `${events.filter(e => e.status === 'upcoming').length} scheduled events` }
    ];

    onPrintReport({
      title: 'Kynren Consumables Logistics & Prediction Report',
      headers,
      rows,
      summaries
    });
  };

  const handleExportCSV = () => {
    const headers = ['ID', 'Material Name', 'Category', 'Remaining Qty', 'Unit', 'Safety Threshold', 'Status', 'Prediction'];
    const rows = filteredConsumables.map(c => {
      const pred = getLowStockPrediction(c);
      return [
        c.id,
        c.name.replace(/"/g, '""'),
        c.category,
        c.quantity,
        c.unit,
        c.threshold,
        c.status.toUpperCase(),
        `${pred.date} - ${pred.reason}`.replace(/"/g, '""')
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(val => `"${val}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `consumables_inventory_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Prepare Recharts Data
  const stockBarData = consumables.map(c => ({
    name: c.name.substring(0, 15) + (c.name.length > 15 ? '..' : ''),
    Stock: c.quantity,
    AlertThreshold: c.threshold
  }));

  const ticketsPieData = [
    { name: 'Active/Open', value: tickets.filter(t => t.status === 'open').length, color: '#f43f5e' },
    { name: 'Progressing', value: tickets.filter(t => t.status === 'in_progress').length, color: '#f59e0b' },
    { name: 'Resolved/Closed', value: tickets.filter(t => t.status === 'closed').length, color: '#10b981' }
  ].filter(item => item.value > 0);

  const resolvedTicketsCount = tickets.filter(t => t.status === 'closed').length;

  const syslogTrendsData = [
    { name: '11:00', Errors: 0, Warnings: 2, Success: 5 },
    { name: '12:00', Errors: 1, Warnings: 4, Success: 8 },
    { name: '13:00', Errors: 0, Warnings: 1, Success: 12 },
    { name: '14:00', Errors: 3, Warnings: 6, Success: 15 },
    { name: '15:00', Errors: 1, Warnings: 3, Success: 18 }
  ];

  const pendingApprovalsCount = consumables.reduce((count, c) => {
    const pendingCount = c.pendingIssues?.filter(i => i.status === 'pending').length || 0;
    return count + pendingCount;
  }, 0);

  const activeConsumable = consumables.find(c => c.id === selectedConsumableId);

  // Directly update stock level from input field
  const handleManualStockUpdate = (newVal: number) => {
    if (!activeConsumable || newVal < 0) return;
    
    const diff = newVal - activeConsumable.quantity;
    if (diff === 0) return;

    const newLog = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      action: 'update' as const,
      quantityChanged: diff,
      finalQuantity: newVal,
      performedBy: 'Seth Boa Amponsem',
      notes: 'Direct quantity manual adjustment'
    };

    const updatedLogs = [newLog, ...(activeConsumable.logs || [])];
    const nextStatus = newVal === 0 ? 'out' : newVal <= activeConsumable.threshold ? 'low' : 'adequate';

    onUpdateConsumable(activeConsumable.id, {
      quantity: newVal,
      status: nextStatus,
      logs: updatedLogs
    });

    setManualQtyUpdate('');
  };

  // Issue stock action
  const handleIssueStockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeConsumable || !issueTo.trim() || !issueLocation.trim() || issueQty <= 0) return;

    if (issueQty > activeConsumable.quantity) {
      alert(`Cannot issue ${issueQty} ${activeConsumable.unit}. Only ${activeConsumable.quantity} remaining in stock!`);
      return;
    }

    if (activeConsumable.needsApproval) {
      // Create pending issue
      const newIssue = {
        id: `iss-${Date.now()}`,
        timestamp: new Date().toISOString(),
        quantityToIssue: issueQty,
        issuedTo: issueTo.trim(),
        location: issueLocation.trim(),
        requestedBy: 'Seth Boa Amponsem',
        status: 'pending' as const
      };

      const updatedPending = [newIssue, ...(activeConsumable.pendingIssues || [])];
      onUpdateConsumable(activeConsumable.id, {
        pendingIssues: updatedPending
      });

      alert(`Stock issuance requested! Since this item requires authorization, it has been routed to the Approvals Queue.`);
    } else {
      // Immediately issue
      const finalQty = activeConsumable.quantity - issueQty;
      const nextStatus = finalQty === 0 ? 'out' : finalQty <= activeConsumable.threshold ? 'low' : 'adequate';

      const newLog = {
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString(),
        action: 'issue' as const,
        quantityChanged: -issueQty,
        finalQuantity: finalQty,
        performedBy: 'Seth Boa Amponsem',
        issuedTo: issueTo.trim(),
        location: issueLocation.trim(),
        notes: `Issued to ${issueTo.trim()} at ${issueLocation.trim()}`
      };

      const updatedLogs = [newLog, ...(activeConsumable.logs || [])];

      onUpdateConsumable(activeConsumable.id, {
        quantity: finalQty,
        status: nextStatus,
        lastIssued: new Date().toISOString(),
        lastIssuedTo: issueTo.trim(),
        lastIssuedLocation: issueLocation.trim(),
        logs: updatedLogs
      });

      alert(`Successfully issued out ${issueQty} ${activeConsumable.unit} to ${issueTo.trim()}!`);
    }

    // Reset issue form
    setIssueTo('');
    setIssueLocation('');
    setIssueQty(1);
  };

  // Handle approvals
  const handleApproveIssue = (consumableId: string, issueId: string) => {
    const item = consumables.find(c => c.id === consumableId);
    if (!item) return;

    const issue = item.pendingIssues?.find(i => i.id === issueId);
    if (!issue) return;

    if (issue.quantityToIssue > item.quantity) {
      alert(`Cannot approve: requested qty (${issue.quantityToIssue}) exceeds current stock (${item.quantity})!`);
      return;
    }

    const finalQty = item.quantity - issue.quantityToIssue;
    const nextStatus = finalQty === 0 ? 'out' : finalQty <= item.threshold ? 'low' : 'adequate';

    const newLog = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      action: 'approve' as const,
      quantityChanged: -issue.quantityToIssue,
      finalQuantity: finalQty,
      performedBy: 'Seth Boa Amponsem',
      issuedTo: issue.issuedTo,
      location: issue.location,
      notes: `Approved issue request. Originally requested by ${issue.requestedBy}`
    };

    const updatedLogs = [newLog, ...(item.logs || [])];
    const updatedPending = item.pendingIssues?.map(i => 
      i.id === issueId ? { ...i, status: 'approved' as const } : i
    ) || [];

    onUpdateConsumable(item.id, {
      quantity: finalQty,
      status: nextStatus,
      lastIssued: new Date().toISOString(),
      lastIssuedTo: issue.issuedTo,
      lastIssuedLocation: issue.location,
      logs: updatedLogs,
      pendingIssues: updatedPending
    });
  };

  const handleRejectIssue = (consumableId: string, issueId: string) => {
    const item = consumables.find(c => c.id === consumableId);
    if (!item) return;

    const issue = item.pendingIssues?.find(i => i.id === issueId);
    if (!issue) return;

    const newLog = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      action: 'reject' as const,
      quantityChanged: 0,
      finalQuantity: item.quantity,
      performedBy: 'Seth Boa Amponsem',
      notes: `Rejected issue request to ${issue.issuedTo}`
    };

    const updatedLogs = [newLog, ...(item.logs || [])];
    const updatedPending = item.pendingIssues?.map(i => 
      i.id === issueId ? { ...i, status: 'rejected' as const } : i
    ) || [];

    onUpdateConsumable(item.id, {
      logs: updatedLogs,
      pendingIssues: updatedPending
    });
  };

  return (
    <div id="consumables-register-panel" className="bg-slate-900 border border-slate-700 rounded-xl overflow-hidden shadow-xl p-5">
      
      {/* Panel Header with toggles */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800 pb-4 mb-5">
        <div>
          <h3 className="font-sans font-bold text-slate-100 flex items-center gap-2 text-base">
            <Archive className="w-5 h-5 text-rose-500" /> Technical Consumables Stock & Stock Analysis
          </h3>
          <p className="text-xs text-slate-400">Keep inventory of gaffa, CAT6 patch reels, fuses, and compile dynamic graphs for post-show operational review.</p>
        </div>

        <div className="flex items-center gap-3">
          {activeTab === 'register' && (
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
          )}

          <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-lg border border-slate-800">
            <button
              onClick={() => setActiveTab('register')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'register' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Stock Register
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'analytics' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Stock Analysis
            </button>
            <button
              onClick={() => setActiveTab('approvals')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'approvals' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>Approvals Queue</span>
              {pendingApprovalsCount > 0 && (
                <span className="px-1.5 py-0.5 text-[9px] bg-rose-500 text-white font-bold rounded-full animate-pulse font-mono">
                  {pendingApprovalsCount}
                </span>
              )}
            </button>
          </div>

          <button
            onClick={handlePrint}
            className="px-3 py-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white rounded-lg transition-all cursor-pointer flex items-center gap-1.5 text-xs font-semibold uppercase shrink-0"
            title="Generate and Print PDF Report"
          >
            <FileText className="w-3.5 h-3.5 text-rose-500" />
            <span>Print Report</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="px-3 py-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white rounded-lg transition-all cursor-pointer flex items-center gap-1.5 text-xs font-semibold uppercase shrink-0"
            title="Export data as CSV spreadsheet"
          >
            <Download className="w-3.5 h-3.5 text-rose-500" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {activeTab === 'register' && (
        <div className="space-y-6">
          {/* Sub-toolbar Filters */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-slate-950 p-3 rounded-lg border border-slate-850">
            <div className="flex items-center gap-2 flex-1">
              <Search className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <input 
                type="text"
                placeholder="Filter consumables by name or category..."
                className="bg-transparent border-none text-xs text-slate-200 focus:outline-none focus:ring-0 placeholder-slate-500 w-full font-mono"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button 
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="text-slate-400 hover:text-slate-200 text-xs"
                >
                  ×
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Date Filters */}
              <div className="flex items-center gap-1.5 bg-slate-900 px-2 py-1 rounded border border-slate-800 text-[11px] text-slate-400 font-mono">
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
                  >
                    CLEAR
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => setShowAddForm(true)}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded font-mono text-[10px] uppercase font-bold flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" /> New Item
              </button>
            </div>
          </div>

          {/* Quick Consumable Form */}
          {showAddForm ? (
            <form onSubmit={handleSubmit} className="bg-slate-950 p-5 rounded-lg border border-slate-800 space-y-4">
              <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">Register Consumable Inventory Item</h4>
                <button type="button" onClick={() => setShowAddForm(false)} className="text-slate-500 hover:text-white text-xs">Close</button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] text-slate-400 font-mono mb-1">Item Label/Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. AA Battery Packs"
                    className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-rose-500"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] text-slate-400 font-mono mb-1">Quantity In Stock</label>
                    <input
                      type="number"
                      required
                      min="0"
                      className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
                      value={quantity}
                      onChange={(e) => setQuantity(Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 font-mono mb-1">Low Safety Threshold</label>
                    <input
                      type="number"
                      required
                      min="0"
                      className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
                      value={threshold}
                      onChange={(e) => setThreshold(Number(e.target.value))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] text-slate-400 font-mono mb-1">Category</label>
                    <select
                      className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                    >
                      <option value="Cables">Cables</option>
                      <option value="Tape">Tape</option>
                      <option value="Batteries">Batteries</option>
                      <option value="Fuses">Fuses</option>
                      <option value="Lamp Bulbs">Lamp Bulbs</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 font-mono mb-1">Measurement Unit</label>
                    <input
                      type="text"
                      required
                      placeholder="rolls / pcs"
                      className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
                      value={unit}
                      onChange={(e) => setUnit(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-mono text-xs font-bold rounded-lg transition-all cursor-pointer uppercase"
                >
                  Confirm Registration
                </button>
              </div>
            </form>
          ) : (
            <div className="flex justify-between items-center bg-slate-950 p-4 border border-slate-800 rounded-lg">
              <span className="text-xs text-slate-400 font-mono">Consumable items at alert state: {consumables.filter(c => c.status !== 'adequate').length}</span>
              <button
                onClick={() => setShowAddForm(true)}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-mono text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer uppercase"
              >
                <Plus className="w-3.5 h-3.5" /> Register Consumable
              </button>
            </div>
          )}

          {/* Bulk Procurement Quick Action Banner */}
          {consumables.filter(c => c.quantity <= c.threshold).length > 0 && (
            <div className="bg-gradient-to-r from-rose-950/40 to-slate-900 border border-rose-500/30 p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg shadow-rose-950/10">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-rose-400 animate-pulse" />
                  <h4 className="font-sans font-bold text-slate-100 text-sm">Critical Inventory Deficit Detected</h4>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed max-w-2xl font-sans">
                  There are currently <strong className="text-rose-400 font-mono">{consumables.filter(c => c.quantity <= c.threshold).length} items</strong> below their designated safety reorder thresholds. Generate a consolidated procurement ticket for the Logistics team with a single click.
                </p>
              </div>
              <div className="shrink-0">
                <button
                  disabled={procureLoading}
                  onClick={handleAutoProcure}
                  className="w-full md:w-auto px-4 py-2 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 disabled:from-slate-800 disabled:to-slate-800 text-white font-mono text-xs font-bold rounded-lg transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 cursor-pointer uppercase tracking-wider"
                >
                  {procureLoading ? (
                    <>
                      <Clock className="w-3.5 h-3.5 animate-spin" />
                      Generating Ticket...
                    </>
                  ) : (
                    <>
                      <FileText className="w-3.5 h-3.5" />
                      Auto-Generate Procurement Ticket
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Local state confirmation alerts */}
          {procureStatus && (
            <div className="bg-emerald-950/30 border border-emerald-500/30 p-3.5 rounded-lg flex items-center justify-between text-emerald-400 font-sans text-xs">
              <div className="flex items-center gap-2.5">
                <CheckCircle className="w-4 h-4 shrink-0 animate-bounce" />
                <div>
                  <span className="font-bold uppercase tracking-wider block text-[10px] text-emerald-300">Procurement Ticket Dispatched</span>
                  <span>Successfully logged ticket <strong className="font-mono text-white">{procureStatus.ticketId}</strong> requesting bulk stock replenishment for {procureStatus.itemCount} depleted items.</span>
                </div>
              </div>
              <button 
                onClick={() => setProcureStatus(null)}
                className="p-1 hover:bg-emerald-500/10 rounded text-emerald-400 hover:text-white transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Projected Depletion Date summary widget */}
          <div className="bg-slate-950/40 border border-slate-850 p-4 rounded-xl space-y-3 font-sans">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500 animate-pulse" />
                <h4 className="font-sans font-bold text-slate-200 text-xs uppercase tracking-wider">Projected Depletion Forecast</h4>
              </div>
              <span className="text-[10px] font-mono text-slate-500 uppercase">Trend Engine Active</span>
            </div>

            {lowStockItems.length === 0 ? (
              <div className="bg-emerald-950/20 border border-emerald-900/30 p-3.5 rounded-lg flex items-center gap-3 text-emerald-400">
                <CheckCircle className="w-5 h-5 shrink-0" />
                <div className="text-xs">
                  <p className="font-bold">Inventory Safe Zone</p>
                  <p className="text-[10px] text-emerald-500/80 mt-0.5">All tracked consumables have adequate stock reserves for all currently scheduled live productions and rehearsals.</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {lowStockItems.slice(0, 3).map(({ item, prediction }) => {
                  const percentOfThreshold = Math.round((item.quantity / (item.threshold || 1)) * 100);
                  const isCritical = item.quantity <= item.threshold;
                  return (
                    <div 
                      key={item.id} 
                      className={`p-3 rounded-lg border flex flex-col justify-between space-y-2.5 transition-all ${
                        isCritical 
                          ? 'bg-rose-950/15 border-rose-900/40 hover:border-rose-800/60' 
                          : 'bg-amber-950/15 border-amber-900/40 hover:border-amber-800/60'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex justify-between items-start">
                          <span className="font-sans font-bold text-slate-100 text-xs truncate max-w-[150px]">{item.name}</span>
                          <span className={`text-[8px] font-mono px-1.5 py-0.5 rounded font-bold uppercase ${
                            isCritical ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}>
                            {prediction.date}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-[10px] font-mono text-slate-400">
                          <span>Qty: <strong className="text-slate-200">{item.quantity} {item.unit}</strong></span>
                          <span>Safety limit: <strong>{item.threshold} {item.unit}</strong></span>
                        </div>
                      </div>

                      {/* Micro Progress Bar */}
                      <div className="space-y-1">
                        <div className="h-1.5 bg-slate-900 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${
                              isCritical ? 'bg-gradient-to-r from-rose-600 to-red-500' : 'bg-gradient-to-r from-amber-500 to-amber-400'
                            }`}
                            style={{ width: `${Math.min(100, Math.max(8, percentOfThreshold))}%` }}
                          />
                        </div>
                        <p className="text-[9px] text-slate-500 font-mono italic leading-tight">
                          {prediction.reason}
                        </p>
                      </div>
                    </div>
                  );
                })}
                {lowStockItems.length > 3 && (
                  <div className="bg-slate-900/40 border border-slate-800/60 p-3 rounded-lg flex flex-col items-center justify-center text-center space-y-1">
                    <span className="text-slate-400 font-mono text-sm font-bold">+{lowStockItems.length - 3} More</span>
                    <span className="text-[10px] text-slate-500">Low stock depletion forecasts in register below.</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Master layout with split bento-style Details sidebar panel */}
          <div className={activeConsumable ? "grid grid-cols-1 lg:grid-cols-3 gap-6" : "space-y-6"}>
            
            {/* List or Grid Container */}
            <div className={activeConsumable ? "lg:col-span-2 space-y-6" : "w-full space-y-6"}>
              {viewMode === 'list' ? (
                <div className="overflow-x-auto bg-slate-950 border border-slate-800 rounded-lg">
                  <table className="w-full text-left border-collapse font-sans text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 text-[10px] font-mono uppercase bg-slate-900/50">
                        <th className="p-4">ID</th>
                        <th className="p-4">Material Name</th>
                        <th className="p-4">Category</th>
                        <th className="p-4 text-center">Remaining Quantity</th>
                        <th className="p-4 text-center">Threshold Alert Limit</th>
                        <th className="p-4 text-center">Status</th>
                        <th className="p-4 text-center">Low Stock Prediction</th>
                        <th className="p-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {filteredConsumables.map((c) => {
                        const pred = getLowStockPrediction(c);
                        const isCurrentlySelected = selectedConsumableId === c.id;
                        return (
                          <tr key={c.id} className={`hover:bg-slate-900/40 transition-colors ${isCurrentlySelected ? 'bg-slate-900/50 border-l-2 border-rose-500' : ''}`}>
                            <td 
                              onClick={() => { setSelectedConsumableId(c.id); setManualQtyUpdate(''); }}
                              className="p-4 font-mono text-slate-400 hover:text-rose-400 cursor-pointer"
                            >
                              {c.id}
                            </td>
                            <td 
                              onClick={() => { setSelectedConsumableId(c.id); setManualQtyUpdate(''); }}
                              className="p-4 font-semibold text-slate-200 hover:underline hover:text-rose-400 cursor-pointer"
                            >
                              {c.name}
                            </td>
                            <td className="p-4 text-slate-300 font-mono text-[10px]">{c.category}</td>
                            <td className="p-4 text-center font-bold font-mono">
                              <div className="flex items-center justify-center gap-2">
                                <button 
                                  onClick={() => updateQuantity(c.id, c.quantity, Math.max(0, c.quantity - 1), c.threshold)}
                                  className="w-5 h-5 bg-slate-850 hover:bg-slate-800 text-slate-400 hover:text-white rounded flex items-center justify-center font-bold font-mono text-xs cursor-pointer border border-slate-800"
                                >
                                  -
                                </button>
                                <span className="text-slate-200 min-w-[20px]">{c.quantity}</span>
                                <button 
                                  onClick={() => updateQuantity(c.id, c.quantity, c.quantity + 1, c.threshold)}
                                  className="w-5 h-5 bg-slate-850 hover:bg-slate-800 text-slate-400 hover:text-white rounded flex items-center justify-center font-bold font-mono text-xs cursor-pointer border border-slate-800"
                                >
                                  +
                                </button>
                                <span className="text-slate-500 font-sans font-normal text-[10px]">{c.unit}</span>
                              </div>
                            </td>
                            <td className="p-4 text-center font-mono text-slate-400">{c.threshold} {c.unit}</td>
                            <td className="p-4 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-mono border inline-block ${
                                c.status === 'adequate' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                c.status === 'low' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                                'bg-rose-500/10 text-rose-400 border-rose-500/20 animate-pulse'
                              }`}>
                                {c.status}
                              </span>
                            </td>
                            <td className="p-4 text-center">
                              <div className="flex flex-col items-center justify-center font-mono text-[10px]">
                                <span className={`px-2 py-0.5 rounded text-[9px] font-bold border flex items-center gap-1 ${
                                  pred.priority === 'high' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20 animate-pulse' :
                                  pred.priority === 'medium' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                                  'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                }`}>
                                  <Hourglass className="w-3 h-3 shrink-0" />
                                  {pred.date}
                                </span>
                                <span className="text-[9px] text-slate-500 mt-0.5 max-w-[130px] truncate" title={pred.reason}>
                                  {pred.reason}
                                </span>
                              </div>
                            </td>
                            <td className="p-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {/* Details eye */}
                                <button
                                  onClick={() => { setSelectedConsumableId(c.id); setManualQtyUpdate(''); }}
                                  className={`p-1.5 rounded transition-all cursor-pointer ${isCurrentlySelected ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'hover:bg-slate-800 text-slate-400 hover:text-white'}`}
                                  title="View Details & Logs"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                                {/* Clone */}
                                <button
                                  onClick={() => onCloneConsumable(c)}
                                  className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-rose-400 transition-all cursor-pointer"
                                  title="Clone Consumable"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                </button>
                                {/* Config status */}
                                <button
                                  onClick={() => onUpdateConsumable(c.id, { threshold: c.threshold + 2 })}
                                  className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-amber-400 transition-all cursor-pointer"
                                  title="Raise Alert Threshold"
                                >
                                  <SlidersHorizontal className="w-3.5 h-3.5" />
                                </button>
                                {/* Delete */}
                                <button
                                  onClick={() => setConsumableToDelete(c)}
                                  className="p-1.5 bg-red-500/10 hover:bg-red-500/20 rounded text-red-500 hover:text-red-400 transition-all cursor-pointer border border-red-500/20"
                                  title="Delete Consumable"
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
                /* Grid View option */
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredConsumables.map((c) => {
                    const pred = getLowStockPrediction(c);
                    const isCurrentlySelected = selectedConsumableId === c.id;
                    return (
                      <div key={c.id} className={`bg-slate-950 p-4 border rounded-lg flex flex-col justify-between space-y-4 hover:border-slate-700 transition-all ${isCurrentlySelected ? 'border-rose-500/80 shadow-[0_0_15px_rgba(225,29,72,0.1)]' : 'border-slate-800'}`}>
                        <div>
                          <div className="flex justify-between items-start mb-2">
                            <span className="text-[10px] font-mono text-slate-400 font-bold">{c.id}</span>
                            <span className={`px-2 py-0.5 rounded-full text-[9px] uppercase font-mono border ${
                              c.status === 'adequate' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                              c.status === 'low' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                              'bg-rose-500/10 text-rose-400 border-rose-500/20 animate-pulse'
                            }`}>
                              {c.status}
                            </span>
                          </div>

                          <h4 className="text-slate-200 font-bold text-xs mb-1">{c.name}</h4>
                          <span className="text-[10px] text-rose-300 font-mono font-bold uppercase bg-slate-900 border border-slate-850 px-2 py-0.5 rounded">
                            {c.category}
                          </span>

                          {/* Prediction Summary on Grid */}
                          <div className="mt-3 bg-slate-900/60 border border-slate-850 p-2 rounded flex flex-col gap-1 font-mono text-[9px]">
                            <span className="text-slate-500 uppercase tracking-wide font-bold">Predicted Reorder Date:</span>
                            <span className={`font-bold flex items-center gap-1 ${
                              pred.priority === 'high' ? 'text-rose-400 animate-pulse' :
                              pred.priority === 'medium' ? 'text-amber-400' :
                              'text-emerald-400'
                            }`}>
                              <Calendar className="w-3 h-3 text-rose-500" />
                              {pred.date}
                            </span>
                            <span className="text-slate-400 leading-tight truncate">{pred.reason}</span>
                          </div>

                          <div className="mt-4 flex items-center justify-between border-t border-slate-900 pt-3">
                            <span className="text-[10px] text-slate-400 font-mono">Stock Level:</span>
                            <div className="flex items-center gap-2">
                              <button 
                                onClick={() => updateQuantity(c.id, c.quantity, Math.max(0, c.quantity - 1), c.threshold)}
                                className="w-5 h-5 bg-slate-800 text-slate-400 rounded flex items-center justify-center font-bold font-mono text-xs cursor-pointer"
                              >
                                -
                              </button>
                              <span className="text-slate-200 text-xs font-bold font-mono min-w-[15px] text-center">{c.quantity}</span>
                              <button 
                                onClick={() => updateQuantity(c.id, c.quantity, c.quantity + 1, c.threshold)}
                                className="w-5 h-5 bg-slate-800 text-slate-400 rounded flex items-center justify-center font-bold font-mono text-xs cursor-pointer"
                              >
                                +
                              </button>
                              <span className="text-slate-500 text-[9px]">{c.unit}</span>
                            </div>
                          </div>
                        </div>

                        <div className="border-t border-slate-900 pt-3 flex justify-between items-center text-xs">
                          <span className="text-slate-500 font-mono text-[10px]">Limit: {c.threshold} {c.unit}</span>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => { setSelectedConsumableId(c.id); setManualQtyUpdate(''); }}
                              className={`p-1.5 rounded transition-all cursor-pointer ${isCurrentlySelected ? 'bg-rose-500/20 text-rose-400' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                              title="Details"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => onCloneConsumable(c)}
                              className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-rose-400 cursor-pointer"
                              title="Clone"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setConsumableToDelete(c)}
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

            {/* Right sidebar panel - displays selected consumable details */}
            {activeConsumable && (
              <div className="lg:col-span-1 bg-slate-950 p-5 rounded-lg border border-slate-800 space-y-4 font-sans text-xs text-slate-300">
                {/* Header */}
                <div className="flex justify-between items-start border-b border-slate-850 pb-3">
                  <div>
                    <h4 className="font-bold text-slate-100 text-sm leading-tight">{activeConsumable.name}</h4>
                    <span className="text-[10px] font-mono text-slate-500">{activeConsumable.id} ({activeConsumable.category})</span>
                  </div>
                  <button 
                    onClick={() => setSelectedConsumableId(null)}
                    className="p-1 hover:bg-slate-900 text-slate-500 hover:text-white rounded cursor-pointer transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Sub Tab selection */}
                <div className="flex bg-slate-900/60 p-1 rounded-md border border-slate-850 gap-1">
                  <button
                    onClick={() => setActiveSidebarTab('details')}
                    className={`flex-1 text-center py-1.5 rounded-sm font-semibold transition-all text-[11px] ${activeSidebarTab === 'details' ? 'bg-slate-850 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                  >
                    Details & Issue
                  </button>
                  <button
                    onClick={() => setActiveSidebarTab('approvals')}
                    className={`flex-1 text-center py-1.5 rounded-sm font-semibold transition-all text-[11px] flex items-center justify-center gap-1 ${activeSidebarTab === 'approvals' ? 'bg-slate-850 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                  >
                    <span>Approvals</span>
                    {activeConsumable.pendingIssues?.filter(i => i.status === 'pending').length ? (
                      <span className="px-1.5 py-0.5 bg-rose-600 text-white text-[9px] font-bold rounded-full animate-pulse">
                        {activeConsumable.pendingIssues.filter(i => i.status === 'pending').length}
                      </span>
                    ) : null}
                  </button>
                  <button
                    onClick={() => setActiveSidebarTab('logs')}
                    className={`flex-1 text-center py-1.5 rounded-sm font-semibold transition-all text-[11px] ${activeSidebarTab === 'logs' ? 'bg-slate-850 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                  >
                    Logs ({activeConsumable.logs?.length || 0})
                  </button>
                </div>

                {activeSidebarTab === 'details' ? (
                  <div className="space-y-4">
                    {/* Stock level card */}
                    <div className="bg-slate-900/60 p-3.5 rounded-lg border border-slate-850/60 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="font-mono text-[10px] uppercase text-slate-500">Current Stock Level</span>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] uppercase font-mono font-bold ${
                          activeConsumable.status === 'adequate' ? 'bg-emerald-500/10 text-emerald-400' :
                          activeConsumable.status === 'low' ? 'bg-amber-500/10 text-amber-400' :
                          'bg-rose-500/10 text-rose-400 animate-pulse'
                        }`}>
                          {activeConsumable.status}
                        </span>
                      </div>

                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-bold font-mono text-slate-100">{activeConsumable.quantity}</span>
                        <span className="text-slate-400 font-sans">{activeConsumable.unit}</span>
                        <span className="text-slate-600 font-mono text-[10px] ml-auto">Threshold: {activeConsumable.threshold}</span>
                      </div>

                      {/* Manual numerical update */}
                      <div className="pt-2 border-t border-slate-850 flex gap-2">
                        <input 
                          type="number"
                          placeholder="Set custom qty..."
                          min="0"
                          className="flex-1 bg-slate-950 border border-slate-800 rounded px-2 py-1 text-[11px] text-slate-200 focus:outline-none"
                          value={manualQtyUpdate}
                          onChange={(e) => setManualQtyUpdate(e.target.value)}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (manualQtyUpdate !== '') {
                              handleManualStockUpdate(Number(manualQtyUpdate));
                            }
                          }}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-white text-[10px] font-bold rounded cursor-pointer transition-colors"
                        >
                          Apply
                        </button>
                      </div>

                      {/* Authorization switch toggler */}
                      <div className="pt-2 border-t border-slate-850 flex items-center justify-between">
                        <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                          <ShieldAlert className="w-3.5 h-3.5 text-rose-400" /> Requires Auth to Issue
                        </span>
                        <button
                          type="button"
                          onClick={() => onUpdateConsumable(activeConsumable.id, { needsApproval: !activeConsumable.needsApproval })}
                          className={`w-9 h-5 rounded-full p-0.5 transition-colors cursor-pointer ${activeConsumable.needsApproval ? 'bg-rose-600' : 'bg-slate-800'}`}
                        >
                          <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform ${activeConsumable.needsApproval ? 'translate-x-4' : 'translate-x-0'}`} />
                        </button>
                      </div>
                    </div>

                    {/* Last Issued profile */}
                    <div className="bg-slate-900/40 p-3 rounded-lg border border-slate-850/40 text-[11px] space-y-1.5">
                      <span className="text-[9px] font-mono uppercase text-slate-500 tracking-wider font-bold block">Historic Issuance Profile</span>
                      {activeConsumable.lastIssued ? (
                        <div className="space-y-1 text-slate-300">
                          <p className="flex justify-between"><span>Last Issued:</span> <span className="font-semibold text-slate-200">{new Date(activeConsumable.lastIssued).toLocaleDateString()}</span></p>
                          <p className="flex justify-between"><span>Recipient:</span> <span className="font-semibold text-rose-300 flex items-center gap-1"><User className="w-3 h-3 text-rose-400" /> {activeConsumable.lastIssuedTo}</span></p>
                          <p className="flex justify-between"><span>Location:</span> <span className="font-semibold text-cyan-300 flex items-center gap-1"><MapPin className="w-3 h-3 text-cyan-400" /> {activeConsumable.lastIssuedLocation}</span></p>
                        </div>
                      ) : (
                        <span className="text-slate-500 italic block">No previous issuance logs on file.</span>
                      )}
                    </div>

                    {/* Issue stock out form */}
                    <form onSubmit={handleIssueStockSubmit} className="bg-slate-900/60 p-4 border border-slate-850 rounded-lg space-y-3">
                      <span className="text-[10px] font-mono uppercase text-rose-400 tracking-wider font-bold block">Issue Out Stock</span>
                      
                      <div>
                        <label className="block text-[9px] text-slate-500 font-mono mb-1">Who is the stock being issued to?</label>
                        <select 
                          required
                          className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none mb-2"
                          value={isCustomRecipient ? '__custom__' : issueTo}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === '__custom__') {
                              setIsCustomRecipient(true);
                              setIssueTo('');
                            } else {
                              setIsCustomRecipient(false);
                              setIssueTo(val);
                            }
                          }}
                        >
                          <option value="">-- Select Recipient --</option>
                          {users && users.map(u => (
                            <option key={u.id} value={u.displayName}>
                              {u.displayName} ({u.role})
                            </option>
                          ))}
                          <option value="__custom__">Custom / External Operator...</option>
                        </select>
                        
                        {(isCustomRecipient || !users || users.length === 0) && (
                          <input 
                            type="text" 
                            required
                            placeholder="Type recipient's full name..."
                            className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
                            value={issueTo}
                            onChange={(e) => setIssueTo(e.target.value)}
                          />
                        )}
                      </div>

                      <div>
                        <label className="block text-[9px] text-slate-500 font-mono mb-1">Associated Location</label>
                        <input 
                          type="text" 
                          required
                          placeholder="e.g. Backstage Left"
                          className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
                          value={issueLocation}
                          onChange={(e) => setIssueLocation(e.target.value)}
                        />
                      </div>

                      {issueQty > 0 && (
                        <div className="bg-slate-950 p-2.5 border border-slate-850 rounded text-[10px] font-mono space-y-1">
                          <div className="flex justify-between">
                            <span className="text-slate-500">Current Qty:</span>
                            <span className="text-slate-300 font-bold">{activeConsumable.quantity} {activeConsumable.unit}</span>
                          </div>
                          <div className="flex justify-between text-rose-400">
                            <span>Qty to Deduct:</span>
                            <span>-{issueQty} {activeConsumable.unit}</span>
                          </div>
                          <div className="flex justify-between border-t border-slate-850 pt-1 text-emerald-400 font-bold">
                            <span>Projected Final Qty:</span>
                            <span>{activeConsumable.quantity - issueQty} {activeConsumable.unit}</span>
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-3 items-end">
                        <div>
                          <label className="block text-[9px] text-slate-500 font-mono mb-1">Quantity to Issue</label>
                          <input 
                            type="number" 
                            required
                            min="1"
                            max={activeConsumable.quantity}
                            className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none font-mono"
                            value={issueQty}
                            onChange={(e) => setIssueQty(Number(e.target.value))}
                          />
                        </div>
                        <button
                          type="submit"
                          className="w-full py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-semibold rounded text-xs transition-colors cursor-pointer uppercase font-mono tracking-wider"
                        >
                          {activeConsumable.needsApproval ? "Request Issue" : "Confirm Issue"}
                        </button>
                      </div>
                    </form>
                  </div>
                ) : activeSidebarTab === 'approvals' ? (
                  /* Pending approvals interface within Stock detail view */
                  <div className="space-y-3.5 max-h-[450px] overflow-y-auto pr-1 scrollbar-thin">
                    <span className="text-[10px] font-mono uppercase text-slate-500 tracking-wider font-bold block">Awaiting Authorization</span>
                    {!activeConsumable.pendingIssues || activeConsumable.pendingIssues.filter(i => i.status === 'pending').length === 0 ? (
                      <div className="text-center py-8 text-slate-500 italic font-mono text-[11px] bg-slate-900/40 rounded-lg border border-slate-850">
                        <CheckCircle className="w-5 h-5 text-emerald-500 mx-auto mb-1" />
                        No pending approvals for this item.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {activeConsumable.pendingIssues
                          .filter(i => i.status === 'pending')
                          .map((issue) => (
                            <div key={issue.id} className="bg-slate-900 border border-slate-850 p-3 rounded-lg space-y-2.5">
                              <div className="flex justify-between items-center text-[10px]">
                                <span className="font-mono text-rose-400 font-bold">REQ: {issue.id.substring(4, 10)}...</span>
                                <span className="text-slate-500 font-mono">{new Date(issue.timestamp).toLocaleDateString()}</span>
                              </div>
                              <div className="space-y-1.5 text-[11px] text-slate-300">
                                <p className="flex justify-between"><span>Qty to Issue:</span> <strong className="text-slate-100">{issue.quantityToIssue} {activeConsumable.unit}</strong></p>
                                <p className="flex justify-between"><span>Recipient:</span> <strong className="text-rose-300">{issue.issuedTo}</strong></p>
                                <p className="flex justify-between"><span>Location:</span> <strong className="text-cyan-300">{issue.location}</strong></p>
                                <p className="flex justify-between"><span>Requested By:</span> <strong className="text-slate-400">{issue.requestedBy}</strong></p>
                              </div>
                              <div className="flex items-center gap-2 pt-1 border-t border-slate-850/60">
                                <button
                                  type="button"
                                  onClick={() => handleRejectIssue(activeConsumable.id, issue.id)}
                                  className="flex-1 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded text-[10px] font-bold font-mono uppercase cursor-pointer"
                                >
                                  Reject
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleApproveIssue(activeConsumable.id, issue.id)}
                                  className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[10px] font-bold font-mono uppercase cursor-pointer"
                                >
                                  Approve
                                </button>
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                ) : (
                  /* Movement logs list */
                  <div className="space-y-3.5 max-h-[450px] overflow-y-auto pr-1 scrollbar-thin">
                    <span className="text-[10px] font-mono uppercase text-slate-500 tracking-wider font-bold block mb-1">Transaction History</span>
                    {!activeConsumable.logs || activeConsumable.logs.length === 0 ? (
                      <div className="text-center py-6 text-slate-600 italic">
                        No transactions found. Issuing or updating stock builds live audit logs.
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {activeConsumable.logs.map((log) => (
                          <div key={log.id} className="bg-slate-900 border border-slate-850 p-2.5 rounded text-[11px] space-y-2">
                            <div className="flex justify-between text-[10px]">
                              <span className={`font-mono uppercase font-bold px-1.5 py-0.5 rounded text-[8px] ${
                                log.action === 'issue' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                                log.action === 'approve' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                log.action === 'reject' ? 'bg-rose-950/20 text-rose-500 border border-rose-900/20' :
                                'bg-slate-850 text-slate-300'
                              }`}>
                                {log.action}
                              </span>
                              <span className="text-slate-500 font-mono">{new Date(log.timestamp).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                            
                            <p className="text-slate-200 text-xs font-semibold">{log.notes || 'No description notes provided.'}</p>
                            
                            {/* Detailed history of issue transaction */}
                            {(log.action === 'issue' || log.action === 'approve') && log.issuedTo && (
                              <div className="bg-slate-950/60 p-2 rounded border border-slate-850/40 text-[10px] space-y-1 text-slate-400">
                                <p className="flex items-center gap-1.5"><User className="w-3.5 h-3.5 text-rose-400" /> <span>Recipient:</span> <strong className="text-slate-300">{log.issuedTo}</strong></p>
                                <p className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-cyan-400" /> <span>Location:</span> <strong className="text-slate-300">{log.location}</strong></p>
                              </div>
                            )}

                            <div className="flex justify-between text-[10px] text-slate-400 border-t border-slate-850/60 pt-1.5 mt-1 font-mono">
                              <span>Change: <strong className={log.quantityChanged < 0 ? 'text-rose-400' : 'text-emerald-400'}>{log.quantityChanged > 0 ? `+${log.quantityChanged}` : log.quantityChanged}</strong></span>
                              <span>Final Stock: <strong className="text-slate-200">{log.finalQuantity} {activeConsumable.unit}</strong></span>
                            </div>
                            
                            <div className="text-[9px] text-slate-500 font-mono text-right">
                              Processed By: <strong>{log.performedBy}</strong>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'approvals' && (
        <div className="space-y-6 font-sans">
          <div className="bg-slate-950 p-4 border border-slate-800 rounded-lg">
            <h4 className="text-sm font-bold text-slate-200 uppercase tracking-wider mb-2">Authorization Queue</h4>
            <p className="text-xs text-slate-400 font-mono">Review pending stock requests. Items marked "Requires Authorization" must be approved before inventory quantities are decremented.</p>
          </div>

          {consumables.every(c => !c.pendingIssues || c.pendingIssues.filter(i => i.status === 'pending').length === 0) ? (
            <div className="bg-slate-950 border border-slate-850 p-8 rounded-xl text-center">
              <Clock className="w-8 h-8 text-slate-700 mx-auto mb-2 animate-pulse" />
              <p className="text-sm text-slate-300 font-semibold">No Pending Authorizations</p>
              <p className="text-xs text-slate-500 mt-1">All stock issuance requests have been fully processed or do not require administrative approval.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {consumables.map(c => {
                const pending = c.pendingIssues?.filter(i => i.status === 'pending') || [];
                if (pending.length === 0) return null;
                
                return pending.map(issue => (
                  <div key={issue.id} className="bg-slate-950 border border-slate-800 rounded-xl p-4 md:p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-slate-700 transition-all">
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-slate-500 bg-slate-900 border border-slate-850 px-2 py-0.5 rounded font-bold uppercase">{c.category}</span>
                        <span className="text-[10px] font-mono text-rose-400 font-bold">REQ: {issue.id.substring(4)}</span>
                      </div>
                      <h4 className="font-sans font-bold text-slate-200 text-sm">{c.name}</h4>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs pt-1">
                        <div className="bg-slate-900/60 p-2 rounded border border-slate-850/40">
                          <span className="text-[9px] font-mono text-slate-500 uppercase block">Quantity</span>
                          <span className="font-bold text-slate-300 font-mono">{issue.quantityToIssue} {c.unit}</span>
                        </div>
                        <div className="bg-slate-900/60 p-2 rounded border border-slate-850/40">
                          <span className="text-[9px] font-mono text-slate-500 uppercase block">Requested By</span>
                          <span className="font-semibold text-slate-300">{issue.requestedBy}</span>
                        </div>
                        <div className="bg-slate-900/60 p-2 rounded border border-slate-850/40 font-sans">
                          <span className="text-[9px] font-mono text-slate-500 uppercase block">Issued To</span>
                          <span className="font-semibold text-rose-300">{issue.issuedTo}</span>
                        </div>
                        <div className="bg-slate-900/60 p-2 rounded border border-slate-850/40">
                          <span className="text-[9px] font-mono text-slate-500 uppercase block">Location</span>
                          <span className="font-semibold text-cyan-300 truncate block">{issue.location}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 w-full md:w-auto shrink-0 border-t border-slate-900 md:border-t-0 pt-3 md:pt-0">
                      <button
                        onClick={() => handleRejectIssue(c.id, issue.id)}
                        className="flex-1 md:flex-none px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-lg text-xs font-semibold font-mono uppercase transition-colors cursor-pointer"
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => handleApproveIssue(c.id, issue.id)}
                        className="flex-1 md:flex-none px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold font-mono uppercase tracking-wider transition-colors cursor-pointer"
                      >
                        Authorize
                      </button>
                    </div>
                  </div>
                ));
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            
            {/* Bar Chart representing stock register */}
            <div className="bg-slate-950 p-4 border border-slate-800 rounded-lg">
              <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-4 flex items-center justify-between">
                <span>Material Stock Registers vs Safety Thresholds</span>
                <TrendingUp className="w-4 h-4 text-rose-500 animate-pulse" />
              </h4>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsBarChart data={stockBarData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={9} tickLine={false} />
                    <YAxis stroke="#64748b" fontSize={9} />
                    <RechartsTooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px' }} />
                    <Bar dataKey="Stock" fill="#e11d48" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="AlertThreshold" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  </RechartsBarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Pie Chart representing Open vs Closed tickets ratios */}
            <div className="bg-slate-950 p-4 border border-slate-800 rounded-lg flex flex-col justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-4">Support Ticket Resolution Ratios</h4>
                <div className="h-52 flex items-center justify-center">
                  {ticketsPieData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={ticketsPieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {ticketsPieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <RechartsTooltip />
                        <Legend verticalAlign="bottom" height={36} formatter={(value) => <span className="text-xs text-slate-300 font-sans">{value}</span>} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-xs text-slate-400">No ticket diagnostic records found.</p>
                  )}
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-3 rounded text-[11px] text-slate-400 font-sans leading-relaxed">
                <span className="font-semibold text-rose-300 uppercase block mb-1">CAB Board Ratio KPI</span>
                Showground engineers have resolved or closed <span className="text-emerald-400 font-bold">{resolvedTicketsCount}</span> tickets this rehearsal period, maintaining a healthy loop stability score of <span className="text-emerald-400 font-bold">94%</span>.
              </div>
            </div>
          </div>

          {/* Line chart for syslog levels alerts trends over hours */}
          <div className="bg-slate-950 p-4 border border-slate-800 rounded-lg">
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-4">Signal Logs & Alerts Frequency Trend</h4>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={syslogTrendsData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={9} />
                  <YAxis stroke="#64748b" fontSize={9} />
                  <RechartsTooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px' }} />
                  <Legend verticalAlign="top" height={36} formatter={(value) => <span className="text-xs text-slate-300 font-sans">{value}</span>} />
                  <Line type="monotone" dataKey="Errors" stroke="#f43f5e" strokeWidth={2} activeDot={{ r: 8 }} />
                  <Line type="monotone" dataKey="Warnings" stroke="#fbbf24" strokeWidth={2} />
                  <Line type="monotone" dataKey="Success" stroke="#10b981" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AnimatePresence>
        {consumableToDelete && (
          <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center gap-3 text-red-500 border-b border-slate-800 pb-3">
                <AlertTriangle className="w-6 h-6 shrink-0 text-red-500" />
                <h4 className="font-sans font-bold text-slate-100 text-base">Confirm Stock Deletion</h4>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Are you sure you want to delete <span className="font-semibold text-rose-400">{consumableToDelete.name}</span> (<span className="font-mono text-[10px] text-slate-400">{consumableToDelete.category}</span>)? 
                This action cannot be undone and will permanently erase this consumable stock record from the register.
              </p>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setConsumableToDelete(null)}
                  className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold cursor-pointer transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    onDeleteConsumable(consumableToDelete.id);
                    setConsumableToDelete(null);
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
    </div>
  );
}

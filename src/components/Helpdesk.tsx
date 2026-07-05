import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Ticket, UserRegistryItem, Asset } from '../types';
import { 
  LifeBuoy, 
  Plus, 
  Trash2, 
  Copy, 
  Settings2, 
  Grid, 
  List, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  FileText, 
  UserPlus,
  ArrowRight,
  AlertCircle,
  Download,
  X,
  Mic,
  MicOff,
  Search
} from 'lucide-react';

interface HelpdeskProps {
  tickets: Ticket[];
  users: UserRegistryItem[];
  assets?: Asset[];
  onCreateTicket: (ticket: Partial<Ticket>) => void;
  onUpdateTicket: (id: string, updates: Partial<Ticket>) => void;
  onDeleteTicket: (id: string) => void;
  onCloneTicket: (ticket: Ticket) => void;
  onPrintReport: (report: { title: string; headers: string[]; rows: string[][]; summaries: { label: string; value: string }[] }) => void;
}

export default function Helpdesk({
  tickets,
  users,
  assets = [],
  onCreateTicket,
  onUpdateTicket,
  onDeleteTicket,
  onCloneTicket,
  onPrintReport
}: HelpdeskProps) {
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [activeTab, setActiveTab] = useState<'tickets' | 'change'>('tickets');
  const [showAddForm, setShowAddForm] = useState(false);
  const [ticketToDelete, setTicketToDelete] = useState<Ticket | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const filteredTickets = useMemo(() => {
    let result = tickets;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(t => 
        (t.name || '').toLowerCase().includes(q) ||
        (t.description || '').toLowerCase().includes(q) ||
        (t.id || '').toLowerCase().includes(q) ||
        (t.assignedTo || '').toLowerCase().includes(q)
      );
    }
    if (dateFrom) {
      const fromTime = new Date(dateFrom).getTime();
      result = result.filter(t => {
        const d = t.createdAt;
        return d ? new Date(d).getTime() >= fromTime : true;
      });
    }
    if (dateTo) {
      const toTime = new Date(dateTo).getTime() + 86400000;
      result = result.filter(t => {
        const d = t.createdAt;
        return d ? new Date(d).getTime() <= toTime : true;
      });
    }
    return result;
  }, [tickets, searchQuery, dateFrom, dateTo]);

  const handlePrint = () => {
    const reportRows = filteredTickets.map(t => [
      t.id,
      t.name,
      t.category,
      t.assignedTo,
      t.priority.toUpperCase(),
      t.status.toUpperCase(),
      new Date(t.createdAt).toLocaleDateString()
    ]);
    const reportSummaries = [
      { label: "Total Active Tickets", value: filteredTickets.length.toString() },
      { label: "Open Issues", value: filteredTickets.filter(t => t.status === 'open').length.toString() },
      { label: "In Progress Status", value: filteredTickets.filter(t => t.status === 'in_progress').length.toString() },
      { label: "Resolved / Closed", value: filteredTickets.filter(t => t.status === 'resolved' || t.status === 'closed').length.toString() }
    ];
    onPrintReport({
      title: "Helpdesk Technical Support & Diagnostics Tickets Report",
      headers: ["Ticket ID", "Headline / Description", "System Domain", "Assigned Operator", "Priority", "Status", "Created At"],
      rows: reportRows,
      summaries: reportSummaries
    });
  };

  const handleExportCSV = () => {
    const headers = ["Ticket ID", "Headline / Description", "System Domain", "Assigned Operator", "Priority", "Status", "Created At"];
    const rows = filteredTickets.map(t => [
      t.id,
      t.name.replace(/"/g, '""'),
      t.category,
      t.assignedTo,
      t.priority.toUpperCase(),
      t.status.toUpperCase(),
      new Date(t.createdAt).toLocaleString()
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(val => `"${val}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `helpdesk_tickets_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Ticket Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [category, setCategory] = useState<'Hardware' | 'Network' | 'Power' | 'Lighting' | 'Audio' | 'Special Effects'>('Hardware');
  const [assignedTo, setAssignedTo] = useState('');
  const [assetId, setAssetId] = useState('');

  // Voice Log state
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);
  const [micUnsupported, setMicUnsupported] = useState(false);

  React.useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = 'en-US';

      rec.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        if (finalTranscript) {
          setDescription((prev) => prev + (prev ? ' ' : '') + finalTranscript);
        }
      };

      rec.onerror = (e: any) => {
        console.error("Speech recognition error:", e);
        setIsListening(false);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      setRecognition(rec);
    } else {
      setMicUnsupported(true);
    }
  }, []);

  const toggleListening = () => {
    if (!recognition) {
      setMicUnsupported(true);
      return;
    }

    if (isListening) {
      recognition.stop();
      setIsListening(false);
    } else {
      try {
        recognition.start();
        setIsListening(true);
      } catch (err) {
        console.error("Failed to start speech recognition:", err);
      }
    }
  };

  // RFC Form state
  const [showRfcForm, setShowRfcForm] = useState(false);
  const [rfcName, setRfcName] = useState('');
  const [rfcChange, setRfcChange] = useState('');
  const [rfcRisk, setRfcRisk] = useState('medium');

  const handleSubmitTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !description) return;

    onCreateTicket({
      id: `tkt-${Date.now().toString().substring(8)}`,
      name,
      description,
      priority,
      category,
      assignedTo: assignedTo || 'Seth Boa Amponsem',
      assetId: assetId || undefined,
      status: 'open',
      createdAt: new Date().toISOString(),
      createdBy: 'Seth Boa Amponsem'
    });

    // Reset Form
    setName('');
    setDescription('');
    setPriority('medium');
    setCategory('Hardware');
    setAssetId('');
    setShowAddForm(false);
  };

  const getPriorityBadge = (pri: string) => {
    switch (pri) {
      case 'critical': return 'bg-rose-500/10 text-rose-400 border border-rose-500/30 font-bold';
      case 'high': return 'bg-amber-500/10 text-amber-400 border border-amber-500/30';
      case 'medium': return 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30';
      default: return 'bg-slate-500/10 text-slate-400 border border-slate-500/30';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'resolved': return <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />;
      case 'in_progress': return <Clock className="w-3.5 h-3.5 text-amber-400 animate-spin-slow" />;
      default: return <AlertTriangle className="w-3.5 h-3.5 text-rose-400 animate-pulse" />;
    }
  };

  return (
    <div id="helpdesk-support-panel" className="bg-slate-900 border border-slate-700 rounded-xl overflow-hidden shadow-xl p-5">
      
      {/* Helpdesk Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800 pb-4 mb-5">
        <div>
          <h3 className="font-sans font-bold text-slate-100 flex items-center gap-2 text-base">
            <LifeBuoy className="w-5 h-5 text-rose-500" /> Technical Helpdesk & Change Workflows
          </h3>
          <p className="text-xs text-slate-400">Log client hardware faults, assign engineering tickets, and draft Change Control RFC submissions.</p>
        </div>

        <div className="flex items-center gap-3">
          {/* List/Grid View Mode switch */}
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

          <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-lg border border-slate-800">
            <button
              onClick={() => setActiveTab('tickets')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'tickets' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Support Tickets
            </button>
            <button
              onClick={() => setActiveTab('change')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'change' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Change Management RFC
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

      {activeTab === 'tickets' ? (
        <div className="space-y-6">
          {/* Quick Support Ticket creator */}
          {showAddForm ? (
            <form onSubmit={handleSubmitTicket} className="bg-slate-950 p-5 rounded-lg border border-slate-800 space-y-4">
              <div className="flex justify-between items-center border-b border-slate-800 pb-3 mb-1">
                <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">File Technical Logistics ticket</h4>
                <button type="button" onClick={() => setShowAddForm(false)} className="text-slate-400 hover:text-slate-200 text-xs">Close</button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] text-slate-400 font-mono mb-1">Issue Headline</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. DMX controller link failure"
                      className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-rose-500"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 font-mono mb-1">Priority</label>
                    <select
                      className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-2 text-xs text-slate-200 focus:outline-none"
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as any)}
                    >
                      <option value="low">Low Rehearsal Issue</option>
                      <option value="medium">Medium Priority</option>
                      <option value="high">High System Fail</option>
                      <option value="critical">CRITICAL SHOW STOPPER</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] text-slate-400 font-mono mb-1">System Domain</label>
                      <select
                        className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-2 text-xs text-slate-200 focus:outline-none"
                        value={category}
                        onChange={(e) => setCategory(e.target.value as any)}
                      >
                        <option value="Hardware">Hardware</option>
                        <option value="Network">Network</option>
                        <option value="Power">Power</option>
                        <option value="Lighting">Lighting</option>
                        <option value="Audio">Audio</option>
                        <option value="Special Effects">SFX / Pyrotechnics</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-400 font-mono mb-1">Assign Operator</label>
                      <select
                        className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-2 text-xs text-slate-200 focus:outline-none"
                        value={assignedTo}
                        onChange={(e) => setAssignedTo(e.target.value)}
                      >
                        <option value="">Select Assignee...</option>
                        {users.map((u) => (
                          <option key={u.id} value={u.displayName}>{u.displayName}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 font-mono mb-1">Associated Asset (Triggers Proximity Auto-Assignment)</label>
                    <select
                      className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-rose-500 font-sans"
                      value={assetId}
                      onChange={(e) => {
                        setAssetId(e.target.value);
                        const selectedAsset = assets.find(a => a.id === e.target.value);
                        if (selectedAsset) {
                          if (['Speaker', 'Mic'].includes(selectedAsset.category)) {
                            setCategory('Audio');
                          } else if (['DMX', 'Light', 'Dimmer'].includes(selectedAsset.category)) {
                            setCategory('Lighting');
                          } else if (['Switch', 'Router', 'CPE'].includes(selectedAsset.category)) {
                            setCategory('Network');
                          } else if (['Generator', 'PDU', 'Battery'].includes(selectedAsset.category)) {
                            setCategory('Power');
                          } else if (['Pyro', 'Hazer'].includes(selectedAsset.category)) {
                            setCategory('Special Effects');
                          } else {
                            setCategory('Hardware');
                          }
                        }
                      }}
                    >
                      <option value="">No Asset (Manual Assign / Fallback Rules)</option>
                      {assets.map((a) => (
                        <option key={a.id} value={a.id}>
                          [{a.id}] {a.name} ({a.category})
                        </option>
                      ))}
                    </select>
                    <p className="text-[9px] text-slate-500 font-mono mt-1">If selected, the ticket is auto-assigned to the closest available technician based on last reported coordinates.</p>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-[11px] text-slate-400 font-mono">Detailed Description</label>
                      <button
                        type="button"
                        onClick={toggleListening}
                        className={`flex items-center gap-1.5 px-2 py-1 rounded font-mono text-[10px] uppercase font-bold transition-all border cursor-pointer ${
                          isListening 
                            ? 'bg-rose-500/25 text-rose-400 border-rose-500 animate-pulse' 
                            : 'bg-slate-900 text-indigo-400 border-slate-850 hover:text-indigo-300 hover:border-slate-700'
                        }`}
                        title="Transcribe field notes directly using your microphone"
                      >
                        {isListening ? (
                          <>
                            <MicOff className="w-3.5 h-3.5 text-rose-400" />
                            <span>Stop Transcribing</span>
                          </>
                        ) : (
                          <>
                            <Mic className="w-3.5 h-3.5 text-indigo-400 animate-bounce" />
                            <span>Voice Log Notes</span>
                          </>
                        )}
                      </button>
                    </div>

                    {isListening && (
                      <div className="text-[10px] text-indigo-400 font-mono mb-2 leading-tight flex items-center gap-1.5 bg-indigo-950/20 p-2 rounded border border-indigo-500/20 animate-pulse">
                        <span className="h-2 w-2 rounded-full bg-indigo-500 animate-ping shrink-0" />
                        <span>Transcribing field dictation... start speaking.</span>
                      </div>
                    )}

                    {micUnsupported && (
                      <div className="text-[10px] text-rose-400 font-mono mb-2 leading-tight flex items-center gap-1.5 bg-rose-950/20 p-2 rounded border border-rose-500/20">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>Speech API offline. Type your notes manually.</span>
                      </div>
                    )}

                    <textarea
                      required
                      placeholder="Explain physical details, coordinates affected, or device stack parameters involved (or use Voice Log Notes to dictate)..."
                      className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-2 text-xs text-slate-200 focus:outline-none h-20 font-sans"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-mono text-xs font-bold rounded-lg transition-all cursor-pointer uppercase"
                >
                  File Ticket and Dispatch Notification
                </button>
              </div>
            </form>
          ) : (
            <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center bg-slate-950 p-4 border border-slate-800 rounded-lg gap-4">
              <div className="flex items-center gap-1.5 bg-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-800 text-xs text-slate-400 font-mono flex-1">
                <Search className="w-4 h-4 text-slate-500 shrink-0" />
                <input 
                  type="text"
                  placeholder="Filter tickets (ID, headline, assignee)..."
                  className="bg-transparent border-none text-xs text-slate-200 focus:outline-none focus:ring-0 placeholder-slate-500 w-full"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery('')}
                    className="text-slate-400 hover:text-slate-200 cursor-pointer"
                  >
                    ×
                  </button>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5 bg-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-800 text-xs text-slate-400 font-mono">
                  <span className="text-[10px] uppercase text-slate-500">From</span>
                  <input 
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="bg-transparent border-none text-slate-200 text-[11px] focus:outline-none focus:ring-0 w-24 [color-scheme:dark]"
                  />
                  <span className="text-[10px] uppercase text-slate-500">To</span>
                  <input 
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="bg-transparent border-none text-slate-200 text-[11px] focus:outline-none focus:ring-0 w-24 [color-scheme:dark]"
                  />
                  {(dateFrom || dateTo) && (
                    <button 
                      onClick={() => { setDateFrom(''); setDateTo(''); }}
                      className="text-rose-500 hover:text-rose-400 font-bold ml-1 cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>

                <button
                  onClick={() => setShowAddForm(true)}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-mono text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer uppercase shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" /> File Ticket
                </button>
              </div>
            </div>
          )}

          {/* Ticket Table / Layout container with List or Grid display options */}
          {viewMode === 'list' ? (
            <div className="overflow-x-auto bg-slate-950 border border-slate-800 rounded-lg">
              <table className="w-full text-left border-collapse font-sans text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 text-[10px] font-mono uppercase bg-slate-900/50">
                    <th className="p-4">Ticket ID</th>
                    <th className="p-4">Headline</th>
                    <th className="p-4">Domain</th>
                    <th className="p-4">Assigned To</th>
                    <th className="p-4">Priority</th>
                    <th className="p-4 text-center">Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {filteredTickets.map((t) => (
                    <tr 
                      key={t.id} 
                      className="hover:bg-slate-900/60 transition-colors cursor-pointer group"
                      onClick={(e) => {
                        const target = e.target as HTMLElement;
                        if (target.closest('button') || target.closest('select')) return;
                        setSelectedTicket(t);
                      }}
                    >
                      <td className="p-4 font-mono font-bold text-rose-400">{t.id}</td>
                      <td className="p-4 font-medium text-slate-200">
                        <div>
                          <p>{t.name}</p>
                          <p className="text-[10px] text-slate-400 font-normal line-clamp-1 mt-0.5">{t.description}</p>
                        </div>
                      </td>
                      <td className="p-4 text-slate-300 font-mono text-[10px]">{t.category}</td>
                      <td className="p-4 text-slate-200 font-medium">{t.assignedTo}</td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-mono ${getPriorityBadge(t.priority)}`}>
                          {t.priority}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-center gap-1.5">
                          {getStatusIcon(t.status)}
                          <select
                            value={t.status}
                            onChange={(e) => onUpdateTicket(t.id, { status: e.target.value as any })}
                            className="bg-transparent border-none text-[10px] text-slate-300 font-mono focus:outline-none focus:ring-0 cursor-pointer"
                          >
                            <option value="open">Open</option>
                            <option value="in_progress">In Progress</option>
                            <option value="resolved">Resolved</option>
                            <option value="closed">Closed</option>
                          </select>
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Clone Button */}
                          <button
                            onClick={() => onCloneTicket(t)}
                            className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-rose-400 transition-all cursor-pointer"
                            title="Clone Ticket"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          {/* Config Option */}
                          <button
                            onClick={() => onUpdateTicket(t.id, { priority: 'critical' })}
                            className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-amber-400 transition-all cursor-pointer"
                            title="Escalate to Critical"
                          >
                            <Settings2 className="w-3.5 h-3.5" />
                          </button>
                          {/* Delete Option - Always Red */}
                          <button
                            onClick={() => setTicketToDelete(t)}
                            className="p-1.5 bg-red-500/10 hover:bg-red-500/20 rounded text-red-500 hover:text-red-400 transition-all cursor-pointer border border-red-500/20"
                            title="Delete Ticket"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            /* Draggable Kanban Columns Board View */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
              {(['open', 'in_progress', 'resolved', 'closed'] as const).map((status) => {
                const statusTickets = filteredTickets.filter(t => t.status === status);
                return (
                  <div 
                    key={status}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      const ticketId = e.dataTransfer.getData('text/plain');
                      if (ticketId) {
                        onUpdateTicket(ticketId, { status });
                      }
                    }}
                    className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 min-h-[480px] flex flex-col space-y-3 transition-colors duration-150 hover:bg-slate-950/85"
                  >
                    {/* Column Header */}
                    <div className="flex justify-between items-center pb-2 border-b border-slate-800/60 px-1">
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${
                          status === 'open' ? 'bg-sky-500 shadow-[0_0_8px_rgba(56,189,248,0.5)]' :
                          status === 'in_progress' ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]' :
                          status === 'resolved' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' :
                          'bg-slate-500'
                        }`} />
                        <span className="text-xs font-bold text-slate-300 font-mono uppercase tracking-wider">
                          {status === 'in_progress' ? 'In Progress' : status}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono font-bold bg-slate-900 text-slate-400 px-2 py-0.5 rounded border border-slate-800/40">
                        {statusTickets.length}
                      </span>
                    </div>

                    {/* Column Cards */}
                    <div className="flex-1 flex flex-col space-y-3 overflow-y-auto max-h-[550px] pr-0.5">
                      {statusTickets.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center py-12 border border-dashed border-slate-900 rounded-lg text-slate-600 text-[11px] font-mono select-none">
                          DRAG TICKETS HERE
                        </div>
                      ) : (
                        statusTickets.map((t) => (
                          <motion.div
                            layout
                            draggable
                            onDragStart={(e) => {
                              e.dataTransfer.setData('text/plain', t.id);
                            }}
                            whileDrag={{ 
                              scale: 1.05, 
                              rotate: 1.5, 
                              boxShadow: "0 25px 30px -5px rgb(0 0 0 / 0.6), 0 10px 12px -6px rgb(0 0 0 / 0.6)", 
                              zIndex: 50 
                            }}
                            whileHover={{ scale: 1.015, borderColor: "rgba(225, 29, 72, 0.4)" }}
                            transition={{ type: "spring", stiffness: 350, damping: 25 }}
                            key={t.id} 
                            className="bg-slate-900/90 p-3.5 border border-slate-800/80 rounded-lg flex flex-col justify-between space-y-3 cursor-grab active:cursor-grabbing group shadow hover:bg-slate-900 transition-all"
                            onClick={(e) => {
                              const target = e.target as HTMLElement;
                              if (target.closest('button') || target.closest('select')) return;
                              setSelectedTicket(t);
                            }}
                          >
                            <div>
                              <div className="flex justify-between items-start mb-2">
                                <span className="text-[10px] font-mono text-rose-400 font-bold">{t.id}</span>
                                <span className={`px-2 py-0.5 rounded text-[9px] uppercase font-mono ${getPriorityBadge(t.priority)}`}>
                                  {t.priority}
                                </span>
                              </div>

                              <h4 className="text-slate-200 font-bold text-xs leading-tight mb-1 group-hover:text-rose-400 transition-colors">{t.name}</h4>
                              <p className="text-slate-400 text-xs line-clamp-2 leading-relaxed">{t.description}</p>
                              
                              <div className="grid grid-cols-2 gap-2 text-[9px] font-mono border-t border-slate-950 pt-2 mt-2 text-slate-400">
                                <div>
                                  <span className="text-slate-500">DOMAIN:</span>
                                  <p className="text-slate-300 truncate">{t.category}</p>
                                </div>
                                <div>
                                  <span className="text-slate-500">ASSIGNED:</span>
                                  <p className="text-rose-300 font-semibold truncate">{t.assignedTo || 'Unassigned'}</p>
                                </div>
                              </div>
                            </div>

                            <div className="border-t border-slate-950 pt-2.5 flex justify-between items-center">
                              <span className="text-[9px] text-slate-500 font-mono">
                                {new Date(t.createdAt).toLocaleDateString()}
                              </span>

                              <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                                <button
                                  onClick={() => onCloneTicket(t)}
                                  className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-rose-400 cursor-pointer transition-colors"
                                  title="Clone Ticket"
                                >
                                  <Copy className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => setTicketToDelete(t)}
                                  className="p-1 bg-red-500/10 hover:bg-red-500/20 rounded text-red-500 hover:text-red-400 cursor-pointer border border-red-500/20 transition-all"
                                  title="Delete Ticket"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          </motion.div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* Change Management RFC section */
        <div className="space-y-6">
          <div className="bg-slate-950 p-4 border border-slate-800 rounded-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h4 className="text-slate-200 text-xs font-bold uppercase tracking-wider mb-1">Standardized CAB / Change Request Submissions</h4>
              <p className="text-xs text-slate-400">Network partition modifications or physical rigging updates require a valid RFC document filed ahead of show rehearsal hours.</p>
            </div>
            <button
              onClick={() => setShowRfcForm(!showRfcForm)}
              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-mono text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer uppercase"
            >
              <FileText className="w-4 h-4" /> Draw RFC Control Request
            </button>
          </div>

          {showRfcForm && (
            <div className="bg-slate-950 p-5 rounded-lg border border-slate-800 space-y-4 animate-fadeIn">
              <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider border-b border-slate-800 pb-2">Draft RFC Form</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] text-slate-400 font-mono mb-1">CAB Reference Identifier</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. RFC-SUBNET-901"
                      className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-rose-500"
                      value={rfcName}
                      onChange={(e) => setRfcName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 font-mono mb-1">Fallback Risk Profile</label>
                    <select
                      className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
                      value={rfcRisk}
                      onChange={(e) => setRfcRisk(e.target.value)}
                    >
                      <option value="low">Low - Simple hardware hot swap</option>
                      <option value="medium">Medium - Backstage Switch power cycle</option>
                      <option value="high">High Risk - Core Router reconfiguration during show</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 font-mono mb-1">Change Scope Description</label>
                  <textarea
                    required
                    placeholder="Specify target hardware IPs, fallback plan, and rehearsal timeline constraints..."
                    className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none h-24"
                    value={rfcChange}
                    onChange={(e) => setRfcChange(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => {
                    if (!rfcName) return;
                    // Trigger custom CAB submit by generating a simulation ticket with RFC details
                    onCreateTicket({
                      id: `tkt-${Date.now().toString().substring(8)}`,
                      name: rfcName,
                      description: `[RFC CHANGE SUBMISSION - RISK: ${rfcRisk.toUpperCase()}] ${rfcChange}`,
                      priority: rfcRisk === 'high' ? 'critical' : 'medium',
                      category: 'Network',
                      status: 'open',
                      createdAt: new Date().toISOString(),
                      createdBy: 'Seth Boa Amponsem',
                      changeManagement: {
                        required: true,
                        rfcForm: rfcName
                      }
                    });
                    setRfcName('');
                    setRfcChange('');
                    setShowRfcForm(false);
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-bold rounded-lg transition-all cursor-pointer uppercase"
                >
                  Publish RFC to Technical Board
                </button>
              </div>
            </div>
          )}

          {/* Active RFC list */}
          <div className="bg-slate-950 p-4 border border-slate-800 rounded-lg space-y-4">
            <span className="text-xs text-slate-400 font-mono font-bold uppercase tracking-wider block mb-2 border-b border-slate-800 pb-2">Pending CAB Approvals</span>
            <div className="space-y-3">
              {tickets.filter(t => t.changeManagement?.required).map((t) => (
                <div key={t.id} className="p-3 bg-slate-900/50 border border-slate-850 rounded-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <h5 className="text-xs font-bold font-mono text-cyan-400">{t.changeManagement?.rfcForm}</h5>
                    <p className="text-xs text-slate-300 font-medium mt-1 leading-relaxed">{t.name} - {t.description}</p>
                    <p className="text-[10px] text-slate-500 font-mono mt-1">Submitted by: {t.createdBy} | Date: {new Date(t.createdAt).toLocaleDateString()}</p>
                  </div>

                  {t.changeManagement?.approvedBy ? (
                    <div className="flex items-center gap-1.5 bg-emerald-950/40 border border-emerald-500/20 text-emerald-400 px-3 py-1.5 rounded text-[10px] font-mono">
                      <CheckCircle className="w-3.5 h-3.5" /> Approved by {t.changeManagement.approvedBy}
                    </div>
                  ) : (
                    <button
                      onClick={() => onUpdateTicket(t.id, {
                        changeManagement: {
                          required: true,
                          rfcForm: t.changeManagement?.rfcForm,
                          approvedBy: 'Seth Boa Amponsem',
                          approvedDate: new Date().toISOString()
                        },
                        status: 'in_progress'
                      })}
                      className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-mono text-[10px] font-bold rounded transition-all cursor-pointer uppercase"
                    >
                      Sign & Approve
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AnimatePresence>
        {ticketToDelete && (
          <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center gap-3 text-red-500 border-b border-slate-800 pb-3">
                <AlertCircle className="w-6 h-6 shrink-0 text-red-500" />
                <h4 className="font-sans font-bold text-slate-100 text-base">Confirm Ticket Deletion</h4>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Are you sure you want to delete <span className="font-semibold text-rose-400">{ticketToDelete.name}</span> (<span className="font-mono text-[10px] text-slate-400">{ticketToDelete.id}</span>)? 
                This action is irreversible and will remove this ticket record from the dispatch board.
              </p>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setTicketToDelete(null)}
                  className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold cursor-pointer transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    onDeleteTicket(ticketToDelete.id);
                    setTicketToDelete(null);
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

      {/* Ticket Details Dialog Modal */}
      <AnimatePresence>
        {selectedTicket && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-lg overflow-hidden shadow-2xl text-left"
            >
              {/* Header */}
              <div className="bg-slate-950 px-5 py-4 border-b border-slate-850 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-rose-400 font-bold bg-rose-950/20 px-2 py-0.5 rounded border border-rose-950/40">{selectedTicket.id}</span>
                  <span className="text-[10px] uppercase font-mono text-slate-500 font-bold">Ticket Registry Protocol</span>
                </div>
                <button
                  onClick={() => setSelectedTicket(null)}
                  className="p-1 hover:bg-slate-850 rounded-lg text-slate-400 hover:text-white transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 space-y-4">
                <div className="space-y-1">
                  <h3 className="text-slate-100 font-bold text-base leading-snug">{selectedTicket.name}</h3>
                  <div className="flex items-center gap-2 pt-1">
                    <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-mono ${getPriorityBadge(selectedTicket.priority)}`}>
                      {selectedTicket.priority} Priority
                    </span>
                    <span className="flex items-center gap-1 text-[10px] font-mono text-slate-400">
                      {getStatusIcon(selectedTicket.status)}
                      {selectedTicket.status.toUpperCase()}
                    </span>
                  </div>
                </div>

                <div className="bg-slate-950 p-4 border border-slate-850 rounded-lg space-y-2">
                  <h4 className="text-[10px] text-slate-400 uppercase font-mono tracking-wider font-bold">Detailed Issue Manifest</h4>
                  <p className="text-slate-200 text-xs leading-relaxed whitespace-pre-wrap">{selectedTicket.description}</p>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-850 text-left">
                    <span className="text-[9px] text-slate-500 font-mono uppercase block">Assigned Technical Agent</span>
                    <span className="font-bold text-rose-300 font-sans mt-0.5 block">{selectedTicket.assignedTo}</span>
                  </div>
                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-850 text-left">
                    <span className="text-[9px] text-slate-500 font-mono uppercase block">Engineering Domain Category</span>
                    <span className="font-bold text-slate-200 font-mono mt-0.5 block">{selectedTicket.category}</span>
                  </div>
                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-850 text-left">
                    <span className="text-[9px] text-slate-500 font-mono uppercase block">Initiating Contributor</span>
                    <span className="font-bold text-slate-300 font-sans mt-0.5 block">{selectedTicket.createdBy}</span>
                  </div>
                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-850 text-left">
                    <span className="text-[9px] text-slate-500 font-mono uppercase block">Submission Timestamp</span>
                    <span className="font-bold text-slate-300 font-mono mt-0.5 block">{new Date(selectedTicket.createdAt).toLocaleString()}</span>
                  </div>
                </div>

                {(() => {
                  if (!selectedTicket.assetId) return null;
                  const matchedAsset = assets.find(a => a.id === selectedTicket.assetId);
                  const matchedTech = users.find(u => u.displayName === selectedTicket.assignedTo);
                  
                  if (!matchedAsset) return null;
                  
                  let distanceStr = '';
                  if (matchedAsset.coordinates && matchedTech?.coordinates) {
                    const dx = matchedTech.coordinates.x - matchedAsset.coordinates.x;
                    const dy = matchedTech.coordinates.y - matchedAsset.coordinates.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    distanceStr = `${distance.toFixed(1)}% map units`;
                  }
                  
                  return (
                    <div className="bg-slate-950 p-3 border border-slate-850 rounded-lg space-y-2 text-left">
                      <h4 className="text-[10px] text-emerald-400 uppercase font-mono tracking-wider font-bold">Associated Asset & Geo-Dispatch</h4>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px]">
                        <div>
                          <span className="text-[9px] text-slate-500 font-mono block">Target Asset:</span>
                          <span className="font-semibold text-slate-200 block truncate">
                            {matchedAsset.name} ({matchedAsset.id})
                          </span>
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-500 font-mono block">Asset Location:</span>
                          <span className="font-semibold text-slate-200 block font-mono">
                            X: {matchedAsset.coordinates?.x}%, Y: {matchedAsset.coordinates?.y}%
                          </span>
                        </div>
                        {matchedTech?.coordinates && (
                          <>
                            <div>
                              <span className="text-[9px] text-slate-500 font-mono block">Technician Last Position:</span>
                              <span className="font-semibold text-slate-200 block font-mono">
                                X: {matchedTech.coordinates.x}%, Y: {matchedTech.coordinates.y}%
                              </span>
                            </div>
                            <div>
                              <span className="text-[9px] text-slate-500 font-mono block">Calculated Distance:</span>
                              <span className="font-semibold text-rose-400 block font-mono">
                                {distanceStr || 'N/A'} (Closest Assigned)
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {selectedTicket.changeManagement?.required && (
                  <div className="bg-amber-950/20 border border-amber-500/20 p-3.5 rounded-lg text-left space-y-1.5">
                    <h5 className="text-[10px] text-amber-400 uppercase font-mono font-bold tracking-wider">Change Control Authorization</h5>
                    <p className="text-slate-300 text-[11px]">This ticket requires formal Change Management approval prior to executing site remediation.</p>
                    <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-slate-400 border-t border-amber-500/10 pt-1.5 mt-1">
                      <span>RFC Form: <strong className="text-slate-200">{selectedTicket.changeManagement.rfcForm || 'N/A'}</strong></span>
                      <span>Approved By: <strong className="text-emerald-400">{selectedTicket.changeManagement.approvedBy || 'Pending'}</strong></span>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="bg-slate-950 px-5 py-3 border-t border-slate-850 flex justify-end gap-2">
                <button
                  onClick={() => setSelectedTicket(null)}
                  className="px-3.5 py-1.5 bg-slate-850 hover:bg-slate-850 text-slate-300 rounded-lg text-xs font-mono font-bold cursor-pointer"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

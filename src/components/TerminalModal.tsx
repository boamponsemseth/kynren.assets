import React, { useState, useRef, useEffect } from 'react';
import { X, Terminal as TermIcon, Trash2, Copy, ShieldAlert } from 'lucide-react';
import { SignalLog, SwitchDevice, TopologyNode } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface TerminalModalProps {
  isOpen: boolean;
  onClose: () => void;
  devices: SwitchDevice[];
  nodes: TopologyNode[];
  logs: SignalLog[];
  onTriggerPingAll: () => Promise<string>;
}

export default function TerminalModal({
  isOpen,
  onClose,
  devices,
  nodes,
  logs,
  onTriggerPingAll
}: TerminalModalProps) {
  const [history, setHistory] = useState<string[]>([
    'KYNREN TECH OPS TERMINAL [VERSION 4.2.90]',
    '(C) 2026 KYNREN LTD. ALL RIGHTS RESERVED.',
    'CLIENT IP ACCESS DETECTED - SECURITY TUNNEL ACTIVE',
    'Type "help" for a list of available Operations commands.',
    ''
  ]);
  const [inputVal, setInputVal] = useState('');
  const terminalEndRef = useRef<HTMLDivElement>(null);

  // Combine switch devices and topology nodes for easy dropdown listing and status checks
  const allDevices = React.useMemo(() => {
    const list = [
      ...nodes.map(n => ({ id: n.id, name: n.name, ip: n.ip, status: n.status, packetLoss: n.packetLoss ?? 0 })),
      ...devices.map(d => ({ id: d.id, name: d.name, ip: d.ip, status: d.status, packetLoss: d.status === 'offline' ? 100 : 0 }))
    ];
    return list;
  }, [nodes, devices]);

  // Track the currently selected device for trends
  const [selectedDeviceIp, setSelectedDeviceIp] = useState<string>(() => {
    return allDevices[0]?.ip || '10.12.10.15';
  });

  // Track the packet loss trends over time for all devices
  const [trends, setTrends] = useState<Record<string, { interval: string; loss: number }[]>>({});

  // Helper to generate or retrieve trend data
  const getDeviceTrendData = (ip: string) => {
    if (trends[ip]) {
      return trends[ip];
    }
    const match = allDevices.find(d => d.ip === ip);
    const baseLoss = match ? (match.status === 'offline' ? 100 : (match.packetLoss ?? 0)) : 0;
    
    // Seed 6 historical data points ending with the base loss
    const seed = [
      { interval: '10m ago', loss: Math.max(0, Math.min(100, baseLoss + (Math.random() > 0.8 ? 20 : 0))) },
      { interval: '8m ago', loss: Math.max(0, Math.min(100, baseLoss - (Math.random() > 0.8 ? 5 : 0))) },
      { interval: '6m ago', loss: Math.max(0, Math.min(100, baseLoss + (Math.random() > 0.8 ? 15 : 0))) },
      { interval: '4m ago', loss: Math.max(0, Math.min(100, baseLoss - (Math.random() > 0.8 ? 10 : 0))) },
      { interval: '2m ago', loss: Math.max(0, Math.min(100, baseLoss + (Math.random() > 0.8 ? 10 : 0))) },
      { interval: 'Now', loss: baseLoss }
    ];
    return seed;
  };

  // Add a new data point to a device's trend
  const addPingResultToTrend = (ip: string, loss: number) => {
    setTrends(prev => {
      const current = prev[ip] || getDeviceTrendData(ip);
      const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const updated = [...current.slice(1), { interval: nowStr, loss }];
      return {
        ...prev,
        [ip]: updated
      };
    });
  };

  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [history, isOpen]);

  if (!isOpen) return null;

  const handleCommand = async (cmdStr: string) => {
    const trimmed = cmdStr.trim();
    if (!trimmed) return;

    const parts = trimmed.toLowerCase().split(' ');
    const primary = parts[0];
    const arg = parts[1];

    let response: string[] = [];

    switch (primary) {
      case 'help':
        response = [
          `> ${trimmed}`,
          'Available Operations Commands:',
          '  help               - Display this support menu.',
          '  status             - Show overall showgrounds technical status summary.',
          '  ping <ip>|all      - Ping a device, or trigger automatic network wide ping.',
          '  logs               - View real-time signal monitoring logs.',
          '  vlan               - Display mapped VLAN segments & subnets.',
          '  alerts             - Query active critical safety system warnings.',
          '  abort              - SFX emergency cutoff command (requires clearance).',
          '  clear              - Clear the terminal console history.',
          ''
        ];
        break;

      case 'clear':
        setHistory([
          'KYNREN TECH OPS TERMINAL CONSOLE CLEARED.',
          `SESSION ACTIVE: ${new Date().toLocaleString()}`,
          ''
        ]);
        setInputVal('');
        return;

      case 'status':
        const onlineCount = nodes.filter(n => n.status === 'online').length;
        const total = nodes.length;
        response = [
          `> ${trimmed}`,
          `[SYSTEM OVERVIEW] - ${new Date().toLocaleString()}`,
          `- Active Nodes: ${onlineCount}/${total} online`,
          `- Degraded Lines: ${nodes.filter(n => n.status === 'degraded').length}`,
          `- Critical Faults: ${nodes.filter(n => n.status === 'offline').length}`,
          `- Show Status: READY / MONITORING ACTIVE`,
          ''
        ];
        break;

      case 'ping':
        if (arg === 'all') {
          response = [`> ${trimmed}`, 'Initializing automatic ping on all network switches & device stacks...'];
          setHistory(prev => [...prev, ...response]);
          setInputVal('');
          const pingResult = await onTriggerPingAll();
          setHistory(prev => [...prev, pingResult, '']);
          return;
        } else if (arg) {
          const deviceMatch = allDevices.find(n => n.ip === arg || n.name.toLowerCase() === arg);
          if (deviceMatch) {
            setSelectedDeviceIp(deviceMatch.ip);
            
            // Calculate a temporary simulated packet loss
            let simulatedLoss = 0;
            if (deviceMatch.status === 'offline') {
              simulatedLoss = 100;
            } else if (deviceMatch.status === 'degraded') {
              simulatedLoss = Math.random() > 0.5 ? 25 : 50;
            } else {
              simulatedLoss = Math.random() > 0.9 ? 25 : 0;
            }
            
            addPingResultToTrend(deviceMatch.ip, simulatedLoss);

            response = [
              `> ${trimmed}`,
              `Pinging ${deviceMatch.name} [${deviceMatch.ip}] with 32 bytes of data:`,
              `Reply from ${deviceMatch.ip}: bytes=32 time=${Math.floor(Math.random() * 20) + 1}ms TTL=64`,
              `Reply from ${deviceMatch.ip}: bytes=32 time=${Math.floor(Math.random() * 20) + 1}ms TTL=64`,
              `Ping statistics for ${deviceMatch.ip}:`,
              `  Packets: Sent = 2, Received = ${simulatedLoss === 100 ? 0 : simulatedLoss > 0 ? 1 : 2}, Lost = ${simulatedLoss === 100 ? 2 : simulatedLoss > 0 ? 1 : 0} (${simulatedLoss}% loss)`,
              ''
            ];
          } else {
            setSelectedDeviceIp(arg);
            addPingResultToTrend(arg, 100);
            response = [
              `> ${trimmed}`,
              `Pinging ${arg} with 32 bytes of data:`,
              `Request timed out.`,
              `Request timed out.`,
              `Ping statistics for ${arg}:`,
              `  Packets: Sent = 2, Received = 0, Lost = 2 (100% loss)`,
              ''
            ];
          }
        } else {
          response = [`> ${trimmed}`, 'Usage: ping <device_ip> or ping all', ''];
        }
        break;

      case 'logs':
        response = [
          `> ${trimmed}`,
          '=== RECENT SIGNAL MONITORING LOGS ===',
          ...logs.slice(0, 10).map(l => `[${new Date(l.timestamp).toLocaleTimeString()}] [${l.level.toUpperCase()}] ${l.source}: ${l.message}`),
          ''
        ];
        break;

      case 'vlan':
        response = [
          `> ${trimmed}`,
          '=== MAPPED VLAN SEGMENTS ===',
          'VLAN 10 - Control Network   - Subnet: 10.12.10.0/24',
          'VLAN 20 - Media Projectors  - Subnet: 10.12.20.0/24',
          'VLAN 30 - Audio Subsystems  - Subnet: 10.12.30.0/24',
          'VLAN 50 - Special Effects   - Subnet: 10.12.50.0/24',
          ''
        ];
        break;

      case 'alerts':
        const errLogs = logs.filter(l => l.level === 'error' || l.level === 'warn');
        response = [
          `> ${trimmed}`,
          '=== ACTIVE SECURITY ALERTS ===',
          ...(errLogs.length > 0 
            ? errLogs.map(l => `ALERT: [${l.level.toUpperCase()}] Source: ${l.source} - ${l.message}`)
            : ['No active alerts detected.']),
          ''
        ];
        break;

      case 'abort':
        response = [
          `> ${trimmed}`,
          '⚠️ WARNING: EMISSIVE SFX ABORT DEPLOYED ⚠️',
          'Shutting down DMX Controller Loop 10.12.40.10...',
          'Triggering safety block on Pyrotechnics 10.12.50.5...',
          'STATUS: ALL SHOWGROUND HARDWARE LOCKED IN SAFE REHEARSAL PATTERN.',
          ''
        ];
        break;

      default:
        response = [
          `> ${trimmed}`,
          `Command "${trimmed}" not recognized. Type "help" for support list.`,
          ''
        ];
        break;
    }

    setHistory(prev => [...prev, ...response]);
    setInputVal('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleCommand(inputVal);
    }
  };

  const handleCopyLogs = () => {
    try {
      const fullText = history.join('\n');
      navigator.clipboard.writeText(fullText);
      setHistory(prev => [...prev, '[SYSTEM] Console outputs copied to clipboard successfully.', '']);
    } catch (err) {
      console.error('Failed to copy console logs', err);
    }
  };

  const handleClearConsole = () => {
    setHistory([
      'KYNREN TECH OPS TERMINAL CONSOLE CLEARED.',
      `SESSION ACTIVE: ${new Date().toLocaleString()}`,
      ''
    ]);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div 
        id="ops-terminal-modal"
        className="w-full max-w-5xl bg-slate-950 border border-emerald-500/30 rounded-xl overflow-hidden shadow-2xl shadow-emerald-950/20 flex flex-col h-[550px]"
      >
        {/* Terminal Title Bar */}
        <div className="bg-slate-900 px-4 py-3 border-b border-emerald-500/15 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <TermIcon className="w-4 h-4 text-emerald-400 animate-pulse" />
            <span className="font-mono text-xs text-emerald-400 font-bold uppercase tracking-wider">
              Kynren Tech OPS Terminal v4.2
            </span>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Master Panel Workspace */}
        <div className="flex-1 flex flex-col md:flex-row min-h-0">
          
          {/* Left Panel: Traditional Operator Console */}
          <div className="flex-1 flex flex-col min-h-0 border-r border-emerald-500/10">
            
            {/* Header with Quick Actions */}
            <div className="flex bg-slate-900 border-b border-emerald-500/10 px-4 py-2.5 justify-between items-center text-[11px] shrink-0">
              <span className="text-emerald-500/70 font-mono flex items-center gap-1.5 font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                ACTIVE DIAGNOSTIC SYSTEM
              </span>
              <div className="flex items-center gap-2">
                <button
                  id="btn-copy-terminal-logs"
                  onClick={handleCopyLogs}
                  className="px-2.5 py-1 rounded bg-emerald-950/80 border border-emerald-500/20 hover:bg-emerald-500 hover:text-black text-emerald-400 font-mono text-[10px] transition-all cursor-pointer flex items-center gap-1 uppercase font-bold"
                  title="Copy console outputs to clipboard"
                >
                  <Copy className="w-3 h-3" /> Copy Logs
                </button>
                <button
                  id="btn-clear-terminal"
                  onClick={handleClearConsole}
                  className="px-2.5 py-1 rounded bg-rose-950/30 border border-rose-500/20 hover:bg-rose-500 hover:text-white text-rose-400 font-mono text-[10px] transition-all cursor-pointer flex items-center gap-1 uppercase font-bold"
                  title="Clear screen history"
                >
                  <Trash2 className="w-3 h-3" /> Clear
                </button>
              </div>
            </div>

            {/* Console Output Stream */}
            <div className="flex-1 p-4 overflow-y-auto font-mono text-xs text-emerald-400 space-y-1.5 bg-slate-950 scrollbar-thin scrollbar-thumb-emerald-500/10">
              {history.map((line, idx) => (
                <div key={idx} className="whitespace-pre-wrap leading-relaxed">
                  {line}
                </div>
              ))}
              <div ref={terminalEndRef} />
            </div>

            {/* Command Input Bar */}
            <div className="bg-slate-900 border-t border-emerald-500/15 p-3 flex items-center gap-2 shrink-0">
              <span className="font-mono text-xs text-emerald-400 font-semibold select-none">$</span>
              <input
                id="terminal-input"
                type="text"
                className="flex-1 bg-transparent text-emerald-400 font-mono text-xs border-none outline-none focus:ring-0 placeholder-emerald-950/40"
                placeholder="Type command (e.g. 'ping all', 'status', 'logs')..."
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                onKeyDown={handleKeyDown}
                autoFocus
              />
              <button
                onClick={() => handleCommand(inputVal)}
                className="px-3 py-1 bg-emerald-950 border border-emerald-500/20 hover:bg-emerald-500 hover:text-black rounded text-[10px] font-mono text-emerald-400 transition-all cursor-pointer uppercase font-bold"
              >
                Execute
              </button>
            </div>
          </div>

          {/* Right Panel: Recharts Loss Graph & Select Diagnostics */}
          <div className="w-full md:w-80 bg-slate-900/40 p-4 flex flex-col justify-between overflow-y-auto border-t md:border-t-0 border-emerald-500/10 select-none">
            
            <div className="space-y-4">
              {/* Dropdown Device Target Selector */}
              <div>
                <label className="text-[10px] text-slate-400 font-mono uppercase tracking-wider block font-bold mb-2">
                  Selected Diagnostic Node
                </label>
                <select
                  id="terminal-device-select"
                  className="w-full bg-slate-950 border border-emerald-500/20 rounded p-2 text-xs text-emerald-400 font-mono focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 cursor-pointer"
                  value={selectedDeviceIp}
                  onChange={(e) => setSelectedDeviceIp(e.target.value)}
                >
                  {allDevices.map(d => (
                    <option key={d.id} value={d.ip} className="bg-slate-950 text-emerald-400 font-mono text-xs">
                      {d.name} ({d.ip})
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Details for Selected Device */}
              {(() => {
                const activeDev = allDevices.find(d => d.ip === selectedDeviceIp);
                if (!activeDev) return null;
                const statusColor = 
                  activeDev.status === 'online' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' :
                  activeDev.status === 'degraded' ? 'text-amber-400 bg-amber-500/10 border-amber-500/20' :
                  'text-rose-400 bg-rose-500/10 border-rose-500/20';

                return (
                  <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 space-y-1.5">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-xs font-bold text-slate-200">{activeDev.name}</h4>
                        <span className="text-[10px] text-slate-500 font-mono">{activeDev.ip}</span>
                      </div>
                      <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border uppercase ${statusColor}`}>
                        {activeDev.status}
                      </span>
                    </div>
                  </div>
                );
              })()}

              {/* Recharts Bar Chart Packet Loss Widget */}
              <div className="space-y-2">
                <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider block font-bold">
                  Packet Loss Trend (%)
                </span>
                
                <div className="h-44 bg-slate-950 border border-slate-800 rounded-lg p-2.5 flex flex-col justify-between">
                  <div className="w-full h-full min-h-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={getDeviceTrendData(selectedDeviceIp)}
                        margin={{ top: 5, right: 5, left: -25, bottom: 0 }}
                      >
                        <XAxis 
                          dataKey="interval" 
                          stroke="#475569" 
                          fontSize={9}
                          tickLine={false}
                        />
                        <YAxis 
                          stroke="#475569" 
                          fontSize={9}
                          tickLine={false}
                          domain={[0, 100]}
                          ticks={[0, 25, 50, 75, 100]}
                        />
                        <Tooltip
                          contentStyle={{ background: '#020617', borderColor: '#1e293b', borderRadius: '6px', fontSize: '10px' }}
                          labelStyle={{ color: '#94a3b8', fontFamily: 'monospace' }}
                          itemStyle={{ color: '#f43f5e', padding: 0 }}
                        />
                        <Bar dataKey="loss" radius={[2, 2, 0, 0]}>
                          {getDeviceTrendData(selectedDeviceIp).map((entry, index) => {
                            const isHigh = entry.loss > 50;
                            const isMed = entry.loss > 0 && entry.loss <= 50;
                            return (
                              <Cell 
                                key={`cell-${index}`} 
                                fill={isHigh ? '#f43f5e' : isMed ? '#fbbf24' : '#10b981'} 
                              />
                            );
                          })}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  
                  <div className="flex justify-between items-center text-[9px] font-mono text-slate-500 pt-1 border-t border-slate-900">
                    <span>MIN: 0%</span>
                    <span>MAX: 100%</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Bottom help indicator */}
            <div className="pt-4 border-t border-slate-850 mt-4">
              <p className="text-[10px] text-slate-500 font-mono leading-relaxed flex items-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5 text-emerald-500" />
                Pinging a target via terminal automatically logs a trend update point.
              </p>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

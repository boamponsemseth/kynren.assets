import React, { useState, useMemo, useEffect } from "react";
import {
  Cpu,
  Activity,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Search,
  Filter,
  RefreshCw,
  Trash2,
  Settings,
  Database,
  FileText,
  Download,
  Terminal,
  SlidersHorizontalIcon,
  Power,
  Clock,
  ShieldAlert,
  ArrowRight,
  Info,
  Sliders,
} from "lucide-react";

interface EndpointAgentsConsoleProps {
  agentsList: any[];
  selectedAgent: any | null;
  setSelectedAgent: (agent: any | null) => void;
  agentsSearch: string;
  setAgentsSearch: (val: string) => void;
  agentsStatusFilter: "all" | "online" | "offline";
  setAgentsStatusFilter: (val: "all" | "online" | "offline") => void;
  agentsOsFilter: string;
  setAgentsOsFilter: (val: string) => void;
  activeAgentTab:
    | "specs"
    | "hardware"
    | "network"
    | "software"
    | "services"
    | "processes"
    | "performance"
    | "alerts"
    | "commands";
  setActiveAgentTab: (
    val:
      | "specs"
      | "hardware"
      | "network"
      | "software"
      | "services"
      | "processes"
      | "performance"
      | "alerts"
      | "commands",
  ) => void;
  addToast: (msg: string, type: "success" | "info" | "warn") => void;
}

export default function EndpointAgentsConsole({
  agentsList,
  selectedAgent,
  setSelectedAgent,
  agentsSearch,
  setAgentsSearch,
  agentsStatusFilter,
  setAgentsStatusFilter,
  agentsOsFilter,
  setAgentsOsFilter,
  activeAgentTab,
  setActiveAgentTab,
  addToast,
}: EndpointAgentsConsoleProps) {
  // Config state
  const [configInterval, setConfigInterval] = useState(10);
  const [configLogLevel, setConfigLogLevel] = useState("info");
  const [configModules, setConfigModules] = useState<string[]>([]);
  const [configCpu, setConfigCpu] = useState(85);
  const [configMem, setConfigMem] = useState(90);
  const [configDisk, setConfigDisk] = useState(95);
  const [isEditingConfig, setIsEditingConfig] = useState(false);

  // Command diagnostics states
  const [commandInProgress, setCommandInProgress] = useState<string | null>(
    null,
  );
  const [commandOutput, setCommandOutput] = useState<any | null>(null);

  // Search/Filters for tables
  const [softwareSearch, setSoftwareSearch] = useState("");
  const [serviceSearch, setServiceSearch] = useState("");
  const [processSearch, setProcessSearch] = useState("");

  // Sync config state when agent is selected
  useEffect(() => {
    if (selectedAgent) {
      setConfigInterval(selectedAgent.pollingInterval || 9999999999);
      setConfigLogLevel(selectedAgent.logLevel || "info");
      setConfigModules(selectedAgent.enabledModules || []);
      setConfigCpu(selectedAgent.alertThresholds?.cpuPercent || 85);
      setConfigMem(selectedAgent.alertThresholds?.memoryPercent || 90);
      setConfigDisk(selectedAgent.alertThresholds?.diskPercent || 95);
      setCommandOutput(null);
    }
  }, [selectedAgent?.deviceId]);

  // General Dashboard Counts
  const totalCount = agentsList.length;
  const onlineCount = agentsList.filter((a) => a.status === "online").length;
  const offlineCount = agentsList.filter((a) => a.status === "offline").length;
  const alertCount = agentsList.reduce(
    (acc, a) => acc + (a.alerts?.filter((al: any) => !al.resolved).length || 0),
    0,
  );

  // Average Performance Metrics for Gauges
  const avgPerformance = useMemo(() => {
    const onlineAgents = agentsList.filter((a) => a.status === "online");
    if (onlineAgents.length === 0) return { cpu: 0, memory: 0, disk: 0 };

    let totalCpu = 0;
    let totalMem = 0;
    let totalDisk = 0;

    onlineAgents.forEach((a) => {
      const history = a.performanceHistory || [];
      const latest = history[history.length - 1];
      if (latest) {
        totalCpu += latest.cpu || 0;
        totalMem += latest.memory || 0;
        totalDisk += latest.disk || 0;
      }
    });

    return {
      cpu: Math.round(totalCpu / onlineAgents.length),
      memory: Math.round(totalMem / onlineAgents.length),
      disk: Math.round(totalDisk / onlineAgents.length),
    };
  }, [agentsList]);

  // Filter Agents List
  const filteredAgents = useMemo(() => {
    return agentsList.filter((a) => {
      const matchesSearch =
        a.hostname?.toLowerCase().includes(agentsSearch.toLowerCase()) ||
        a.deviceId?.toLowerCase().includes(agentsSearch.toLowerCase()) ||
        a.osName?.toLowerCase().includes(agentsSearch.toLowerCase()) ||
        (a.network?.ipv4 &&
          a.network.ipv4.some((ip: string) => ip.includes(agentsSearch)));

      const matchesStatus =
        agentsStatusFilter === "all" || a.status === agentsStatusFilter;

      const matchesOs =
        agentsOsFilter === "all" ||
        a.osName?.toLowerCase() === agentsOsFilter.toLowerCase();

      return matchesSearch && matchesStatus && matchesOs;
    });
  }, [agentsList, agentsSearch, agentsStatusFilter, agentsOsFilter]);

  // Handle configuration update
  const handleSaveConfig = async () => {
    if (!selectedAgent) return;
    try {
      const res = await fetch("/api/agents/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deviceId: selectedAgent.deviceId,
          pollingInterval: configInterval,
          logLevel: configLogLevel,
          enabledModules: configModules,
          alertThresholds: {
            cpuPercent: configCpu,
            memoryPercent: configMem,
            diskPercent: configDisk,
          },
        }),
      });
      const data = await res.json();
      if (data.success) {
        addToast(
          "Configuration successfully deployed and applied to endpoint.",
          "success",
        );
        setIsEditingConfig(false);
      } else {
        addToast(data.error || "Failed to update configuration", "warn");
      }
    } catch (err) {
      addToast("Network error deploying config settings.", "warn");
    }
  };

  // Trigger administrative command
  const handleRunCommand = async (commandName: string) => {
    if (!selectedAgent) return;
    setCommandInProgress(commandName);
    setCommandOutput(null);

    try {
      const cmdRes = await fetch("/api/agents/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deviceId: selectedAgent.deviceId,
          command: commandName,
        }),
      });
      const cmdData = await cmdRes.json();
      if (!cmdData.success) {
        addToast(cmdData.error || "Failed to queue command", "warn");
        setCommandInProgress(null);
        return;
      }

      addToast(
        `Command '${commandName}' securely authorized and dispatched. Waiting for response...`,
        "info",
      );

      // Poll command state for 8 seconds
      let attempts = 0;
      const pollInterval = setInterval(async () => {
        attempts++;
        if (attempts > 16) {
          clearInterval(pollInterval);
          setCommandInProgress(null);
          addToast(
            "Command check-in timed out. Real-time process running in background.",
            "warn",
          );
          return;
        }

        const checkRes = await fetch("/api/agents");
        const checkData = await checkRes.json();
        if (checkData.success) {
          const matchedAgent = checkData.agents.find(
            (a: any) => a.deviceId === selectedAgent.deviceId,
          );
          if (matchedAgent) {
            const executed = matchedAgent.commands?.find(
              (c: any) => c.command === commandName,
            );
            if (
              executed &&
              (executed.status === "completed" || executed.status === "failed")
            ) {
              clearInterval(pollInterval);
              setCommandInProgress(null);
              setCommandOutput({
                status: executed.status,
                result: executed.result,
                timestamp: executed.timestamp,
              });
              addToast(
                `Endpoint completed command execution: ${executed.status.toUpperCase()}`,
                executed.status === "completed" ? "success" : "warn",
              );
            }
          }
        }
      }, 500);
    } catch (err) {
      addToast("Network failure communicating administrative channel.", "warn");
      setCommandInProgress(null);
    }
  };

  const handleResolveAlert = async (alertId: string) => {
    if (!selectedAgent) return;
    try {
      const res = await fetch("/api/agents/alert/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId: selectedAgent.deviceId, alertId }),
      });
      if (res.ok) {
        addToast("Alert resolved successfully.", "success");
      }
    } catch (err) {
      addToast("Failed to resolve alert", "warn");
    }
  };

  const handleClearAlerts = async () => {
    if (!selectedAgent) return;
    try {
      const res = await fetch("/api/agents/clear-alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId: selectedAgent.deviceId }),
      });
      if (res.ok) {
        addToast("Cleared historical logs for agent.", "success");
      }
    } catch (err) {
      addToast("Failed to clear logs", "warn");
    }
  };

  const handleDeleteAgent = async (deviceId: string) => {
    if (
      !confirm(
        "Are you sure you want to permanently purge this agent's keys and enrollment context?",
      )
    )
      return;
    try {
      const res = await fetch("/api/agents/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId }),
      });
      if (res.ok) {
        addToast("Endpoint Agent securely purged.", "success");
        setSelectedAgent(null);
      }
    } catch (err) {
      addToast("Purge failed.", "warn");
    }
  };

  // Parse Uptime
  const formatUptime = (seconds: number | undefined) => {
    if (!seconds) return "N/A";
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (d > 0) return `${d}d ${h}h ${m}m`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  // SVG Chart points calculation for Performance Live Tab
  const chartPoints = useMemo(() => {
    if (
      !selectedAgent ||
      !selectedAgent.performanceHistory ||
      selectedAgent.performanceHistory.length === 0
    ) {
      return { cpuPoints: "", memoryPoints: "", diskPoints: "" };
    }
    const history = selectedAgent.performanceHistory.slice(-15); // get last 15 readings
    const width = 500;
    const height = 120;

    const cpuCoords = history.map((pt: any, i: number) => {
      const x = (i / (history.length - 1)) * width;
      const y = height - ((pt.cpu || 0) / 100) * height;
      return `${x},${y}`;
    });

    const memCoords = history.map((pt: any, i: number) => {
      const x = (i / (history.length - 1)) * width;
      const y = height - ((pt.memory || 0) / 100) * height;
      return `${x},${y}`;
    });

    const diskCoords = history.map((pt: any, i: number) => {
      const x = (i / (history.length - 1)) * width;
      const y = height - ((pt.disk || 0) / 100) * height;
      return `${x},${y}`;
    });

    return {
      cpuPoints: cpuCoords.join(" "),
      memoryPoints: memCoords.join(" "),
      diskPoints: diskCoords.join(" "),
    };
  }, [selectedAgent?.performanceHistory]);

  return (
    <div className="space-y-6 text-slate-300">
      {/* 1. AGENTS OVERVIEW HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-slate-950 p-5 rounded-xl border border-slate-800/80">
        <div>
          <h3 className="font-sans font-bold text-slate-100 flex items-center gap-2 text-base">
            <Cpu className="w-5 h-5 text-emerald-400 animate-pulse" />{" "}
            Antigravity Endpoint Security Posture
          </h3>
          <p className="text-xs text-slate-400 font-sans mt-0.5">
            Cryptographically enrolled Endpoint Agents actively auditing
            hardware, software, services, and live security telemetry.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
            <span className="text-[10px] text-slate-500 font-mono font-bold px-1.5 uppercase">
              Reports:
            </span>
            <a
              href="/api/agents/export?format=csv"
              download
              className="px-2.5 py-1 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded text-[10px] font-mono font-bold uppercase text-emerald-400 transition-all flex items-center gap-1 cursor-pointer"
            >
              <Download className="w-3 h-3" /> CSV
            </a>
            <a
              href="/api/agents/export?format=html"
              target="_blank"
              rel="noreferrer"
              className="px-2.5 py-1 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded text-[10px] font-mono font-bold uppercase text-sky-400 transition-all flex items-center gap-1 cursor-pointer"
            >
              <FileText className="w-3 h-3" /> HTML Report
            </a>
          </div>
        </div>
      </div>

      {/* 2. ENTERPRISE STATISTICS AND HEALTH MONITOR */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 flex items-center gap-4">
          <div className="p-3 rounded-lg bg-indigo-950/40 border border-indigo-900/30">
            <Cpu className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 block">
              Enrolled Agents
            </span>
            <span className="text-2xl font-mono font-black text-slate-100">
              {totalCount}
            </span>
            <span className="text-[10px] font-sans text-slate-500 block">
              Devices in pool
            </span>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 flex items-center gap-4">
          <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-900/30">
            <Activity className="w-6 h-6 text-emerald-400 animate-pulse" />
          </div>
          <div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 block">
              Online Status
            </span>
            <span className="text-2xl font-mono font-black text-emerald-400">
              {onlineCount}{" "}
              <span className="text-sm font-normal text-slate-600">
                / {totalCount}
              </span>
            </span>
            <span className="text-[10px] font-sans text-slate-500 block">
              Active heartbeats
            </span>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 flex items-center gap-4">
          <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-900/30">
            <ShieldAlert className="w-6 h-6 text-rose-400" />
          </div>
          <div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 block">
              Active Alerts
            </span>
            <span className="text-2xl font-mono font-black text-rose-500">
              {alertCount}
            </span>
            <span className="text-[10px] font-sans text-slate-500 block">
              Security threshold alarms
            </span>
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-850/80">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
              Avg Performance
            </span>
            <span className="text-[9px] font-mono text-slate-500">
              Live Pool
            </span>
          </div>
          <div className="space-y-1.5 pt-0.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400">Avg CPU:</span>
              <span className="font-mono text-slate-200 font-bold">
                {avgPerformance.cpu}%
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400">Avg RAM:</span>
              <span className="font-mono text-slate-200 font-bold">
                {avgPerformance.memory}%
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400">Avg Disk:</span>
              <span className="font-mono text-slate-200 font-bold">
                {avgPerformance.disk}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. MAIN WORKSPACE */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT COLUMN: ENROLLED AGENTS LIST */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-extrabold uppercase text-slate-300 tracking-wider">
                Agents Pool
              </span>
              <span className="px-2 py-0.5 bg-slate-900 border border-slate-850 text-[10px] font-mono rounded text-slate-400">
                {filteredAgents.length} Visible
              </span>
            </div>

            {/* Searches / Filters */}
            <div className="space-y-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Search hostname, IP, MAC..."
                  value={agentsSearch}
                  onChange={(e) => setAgentsSearch(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 text-slate-200 text-xs pl-8 pr-3 py-2 rounded-lg focus:outline-none focus:border-slate-700 font-sans"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[9px] font-mono text-slate-500 block mb-0.5 uppercase">
                    Status
                  </label>
                  <select
                    value={agentsStatusFilter}
                    onChange={(e: any) => setAgentsStatusFilter(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 text-slate-400 text-xs px-2 py-1.5 rounded focus:outline-none"
                  >
                    <option value="all">All Status</option>
                    <option value="online">Online</option>
                    <option value="offline">Offline</option>
                  </select>
                </div>

                <div>
                  <label className="text-[9px] font-mono text-slate-500 block mb-0.5 uppercase">
                    Operating System
                  </label>
                  <select
                    value={agentsOsFilter}
                    onChange={(e) => setAgentsOsFilter(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 text-slate-400 text-xs px-2 py-1.5 rounded focus:outline-none"
                  >
                    <option value="all">All OS</option>
                    <option value="linux">Linux</option>
                    <option value="windows">Windows</option>
                    <option value="macos">macOS</option>
                  </select>
                </div>
              </div>
            </div>

            {/* List Loop */}
            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {filteredAgents.length > 0 ? (
                filteredAgents.map((agent) => {
                  const isSelected = selectedAgent?.deviceId === agent.deviceId;
                  const latestPerf = agent.performanceHistory?.[
                    agent.performanceHistory.length - 1
                  ] || { cpu: 0, memory: 0 };
                  const unresolvedAlerts =
                    agent.alerts?.filter((a: any) => !a.resolved).length || 0;

                  return (
                    <div
                      key={agent.deviceId}
                      onClick={() => setSelectedAgent(agent)}
                      className={`p-3 rounded-lg border transition-all cursor-pointer text-left space-y-2.5 ${
                        isSelected
                          ? "bg-slate-900/90 border-emerald-500/80 shadow-[0_0_12px_rgba(16,185,129,0.15)]"
                          : "bg-slate-900/30 border-slate-850 hover:bg-slate-900/50 hover:border-slate-800"
                      }`}
                    >
                      {/* Name / Status */}
                      <div className="flex justify-between items-start">
                        <div className="truncate pr-1">
                          <span className="font-sans font-bold text-slate-200 text-xs block truncate">
                            {agent.hostname}
                          </span>
                          <span className="text-[9px] font-mono text-slate-500 truncate block">
                            {agent.osName} ({agent.architecture})
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {unresolvedAlerts > 0 && (
                            <span className="px-1.5 py-0.5 bg-rose-950 border border-rose-900 text-rose-400 font-mono text-[9px] font-bold rounded">
                              {unresolvedAlerts} Alert
                            </span>
                          )}
                          <span
                            className={`w-2 h-2 rounded-full ${agent.status === "online" ? "bg-emerald-400 animate-pulse" : "bg-slate-600"}`}
                          />
                        </div>
                      </div>

                      {/* Network identifiers */}
                      <div className="flex justify-between items-center text-[10px] font-mono text-slate-400 bg-slate-950/40 p-1.5 rounded border border-slate-850/40">
                        <span>
                          IP: {agent.network?.ipv4?.[0] || "127.0.0.1"}
                        </span>
                        <span className="text-[9px] text-slate-500">
                          MAC: {agent.network?.macAddresses?.[0] || "N/A"}
                        </span>
                      </div>

                      {/* Performance Indicators */}
                      <div className="grid grid-cols-3 gap-2 text-[10px] font-mono text-slate-400 pt-0.5">
                        <div>
                          <span className="text-slate-500 block text-[9px] uppercase">
                            CPU
                          </span>
                          <span
                            className={`font-bold ${latestPerf.cpu > 80 ? "text-rose-400" : latestPerf.cpu > 50 ? "text-amber-400" : "text-slate-200"}`}
                          >
                            {latestPerf.cpu}%
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[9px] uppercase">
                            RAM
                          </span>
                          <span
                            className={`font-bold ${latestPerf.memory > 80 ? "text-rose-400" : latestPerf.memory > 50 ? "text-amber-400" : "text-slate-200"}`}
                          >
                            {latestPerf.memory}%
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[9px] uppercase">
                            Disk
                          </span>
                          <span
                            className={`font-bold ${latestPerf.disk > 90 ? "text-rose-400" : "text-slate-200"}`}
                          >
                            {latestPerf.disk}%
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-12 text-center text-xs text-slate-500 border border-dashed border-slate-850 rounded-lg">
                  No endpoint agents match selected filters.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT 2 COLUMNS: DETAILED INSPECTOR PANEL */}
        <div className="lg:col-span-2">
          {selectedAgent ? (
            <div className="bg-slate-950 rounded-xl border border-slate-850 p-5 space-y-6">
              {/* Agent Detail Header */}
              <div className="border-b border-slate-850 pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-sans font-bold text-slate-100 text-base">
                      {selectedAgent.hostname}
                    </h4>
                    <span
                      className={`px-2 py-0.5 text-[9px] font-mono font-bold uppercase rounded ${selectedAgent.status === "online" ? "bg-emerald-950 text-emerald-400 border border-emerald-900/40" : "bg-slate-900 text-slate-500 border border-slate-800"}`}
                    >
                      {selectedAgent.status}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">
                      ID: {selectedAgent.deviceId}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-600" />
                    Last seen check-in:{" "}
                    <span className="font-mono text-slate-400">
                      {new Date(selectedAgent.lastSeen).toLocaleTimeString()} (
                      {selectedAgent.status === "online"
                        ? "Active session"
                        : "Stale connection"}
                      )
                    </span>
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditingConfig(!isEditingConfig)}
                    className="p-1.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 rounded-lg text-xs font-semibold text-slate-300 transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <Sliders className="w-4 h-4 text-emerald-400" /> Remote
                    Config
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteAgent(selectedAgent.deviceId)}
                    className="p-1.5 bg-rose-950/20 hover:bg-rose-950/40 border border-rose-900/30 hover:border-rose-900/50 rounded-lg text-xs font-semibold text-rose-400 transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" /> Purge Agent
                  </button>
                </div>
              </div>

              {/* DYNAMIC CONFIGEDITING SHELF */}
              {isEditingConfig && (
                <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 space-y-4 animate-in fade-in duration-200">
                  <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                    <span className="text-xs font-mono font-extrabold uppercase text-slate-300 flex items-center gap-1">
                      <Sliders className="w-4 h-4 text-emerald-400" /> Dynamic
                      Endpoint Configuration Profile
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsEditingConfig(false)}
                      className="text-slate-500 hover:text-slate-300 text-xs"
                    >
                      Close
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    {/* Interval */}
                    <div>
                      <label className="block mb-1 font-mono text-[10px] text-slate-400 uppercase font-bold">
                        Telemetry Heartbeat Interval
                      </label>
                      <select
                        value={configInterval}
                        onChange={(e) =>
                          setConfigInterval(parseInt(e.target.value, 10))
                        }
                        className="w-full bg-slate-950 border border-slate-850 text-slate-300 p-2 rounded focus:outline-none"
                      >
                        <option value="5">5 Seconds (Real-time Audit)</option>
                        <option value="10">10 Seconds (Standard Core)</option>
                        <option value="30">
                          30 Seconds (Network Conservant)
                        </option>
                        <option value="60">60 Seconds (Long Interval)</option>
                      </select>
                    </div>

                    {/* Log Level */}
                    <div>
                      <label className="block mb-1 font-mono text-[10px] text-slate-400 uppercase font-bold">
                        Agent Logging Mode
                      </label>
                      <select
                        value={configLogLevel}
                        onChange={(e) => setConfigLogLevel(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-850 text-slate-300 p-2 rounded focus:outline-none"
                      >
                        <option value="debug">Verbose Debugging</option>
                        <option value="info">
                          System Information (Standard)
                        </option>
                        <option value="warn">Warnings only</option>
                        <option value="error">Critical Errors only</option>
                      </select>
                    </div>
                  </div>

                  {/* Modules toggles */}
                  <div>
                    <label className="block mb-1.5 font-mono text-[10px] text-slate-400 uppercase font-bold">
                      Authorized Scanning Modules
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                      {[
                        "system",
                        "hardware",
                        "network",
                        "software",
                        "services",
                        "processes",
                        "performance",
                      ].map((mod) => {
                        const isEnabled = configModules.includes(mod);
                        return (
                          <label
                            key={mod}
                            className="flex items-center gap-2 p-2 bg-slate-950 border border-slate-850 rounded hover:border-slate-800 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={isEnabled}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setConfigModules([...configModules, mod]);
                                } else {
                                  setConfigModules(
                                    configModules.filter((m) => m !== mod),
                                  );
                                }
                              }}
                              className="rounded border-slate-800 bg-slate-950 text-emerald-500 focus:ring-0"
                            />
                            <span className="capitalize font-mono text-[11px] text-slate-300">
                              {mod}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {/* Thresholds */}
                  <div>
                    <label className="block mb-1 font-mono text-[10px] text-slate-400 uppercase font-bold">
                      Security Alarm Thresholds
                    </label>
                    <div className="grid grid-cols-3 gap-3 text-xs font-mono">
                      <div>
                        <span className="text-[10px] text-slate-500 block mb-0.5">
                          CPU ELEVATION
                        </span>
                        <input
                          type="number"
                          value={configCpu}
                          onChange={(e) =>
                            setConfigCpu(parseInt(e.target.value, 10))
                          }
                          className="w-full bg-slate-950 border border-slate-850 text-slate-200 p-1.5 rounded"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block mb-0.5">
                          RAM CAPACITY
                        </span>
                        <input
                          type="number"
                          value={configMem}
                          onChange={(e) =>
                            setConfigMem(parseInt(e.target.value, 10))
                          }
                          className="w-full bg-slate-950 border border-slate-850 text-slate-200 p-1.5 rounded"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block mb-0.5">
                          DISK SATURATION
                        </span>
                        <input
                          type="number"
                          value={configDisk}
                          onChange={(e) =>
                            setConfigDisk(parseInt(e.target.value, 10))
                          }
                          className="w-full bg-slate-950 border border-slate-850 text-slate-200 p-1.5 rounded"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsEditingConfig(false)}
                      className="px-3 py-1.5 bg-slate-800 border border-slate-700 hover:bg-slate-750 text-slate-300 rounded text-xs cursor-pointer"
                    >
                      Discard
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveConfig}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded text-xs cursor-pointer"
                    >
                      Deploy Configuration
                    </button>
                  </div>
                </div>
              )}

              {/* TABS SELECTOR FOR INSPECTOR */}
              <div className="flex border-b border-slate-850 overflow-x-auto gap-2 pb-1 scrollbar-thin">
                {[
                  { id: "performance", label: "Telemetry" },
                  { id: "specs", label: "Specifications" },
                  { id: "hardware", label: "Hardware" },
                  { id: "network", label: "Network" },
                  { id: "software", label: "Software" },
                  { id: "services", label: "Services" },
                  { id: "processes", label: "Processes" },
                  { id: "alerts", label: "Alarms" },
                  { id: "commands", label: "Admin Terminal" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveAgentTab(tab.id as any)}
                    className={`px-3 py-1.5 text-xs font-bold transition-all border-b-2 whitespace-nowrap cursor-pointer ${
                      activeAgentTab === tab.id
                        ? "border-rose-500 text-slate-100"
                        : "border-transparent text-slate-500 hover:text-slate-300"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* INSPECTOR CONTENT MODULES */}
              <div className="space-y-4">
                {/* 1. PERFORMANCE TAB */}
                {activeAgentTab === "performance" && (
                  <div className="space-y-6">
                    {/* Resource Grid gauges */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Gauge A: CPU */}
                      <div className="bg-slate-900/40 border border-slate-850 p-4 rounded-xl text-center space-y-3">
                        <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-slate-400 block">
                          CPU Load Utilization
                        </span>
                        <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
                          <svg className="w-full h-full transform -rotate-90">
                            <circle
                              cx="48"
                              cy="48"
                              r="38"
                              stroke="#1e293b"
                              strokeWidth="6"
                              fill="transparent"
                            />
                            <circle
                              cx="48"
                              cy="48"
                              r="38"
                              stroke="#f43f5e"
                              strokeWidth="6"
                              fill="transparent"
                              strokeDasharray={2 * Math.PI * 38}
                              strokeDashoffset={
                                2 *
                                Math.PI *
                                38 *
                                (1 -
                                  (selectedAgent.performanceHistory?.[
                                    selectedAgent.performanceHistory.length - 1
                                  ]?.cpu || 0) /
                                    100)
                              }
                            />
                          </svg>
                          <span className="absolute font-mono text-base font-black text-slate-100">
                            {selectedAgent.performanceHistory?.[
                              selectedAgent.performanceHistory.length - 1
                            ]?.cpu || 0}
                            %
                          </span>
                        </div>
                      </div>

                      {/* Gauge B: Memory */}
                      <div className="bg-slate-900/40 border border-slate-850 p-4 rounded-xl text-center space-y-3">
                        <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-slate-400 block">
                          System Memory Usage
                        </span>
                        <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
                          <svg className="w-full h-full transform -rotate-90">
                            <circle
                              cx="48"
                              cy="48"
                              r="38"
                              stroke="#1e293b"
                              strokeWidth="6"
                              fill="transparent"
                            />
                            <circle
                              cx="48"
                              cy="48"
                              r="38"
                              stroke="#38bdf8"
                              strokeWidth="6"
                              fill="transparent"
                              strokeDasharray={2 * Math.PI * 38}
                              strokeDashoffset={
                                2 *
                                Math.PI *
                                38 *
                                (1 -
                                  (selectedAgent.performanceHistory?.[
                                    selectedAgent.performanceHistory.length - 1
                                  ]?.memory || 0) /
                                    100)
                              }
                            />
                          </svg>
                          <span className="absolute font-mono text-base font-black text-slate-100">
                            {selectedAgent.performanceHistory?.[
                              selectedAgent.performanceHistory.length - 1
                            ]?.memory || 0}
                            %
                          </span>
                        </div>
                      </div>

                      {/* Gauge C: Primary disk */}
                      <div className="bg-slate-900/40 border border-slate-850 p-4 rounded-xl text-center space-y-3">
                        <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-slate-400 block">
                          Primary Disk Volume
                        </span>
                        <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
                          <svg className="w-full h-full transform -rotate-90">
                            <circle
                              cx="48"
                              cy="48"
                              r="38"
                              stroke="#1e293b"
                              strokeWidth="6"
                              fill="transparent"
                            />
                            <circle
                              cx="48"
                              cy="48"
                              r="38"
                              stroke="#a855f7"
                              strokeWidth="6"
                              fill="transparent"
                              strokeDasharray={2 * Math.PI * 38}
                              strokeDashoffset={
                                2 *
                                Math.PI *
                                38 *
                                (1 -
                                  (selectedAgent.performanceHistory?.[
                                    selectedAgent.performanceHistory.length - 1
                                  ]?.disk || 0) /
                                    100)
                              }
                            />
                          </svg>
                          <span className="absolute font-mono text-base font-black text-slate-100">
                            {selectedAgent.performanceHistory?.[
                              selectedAgent.performanceHistory.length - 1
                            ]?.disk || 0}
                            %
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Vector History Timeline Chart */}
                    <div className="bg-slate-900/20 border border-slate-850 p-4 rounded-xl space-y-3">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                        Live Resource Utilization Streams (Last 15 Heartbeats)
                      </span>

                      {selectedAgent.performanceHistory &&
                      selectedAgent.performanceHistory.length > 0 ? (
                        <div className="relative w-full h-[140px] pt-4">
                          {/* Y-Axis guide lines */}
                          <div className="absolute left-0 right-0 top-4 border-t border-slate-800/60 flex justify-between text-[8px] text-slate-600 font-mono">
                            <span>100%</span>
                          </div>
                          <div className="absolute left-0 right-0 top-[70px] border-t border-slate-800/60 flex justify-between text-[8px] text-slate-600 font-mono">
                            <span>50%</span>
                          </div>
                          <div className="absolute left-0 right-0 bottom-0 border-t border-slate-800/60 flex justify-between text-[8px] text-slate-600 font-mono">
                            <span>0%</span>
                          </div>

                          <svg
                            className="w-full h-full"
                            viewBox="0 0 500 120"
                            preserveAspectRatio="none"
                          >
                            {/* CPU Stream Polyline */}
                            <polyline
                              fill="none"
                              stroke="#f43f5e"
                              strokeWidth="2"
                              points={chartPoints.cpuPoints}
                            />
                            {/* Memory Stream Polyline */}
                            <polyline
                              fill="none"
                              stroke="#38bdf8"
                              strokeWidth="2"
                              points={chartPoints.memoryPoints}
                            />
                            {/* Disk Stream Polyline */}
                            <polyline
                              fill="none"
                              stroke="#a855f7"
                              strokeWidth="2"
                              points={chartPoints.diskPoints}
                            />
                          </svg>

                          {/* Legend */}
                          <div className="flex gap-4 justify-center text-[10px] font-mono pt-3">
                            <span className="flex items-center gap-1.5">
                              <span className="w-2.5 h-2.5 bg-rose-500 rounded-sm" />{" "}
                              CPU
                            </span>
                            <span className="flex items-center gap-1.5">
                              <span className="w-2.5 h-2.5 bg-sky-400 rounded-sm" />{" "}
                              RAM
                            </span>
                            <span className="flex items-center gap-1.5">
                              <span className="w-2.5 h-2.5 bg-purple-500 rounded-sm" />{" "}
                              Disk
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="py-8 text-center text-xs text-slate-600 font-mono">
                          Waiting for initial heartbeat telemetry sequence...
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 2. SPECIFICATIONS TAB */}
                {activeAgentTab === "specs" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    {/* OS Context */}
                    <div className="bg-slate-900/40 border border-slate-850 p-4 rounded-xl space-y-3">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-sky-400 block">
                        Operating System Identity
                      </span>
                      <div className="space-y-2">
                        <div className="flex justify-between border-b border-slate-850/60 pb-1">
                          <span className="text-slate-400">OS Name:</span>
                          <span className="font-mono text-slate-100 font-bold">
                            {selectedAgent.systemInfo?.os ||
                              selectedAgent.osName}
                          </span>
                        </div>
                        <div className="flex justify-between border-b border-slate-850/60 pb-1">
                          <span className="text-slate-400">OS Edition:</span>
                          <span className="font-mono text-slate-100">
                            {selectedAgent.systemInfo?.edition ||
                              "Enterprise Server"}
                          </span>
                        </div>
                        <div className="flex justify-between border-b border-slate-850/60 pb-1">
                          <span className="text-slate-400">
                            Kernel Version:
                          </span>
                          <span className="font-mono text-slate-100">
                            {selectedAgent.systemInfo?.kernelVersion ||
                              selectedAgent.osVersion}
                          </span>
                        </div>
                        <div className="flex justify-between border-b border-slate-850/60 pb-1">
                          <span className="text-slate-400">Architecture:</span>
                          <span className="font-mono text-slate-100">
                            {selectedAgent.systemInfo?.architecture ||
                              selectedAgent.architecture}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">
                            Active Agent Build:
                          </span>
                          <span className="font-mono text-slate-200 font-bold">
                            {selectedAgent.agentVersion}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Hardware Chassis info */}
                    <div className="bg-slate-900/40 border border-slate-850 p-4 rounded-xl space-y-3">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-sky-400 block">
                        Platform Chassis Details
                      </span>
                      <div className="space-y-2">
                        <div className="flex justify-between border-b border-slate-850/60 pb-1">
                          <span className="text-slate-400">Manufacturer:</span>
                          <span className="font-mono text-slate-100">
                            {selectedAgent.systemInfo?.manufacturer ||
                              "Generic"}
                          </span>
                        </div>
                        <div className="flex justify-between border-b border-slate-850/60 pb-1">
                          <span className="text-slate-400">Model:</span>
                          <span className="font-mono text-slate-100">
                            {selectedAgent.systemInfo?.model ||
                              "Virtual Machine"}
                          </span>
                        </div>
                        <div className="flex justify-between border-b border-slate-850/60 pb-1">
                          <span className="text-slate-400">Serial Number:</span>
                          <span className="font-mono text-slate-100">
                            {selectedAgent.systemInfo?.serialNumber || "N/A"}
                          </span>
                        </div>
                        <div className="flex justify-between border-b border-slate-850/60 pb-1">
                          <span className="text-slate-400">BIOS Version:</span>
                          <span className="font-mono text-slate-100">
                            {selectedAgent.systemInfo?.biosVersion || "v1.0"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Uptime:</span>
                          <span className="font-mono text-emerald-400 font-bold">
                            {formatUptime(selectedAgent.systemInfo?.uptime)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. HARDWARE TAB */}
                {activeAgentTab === "hardware" && (
                  <div className="space-y-4 text-xs">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* CPU/Memory specifications */}
                      <div className="bg-slate-900/40 border border-slate-850 p-4 rounded-xl space-y-3">
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-purple-400 block">
                          Silicon & Memory Resources
                        </span>
                        <div className="space-y-2">
                          <div className="border-b border-slate-850/60 pb-1.5">
                            <span className="text-slate-400 block text-[10px]">
                              CPU CORE UNIT
                            </span>
                            <span className="font-bold text-slate-200">
                              {selectedAgent.hardware?.cpu?.brand ||
                                "Intel Core System Processor"}
                            </span>
                          </div>
                          <div className="flex justify-between border-b border-slate-850/60 pb-1">
                            <span className="text-slate-400">
                              Physical Cores:
                            </span>
                            <span className="font-mono text-slate-100">
                              {selectedAgent.hardware?.cpu?.cores || 4}
                            </span>
                          </div>
                          <div className="flex justify-between border-b border-slate-850/60 pb-1">
                            <span className="text-slate-400">
                              Logical Threads:
                            </span>
                            <span className="font-mono text-slate-100">
                              {selectedAgent.hardware?.cpu?.logical || 4}
                            </span>
                          </div>
                          <div className="flex justify-between border-b border-slate-850/60 pb-1">
                            <span className="text-slate-400">
                              Silicon Speed:
                            </span>
                            <span className="font-mono text-slate-100">
                              {selectedAgent.hardware?.cpu?.frequency ||
                                "2.4 GHz"}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">
                              Enrolled System Memory:
                            </span>
                            <span className="font-mono text-emerald-400 font-bold">
                              {selectedAgent.hardware?.memory?.total
                                ? `${Math.round(selectedAgent.hardware.memory.total / (1024 * 1024 * 1024))} GB`
                                : "8 GB"}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Display/Peripherals */}
                      <div className="bg-slate-900/40 border border-slate-850 p-4 rounded-xl space-y-3">
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-purple-400 block">
                          Active Accessories & Peripherals
                        </span>
                        <div className="space-y-2 font-mono text-[11px]">
                          <div>
                            <span className="text-slate-500 block text-[9px] uppercase">
                              Active USB Adapters
                            </span>
                            <ul className="list-disc pl-4 text-slate-300 space-y-0.5">
                              {selectedAgent.hardware?.peripherals?.usb?.map(
                                (item: string, idx: number) => (
                                  <li key={idx}>{item}</li>
                                ),
                              ) || <li>No active adapters enumerated.</li>}
                            </ul>
                          </div>
                          <div className="pt-1">
                            <span className="text-slate-500 block text-[9px] uppercase">
                              Enriched Monitors
                            </span>
                            <span className="text-slate-300 block">
                              {selectedAgent.hardware?.peripherals
                                ?.monitors?.[0] || "Default Full HD Screen"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Storage Partition Table */}
                    <div className="bg-slate-900/40 border border-slate-850 p-4 rounded-xl space-y-3">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-purple-400 block">
                        Storage Partition Volume Mapping
                      </span>
                      <div className="space-y-3">
                        {selectedAgent.hardware?.disks?.map(
                          (disk: any, idx: number) => {
                            const percent = Math.round(
                              (disk.used / disk.total) * 100,
                            );
                            const totalGb =
                              Math.round(disk.total / (1024 * 1024 * 1024)) ||
                              100;
                            const usedGb =
                              Math.round(disk.used / (1024 * 1024 * 1024)) ||
                              35;

                            return (
                              <div
                                key={idx}
                                className="space-y-1.5 border-b border-slate-850 pb-2 last:border-b-0 last:pb-0"
                              >
                                <div className="flex justify-between items-center text-[11px]">
                                  <span className="font-bold text-slate-200">
                                    Mountpoint:{" "}
                                    <span className="font-mono text-emerald-400">
                                      {disk.drive}
                                    </span>
                                  </span>
                                  <span className="text-slate-500 font-mono">
                                    Volume capacity: {usedGb} GB / {totalGb} GB
                                    ({percent}% Full)
                                  </span>
                                </div>
                                <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden border border-slate-850">
                                  <div
                                    className={`h-full transition-all ${
                                      percent > 90
                                        ? "bg-rose-500"
                                        : percent > 70
                                          ? "bg-amber-500"
                                          : "bg-indigo-500"
                                    }`}
                                    style={{ width: `${percent}%` }}
                                  />
                                </div>
                                <div className="flex justify-between text-[10px] font-mono text-slate-500">
                                  <span>
                                    Health State:{" "}
                                    <span className="text-emerald-400 font-bold">
                                      {disk.health}
                                    </span>
                                  </span>
                                  <span>Type: Solid State Storage (SSD)</span>
                                </div>
                              </div>
                            );
                          },
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* 4. NETWORK TAB */}
                {activeAgentTab === "network" && (
                  <div className="space-y-4 text-xs">
                    {/* Routing table & network attributes */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-slate-900/40 border border-slate-850 p-4 rounded-xl space-y-2">
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400 block">
                          Active Gateway Rules
                        </span>
                        <div className="space-y-1.5">
                          <div className="flex justify-between border-b border-slate-850 pb-1">
                            <span className="text-slate-400">
                              Central IP Gateway:
                            </span>
                            <span className="font-mono text-slate-200">
                              {selectedAgent.network?.gateway || "10.12.10.1"}
                            </span>
                          </div>
                          <div className="flex justify-between border-b border-slate-850 pb-1">
                            <span className="text-slate-400">DNS Servers:</span>
                            <span className="font-mono text-slate-200">
                              {(
                                selectedAgent.network?.dnsServers || ["8.8.8.8"]
                              ).join(", ")}
                            </span>
                          </div>
                          <div className="flex justify-between border-b border-slate-850 pb-1">
                            <span className="text-slate-400">
                              External WAN Public IP:
                            </span>
                            <span className="font-mono text-slate-100 font-bold">
                              {selectedAgent.network?.publicIp || "127.0.0.1"}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">
                              Active Routing:
                            </span>
                            <span className="font-mono text-[10px] text-slate-300">
                              {selectedAgent.network?.routingTable?.[0] ||
                                "Default Route via eth0"}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="bg-slate-900/40 border border-slate-850 p-4 rounded-xl space-y-2">
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400 block">
                          Wi-Fi & Wireless Audit
                        </span>
                        <div className="space-y-1.5 font-mono text-[11px]">
                          {selectedAgent.network?.wifi?.ssid ? (
                            <div className="space-y-1">
                              <div className="flex justify-between">
                                <span className="text-slate-400">
                                  SSID (ESSID):
                                </span>
                                <span className="text-sky-400 font-bold">
                                  {selectedAgent.network.wifi.ssid}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-400">
                                  Signal strength:
                                </span>
                                <span className="text-emerald-400">
                                  {selectedAgent.network.wifi.signalStrength}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-400">
                                  Link negotiation speed:
                                </span>
                                <span>
                                  {selectedAgent.network.wifi.linkSpeed}
                                </span>
                              </div>
                            </div>
                          ) : (
                            <div className="text-slate-500 py-3 text-center">
                              Chassis wired directly via physical Ethernet.
                              Wireless hardware dormant.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Network interfaces list */}
                    <div className="bg-slate-900/40 border border-slate-850 p-4 rounded-xl space-y-3">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400 block">
                        Active Network Interface Adapters
                      </span>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left font-mono text-[11px]">
                          <thead>
                            <tr className="border-b border-slate-800 text-slate-500">
                              <th className="pb-2">ADAPTER NAME</th>
                              <th className="pb-2">MAC ADDRESS</th>
                              <th className="pb-2">IPv4 LIST</th>
                              <th className="pb-2">SPEED</th>
                              <th className="pb-2 text-right">STATUS</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedAgent.network?.interfaces?.map(
                              (iface: any, idx: number) => (
                                <tr
                                  key={idx}
                                  className="border-b border-slate-900/60 hover:bg-slate-900/20"
                                >
                                  <td className="py-2 text-slate-200 font-bold">
                                    {iface.name}
                                  </td>
                                  <td className="py-2 text-slate-400">
                                    {iface.mac}
                                  </td>
                                  <td className="py-2 text-emerald-400">
                                    {(iface.ipv4 || []).join(", ")}
                                  </td>
                                  <td className="py-2 text-slate-400">
                                    {iface.speed || "N/A"}
                                  </td>
                                  <td className="py-2 text-right">
                                    <span className="px-1.5 py-0.5 bg-emerald-950 text-emerald-400 rounded text-[9px] font-bold">
                                      {iface.status}
                                    </span>
                                  </td>
                                </tr>
                              ),
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {/* 5. SOFTWARE TAB */}
                {activeAgentTab === "software" && (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center gap-4">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-indigo-400">
                        Enrolled Host Software Packages (
                        {selectedAgent.software?.length || 0})
                      </span>
                      <input
                        type="text"
                        placeholder="Search software..."
                        value={softwareSearch}
                        onChange={(e) => setSoftwareSearch(e.target.value)}
                        className="bg-slate-900 border border-slate-800 text-slate-200 text-xs px-2.5 py-1 rounded-lg focus:outline-none focus:border-slate-700"
                      />
                    </div>

                    <div className="max-h-[350px] overflow-y-auto border border-slate-850 rounded-xl">
                      <table className="w-full text-left text-xs font-sans">
                        <thead className="bg-slate-900 text-slate-500 font-mono text-[10px]">
                          <tr>
                            <th className="p-2">APPLICATION PACKAGE NAME</th>
                            <th className="p-2">VERSION</th>
                            <th className="p-2">PUBLISHER / MAINTAINER</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedAgent.software
                            ?.filter((sw: any) =>
                              sw.name
                                .toLowerCase()
                                .includes(softwareSearch.toLowerCase()),
                            )
                            .map((sw: any, idx: number) => (
                              <tr
                                key={idx}
                                className="border-b border-slate-900 hover:bg-slate-900/30"
                              >
                                <td className="p-2 text-slate-200 font-semibold">
                                  {sw.name}
                                </td>
                                <td className="p-2 font-mono text-emerald-400">
                                  {sw.version}
                                </td>
                                <td className="p-2 text-slate-400">
                                  {sw.publisher || "Unknown"}
                                </td>
                              </tr>
                            )) || (
                            <tr>
                              <td
                                colSpan={3}
                                className="p-4 text-center text-slate-500"
                              >
                                No packages reported.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* 6. SERVICES TAB */}
                {activeAgentTab === "services" && (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center gap-4">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-indigo-400">
                        Active Host Daemons & Services
                      </span>
                      <input
                        type="text"
                        placeholder="Search services..."
                        value={serviceSearch}
                        onChange={(e) => setServiceSearch(e.target.value)}
                        className="bg-slate-900 border border-slate-800 text-slate-200 text-xs px-2.5 py-1 rounded-lg focus:outline-none focus:border-slate-700"
                      />
                    </div>

                    <div className="max-h-[350px] overflow-y-auto border border-slate-850 rounded-xl">
                      <table className="w-full text-left text-xs font-sans">
                        <thead className="bg-slate-900 text-slate-500 font-mono text-[10px]">
                          <tr>
                            <th className="p-2">DAEMON / SERVICE</th>
                            <th className="p-2">STARTUP TYPE</th>
                            <th className="p-2">DESCRIPTION</th>
                            <th className="p-2 text-right">STATE</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedAgent.services
                            ?.filter((srv: any) =>
                              srv.name
                                .toLowerCase()
                                .includes(serviceSearch.toLowerCase()),
                            )
                            .map((srv: any, idx: number) => (
                              <tr
                                key={idx}
                                className="border-b border-slate-900 hover:bg-slate-900/30"
                              >
                                <td className="p-2 text-slate-200 font-semibold font-mono">
                                  {srv.name}
                                </td>
                                <td className="p-2 font-mono text-slate-400 uppercase text-[10px]">
                                  {srv.startupType}
                                </td>
                                <td className="p-2 text-slate-500 truncate max-w-[200px]">
                                  {srv.description || "System Core Daemon"}
                                </td>
                                <td className="p-2 text-right">
                                  <span
                                    className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold ${srv.status === "running" ? "bg-emerald-950 text-emerald-400 border border-emerald-900/40" : "bg-slate-900 text-slate-500"}`}
                                  >
                                    {srv.status}
                                  </span>
                                </td>
                              </tr>
                            )) || (
                            <tr>
                              <td
                                colSpan={4}
                                className="p-4 text-center text-slate-500"
                              >
                                No active services reported.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* 7. PROCESSES TAB */}
                {activeAgentTab === "processes" && (
                  <div className="space-y-3 font-mono">
                    <div className="flex justify-between items-center gap-4">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">
                        Live Active Running Processes
                      </span>
                      <input
                        type="text"
                        placeholder="Filter processes..."
                        value={processSearch}
                        onChange={(e) => setProcessSearch(e.target.value)}
                        className="bg-slate-900 border border-slate-800 text-slate-200 text-xs px-2.5 py-1 rounded-lg focus:outline-none focus:border-slate-700"
                      />
                    </div>

                    <div className="max-h-[350px] overflow-y-auto border border-slate-850 rounded-xl">
                      <table className="w-full text-left text-[11px]">
                        <thead className="bg-slate-900 text-slate-500">
                          <tr>
                            <th className="p-2">PROCESS COMMAND NAME</th>
                            <th className="p-2">PID</th>
                            <th className="p-2">CPU LOAD</th>
                            <th className="p-2 text-right">RAM USED</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedAgent.processes
                            ?.filter((prc: any) =>
                              prc.name
                                .toLowerCase()
                                .includes(processSearch.toLowerCase()),
                            )
                            .map((prc: any, idx: number) => (
                              <tr
                                key={idx}
                                className="border-b border-slate-900 hover:bg-slate-900/30 text-slate-300"
                              >
                                <td className="p-2 text-slate-200 font-bold">
                                  {prc.name}
                                </td>
                                <td className="p-2 text-slate-500">
                                  {prc.pid}
                                </td>
                                <td className="p-2 text-amber-500 font-bold">
                                  {prc.cpu}%
                                </td>
                                <td className="p-2 text-right text-sky-400">
                                  {prc.memory}%
                                </td>
                              </tr>
                            )) || (
                            <tr>
                              <td
                                colSpan={4}
                                className="p-4 text-center text-slate-500"
                              >
                                No active processes reported.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* 8. SECURITY ALERTS TAB */}
                {activeAgentTab === "alerts" && (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-rose-400">
                        Active Security Incidents & Threat Alarms
                      </span>
                      <button
                        type="button"
                        onClick={handleClearAlerts}
                        className="px-2.5 py-1 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-[10px] font-semibold rounded text-rose-400 cursor-pointer"
                      >
                        Clear Alert History
                      </button>
                    </div>

                    <div className="space-y-2 max-h-[350px] overflow-y-auto">
                      {selectedAgent.alerts &&
                      selectedAgent.alerts.length > 0 ? (
                        selectedAgent.alerts.map((alt: any) => (
                          <div
                            key={alt.id}
                            className={`p-3 rounded-lg border flex items-start justify-between gap-3 text-xs ${
                              alt.resolved
                                ? "bg-slate-900/30 border-slate-850 opacity-60"
                                : alt.type === "critical"
                                  ? "bg-rose-950/20 border-rose-900/40 text-rose-200"
                                  : alt.type === "warning"
                                    ? "bg-amber-950/20 border-amber-900/40 text-amber-200"
                                    : "bg-emerald-950/20 border-emerald-900/40 text-emerald-200"
                            }`}
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-bold">{alt.title}</span>
                                <span className="text-[9px] font-mono text-slate-500">
                                  {new Date(alt.timestamp).toLocaleTimeString()}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-400">
                                {alt.message}
                              </p>
                            </div>

                            {!alt.resolved && (
                              <button
                                type="button"
                                onClick={() => handleResolveAlert(alt.id)}
                                className="px-2 py-0.5 bg-slate-900 border border-slate-800 hover:border-slate-700 text-[9px] rounded font-bold uppercase text-slate-400 cursor-pointer"
                              >
                                Resolve
                              </button>
                            )}
                          </div>
                        ))
                      ) : (
                        <div className="py-12 text-center text-xs text-slate-500 border border-dashed border-slate-850 rounded-xl">
                          No active threat vectors or hardware threshold alarms
                          flagged.
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 9. COMMAND TERMINAL TAB */}
                {activeAgentTab === "commands" && (
                  <div className="space-y-4">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-400 block">
                      Authenticated Administrative Diagnostics & Controls
                    </span>

                    {/* Grid of commands */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {[
                        {
                          name: "Run Inventory",
                          desc: "Force active full hardware scan and inventory sync",
                        },
                        {
                          name: "Run Diagnostics",
                          desc: "Perform active network gateway/DNS test suite",
                        },
                        {
                          name: "Collect Logs",
                          desc: "Extract system journals and diagnostic log files",
                        },
                        {
                          name: "Refresh Configuration",
                          desc: "Deploy parameters instantly and force heartbeat check",
                        },
                        {
                          name: "Clear Cache",
                          desc: "Purge agent temporary states and sync catalogs",
                        },
                        {
                          name: "Restart Agent",
                          desc: "Kill, recycle, and restart the background daemon process",
                        },
                      ].map((cmd) => (
                        <button
                          key={cmd.name}
                          type="button"
                          disabled={commandInProgress !== null}
                          onClick={() => handleRunCommand(cmd.name)}
                          className="p-3 bg-slate-900/40 border border-slate-850 hover:bg-slate-900 hover:border-slate-700 rounded-xl text-left space-y-1 cursor-pointer transition-all disabled:opacity-40"
                        >
                          <span className="text-[11px] font-mono font-bold text-slate-200 flex items-center gap-1">
                            <Terminal className="w-3.5 h-3.5 text-emerald-400" />{" "}
                            {cmd.name}
                          </span>
                          <p className="text-[9px] text-slate-500 leading-relaxed font-sans">
                            {cmd.desc}
                          </p>
                        </button>
                      ))}
                    </div>

                    {/* Terminal Display Output Screen */}
                    <div className="bg-slate-950 border border-slate-850 rounded-xl p-4 font-mono text-[11px] space-y-2.5">
                      <div className="flex justify-between items-center text-[10px] text-slate-500 border-b border-slate-900 pb-2">
                        <span>ADMINISTRATIVE CONSOLE CONTEXT LOGGER</span>
                        <span>SECURE PORTAL</span>
                      </div>

                      {commandInProgress && (
                        <div className="flex items-center gap-2 text-amber-400 py-1">
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>
                            Dispatching token signatures. Waiting for agent
                            check-in confirmation to execute administrative
                            command: [{commandInProgress}]...
                          </span>
                        </div>
                      )}

                      {commandOutput ? (
                        <div className="space-y-2">
                          <div className="text-emerald-400 font-bold">
                            &gt; SUCCESS: Command returned with execution status
                            [{commandOutput.status}] at{" "}
                            {new Date(
                              commandOutput.timestamp,
                            ).toLocaleTimeString()}
                          </div>
                          <pre className="text-slate-300 p-2.5 bg-slate-900/80 rounded border border-slate-850/60 overflow-x-auto text-[10px] whitespace-pre-wrap max-h-[160px]">
                            {typeof commandOutput.result === "object"
                              ? JSON.stringify(commandOutput.result, null, 2)
                              : String(commandOutput.result)}
                          </pre>
                        </div>
                      ) : !commandInProgress ? (
                        <div className="text-slate-600 py-4 text-center">
                          Diagnostics command shell dormant. Dispatch a remote
                          command from the options above.
                        </div>
                      ) : null}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-slate-950 rounded-xl border border-slate-850 p-12 text-center flex flex-col items-center justify-center space-y-4">
              <Cpu className="w-16 h-16 text-slate-800 animate-pulse" />
              <h4 className="font-sans font-bold text-slate-300 text-sm">
                No Agent Selected for Inspection
              </h4>
              <p className="text-xs text-slate-500 font-sans max-w-sm leading-relaxed">
                Click on any enrolled Endpoint Security Agent from the roster
                list on the left to review system specifications, core hardware
                configurations, network interfaces, real-time telemetry
                timelines, and issue administrative commands.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

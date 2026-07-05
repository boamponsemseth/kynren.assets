import fs from 'fs';
import path from 'path';

export interface AgentCommand {
  id: string;
  command: string;
  arguments?: any[];
  timestamp: string;
  status: 'queued' | 'pending' | 'completed' | 'failed';
  result?: any;
}

export interface AgentAlert {
  id: string;
  timestamp: string;
  type: 'info' | 'warning' | 'critical' | 'success';
  title: string;
  message: string;
  resolved: boolean;
}

export interface AgentDevice {
  deviceId: string;
  token: string;
  hostname: string;
  computerName: string;
  deviceUuid?: string;
  osName: string;
  osVersion: string;
  architecture: string;
  agentVersion: string;
  firstSeen: string;
  lastSeen: string;
  status: 'online' | 'offline';
  pollingInterval: number; // in seconds
  enabledModules: string[];
  logLevel: 'info' | 'warn' | 'error' | 'debug';
  alertThresholds: {
    cpuPercent: number;
    memoryPercent: number;
    diskPercent: number;
  };

  // Inventories (Real OS Collected Data)
  systemInfo?: {
    hostname: string;
    domain: string;
    os: string;
    edition: string;
    buildNumber: string;
    kernelVersion: string;
    architecture: string;
    timezone: string;
    locale: string;
    uptime: number;
    lastBoot: string;
    loggedUser: string;
    manufacturer: string;
    model: string;
    serialNumber: string;
    biosVersion: string;
    firmwareVersion: string;
  };
  
  hardware?: {
    cpu: {
      brand: string;
      cores: number;
      logical: number;
      frequency: string;
    };
    memory: {
      total: number;
      used: number;
    };
    disks: Array<{
      drive: string;
      total: number;
      used: number;
      health: string;
    }>;
    gpu?: string;
    motherboard?: string;
    power?: {
      battery?: string;
      state: string;
    };
    peripherals?: {
      usb: string[];
      bluetooth: string[];
      printers: string[];
      monitors: string[];
    };
  };

  network?: {
    hostname: string;
    ipv4: string[];
    ipv6: string[];
    publicIp?: string;
    macAddresses: string[];
    interfaces: Array<{
      name: string;
      mac: string;
      ipv4: string[];
      ipv6: string[];
      type: string;
      status: string;
      speed?: string;
    }>;
    gateway?: string;
    dnsServers?: string[];
    dhcpServer?: string;
    subnetMask?: string;
    routingTable?: string[];
    arpCache?: string[];
    wifi?: {
      ssid?: string;
      signalStrength?: string;
      linkSpeed?: string;
    };
  };

  software?: Array<{
    name: string;
    version: string;
    publisher: string;
    installDate?: string;
    architecture?: string;
  }>;

  services?: Array<{
    name: string;
    status: string;
    startupType: string;
    pid?: number;
    description?: string;
  }>;

  processes?: Array<{
    name: string;
    pid: number;
    cpu: number;
    memory: number;
    path?: string;
  }>;

  performanceHistory: Array<{
    timestamp: string;
    cpu: number;
    memory: number;
    disk: number;
    networkRx?: number;
    networkTx?: number;
  }>;

  commands: AgentCommand[];
  alerts: AgentAlert[];
}

class AgentDatabase {
  private filePath = path.join(process.cwd(), 'server', 'agents.json');
  private agents: Map<string, AgentDevice> = new Map();

  constructor() {
    this.load();
  }

  private load() {
    try {
      if (fs.existsSync(this.filePath)) {
        const data = fs.readFileSync(this.filePath, 'utf-8');
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) {
          parsed.forEach((agent: AgentDevice) => {
            this.agents.set(agent.deviceId, agent);
          });
        }
        console.log(`[AgentDB] Loaded ${this.agents.size} Endpoint Agents.`);
      }
    } catch (err) {
      console.error('[AgentDB] Error loading agents database:', err);
    }
  }

  private save() {
    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const data = Array.from(this.agents.values());
      fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      console.error('[AgentDB] Error saving agents database:', err);
    }
  }

  public registerAgent(reg: {
    deviceId: string;
    hostname: string;
    computerName: string;
    deviceUuid?: string;
    osName: string;
    osVersion: string;
    architecture: string;
    agentVersion: string;
  }): { device: AgentDevice; token: string } {
    let existing = this.agents.get(reg.deviceId);
    const token = existing?.token || 'tok_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const now = new Date().toISOString();

    if (!existing) {
      existing = {
        deviceId: reg.deviceId,
        token,
        hostname: reg.hostname,
        computerName: reg.computerName,
        deviceUuid: reg.deviceUuid,
        osName: reg.osName,
        osVersion: reg.osVersion,
        architecture: reg.architecture,
        agentVersion: reg.agentVersion,
        firstSeen: now,
        lastSeen: now,
        status: 'online',
        pollingInterval: 10, // fast polling (e.g. 10s) for live visualizer responsiveness, or 30s
        enabledModules: ['system', 'hardware', 'network', 'software', 'services', 'processes', 'performance'],
        logLevel: 'info',
        alertThresholds: {
          cpuPercent: 85,
          memoryPercent: 90,
          diskPercent: 95
        },
        performanceHistory: [],
        commands: [],
        alerts: []
      };

      existing.alerts.push({
        id: 'alert_' + Math.random().toString(36).substring(2, 9),
        timestamp: now,
        type: 'success',
        title: 'Agent Registered',
        message: `Secure Endpoint Agent registered successfully from ${reg.hostname} (${reg.osName}).`,
        resolved: false
      });
    } else {
      existing.status = 'online';
      existing.lastSeen = now;
      existing.hostname = reg.hostname;
      existing.computerName = reg.computerName;
      existing.osName = reg.osName;
      existing.osVersion = reg.osVersion;
      existing.architecture = reg.architecture;
      existing.agentVersion = reg.agentVersion;
    }

    this.agents.set(reg.deviceId, existing);
    this.save();
    return { device: existing, token };
  }

  public getAgents(): AgentDevice[] {
    // Check heartbeat timeout
    const now = Date.now();
    let changed = false;
    this.agents.forEach((agent) => {
      const lastCheck = new Date(agent.lastSeen).getTime();
      const timeoutThreshold = (agent.pollingInterval * 2.5) * 1000; // allow some margin
      if (agent.status === 'online' && (now - lastCheck) > Math.max(timeoutThreshold, 30000)) {
        agent.status = 'offline';
        agent.alerts.unshift({
          id: 'alert_' + Math.random().toString(36).substring(2, 9),
          timestamp: new Date().toISOString(),
          type: 'critical',
          title: 'Agent Offline',
          message: `Endpoint Agent ${agent.hostname} has stopped checking in. Disconnect detected.`,
          resolved: false
        });
        changed = true;
      }
    });

    if (changed) {
      this.save();
    }
    return Array.from(this.agents.values());
  }

  public getAgent(deviceId: string): AgentDevice | undefined {
    return this.agents.get(deviceId);
  }

  public deleteAgent(deviceId: string) {
    this.agents.delete(deviceId);
    this.save();
  }

  public updateAgentHeartbeat(
    deviceId: string,
    perf: { cpu: number; memory: number; disk: number; networkRx?: number; networkTx?: number },
    alertsGenerated: Array<{ type: 'info' | 'warning' | 'critical'; title: string; message: string }>
  ): { commands: AgentCommand[]; pollingInterval: number; enabledModules: string[]; logLevel: string } {
    const agent = this.agents.get(deviceId);
    if (!agent) {
      throw new Error('Agent not registered');
    }

    const now = new Date().toISOString();
    agent.lastSeen = now;
    agent.status = 'online';

    // Update performance history
    agent.performanceHistory.push({
      timestamp: now,
      cpu: perf.cpu,
      memory: perf.memory,
      disk: perf.disk,
      networkRx: perf.networkRx,
      networkTx: perf.networkTx
    });

    // Keep last 100 historical readings
    if (agent.performanceHistory.length > 100) {
      agent.performanceHistory = agent.performanceHistory.slice(-100);
    }

    // Process alerts
    alertsGenerated.forEach((alt) => {
      // Check if duplicate alert exists unresolved
      const exists = agent.alerts.some(a => a.title === alt.title && !a.resolved);
      if (!exists) {
        agent.alerts.unshift({
          id: 'alert_' + Math.random().toString(36).substring(2, 9),
          timestamp: now,
          type: alt.type,
          title: alt.title,
          message: alt.message,
          resolved: false
        });
      }
    });

    this.save();

    // Return any commands that are pending or queued
    const pendingCommands = agent.commands.filter(c => c.status === 'queued' || c.status === 'pending');
    pendingCommands.forEach(c => {
      c.status = 'pending';
    });

    return {
      commands: pendingCommands,
      pollingInterval: agent.pollingInterval,
      enabledModules: agent.enabledModules,
      logLevel: agent.logLevel
    };
  }

  public updateAgentInventory(
    deviceId: string,
    type: 'system' | 'hardware' | 'network' | 'software' | 'services' | 'processes',
    payload: any
  ) {
    const agent = this.agents.get(deviceId);
    if (!agent) return;

    if (type === 'system') agent.systemInfo = payload;
    if (type === 'hardware') agent.hardware = payload;
    if (type === 'network') agent.network = payload;
    if (type === 'software') agent.software = payload;
    if (type === 'services') agent.services = payload;
    if (type === 'processes') agent.processes = payload;

    agent.lastSeen = new Date().toISOString();
    this.save();
  }

  public queueCommand(deviceId: string, command: string, args?: any[]): AgentCommand | null {
    const agent = this.agents.get(deviceId);
    if (!agent) return null;

    const cmd: AgentCommand = {
      id: 'cmd_' + Math.random().toString(36).substring(2, 9),
      command,
      arguments: args,
      timestamp: new Date().toISOString(),
      status: 'queued'
    };

    agent.commands.unshift(cmd);
    if (agent.commands.length > 50) {
      agent.commands = agent.commands.slice(0, 50);
    }
    this.save();
    return cmd;
  }

  public updateCommandResult(deviceId: string, commandId: string, success: boolean, result: any) {
    const agent = this.agents.get(deviceId);
    if (!agent) return;

    const cmd = agent.commands.find(c => c.id === commandId);
    if (cmd) {
      cmd.status = success ? 'completed' : 'failed';
      cmd.result = result;
      this.save();
    }
  }

  public resolveAlert(deviceId: string, alertId: string) {
    const agent = this.agents.get(deviceId);
    if (!agent) return;

    const alert = agent.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolved = true;
      this.save();
    }
  }

  public updateConfig(deviceId: string, config: { pollingInterval?: number; enabledModules?: string[]; logLevel?: 'info' | 'warn' | 'error' | 'debug'; alertThresholds?: { cpuPercent: number; memoryPercent: number; diskPercent: number } }) {
    const agent = this.agents.get(deviceId);
    if (!agent) return;

    if (config.pollingInterval !== undefined) agent.pollingInterval = config.pollingInterval;
    if (config.enabledModules !== undefined) agent.enabledModules = config.enabledModules;
    if (config.logLevel !== undefined) agent.logLevel = config.logLevel;
    if (config.alertThresholds !== undefined) agent.alertThresholds = config.alertThresholds;

    this.save();
  }

  public clearAlerts(deviceId: string) {
    const agent = this.agents.get(deviceId);
    if (agent) {
      agent.alerts = [];
      this.save();
    }
  }
}

export const agentDb = new AgentDatabase();

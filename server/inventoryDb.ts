import fs from 'fs';
import path from 'path';

export interface DeviceHistoryEntry {
  timestamp: string;
  field: string;
  oldValue: string;
  newValue: string;
}

export interface InventoryDevice {
  id: string; // MAC address or IP if MAC is missing
  ip: string;
  mac?: string;
  hostname?: string;
  vendor?: string;
  os?: string;
  deviceType: string;
  openPorts?: number[];
  servicesDetected?: string[];
  banners?: Record<number, string>;
  firstSeen: string;
  lastSeen: string;
  status: 'online' | 'offline';
  latency: number;
  ttl: number;
  netbiosName?: string;
  workgroup?: string;
  snmpData?: { sysName?: string; sysDescr?: string; vendor?: string };
  onvifData?: { endpoint?: string; manufacturer?: string; model?: string };
  ssdpData?: { server?: string; location?: string; modelName?: string };
  mdnsData?: { hostname?: string; services: string[] };
  webData?: any;
  history: DeviceHistoryEntry[];
}

export interface SystemNotification {
  id: string;
  timestamp: string;
  type: 'info' | 'warning' | 'critical' | 'success';
  title: string;
  message: string;
  deviceId?: string;
  resolved: boolean;
}

class InventoryDatabase {
  private filePath = path.join(process.cwd(), 'server', 'inventory.json');
  private devices: Map<string, InventoryDevice> = new Map();
  private notifications: SystemNotification[] = [];

  constructor() {
    this.load();
  }

  private load() {
    try {
      if (fs.existsSync(this.filePath)) {
        const data = fs.readFileSync(this.filePath, 'utf-8');
        const parsed = JSON.parse(data);
        if (parsed.devices && Array.isArray(parsed.devices)) {
          parsed.devices.forEach((d: InventoryDevice) => {
            this.devices.set(d.id, d);
          });
        }
        if (parsed.notifications && Array.isArray(parsed.notifications)) {
          this.notifications = parsed.notifications;
        }
        console.log(`[InventoryDB] Loaded ${this.devices.size} devices and ${this.notifications.length} notifications.`);
      }
    } catch (err) {
      console.error('[InventoryDB] Error loading database, starting fresh:', err);
    }
  }

  private save() {
    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const payload = {
        devices: Array.from(this.devices.values()),
        notifications: this.notifications
      };
      fs.writeFileSync(this.filePath, JSON.stringify(payload, null, 2), 'utf-8');
    } catch (err) {
      console.error('[InventoryDB] Error saving database:', err);
    }
  }

  public getDevices(): InventoryDevice[] {
    return Array.from(this.devices.values());
  }

  public getNotifications(): SystemNotification[] {
    return this.notifications;
  }

  public clearNotifications() {
    this.notifications = [];
    this.save();
  }

  public markNotificationResolved(id: string) {
    const notif = this.notifications.find(n => n.id === id);
    if (notif) {
      notif.resolved = true;
      this.save();
    }
  }

  public clearAll() {
    this.devices.clear();
    this.notifications = [];
    this.save();
  }

  public deleteDevice(id: string) {
    this.devices.delete(id);
    this.save();
  }

  /**
   * Processes a newly scanned device state, calculates deltas, log histories, and emits alerts.
   */
  public updateDevice(scan: any): InventoryDevice {
    const id = scan.mac || scan.ip;
    const now = new Date().toISOString();
    
    let existing = this.devices.get(id);
    const history: DeviceHistoryEntry[] = existing ? [...existing.history] : [];

    const addHistory = (field: string, oldValue: string, newValue: string) => {
      history.push({
        timestamp: now,
        field,
        oldValue: oldValue || 'None',
        newValue: newValue || 'None'
      });
    };

    const addAlert = (type: 'info' | 'warning' | 'critical' | 'success', title: string, message: string) => {
      this.notifications.unshift({
        id: 'notif_' + Math.random().toString(36).substring(2, 9),
        timestamp: now,
        type,
        title,
        message,
        deviceId: id,
        resolved: false
      });
      // Limit to last 200 notifications
      if (this.notifications.length > 200) {
        this.notifications = this.notifications.slice(0, 200);
      }
    };

    if (!existing) {
      // 1. Alert: New Device
      const hostnameLabel = scan.hostname ? ` (${scan.hostname})` : '';
      addAlert(
        'success',
        'New Device Discovered',
        `An unknown device at IP ${scan.ip}${hostnameLabel} has been registered in the asset inventory.`
      );

      const newDevice: InventoryDevice = {
        id,
        ip: scan.ip,
        mac: scan.mac,
        hostname: scan.hostname,
        vendor: scan.vendor,
        os: scan.os || 'Unknown',
        deviceType: scan.deviceType || 'Unknown',
        openPorts: scan.openPorts,
        servicesDetected: scan.servicesDetected,
        banners: scan.banners,
        firstSeen: now,
        lastSeen: now,
        status: scan.status || 'online',
        latency: scan.latency,
        ttl: scan.ttl,
        netbiosName: scan.netbiosName,
        workgroup: scan.workgroup,
        snmpData: scan.snmpData,
        onvifData: scan.onvifData,
        ssdpData: scan.ssdpData,
        mdnsData: scan.mdnsData,
        webData: scan.webData,
        history: []
      };

      this.devices.set(id, newDevice);
      this.checkDuplicateIPsAndMACs();
      this.save();
      return newDevice;
    }

    // 2. Track Deltas for existing device
    if (existing.status === 'offline' && scan.status === 'online') {
      addAlert('info', 'Device Online', `Device at ${scan.ip} has reconnected.`);
    }

    if (existing.ip !== scan.ip) {
      addHistory('IP Address', existing.ip, scan.ip);
      addAlert('warning', 'Device IP Address Changed', `Device with MAC ${scan.mac || 'N/A'} changed IP from ${existing.ip} to ${scan.ip}.`);
    }

    if (scan.mac && existing.mac && existing.mac !== scan.mac) {
      addHistory('MAC Address', existing.mac, scan.mac);
      addAlert('critical', 'Device MAC Address Changed', `IP ${scan.ip} changed MAC address from ${existing.mac} to ${scan.mac}. Possible MAC Spoofing!`);
    }

    if (existing.hostname !== scan.hostname) {
      addHistory('Hostname', existing.hostname || '', scan.hostname || '');
      addAlert('info', 'Hostname Changed', `Device at ${scan.ip} changed hostname from "${existing.hostname || 'None'}" to "${scan.hostname || 'None'}".`);
    }

    if (existing.os !== scan.os && scan.os && scan.os !== 'Unknown') {
      addHistory('Operating System', existing.os || 'Unknown', scan.os);
      addAlert('info', 'Operating System Updated', `Device at ${scan.ip} OS signature updated to ${scan.os}.`);
    }

    // Compare ports list
    const oldPortsStr = (existing.openPorts || []).join(',');
    const newPortsStr = (scan.openPorts || []).join(',');
    if (oldPortsStr !== newPortsStr) {
      addHistory('Open Ports', oldPortsStr || 'None', newPortsStr || 'None');
      addAlert('warning', 'Port Configuration Modified', `Device at ${scan.ip} open ports changed from [${oldPortsStr}] to [${newPortsStr}].`);
    }

    // Compare Firmware (from SNMP or ONVIF)
    const oldFirmware = existing.onvifData?.model || existing.snmpData?.sysDescr || '';
    const newFirmware = scan.onvifData?.model || scan.snmpData?.sysDescr || '';
    if (oldFirmware !== newFirmware && newFirmware) {
      addHistory('Firmware / Model Signature', oldFirmware, newFirmware);
      addAlert('info', 'Firmware Signature Updated', `Device at ${scan.ip} reported updated description signature.`);
    }

    // Update fields
    existing.ip = scan.ip;
    if (scan.mac) existing.mac = scan.mac;
    if (scan.hostname) existing.hostname = scan.hostname;
    if (scan.vendor) existing.vendor = scan.vendor;
    if (scan.os && scan.os !== 'Unknown') existing.os = scan.os;
    if (scan.deviceType && scan.deviceType !== 'Unknown') existing.deviceType = scan.deviceType;
    if (scan.openPorts) existing.openPorts = scan.openPorts;
    if (scan.servicesDetected) existing.servicesDetected = scan.servicesDetected;
    if (scan.banners) existing.banners = scan.banners;
    existing.status = scan.status || 'online';
    existing.latency = scan.latency;
    existing.ttl = scan.ttl;
    existing.lastSeen = now;
    existing.history = history;

    // Advanced structures
    if (scan.netbiosName) existing.netbiosName = scan.netbiosName;
    if (scan.workgroup) existing.workgroup = scan.workgroup;
    if (scan.snmpData) existing.snmpData = scan.snmpData;
    if (scan.onvifData) existing.onvifData = scan.onvifData;
    if (scan.ssdpData) existing.ssdpData = scan.ssdpData;
    if (scan.mdnsData) existing.mdnsData = scan.mdnsData;
    if (scan.webData) existing.webData = scan.webData;

    this.devices.set(id, existing);
    this.checkDuplicateIPsAndMACs();
    this.save();
    return existing;
  }

  /**
   * Scans active inventory to find duplicate IPs and duplicate MACs.
   */
  private checkDuplicateIPsAndMACs() {
    const devicesList = Array.from(this.devices.values());
    const ipMap: Record<string, InventoryDevice[]> = {};
    const macMap: Record<string, InventoryDevice[]> = {};

    devicesList.forEach((d) => {
      if (d.status === 'online') {
        if (!ipMap[d.ip]) ipMap[d.ip] = [];
        ipMap[d.ip].push(d);

        if (d.mac) {
          if (!macMap[d.mac]) macMap[d.mac] = [];
          macMap[d.mac].push(d);
        }
      }
    });

    // 1. Detect Duplicate IPs (same IP, different MACs)
    Object.keys(ipMap).forEach((ip) => {
      const devGroup = ipMap[ip];
      if (devGroup.length > 1) {
        const macs = devGroup.map(d => d.mac || 'no-mac').join(', ');
        // Check if alert already raised recently to prevent spamming
        const title = 'Duplicate IP Address Conflict';
        const exists = this.notifications.some(n => n.title === title && n.message.includes(ip) && !n.resolved);
        if (!exists) {
          this.notifications.unshift({
            id: 'notif_' + Math.random().toString(36).substring(2, 9),
            timestamp: new Date().toISOString(),
            type: 'critical',
            title,
            message: `IP Conflict detected at ${ip}. Multiple MAC addresses are actively using this IP: [${macs}].`,
            resolved: false
          });
        }
      }
    });

    // 2. Detect Duplicate MACs (same MAC, different IPs)
    Object.keys(macMap).forEach((mac) => {
      const devGroup = macMap[mac];
      if (devGroup.length > 1) {
        const ips = devGroup.map(d => d.ip).join(', ');
        const title = 'Duplicate MAC Address Conflict';
        const exists = this.notifications.some(n => n.title === title && n.message.includes(mac) && !n.resolved);
        if (!exists) {
          this.notifications.unshift({
            id: 'notif_' + Math.random().toString(36).substring(2, 9),
            timestamp: new Date().toISOString(),
            type: 'critical',
            title,
            message: `MAC Conflict detected for hardware address ${mac}. Multiple active IPs map to this physical adapter: [${ips}].`,
            resolved: false
          });
        }
      }
    });
  }

  /**
   * Scans for missing devices and marks them offline if they haven't been scanned.
   */
  public markDeviceOffline(id: string) {
    const device = this.devices.get(id);
    if (device && device.status === 'online') {
      device.status = 'offline';
      this.notifications.unshift({
        id: 'notif_' + Math.random().toString(36).substring(2, 9),
        timestamp: new Date().toISOString(),
        type: 'warning',
        title: 'Device Went Offline',
        message: `Device at IP ${device.ip} (${device.hostname || 'Unknown Host'}) is now unreachable.`,
        deviceId: id,
        resolved: false
      });
      this.save();
    }
  }
}

export const inventoryDb = new InventoryDatabase();

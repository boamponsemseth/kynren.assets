var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path3 = __toESM(require("path"), 1);
var import_net2 = __toESM(require("net"), 1);
var import_child_process2 = require("child_process");
var import_vite = require("vite");

// server/scanner.ts
var import_os = __toESM(require("os"), 1);
var import_child_process = require("child_process");
var import_dns = __toESM(require("dns"), 1);
var import_net = __toESM(require("net"), 1);
var import_http = __toESM(require("http"), 1);
var import_https = __toESM(require("https"), 1);
var import_tls = __toESM(require("tls"), 1);

// server/vendorDb.ts
var OUI_DATABASE = {
  "00:15:5D": "Microsoft Corporation (Hyper-V)",
  "00:03:FF": "Microsoft Corporation",
  "00:05:69": "VMware, Inc.",
  "00:0C:29": "VMware, Inc.",
  "00:50:56": "VMware, Inc.",
  "00:1C:42": "Parallels, Inc.",
  "00:16:3E": "XenSource / Red Hat / Oracle",
  "08:00:27": "Oracle Corporation (VirtualBox)",
  "52:54:00": "QEMU / KVM Virtual NIC",
  "00:15:5d": "Microsoft Corporation (Hyper-V)",
  "00:0c:29": "VMware, Inc.",
  // Cisco Systems
  "00:00:0C": "Cisco Systems, Inc.",
  "00:01:42": "Cisco Systems, Inc.",
  "00:01:C7": "Cisco Systems, Inc.",
  "00:03:E3": "Cisco Systems, Inc.",
  "00:0B:FC": "Cisco Systems, Inc.",
  "00:1B:2A": "Cisco Systems, Inc.",
  "00:27:0D": "Cisco Systems, Inc.",
  // Realtek
  "00:E0:4C": "Realtek Semiconductor Corp.",
  "00:14:D1": "Realtek Semiconductor Corp.",
  // Intel
  "00:1B:21": "Intel Corporation",
  "00:1C:C0": "Intel Corporation",
  "00:1F:3C": "Intel Corporation",
  "00:21:5A": "Intel Corporation",
  "00:21:6A": "Intel Corporation",
  "A4:4E:31": "Intel Corporation",
  "E4:A8:DF": "Intel Corporation",
  // Hardware / Pro Audio / AV vendors from topology seed data
  "00:11:22": "Meyer Sound Laboratories",
  "00:1F:29": "Chauvet Professional",
  "00:1B:6A": "Riedel Communications",
  // Common consumer & network gear
  "00:14:22": "Dell Inc.",
  "00:18:8B": "Dell Inc.",
  "00:23:AE": "Dell Inc.",
  "00:26:B9": "Dell Inc.",
  "00:11:85": "HP Inc.",
  "00:17:A4": "HP Inc.",
  "00:22:64": "HP Inc.",
  "00:25:B3": "HP Inc.",
  "00:03:93": "Apple, Inc.",
  "00:0D:93": "Apple, Inc.",
  "00:10:FA": "Apple, Inc.",
  "00:16:CB": "Apple, Inc.",
  "00:17:F2": "Apple, Inc.",
  "00:1C:B3": "Apple, Inc.",
  "00:1D:4F": "Apple, Inc.",
  "00:1E:52": "Apple, Inc.",
  "00:1F:F3": "Apple, Inc.",
  "00:23:12": "Apple, Inc.",
  "00:23:32": "Apple, Inc.",
  "00:25:00": "Apple, Inc.",
  "00:25:4B": "Apple, Inc.",
  "00:26:08": "Apple, Inc.",
  "00:26:4A": "Apple, Inc.",
  "00:26:BB": "Apple, Inc.",
  "24:a0:74": "Apple, Inc.",
  "2c:f0:ee": "Apple, Inc.",
  "34:15:9e": "Apple, Inc.",
  "38:ca:da": "Apple, Inc.",
  "3c:15:c2": "Apple, Inc.",
  // Network Brands
  "00:0F:66": "Cisco-Linksys",
  "00:18:F8": "Cisco-Linksys",
  "00:0F:B5": "Netgear",
  "00:14:6C": "Netgear",
  "00:1B:2F": "Netgear",
  "00:22:3F": "Netgear",
  "00:14:78": "TP-Link Technologies Co., Ltd.",
  "00:1D:0F": "TP-Link Technologies Co., Ltd.",
  "00:21:27": "TP-Link Technologies Co., Ltd.",
  "00:27:19": "TP-Link Technologies Co., Ltd.",
  "00:15:6D": "Ubiquiti Networks, Inc.",
  "00:27:22": "Ubiquiti Networks, Inc.",
  "24:A4:3C": "Ubiquiti Networks, Inc."
};
function lookupVendor(mac) {
  if (!mac) return "Unknown Vendor";
  const cleanMac = mac.replace(/[^0-9a-fA-F]/g, "");
  if (cleanMac.length < 6) return "Unknown Vendor";
  const prefixParts = [
    cleanMac.substring(0, 2),
    cleanMac.substring(2, 4),
    cleanMac.substring(4, 6)
  ];
  const formattedPrefix = prefixParts.join(":").toUpperCase();
  return OUI_DATABASE[formattedPrefix] || "Unknown Vendor";
}

// server/discovery_protocols.ts
var import_dgram = __toESM(require("dgram"), 1);
function udpTransaction(ip, port, requestPayload, timeoutMs, onResponse) {
  return new Promise((resolve) => {
    const client = import_dgram.default.createSocket("udp4");
    let timer = null;
    let resolved = false;
    const cleanup = () => {
      if (timer) clearTimeout(timer);
      try {
        client.close();
      } catch (e) {
      }
    };
    client.on("message", (msg, rinfo) => {
      if (resolved) return;
      try {
        const parsed = onResponse(msg, rinfo);
        if (parsed) {
          resolved = true;
          cleanup();
          resolve(parsed);
        }
      } catch (err) {
      }
    });
    client.on("error", () => {
      if (resolved) return;
      resolved = true;
      cleanup();
      resolve(null);
    });
    client.bind(0, () => {
      client.send(requestPayload, 0, requestPayload.length, port, ip, (err) => {
        if (err) {
          resolved = true;
          cleanup();
          resolve(null);
        }
      });
    });
    timer = setTimeout(() => {
      if (resolved) return;
      resolved = true;
      cleanup();
      resolve(null);
    }, timeoutMs);
  });
}
function queryNetBIOS(ip, timeoutMs = 400) {
  const payload = Buffer.from([
    188,
    86,
    // Transaction ID
    0,
    16,
    // Flags (Broadcast)
    0,
    1,
    // Questions (1)
    0,
    0,
    // Answer RRs
    0,
    0,
    // Authority RRs
    0,
    0,
    // Additional RRs
    32,
    // Name length (32)
    67,
    75,
    65,
    65,
    65,
    65,
    65,
    65,
    65,
    65,
    65,
    65,
    65,
    65,
    65,
    65,
    65,
    65,
    65,
    65,
    65,
    65,
    65,
    65,
    65,
    65,
    65,
    65,
    65,
    65,
    65,
    65,
    // CKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
    0,
    // Null byte
    0,
    33,
    // Type NBSTAT
    0,
    1
    // Class IN
  ]);
  return udpTransaction(ip, 137, payload, timeoutMs, (msg) => {
    if (msg.length < 57) return null;
    if (msg[0] !== 188 || msg[1] !== 86) return null;
    const numNames = msg[56];
    let offset = 57;
    let hostname = "";
    let workgroup = "";
    for (let i = 0; i < numNames; i++) {
      if (offset + 18 > msg.length) break;
      const nameBuf = msg.slice(offset, offset + 15);
      const nameType = msg[offset + 15];
      const isGroup = (msg[offset + 16] & 128) !== 0;
      const name = nameBuf.toString("ascii").trim();
      if (name) {
        if (!isGroup && nameType === 0 && !hostname) {
          hostname = name;
        } else if (isGroup && nameType === 0 && !workgroup) {
          workgroup = name;
        }
      }
      offset += 18;
    }
    if (hostname || workgroup) {
      return { hostname, workgroup };
    }
    return null;
  });
}
function querySSDP(ip, timeoutMs = 400) {
  const payloadStr = 'M-SEARCH * HTTP/1.1\r\nHOST: 239.255.255.250:1900\r\nMAN: "ssdp:discover"\r\nMX: 1\r\nST: ssdp:all\r\n\r\n';
  const payload = Buffer.from(payloadStr, "utf-8");
  return udpTransaction(ip, 1900, payload, timeoutMs, (msg) => {
    const text = msg.toString("utf-8");
    if (!text.includes("HTTP/1.1")) return null;
    const headers = {};
    const lines = text.split("\r\n");
    for (const line of lines) {
      const parts = line.split(":");
      if (parts.length >= 2) {
        const key = parts[0].trim().toUpperCase();
        const val = parts.slice(1).join(":").trim();
        headers[key] = val;
      }
    }
    const server = headers["SERVER"];
    const location = headers["LOCATION"];
    const st = headers["ST"];
    if (server || location || st) {
      let modelName;
      if (location) {
        const match = location.match(/\/([^/]+)\.(xml|json)/i);
        if (match && match[1]) {
          modelName = match[1].replace(/[-_]/g, " ");
        }
      }
      return { server, location, modelName };
    }
    return null;
  });
}
function queryMDNS(ip, timeoutMs = 400) {
  const payload = Buffer.from([
    0,
    0,
    // Transaction ID
    0,
    0,
    // Flags
    0,
    1,
    // Questions (1)
    0,
    0,
    // Answer RRs
    0,
    0,
    // Authority RRs
    0,
    0,
    // Additional RRs
    9,
    95,
    115,
    101,
    114,
    118,
    105,
    99,
    101,
    115,
    // 9 _services
    7,
    95,
    100,
    110,
    115,
    45,
    115,
    100,
    // 7 _dns-sd
    4,
    95,
    117,
    100,
    112,
    // 4 _udp
    5,
    108,
    111,
    99,
    97,
    108,
    // 5 local
    0,
    // Null
    0,
    12,
    // Type PTR
    0,
    1
    // Class IN
  ]);
  return udpTransaction(ip, 5353, payload, timeoutMs, (msg) => {
    const text = msg.toString("utf-8");
    const services = [];
    let hostname = "";
    const localMatches = text.match(/([a-zA-Z0-9-]{3,})\.local/gi);
    if (localMatches && localMatches.length > 0) {
      hostname = localMatches[0].split(".")[0];
    }
    const serviceMatches = text.match(/_[a-zA-Z0-9-]{2,}\._[a-zA-Z0-9-]{2,}/gi);
    if (serviceMatches) {
      for (const m of serviceMatches) {
        const clean = m.toLowerCase();
        if (!services.includes(clean)) {
          services.push(clean);
        }
      }
    }
    if (hostname || services.length > 0) {
      return { hostname, services };
    }
    return null;
  });
}
function queryONVIF(ip, timeoutMs = 400) {
  const uuid = "c032cfdd-c3cd-4935-a6e3-" + Math.floor(Math.random() * 1e12).toString(16).padStart(12, "0");
  const probe = `<?xml version="1.0" encoding="utf-8"?>
<Envelope xmlns="http://www.w3.org/2003/05/soap-envelope" xmlns:a="http://schemas.xmlsoap.org/ws/2004/08/addressing">
  <Header>
    <a:Action>http://schemas.xmlsoap.org/ws/2004/08/discovery/Probe</a:Action>
    <a:MessageID>urn:uuid:${uuid}</a:MessageID>
    <a:To>urn:schemas-xmlsoap-org:ws:2004:08:discovery</a:To>
  </Header>
  <Body>
    <Probe xmlns="http://schemas.xmlsoap.org/ws/2004/08/discovery">
      <Types xmlns:dn="http://www.onvif.org/ver10/device/wsdl">dn:Device</Types>
    </Probe>
  </Body>
</Envelope>`;
  const payload = Buffer.from(probe, "utf-8");
  return udpTransaction(ip, 3702, payload, timeoutMs, (msg) => {
    const text = msg.toString("utf-8");
    if (!text.toLowerCase().includes("probe") && !text.toLowerCase().includes("device")) return null;
    let manufacturer = "";
    let model = "";
    let endpoint = "";
    const xAddrsMatch = text.match(/<[^:>]*:?XAddrs>([^<]+)<\/[^>]+:?XAddrs>/i);
    if (xAddrsMatch) endpoint = xAddrsMatch[1];
    const scopesMatch = text.match(/<[^:>]*:?Scopes>([^<]+)<\/[^>]+:?Scopes>/i);
    if (scopesMatch) {
      const scopes = scopesMatch[1].split(/\s+/);
      for (const s of scopes) {
        if (s.startsWith("onvif://www.onvif.org/hardware/")) {
          model = decodeURIComponent(s.replace("onvif://www.onvif.org/hardware/", ""));
        } else if (s.startsWith("onvif://www.onvif.org/name/")) {
          manufacturer = decodeURIComponent(s.replace("onvif://www.onvif.org/name/", ""));
        }
      }
    }
    if (endpoint || manufacturer || model) {
      return { endpoint, manufacturer, model };
    }
    return null;
  });
}
function querySNMP(ip, community = "public", timeoutMs = 400) {
  const commBytes = Buffer.from(community, "utf-8");
  const commLen = commBytes.length;
  const oidSysDescr = Buffer.from([6, 8, 43, 6, 1, 2, 1, 1, 1, 0, 5, 0]);
  const oidSysName = Buffer.from([6, 8, 43, 6, 1, 2, 1, 1, 5, 0, 5, 0]);
  const varbinds = Buffer.concat([
    Buffer.from([48, oidSysDescr.length]),
    oidSysDescr,
    Buffer.from([48, oidSysName.length]),
    oidSysName
  ]);
  const varbindList = Buffer.concat([Buffer.from([48, varbinds.length]), varbinds]);
  const pduHeader = Buffer.from([
    2,
    4,
    17,
    34,
    51,
    68,
    // Request ID
    2,
    1,
    0,
    // Error Status
    2,
    1,
    0
    // Error Index
  ]);
  const pduBody = Buffer.concat([pduHeader, varbindList]);
  const pdu = Buffer.concat([Buffer.from([160, pduBody.length]), pduBody]);
  const snmpHeader = Buffer.concat([
    Buffer.from([2, 1, 1]),
    // Version v2c (1)
    Buffer.from([4, commLen]),
    commBytes
  ]);
  const snmpBody = Buffer.concat([snmpHeader, pdu]);
  const payload = Buffer.concat([Buffer.from([48, snmpBody.length]), snmpBody]);
  return udpTransaction(ip, 161, payload, timeoutMs, (msg) => {
    if (msg.length < 20 || msg[0] !== 48) return null;
    let sysName;
    let sysDescr;
    const sysDescrOidSig = Buffer.from([43, 6, 1, 2, 1, 1, 1, 0]);
    const sysNameOidSig = Buffer.from([43, 6, 1, 2, 1, 1, 5, 0]);
    const locateValueForOid = (sig) => {
      const idx = msg.indexOf(sig);
      if (idx === -1) return void 0;
      let searchPos = idx + sig.length;
      while (searchPos + 2 < msg.length) {
        if (msg[searchPos] === 4) {
          const len = msg[searchPos + 1];
          if (searchPos + 2 + len <= msg.length) {
            return msg.slice(searchPos + 2, searchPos + 2 + len).toString("utf-8");
          }
        }
        searchPos++;
      }
      return void 0;
    };
    sysDescr = locateValueForOid(sysDescrOidSig);
    sysName = locateValueForOid(sysNameOidSig);
    if (sysName || sysDescr) {
      let vendor;
      if (sysDescr) {
        const descrLower = sysDescr.toLowerCase();
        if (descrLower.includes("cisco")) vendor = "Cisco Systems, Inc.";
        else if (descrLower.includes("linux")) vendor = "Linux / Open Source";
        else if (descrLower.includes("windows")) vendor = "Microsoft Corporation";
        else if (descrLower.includes("epson")) vendor = "Epson";
        else if (descrLower.includes("hp")) vendor = "HP Inc.";
        else if (descrLower.includes("mikrotik")) vendor = "MikroTik";
        else if (descrLower.includes("ubiquiti") || descrLower.includes("ubnt")) vendor = "Ubiquiti Networks, Inc.";
        else if (descrLower.includes("synology")) vendor = "Synology Inc.";
      }
      return { sysName, sysDescr, vendor };
    }
    return null;
  });
}
async function queryDiscoveryProtocols(ip, timeoutMs = 400) {
  const isLocalhost = ip === "127.0.0.1" || ip === "localhost";
  if (isLocalhost) {
    return {};
  }
  const [netbios, ssdp, mdns, snmp, onvif] = await Promise.all([
    queryNetBIOS(ip, timeoutMs).catch(() => null),
    querySSDP(ip, timeoutMs).catch(() => null),
    queryMDNS(ip, timeoutMs).catch(() => null),
    querySNMP(ip, "public", timeoutMs).catch(() => null),
    queryONVIF(ip, timeoutMs).catch(() => null)
  ]);
  const results = {};
  if (netbios) results.netbios = netbios;
  if (ssdp) results.ssdp = ssdp;
  if (mdns) results.mdns = mdns;
  if (snmp) results.snmp = snmp;
  if (onvif) results.onvif = onvif;
  return results;
}

// server/scanner.ts
function ipToInt(ip) {
  return ip.split(".").reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
}
function intToIp(int) {
  return [
    int >>> 24 & 255,
    int >>> 16 & 255,
    int >>> 8 & 255,
    int & 255
  ].join(".");
}
function getSubnetRange(ip, netmask) {
  const ipInt = ipToInt(ip);
  const maskInt = ipToInt(netmask);
  const networkInt = (ipInt & maskInt) >>> 0;
  const broadcastInt = (networkInt | ~maskInt) >>> 0;
  let prefixLength = 0;
  let m = maskInt;
  for (let i = 0; i < 32; i++) {
    if ((m & 1 << 31 - i) !== 0) {
      prefixLength++;
    } else {
      break;
    }
  }
  const ips = [];
  if (prefixLength >= 16 && prefixLength <= 30) {
    const start = networkInt + 1;
    const end = broadcastInt - 1;
    const totalHosts = end - start + 1;
    if (totalHosts <= 256) {
      for (let i = start; i <= end; i++) {
        ips.push(intToIp(i));
      }
    } else {
      const center = ipInt;
      const radius = 128;
      const actualStart = Math.max(start, center - radius);
      const actualEnd = Math.min(end, center + radius);
      for (let i = actualStart; i <= actualEnd; i++) {
        ips.push(intToIp(i));
      }
    }
  } else if (prefixLength === 31) {
    ips.push(intToIp(networkInt));
    ips.push(intToIp(broadcastInt));
  } else if (prefixLength === 32) {
    ips.push(intToIp(networkInt));
  } else {
    const base = (ipInt & 4294967040) >>> 0;
    for (let i = 1; i <= 254; i++) {
      ips.push(intToIp(base + i));
    }
  }
  return {
    network: intToIp(networkInt),
    broadcast: intToIp(broadcastInt),
    prefixLength,
    ips
  };
}
function getActiveInterfaces() {
  const interfaces = import_os.default.networkInterfaces();
  const list = [];
  for (const name of Object.keys(interfaces)) {
    const nets = interfaces[name] || [];
    for (const net3 of nets) {
      if (net3.family === "IPv4" && !net3.internal) {
        const { ips, prefixLength } = getSubnetRange(net3.address, net3.netmask);
        list.push({
          name,
          ip: net3.address,
          netmask: net3.netmask,
          subnet: `${intToIp(ipToInt(net3.address) & ipToInt(net3.netmask))}/${prefixLength}`,
          ips
        });
      }
    }
  }
  return list;
}
function parsePingOutput(stdout, ip) {
  const lowercase = stdout.toLowerCase();
  const isFailed = lowercase.includes("100% packet loss") || lowercase.includes("100% loss") || lowercase.includes("timed out") || lowercase.includes("timeout") || lowercase.includes("unreachable") || lowercase.includes("expired in transit") || lowercase.includes("0 received") || lowercase.includes("0 packets received");
  if (isFailed) {
    return { status: "offline", latency: 0, ttl: 0, packetLoss: 100 };
  }
  let latency = 0;
  const timeMatch = stdout.match(/time[=<]([\d.]+)\s*ms/i);
  if (timeMatch) {
    latency = Math.round(parseFloat(timeMatch[1]));
  } else {
    const altTimeMatch = stdout.match(/time=([\d.]+)\s*ms/i);
    if (altTimeMatch) {
      latency = Math.round(parseFloat(altTimeMatch[1]));
    }
  }
  let ttl = 64;
  const ttlMatch = stdout.match(/ttl=(\d+)/i);
  if (ttlMatch) {
    ttl = parseInt(ttlMatch[1], 10);
  }
  const isOnline = lowercase.includes("reply from") || lowercase.includes("bytes from") || latency > 0 && ttl > 0;
  return {
    status: isOnline ? "online" : "offline",
    latency: isOnline ? Math.max(1, latency) : 0,
    ttl: isOnline ? ttl : 0,
    packetLoss: isOnline ? 0 : 100
  };
}
function pingHost(ip, timeoutMs = 500) {
  const isWin = process.platform === "win32";
  const isMac = process.platform === "darwin";
  let command = "";
  if (isWin) {
    command = `ping -n 1 -w ${timeoutMs} ${ip}`;
  } else if (isMac) {
    command = `ping -c 1 -W ${timeoutMs} ${ip}`;
  } else {
    const timeoutSec = Math.max(1, Math.round(timeoutMs / 1e3));
    command = `ping -c 1 -W ${timeoutSec} ${ip}`;
  }
  return new Promise((resolve) => {
    (0, import_child_process.exec)(command, (error, stdout, stderr) => {
      const output = (stdout || "") + "\n" + (stderr || "");
      const parsed = parsePingOutput(output, ip);
      if (error && (error.message.includes("not found") || error.message.includes("not recognized"))) {
        resolve({
          ip,
          status: "offline",
          latency: 0,
          ttl: 0,
          packetLoss: 100,
          lastSeen: (/* @__PURE__ */ new Date()).toISOString()
        });
        return;
      }
      resolve({
        ip,
        status: parsed.status,
        latency: parsed.latency,
        ttl: parsed.ttl,
        packetLoss: parsed.packetLoss,
        lastSeen: (/* @__PURE__ */ new Date()).toISOString()
      });
    });
  });
}
function resolveArp(ip) {
  const isWin = process.platform === "win32";
  const command = isWin ? `arp -a ${ip}` : `arp -n ${ip} 2>/dev/null || arp ${ip}`;
  return new Promise((resolve) => {
    (0, import_child_process.exec)(command, (error, stdout) => {
      if (error || !stdout) {
        resolve("");
        return;
      }
      const macRegex = /([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})/;
      const match = stdout.match(macRegex);
      if (match) {
        const formattedMac = match[0].replace(/-/g, ":").toLowerCase();
        resolve(formattedMac);
      } else {
        resolve("");
      }
    });
  });
}
function resolveDns(ip) {
  return new Promise((resolve) => {
    import_dns.default.reverse(ip, (err, hostnames) => {
      if (err || !hostnames || hostnames.length === 0) {
        resolve("N/A");
      } else {
        resolve(hostnames[0]);
      }
    });
  });
}
function checkPortAndGrabBanner(ip, port, timeoutMs = 300) {
  return new Promise((resolve) => {
    const socket = new import_net.default.Socket();
    let isResolved = false;
    let bannerData = "";
    const done = (open, banner) => {
      if (isResolved) return;
      isResolved = true;
      socket.destroy();
      resolve({ open, banner });
    };
    socket.setTimeout(timeoutMs);
    socket.on("connect", () => {
      if ([80, 443, 8080, 8081, 8443, 8888].includes(port)) {
        socket.write(`GET / HTTP/1.0\r
Host: ${ip}\r
User-Agent: Mozilla/5.0\r
\r
`);
      } else if ([23].includes(port)) {
        socket.write("\r\n");
      } else {
      }
    });
    socket.on("data", (chunk) => {
      bannerData += chunk.toString("utf-8");
      if (bannerData.length > 512) {
        bannerData = bannerData.substring(0, 512);
        done(true, cleanBanner(bannerData, port));
      }
    });
    socket.on("timeout", () => {
      if (bannerData) {
        done(true, cleanBanner(bannerData, port));
      } else {
        done(false);
      }
    });
    socket.on("error", () => {
      done(false);
    });
    socket.on("close", () => {
      if (bannerData) {
        done(true, cleanBanner(bannerData, port));
      } else {
        done(socket.writable || socket.readable || isResolved === false ? false : true);
      }
    });
    socket.connect(port, ip);
  });
}
function cleanBanner(raw, port) {
  if ([80, 443, 8080, 8081, 8443, 8888].includes(port)) {
    const lines = raw.split("\r\n");
    const serverLine = lines.find((l) => l.toLowerCase().startsWith("server:"));
    if (serverLine) {
      return serverLine.substring(7).trim();
    }
    const statusLine = lines[0] ? lines[0].trim() : "";
    if (statusLine.startsWith("HTTP/")) {
      return statusLine;
    }
  }
  return raw.replace(/[\x00-\x1F\x7F-\x9F]/g, " ").replace(/\s+/g, " ").trim().substring(0, 80);
}
function getWebPageInfo(ip, port = 80, isHttps = false, timeoutMs = 400) {
  return new Promise((resolve) => {
    const lib = isHttps ? import_https.default : import_http.default;
    const agent = isHttps ? new import_https.default.Agent({ rejectUnauthorized: false }) : void 0;
    const req = lib.get({
      hostname: ip,
      port,
      path: "/",
      timeout: timeoutMs,
      agent,
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Enterprise Network Discovery Scanner" }
    }, (res) => {
      let body = "";
      res.on("data", (chunk) => {
        body += chunk.toString("utf-8");
        if (body.length > 2e4) {
          req.destroy();
        }
      });
      res.on("end", () => {
        const titleMatch = body.match(/<title[^>]*>([^<]+)<\/title>/i);
        const title = titleMatch ? titleMatch[1].trim() : void 0;
        resolve({
          title,
          serverHeader: typeof res.headers["server"] === "string" ? res.headers["server"] : void 0,
          poweredBy: typeof res.headers["x-powered-by"] === "string" ? res.headers["x-powered-by"] : void 0
        });
      });
    });
    req.on("error", () => resolve(null));
    req.on("timeout", () => {
      req.destroy();
      resolve(null);
    });
  });
}
function getSSLCertificateInfo(ip, port = 443, timeoutMs = 400) {
  return new Promise((resolve) => {
    try {
      const socket = import_tls.default.connect({
        host: ip,
        port,
        servername: ip,
        rejectUnauthorized: false,
        timeout: timeoutMs
      }, () => {
        const cert = socket.getPeerCertificate();
        const cipher = socket.getCipher();
        const protocol = socket.getProtocol();
        const info = {
          subject: cert && cert.subject && cert.subject.CN ? Array.isArray(cert.subject.CN) ? cert.subject.CN[0] : cert.subject.CN : void 0,
          issuer: cert && cert.issuer && cert.issuer.CN ? Array.isArray(cert.issuer.CN) ? cert.issuer.CN[0] : cert.issuer.CN : void 0,
          expiration: cert && cert.valid_to ? cert.valid_to : void 0,
          cipher: cipher ? cipher.name : void 0,
          tlsVersion: protocol || void 0
        };
        socket.destroy();
        resolve(info);
      });
      socket.on("error", () => {
        socket.destroy();
        resolve(null);
      });
      socket.on("timeout", () => {
        socket.destroy();
        resolve(null);
      });
    } catch (e) {
      resolve(null);
    }
  });
}
function classifyAndFingerprint(ip, ttl, openPorts, banners, discoveryData) {
  const bannerString = Object.values(banners).join(" ").toLowerCase();
  const services = [];
  const portMap = {
    21: "FTP",
    22: "SSH",
    23: "Telnet",
    25: "SMTP",
    53: "DNS",
    67: "DHCP",
    68: "DHCP",
    80: "HTTP",
    110: "POP3",
    123: "NTP",
    137: "NetBIOS",
    139: "NetBIOS",
    143: "IMAP",
    161: "SNMP",
    389: "LDAP",
    443: "HTTPS",
    445: "SMB",
    554: "RTSP",
    1433: "MSSQL",
    1883: "MQTT",
    3e3: "Vite/Node",
    3306: "MySQL",
    3389: "RDP",
    3702: "ONVIF",
    5353: "mDNS",
    5432: "PostgreSQL",
    5900: "VNC",
    6379: "Redis",
    8080: "HTTP-Alt",
    8443: "HTTPS-Alt",
    9e3: "Docker",
    9100: "Raw-IP-Printer",
    27017: "MongoDB"
  };
  openPorts.forEach((port) => {
    if (portMap[port]) {
      services.push(portMap[port]);
    }
  });
  let os2 = "Unknown";
  let deviceType = "Unknown";
  let vendor = void 0;
  if (discoveryData.snmp) {
    const descr = (discoveryData.snmp.sysDescr || "").toLowerCase();
    if (descr.includes("windows")) {
      os2 = "Windows";
      deviceType = descr.includes("server") ? "Server" : "Desktop";
    } else if (descr.includes("cisco")) {
      os2 = "Cisco IOS";
      deviceType = "Switch";
    } else if (descr.includes("mikrotik")) {
      os2 = "MikroTik RouterOS";
      deviceType = "Router";
    } else if (descr.includes("synology")) {
      os2 = "Synology DSM";
      deviceType = "NAS";
    } else if (descr.includes("linux")) {
      os2 = "Linux";
      deviceType = "Server";
    }
    if (discoveryData.snmp.vendor) {
      vendor = discoveryData.snmp.vendor;
    }
  }
  if (discoveryData.netbios) {
    os2 = "Windows";
    deviceType = "Desktop";
    if (bannerString.includes("samba") || openPorts.includes(445)) {
      deviceType = "Server";
    }
  }
  if (discoveryData.onvif || openPorts.includes(3702) || openPorts.includes(554)) {
    os2 = "Embedded Linux";
    deviceType = "Camera";
    if (discoveryData.onvif?.manufacturer) {
      vendor = discoveryData.onvif.manufacturer;
    }
  }
  if (openPorts.includes(9100) || openPorts.includes(515) || openPorts.includes(631)) {
    deviceType = "Printer";
    os2 = "Printer Firmware";
  }
  if (os2 === "Unknown") {
    if (bannerString.includes("microsoft-iis") || openPorts.includes(3389) || openPorts.includes(445) && ttl === 128) {
      os2 = "Windows";
      deviceType = "Desktop";
      if (openPorts.includes(445) && openPorts.includes(3389)) {
        deviceType = "Server";
      }
    } else if (bannerString.includes("ubuntu")) {
      os2 = "Ubuntu";
      deviceType = "Server";
    } else if (bannerString.includes("debian")) {
      os2 = "Debian";
      deviceType = "Server";
    } else if (bannerString.includes("raspbian") || bannerString.includes("raspberrypi")) {
      os2 = "Raspberry Pi";
      deviceType = "IoT";
    } else if (bannerString.includes("mikrotik") || openPorts.includes(8291)) {
      os2 = "MikroTik RouterOS";
      deviceType = "Router";
    } else if (bannerString.includes("cisco") || openPorts.includes(23) && ttl === 255) {
      os2 = "Cisco IOS";
      deviceType = "Switch";
    } else if (openPorts.includes(5353) && (bannerString.includes("apple") || bannerString.includes("darwin"))) {
      os2 = "macOS";
      deviceType = "Laptop";
    } else {
      if (ttl === 128) {
        os2 = "Windows";
        deviceType = "Desktop";
      } else if (ttl === 64) {
        os2 = "Linux";
        deviceType = "Server";
      } else if (ttl === 255) {
        os2 = "Cisco IOS / Network Device";
        deviceType = "Switch";
      }
    }
  }
  if (deviceType === "Unknown") {
    if (openPorts.includes(80) || openPorts.includes(443)) {
      if (bannerString.includes("apache") || bannerString.includes("nginx") || bannerString.includes("iis")) {
        deviceType = "Server";
      } else {
        deviceType = "IoT";
      }
    } else if (openPorts.includes(22)) {
      deviceType = "Server";
    } else if (openPorts.includes(139) || openPorts.includes(445)) {
      deviceType = "Server";
    }
  }
  return { os: os2, deviceType, vendor, services };
}
function parseIpTarget(target) {
  const trimmed = target.trim();
  if (!trimmed) return [];
  if (trimmed.includes("/")) {
    const parts = trimmed.split("/");
    const baseIp = parts[0].trim();
    const prefixStr = parts[1].trim();
    const prefix = parseInt(prefixStr, 10);
    if (isNaN(prefix) || prefix < 0 || prefix > 32) return [baseIp];
    const ipInt = ipToInt(baseIp);
    const mask = prefix === 0 ? 0 : ~0 << 32 - prefix >>> 0;
    const network = (ipInt & mask) >>> 0;
    const broadcast = (network | ~mask) >>> 0;
    const ips = [];
    if (prefix >= 31) {
      for (let i = network; i <= broadcast; i++) {
        ips.push(intToIp(i));
      }
    } else {
      for (let i = network + 1; i < broadcast; i++) {
        ips.push(intToIp(i));
      }
    }
    return ips;
  }
  if (trimmed.includes("-")) {
    const parts = trimmed.split("-");
    const startStr = parts[0].trim();
    const endStr = parts[1].trim();
    try {
      if (endStr.includes(".")) {
        const startInt = ipToInt(startStr);
        const endInt = ipToInt(endStr);
        const ips = [];
        const low = Math.min(startInt, endInt);
        const high = Math.max(startInt, endInt);
        for (let i = low; i <= high; i++) {
          ips.push(intToIp(i));
        }
        return ips;
      } else {
        const ipParts = startStr.split(".");
        if (ipParts.length !== 4) return [startStr];
        const lastOctetStart = parseInt(ipParts[3], 10);
        const lastOctetEnd = parseInt(endStr, 10);
        if (isNaN(lastOctetEnd)) return [startStr];
        const prefix = ipParts.slice(0, 3).join(".");
        const ips = [];
        const low = Math.min(lastOctetStart, lastOctetEnd);
        const high = Math.max(lastOctetStart, lastOctetEnd);
        for (let i = low; i <= high; i++) {
          ips.push(`${prefix}.${i}`);
        }
        return ips;
      }
    } catch {
      return [startStr];
    }
  }
  return [trimmed];
}
async function scanHostExtended(ip, mode, portsToScan, timeoutMs = 500) {
  const isLocalhost = ip === "127.0.0.1" || ip === "localhost";
  let pingResult = await pingHost(ip, timeoutMs);
  if (pingResult.status === "offline" && !isLocalhost) {
    const mac2 = await resolveArp(ip);
    if (mac2) {
      pingResult = {
        ip,
        status: "online",
        latency: 1,
        // local network quick ARP response
        ttl: 64,
        packetLoss: 0,
        lastSeen: (/* @__PURE__ */ new Date()).toISOString()
      };
    }
  }
  if (pingResult.status === "offline") {
    const fallbackPorts = [80, 443, 22, 3389];
    for (const port of fallbackPorts) {
      const pCheck = await checkPortAndGrabBanner(ip, port, 100);
      if (pCheck.open) {
        pingResult = {
          ip,
          status: "online",
          latency: 2,
          ttl: 64,
          packetLoss: 0,
          lastSeen: (/* @__PURE__ */ new Date()).toISOString()
        };
        break;
      }
    }
  }
  if (pingResult.status === "offline") {
    return pingResult;
  }
  if (mode === "quick") {
    return {
      ...pingResult,
      deviceType: "Unknown",
      os: "Unknown"
    };
  }
  let mac = "";
  let vendor = "";
  let hostname = "";
  const openPorts = [];
  const banners = {};
  const [resolvedMac, resolvedHostname] = await Promise.all([
    resolveArp(ip),
    resolveDns(ip)
  ]);
  if (resolvedMac) {
    mac = resolvedMac;
    vendor = lookupVendor(resolvedMac);
  }
  if (resolvedHostname && resolvedHostname !== "N/A") {
    hostname = resolvedHostname;
  }
  const discoveryData = await queryDiscoveryProtocols(ip, Math.min(timeoutMs, 400)).catch(() => ({}));
  let netbiosName;
  let workgroup;
  if (discoveryData.netbios) {
    netbiosName = discoveryData.netbios.hostname;
    workgroup = discoveryData.netbios.workgroup;
    if (netbiosName && !hostname) {
      hostname = `${netbiosName}.local`;
    }
  }
  const scanPorts = portsToScan && portsToScan.length > 0 ? portsToScan : mode === "deep" ? [21, 22, 23, 25, 53, 80, 110, 135, 139, 443, 445, 1433, 3306, 3389, 5432, 554, 3702, 5353, 5900, 6379, 8080, 8443, 9100, 27017] : [22, 80, 443, 445, 3389];
  const portConcurrency = 12;
  for (let i = 0; i < scanPorts.length; i += portConcurrency) {
    const chunk = scanPorts.slice(i, i + portConcurrency);
    await Promise.all(chunk.map(async (port) => {
      const check = await checkPortAndGrabBanner(ip, port, timeoutMs);
      if (check.open) {
        openPorts.push(port);
        if (check.banner) {
          banners[port] = check.banner;
        }
      }
    }));
  }
  let webData = void 0;
  if (openPorts.includes(80) || openPorts.includes(8080)) {
    const p = openPorts.includes(80) ? 80 : 8080;
    const info = await getWebPageInfo(ip, p, false, timeoutMs).catch(() => null);
    if (info) webData = { ...webData, ...info };
  }
  if (openPorts.includes(443) || openPorts.includes(8443)) {
    const p = openPorts.includes(443) ? 443 : 8443;
    const [webInfo, sslInfo] = await Promise.all([
      getWebPageInfo(ip, p, true, timeoutMs).catch(() => null),
      getSSLCertificateInfo(ip, p, timeoutMs).catch(() => null)
    ]);
    if (webInfo) webData = { ...webData, ...webInfo };
    if (sslInfo) {
      webData = {
        ...webData,
        sslSubject: sslInfo.subject,
        sslIssuer: sslInfo.issuer,
        sslExpiration: sslInfo.expiration,
        tlsVersion: sslInfo.tlsVersion,
        cipher: sslInfo.cipher
      };
    }
  }
  const classification = classifyAndFingerprint(ip, pingResult.ttl, openPorts, banners, discoveryData);
  return {
    ...pingResult,
    mac: mac || void 0,
    vendor: classification.vendor || vendor || void 0,
    hostname: hostname || discoveryData.mdns?.hostname || void 0,
    os: classification.os,
    deviceType: classification.deviceType,
    openPorts: openPorts.length > 0 ? openPorts.sort((a, b) => a - b) : void 0,
    banners: Object.keys(banners).length > 0 ? banners : void 0,
    servicesDetected: classification.services.length > 0 ? classification.services : void 0,
    netbiosName,
    workgroup,
    snmpData: discoveryData.snmp ? { sysName: discoveryData.snmp.sysName, sysDescr: discoveryData.snmp.sysDescr, vendor: discoveryData.snmp.vendor } : void 0,
    onvifData: discoveryData.onvif ? { endpoint: discoveryData.onvif.endpoint, manufacturer: discoveryData.onvif.manufacturer, model: discoveryData.onvif.model } : void 0,
    ssdpData: discoveryData.ssdp ? { server: discoveryData.ssdp.server, location: discoveryData.ssdp.location, modelName: discoveryData.ssdp.modelName } : void 0,
    mdnsData: discoveryData.mdns ? { hostname: discoveryData.mdns.hostname, services: discoveryData.mdns.services } : void 0,
    webData,
    lastSeen: (/* @__PURE__ */ new Date()).toISOString()
  };
}
async function scanHost(ip, timeoutMs = 500) {
  return scanHostExtended(ip, "normal", [], timeoutMs);
}
async function runWithConcurrencyLimit(limit, tasks, onProgress, checkCancelled) {
  const results = [];
  const executing = [];
  for (let i = 0; i < tasks.length; i++) {
    if (checkCancelled && checkCancelled()) {
      break;
    }
    const taskIndex = i;
    const p = tasks[taskIndex]().then((res) => {
      results[taskIndex] = res;
      if (onProgress) {
        onProgress(res, taskIndex);
      }
    });
    executing.push(p);
    if (limit <= tasks.length) {
      const e = p.then(() => {
        executing.splice(executing.indexOf(e), 1);
      });
      if (executing.length >= limit) {
        await Promise.race(executing);
      }
    }
  }
  await Promise.all(executing);
  return results;
}

// server/inventoryDb.ts
var import_fs = __toESM(require("fs"), 1);
var import_path = __toESM(require("path"), 1);
var InventoryDatabase = class {
  constructor() {
    this.filePath = import_path.default.join(process.cwd(), "server", "inventory.json");
    this.devices = /* @__PURE__ */ new Map();
    this.notifications = [];
    this.load();
  }
  load() {
    try {
      if (import_fs.default.existsSync(this.filePath)) {
        const data = import_fs.default.readFileSync(this.filePath, "utf-8");
        const parsed = JSON.parse(data);
        if (parsed.devices && Array.isArray(parsed.devices)) {
          parsed.devices.forEach((d) => {
            this.devices.set(d.id, d);
          });
        }
        if (parsed.notifications && Array.isArray(parsed.notifications)) {
          this.notifications = parsed.notifications;
        }
        console.log(`[InventoryDB] Loaded ${this.devices.size} devices and ${this.notifications.length} notifications.`);
      }
    } catch (err) {
      console.error("[InventoryDB] Error loading database, starting fresh:", err);
    }
  }
  save() {
    try {
      const dir = import_path.default.dirname(this.filePath);
      if (!import_fs.default.existsSync(dir)) {
        import_fs.default.mkdirSync(dir, { recursive: true });
      }
      const payload = {
        devices: Array.from(this.devices.values()),
        notifications: this.notifications
      };
      import_fs.default.writeFileSync(this.filePath, JSON.stringify(payload, null, 2), "utf-8");
    } catch (err) {
      console.error("[InventoryDB] Error saving database:", err);
    }
  }
  getDevices() {
    return Array.from(this.devices.values());
  }
  getNotifications() {
    return this.notifications;
  }
  clearNotifications() {
    this.notifications = [];
    this.save();
  }
  markNotificationResolved(id) {
    const notif = this.notifications.find((n) => n.id === id);
    if (notif) {
      notif.resolved = true;
      this.save();
    }
  }
  clearAll() {
    this.devices.clear();
    this.notifications = [];
    this.save();
  }
  deleteDevice(id) {
    this.devices.delete(id);
    this.save();
  }
  /**
   * Processes a newly scanned device state, calculates deltas, log histories, and emits alerts.
   */
  updateDevice(scan) {
    const id = scan.mac || scan.ip;
    const now = (/* @__PURE__ */ new Date()).toISOString();
    let existing = this.devices.get(id);
    const history = existing ? [...existing.history] : [];
    const addHistory = (field, oldValue, newValue) => {
      history.push({
        timestamp: now,
        field,
        oldValue: oldValue || "None",
        newValue: newValue || "None"
      });
    };
    const addAlert = (type, title, message) => {
      this.notifications.unshift({
        id: "notif_" + Math.random().toString(36).substring(2, 9),
        timestamp: now,
        type,
        title,
        message,
        deviceId: id,
        resolved: false
      });
      if (this.notifications.length > 200) {
        this.notifications = this.notifications.slice(0, 200);
      }
    };
    if (!existing) {
      const hostnameLabel = scan.hostname ? ` (${scan.hostname})` : "";
      addAlert(
        "success",
        "New Device Discovered",
        `An unknown device at IP ${scan.ip}${hostnameLabel} has been registered in the asset inventory.`
      );
      const newDevice = {
        id,
        ip: scan.ip,
        mac: scan.mac,
        hostname: scan.hostname,
        vendor: scan.vendor,
        os: scan.os || "Unknown",
        deviceType: scan.deviceType || "Unknown",
        openPorts: scan.openPorts,
        servicesDetected: scan.servicesDetected,
        banners: scan.banners,
        firstSeen: now,
        lastSeen: now,
        status: scan.status || "online",
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
    if (existing.status === "offline" && scan.status === "online") {
      addAlert("info", "Device Online", `Device at ${scan.ip} has reconnected.`);
    }
    if (existing.ip !== scan.ip) {
      addHistory("IP Address", existing.ip, scan.ip);
      addAlert("warning", "Device IP Address Changed", `Device with MAC ${scan.mac || "N/A"} changed IP from ${existing.ip} to ${scan.ip}.`);
    }
    if (scan.mac && existing.mac && existing.mac !== scan.mac) {
      addHistory("MAC Address", existing.mac, scan.mac);
      addAlert("critical", "Device MAC Address Changed", `IP ${scan.ip} changed MAC address from ${existing.mac} to ${scan.mac}. Possible MAC Spoofing!`);
    }
    if (existing.hostname !== scan.hostname) {
      addHistory("Hostname", existing.hostname || "", scan.hostname || "");
      addAlert("info", "Hostname Changed", `Device at ${scan.ip} changed hostname from "${existing.hostname || "None"}" to "${scan.hostname || "None"}".`);
    }
    if (existing.os !== scan.os && scan.os && scan.os !== "Unknown") {
      addHistory("Operating System", existing.os || "Unknown", scan.os);
      addAlert("info", "Operating System Updated", `Device at ${scan.ip} OS signature updated to ${scan.os}.`);
    }
    const oldPortsStr = (existing.openPorts || []).join(",");
    const newPortsStr = (scan.openPorts || []).join(",");
    if (oldPortsStr !== newPortsStr) {
      addHistory("Open Ports", oldPortsStr || "None", newPortsStr || "None");
      addAlert("warning", "Port Configuration Modified", `Device at ${scan.ip} open ports changed from [${oldPortsStr}] to [${newPortsStr}].`);
    }
    const oldFirmware = existing.onvifData?.model || existing.snmpData?.sysDescr || "";
    const newFirmware = scan.onvifData?.model || scan.snmpData?.sysDescr || "";
    if (oldFirmware !== newFirmware && newFirmware) {
      addHistory("Firmware / Model Signature", oldFirmware, newFirmware);
      addAlert("info", "Firmware Signature Updated", `Device at ${scan.ip} reported updated description signature.`);
    }
    existing.ip = scan.ip;
    if (scan.mac) existing.mac = scan.mac;
    if (scan.hostname) existing.hostname = scan.hostname;
    if (scan.vendor) existing.vendor = scan.vendor;
    if (scan.os && scan.os !== "Unknown") existing.os = scan.os;
    if (scan.deviceType && scan.deviceType !== "Unknown") existing.deviceType = scan.deviceType;
    if (scan.openPorts) existing.openPorts = scan.openPorts;
    if (scan.servicesDetected) existing.servicesDetected = scan.servicesDetected;
    if (scan.banners) existing.banners = scan.banners;
    existing.status = scan.status || "online";
    existing.latency = scan.latency;
    existing.ttl = scan.ttl;
    existing.lastSeen = now;
    existing.history = history;
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
  checkDuplicateIPsAndMACs() {
    const devicesList = Array.from(this.devices.values());
    const ipMap = {};
    const macMap = {};
    devicesList.forEach((d) => {
      if (d.status === "online") {
        if (!ipMap[d.ip]) ipMap[d.ip] = [];
        ipMap[d.ip].push(d);
        if (d.mac) {
          if (!macMap[d.mac]) macMap[d.mac] = [];
          macMap[d.mac].push(d);
        }
      }
    });
    Object.keys(ipMap).forEach((ip) => {
      const devGroup = ipMap[ip];
      if (devGroup.length > 1) {
        const macs = devGroup.map((d) => d.mac || "no-mac").join(", ");
        const title = "Duplicate IP Address Conflict";
        const exists = this.notifications.some((n) => n.title === title && n.message.includes(ip) && !n.resolved);
        if (!exists) {
          this.notifications.unshift({
            id: "notif_" + Math.random().toString(36).substring(2, 9),
            timestamp: (/* @__PURE__ */ new Date()).toISOString(),
            type: "critical",
            title,
            message: `IP Conflict detected at ${ip}. Multiple MAC addresses are actively using this IP: [${macs}].`,
            resolved: false
          });
        }
      }
    });
    Object.keys(macMap).forEach((mac) => {
      const devGroup = macMap[mac];
      if (devGroup.length > 1) {
        const ips = devGroup.map((d) => d.ip).join(", ");
        const title = "Duplicate MAC Address Conflict";
        const exists = this.notifications.some((n) => n.title === title && n.message.includes(mac) && !n.resolved);
        if (!exists) {
          this.notifications.unshift({
            id: "notif_" + Math.random().toString(36).substring(2, 9),
            timestamp: (/* @__PURE__ */ new Date()).toISOString(),
            type: "critical",
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
  markDeviceOffline(id) {
    const device = this.devices.get(id);
    if (device && device.status === "online") {
      device.status = "offline";
      this.notifications.unshift({
        id: "notif_" + Math.random().toString(36).substring(2, 9),
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        type: "warning",
        title: "Device Went Offline",
        message: `Device at IP ${device.ip} (${device.hostname || "Unknown Host"}) is now unreachable.`,
        deviceId: id,
        resolved: false
      });
      this.save();
    }
  }
};
var inventoryDb = new InventoryDatabase();

// server/agentDb.ts
var import_fs2 = __toESM(require("fs"), 1);
var import_path2 = __toESM(require("path"), 1);
var AgentDatabase = class {
  constructor() {
    this.filePath = import_path2.default.join(process.cwd(), "server", "agents.json");
    this.agents = /* @__PURE__ */ new Map();
    this.load();
  }
  load() {
    try {
      if (import_fs2.default.existsSync(this.filePath)) {
        const data = import_fs2.default.readFileSync(this.filePath, "utf-8");
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) {
          parsed.forEach((agent) => {
            this.agents.set(agent.deviceId, agent);
          });
        }
        console.log(`[AgentDB] Loaded ${this.agents.size} Endpoint Agents.`);
      }
    } catch (err) {
      console.error("[AgentDB] Error loading agents database:", err);
    }
  }
  save() {
    try {
      const dir = import_path2.default.dirname(this.filePath);
      if (!import_fs2.default.existsSync(dir)) {
        import_fs2.default.mkdirSync(dir, { recursive: true });
      }
      const data = Array.from(this.agents.values());
      import_fs2.default.writeFileSync(this.filePath, JSON.stringify(data, null, 2), "utf-8");
    } catch (err) {
      console.error("[AgentDB] Error saving agents database:", err);
    }
  }
  registerAgent(reg) {
    let existing = this.agents.get(reg.deviceId);
    const token = existing?.token || "tok_" + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const now = (/* @__PURE__ */ new Date()).toISOString();
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
        status: "online",
        pollingInterval: 10,
        // fast polling (e.g. 10s) for live visualizer responsiveness, or 30s
        enabledModules: ["system", "hardware", "network", "software", "services", "processes", "performance"],
        logLevel: "info",
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
        id: "alert_" + Math.random().toString(36).substring(2, 9),
        timestamp: now,
        type: "success",
        title: "Agent Registered",
        message: `Secure Endpoint Agent registered successfully from ${reg.hostname} (${reg.osName}).`,
        resolved: false
      });
    } else {
      existing.status = "online";
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
  getAgents() {
    const now = Date.now();
    let changed = false;
    this.agents.forEach((agent) => {
      const lastCheck = new Date(agent.lastSeen).getTime();
      const timeoutThreshold = agent.pollingInterval * 2.5 * 1e3;
      if (agent.status === "online" && now - lastCheck > Math.max(timeoutThreshold, 3e4)) {
        agent.status = "offline";
        agent.alerts.unshift({
          id: "alert_" + Math.random().toString(36).substring(2, 9),
          timestamp: (/* @__PURE__ */ new Date()).toISOString(),
          type: "critical",
          title: "Agent Offline",
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
  getAgent(deviceId) {
    return this.agents.get(deviceId);
  }
  deleteAgent(deviceId) {
    this.agents.delete(deviceId);
    this.save();
  }
  updateAgentHeartbeat(deviceId, perf, alertsGenerated) {
    const agent = this.agents.get(deviceId);
    if (!agent) {
      throw new Error("Agent not registered");
    }
    const now = (/* @__PURE__ */ new Date()).toISOString();
    agent.lastSeen = now;
    agent.status = "online";
    agent.performanceHistory.push({
      timestamp: now,
      cpu: perf.cpu,
      memory: perf.memory,
      disk: perf.disk,
      networkRx: perf.networkRx,
      networkTx: perf.networkTx
    });
    if (agent.performanceHistory.length > 100) {
      agent.performanceHistory = agent.performanceHistory.slice(-100);
    }
    alertsGenerated.forEach((alt) => {
      const exists = agent.alerts.some((a) => a.title === alt.title && !a.resolved);
      if (!exists) {
        agent.alerts.unshift({
          id: "alert_" + Math.random().toString(36).substring(2, 9),
          timestamp: now,
          type: alt.type,
          title: alt.title,
          message: alt.message,
          resolved: false
        });
      }
    });
    this.save();
    const pendingCommands = agent.commands.filter((c) => c.status === "queued" || c.status === "pending");
    pendingCommands.forEach((c) => {
      c.status = "pending";
    });
    return {
      commands: pendingCommands,
      pollingInterval: agent.pollingInterval,
      enabledModules: agent.enabledModules,
      logLevel: agent.logLevel
    };
  }
  updateAgentInventory(deviceId, type, payload) {
    const agent = this.agents.get(deviceId);
    if (!agent) return;
    if (type === "system") agent.systemInfo = payload;
    if (type === "hardware") agent.hardware = payload;
    if (type === "network") agent.network = payload;
    if (type === "software") agent.software = payload;
    if (type === "services") agent.services = payload;
    if (type === "processes") agent.processes = payload;
    agent.lastSeen = (/* @__PURE__ */ new Date()).toISOString();
    this.save();
  }
  queueCommand(deviceId, command, args) {
    const agent = this.agents.get(deviceId);
    if (!agent) return null;
    const cmd = {
      id: "cmd_" + Math.random().toString(36).substring(2, 9),
      command,
      arguments: args,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      status: "queued"
    };
    agent.commands.unshift(cmd);
    if (agent.commands.length > 50) {
      agent.commands = agent.commands.slice(0, 50);
    }
    this.save();
    return cmd;
  }
  updateCommandResult(deviceId, commandId, success, result) {
    const agent = this.agents.get(deviceId);
    if (!agent) return;
    const cmd = agent.commands.find((c) => c.id === commandId);
    if (cmd) {
      cmd.status = success ? "completed" : "failed";
      cmd.result = result;
      this.save();
    }
  }
  resolveAlert(deviceId, alertId) {
    const agent = this.agents.get(deviceId);
    if (!agent) return;
    const alert = agent.alerts.find((a) => a.id === alertId);
    if (alert) {
      alert.resolved = true;
      this.save();
    }
  }
  updateConfig(deviceId, config) {
    const agent = this.agents.get(deviceId);
    if (!agent) return;
    if (config.pollingInterval !== void 0) agent.pollingInterval = config.pollingInterval;
    if (config.enabledModules !== void 0) agent.enabledModules = config.enabledModules;
    if (config.logLevel !== void 0) agent.logLevel = config.logLevel;
    if (config.alertThresholds !== void 0) agent.alertThresholds = config.alertThresholds;
    this.save();
  }
  clearAlerts(deviceId) {
    const agent = this.agents.get(deviceId);
    if (agent) {
      agent.alerts = [];
      this.save();
    }
  }
};
var agentDb = new AgentDatabase();

// server.ts
function checkPort(ip, port, timeoutMs = 250) {
  return new Promise((resolve) => {
    const socket = new import_net2.default.Socket();
    socket.setTimeout(timeoutMs);
    socket.on("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.on("timeout", () => {
      socket.destroy();
      resolve(false);
    });
    socket.on("error", () => {
      socket.destroy();
      resolve(false);
    });
    socket.connect(port, ip);
  });
}
async function startServer() {
  const app = (0, import_express.default)();
  const PORT = 3e3;
  app.use(import_express.default.json());
  app.get("/api/client-ip", (req, res) => {
    const ip = req.headers["x-forwarded-for"] || req.headers["x-real-ip"] || req.socket.remoteAddress || "127.0.0.1";
    const cleanIp = typeof ip === "string" ? ip.split(",")[0].trim() : String(ip);
    res.json({ success: true, ip: cleanIp });
  });
  app.get("/api/interfaces", (req, res) => {
    try {
      const adapters = getActiveInterfaces();
      res.json({ success: true, interfaces: adapters });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
  app.get("/api/ping/device", async (req, res) => {
    const { ip, timeout = "1000" } = req.query;
    if (!ip || typeof ip !== "string") {
      return res.status(400).json({ success: false, error: "Missing IP or Host parameter" });
    }
    const timeoutMs = parseInt(timeout, 10) || 1e3;
    try {
      const result = await scanHost(ip, timeoutMs);
      res.json({ success: true, result });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
  app.post("/api/assistant/chat", async (req, res) => {
    const { prompt, image, appState, history, kbArticles } = req.body;
    const getSimulatedResponse = (userPrompt, hasImg) => {
      const lower = userPrompt.toLowerCase();
      if (kbArticles && Array.isArray(kbArticles) && kbArticles.length > 0) {
        let bestMatch = null;
        let highestScore = 0;
        kbArticles.forEach((art) => {
          let score = 0;
          const titleWords = art.title.toLowerCase().split(/\s+/);
          const contentWords = art.content.toLowerCase().split(/\s+/);
          const tags = (art.tags || []).map((t) => t.toLowerCase());
          titleWords.forEach((word) => {
            if (word.length > 3 && lower.includes(word)) score += 3;
          });
          contentWords.forEach((word) => {
            if (word.length > 3 && lower.includes(word)) score += 1;
          });
          tags.forEach((tag) => {
            if (lower.includes(tag)) score += 4;
          });
          if (score > highestScore) {
            highestScore = score;
            bestMatch = art;
          }
        });
        if (bestMatch && highestScore >= 3) {
          return `\u{1F4DA} **Knowledge Base Retrieval: [PROTOCOL: ${bestMatch.title}]**

I have retrieved the standard operating procedure for **${bestMatch.title}** (${bestMatch.category}) managed by **${bestMatch.author || "Seth Boa Amponsem"}**:

${bestMatch.content}

*(Simulated Offline Mode: Protocol matched from active system Wiki)*`;
        }
      }
      let response = "";
      if (hasImg) {
        response = "Camera image analyzed. I've scanned the visual feed and detected what appears to be a high-performance networking workstation or server cabinet terminal. Diagnostic analysis indicates proper physical port connections, with ambient LED statuses indicating nominal operating temperatures (approx. 24\xB0C). No physical structural damage or cable stress is visible in the captured frame.";
      } else if (lower.includes("scan") || lower.includes("status") || lower.includes("nodes") || lower.includes("tickets")) {
        const assets = appState?.totalAssets ?? 12;
        const online = appState?.onlineNodesCount ?? 8;
        const degraded = appState?.degradedNodes ?? 1;
        const tickets = appState?.activeTickets ?? 3;
        response = `Integrated System Scan Completed. Current Kynren network health parameters:
- **Total Assets**: ${assets} registered hardware nodes.
- **Active Connections**: ${online} online hosts detected.
- **Degraded Nodes**: ${degraded} switch/backbone connection reporting alert.
- **Support Tickets**: ${tickets} open support tickets require operator attention.
All core communication backbones are operating within acceptable parameters, but immediate action is recommended for the degraded network switches.`;
      } else if (lower.includes("hello") || lower.includes("hi") || lower.includes("hey")) {
        response = "Hello Operator! I am the Kynren Technology Operations Assistant. I can help you monitor live network pings, troubleshoot helpdesk tickets, analyze camera frames of networking hardware, or scan current inventory statistics. What operations shall we review?";
      } else {
        response = "Acknowledged, Operator. Standard diagnostics indicate all microservices are active. If you have specific questions about our current stock register, network nodes, or want me to analyze a hardware photo using the terminal camera, please let me know!";
      }
      return response;
    };
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        const text = getSimulatedResponse(prompt || "", !!image);
        return res.json({ success: true, text, simulated: true });
      }
      const { GoogleGenAI } = await import("@google/genai");
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build"
          }
        }
      });
      let contents = [];
      if (history && Array.isArray(history) && history.length > 0) {
        let lastRole = null;
        for (const msg of history) {
          if (!msg.text && !msg.image) continue;
          const role = msg.sender === "user" ? "user" : "model";
          if (role === lastRole && contents.length > 0) {
            const lastPart = contents[contents.length - 1].parts;
            if (msg.text) {
              lastPart.push({ text: `

${msg.text}` });
            }
            if (msg.image && typeof msg.image === "string") {
              const base64Data = msg.image.split(",")[1] || msg.image;
              const mimeType = msg.image.split(";")[0]?.split(":")[1] || "image/jpeg";
              lastPart.unshift({
                inlineData: {
                  data: base64Data,
                  mimeType
                }
              });
            }
            continue;
          }
          const parts = [];
          if (msg.image && typeof msg.image === "string") {
            const base64Data = msg.image.split(",")[1] || msg.image;
            const mimeType = msg.image.split(";")[0]?.split(":")[1] || "image/jpeg";
            parts.push({
              inlineData: {
                data: base64Data,
                mimeType
              }
            });
          }
          if (msg.text) {
            parts.push({ text: msg.text });
          }
          contents.push({ role, parts });
          lastRole = role;
        }
      } else {
        const parts = [];
        if (image && typeof image === "string") {
          const base64Data = image.split(",")[1] || image;
          const mimeType = image.split(";")[0]?.split(":")[1] || "image/jpeg";
          parts.push({
            inlineData: {
              data: base64Data,
              mimeType
            }
          });
        }
        parts.push({ text: prompt || "Analyze this." });
        contents.push({ role: "user", parts });
      }
      let systemContext = "You are Kynren, a highly advanced, retro-futuristic Technical Operations Assistant for Kynren Technology Operations.";
      if (appState) {
        systemContext += `

Here is the live status of the network scan and app:
- Total assets: ${appState.totalAssets || "unknown"}
- Online nodes: ${appState.onlineNodesCount || "unknown"}
- Degraded nodes: ${appState.degradedNodes || "0"}
- Active Helpdesk tickets: ${appState.activeTickets || "unknown"}
- Low-stock consumables: ${appState.lowStockConsumables || "unknown"}`;
      }
      if (kbArticles && Array.isArray(kbArticles) && kbArticles.length > 0) {
        systemContext += "\n\n=== SYSTEM KNOWLEDGE BASE / STANDARD OPERATING PROCEDURES (SOP) ===\n";
        systemContext += "You have active access to the following operational documentation and troubleshooting manuals published in the Wiki. Use this knowledge to answer technical questions and guide the Operator:\n";
        kbArticles.forEach((art) => {
          systemContext += `
[PROTOCOL: ${art.title}] (Category: ${art.category})
`;
          if (art.author) systemContext += `Author: ${art.author}
`;
          if (art.tags && art.tags.length > 0) systemContext += `Tags: ${art.tags.join(", ")}
`;
          systemContext += `Instructions:
${art.content}
`;
          systemContext += "--------------------------------------\n";
        });
        systemContext += "\nWhen answering queries based on the Knowledge Base, refer to the specific protocols (e.g. '[PROTOCOL: Title]') and category. If appropriate, cite the specific author or tags. If the user's question is not directly addressed in the Knowledge Base, use your general technical expertise, but prioritize the provided procedures.";
      }
      systemContext += "\n\nGive concise, highly technical but accessible answers. Use bolding and lists to format your answers cleanly. When an image is provided, identify any devices, wiring, setup, or objects, and analyze them in a fictional diagnostic or technical networking context.";
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents,
        config: {
          systemInstruction: systemContext
        }
      });
      res.json({ success: true, text: response.text });
    } catch (err) {
      console.error("Gemini API Error:", err);
      const text = getSimulatedResponse(prompt || "", !!image);
      res.json({ success: true, text, simulated: true, error: err.message });
    }
  });
  app.get("/api/scan/ports", async (req, res) => {
    const { ip, ports } = req.query;
    if (!ip || typeof ip !== "string") {
      return res.status(400).json({ success: false, error: "Missing IP parameter" });
    }
    const portsToScan = typeof ports === "string" ? ports.split(",").map((p) => parseInt(p, 10)) : [21, 22, 23, 25, 53, 80, 110, 443, 3389, 8080];
    try {
      const results = {};
      const promises = portsToScan.map(async (port) => {
        const open = await checkPort(ip, port, 250);
        results[port] = open;
      });
      await Promise.all(promises);
      res.json({ success: true, ip, ports: results });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
  app.get("/api/inventory", (req, res) => {
    try {
      const devices = inventoryDb.getDevices();
      res.json({ success: true, devices });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
  app.post("/api/inventory/delete", (req, res) => {
    const { id } = req.body;
    if (!id) return res.status(400).json({ success: false, error: "Missing device ID" });
    try {
      inventoryDb.deleteDevice(id);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
  app.post("/api/inventory/clear-all", (req, res) => {
    try {
      inventoryDb.clearAll();
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
  app.get("/api/inventory/notifications", (req, res) => {
    try {
      const notifications = inventoryDb.getNotifications();
      res.json({ success: true, notifications });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
  app.post("/api/inventory/clear-notifications", (req, res) => {
    try {
      inventoryDb.clearNotifications();
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
  app.post("/api/inventory/notifications/resolve", (req, res) => {
    const { id } = req.body;
    if (!id) return res.status(400).json({ success: false, error: "Missing notification ID" });
    try {
      inventoryDb.markNotificationResolved(id);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
  app.get("/api/inventory/export", (req, res) => {
    const { format = "json" } = req.query;
    const devices = inventoryDb.getDevices();
    if (format === "csv") {
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", 'attachment; filename="inventory_report.csv"');
      const headers = ["ID", "IP Address", "MAC Address", "Hostname", "Vendor", "OS", "Device Type", "Open Ports", "Status", "First Seen", "Last Seen"];
      const rows = devices.map((d) => [
        d.id,
        d.ip,
        d.mac || "",
        d.hostname || "",
        d.vendor || "",
        d.os || "",
        d.deviceType || "",
        (d.openPorts || []).join(";"),
        d.status,
        d.firstSeen,
        d.lastSeen
      ]);
      const csvContent = [headers.join(","), ...rows.map((r) => r.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(","))].join("\n");
      return res.send(csvContent);
    }
    if (format === "xml") {
      res.setHeader("Content-Type", "application/xml");
      res.setHeader("Content-Disposition", 'attachment; filename="inventory_report.xml"');
      let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<devices>\n';
      devices.forEach((d) => {
        xml += "  <device>\n";
        xml += `    <id>${d.id}</id>
`;
        xml += `    <ip>${d.ip}</ip>
`;
        xml += `    <mac>${d.mac || ""}</mac>
`;
        xml += `    <hostname>${d.hostname || ""}</hostname>
`;
        xml += `    <vendor>${d.vendor || ""}</vendor>
`;
        xml += `    <os>${d.os || ""}</os>
`;
        xml += `    <deviceType>${d.deviceType || ""}</deviceType>
`;
        xml += `    <status>${d.status}</status>
`;
        xml += `    <firstSeen>${d.firstSeen}</firstSeen>
`;
        xml += `    <lastSeen>${d.lastSeen}</lastSeen>
`;
        xml += "  </device>\n";
      });
      xml += "</devices>";
      return res.send(xml);
    }
    if (format === "html") {
      res.setHeader("Content-Type", "text/html");
      res.setHeader("Content-Disposition", 'attachment; filename="inventory_report.html"');
      let html = "<html><head><style>table { border-collapse: collapse; width: 100%; } th, td { border: 1px solid #ddd; padding: 8px; text-align: left; } tr:nth-child(even) { background-color: #f2f2f2; } th { background-color: #059669; color: white; }</style></head><body>";
      html += "<h2>Enterprise Network Discovery Inventory</h2>";
      html += "<table><tr><th>ID</th><th>IP</th><th>MAC</th><th>Hostname</th><th>Vendor</th><th>OS</th><th>Device Type</th><th>Status</th><th>Last Seen</th></tr>";
      devices.forEach((d) => {
        html += `<tr><td>${d.id}</td><td>${d.ip}</td><td>${d.mac || ""}</td><td>${d.hostname || ""}</td><td>${d.vendor || ""}</td><td>${d.os || ""}</td><td>${d.deviceType || ""}</td><td>${d.status}</td><td>${d.lastSeen}</td></tr>`;
      });
      html += "</table></body></html>";
      return res.send(html);
    }
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", 'attachment; filename="inventory_report.json"');
    res.send(JSON.stringify(devices, null, 2));
  });
  app.get("/api/scan/stream", async (req, res) => {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no"
      // bypass buffering on proxies (like NGINX)
    });
    const { subnet, concurrency = "100", timeout = "500", startIndex = "0", mode = "normal", ports = "" } = req.query;
    if (!subnet || typeof subnet !== "string") {
      res.write(`data: ${JSON.stringify({ type: "error", message: "Missing or invalid subnet parameter" })}

`);
      res.end();
      return;
    }
    const maxConcurrency = Math.min(1e3, Math.max(1, parseInt(concurrency, 10)));
    const pingTimeout = Math.min(5e3, Math.max(50, parseInt(timeout, 10)));
    const startIdx = Math.max(0, parseInt(startIndex, 10) || 0);
    const scanMode = mode || "normal";
    const DEFAULT_PORTS = [21, 22, 23, 25, 53, 80, 110, 135, 139, 443, 445, 1433, 3306, 3389, 5432, 5900, 8080, 8443];
    let portsToScan = [];
    if (scanMode === "deep") {
      if (typeof ports === "string" && ports.trim()) {
        portsToScan = ports.split(",").map((p) => parseInt(p.trim(), 10)).filter((p) => !isNaN(p) && p > 0 && p <= 65535);
      } else {
        portsToScan = DEFAULT_PORTS;
      }
    } else if (typeof ports === "string" && ports.trim()) {
      portsToScan = ports.split(",").map((p) => parseInt(p.trim(), 10)).filter((p) => !isNaN(p) && p > 0 && p <= 65535);
    }
    let allIps = parseIpTarget(subnet);
    if (allIps.length === 0 || allIps.length === 1 && allIps[0] === subnet && !subnet.match(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/)) {
      const adapters = getActiveInterfaces();
      const matchedAdapter = adapters.find((ad) => ad.subnet === subnet || ad.subnet.replace(/\/\d+$/, ".0") === subnet.replace(/\/\d+$/, ".0") || subnet.startsWith(ad.ip.split(".").slice(0, 3).join(".")));
      if (matchedAdapter) {
        allIps = matchedAdapter.ips;
      } else {
        const subnetPrefix = subnet.split(".").slice(0, 3).join(".");
        allIps = [];
        for (let i = 1; i <= 254; i++) {
          allIps.push(`${subnetPrefix}.${i}`);
        }
      }
    }
    const ipsToScan = allIps.slice(startIdx);
    const totalOriginalCount = allIps.length;
    let isCancelled = false;
    req.on("close", () => {
      isCancelled = true;
      console.log(`Scan streaming connection closed by client. Target scan aborted: ${subnet}`);
    });
    res.write(`data: ${JSON.stringify({ type: "init", total: totalOriginalCount, startIndex: startIdx, subnet, concurrency: maxConcurrency, timeout: pingTimeout, mode: scanMode, portsToScan })}

`);
    const startTime = Date.now();
    let hostsOnline = 0;
    let hostsScanned = startIdx;
    const tasks = ipsToScan.map((ip) => async () => {
      if (isCancelled) {
        return { ip, status: "offline", latency: 0, ttl: 0, packetLoss: 100 };
      }
      return await scanHostExtended(ip, scanMode, portsToScan, pingTimeout);
    });
    await runWithConcurrencyLimit(
      maxConcurrency,
      tasks,
      (pingResult, index) => {
        if (isCancelled) return;
        hostsScanned++;
        if (pingResult.status === "online") {
          hostsOnline++;
          inventoryDb.updateDevice(pingResult);
        }
        res.write(`data: ${JSON.stringify({
          type: "progress",
          result: pingResult,
          percent: Math.round(hostsScanned / totalOriginalCount * 100),
          scanned: hostsScanned,
          total: totalOriginalCount,
          onlineCount: hostsOnline,
          elapsedTime: Date.now() - startTime
        })}

`);
      },
      () => isCancelled
    );
    if (!isCancelled) {
      res.write(`data: ${JSON.stringify({
        type: "complete",
        total: totalOriginalCount,
        onlineCount: hostsOnline,
        scanDuration: Date.now() - startTime
      })}

`);
    }
    res.end();
  });
  app.get("/api/agents", (req, res) => {
    try {
      const agents = agentDb.getAgents();
      res.json({ success: true, agents });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
  app.post("/api/agents/config", (req, res) => {
    const { deviceId, pollingInterval, enabledModules, logLevel, alertThresholds } = req.body;
    if (!deviceId) {
      return res.status(400).json({ success: false, error: "Missing deviceId parameter" });
    }
    try {
      agentDb.updateConfig(deviceId, { pollingInterval, enabledModules, logLevel, alertThresholds });
      res.json({ success: true, message: "Endpoint configuration updated successfully." });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
  app.post("/api/agents/command", (req, res) => {
    const { deviceId, command, arguments: cmdArgs } = req.body;
    if (!deviceId || !command) {
      return res.status(400).json({ success: false, error: "Missing deviceId or command parameter" });
    }
    try {
      const cmd = agentDb.queueCommand(deviceId, command, cmdArgs);
      if (cmd) {
        res.json({ success: true, command: cmd, message: `Command '${command}' queued successfully.` });
      } else {
        res.status(404).json({ success: false, error: "Endpoint Agent not found" });
      }
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
  app.post("/api/agents/alert/resolve", (req, res) => {
    const { deviceId, alertId } = req.body;
    if (!deviceId || !alertId) {
      return res.status(400).json({ success: false, error: "Missing deviceId or alertId parameter" });
    }
    try {
      agentDb.resolveAlert(deviceId, alertId);
      res.json({ success: true, message: "Security alert marked as resolved." });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
  app.post("/api/agents/delete", (req, res) => {
    const { deviceId } = req.body;
    if (!deviceId) {
      return res.status(400).json({ success: false, error: "Missing deviceId parameter" });
    }
    try {
      agentDb.deleteAgent(deviceId);
      res.json({ success: true, message: "Endpoint Agent registration successfully purged." });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
  app.post("/api/agents/clear-alerts", (req, res) => {
    const { deviceId } = req.body;
    if (!deviceId) {
      return res.status(400).json({ success: false, error: "Missing deviceId parameter" });
    }
    try {
      agentDb.clearAlerts(deviceId);
      res.json({ success: true, message: "Alert log cleared." });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
  app.get("/api/agents/export", (req, res) => {
    const format = req.query.format || "json";
    const agents = agentDb.getAgents();
    if (format === "csv") {
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", "attachment; filename=agents_export.csv");
      let csv = "Device ID,Hostname,OS Name,OS Version,Architecture,Status,Last Seen\n";
      agents.forEach((a) => {
        csv += `"${a.deviceId}","${a.hostname}","${a.osName}","${a.osVersion}","${a.architecture}","${a.status}","${a.lastSeen}"
`;
      });
      return res.send(csv);
    } else if (format === "html") {
      res.setHeader("Content-Type", "text/html");
      let html = `
        <html>
          <head>
            <style>
              body { font-family: sans-serif; background: #0f172a; color: #f1f5f9; padding: 20px; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th, td { border: 1px solid #334155; padding: 12px; text-align: left; }
              th { background: #1e293b; color: #38bdf8; }
              tr:nth-child(even) { background: #1e293b/40; }
              h1 { color: #f43f5e; }
            </style>
          </head>
          <body>
            <h1>Endpoint Agent Assets Export</h1>
            <table>
              <thead>
                <tr>
                  <th>Device ID</th><th>Hostname</th><th>OS</th><th>Architecture</th><th>Status</th><th>Last Seen</th>
                </tr>
              </thead>
              <tbody>
      `;
      agents.forEach((a) => {
        html += `
          <tr>
            <td>${a.deviceId}</td>
            <td>${a.hostname}</td>
            <td>${a.osName} (${a.osVersion})</td>
            <td>${a.architecture}</td>
            <td>${a.status}</td>
            <td>${a.lastSeen}</td>
          </tr>
        `;
      });
      html += `
              </tbody>
            </table>
          </body>
        </html>
      `;
      return res.send(html);
    }
    res.json({ success: true, agents });
  });
  app.post("/api/agent/register", (req, res) => {
    const { deviceId, hostname, computerName, deviceUuid, osName, osVersion, architecture, agentVersion } = req.body;
    if (!deviceId || !hostname) {
      return res.status(400).json({ success: false, error: "Missing deviceId or hostname parameter" });
    }
    try {
      const { device, token } = agentDb.registerAgent({
        deviceId,
        hostname,
        computerName,
        deviceUuid,
        osName,
        osVersion,
        architecture,
        agentVersion
      });
      res.json({
        success: true,
        token,
        pollingInterval: device.pollingInterval,
        enabledModules: device.enabledModules,
        logLevel: device.logLevel
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
  app.post("/api/agent/heartbeat", (req, res) => {
    const authHeader = req.headers["authorization"];
    const { deviceId, performance, alerts = [] } = req.body;
    if (!deviceId || !performance) {
      return res.status(400).json({ success: false, error: "Missing deviceId or performance payload" });
    }
    const agent = agentDb.getAgent(deviceId);
    if (!agent) {
      return res.status(401).json({ success: false, error: "Endpoint Agent not registered" });
    }
    const token = authHeader && authHeader.startsWith("Bearer ") ? authHeader.substring(7) : "";
    if (agent.token !== token) {
      return res.status(401).json({ success: false, error: "Unauthorized token signature" });
    }
    try {
      const response = agentDb.updateAgentHeartbeat(deviceId, performance, alerts);
      res.json({
        success: true,
        commands: response.commands,
        pollingInterval: response.pollingInterval,
        enabledModules: response.enabledModules,
        logLevel: response.logLevel
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
  app.post("/api/agent/inventory", (req, res) => {
    const authHeader = req.headers["authorization"];
    const { deviceId, type, payload } = req.body;
    if (!deviceId || !type || payload === void 0) {
      return res.status(400).json({ success: false, error: "Missing deviceId, type, or payload parameters" });
    }
    const agent = agentDb.getAgent(deviceId);
    if (!agent) {
      return res.status(401).json({ success: false, error: "Endpoint Agent not registered" });
    }
    const token = authHeader && authHeader.startsWith("Bearer ") ? authHeader.substring(7) : "";
    if (agent.token !== token) {
      return res.status(401).json({ success: false, error: "Unauthorized token signature" });
    }
    try {
      agentDb.updateAgentInventory(deviceId, type, payload);
      res.json({ success: true, message: `Inventory [${type}] received and stored.` });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
  app.post("/api/agent/command/result", (req, res) => {
    const authHeader = req.headers["authorization"];
    const { deviceId, commandId, success, result } = req.body;
    if (!deviceId || !commandId || success === void 0) {
      return res.status(400).json({ success: false, error: "Missing deviceId, commandId, or success parameters" });
    }
    const agent = agentDb.getAgent(deviceId);
    if (!agent) {
      return res.status(401).json({ success: false, error: "Endpoint Agent not registered" });
    }
    const token = authHeader && authHeader.startsWith("Bearer ") ? authHeader.substring(7) : "";
    if (agent.token !== token) {
      return res.status(401).json({ success: false, error: "Unauthorized token signature" });
    }
    try {
      agentDb.updateCommandResult(deviceId, commandId, success, result);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
  setTimeout(() => {
    try {
      console.log("[Server] Spawning local Endpoint Security Agent background process...");
      const agentProcess = (0, import_child_process2.spawn)("npx", ["tsx", "server/agent.ts"], {
        env: {
          ...process.env,
          AGENT_SERVER_URL: "http://localhost:3000",
          AGENT_DEVICE_ID: "agent_container_host"
        }
      });
      agentProcess.stdout?.on("data", (data) => {
        console.log(`[LocalAgentStdout] ${data.toString().trim()}`);
      });
      agentProcess.stderr?.on("data", (data) => {
        console.error(`[LocalAgentStderr] ${data.toString().trim()}`);
      });
      agentProcess.on("close", (code) => {
        console.log(`[Server] Local Endpoint Agent process closed with code ${code}`);
      });
    } catch (err) {
      console.error("[Server] Failed to auto-start local Endpoint Agent:", err);
    }
  }, 4e3);
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path3.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path3.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "127.0.0.1", () => {
    console.log(`[Enterprise Network Scanner] Server running on http://127.0.0.1:${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map

import dgram from 'dgram';

/**
 * Enterprise Discovery Protocol Engine
 * Implements real-network protocol probes in pure TypeScript.
 * No mock data, no simulated results.
 */

export interface DiscoveryProtocolResults {
  netbios?: { hostname?: string; workgroup?: string };
  ssdp?: { server?: string; location?: string; modelName?: string; manufacturer?: string };
  mdns?: { hostname?: string; services: string[] };
  snmp?: { sysName?: string; sysDescr?: string; vendor?: string };
  onvif?: { endpoint?: string; manufacturer?: string; model?: string };
}

/**
 * Helper to execute a UDP transaction (send request, await response with timeout)
 */
function udpTransaction(
  ip: string,
  port: number,
  requestPayload: Buffer,
  timeoutMs: number,
  onResponse: (msg: Buffer, rinfo: dgram.RemoteInfo) => any
): Promise<any> {
  return new Promise((resolve) => {
    const client = dgram.createSocket('udp4');
    let timer: NodeJS.Timeout | null = null;
    let resolved = false;

    const cleanup = () => {
      if (timer) clearTimeout(timer);
      try {
        client.close();
      } catch (e) {}
    };

    client.on('message', (msg, rinfo) => {
      if (resolved) return;
      try {
        const parsed = onResponse(msg, rinfo);
        if (parsed) {
          resolved = true;
          cleanup();
          resolve(parsed);
        }
      } catch (err) {
        // Keep listening in case of corrupt packets
      }
    });

    client.on('error', () => {
      if (resolved) return;
      resolved = true;
      cleanup();
      resolve(null);
    });

    // Bind to ephemeral port
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

/**
 * 1. NetBIOS Node Status Query (UDP Port 137)
 * Extracts local Windows/Samba hostname, workgroup, and domain names.
 */
export function queryNetBIOS(ip: string, timeoutMs = 400): Promise<{ hostname?: string; workgroup?: string } | null> {
  const payload = Buffer.from([
    0xbc, 0x56, // Transaction ID
    0x00, 0x10, // Flags (Broadcast)
    0x00, 0x01, // Questions (1)
    0x00, 0x00, // Answer RRs
    0x00, 0x00, // Authority RRs
    0x00, 0x00, // Additional RRs
    32,         // Name length (32)
    0x43, 0x4b, 0x41, 0x41, 0x41, 0x41, 0x41, 0x41, 0x41, 0x41, 0x41, 0x41, 0x41, 0x41, 0x41, 0x41,
    0x41, 0x41, 0x41, 0x41, 0x41, 0x41, 0x41, 0x41, 0x41, 0x41, 0x41, 0x41, 0x41, 0x41, 0x41, 0x41, // CKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
    0x00,       // Null byte
    0x00, 0x21, // Type NBSTAT
    0x00, 0x01  // Class IN
  ]);

  return udpTransaction(ip, 137, payload, timeoutMs, (msg) => {
    if (msg.length < 57) return null;
    
    // Validate Transaction ID
    if (msg[0] !== 0xbc || msg[1] !== 0x56) return null;

    const numNames = msg[56];
    let offset = 57;
    let hostname = '';
    let workgroup = '';

    for (let i = 0; i < numNames; i++) {
      if (offset + 18 > msg.length) break;
      const nameBuf = msg.slice(offset, offset + 15);
      const nameType = msg[offset + 15];
      const isGroup = (msg[offset + 16] & 0x80) !== 0;

      const name = nameBuf.toString('ascii').trim();
      if (name) {
        if (!isGroup && nameType === 0x00 && !hostname) {
          hostname = name;
        } else if (isGroup && nameType === 0x00 && !workgroup) {
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

/**
 * 2. SSDP (UPnP) Unicast Probe (UDP Port 1900)
 * Gathers UPnP device server, modelName, and description document locations.
 */
export function querySSDP(ip: string, timeoutMs = 400): Promise<{ server?: string; location?: string; modelName?: string } | null> {
  const payloadStr = 
    'M-SEARCH * HTTP/1.1\r\n' +
    'HOST: 239.255.255.250:1900\r\n' +
    'MAN: "ssdp:discover"\r\n' +
    'MX: 1\r\n' +
    'ST: ssdp:all\r\n' +
    '\r\n';
  const payload = Buffer.from(payloadStr, 'utf-8');

  return udpTransaction(ip, 1900, payload, timeoutMs, (msg) => {
    const text = msg.toString('utf-8');
    if (!text.includes('HTTP/1.1')) return null;

    const headers: Record<string, string> = {};
    const lines = text.split('\r\n');
    for (const line of lines) {
      const parts = line.split(':');
      if (parts.length >= 2) {
        const key = parts[0].trim().toUpperCase();
        const val = parts.slice(1).join(':').trim();
        headers[key] = val;
      }
    }

    const server = headers['SERVER'];
    const location = headers['LOCATION'];
    const st = headers['ST'];

    if (server || location || st) {
      // Guess model name from location URL if possible
      let modelName: string | undefined;
      if (location) {
        const match = location.match(/\/([^/]+)\.(xml|json)/i);
        if (match && match[1]) {
          modelName = match[1].replace(/[-_]/g, ' ');
        }
      }
      return { server, location, modelName };
    }
    return null;
  });
}

/**
 * 3. mDNS Unicast Lookup (UDP Port 5353)
 * Resolves local Apple, Chromecast, Bonjour, and smart devices.
 */
export function queryMDNS(ip: string, timeoutMs = 400): Promise<{ hostname?: string; services: string[] } | null> {
  const payload = Buffer.from([
    0x00, 0x00, // Transaction ID
    0x00, 0x00, // Flags
    0x00, 0x01, // Questions (1)
    0x00, 0x00, // Answer RRs
    0x00, 0x00, // Authority RRs
    0x00, 0x00, // Additional RRs
    9, 0x5f, 0x73, 0x65, 0x72, 0x76, 0x69, 0x63, 0x65, 0x73, // 9 _services
    7, 0x5f, 0x64, 0x6e, 0x73, 0x2d, 0x73, 0x64, // 7 _dns-sd
    4, 0x5f, 0x75, 0x64, 0x70, // 4 _udp
    5, 0x6c, 0x6f, 0x63, 0x61, 0x6c, // 5 local
    0x00, // Null
    0x00, 0x0c, // Type PTR
    0x00, 0x01  // Class IN
  ]);

  return udpTransaction(ip, 5353, payload, timeoutMs, (msg) => {
    const text = msg.toString('utf-8');
    const services: string[] = [];
    let hostname = '';

    // Simple string extraction of .local hostnames and services
    const localMatches = text.match(/([a-zA-Z0-9-]{3,})\.local/gi);
    if (localMatches && localMatches.length > 0) {
      hostname = localMatches[0].split('.')[0];
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

/**
 * 4. ONVIF / WS-Discovery Probe (UDP Port 3702)
 * Discovers IP Security Cameras, NVRs, and Video Recorders.
 */
export function queryONVIF(ip: string, timeoutMs = 400): Promise<{ endpoint?: string; manufacturer?: string; model?: string } | null> {
  const uuid = 'c032cfdd-c3cd-4935-a6e3-' + Math.floor(Math.random() * 1000000000000).toString(16).padStart(12, '0');
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

  const payload = Buffer.from(probe, 'utf-8');

  return udpTransaction(ip, 3702, payload, timeoutMs, (msg) => {
    const text = msg.toString('utf-8');
    if (!text.toLowerCase().includes('probe') && !text.toLowerCase().includes('device')) return null;

    let manufacturer = '';
    let model = '';
    let endpoint = '';

    // Match WS-Discovery/ONVIF structures
    const xAddrsMatch = text.match(/<[^:>]*:?XAddrs>([^<]+)<\/[^>]+:?XAddrs>/i);
    if (xAddrsMatch) endpoint = xAddrsMatch[1];

    const scopesMatch = text.match(/<[^:>]*:?Scopes>([^<]+)<\/[^>]+:?Scopes>/i);
    if (scopesMatch) {
      const scopes = scopesMatch[1].split(/\s+/);
      for (const s of scopes) {
        if (s.startsWith('onvif://www.onvif.org/hardware/')) {
          model = decodeURIComponent(s.replace('onvif://www.onvif.org/hardware/', ''));
        } else if (s.startsWith('onvif://www.onvif.org/name/')) {
          manufacturer = decodeURIComponent(s.replace('onvif://www.onvif.org/name/', ''));
        }
      }
    }

    if (endpoint || manufacturer || model) {
      return { endpoint, manufacturer, model };
    }
    return null;
  });
}

/**
 * 5. Simple SNMP Version 2c Engine (UDP Port 161)
 * Queries SysDescr (1.3.6.1.2.1.1.1.0) and SysName (1.3.6.1.2.1.1.5.0) under community "public".
 */
export function querySNMP(ip: string, community = 'public', timeoutMs = 400): Promise<{ sysName?: string; sysDescr?: string; vendor?: string } | null> {
  // Construct precise SNMP v2c GetRequest byte array for OIDs 1.3.6.1.2.1.1.1.0 and 1.3.6.1.2.1.1.5.0
  const commBytes = Buffer.from(community, 'utf-8');
  const commLen = commBytes.length;

  // Assembly of variable bindings
  // sysDescr OID: 1.3.6.1.2.1.1.1.0 -> DER encoding: 06 08 2b 06 01 02 01 01 01 00 (0x2b=43, 0x06=6, 1.3...)
  const oidSysDescr = Buffer.from([0x06, 0x08, 0x2b, 0x06, 0x01, 0x02, 0x01, 0x01, 0x01, 0x00, 0x05, 0x00]);
  // sysName OID: 1.3.6.1.2.1.1.5.0 -> DER encoding: 06 08 2b 06 01 02 01 01 05 00
  const oidSysName = Buffer.from([0x06, 0x08, 0x2b, 0x06, 0x01, 0x02, 0x01, 0x01, 0x05, 0x00, 0x05, 0x00]);

  const varbinds = Buffer.concat([
    Buffer.from([0x30, oidSysDescr.length]), oidSysDescr,
    Buffer.from([0x30, oidSysName.length]), oidSysName
  ]);

  const varbindList = Buffer.concat([Buffer.from([0x30, varbinds.length]), varbinds]);

  // Request PDU: 0xa0 (GetRequest)
  // Request-ID: 0x02 0x04 0x11 0x22 0x33 0x44 (ID: 0x11223344)
  // Error-Status: 0x02 0x01 0x00
  // Error-Index:  0x02 0x01 0x00
  const pduHeader = Buffer.from([
    0x02, 0x04, 0x11, 0x22, 0x33, 0x44, // Request ID
    0x02, 0x01, 0x00,                   // Error Status
    0x02, 0x01, 0x00                    // Error Index
  ]);

  const pduBody = Buffer.concat([pduHeader, varbindList]);
  const pdu = Buffer.concat([Buffer.from([0xa0, pduBody.length]), pduBody]);

  // Main Sequence
  // Version: 0x02 0x01 0x01 (v2c is value 1)
  // Community: 0x04, length, value
  const snmpHeader = Buffer.concat([
    Buffer.from([0x02, 0x01, 0x01]), // Version v2c (1)
    Buffer.from([0x04, commLen]), commBytes
  ]);

  const snmpBody = Buffer.concat([snmpHeader, pdu]);
  const payload = Buffer.concat([Buffer.from([0x30, snmpBody.length]), snmpBody]);

  return udpTransaction(ip, 161, payload, timeoutMs, (msg) => {
    // ASN.1 BER SNMP response decoding
    if (msg.length < 20 || msg[0] !== 0x30) return null;

    let sysName: string | undefined;
    let sysDescr: string | undefined;

    // Direct search for the octet string representations (0x04 tag followed by length)
    // OID signatures for matching
    const sysDescrOidSig = Buffer.from([0x2b, 0x06, 0x01, 0x02, 0x01, 0x01, 0x01, 0x00]);
    const sysNameOidSig = Buffer.from([0x2b, 0x06, 0x01, 0x02, 0x01, 0x01, 0x05, 0x00]);

    const locateValueForOid = (sig: Buffer): string | undefined => {
      const idx = msg.indexOf(sig);
      if (idx === -1) return undefined;
      
      // The value type is immediately after the OID. In the response, it's:
      // OID Tag + Length + Value Tag (0x04 for Octet String) + Length + Content
      let searchPos = idx + sig.length;
      while (searchPos + 2 < msg.length) {
        if (msg[searchPos] === 0x04) { // Octet String
          const len = msg[searchPos + 1];
          if (searchPos + 2 + len <= msg.length) {
            return msg.slice(searchPos + 2, searchPos + 2 + len).toString('utf-8');
          }
        }
        searchPos++;
      }
      return undefined;
    };

    sysDescr = locateValueForOid(sysDescrOidSig);
    sysName = locateValueForOid(sysNameOidSig);

    if (sysName || sysDescr) {
      // Deduce vendor from system description if present
      let vendor: string | undefined;
      if (sysDescr) {
        const descrLower = sysDescr.toLowerCase();
        if (descrLower.includes('cisco')) vendor = 'Cisco Systems, Inc.';
        else if (descrLower.includes('linux')) vendor = 'Linux / Open Source';
        else if (descrLower.includes('windows')) vendor = 'Microsoft Corporation';
        else if (descrLower.includes('epson')) vendor = 'Epson';
        else if (descrLower.includes('hp')) vendor = 'HP Inc.';
        else if (descrLower.includes('mikrotik')) vendor = 'MikroTik';
        else if (descrLower.includes('ubiquiti') || descrLower.includes('ubnt')) vendor = 'Ubiquiti Networks, Inc.';
        else if (descrLower.includes('synology')) vendor = 'Synology Inc.';
      }
      return { sysName, sysDescr, vendor };
    }
    return null;
  });
}

/**
 * Executes all 5 UDP-based protocols in parallel for a target host.
 */
export async function queryDiscoveryProtocols(ip: string, timeoutMs = 400): Promise<DiscoveryProtocolResults> {
  const isLocalhost = ip === '127.0.0.1' || ip === 'localhost';
  if (isLocalhost) {
    // Skip external UDP probes for localhost to save scan duration
    return {};
  }

  const [netbios, ssdp, mdns, snmp, onvif] = await Promise.all([
    queryNetBIOS(ip, timeoutMs).catch(() => null),
    querySSDP(ip, timeoutMs).catch(() => null),
    queryMDNS(ip, timeoutMs).catch(() => null),
    querySNMP(ip, 'public', timeoutMs).catch(() => null),
    queryONVIF(ip, timeoutMs).catch(() => null)
  ]);

  const results: DiscoveryProtocolResults = {};
  if (netbios) results.netbios = netbios;
  if (ssdp) results.ssdp = ssdp;
  if (mdns) results.mdns = mdns;
  if (snmp) results.snmp = snmp;
  if (onvif) results.onvif = onvif;

  return results;
}

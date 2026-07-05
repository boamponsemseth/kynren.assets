import express from 'express';
import path from 'path';
import net from 'net';
import { spawn } from 'child_process';
import { createServer as createViteServer } from 'vite';
import { getActiveInterfaces, scanHost, runWithConcurrencyLimit, pingHost, PingResult, scanHostExtended, parseIpTarget } from './server/scanner';
import { inventoryDb } from './server/inventoryDb';
import { agentDb } from './server/agentDb';

function checkPort(ip: string, port: number, timeoutMs = 250): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(timeoutMs);
    
    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });
    
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    
    socket.on('error', () => {
      socket.destroy();
      resolve(false);
    });
    
    socket.connect(port, ip);
  });
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Enable JSON request body parsing
  app.use(express.json());

  // API: Get actual client IP address
  app.get('/api/client-ip', (req, res) => {
    const ip = req.headers['x-forwarded-for'] || 
               req.headers['x-real-ip'] || 
               req.socket.remoteAddress || 
               '127.0.0.1';
    const cleanIp = typeof ip === 'string' ? ip.split(',')[0].trim() : String(ip);
    res.json({ success: true, ip: cleanIp });
  });

  // API 1: Fetch all active host adapters & network subnets
  app.get('/api/interfaces', (req, res) => {
    try {
      const adapters = getActiveInterfaces();
      res.json({ success: true, interfaces: adapters });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // API 3: Single-Device ICMP Ping
  app.get('/api/ping/device', async (req, res) => {
    const { ip, timeout = '1000' } = req.query;
    if (!ip || typeof ip !== 'string') {
      return res.status(400).json({ success: false, error: 'Missing IP or Host parameter' });
    }
    const timeoutMs = parseInt(timeout as string, 10) || 1000;
    try {
      const result = await scanHost(ip, timeoutMs);
      res.json({ success: true, result });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // API: Virtual Assistant Chat & Vision Processing
  app.post('/api/assistant/chat', async (req, res) => {
    const { prompt, image, appState, history, kbArticles } = req.body;
    
    // Fallback simulated answers for when Gemini API key is missing
    const getSimulatedResponse = (userPrompt: string, hasImg: boolean) => {
      const lower = userPrompt.toLowerCase();
      
      // Smart Knowledge Base search fallback
      if (kbArticles && Array.isArray(kbArticles) && kbArticles.length > 0) {
        let bestMatch: any = null;
        let highestScore = 0;
        
        kbArticles.forEach((art: any) => {
          let score = 0;
          const titleWords = art.title.toLowerCase().split(/\s+/);
          const contentWords = art.content.toLowerCase().split(/\s+/);
          const tags = (art.tags || []).map((t: string) => t.toLowerCase());
          
          titleWords.forEach((word: string) => {
            if (word.length > 3 && lower.includes(word)) score += 3;
          });
          contentWords.forEach((word: string) => {
            if (word.length > 3 && lower.includes(word)) score += 1;
          });
          tags.forEach((tag: string) => {
            if (lower.includes(tag)) score += 4;
          });
          
          if (score > highestScore) {
            highestScore = score;
            bestMatch = art;
          }
        });
        
        if (bestMatch && highestScore >= 3) {
          return `📚 **Knowledge Base Retrieval: [PROTOCOL: ${bestMatch.title}]**\n\nI have retrieved the standard operating procedure for **${bestMatch.title}** (${bestMatch.category}) managed by **${bestMatch.author || 'Seth Boa Amponsem'}**:\n\n${bestMatch.content}\n\n*(Simulated Offline Mode: Protocol matched from active system Wiki)*`;
        }
      }

      let response = "";
      if (hasImg) {
        response = "Camera image analyzed. I've scanned the visual feed and detected what appears to be a high-performance networking workstation or server cabinet terminal. Diagnostic analysis indicates proper physical port connections, with ambient LED statuses indicating nominal operating temperatures (approx. 24°C). No physical structural damage or cable stress is visible in the captured frame.";
      } else if (lower.includes('scan') || lower.includes('status') || lower.includes('nodes') || lower.includes('tickets')) {
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
      } else if (lower.includes('hello') || lower.includes('hi') || lower.includes('hey')) {
        response = "Hello Operator! I am the Kynren Technology Operations Assistant. I can help you monitor live network pings, troubleshoot helpdesk tickets, analyze camera frames of networking hardware, or scan current inventory statistics. What operations shall we review?";
      } else {
        response = "Acknowledged, Operator. Standard diagnostics indicate all microservices are active. If you have specific questions about our current stock register, network nodes, or want me to analyze a hardware photo using the terminal camera, please let me know!";
      }
      return response;
    };
 
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        // Safe, highly contextual simulated responses
        const text = getSimulatedResponse(prompt || "", !!image);
        return res.json({ success: true, text, simulated: true });
      }
 
      // Lazy initialization of GoogleGenAI
      const { GoogleGenAI } = await import('@google/genai');
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });
 
      // Assemble content parts from history
      let contents: any[] = [];
      
      if (history && Array.isArray(history) && history.length > 0) {
        let lastRole: string | null = null;
        for (const msg of history) {
          if (!msg.text && !msg.image) continue;
          
          const role = msg.sender === 'user' ? 'user' : 'model';
          
          // Merge consecutive messages with same role (Gemini requirements)
          if (role === lastRole && contents.length > 0) {
            const lastPart = contents[contents.length - 1].parts;
            if (msg.text) {
              lastPart.push({ text: `\n\n${msg.text}` });
            }
            if (msg.image && typeof msg.image === 'string') {
              const base64Data = msg.image.split(',')[1] || msg.image;
              const mimeType = msg.image.split(';')[0]?.split(':')[1] || 'image/jpeg';
              lastPart.unshift({
                inlineData: {
                  data: base64Data,
                  mimeType
                }
              });
            }
            continue;
          }
          
          const parts: any[] = [];
          if (msg.image && typeof msg.image === 'string') {
            const base64Data = msg.image.split(',')[1] || msg.image;
            const mimeType = msg.image.split(';')[0]?.split(':')[1] || 'image/jpeg';
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
        // Fallback if history is empty (backwards compatibility)
        const parts: any[] = [];
        if (image && typeof image === 'string') {
          const base64Data = image.split(',')[1] || image;
          const mimeType = image.split(';')[0]?.split(':')[1] || 'image/jpeg';
          parts.push({
            inlineData: {
              data: base64Data,
              mimeType
            }
          });
        }
        parts.push({ text: prompt || "Analyze this." });
        contents.push({ role: 'user', parts });
      }
 
      // Assemble system context from application state and knowledge base
      let systemContext = "You are Kynren, a highly advanced, retro-futuristic Technical Operations Assistant for Kynren Technology Operations.";
      
      if (appState) {
        systemContext += `\n\nHere is the live status of the network scan and app:
- Total assets: ${appState.totalAssets || 'unknown'}
- Online nodes: ${appState.onlineNodesCount || 'unknown'}
- Degraded nodes: ${appState.degradedNodes || '0'}
- Active Helpdesk tickets: ${appState.activeTickets || 'unknown'}
- Low-stock consumables: ${appState.lowStockConsumables || 'unknown'}`;
      }

      if (kbArticles && Array.isArray(kbArticles) && kbArticles.length > 0) {
        systemContext += "\n\n=== SYSTEM KNOWLEDGE BASE / STANDARD OPERATING PROCEDURES (SOP) ===\n";
        systemContext += "You have active access to the following operational documentation and troubleshooting manuals published in the Wiki. Use this knowledge to answer technical questions and guide the Operator:\n";
        kbArticles.forEach((art: any) => {
          systemContext += `\n[PROTOCOL: ${art.title}] (Category: ${art.category})\n`;
          if (art.author) systemContext += `Author: ${art.author}\n`;
          if (art.tags && art.tags.length > 0) systemContext += `Tags: ${art.tags.join(', ')}\n`;
          systemContext += `Instructions:\n${art.content}\n`;
          systemContext += "--------------------------------------\n";
        });
        systemContext += "\nWhen answering queries based on the Knowledge Base, refer to the specific protocols (e.g. '[PROTOCOL: Title]') and category. If appropriate, cite the specific author or tags. If the user's question is not directly addressed in the Knowledge Base, use your general technical expertise, but prioritize the provided procedures.";
      }

      systemContext += "\n\nGive concise, highly technical but accessible answers. Use bolding and lists to format your answers cleanly. When an image is provided, identify any devices, wiring, setup, or objects, and analyze them in a fictional diagnostic or technical networking context.";
 
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: contents,
        config: {
          systemInstruction: systemContext
        }
      });
 
      res.json({ success: true, text: response.text });
    } catch (err: any) {
      console.error("Gemini API Error:", err);
      // Fallback to simulation instead of crashing
      const text = getSimulatedResponse(prompt || "", !!image);
      res.json({ success: true, text, simulated: true, error: err.message });
    }
  });

  // API 4: TCP Port Scanner for individual host
  app.get('/api/scan/ports', async (req, res) => {
    const { ip, ports } = req.query;
    if (!ip || typeof ip !== 'string') {
      return res.status(400).json({ success: false, error: 'Missing IP parameter' });
    }
    const portsToScan = typeof ports === 'string' 
      ? ports.split(',').map(p => parseInt(p, 10))
      : [21, 22, 23, 25, 53, 80, 110, 443, 3389, 8080];
    
    try {
      const results: Record<number, boolean> = {};
      const promises = portsToScan.map(async (port) => {
        const open = await checkPort(ip, port, 250);
        results[port] = open;
      });
      await Promise.all(promises);
      res.json({ success: true, ip, ports: results });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // API: Get Inventory Database
  app.get('/api/inventory', (req, res) => {
    try {
      const devices = inventoryDb.getDevices();
      res.json({ success: true, devices });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // API: Delete specific device
  app.post('/api/inventory/delete', (req, res) => {
    const { id } = req.body;
    if (!id) return res.status(400).json({ success: false, error: 'Missing device ID' });
    try {
      inventoryDb.deleteDevice(id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // API: Reset / Clear inventory database
  app.post('/api/inventory/clear-all', (req, res) => {
    try {
      inventoryDb.clearAll();
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // API: Get active alerts/notifications
  app.get('/api/inventory/notifications', (req, res) => {
    try {
      const notifications = inventoryDb.getNotifications();
      res.json({ success: true, notifications });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // API: Clear notifications
  app.post('/api/inventory/clear-notifications', (req, res) => {
    try {
      inventoryDb.clearNotifications();
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // API: Resolve alert
  app.post('/api/inventory/notifications/resolve', (req, res) => {
    const { id } = req.body;
    if (!id) return res.status(400).json({ success: false, error: 'Missing notification ID' });
    try {
      inventoryDb.markNotificationResolved(id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // API: Export inventory report
  app.get('/api/inventory/export', (req, res) => {
    const { format = 'json' } = req.query;
    const devices = inventoryDb.getDevices();

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="inventory_report.csv"');
      
      const headers = ['ID', 'IP Address', 'MAC Address', 'Hostname', 'Vendor', 'OS', 'Device Type', 'Open Ports', 'Status', 'First Seen', 'Last Seen'];
      const rows = devices.map(d => [
        d.id, d.ip, d.mac || '', d.hostname || '', d.vendor || '', d.os || '', d.deviceType || '', (d.openPorts || []).join(';'), d.status, d.firstSeen, d.lastSeen
      ]);
      const csvContent = [headers.join(','), ...rows.map(r => r.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))].join('\n');
      return res.send(csvContent);
    }
    
    if (format === 'xml') {
      res.setHeader('Content-Type', 'application/xml');
      res.setHeader('Content-Disposition', 'attachment; filename="inventory_report.xml"');
      let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<devices>\n';
      devices.forEach(d => {
        xml += '  <device>\n';
        xml += `    <id>${d.id}</id>\n`;
        xml += `    <ip>${d.ip}</ip>\n`;
        xml += `    <mac>${d.mac || ''}</mac>\n`;
        xml += `    <hostname>${d.hostname || ''}</hostname>\n`;
        xml += `    <vendor>${d.vendor || ''}</vendor>\n`;
        xml += `    <os>${d.os || ''}</os>\n`;
        xml += `    <deviceType>${d.deviceType || ''}</deviceType>\n`;
        xml += `    <status>${d.status}</status>\n`;
        xml += `    <firstSeen>${d.firstSeen}</firstSeen>\n`;
        xml += `    <lastSeen>${d.lastSeen}</lastSeen>\n`;
        xml += '  </device>\n';
      });
      xml += '</devices>';
      return res.send(xml);
    }

    if (format === 'html') {
      res.setHeader('Content-Type', 'text/html');
      res.setHeader('Content-Disposition', 'attachment; filename="inventory_report.html"');
      let html = '<html><head><style>table { border-collapse: collapse; width: 100%; } th, td { border: 1px solid #ddd; padding: 8px; text-align: left; } tr:nth-child(even) { background-color: #f2f2f2; } th { background-color: #059669; color: white; }</style></head><body>';
      html += '<h2>Enterprise Network Discovery Inventory</h2>';
      html += '<table><tr><th>ID</th><th>IP</th><th>MAC</th><th>Hostname</th><th>Vendor</th><th>OS</th><th>Device Type</th><th>Status</th><th>Last Seen</th></tr>';
      devices.forEach(d => {
        html += `<tr><td>${d.id}</td><td>${d.ip}</td><td>${d.mac || ''}</td><td>${d.hostname || ''}</td><td>${d.vendor || ''}</td><td>${d.os || ''}</td><td>${d.deviceType || ''}</td><td>${d.status}</td><td>${d.lastSeen}</td></tr>`;
      });
      html += '</table></body></html>';
      return res.send(html);
    }

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="inventory_report.json"');
    res.send(JSON.stringify(devices, null, 2));
  });

  // API 2: Stream-based network scanner using Server-Sent Events (SSE)
  app.get('/api/scan/stream', async (req, res) => {
    // Enable Server-Sent Events headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no' // bypass buffering on proxies (like NGINX)
    });

    const { subnet, concurrency = '100', timeout = '500', startIndex = '0', mode = 'normal', ports = '' } = req.query;
    if (!subnet || typeof subnet !== 'string') {
      res.write(`data: ${JSON.stringify({ type: 'error', message: 'Missing or invalid subnet parameter' })}\n\n`);
      res.end();
      return;
    }

    const maxConcurrency = Math.min(1000, Math.max(1, parseInt(concurrency as string, 10)));
    const pingTimeout = Math.min(5000, Math.max(50, parseInt(timeout as string, 10)));
    const startIdx = Math.max(0, parseInt(startIndex as string, 10) || 0);
    const scanMode = (mode as 'quick' | 'normal' | 'deep') || 'normal';

    // Parse target ports
    const DEFAULT_PORTS = [21, 22, 23, 25, 53, 80, 110, 135, 139, 443, 445, 1433, 3306, 3389, 5432, 5900, 8080, 8443];
    let portsToScan: number[] = [];
    if (scanMode === 'deep') {
      if (typeof ports === 'string' && ports.trim()) {
        portsToScan = ports.split(',').map(p => parseInt(p.trim(), 10)).filter(p => !isNaN(p) && p > 0 && p <= 65535);
      } else {
        portsToScan = DEFAULT_PORTS;
      }
    } else if (typeof ports === 'string' && ports.trim()) {
      portsToScan = ports.split(',').map(p => parseInt(p.trim(), 10)).filter(p => !isNaN(p) && p > 0 && p <= 65535);
    }

    // Fetch the target list of IPs to scan
    let allIps: string[] = parseIpTarget(subnet);

    if (allIps.length === 0 || (allIps.length === 1 && allIps[0] === subnet && !subnet.match(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/))) {
      const adapters = getActiveInterfaces();
      const matchedAdapter = adapters.find((ad) => ad.subnet === subnet || ad.subnet.replace(/\/\d+$/, '.0') === subnet.replace(/\/\d+$/, '.0') || subnet.startsWith(ad.ip.split('.').slice(0, 3).join('.')));
      
      if (matchedAdapter) {
        allIps = matchedAdapter.ips;
      } else {
        // Fallback: parse subnet from IP parameter directly if specified in format (e.g., "10.12.10.0")
        const subnetPrefix = subnet.split('.').slice(0, 3).join('.');
        allIps = [];
        for (let i = 1; i <= 254; i++) {
          allIps.push(`${subnetPrefix}.${i}`);
        }
      }
    }

    const ipsToScan = allIps.slice(startIdx);
    const totalOriginalCount = allIps.length;

    let isCancelled = false;
    req.on('close', () => {
      isCancelled = true;
      console.log(`Scan streaming connection closed by client. Target scan aborted: ${subnet}`);
    });

    // Notify client of initialization
    res.write(`data: ${JSON.stringify({ type: 'init', total: totalOriginalCount, startIndex: startIdx, subnet, concurrency: maxConcurrency, timeout: pingTimeout, mode: scanMode, portsToScan })}\n\n`);

    const startTime = Date.now();
    let hostsOnline = 0;
    let hostsScanned = startIdx;

    const tasks = ipsToScan.map((ip) => async (): Promise<PingResult> => {
      if (isCancelled) {
        return { ip, status: 'offline', latency: 0, ttl: 0, packetLoss: 100 };
      }
      return await scanHostExtended(ip, scanMode, portsToScan, pingTimeout);
    });

    await runWithConcurrencyLimit(
      maxConcurrency,
      tasks,
      (pingResult, index) => {
        if (isCancelled) return;
        
        hostsScanned++;
        if (pingResult.status === 'online') {
          hostsOnline++;
          inventoryDb.updateDevice(pingResult);
        }

        // Send intermediate result update
        res.write(`data: ${JSON.stringify({
          type: 'progress',
          result: pingResult,
          percent: Math.round((hostsScanned / totalOriginalCount) * 100),
          scanned: hostsScanned,
          total: totalOriginalCount,
          onlineCount: hostsOnline,
          elapsedTime: Date.now() - startTime
        })}\n\n`);
      },
      () => isCancelled
    );

    if (!isCancelled) {
      res.write(`data: ${JSON.stringify({
        type: 'complete',
        total: totalOriginalCount,
        onlineCount: hostsOnline,
        scanDuration: Date.now() - startTime
      })}\n\n`);
    }
    
    res.end();
  });

  // ==========================================
  // CENTRAL ENDPOINT AGENT MANAGEMENT APIs
  // ==========================================

  // API 1: Get list of all registered Endpoint Agents
  app.get('/api/agents', (req, res) => {
    try {
      const agents = agentDb.getAgents();
      res.json({ success: true, agents });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // API 2: Configure Endpoint Agent Settings
  app.post('/api/agents/config', (req, res) => {
    const { deviceId, pollingInterval, enabledModules, logLevel, alertThresholds } = req.body;
    if (!deviceId) {
      return res.status(400).json({ success: false, error: 'Missing deviceId parameter' });
    }
    try {
      agentDb.updateConfig(deviceId, { pollingInterval, enabledModules, logLevel, alertThresholds });
      res.json({ success: true, message: 'Endpoint configuration updated successfully.' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // API 3: Queue Remote Administrative Command for Agent
  app.post('/api/agents/command', (req, res) => {
    const { deviceId, command, arguments: cmdArgs } = req.body;
    if (!deviceId || !command) {
      return res.status(400).json({ success: false, error: 'Missing deviceId or command parameter' });
    }
    try {
      const cmd = agentDb.queueCommand(deviceId, command, cmdArgs);
      if (cmd) {
        res.json({ success: true, command: cmd, message: `Command '${command}' queued successfully.` });
      } else {
        res.status(404).json({ success: false, error: 'Endpoint Agent not found' });
      }
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // API 4: Resolve an Agent Security Alert
  app.post('/api/agents/alert/resolve', (req, res) => {
    const { deviceId, alertId } = req.body;
    if (!deviceId || !alertId) {
      return res.status(400).json({ success: false, error: 'Missing deviceId or alertId parameter' });
    }
    try {
      agentDb.resolveAlert(deviceId, alertId);
      res.json({ success: true, message: 'Security alert marked as resolved.' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // API 5: Delete Endpoint Agent Registration
  app.post('/api/agents/delete', (req, res) => {
    const { deviceId } = req.body;
    if (!deviceId) {
      return res.status(400).json({ success: false, error: 'Missing deviceId parameter' });
    }
    try {
      agentDb.deleteAgent(deviceId);
      res.json({ success: true, message: 'Endpoint Agent registration successfully purged.' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // API 6: Clear all alerts of an Endpoint Agent
  app.post('/api/agents/clear-alerts', (req, res) => {
    const { deviceId } = req.body;
    if (!deviceId) {
      return res.status(400).json({ success: false, error: 'Missing deviceId parameter' });
    }
    try {
      agentDb.clearAlerts(deviceId);
      res.json({ success: true, message: 'Alert log cleared.' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // API 7: Export Agent Data
  app.get('/api/agents/export', (req, res) => {
    const format = req.query.format || 'json';
    const agents = agentDb.getAgents();

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=agents_export.csv');
      
      let csv = 'Device ID,Hostname,OS Name,OS Version,Architecture,Status,Last Seen\n';
      agents.forEach(a => {
        csv += `"${a.deviceId}","${a.hostname}","${a.osName}","${a.osVersion}","${a.architecture}","${a.status}","${a.lastSeen}"\n`;
      });
      return res.send(csv);
    } else if (format === 'html') {
      res.setHeader('Content-Type', 'text/html');
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
      agents.forEach(a => {
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

  // ==========================================
  // SECURE ENDPOINT AGENT PROTOCOL ENDPOINTS
  // ==========================================

  // 1. Agent Registration
  app.post('/api/agent/register', (req, res) => {
    const { deviceId, hostname, computerName, deviceUuid, osName, osVersion, architecture, agentVersion } = req.body;
    if (!deviceId || !hostname) {
      return res.status(400).json({ success: false, error: 'Missing deviceId or hostname parameter' });
    }
    try {
      const { device, token } = agentDb.registerAgent({
        deviceId, hostname, computerName, deviceUuid, osName, osVersion, architecture, agentVersion
      });
      res.json({
        success: true,
        token,
        pollingInterval: device.pollingInterval,
        enabledModules: device.enabledModules,
        logLevel: device.logLevel
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 2. Agent Heartbeat & Performance Reporting (Requires Token Validation)
  app.post('/api/agent/heartbeat', (req, res) => {
    const authHeader = req.headers['authorization'];
    const { deviceId, performance, alerts = [] } = req.body;

    if (!deviceId || !performance) {
      return res.status(400).json({ success: false, error: 'Missing deviceId or performance payload' });
    }

    const agent = agentDb.getAgent(deviceId);
    if (!agent) {
      return res.status(401).json({ success: false, error: 'Endpoint Agent not registered' });
    }

    // Token Authentication Check
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : '';
    if (agent.token !== token) {
      return res.status(401).json({ success: false, error: 'Unauthorized token signature' });
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
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 3. Agent Full/Incremental Inventory reporting (Requires Token Validation)
  app.post('/api/agent/inventory', (req, res) => {
    const authHeader = req.headers['authorization'];
    const { deviceId, type, payload } = req.body;

    if (!deviceId || !type || payload === undefined) {
      return res.status(400).json({ success: false, error: 'Missing deviceId, type, or payload parameters' });
    }

    const agent = agentDb.getAgent(deviceId);
    if (!agent) {
      return res.status(401).json({ success: false, error: 'Endpoint Agent not registered' });
    }

    // Token Authentication Check
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : '';
    if (agent.token !== token) {
      return res.status(401).json({ success: false, error: 'Unauthorized token signature' });
    }

    try {
      agentDb.updateAgentInventory(deviceId, type, payload);
      res.json({ success: true, message: `Inventory [${type}] received and stored.` });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 4. Agent Remote Command execution reporting (Requires Token Validation)
  app.post('/api/agent/command/result', (req, res) => {
    const authHeader = req.headers['authorization'];
    const { deviceId, commandId, success, result } = req.body;

    if (!deviceId || !commandId || success === undefined) {
      return res.status(400).json({ success: false, error: 'Missing deviceId, commandId, or success parameters' });
    }

    const agent = agentDb.getAgent(deviceId);
    if (!agent) {
      return res.status(401).json({ success: false, error: 'Endpoint Agent not registered' });
    }

    // Token Check
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : '';
    if (agent.token !== token) {
      return res.status(401).json({ success: false, error: 'Unauthorized token signature' });
    }

    try {
      agentDb.updateCommandResult(deviceId, commandId, success, result);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Spawn local Endpoint Agent in the background to report container metrics
  setTimeout(() => {
    try {
      console.log('[Server] Spawning local Endpoint Security Agent background process...');
      const agentProcess = spawn('npx', ['tsx', 'server/agent.ts'], {
        env: {
          ...process.env,
          AGENT_SERVER_URL: 'http://localhost:3000',
          AGENT_DEVICE_ID: 'agent_container_host'
        }
      });

      agentProcess.stdout?.on('data', (data) => {
        console.log(`[LocalAgentStdout] ${data.toString().trim()}`);
      });

      agentProcess.stderr?.on('data', (data) => {
        console.error(`[LocalAgentStderr] ${data.toString().trim()}`);
      });

      agentProcess.on('close', (code) => {
        console.log(`[Server] Local Endpoint Agent process closed with code ${code}`);
      });
    } catch (err) {
      console.error('[Server] Failed to auto-start local Endpoint Agent:', err);
    }
  }, 4000);

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    // Serve static frontend build output files
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '127.0.0.1', () => {
    console.log(`[Enterprise Network Scanner] Server running on http://127.0.0.1:${PORT}`);
  });
}

startServer();

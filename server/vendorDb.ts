/**
 * Enterprise OUI Vendor Database
 * Matches the first 3 octets of a MAC address to determine the network card manufacturer.
 */
const OUI_DATABASE: Record<string, string> = {
  '00:15:5D': 'Microsoft Corporation (Hyper-V)',
  '00:03:FF': 'Microsoft Corporation',
  '00:05:69': 'VMware, Inc.',
  '00:0C:29': 'VMware, Inc.',
  '00:50:56': 'VMware, Inc.',
  '00:1C:42': 'Parallels, Inc.',
  '00:16:3E': 'XenSource / Red Hat / Oracle',
  '08:00:27': 'Oracle Corporation (VirtualBox)',
  '52:54:00': 'QEMU / KVM Virtual NIC',
  '00:15:5d': 'Microsoft Corporation (Hyper-V)',
  '00:0c:29': 'VMware, Inc.',
  
  // Cisco Systems
  '00:00:0C': 'Cisco Systems, Inc.',
  '00:01:42': 'Cisco Systems, Inc.',
  '00:01:C7': 'Cisco Systems, Inc.',
  '00:03:E3': 'Cisco Systems, Inc.',
  '00:0B:FC': 'Cisco Systems, Inc.',
  '00:1B:2A': 'Cisco Systems, Inc.',
  '00:27:0D': 'Cisco Systems, Inc.',
  
  // Realtek
  '00:E0:4C': 'Realtek Semiconductor Corp.',
  '00:14:D1': 'Realtek Semiconductor Corp.',
  
  // Intel
  '00:1B:21': 'Intel Corporation',
  '00:1C:C0': 'Intel Corporation',
  '00:1F:3C': 'Intel Corporation',
  '00:21:5A': 'Intel Corporation',
  '00:21:6A': 'Intel Corporation',
  'A4:4E:31': 'Intel Corporation',
  'E4:A8:DF': 'Intel Corporation',
  
  // Hardware / Pro Audio / AV vendors from topology seed data
  '00:11:22': 'Meyer Sound Laboratories',
  '00:1F:29': 'Chauvet Professional',
  '00:1B:6A': 'Riedel Communications',
  
  // Common consumer & network gear
  '00:14:22': 'Dell Inc.',
  '00:18:8B': 'Dell Inc.',
  '00:23:AE': 'Dell Inc.',
  '00:26:B9': 'Dell Inc.',
  '00:11:85': 'HP Inc.',
  '00:17:A4': 'HP Inc.',
  '00:22:64': 'HP Inc.',
  '00:25:B3': 'HP Inc.',
  '00:03:93': 'Apple, Inc.',
  '00:0D:93': 'Apple, Inc.',
  '00:10:FA': 'Apple, Inc.',
  '00:16:CB': 'Apple, Inc.',
  '00:17:F2': 'Apple, Inc.',
  '00:1C:B3': 'Apple, Inc.',
  '00:1D:4F': 'Apple, Inc.',
  '00:1E:52': 'Apple, Inc.',
  '00:1F:F3': 'Apple, Inc.',
  '00:23:12': 'Apple, Inc.',
  '00:23:32': 'Apple, Inc.',
  '00:25:00': 'Apple, Inc.',
  '00:25:4B': 'Apple, Inc.',
  '00:26:08': 'Apple, Inc.',
  '00:26:4A': 'Apple, Inc.',
  '00:26:BB': 'Apple, Inc.',
  '24:a0:74': 'Apple, Inc.',
  '2c:f0:ee': 'Apple, Inc.',
  '34:15:9e': 'Apple, Inc.',
  '38:ca:da': 'Apple, Inc.',
  '3c:15:c2': 'Apple, Inc.',
  
  // Network Brands
  '00:0F:66': 'Cisco-Linksys',
  '00:18:F8': 'Cisco-Linksys',
  '00:0F:B5': 'Netgear',
  '00:14:6C': 'Netgear',
  '00:1B:2F': 'Netgear',
  '00:22:3F': 'Netgear',
  '00:14:78': 'TP-Link Technologies Co., Ltd.',
  '00:1D:0F': 'TP-Link Technologies Co., Ltd.',
  '00:21:27': 'TP-Link Technologies Co., Ltd.',
  '00:27:19': 'TP-Link Technologies Co., Ltd.',
  '00:15:6D': 'Ubiquiti Networks, Inc.',
  '00:27:22': 'Ubiquiti Networks, Inc.',
  '24:A4:3C': 'Ubiquiti Networks, Inc.'
};

/**
 * Look up a MAC address's OUI prefix in the local vendor database.
 * Supports colon-separated, hyphen-separated, and dot-separated MAC forms.
 */
export function lookupVendor(mac: string | undefined): string {
  if (!mac) return 'Unknown Vendor';
  
  // Standardize the format to XX:XX:XX
  const cleanMac = mac.replace(/[^0-9a-fA-F]/g, '');
  if (cleanMac.length < 6) return 'Unknown Vendor';
  
  const prefixParts = [
    cleanMac.substring(0, 2),
    cleanMac.substring(2, 4),
    cleanMac.substring(4, 6)
  ];
  const formattedPrefix = prefixParts.join(':').toUpperCase();
  
  return OUI_DATABASE[formattedPrefix] || 'Unknown Vendor';
}

// Simple usage check endpoint - shared global state
let ipUsage = global.ipUsage || new Map();
global.ipUsage = ipUsage;

const MAX_USES_PER_IP = 2;
const RESET_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours

function getClientIP(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 
         req.headers['x-real-ip'] || 
         req.connection?.remoteAddress || 
         'unknown';
}

function checkIPLimit(ip) {
  const now = new Date();
  const usage = ipUsage.get(ip);
  
  if (!usage) {
    ipUsage.set(ip, { count: 0, lastReset: now });
    return { allowed: true, remaining: MAX_USES_PER_IP, used: 0 };
  }
  
  // Reset if 24 hours have passed
  if (now - usage.lastReset > RESET_INTERVAL) {
    usage.count = 0;
    usage.lastReset = now;
  }
  
  const remaining = MAX_USES_PER_IP - usage.count;
  const used = usage.count;
  return { allowed: remaining > 0, remaining, used };
}

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const clientIP = getClientIP(req);
  const { remaining, used } = checkIPLimit(clientIP);
  
  res.json({ remaining, used, maxUses: MAX_USES_PER_IP });
}
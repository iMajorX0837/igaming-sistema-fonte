const fs = require('fs');
const path = require('path');

const HOST_PROC = process.env.HOST_PROC || '/host/proc';
const HOST_ROOT = process.env.HOST_ROOT || '/host/rootfs';
const HOST_SYS = process.env.HOST_SYS || '/host/sys';

/** @type {{ idle: number; total: number } | null} */
let prevCpuSample = null;

function hostProcAvailable() {
  try {
    return fs.existsSync(path.join(HOST_PROC, 'meminfo'));
  } catch {
    return false;
  }
}

function readKb(key, raw) {
  const m = raw.match(new RegExp(`${key}:\\s+(\\d+)`, 'i'));
  return m ? Number(m[1]) : 0;
}

function readMemory() {
  const raw = fs.readFileSync(path.join(HOST_PROC, 'meminfo'), 'utf8');
  const totalKb = readKb('MemTotal', raw);
  const availableKb = readKb('MemAvailable', raw) || readKb('MemFree', raw);
  const usedKb = Math.max(totalKb - availableKb, 0);
  return {
    totalBytes: totalKb * 1024,
    usedBytes: usedKb * 1024,
    availableBytes: availableKb * 1024,
    percent: totalKb ? Math.round((usedKb / totalKb) * 100) : 0,
  };
}

function readLoadavg() {
  const parts = fs.readFileSync(path.join(HOST_PROC, 'loadavg'), 'utf8').trim().split(/\s+/);
  return {
    load1: Number.parseFloat(parts[0]) || 0,
    load5: Number.parseFloat(parts[1]) || 0,
    load15: Number.parseFloat(parts[2]) || 0,
  };
}

function readCpuCores() {
  const cpuinfo = fs.readFileSync(path.join(HOST_PROC, 'cpuinfo'), 'utf8');
  const cores = (cpuinfo.match(/^processor\s*:/gm) || []).length;
  return cores > 0 ? cores : 1;
}

function readCpuModel() {
  const cpuinfo = fs.readFileSync(path.join(HOST_PROC, 'cpuinfo'), 'utf8');
  const m = cpuinfo.match(/model name\s*:\s*(.+)/i);
  return m ? m[1].trim() : 'Processador';
}

function readCpuUsagePercent() {
  const firstLine = fs.readFileSync(path.join(HOST_PROC, 'stat'), 'utf8').split('\n')[0];
  const values = firstLine
    .trim()
    .split(/\s+/)
    .slice(1)
    .map((v) => Number.parseInt(v, 10) || 0);
  const idle = values[3] + (values[4] || 0);
  const total = values.reduce((sum, n) => sum + n, 0);

  if (!prevCpuSample) {
    prevCpuSample = { idle, total };
    return null;
  }

  const idleDelta = idle - prevCpuSample.idle;
  const totalDelta = total - prevCpuSample.total;
  prevCpuSample = { idle, total };

  if (totalDelta <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((1 - idleDelta / totalDelta) * 100)));
}

function readUptimeSeconds() {
  const sec = Number.parseFloat(fs.readFileSync(path.join(HOST_PROC, 'uptime'), 'utf8').split(/\s+/)[0]);
  return Number.isFinite(sec) ? sec : 0;
}

function readHostname() {
  const paths = [
    path.join(HOST_SYS, 'kernel/hostname'),
    path.join(HOST_ROOT, 'etc/hostname'),
  ];
  for (const p of paths) {
    try {
      if (fs.existsSync(p)) return fs.readFileSync(p, 'utf8').trim();
    } catch {
      /* try next */
    }
  }
  return 'vps';
}

function readDisk(runShell) {
  const target = fs.existsSync(HOST_ROOT) ? HOST_ROOT : '/';
  return runShell(`df -B1 ${target} 2>/dev/null | tail -1`, 10000)
    .then((line) => {
      const parts = line.trim().split(/\s+/);
      if (parts.length < 5) return null;
      return {
        totalBytes: Number(parts[1]),
        usedBytes: Number(parts[2]),
        availBytes: Number(parts[3]),
        percent: Number.parseInt(String(parts[4]).replace('%', ''), 10) || 0,
        mount: parts[5] || target,
      };
    })
    .catch(() => null);
}

function formatUptime(seconds) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

async function collectSystemStats(runShell) {
  if (!hostProcAvailable()) {
    return {
      available: false,
      message: 'Recrie o container ops com volumes /proc e / montados (git pull + docker compose up -d --build).',
    };
  }

  const memory = readMemory();
  const load = readLoadavg();
  const disk = await readDisk(runShell);

  return {
    available: true,
    hostname: readHostname(),
    cpu: {
      model: readCpuModel(),
      cores: readCpuCores(),
      usagePercent: readCpuUsagePercent(),
      load1: load.load1,
      load5: load.load5,
      load15: load.load15,
    },
    memory,
    disk,
    uptimeSeconds: readUptimeSeconds(),
    uptimeHuman: formatUptime(readUptimeSeconds()),
  };
}

module.exports = { collectSystemStats, hostProcAvailable };

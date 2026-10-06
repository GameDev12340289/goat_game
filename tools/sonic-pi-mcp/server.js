#!/usr/bin/env node
// Sonic Pi MCP server (zero dependencies).
// Lets Claude compose and play music in the locally running Sonic Pi 5 app by
// sending OSC /run-code messages straight to its spider server.
//
// Sonic Pi picks a fresh spider port + auth token on every launch; both appear
// on the spider-server.rb command line, so we rediscover them on each call.

const dgram = require('dgram');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const MUSIC_DIR = path.resolve(__dirname, '..', '..', 'music');
const LOG_FILE = path.join(process.env.USERPROFILE || process.env.HOME || '', '.sonic-pi', 'log', 'spider.log');

// ---------- Sonic Pi connection ----------

function discover() {
  const ps = "Get-CimInstance Win32_Process -Filter \"Name='ruby.exe'\" | " +
    "Where-Object { $_.CommandLine -like '*spider-server.rb*' } | " +
    "ForEach-Object { $_.CommandLine }";
  let out = '';
  try {
    out = execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', ps],
      { encoding: 'utf8', timeout: 15000 });
  } catch (e) { /* fall through */ }
  const m = out.match(/spider-server\.rb"?\s+(?:-\S+\s+)*(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(-?\d+)/);
  if (!m) throw new Error('Sonic Pi is not running (no spider-server.rb process found). Start the Sonic Pi app first.');
  return { port: +m[1], token: +m[6] };
}

const pad = (b) => Buffer.concat([b, Buffer.alloc((4 - (b.length % 4)) % 4)]);
const oscStr = (s) => pad(Buffer.concat([Buffer.from(s, 'utf8'), Buffer.from([0])]));
const oscInt = (n) => { const b = Buffer.alloc(4); b.writeInt32BE(n | 0); return b; };
const oscFloat = (n) => { const b = Buffer.alloc(4); b.writeFloatBE(n); return b; };

function send(addr, ...args) {
  const { port, token } = discover();
  const all = [token, ...args];
  const tags = ',' + all.map((a) => (typeof a === 'string' ? 's' : Number.isInteger(a) ? 'i' : 'f')).join('');
  const body = all.map((a) => (typeof a === 'string' ? oscStr(a) : Number.isInteger(a) ? oscInt(a) : oscFloat(a)));
  const pkt = Buffer.concat([oscStr(addr), oscStr(tags), ...body]);
  return new Promise((resolve, reject) => {
    const sock = dgram.createSocket('udp4');
    sock.send(pkt, port, '127.0.0.1', (err) => { sock.close(); err ? reject(err) : resolve(); });
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function logSize() { try { return fs.statSync(LOG_FILE).size; } catch { return 0; } }
function logSince(pos) {
  try {
    const fd = fs.openSync(LOG_FILE, 'r');
    const size = fs.fstatSync(fd).size;
    const buf = Buffer.alloc(Math.max(0, size - pos));
    fs.readSync(fd, buf, 0, buf.length, pos);
    fs.closeSync(fd);
    return buf.toString('utf8').split(/\r?\n/).filter((l) => /error|Error|Invalid token/.test(l)).join('\n');
  } catch { return ''; }
}

async function runCode(code) {
  const pos = logSize();
  await send('/run-code', code);
  await sleep(700);
  const errs = logSince(pos);
  return errs ? `Sent, but Sonic Pi reported errors:\n${errs}` : 'Sent to Sonic Pi (no errors reported).';
}

// ---------- tracks (saved .rb files in <project>/music) ----------

const safeName = (n) => String(n).replace(/[^a-zA-Z0-9_-]/g, '_');
const trackPath = (n) => path.join(MUSIC_DIR, safeName(n) + '.rb');

// ---------- tools ----------

const tools = [
  {
    name: 'sonic_pi_play',
    description: 'Run Sonic Pi (Ruby) code in the running Sonic Pi app, so it plays through the speakers. Use live_loop for continuing music. Returns any error from Sonic Pi.',
    inputSchema: { type: 'object', properties: { code: { type: 'string', description: 'Sonic Pi code' } }, required: ['code'] },
    run: async ({ code }) => runCode(code),
  },
  {
    name: 'sonic_pi_stop',
    description: 'Stop all running Sonic Pi music/jobs.',
    inputSchema: { type: 'object', properties: {} },
    run: async () => { await send('/stop-all-jobs'); return 'Stopped all jobs.'; },
  },
  {
    name: 'sonic_pi_volume',
    description: 'Set master output volume (0.0 silent .. 1.0 normal, up to 5).',
    inputSchema: { type: 'object', properties: { level: { type: 'number' } }, required: ['level'] },
    run: async ({ level }) => { await send('/mixer-output-volume', Math.max(0, Math.min(5, level)), 1); return `Volume set to ${level}.`; },
  },
  {
    name: 'sonic_pi_status',
    description: 'Check whether Sonic Pi is running and reachable; shows the discovered port.',
    inputSchema: { type: 'object', properties: {} },
    run: async () => { const { port } = discover(); return `Sonic Pi is running; spider OSC port ${port}.`; },
  },
  {
    name: 'sonic_pi_save_track',
    description: 'Save Sonic Pi code as a named track in the game\'s music/ folder (e.g. "mountain-theme"). Overwrites an existing track of the same name.',
    inputSchema: { type: 'object', properties: { name: { type: 'string' }, code: { type: 'string' } }, required: ['name', 'code'] },
    run: async ({ name, code }) => {
      fs.mkdirSync(MUSIC_DIR, { recursive: true });
      fs.writeFileSync(trackPath(name), code, 'utf8');
      return `Saved ${trackPath(name)}`;
    },
  },
  {
    name: 'sonic_pi_list_tracks',
    description: 'List saved tracks in the game\'s music/ folder.',
    inputSchema: { type: 'object', properties: {} },
    run: async () => {
      if (!fs.existsSync(MUSIC_DIR)) return 'No tracks yet.';
      const f = fs.readdirSync(MUSIC_DIR).filter((x) => x.endsWith('.rb')).map((x) => x.slice(0, -3));
      return f.length ? f.join('\n') : 'No tracks yet.';
    },
  },
  {
    name: 'sonic_pi_play_track',
    description: 'Stop current music and play a saved track by name. Set stop_first=false to layer it.',
    inputSchema: { type: 'object', properties: { name: { type: 'string' }, stop_first: { type: 'boolean' } }, required: ['name'] },
    run: async ({ name, stop_first = true }) => {
      const p = trackPath(name);
      if (!fs.existsSync(p)) throw new Error(`No track named "${name}".`);
      if (stop_first) { await send('/stop-all-jobs'); await sleep(150); }
      return runCode(fs.readFileSync(p, 'utf8'));
    },
  },
  {
    name: 'sonic_pi_read_track',
    description: 'Return the source code of a saved track, to edit or build on it.',
    inputSchema: { type: 'object', properties: { name: { type: 'string' } }, required: ['name'] },
    run: async ({ name }) => {
      const p = trackPath(name);
      if (!fs.existsSync(p)) throw new Error(`No track named "${name}".`);
      return fs.readFileSync(p, 'utf8');
    },
  },
];

// ---------- MCP over stdio (newline-delimited JSON-RPC) ----------

const reply = (id, result) => process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id, result }) + '\n');
const fail = (id, code, message) => process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id, error: { code, message } }) + '\n');

let queue = Promise.resolve();

async function handle(msg) {
  const { id, method, params } = msg;
  if (id === undefined) return; // notification
  try {
    if (method === 'initialize') {
      return reply(id, {
        protocolVersion: (params && params.protocolVersion) || '2025-03-26',
        capabilities: { tools: {} },
        serverInfo: { name: 'sonic-pi', version: '1.0.0' },
      });
    }
    if (method === 'ping') return reply(id, {});
    if (method === 'tools/list') {
      return reply(id, { tools: tools.map(({ name, description, inputSchema }) => ({ name, description, inputSchema })) });
    }
    if (method === 'tools/call') {
      const tool = tools.find((t) => t.name === params.name);
      if (!tool) return fail(id, -32602, `Unknown tool ${params.name}`);
      try {
        // serialize calls so log errors are attributed to the right request
        const run = queue.then(() => tool.run(params.arguments || {}));
        queue = run.catch(() => {});
        const text = await run;
        return reply(id, { content: [{ type: 'text', text }] });
      } catch (e) {
        return reply(id, { isError: true, content: [{ type: 'text', text: String(e.message || e) }] });
      }
    }
    return fail(id, -32601, `Method not found: ${method}`);
  } catch (e) {
    return fail(id, -32603, String(e.message || e));
  }
}

let buf = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => {
  buf += chunk;
  let i;
  while ((i = buf.indexOf('\n')) >= 0) {
    const line = buf.slice(0, i).trim();
    buf = buf.slice(i + 1);
    if (line) { try { handle(JSON.parse(line)); } catch { /* ignore malformed */ } }
  }
});

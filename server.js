const http = require('http');
const fs = require('fs');
const path = require('path');
const { Server } = require('socket.io');

const PORT = process.env.PORT || 3000;

const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.js': 'text/javascript; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg'
};

const server = http.createServer((req, res) => {
  // Enable full CORS for cross-origin hosting (e.g. GitHub Pages -> Render)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  let reqPath = req.url.split('?')[0];
  if (reqPath === '/' || reqPath === '') {
    reqPath = '/index.html';
  }

  // Health ping endpoint for hosting services (Render, Railway, Fly)
  if (reqPath === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', players: players.size, uptime: process.uptime() }));
    return;
  }

  const filePath = path.join(__dirname, reqPath);
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=UTF-8' });
        res.end('404 Not Found');
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=UTF-8' });
        res.end('500 Server Error: ' + err.code);
      }
    } else {
      res.writeHead(200, { 
        'Content-Type': contentType,
        'Cache-Control': 'no-cache'
      });
      res.end(content);
    }
  });
});

// Attach Socket.IO
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  },
  pingInterval: 10000,
  pingTimeout: 5000
});

// ==========================================
// PERSISTENT GALAXY WORLD STATE
// ==========================================
const WORLD_SIZE = 10000;

const BASE_LOCATIONS = {
  blue: { x: 0, y: -3800 },
  red:  { x: -3300, y: 2200 },
  gold: { x: 3300, y: 2200 }
};

const stations = {
  blue: { nation: 'blue', x: BASE_LOCATIONS.blue.x, y: BASE_LOCATIONS.blue.y, hp: 25000, maxHp: 25000, level: 1, crystalsDonated: 0, crystalsRequired: 100, isDead: false },
  red:  { nation: 'red',  x: BASE_LOCATIONS.red.x,  y: BASE_LOCATIONS.red.y,  hp: 25000, maxHp: 25000, level: 1, crystalsDonated: 0, crystalsRequired: 100, isDead: false },
  gold: { nation: 'gold', x: BASE_LOCATIONS.gold.x, y: BASE_LOCATIONS.gold.y, hp: 25000, maxHp: 25000, level: 1, crystalsDonated: 0, crystalsRequired: 100, isDead: false }
};

// Asteroid Yields Configuration
const ASTEROID_HEALTHS = [0, 16, 42, 105, 230, 460, 920, 1650];
const TIER_YIELDS = [
  null,
  { min: 1, max: 3, valMult: 1.0 },
  { min: 3, max: 6, valMult: 1.4 },
  { min: 6, max: 11, valMult: 1.8 },
  { min: 11, max: 18, valMult: 2.2 },
  { min: 18, max: 28, valMult: 2.5 },
  { min: 28, max: 42, valMult: 2.8 },
  { min: 42, max: 60, valMult: 3.2 }
];

const asteroids = new Map();
let nextAsteroidId = 1;

function generateAsteroid(tier = null, nearBase = null) {
  const sizeTier = tier || Math.floor(Math.random() * 7) + 1;
  const radius = 13 + (sizeTier - 1) * 8.5;
  const maxHealth = ASTEROID_HEALTHS[sizeTier] || (sizeTier * 220);
  const yCfg = TIER_YIELDS[sizeTier] || TIER_YIELDS[1];
  const crystalCount = Math.floor(Math.random() * (yCfg.max - yCfg.min + 1)) + yCfg.min;
  const crystalTotalValue = Math.round(crystalCount * yCfg.valMult);

  let x, y;
  if (nearBase) {
    const angle = Math.random() * Math.PI * 2;
    const r = 320 + Math.random() * 550;
    x = nearBase.x + Math.cos(angle) * r;
    y = nearBase.y + Math.sin(angle) * r;
  } else {
    const dist = 350 + Math.random() * (WORLD_SIZE / 2 - 500);
    const angle = Math.random() * Math.PI * 2;
    x = Math.cos(angle) * dist;
    y = Math.sin(angle) * dist;
  }

  const id = `ast-${nextAsteroidId++}`;
  const ast = {
    id,
    x: Math.round(x),
    y: Math.round(y),
    tier: sizeTier,
    radius,
    health: maxHealth,
    maxHealth,
    crystalCount,
    crystalTotalValue,
    isDead: false
  };
  asteroids.set(id, ast);
  return ast;
}

// Populate initial galaxy with 130 persistent asteroids + base surroundings
for (let i = 0; i < 130; i++) {
  generateAsteroid((i % 7) + 1);
}
for (const n of ['blue', 'red', 'gold']) {
  const b = BASE_LOCATIONS[n];
  for (let i = 0; i < 6; i++) {
    generateAsteroid((i % 5) + 1, b);
  }
}

// Active players and crystals
const players = new Map();
const activeCrystals = new Map();
let nextCrystalId = 1;

// ==========================================
// DYNAMIC NATION TEAM BALANCING
// ==========================================
// User Requirement: "ben kırmızı ulusta isem oyuna dahil olan oyuncu diğer takımda boşluk varsa
// onları seçebilmeli diğer dolu takım kapatılmalı. o dengeyi korumalıyız"
function getTeamDistribution() {
  const counts = { red: 0, blue: 0, gold: 0 };
  for (const [id, p] of players) {
    if (p.nation && counts[p.nation] !== undefined) {
      counts[p.nation]++;
    }
  }

  const total = counts.red + counts.blue + counts.gold;
  const minCount = Math.min(counts.red, counts.blue, counts.gold);

  // A team is locked if:
  // 1. Total players > 0
  // 2. Its count is strictly greater than the minimum count of any other team
  const status = {
    red:  { count: counts.red,  locked: total > 0 && counts.red > minCount },
    blue: { count: counts.blue, locked: total > 0 && counts.blue > minCount },
    gold: { count: counts.gold, locked: total > 0 && counts.gold > minCount }
  };

  return { counts, status, total };
}

function broadcastTeamStatus() {
  const dist = getTeamDistribution();
  io.emit('team_status', dist);
}

function getNationSpawn(nation) {
  const baseLoc = BASE_LOCATIONS[nation] || BASE_LOCATIONS['blue'];
  const offsetAngle = Math.random() * Math.PI * 2;
  const offsetDist = 200 + Math.random() * 80;
  return {
    x: Math.round(baseLoc.x + Math.cos(offsetAngle) * offsetDist),
    y: Math.round(baseLoc.y + Math.sin(offsetAngle) * offsetDist)
  };
}

// ==========================================
// WEBSOCKET EVENTS & REAL-TIME MULTIPLAYER
// ==========================================
io.on('connection', (socket) => {
  console.log(`[+] Yeni Pilot Bağlandı: ${socket.id}`);

  // Send initial galaxy data & current team distribution
  const teamDist = getTeamDistribution();
  socket.emit('init_data', {
    yourId: socket.id,
    teamStatus: teamDist,
    stations,
    asteroids: Array.from(asteroids.values()),
    players: Array.from(players.values()),
    crystals: Array.from(activeCrystals.values())
  });

  // Client requests team status
  socket.on('get_team_status', () => {
    socket.emit('team_status', getTeamDistribution());
  });

  // Player joins the battle
  socket.on('join_game', (data) => {
    const rawName = (data && data.name) ? String(data.name).trim().slice(0, 15) : 'KOMUTAN';
    const name = rawName || 'KOMUTAN';
    let chosenNation = (data && data.nation) ? data.nation : 'blue';
    if (!['red', 'blue', 'gold'].includes(chosenNation)) chosenNation = 'blue';

    // Enforce team balance: if requested team is locked, switch to the team with lowest count
    const dist = getTeamDistribution();
    if (dist.status[chosenNation] && dist.status[chosenNation].locked) {
      const openNations = ['red', 'blue', 'gold'].filter(n => !dist.status[n].locked);
      if (openNations.length > 0) {
        chosenNation = openNations[Math.floor(Math.random() * openNations.length)];
      }
    }

    const spawn = getNationSpawn(chosenNation);
    const newPlayer = {
      id: socket.id,
      name,
      nation: chosenNation,
      shipKey: 'fly',
      x: spawn.x,
      y: spawn.y,
      vx: 0,
      vy: 0,
      rotation: 0,
      isThrusting: false,
      shield: 170,
      energy: 100,
      crystals: 0,
      score: 0,
      upgrades: {
        shieldCap: 0, shieldRegen: 0, energyCap: 0, energyRegen: 0,
        fireDamage: 0, fireSpeed: 0, shipSpeed: 0, shipAgility: 0
      },
      isDead: false,
      spawnShieldTimer: 4.0,
      lastUpdate: Date.now()
    };

    players.set(socket.id, newPlayer);

    // Confirm join to client
    socket.emit('join_success', {
      player: newPlayer,
      spawn
    });

    // Notify all other clients of the new player
    socket.broadcast.emit('player_joined', newPlayer);

    // Broadcast updated team balance status to all clients
    broadcastTeamStatus();

    // Broadcast system message in tactical chat
    io.emit('chat_message', {
      id: `sys-${Date.now()}`,
      senderName: 'KOMUTA MERKEZİ',
      nation: chosenNation,
      text: `${newPlayer.name}, ${chosenNation.toUpperCase()} filosuna katıldı!`,
      isSystem: true,
      timestamp: Date.now()
    });

    console.log(`[BATTLE] ${newPlayer.name} (${chosenNation}) oyuna katıldı. Toplam Pilot: ${players.size}`);
  });

  // Real-time state update from player (pos, vel, rot, thrust, vitals)
  socket.on('player_state', (state) => {
    const p = players.get(socket.id);
    if (!p || p.isDead) return;

    p.x = state.x;
    p.y = state.y;
    p.vx = state.vx || 0;
    p.vy = state.vy || 0;
    p.rotation = state.rotation || 0;
    p.isThrusting = !!state.isThrusting;
    if (typeof state.shield === 'number') p.shield = state.shield;
    if (typeof state.energy === 'number') p.energy = state.energy;
    if (typeof state.crystals === 'number') p.crystals = state.crystals;
    if (typeof state.score === 'number') p.score = state.score;
    if (state.shipKey) p.shipKey = state.shipKey;
    if (state.upgrades) p.upgrades = state.upgrades;
    p.lastUpdate = Date.now();
  });

  // Lasers fired by player
  socket.on('fire_lasers', (data) => {
    const p = players.get(socket.id);
    if (!p || p.isDead) return;

    if (Array.isArray(data.lasers)) {
      socket.broadcast.emit('remote_fire', {
        playerId: socket.id,
        nation: p.nation,
        lasers: data.lasers
      });
    }
  });

  // Hit Asteroid
  socket.on('hit_asteroid', (data) => {
    const p = players.get(socket.id);
    if (!p) return;

    const ast = asteroids.get(data.asteroidId);
    if (!ast || ast.isDead) return;

    const dmg = Number(data.damage) || 10;
    ast.health -= dmg;

    if (ast.health <= 0) {
      ast.isDead = true;
      ast.health = 0;

      // Spawn crystal drops
      const droppedGems = [];
      const valEach = Math.max(1, Math.round(ast.crystalTotalValue / ast.crystalCount));
      for (let i = 0; i < ast.crystalCount; i++) {
        const gemId = `gem-${nextCrystalId++}`;
        const gem = {
          id: gemId,
          x: ast.x + (Math.random() - 0.5) * 35,
          y: ast.y + (Math.random() - 0.5) * 35,
          value: valEach,
          targetId: socket.id
        };
        activeCrystals.set(gemId, gem);
        droppedGems.push(gem);
      }

      p.score += Math.round(ast.maxHealth * 0.8);

      io.emit('asteroid_destroyed', {
        asteroidId: ast.id,
        x: ast.x,
        y: ast.y,
        crystals: droppedGems,
        killerId: socket.id
      });

      // Schedule asteroid respawn in 14s
      setTimeout(() => {
        const newAst = generateAsteroid(ast.tier);
        io.emit('asteroid_spawned', newAst);
      }, 14000);

    } else {
      io.emit('asteroid_damaged', {
        asteroidId: ast.id,
        health: ast.health,
        maxHealth: ast.maxHealth,
        damage: dmg,
        attackerId: socket.id
      });
    }
  });

  // Hit Enemy Player
  socket.on('hit_player', (data) => {
    const attacker = players.get(socket.id);
    const victim = players.get(data.targetId);
    if (!attacker || !victim || victim.isDead) return;

    // Friendly fire check (unless heal beam)
    if (attacker.nation === victim.nation && !data.isHeal) return;

    if (data.isHeal && attacker.nation === victim.nation) {
      // Healer friendly beam
      const healAmt = (Number(data.damage) || 15) * 1.5;
      victim.shield = Math.min(1120, victim.shield + healAmt);
      attacker.score += Math.round(healAmt * 2);

      io.emit('player_healed', {
        targetId: victim.id,
        healerId: attacker.id,
        amount: healAmt,
        currentShield: victim.shield
      });
      return;
    }

    // Damage enemy
    const dmg = Number(data.damage) || 20;
    victim.shield -= dmg;

    if (victim.shield <= 0) {
      victim.isDead = true;
      victim.shield = 0;

      // Scatter carried crystals
      const carried = victim.crystals || 0;
      const count = Math.min(50, Math.max(carried > 0 ? 5 : 0, Math.floor(carried / 2)));
      const droppedGems = [];
      if (count > 0) {
        const valEach = Math.max(1, Math.round(carried / count));
        for (let i = 0; i < count; i++) {
          const gemId = `gem-${nextCrystalId++}`;
          const gem = {
            id: gemId,
            x: victim.x + (Math.random() - 0.5) * 45,
            y: victim.y + (Math.random() - 0.5) * 45,
            value: valEach,
            targetId: attacker.id
          };
          activeCrystals.set(gemId, gem);
          droppedGems.push(gem);
        }
      }
      victim.crystals = 0;

      attacker.score += 500 + carried * 10;

      io.emit('player_killed', {
        victimId: victim.id,
        victimName: victim.name,
        victimNation: victim.nation,
        killerId: attacker.id,
        killerName: attacker.name,
        killerNation: attacker.nation,
        x: victim.x,
        y: victim.y,
        crystals: droppedGems
      });

      io.emit('chat_message', {
        id: `kill-${Date.now()}`,
        senderName: 'SAVAŞ BİLGİSİ',
        nation: attacker.nation,
        text: `💥 [${attacker.name}] düşman pilotu [${victim.name}] imha etti!`,
        isSystem: true,
        timestamp: Date.now()
      });

    } else {
      io.emit('player_damaged', {
        targetId: victim.id,
        attackerId: attacker.id,
        damage: dmg,
        currentShield: victim.shield
      });
    }
  });

  // Hit Home Base
  socket.on('hit_base', (data) => {
    const attacker = players.get(socket.id);
    if (!attacker) return;
    const base = stations[data.nation];
    if (!base || base.isDead) return;

    if (data.isHeal && attacker.nation === base.nation) {
      base.hp = Math.min(base.maxHp, base.hp + (Number(data.damage) || 15) * 2.0);
      io.emit('base_updated', base);
      return;
    }

    if (attacker.nation === base.nation) return; // No friendly fire

    const dmg = Number(data.damage) || 25;
    base.hp -= dmg;
    if (base.hp <= 0) {
      base.hp = 0;
      base.isDead = true;

      io.emit('base_destroyed', {
        nation: base.nation,
        killerName: attacker.name,
        killerNation: attacker.nation
      });

      io.emit('chat_message', {
        id: `base-dest-${Date.now()}`,
        senderName: 'ALARM',
        nation: attacker.nation,
        text: `🚨 ${base.nation.toUpperCase()} ANA ÜSSÜ İMHA EDİLDİ!`,
        isSystem: true,
        timestamp: Date.now()
      });
    } else {
      io.emit('base_damaged', {
        nation: base.nation,
        hp: base.hp,
        maxHp: base.maxHp,
        damage: dmg
      });
    }
  });

  // Collect Crystal
  socket.on('collect_crystal', (data) => {
    const p = players.get(socket.id);
    if (!p || p.isDead) return;

    const gem = activeCrystals.get(data.crystalId);
    if (!gem) return;

    activeCrystals.delete(data.crystalId);
    p.crystals = (p.crystals || 0) + gem.value;
    p.score = (p.score || 0) + gem.value * 15;

    io.emit('crystal_collected', {
      crystalId: data.crystalId,
      collectorId: socket.id,
      playerCrystals: p.crystals,
      playerScore: p.score
    });
  });

  // Evolve Ship Tier
  socket.on('evolve_ship', (data) => {
    const p = players.get(socket.id);
    if (!p || p.isDead) return;

    p.shipKey = data.shipKey;
    p.crystals = 0; // reset cargo on evolve
    p.shield = 500;

    socket.broadcast.emit('player_evolved', {
      playerId: socket.id,
      shipKey: data.shipKey
    });
  });

  // Base Donation
  socket.on('donate_base', (data) => {
    const p = players.get(socket.id);
    if (!p || p.isDead) return;

    const base = stations[p.nation];
    if (!base || base.isDead) return;

    const amt = Math.min(p.crystals || 0, Number(data.amount) || 0);
    if (amt <= 0) return;

    p.crystals -= amt;
    p.score += amt * 25;
    base.crystalsDonated += amt;
    base.hp = Math.min(base.maxHp, base.hp + amt * 30);

    let leveledUp = false;
    if (base.crystalsDonated >= base.crystalsRequired && base.level < 5) {
      base.level++;
      base.maxHp += 15000;
      base.hp = base.maxHp;
      base.crystalsDonated = 0;
      base.crystalsRequired = Math.round(base.crystalsRequired * 2.2);
      leveledUp = true;

      io.emit('chat_message', {
        id: `base-lvl-${Date.now()}`,
        senderName: 'MERKEZ ÜS',
        nation: p.nation,
        text: `🌟 ${p.nation.toUpperCase()} Ana Üssü Seviye ${base.level}'e Yükseltildi!`,
        isSystem: true,
        timestamp: Date.now()
      });
    }

    io.emit('base_updated', {
      ...base,
      leveledUp
    });
  });

  // Respawn Player
  socket.on('respawn_player', () => {
    const p = players.get(socket.id);
    if (!p) return;

    const spawn = getNationSpawn(p.nation);
    p.x = spawn.x;
    p.y = spawn.y;
    p.vx = 0;
    p.vy = 0;
    p.isDead = false;
    p.shield = 350;
    p.crystals = 0;
    p.spawnShieldTimer = 4.0;

    io.emit('player_respawned', {
      playerId: socket.id,
      x: spawn.x,
      y: spawn.y,
      nation: p.nation
    });
  });

  // Tactical Chat Message
  socket.on('send_chat', (data) => {
    const p = players.get(socket.id);
    if (!p) return;

    const text = String(data.text || '').trim().slice(0, 70);
    if (!text) return;

    const msg = {
      id: `chat-${Date.now()}-${Math.random()}`,
      senderName: p.name,
      nation: p.nation,
      text,
      timestamp: Date.now()
    };

    io.emit('chat_message', msg);
  });

  // Disconnect
  socket.on('disconnect', () => {
    const p = players.get(socket.id);
    if (p) {
      console.log(`[-] Pilot Ayrıldı: ${p.name} (${p.nation})`);

      // Scatter carried crystals if was alive
      if (!p.isDead && p.crystals > 0) {
        const count = Math.min(30, Math.ceil(p.crystals / 3));
        const valEach = Math.max(1, Math.round(p.crystals / count));
        const drops = [];
        for (let i = 0; i < count; i++) {
          const gemId = `gem-${nextCrystalId++}`;
          const gem = {
            id: gemId,
            x: p.x + (Math.random() - 0.5) * 40,
            y: p.y + (Math.random() - 0.5) * 40,
            value: valEach,
            targetId: null
          };
          activeCrystals.set(gemId, gem);
          drops.push(gem);
        }
        io.emit('crystals_spawned', { crystals: drops });
      }

      players.delete(socket.id);
      io.emit('player_left', { playerId: socket.id });

      // Update team balance on all clients immediately
      broadcastTeamStatus();
    }
  });
});

// ==========================================
// 25Hz TICK BROADCAST FOR ALL PLAYERS
// ==========================================
setInterval(() => {
  if (players.size === 0) return;

  const states = [];
  for (const [id, p] of players) {
    states.push({
      id: p.id,
      name: p.name,
      nation: p.nation,
      shipKey: p.shipKey,
      x: p.x,
      y: p.y,
      vx: p.vx,
      vy: p.vy,
      rotation: p.rotation,
      isThrusting: p.isThrusting,
      shield: p.shield,
      energy: p.energy,
      crystals: p.crystals,
      score: p.score,
      isDead: p.isDead,
      spawnShieldTimer: p.spawnShieldTimer
    });
  }

  io.emit('players_tick', { players: states });
}, 40); // 25 times per second

// Start HTTP & WebSocket Server
server.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🚀 Space Vanguard Multiplayer Server running on port ${PORT}`);
  console.log(`🔗 Local Web URL: http://localhost:${PORT}`);
  console.log(`📡 WebSocket Engine: Socket.IO Ready`);
  console.log(`⚖️ Dynamic Team Balancing: ACTIVATED`);
  console.log(`🤖 Bot Simulation: REMOVED (Human Players Only)`);
  console.log(`====================================================`);
});

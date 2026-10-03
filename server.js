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
  '.mp3': 'audio/mpeg',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf'
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
const WORLD_SIZE = 16500;

const BASE_LOCATIONS = {
  blue: { x: 0, y: -6300 },
  red:  { x: -5500, y: 3650 },
  gold: { x: 5500, y: 3650 }
};

const stations = {
  blue: { nation: 'blue', x: BASE_LOCATIONS.blue.x, y: BASE_LOCATIONS.blue.y, hp: 25000, maxHp: 25000, level: 1, crystalsDonated: 0, crystalsRequired: 100, isDead: false },
  red:  { nation: 'red',  x: BASE_LOCATIONS.red.x,  y: BASE_LOCATIONS.red.y,  hp: 25000, maxHp: 25000, level: 1, crystalsDonated: 0, crystalsRequired: 100, isDead: false },
  gold: { nation: 'gold', x: BASE_LOCATIONS.gold.x, y: BASE_LOCATIONS.gold.y, hp: 25000, maxHp: 25000, level: 1, crystalsDonated: 0, crystalsRequired: 100, isDead: false }
};

// Asteroid Yields Configuration (Max 1-4 Pieces per user request)
const ASTEROID_HEALTHS = [0, 16, 42, 105, 230, 460, 920, 1650];
const TIER_YIELDS = [
  null,
  { min: 1, max: 2, totalPoints: 2 },
  { min: 1, max: 3, totalPoints: 6 },
  { min: 2, max: 3, totalPoints: 15 },
  { min: 2, max: 4, totalPoints: 32 },
  { min: 2, max: 4, totalPoints: 60 },
  { min: 2, max: 4, totalPoints: 105 },
  { min: 1, max: 4, totalPoints: 180, allowSingleMega: true }
];

const asteroids = new Map();
let nextAsteroidId = 1;

function generateAsteroid(tier = null, nearBase = null, nearNation = null) {
  const sizeTier = tier || Math.floor(Math.random() * 7) + 1;
  const radius = 13 + (sizeTier - 1) * 8.5;
  const maxHealth = ASTEROID_HEALTHS[sizeTier] || (sizeTier * 220);
  const yCfg = TIER_YIELDS[sizeTier] || TIER_YIELDS[1];

  // User request: "en fazla 1-4 arası dağılma olsun ve parçalar en büyük asteroitten büyük bir tek parça çıkabilir şeklinde"
  let crystalCount = Math.floor(Math.random() * (yCfg.max - yCfg.min + 1)) + yCfg.min;
  if (sizeTier === 7 && Math.random() < 0.45) {
    crystalCount = 1; // Devasa asteroidden tek büyük zengin parça
  }
  crystalCount = Math.max(1, Math.min(4, crystalCount));

  let x, y;
  if (nearBase) {
    const angle = Math.random() * Math.PI * 2;
    const r = 700 + Math.random() * 950;
    x = nearBase.x + Math.cos(angle) * r;
    y = nearBase.y + Math.sin(angle) * r;
  } else {
    const dist = 350 + Math.random() * (WORLD_SIZE / 2 - 500);
    const angle = Math.random() * Math.PI * 2;
    x = Math.cos(angle) * dist;
    y = Math.sin(angle) * dist;
  }

  let element = 'ice';
  const distFromCenter = Math.hypot(x, y);

  if (nearNation === 'blue') {
    element = Math.random() < 0.82 ? 'ice' : 'fire';
  } else if (nearNation === 'red') {
    element = Math.random() < 0.82 ? 'fire' : 'ice';
  } else if (nearNation === 'gold') {
    element = Math.random() < 0.50 ? 'ice' : 'fire';
  } else {
    // Deep Space / Galactic Core (Expanded core threshold for 16500 map)
    if (distFromCenter < 4800) {
      // Core Anomaly: Rich Dark Matter Basin (65% Dark, 20% Fire, 15% Ice)
      const roll = Math.random();
      element = roll < 0.65 ? 'dark' : (roll < 0.85 ? 'fire' : 'ice');
    } else {
      const roll = Math.random();
      element = roll < 0.45 ? 'ice' : (roll < 0.85 ? 'fire' : 'dark');
    }
  }

  // Balanced crystal yield: reduced multiplier so leveling requires active asteroid mining
  const crystalTotalValue = yCfg.totalPoints;

  const id = `ast-${nextAsteroidId++}`;
  const ast = {
    id,
    x: Math.round(x),
    y: Math.round(y),
    tier: sizeTier,
    radius,
    element,
    health: maxHealth,
    maxHealth,
    crystalCount,
    crystalTotalValue,
    nearNation: nearNation || null,
    isDead: false
  };
  asteroids.set(id, ast);
  return ast;
}

// Populate galaxy: 580 persistent deep-space asteroids (scaled 1.5x) + 36 beginner asteroids per home base
for (let i = 0; i < 580; i++) {
  generateAsteroid((i % 7) + 1);
}
// Each base gets 36 beginner asteroids
const baseTiers = [1, 1, 1, 1, 2, 2, 1, 1, 2, 1, 2, 2, 3, 1, 2, 1, 2, 3, 1, 1, 2, 2, 1, 2, 3, 1, 2, 3, 1, 1, 2, 2, 3, 1, 2, 2];
for (const n of ['blue', 'red', 'gold']) {
  const b = BASE_LOCATIONS[n];
  for (const tier of baseTiers) {
    generateAsteroid(tier, b, n);
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
  const livingCounts = [];
  for (const n of ['red', 'blue', 'gold']) {
    if (!stations[n].isDead) livingCounts.push(counts[n]);
  }
  const minLivingCount = livingCounts.length > 0 ? Math.min(...livingCounts) : 0;

  // A team is locked if:
  // 1. Station is destroyed (isDead: true)
  // 2. OR Total players > 0 AND Its count is strictly greater than the minimum count of any other non-destroyed team
  const status = {
    red:  { count: counts.red,  locked: stations.red.isDead  || (total > 0 && counts.red > minLivingCount),  destroyed: stations.red.isDead },
    blue: { count: counts.blue, locked: stations.blue.isDead || (total > 0 && counts.blue > minLivingCount), destroyed: stations.blue.isDead },
    gold: { count: counts.gold, locked: stations.gold.isDead || (total > 0 && counts.gold > minLivingCount), destroyed: stations.gold.isDead }
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
  const offsetDist = 480 + Math.random() * 90;
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

  // If no players are online, clean up all residual crystals so new pilots enter a clean galaxy
  if (players.size === 0) {
    activeCrystals.clear();
  }

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
    const rawName = (data && data.name) ? String(data.name).trim().slice(0, 15) : 'VANGUARD-1';
    let name = rawName || 'VANGUARD-1';

    // Enforce unique pilot name: if name already exists in active game, append/increment number
    const activeNames = new Set(Array.from(players.values()).map(p => p.name.toUpperCase()));
    let baseName = name;
    let num = 1;
    const match = name.match(/^(.*?)[-_](\d+)$/);
    if (match) {
      baseName = match[1];
      num = parseInt(match[2], 10);
    }
    while (activeNames.has(name.toUpperCase())) {
      num++;
      name = `${baseName}-${num}`;
    }

    let chosenNation = (data && data.nation) ? data.nation : 'blue';
    if (!['red', 'blue', 'gold'].includes(chosenNation)) chosenNation = 'blue';

    // Enforce dead station restriction and team balance
    const dist = getTeamDistribution();
    if (stations[chosenNation] && stations[chosenNation].isDead) {
      const openNations = ['red', 'blue', 'gold'].filter(n => !stations[n].isDead && !dist.status[n].locked);
      if (openNations.length > 0) {
        chosenNation = openNations[Math.floor(Math.random() * openNations.length)];
      } else {
        const anyLiving = ['red', 'blue', 'gold'].filter(n => !stations[n].isDead);
        if (anyLiving.length > 0) {
          chosenNation = anyLiving[0];
        } else {
          socket.emit('game_over', { reason: 'Tüm uzay üsleri imha edildi!' });
          return;
        }
      }
    } else if (dist.status[chosenNation] && dist.status[chosenNation].locked) {
      const openNations = ['red', 'blue', 'gold'].filter(n => !stations[n].isDead && !dist.status[n].locked);
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
      kills: 0,
      mined: 0,
      donations: 0,
      upgrades: {
        shieldCap: 0, shieldRegen: 0, energyCap: 0, energyRegen: 0,
        fireDamage: 0, fireSpeed: 0, shipSpeed: 0, shipAgility: 0
      },
      isDead: false,
      spawnShieldTimer: 4.0,
      lastUpdate: Date.now()
    };

    // If this is the only player joining an empty galaxy, ensure all old floating crystals are cleared
    if (players.size === 0) {
      activeCrystals.clear();
    }

    players.set(socket.id, newPlayer);

    // Confirm join to client with complete active galaxy state
    socket.emit('join_success', {
      player: newPlayer,
      spawn,
      asteroids: Array.from(asteroids.values()).filter(a => !a.isDead),
      stations,
      crystals: Array.from(activeCrystals.values()),
      players: Array.from(players.values()).filter(p => !p.isDead && p.id !== socket.id)
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

    let ast = (data && data.asteroidId) ? asteroids.get(data.asteroidId) : null;

    // Proximity fallback if asteroidId wasn't found (prevents dropped hits from race conditions or local IDs)
    if (!ast && data) {
      const hitX = (data.x !== undefined) ? Number(data.x) : p.x;
      const hitY = (data.y !== undefined) ? Number(data.y) : p.y;
      let minD = 220;
      for (const [id, a] of asteroids) {
        if (a.isDead) continue;
        const d = Math.hypot(a.x - hitX, a.y - hitY);
        if (d < a.radius + minD) {
          minD = d - a.radius;
          ast = a;
        }
      }
    }

    if (!ast || ast.isDead) return;

    const dmg = Number(data.damage) || 12;
    ast.health -= dmg;

    if (ast.health <= 0) {
      ast.isDead = true;
      ast.health = 0;

      // Spawn crystal drops (85% green for level-up, rare S1/S2/S3 ammo)
      const droppedGems = [];
      const valEach = Math.max(1, Math.round(ast.crystalTotalValue / ast.crystalCount));
      for (let i = 0; i < ast.crystalCount; i++) {
        const gemId = `gem-${nextCrystalId++}`;
        const roll = Math.random();
        let gemElem = 'green';
        if (roll < 0.07) {
          gemElem = 'ice';    // Rare Laser - S1
        } else if (roll < 0.12) {
          gemElem = 'fire';   // Rare Laser - S2
        } else if (roll < 0.15) {
          gemElem = 'dark';   // Ultra-rare Laser - S3
        } else {
          gemElem = 'green';  // EXP / Level-up
        }
        const gem = {
          id: gemId,
          x: ast.x + (Math.random() - 0.5) * 35,
          y: ast.y + (Math.random() - 0.5) * 35,
          value: valEach,
          element: gemElem,
          targetId: socket.id,
          createdAt: Date.now()
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

      // Schedule rapid asteroid respawn in 3s and keep galaxy crowded
      setTimeout(() => {
        const baseLoc = ast.nearNation ? BASE_LOCATIONS[ast.nearNation] : null;
        const newAst = generateAsteroid(ast.tier, baseLoc, ast.nearNation);
        io.emit('asteroid_spawned', newAst);
        // Also spawn an extra asteroid 35% of the time so universe feels densely populated
        if (Math.random() < 0.35) {
          const extraAst = generateAsteroid();
          io.emit('asteroid_spawned', extraAst);
        }
      }, 3000);

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

      // Drop carried credits as bounty. Victim crystals reset to 0 upon death per user request
      const carried = victim.crystals || 0;
      victim.crystals = 0; // Envanter 0a indi!

      const count = Math.min(30, Math.max(carried > 0 ? 4 : 0, Math.floor(carried / 30)));
      const droppedGems = [];
      if (count > 0 && carried > 0) {
        const valEach = Math.max(1, Math.round(carried / count));
        for (let i = 0; i < count; i++) {
          const gemId = `gem-${nextCrystalId++}`;
          const gem = {
            id: gemId,
            x: victim.x + (Math.random() - 0.5) * 45,
            y: victim.y + (Math.random() - 0.5) * 45,
            value: valEach,
            element: 'fire',
            targetId: attacker.id,
            createdAt: Date.now()
          };
          activeCrystals.set(gemId, gem);
          droppedGems.push(gem);
        }
      }

      attacker.kills = (attacker.kills || 0) + 1;
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

      // User request: "üssü yok olmasına rağmen örnek olarka mavi üssü patlatıldı mavi gemiler oyundan düşecek ve giriş için ana ekrana yönelndirilecek."
      for (const [pid, pl] of players) {
        if (pl.nation === base.nation) {
          pl.isDead = true;
          pl.shield = 0;
        }
      }

      broadcastTeamStatus();

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

    let gem = (data && data.crystalId) ? activeCrystals.get(data.crystalId) : null;
    let targetGemId = data ? data.crystalId : null;

    if (!gem && data) {
      const hitX = (data.x !== undefined) ? Number(data.x) : p.x;
      const hitY = (data.y !== undefined) ? Number(data.y) : p.y;
      for (const [id, g] of activeCrystals) {
        if (Math.hypot(g.x - hitX, g.y - hitY) < 180) {
          gem = g;
          targetGemId = id;
          break;
        }
      }
    }
    if (!gem) return;

    activeCrystals.delete(targetGemId);
    p.crystals = (p.crystals || 0) + gem.value;
    p.mined = (p.mined || 0) + gem.value;
    p.score = (p.score || 0) + gem.value * 15;

    io.emit('crystal_collected', {
      crystalId: targetGemId,
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

  // Base Donation (Strict base perimeter check)
  socket.on('donate_base', (data) => {
    const p = players.get(socket.id);
    if (!p || p.isDead) return;

    const base = stations[p.nation];
    if (!base || base.isDead) return;

    // Strict rule: base donation only when inside base perimeter
    const dist = Math.hypot(p.x - base.x, p.y - base.y);
    if (dist > 650) return;

    const amt = Math.min(p.crystals || 0, Number(data.amount) || 0);
    if (amt <= 0) return;

    p.crystals -= amt;
    p.donations = (p.donations || 0) + amt;
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

  // Tactical Chat Message (Supports 'global' and 'team' channels)
  socket.on('send_chat', (data) => {
    const p = players.get(socket.id);
    if (!p) return;

    const text = String(data.text || '').trim().slice(0, 70);
    if (!text) return;

    const channel = (data && data.channel === 'team') ? 'team' : 'global';

    const msg = {
      id: `chat-${Date.now()}-${Math.random()}`,
      senderName: p.name,
      nation: p.nation,
      channel,
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
            targetId: null,
            createdAt: Date.now()
          };
          activeCrystals.set(gemId, gem);
          drops.push(gem);
        }
        io.emit('crystals_spawned', { crystals: drops });
      }

      players.delete(socket.id);
      io.emit('player_left', { playerId: socket.id });

      // If no players remain online, reset all orphaned floating crystals so next pilots enter a clean galaxy
      if (players.size === 0) {
        activeCrystals.clear();
        console.log('[*] Tüm oyuncular ayrıldı: Boşta kalan tüm kristal ve cevherler sıfırlandı.');
      }

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
      kills: p.kills || 0,
      mined: p.mined || 0,
      donations: p.donations || 0,
      isDead: p.isDead,
      spawnShieldTimer: p.spawnShieldTimer
    });
  }

  io.emit('players_tick', { players: states });
}, 40); // 25 times per second

// ==========================================
// CRYSTAL LIFESPAN & DECAY TIMER (35 SECONDS)
// Uncollected gems fade and despawn so space stays clean
// ==========================================
setInterval(() => {
  if (activeCrystals.size === 0) return;
  const now = Date.now();
  const expiredIds = [];
  for (const [id, gem] of activeCrystals) {
    if (now - (gem.createdAt || now) > 35000) {
      expiredIds.push(id);
    }
  }
  if (expiredIds.length > 0) {
    for (const id of expiredIds) {
      activeCrystals.delete(id);
    }
    io.emit('crystals_expired', { crystalIds: expiredIds });
  }
}, 2000);

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

// Game Entities: Ship, Bot, Asteroid, Gem, Laser, Particle
class Entity {
  constructor(x, y, radius, mass = 1.0) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.rotation = 0; // Angle in radians (0 = pointing right)
    this.radius = radius;
    this.mass = mass;
    this.isDead = false;
    this.mesh = null;
  }

  update(dt, worldSize) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Toroidal continuous wrap: seamlessly loop across arena in any direction
    if (worldSize) {
      const half = worldSize / 2;
      while (this.x < -half) this.x += worldSize;
      while (this.x > half) this.x -= worldSize;
      while (this.y < -half) this.y += worldSize;
      while (this.y > half) this.y -= worldSize;
    }

    if (this.mesh) {
      this.mesh.position.set(this.x, -this.y, 0); // Y inverted for intuitive 2D plane
      this.mesh.rotation.z = -this.rotation + Math.PI / 2;
    }
  }

  destroy(scene) {
    this.isDead = true;
    if (this.mesh && scene) {
      scene.remove(this.mesh);
    }
  }
}

// Particle Effect
class Particle {
  constructor(x, y, vx, vy, color, size, lifetime) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.lifetime = lifetime;
    this.maxLife = lifetime;
    this.size = size;
    this.color = color;
    this.isDead = false;

    const geo = new THREE.PlaneGeometry(size, size);
    const mat = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 1.0,
      depthWrite: false
    });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.position.set(x, -y, 2);
  }

  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.lifetime -= dt;

    if (this.lifetime <= 0) {
      this.isDead = true;
      return;
    }

    const lifeRatio = this.lifetime / this.maxLife;
    this.mesh.position.set(this.x, -this.y, 2);
    this.mesh.material.opacity = lifeRatio;
    this.mesh.scale.set(lifeRatio, lifeRatio, 1);
  }

  destroy(scene) {
    this.isDead = true;
    if (this.mesh && scene) scene.remove(this.mesh);
  }
}

// Laser Bolt
class Laser extends Entity {
  constructor(x, y, vx, vy, damage, isHeavy, ownerId, color = 0x00f0ff, nation = 'blue', maxRange = 600, isHealBeam = false, element = 'standard') {
    const radiusScale = Math.max(0.85, Math.min(2.2, Math.sqrt(damage / 10)));
    super(x, y, (isHeavy ? 6 : 4) * radiusScale, 0.1);
    this.startX = x;
    this.startY = y;
    this.vx = vx;
    this.vy = vy;
    this.damage = damage;
    this.isHeavy = isHeavy;
    this.ownerId = ownerId;
    this.nation = nation;
    this.maxRange = maxRange;
    this.isHealBeam = isHealBeam;
    this.element = element;
    this.color = color;
    const speed = Math.hypot(vx, vy);
    this.lifetime = speed > 0 ? (this.maxRange / speed) * 1.08 : 1.5;
    this.rotation = Math.atan2(vy, vx);

    this.mesh = ModelBuilder.createLaserMesh(isHeavy, color, damage, element);
    this.mesh.position.set(x, -y, 1);
    this.mesh.rotation.z = -this.rotation + Math.PI / 2;
  }

  // Exact particle color matching laser bolt per user request: "lazer ile ateş ettiğimizde hangi renkse çarptığı yerde partiküllerine ayrılsın"
  getHitColor() {
    if (this.isHealBeam) return 0x00ff88;
    if (this.element === 'ice') return 0x00f0ff;
    if (this.element === 'fire') return 0xff4500;
    if (this.element === 'dark') return 0xc084fc;
    if (this.color) return this.color;
    return 0x00ff44;
  }

  update(dt, worldSize) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.lifetime -= dt;

    if (worldSize) {
      const half = worldSize / 2;
      while (this.x < -half) this.x += worldSize;
      while (this.x > half) this.x -= worldSize;
      while (this.y < -half) this.y += worldSize;
      while (this.y > half) this.y -= worldSize;
    }

    const distTravelled = Math.hypot(this.x - this.startX, this.y - this.startY);
    if (this.lifetime <= 0) {
      this.isDead = true;
    }

    if (this.mesh) {
      this.mesh.position.set(this.x, -this.y, 1);
    }
  }
}

// Gem / Incandescent Asteroid Chunk dropped from asteroids & destroyed ships
class Gem extends Entity {
  constructor(x, y, value = 1, element = 'green', id = null, burstVx = 0, burstVy = 0) {
    super(x, y, value >= 60 ? 16 : (value > 8 ? 10 : 7), 0.5);
    this.id = id || `gem-${Date.now()}-${Math.floor(Math.random() * 10000000)}`;
    this.value = value;
    this.element = element || 'green';
    this.collectDelay = 0.35; // Guarantee incandescent fragments burst out visibly before collection
    this.vx = burstVx || (Math.random() - 0.5) * 45;
    this.vy = burstVy || (Math.random() - 0.5) * 45;
    this.drag = 0.88;
    this.mesh = ModelBuilder.createGemMesh(value, this.element);
    this.mesh.position.set(x, -y, 0);
    this.rotSpeedX = (Math.random() - 0.5) * 4;
    this.rotSpeedY = (Math.random() - 0.5) * 4;
    this.life = 35.0;
    this.isExpired = false;
  }

  destroy(scene) {
    this.isDead = true;
    if (this.mesh) {
      this.mesh.visible = false;
      if (scene) scene.remove(this.mesh);
    }
  }

  update(dt, worldSize, ships) {
    if (this.isDead || this.isExpired) {
      if (this.mesh) this.mesh.visible = false;
      return;
    }
    this.life -= dt;
    if (this.collectDelay > 0) {
      this.collectDelay -= dt;
    }
    if (this.life <= 0) {
      this.isExpired = true;
      if (this.mesh) this.mesh.visible = false;
      return;
    }
    if (this.life <= 5.0 && this.mesh) {
      // Gentle blinking effect before despawning
      this.mesh.visible = Math.floor(this.life * 6) % 2 === 0;
    }

    // Local proximity magnet: only activates AFTER collectDelay has finished
    let magnetShip = null;
    let minHullDist = 18;

    if (this.collectDelay <= 0 && Array.isArray(ships)) {
      for (const ship of ships) {
        if (ship.isDead) continue;
        // User request: "son seviye ve kargo full dolunca daha toplama yapılmasın"
        const shipCfg = SHIP_TREE[ship.shipKey];
        if (shipCfg && shipCfg.tier >= 4 && ship.crystals >= shipCfg.cargoCapacity) {
          continue;
        }
        const centerDist = Math.hypot(ship.x - this.x, ship.y - this.y);
        const hullDist = centerDist - ship.radius;
        if (hullDist < minHullDist) {
          minHullDist = hullDist;
          magnetShip = ship;
        }
      }
    }

    if (magnetShip) {
      const dx = magnetShip.x - this.x;
      const dy = magnetShip.y - this.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 1) {
        const dirX = dx / dist;
        const dirY = dy / dist;
        // Smooth suction towards the nearby ship
        const pullSpeed = 420;
        const steerForce = Math.min(1.0, dt * 10.0);
        this.vx += (dirX * pullSpeed - this.vx) * steerForce;
        this.vy += (dirY * pullSpeed - this.vy) * steerForce;
      }
    } else {
      // Natural friction/drag: floats stationary in space awaiting someone to approach
      this.vx *= Math.pow(this.drag, dt * 60);
      this.vy *= Math.pow(this.drag, dt * 60);
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    if (worldSize) {
      const half = worldSize / 2;
      while (this.x < -half) this.x += worldSize;
      while (this.x > half) this.x -= worldSize;
      while (this.y < -half) this.y += worldSize;
      while (this.y > half) this.y -= worldSize;
    }

    if (this.mesh) {
      this.mesh.position.set(this.x, -this.y, 0);
      this.mesh.rotation.x += this.rotSpeedX * dt;
      this.mesh.rotation.y += this.rotSpeedY * dt;
      const ring = this.mesh.getObjectByName('gemRing');
      if (ring) {
        ring.rotation.z += 2.8 * dt;
        ring.material.opacity = 0.35 + Math.sin(Date.now() * 0.008) * 0.2;
      }
    }
  }
}

// Asteroid (7 Proportional Sizes: Size 1 = Smallest, Size 7 = Largest)
class Asteroid extends Entity {
  constructor(x, y, sizeTier = 1, id = null, element = 'ice') {
    const tier = Math.max(1, Math.min(7, sizeTier));
    // Size 1 (radius 13) to Size 7 (radius 64)
    const radius = 13 + (tier - 1) * 8.5;
    const mass = 1.5 + tier * 2.5;
    super(x, y, radius, mass);

    this.id = id || `ast-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
    this.sizeTier = tier;
    this.element = element || 'ice';

    // Proportional health from tier 1 (16 HP) to tier 7 (1650 HP)
    const healths = [0, 16, 42, 105, 230, 460, 920, 1650];
    this.maxHealth = healths[tier] || (tier * 220);
    this.health = this.maxHealth;

    // Yield configuration: Max 1 - 4 pieces! ("en fazla 1-4 arası dağılma olssun ve parçalar en büyük asteroitten büyük bir tek parça çıkabilir şeklinde")
    const tierYields = [
      null,
      { min: 1, max: 2, totalPoints: 2 },
      { min: 1, max: 3, totalPoints: 6 },
      { min: 2, max: 3, totalPoints: 15 },
      { min: 2, max: 4, totalPoints: 32 },
      { min: 2, max: 4, totalPoints: 60 },
      { min: 2, max: 4, totalPoints: 105 },
      { min: 1, max: 4, totalPoints: 180 }
    ];
    const yCfg = tierYields[tier] || tierYields[1];
    let count = Math.floor(Math.random() * (yCfg.max - yCfg.min + 1)) + yCfg.min;
    if (tier === 7 && Math.random() < 0.45) {
      count = 1; // Devasa asteroidden tek büyük zengin parça
    }
    this.crystalCount = Math.max(1, Math.min(4, count));
    // Balanced EXP yield: reduced points so leveling requires active asteroid hunting
    this.crystalTotalValue = yCfg.totalPoints;

    // Completely stationary (no movement across space)
    this.vx = 0;
    this.vy = 0;

    // Track damage dealt by each player / bot (highest damager gets the drops!)
    this.damageLog = {};

    this.mesh = ModelBuilder.createAsteroidMesh(radius, tier, this.element);
    this.mesh.position.set(x, -y, 0);

    this.rotSpeed = {
      x: (Math.random() - 0.5) * 0.3,
      y: (Math.random() - 0.5) * 0.3,
      z: (Math.random() - 0.5) * 0.3
    };

    // Damage flash & visual feedback (No health bar per user request: 'asteroidler can bari görülmemeli')
    this.damageFlashTimer = 0;
    this.shakeTimer = 0;
  }

  createHealthBar(scene) {
    // Disabled: user requested asteroid health bars be completely hidden
  }

  flashDamage() {
    // User request: "asteroitler hasar alırken titreme gibi efekti olmasın sabit durabilir"
    // Absolutely stationary, no shake
  }

  takeDamage(dmg, attackerId = null) {
    if (attackerId) {
      this.damageLog[attackerId] = (this.damageLog[attackerId] || 0) + dmg;
    }
    this.health -= dmg;
    this.flashDamage();

    if (this.health <= 0) {
      this.health = 0;
      this.isDead = true;
      return true; // Destroyed
    }
    return false;
  }

  getTopContributor() {
    let topId = null;
    let maxDmg = 0;
    for (const [id, dmg] of Object.entries(this.damageLog)) {
      if (dmg > maxDmg) {
        maxDmg = dmg;
        topId = id;
      }
    }
    return topId;
  }

  update(dt, worldSize) {
    // Asteroid stays strictly stationary at its fixed coordinates
    this.vx = 0;
    this.vy = 0;

    if (this.mesh) {
      this.mesh.position.set(this.x, -this.y, 0);
      this.mesh.rotation.x += this.rotSpeed.x * dt;
      this.mesh.rotation.y += this.rotSpeed.y * dt;
      this.mesh.rotation.z += this.rotSpeed.z * dt;
    }
  }

  destroy(scene) {
    this.isDead = true;
    super.destroy(scene);
  }
}

// Tactical Companion Escort Drone (Attack, Defense, Mining)
class Drone {
  constructor(type = 'attack', nation = 'blue', scene = null) {
    this.type = type; // 'attack', 'defense', 'mining'
    this.nation = nation || 'blue';
    this.scene = scene;
    this.x = 0;
    this.y = 0;
    this.rotation = 0;
    this.fireTimer = 0.4 + Math.random() * 0.4;
    this.isDead = false;
    this.mesh = ModelBuilder.createDroneMesh(type, nation);
    if (scene) scene.add(this.mesh);
  }

  destroy(scene) {
    this.isDead = true;
    const activeScene = scene || this.scene;
    if (this.mesh && activeScene) {
      activeScene.remove(this.mesh);
      this.mesh = null;
    }
  }

  update(dt, parentShip, index, totalDrones, game) {
    if (this.isDead || !parentShip || parentShip.isDead) {
      this.isDead = true;
      if (this.mesh && this.scene) this.scene.remove(this.mesh);
      return;
    }

    // Follow formation behind parent ship in an orderly tactical arc
    const spread = Math.PI * 0.75;
    const baseAngle = parentShip.rotation + Math.PI; // trailing behind
    const angleStep = totalDrones > 1 ? spread / (totalDrones - 1) : 0;
    const targetAngle = totalDrones > 1 ? (baseAngle - spread / 2 + index * angleStep) : baseAngle;
    const followDist = (parentShip.radius || 18) + 48; // Increased for 3x drone scale

    const targetX = parentShip.x + Math.cos(targetAngle) * followDist;
    const targetY = parentShip.y + Math.sin(targetAngle) * followDist;

    // Seamless world border crossing: if parent ship wrapped around the world boundary, instantly wrap drone too!
    let dx = targetX - this.x;
    let dy = targetY - this.y;
    const worldSpan = (game && game.worldSize) ? game.worldSize : 8250;
    const halfWorld = worldSpan * 0.5;

    if (Math.abs(dx) > halfWorld) {
      this.x += (dx > 0) ? worldSpan : -worldSpan;
      dx = targetX - this.x;
    }
    if (Math.abs(dy) > halfWorld) {
      this.y += (dy > 0) ? worldSpan : -worldSpan;
      dy = targetY - this.y;
    }

    // Smooth formation following
    this.x += dx * Math.min(1.0, dt * 11);
    this.y += dy * Math.min(1.0, dt * 11);
    this.rotation = parentShip.rotation;

    if (this.mesh) {
      this.mesh.position.set(this.x, -this.y, 2);
      this.mesh.rotation.z = -this.rotation + Math.PI / 2;
    }

    // Drone Specializations:
    if (this.type === 'attack') {
      this.fireTimer -= dt;
      if (this.fireTimer <= 0 && game) {
        // User request: "saldırı dronu sadece pvp için olacak asteroitlere atak yapmayacak"
        let bestTarget = null;
        let minDist = 460;

        if (game.remotePlayers) {
          for (const rp of game.remotePlayers.values()) {
            if (rp && !rp.isDead && rp.nation !== parentShip.nation) {
              const d = Math.hypot(rp.x - this.x, rp.y - this.y);
              if (d < minDist) {
                minDist = d;
                bestTarget = rp;
              }
            }
          }
        }

        if (bestTarget) {
          this.fireTimer = 1.05; // 1 shot / sec
          const ang = Math.atan2(bestTarget.y - this.y, bestTarget.x - this.x);
          const spd = 620;
          const laserColor = (parentShip.nation === 'red' ? 0xff3b5c : (parentShip.nation === 'gold' ? 0xffd044 : 0x00f0ff));
          const laser = new Laser(
            this.x, this.y,
            Math.cos(ang) * spd, Math.sin(ang) * spd,
            12, false, parentShip.id,
            laserColor, parentShip.nation, 450, false, 'standard'
          );
          game.lasers.push(laser);
          game.scene.add(laser.mesh);
          if (window.soundSystem) {
            const vol = game.getPositionalVolume(this.x, this.y, 600) * 0.35;
            if (vol > 0.02) window.soundSystem.playLaser(false, vol);
          }
        }
      }
    } else if (this.type === 'defense') {
      // Passive nanite shield repair: +6 shield/sec to parent ship
      if (parentShip.shield < parentShip.stats.shieldCap) {
        parentShip.shield = Math.min(parentShip.stats.shieldCap, parentShip.shield + 6.0 * dt);
      }
      if (this.mesh) {
        this.mesh.rotation.z += dt * 3.5; // High-tech rotating protective core
      }
    } else if (this.type === 'mining') {
      // User request: "maden dronu ben ateş ettiğim asteroite atak yapacak atak yapmadığım durumda saldırı yapmayacak"
      this.fireTimer -= dt;
      if (this.fireTimer <= 0 && game) {
        const targetAst = parentShip.lastTargetAsteroid;
        const now = (typeof performance !== 'undefined') ? performance.now() : Date.now();
        const isRecent = parentShip.lastTargetAsteroidTime && (now - parentShip.lastTargetAsteroidTime < 3500);

        if (targetAst && !targetAst.isDead && isRecent) {
          const d = Math.hypot(targetAst.x - this.x, targetAst.y - this.y);
          if (d <= 520) {
            this.fireTimer = 0.80; // Mining laser pulse
            const ang = Math.atan2(targetAst.y - this.y, targetAst.x - this.x);
            const spd = 560;
            const laser = new Laser(
              this.x, this.y,
              Math.cos(ang) * spd, Math.sin(ang) * spd,
              14, false, parentShip.id,
              0xffaa00, parentShip.nation, 420, false, 'standard'
            );
            game.lasers.push(laser);
            game.scene.add(laser.mesh);
          }
        }
      }
    }
  }
}

// Base Ship Class (Shared by Player and Bot)
class Ship extends Entity {
  constructor(id, name, shipKey = 'fly', x = 0, y = 0, isPlayer = false, nation = 'blue', scene = null) {
    const config = SHIP_TREE[shipKey];
    super(x, y, config.radius, config.baseStats.mass);

    this.id = id;
    this.name = name;
    this.shipKey = shipKey;
    this.isPlayer = isPlayer;
    this.nation = nation || 'blue';
    this.scene = scene;
    const nationCfg = NATIONS[this.nation] || NATIONS['blue'];
    this.customColor = nationCfg.color;
    this.tier = (config && config.tier) ? config.tier : 1;
    this.drones = [];
    this.isDockedAtBase = false;
    this.dockShieldMesh = null;
    this.dockShieldTimer = 0;
    this.isStabilizerActive = true; // User request: AÇIKKEN kayma yok (otomatik frenleme)
    this.isDriftActive = false;
    this.lastTargetAsteroid = null;
    this.lastTargetAsteroidTime = 0;
    // Initial standard laser is strictly neon green per user request: "ilk lazer her zaman yeşil olacak."
    this.laserColor = 0x00ff44;

    // Upgrades level (0 to 6)
    this.upgrades = {
      shieldCap: 0,
      shieldRegen: 0,
      energyCap: 0,
      energyRegen: 0,
      fireDamage: 0,
      fireSpeed: 0,
      shipSpeed: 0,
      shipAgility: 0
    };

    this.crystals = 0;
    this.score = 0;
    this.kills = 0;
    this.mined = 0;
    this.donations = 0;
    this.rcsEnabled = true; // Reaction Control System (auto-damping)

    // Elemental & Tactical Action Systems
    // User request: "ekstra kredi ile açılmasına gerek yok hiç birinin space ve r direkt aktif olsun."
    this.unlockedWeapons = { standard: true, ice: true, fire: true, dark: true };
    this.activeWeapon = 'standard';
    this.warpUnlocked = true;
    this.warpCooldown = 0;
    this.warpActiveTimer = 0; // 3-second continuous sustained warp thrust timer
    this.superCooldown = 0;
    this.statusEffects = { burnTimer: 0, burnDps: 0, freezeTimer: 0, freezeFactor: 0.40 };

    // Elemental crystal material reservoirs (User request: S1-S2-S3 starts at 75-50-25)
    this.elementalAmmo = { ice: 75, fire: 50, dark: 25 };
    this.maxElementalAmmo = { ice: 150, fire: 120, dark: 80 };

    this.recomputeStats();
    this.shield = this.stats.shieldCap;
    this.energy = this.stats.energyCap;

    this.fireTimer = 0;
    this.isEnergyStarved = false; // Starvation state: if energy hits 0, clamped to 0.60s fire rate until 30 energy
    this.isThrusting = false;
    this.isShooting = false;
    this.targetRotation = 0;
    this.shieldDamageFlash = 0;
    this.spawnShieldTimer = 0;

    // Archetype / Class properties
    this.isHealer = !!config.isHealer;

    this.mesh = ModelBuilder.createShipMesh(shipKey, this.customColor);
    this.engineFlame = this.mesh.getObjectByName('engineFlame');
    this.shieldBubble = this.mesh.getObjectByName('shieldBubble');
    this.wingTrails = this.mesh.getObjectByName('wingTrails');

    if (this.mesh) {
      this.mesh.position.set(this.x, -this.y, 0);
      this.mesh.rotation.z = -this.rotation + Math.PI / 2;
      this.mesh.renderOrder = 10; // Guaranteed to render in front of space station geometry
    }

    if (this.scene && !this.isMenuBot && !this.isMenuSkirmish && !(window.game && window.game.isMenuBattle)) {
      this.createHealthBar(this.scene);
    }
  }

  // User request: "gemiler seviye atlıyor fakat dron ekle 2de kaldı düzeltelim"
  get maxDrones() {
    const t = this.tier || (SHIP_TREE[this.shipKey] ? SHIP_TREE[this.shipKey].tier : 1);
    return t + 1; // Tier 1 -> 2, Tier 2 -> 3, Tier 3 -> 4...
  }

  recomputeStats() {
    const config = SHIP_TREE[this.shipKey];
    if (config && config.tier) this.tier = config.tier;
    this.radius = config.radius;
    this.mass = config.baseStats.mass;

    this.stats = {
      shieldCap: config.baseStats.shieldCap * (1 + this.upgrades.shieldCap * 0.15),
      shieldRegen: config.baseStats.shieldRegen * (1 + this.upgrades.shieldRegen * 0.20),
      energyCap: config.baseStats.energyCap * (1 + this.upgrades.energyCap * 0.15),
      energyRegen: config.baseStats.energyRegen * (1 + this.upgrades.energyRegen * 0.20),
      fireDamage: config.baseStats.fireDamage * (1 + this.upgrades.fireDamage * 0.14),
      fireSpeed: config.baseStats.fireSpeed * (1 + this.upgrades.fireSpeed * 0.12),
      fireRange: (config.baseStats.fireRange || 600) * (1 + this.upgrades.fireSpeed * 0.05),
      fireRate: config.baseStats.fireRate,
      shipSpeed: config.baseStats.shipSpeed * (1 + this.upgrades.shipSpeed * 0.12),
      shipAgility: config.baseStats.shipAgility * (1 + this.upgrades.shipAgility * 0.15),
      cargoCapacity: config.cargoCapacity
    };
  }

  evolve(newShipKey, scene = null) {
    if (!SHIP_TREE[newShipKey]) return;
    this.shipKey = newShipKey;
    const config = SHIP_TREE[newShipKey];
    this.tier = (config && config.tier) ? config.tier : 1;
    this.crystals = 0; // reset cargo on evolution

    this.isHealer = !!config.isHealer;

    // Reset upgrades for new ship tier
    for (const key in this.upgrades) {
      this.upgrades[key] = 0;
    }
    this.recomputeStats();
    this.shield = this.stats.shieldCap;
    this.energy = this.stats.energyCap;

    const activeScene = scene || this.scene;
    // Swap 3D mesh
    if (this.mesh && activeScene) {
      activeScene.remove(this.mesh);
    }
    this.mesh = ModelBuilder.createShipMesh(newShipKey, this.customColor);
    this.engineFlame = this.mesh.getObjectByName('engineFlame');
    this.shieldBubble = this.mesh.getObjectByName('shieldBubble');
    this.wingTrails = this.mesh.getObjectByName('wingTrails');
    if (this.mesh) {
      this.mesh.position.set(this.x, -this.y, 0);
      this.mesh.rotation.z = -this.rotation + Math.PI / 2;
      this.mesh.renderOrder = 10;
    }
    if (activeScene) {
      activeScene.add(this.mesh);
    }
  }

  setNation(newNation, scene = null) {
    if (!newNation || this.nation === newNation) return;
    this.nation = newNation;
    const nationCfg = NATIONS[this.nation] || NATIONS['blue'];
    this.customColor = nationCfg.color;
    const activeScene = scene || this.scene || (window.game && window.game.scene);
    if (this.mesh && activeScene) {
      activeScene.remove(this.mesh);
    }
    this.mesh = ModelBuilder.createShipMesh(this.shipKey, this.customColor);
    this.engineFlame = this.mesh.getObjectByName('engineFlame');
    this.shieldBubble = this.mesh.getObjectByName('shieldBubble');
    this.wingTrails = this.mesh.getObjectByName('wingTrails');
    if (this.mesh) {
      this.mesh.position.set(this.x, -this.y, 0);
      this.mesh.rotation.z = -this.rotation + Math.PI / 2;
      this.mesh.renderOrder = 10;
    }
    if (activeScene) {
      activeScene.add(this.mesh);
      this.createPlayerNameTag(activeScene);
    }
  }

  takeDamage(amount, isCollision = false) {
    if (this.spawnShieldTimer > 0) {
      return false; // Invulnerable during spawn base protection
    }

    this.shield -= amount;
    this.shieldDamageFlash = 0.2; // Show shield bubble for 200ms

    if (this.shield <= 0) {
      this.shield = 0;
      // User request: "ve 0a kadar düşerse envanterdeki malzemeler gökyüzüne çarptığı sürece dağılsın"
      // If ship has crystals during collision impact, do not instantly explode - allow crystals to spill first!
      if (isCollision && this.crystals > 0) {
        return false;
      }
      this.isDead = true;
      return true;
    }
    return false;
  }

  applyStatusEffect(effect, duration = 3.5, strength = null) {
    if (this.isDead) return;
    if (effect === 'freeze') {
      this.statusEffects.freezeTimer = Math.max(this.statusEffects.freezeTimer, duration);
      this.statusEffects.freezeFactor = strength || 0.40;
    } else if (effect === 'burn') {
      this.statusEffects.burnTimer = Math.max(this.statusEffects.burnTimer, duration);
      this.statusEffects.burnDps = strength || 8.0;
    }
  }

  triggerWarpDash(particlesCallback = null) {
    if (this.isDead || !this.warpUnlocked || this.warpCooldown > 0) return false;
    this.warpActiveTimer = 3.0; // 3 seconds continuous propulsion
    this.warpCooldown = 120.0; // 120 seconds cooldown ("aynı şekilde space 120 saniye olacak")
    const initialSurge = 180 + (this.stats.shipSpeed || 150) * 0.40;
    this.vx += Math.cos(this.rotation) * initialSurge;
    this.vy += Math.sin(this.rotation) * initialSurge;
    if (particlesCallback) {
      particlesCallback(this.x, this.y, this.rotation);
    }
    return true;
  }

  triggerSuper(fireLaserCallback = null) {
    if (this.isDead || this.superCooldown > 0 || this.energy < 25) return false;
    this.superCooldown = 60.0; // 60 seconds cooldown ("dolma süresi 60 saniye olacak")
    this.energy = Math.max(0, this.energy - 25);
    if (fireLaserCallback) {
      // Localized shockwave burst: radius ~65-68 units (roughly 2 ships placed side by side)
      // ("r skili alanı o kadar geniş olmyacak ve etkisi yan yana gemileri koysak 2 gemi kadar olacak")
      const count = 18 + (this.upgrades.energyCap || 0) * 2;
      const blastRadius = 66; // 2 ships width
      for (let i = 0; i < count; i++) {
        const ang = this.rotation + (i / count) * Math.PI * 2;
        const isHeavyBolt = (i % 2 === 0);
        const boltSpeed = 220;
        const vx = Math.cos(ang) * boltSpeed + this.vx * 0.2;
        const vy = Math.sin(ang) * boltSpeed + this.vy * 0.2;
        const novaLaser = new Laser(
          this.x, this.y, vx, vy,
          this.stats.fireDamage * 2.4, // High concentrated point-blank blast damage
          isHeavyBolt,
          this.id,
          (i % 2 === 0 ? 0xffdd44 : 0x00f0ff),
          this.nation,
          blastRadius, // Range confined to 2 ships width
          false,
          'fire'
        );
        fireLaserCallback(novaLaser);
      }
    }
    return true;
  }

  update(dt, worldSize) {
    // Cooldown timers
    if (this.warpCooldown > 0) this.warpCooldown = Math.max(0, this.warpCooldown - dt);
    if (this.superCooldown > 0) this.superCooldown = Math.max(0, this.superCooldown - dt);

    // Status effect modifiers
    let speedModifier = 1.0;
    let turnModifier = 1.0;
    if (this.statusEffects.freezeTimer > 0) {
      this.statusEffects.freezeTimer -= dt;
      speedModifier *= (1 - this.statusEffects.freezeFactor); // 40% slow
      turnModifier *= 0.65;
    }

    if (this.statusEffects.burnTimer > 0) {
      this.statusEffects.burnTimer -= dt;
      const dotDmg = (this.statusEffects.burnDps || 8.0) * dt;
      this.takeDamage(dotDmg);
    }

    // Rotate towards target rotation with agility limit
    let angleDiff = this.targetRotation - this.rotation;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;

    const maxTurn = this.stats.shipAgility * turnModifier * dt;
    if (Math.abs(angleDiff) < maxTurn) {
      this.rotation = this.targetRotation;
    } else {
      this.rotation += Math.sign(angleDiff) * maxTurn;
    }

    // Reset speed strain if not shooting
    if (!this.isShooting) {
      this.isExhaustedSpeedStrain = false;
    }

    // Special speed penalty if straining empty energy reserves on speed ship
    const speedPenalty = (this.isExhaustedSpeedStrain ? 0.55 : 1.0) * speedModifier;

    // 3-Second Sustained Warp Drive Thrust ("space skili 3 saniye itmeli gemiyi")
    const isWarpActive = (this.warpActiveTimer > 0);
    if (isWarpActive) {
      this.warpActiveTimer = Math.max(0, this.warpActiveTimer - dt);
      const warpAccel = (this.stats.shipSpeed || 150) * 3.8;
      this.vx += Math.cos(this.rotation) * warpAccel * dt;
      this.vy += Math.sin(this.rotation) * warpAccel * dt;
    }

    // Normal Thrust acceleration
    if (this.isThrusting) {
      const accel = this.stats.shipSpeed * 2.2 * speedPenalty;
      this.vx += Math.cos(this.rotation) * accel * dt;
      this.vy += Math.sin(this.rotation) * accel * dt;
    }

    // Speed clamping (allows 2.5x speed multiplier during active 3-second warp propulsion)
    const warpMult = isWarpActive ? 2.5 : 1.0;
    const maxAllowedSpeed = this.stats.shipSpeed * speedPenalty * warpMult;
    const currentSpeed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    if (currentSpeed > maxAllowedSpeed) {
      this.vx = (this.vx / currentSpeed) * maxAllowedSpeed;
      this.vy = (this.vy / currentSpeed) * maxAllowedSpeed;
    }

    // RCS Damping (Starblast physics) - suspended during active warp thrust
    if (this.rcsEnabled && !this.isThrusting && !isWarpActive) {
      const damping = Math.pow(0.5, dt * 2.5);
      this.vx *= damping;
      this.vy *= damping;
    }

    // Regen Shields & Energy
    if (this.shield < this.stats.shieldCap) {
      this.shield = Math.min(this.stats.shieldCap, this.shield + this.stats.shieldRegen * dt);
    }
    if (this.energy < this.stats.energyCap) {
      this.energy = Math.min(this.stats.energyCap, this.energy + this.stats.energyRegen * dt);
    }

    // Energy Starvation check:
    if (this.energy <= 0.1) {
      this.isEnergyStarved = true;
    } else if (this.isEnergyStarved && this.energy >= 30) {
      this.isEnergyStarved = false;
    }

    if (this.fireTimer > 0) this.fireTimer -= dt;

    // Visual updates (smooth sci-fi ion propulsion light & wing slipstream trails)
    if (this.engineFlame) {
      const activeThrust = this.isThrusting || isWarpActive;
      this.engineFlame.visible = activeThrust;
      if (activeThrust) {
        this.thrustAnimTime = (this.thrustAnimTime || 0) + dt * 10;
        const t = this.thrustAnimTime;
        // Smooth futuristic ion drive wave (NO erratic jitter / NO random shaking)
        const lengthPulse = (isWarpActive ? 1.6 : 1.0) + Math.sin(t) * 0.08 + Math.cos(t * 1.6) * 0.04;
        const widthPulse = 0.96 + Math.sin(t * 1.3) * 0.04;
        this.engineFlame.scale.set(widthPulse, widthPulse, lengthPulse);
      }
    }

    if (this.wingTrails) {
      const speed = Math.hypot(this.vx, this.vy);
      const isGliding = (this.isThrusting || speed > 60 || isWarpActive);
      this.wingTrails.visible = isGliding;
      if (isGliding) {
        // Restrained aerodynamic wingtip slipstream ("hafif çizgisel bir süzülme efekti, aşırı uzamasın")
        const trailLen = Math.min(1.2, 0.7 + (speed / 320) * 0.5);
        this.wingTrails.scale.set(1.0, 1.0, trailLen);
      }
    }

    if (this.shieldBubble) {
      if (this.spawnShieldTimer > 0) {
        this.spawnShieldTimer -= dt;
        this.shieldBubble.material.opacity = 0.55 + Math.sin(Date.now() * 0.015) * 0.25;
      } else if (this.shieldDamageFlash > 0) {
        this.shieldDamageFlash -= dt;
        this.shieldBubble.material.opacity = Math.min(0.7, this.shieldDamageFlash * 3.5);
      } else {
        this.shieldBubble.material.opacity = 0;
      }
    }

    // Dynamic banking roll when turning (gives tactile 3D weight and highlights planar faceted wings)
    const hull = this.mesh ? this.mesh.getObjectByName('hullGroup') : null;
    if (hull) {
      if (this.currentBank === undefined) this.currentBank = 0;
      const turnRate = Math.sign(angleDiff) * Math.min(1.0, Math.abs(angleDiff) / 0.5);
      const targetBank = -turnRate * 0.32;
      this.currentBank += (targetBank - this.currentBank) * Math.min(1.0, dt * 9);
      hull.rotation.z = this.currentBank;
    }

    // User request: "ctrl nin işlevini tam tersine çevirelim üst panelde açıkken kayma yok kapalıyken kayma var"
    if (this.isStabilizerActive) {
      this.drag = 0.94; // AÇIK: kayma yok (otomatik frenleme)
    } else {
      this.drag = 0.993; // KAPALI: kayma var (sürtünmesiz serbest süzülme)
    }

    super.update(dt, worldSize);
    this.updateHealthBar();
    if (this.nameSprite) {
      this.nameSprite.position.set(this.x, -this.y + this.radius + 36, 6);
    }

    // User request: "hologram kalkan görünümünü overlay %20 olarak yapalım daha az görülsün"
    if (this.isDockedAtBase) {
      if (!this.dockShieldMesh && (this.scene || (window.game && window.game.scene))) {
        const sc = this.scene || window.game.scene;
        this.dockShieldMesh = ModelBuilder.createDockShieldHologram(this.radius, this.nation);
        sc.add(this.dockShieldMesh);
      }
      if (this.dockShieldMesh) {
        this.dockShieldTimer = (this.dockShieldTimer || 0) + dt * 2.8;
        const pulse = 0.16 + Math.sin(this.dockShieldTimer) * 0.08; // 0.08 to 0.24, averaging ~0.20 overlay
        this.dockShieldMesh.visible = true;
        if (this.dockShieldMesh.pulseMat) {
          this.dockShieldMesh.pulseMat.opacity = pulse;
        }
        if (this.dockShieldMesh.wireMat) {
          this.dockShieldMesh.wireMat.opacity = pulse * 0.80;
        }
        if (this.dockShieldMesh.ringMat) {
          this.dockShieldMesh.ringMat.opacity = pulse * 0.90;
        }
        this.dockShieldMesh.position.set(this.x, -this.y, 1);
        this.dockShieldMesh.rotation.z += dt * 0.45;
      }
    } else if (this.dockShieldMesh) {
      this.dockShieldMesh.visible = false;
    }

    // Companion escort drones update
    if (this.drones && this.drones.length > 0) {
      for (let i = this.drones.length - 1; i >= 0; i--) {
        const drone = this.drones[i];
        drone.update(dt, this, i, this.drones.length, window.game);
        if (drone.isDead) {
          drone.destroy(this.scene || (window.game && window.game.scene));
          this.drones.splice(i, 1);
        }
      }
    }
  }

  // User request: "oyuncu nickleri hiç görülmüyor çok küçük büyült nicknamleri."
  createPlayerNameTag(scene) {
    const activeScene = scene || this.scene;
    if (!activeScene) return;
    if (this.nameSprite) {
      activeScene.remove(this.nameSprite);
      this.nameSprite = null;
    }
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.clearRect(0, 0, 512, 128);

    const nationColor = (this.nation === 'red') ? '#ff3b5c' : (this.nation === 'gold' ? '#ffd044' : '#00f0ff');
    ctx.font = 'bold 52px "Orbitron", "Share Tech Mono", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Dark solid outline for maximum clarity against deep space & bright stars
    ctx.strokeStyle = 'rgba(0, 5, 12, 0.95)';
    ctx.lineWidth = 10;
    ctx.strokeText(this.name || 'PILOT', 256, 64);

    // Nation glow
    ctx.shadowColor = nationColor;
    ctx.shadowBlur = 12;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(this.name || 'PILOT', 256, 64);

    const texture = new THREE.CanvasTexture(canvas);
    const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false });
    this.nameSprite = new THREE.Sprite(spriteMat);
    this.nameSprite.scale.set(150, 37.5, 1);
    this.nameSprite.position.set(this.x, -this.y + this.radius + 36, 6);
    activeScene.add(this.nameSprite);
  }

  createHealthBar(scene) {
    if (this.isMenuBot || this.isMenuSkirmish || (window.game && window.game.isMenuBattle)) {
      if (this.healthBarGroup) {
        const activeScene = scene || this.scene;
        if (activeScene) activeScene.remove(this.healthBarGroup);
        this.healthBarGroup = null;
      }
      return;
    }

    const activeScene = scene || this.scene;
    if (!activeScene) return;

    if (this.healthBarGroup) {
      activeScene.remove(this.healthBarGroup);
      this.healthBarGroup = null;
    }

    this.healthBarGroup = new THREE.Group();

    // Background dark bar
    const bgGeo = new THREE.PlaneGeometry(38, 4.5);
    const bgMat = new THREE.MeshBasicMaterial({
      color: 0x050c16,
      transparent: true,
      opacity: 0.85,
      depthWrite: false
    });
    const bgMesh = new THREE.Mesh(bgGeo, bgMat);
    this.healthBarGroup.add(bgMesh);

    // Subtle border
    const borderGeo = new THREE.EdgesGeometry(bgGeo);
    const borderMat = new THREE.LineBasicMaterial({
      color: 0x224466,
      transparent: true,
      opacity: 0.8
    });
    const borderLine = new THREE.LineSegments(borderGeo, borderMat);
    this.healthBarGroup.add(borderLine);

    // Health / Shield Fill bar
    const fillGeo = new THREE.PlaneGeometry(36, 3.2);
    fillGeo.translate(18, 0, 0); // Translate origin to left edge for clean scale.x
    this.healthFillMat = new THREE.MeshBasicMaterial({
      color: 0x00e676,
      depthWrite: false
    });
    this.healthFillMesh = new THREE.Mesh(fillGeo, this.healthFillMat);
    this.healthFillMesh.position.set(-18, 0, 0.1);
    this.healthBarGroup.add(this.healthFillMesh);

    this.healthBarGroup.position.set(this.x, -this.y + this.radius + 18, 4);
    activeScene.add(this.healthBarGroup);
  }

  updateHealthBar() {
    if (this.isMenuBot || this.isMenuSkirmish || (window.game && window.game.isMenuBattle)) {
      if (this.healthBarGroup) {
        this.healthBarGroup.visible = false;
        if (this.scene) this.scene.remove(this.healthBarGroup);
        this.healthBarGroup = null;
      }
      return;
    }

    if (!this.healthBarGroup) {
      if (this.scene && !this.isDead) {
        this.createHealthBar(this.scene);
      }
      return;
    }

    if (this.isDead) {
      this.healthBarGroup.visible = false;
      return;
    }

    this.healthBarGroup.visible = true;
    this.healthBarGroup.position.set(this.x, -this.y + this.radius + 18, 4);

    const ratio = Math.max(0.001, Math.min(1.0, this.shield / Math.max(1, this.stats.shieldCap)));
    if (this.healthFillMesh) {
      this.healthFillMesh.scale.x = ratio;
    }

    if (this.healthFillMat) {
      if (this.spawnShieldTimer > 0) {
        this.healthFillMat.color.setHex(0x00ffff);
      } else if (ratio > 0.5) {
        this.healthFillMat.color.setHex(0x00e676);
      } else if (ratio > 0.22) {
        this.healthFillMat.color.setHex(0xffaa00);
      } else {
        this.healthFillMat.color.setHex(0xff3344);
      }
    }
  }

  destroy(scene) {
    const activeScene = scene || this.scene;
    if (this.dockShieldMesh && activeScene) {
      activeScene.remove(this.dockShieldMesh);
      this.dockShieldMesh = null;
    }
    if (this.drones && this.drones.length > 0) {
      for (const drone of this.drones) {
        drone.destroy(activeScene);
      }
      this.drones = [];
    }
    if (this.healthBarGroup && activeScene) {
      activeScene.remove(this.healthBarGroup);
      this.healthBarGroup = null;
    }
    if (this.nameSprite && activeScene) {
      activeScene.remove(this.nameSprite);
      this.nameSprite = null;
    }
    super.destroy(activeScene);
  }

  // Shoot lasers from ship's weapon mounts (Elemental or Standard)
  tryFire() {
    if (this.fireTimer > 0) return null;
    const config = SHIP_TREE[this.shipKey];

    // Check if player is using an elemental weapon (Laser - S1: ice, Laser - S2: fire, Laser - S3: dark)
    if (this.activeWeapon && this.activeWeapon !== 'standard') {
      const currentAmmo = (this.elementalAmmo && this.elementalAmmo[this.activeWeapon]) || 0;
      if (currentAmmo <= 0) {
        // Material empty: auto revert to initial standard laser
        this.activeWeapon = 'standard';
      }
    }

    if (this.activeWeapon && this.activeWeapon !== 'standard' && this.unlockedWeapons && this.unlockedWeapons[this.activeWeapon]) {
      // Deduct 1 elemental crystal material from pool
      if (this.elementalAmmo && this.elementalAmmo[this.activeWeapon] !== undefined) {
        this.elementalAmmo[this.activeWeapon] = Math.max(0, this.elementalAmmo[this.activeWeapon] - 1);
      }
      let energyCost = 14;
      let damage = Math.round(this.stats.fireDamage * 1.30 + 8);
      let fireRate = Math.max(0.12, (this.stats.fireRate || 0.22) * 0.90);
      let laserColor = 0x00f0ff;
      let isHeavy = false;
      let maxRange = (this.stats.fireRange || 600) * 1.10;
      let speedMult = 1.15;

      if (this.activeWeapon === 'ice') {
        energyCost = 14;
        damage = Math.round(this.stats.fireDamage * 1.30 + 8);
        fireRate = Math.max(0.12, (this.stats.fireRate || 0.22) * 0.90);
        laserColor = 0x00f0ff;
        isHeavy = false;
        maxRange = (this.stats.fireRange || 600) * 1.10;
        speedMult = 1.15;
      } else if (this.activeWeapon === 'fire') {
        energyCost = 22;
        damage = Math.round(this.stats.fireDamage * 1.70 + 16);
        fireRate = Math.max(0.14, (this.stats.fireRate || 0.22) * 1.05);
        laserColor = 0xff4500;
        isHeavy = false;
        maxRange = (this.stats.fireRange || 600) * 1.05;
        speedMult = 1.10;
      } else if (this.activeWeapon === 'dark') {
        // High power obsidian-core needle laser with white glow ("karanlık lazer de aynı diğerleri gibi ince olabilir")
        energyCost = 36;
        damage = Math.round(this.stats.fireDamage * 2.85 + 32);
        fireRate = Math.max(0.18, (this.stats.fireRate || 0.22) * 1.35);
        laserColor = 0x111115;
        isHeavy = false;
        maxRange = (this.stats.fireRange || 600) * 1.25;
        speedMult = 1.20;
      }

      if (this.energy <= 0.1) {
        this.isEnergyStarved = true;
      }

      let isEmergencyLowEnergy = false;
      if (this.energy < energyCost * 0.45) {
        if (this.isEnergyStarved && this.energy >= 0.5) {
          isEmergencyLowEnergy = true;
        } else {
          return null;
        }
      }

      const deduction = isEmergencyLowEnergy ? Math.min(this.energy, 4) : energyCost;
      this.energy = Math.max(0, this.energy - deduction);
      if (this.energy <= 0.1) this.isEnergyStarved = true;

      this.fireTimer = this.isEnergyStarved ? Math.max(0.60, fireRate) : fireRate;

      const cosR = Math.cos(this.rotation);
      const sinR = Math.sin(this.rotation);
      const finalLaserSpeed = (this.stats.fireSpeed || 800) * speedMult;
      const baseDmg = isEmergencyLowEnergy ? (damage * 0.65) : damage;

      // User request:
      // - "seviye 3 numaralı gemi giriş lazeri namlulardan atarken diğer skillerdeki lazerleride aynı yerden ateşlemeli"
      // - "seviye 5 teki gemi içinde aynı ve o kadar kalın bir lazer atmasına gerk yok"
      // - "seviye 7 deki gemi içinde aynı çift namlusundan çıkmalı"
      const weaponMounts = (config && config.weapons && config.weapons.length > 0)
        ? config.weapons
        : [{ offset: { x: 0, y: this.radius + 6 }, isHeavy: isHeavy }];

      // Balance damage per mount on multi-nozzle ships (so twin cannons feel powerful without double damage)
      const mountDmg = (weaponMounts.length > 1) ? Math.round(baseDmg * 0.68) : baseDmg;
      const lasers = [];

      for (const w of weaponMounts) {
        const worldX = this.x + (cosR * w.offset.y - sinR * w.offset.x);
        const worldY = this.y + (sinR * w.offset.y + cosR * w.offset.x);
        const laserVx = cosR * finalLaserSpeed + this.vx * 0.3;
        const laserVy = sinR * finalLaserSpeed + this.vy * 0.3;

        const laser = new Laser(
          worldX,
          worldY,
          laserVx,
          laserVy,
          mountDmg,
          w.isHeavy || isHeavy,
          this.id,
          laserColor,
          this.nation,
          maxRange,
          false,
          this.activeWeapon
        );
        lasers.push(laser);
      }
      return lasers;
    }

    // Default Ship Tree Multi-Mount Laser Behavior (Initial Laser)
    // User request: "geminin ilk lazeri daha az enerji harcıyor ama hasarıda diğer 3 kredi lazerden daha az olsun."
    const baseEnergyCost = config.weapons.reduce((sum, w) => sum + w.energyCost, 0);
    const totalCost = Math.max(3, Math.round(baseEnergyCost * 0.50)); // Consumes 50% less energy!
    const isSpeedShip = (config.classType === 'speed');

    // Special Speed Ship Mechanic:
    // "manevra yüksek olanda 3 lü atış enerji biterse ve sıkmayı bırakmaz ise yavaşlayacak ve 2li atışa geçecek."
    let isEmergencyLowEnergy = false;
    let activeWeapons = config.weapons;

    // Check if energy is depleted to 0
    if (this.energy <= 0.1) {
      this.isEnergyStarved = true;
    }

    if (this.energy < totalCost * 0.45) {
      if (isSpeedShip && this.isShooting) {
        // Player continues holding fire on empty reserves: slow down and switch to 2-shot outer wings
        isEmergencyLowEnergy = true;
        this.isExhaustedSpeedStrain = true;
        activeWeapons = [config.weapons[0], config.weapons[config.weapons.length - 1]];
      } else if (this.isEnergyStarved && this.energy >= 0.5) {
        // In starved recovery mode (waiting for 30 energy), allowed 1 throttled shot every 0.60s
        isEmergencyLowEnergy = true;
      } else {
        this.isExhaustedSpeedStrain = false;
        return null; // Not enough energy for normal shot
      }
    } else {
      this.isExhaustedSpeedStrain = false;
    }

    const energyDeduction = isEmergencyLowEnergy ? Math.min(this.energy, 4) : totalCost;
    this.energy = Math.max(0, this.energy - energyDeduction);
    if (this.energy <= 0.1) {
      this.isEnergyStarved = true;
    }

    // Cooldown rate: "tm gemiler için enerji 0a düştüğünde 30 a kadar çıkmadan full seri atış yapamayacaklar 0,60 saniye bir atış yapsınlar."
    if (this.isEnergyStarved) {
      this.fireTimer = Math.max(0.60, this.stats.fireRate);
    } else {
      this.fireTimer = isEmergencyLowEnergy ? (this.stats.fireRate * 1.35) : this.stats.fireRate;
    }

    const lasers = [];
    const cosR = Math.cos(this.rotation);
    const sinR = Math.sin(this.rotation);
    const isHeal = !!this.isHealer;
    // Initial standard laser is strictly neon green per user request: "ilk lazer her zaman yeşil olacak."
    const laserColor = isHeal ? 0x00ff88 : 0x00ff44;

    for (const w of activeWeapons) {
      // Transform local weapon offset to world position
      const worldX = this.x + (cosR * w.offset.y - sinR * w.offset.x);
      const worldY = this.y + (sinR * w.offset.y + cosR * w.offset.x);

      const laserVx = cosR * this.stats.fireSpeed + this.vx * 0.3;
      const laserVy = sinR * this.stats.fireSpeed + this.vy * 0.3;
      // Initial laser damage is tuned to be less than the 3 elemental credit lasers
      let laserDmg = (w.isHeavy ? this.stats.fireDamage * 1.12 : this.stats.fireDamage) * 0.82;
      if (isEmergencyLowEnergy) {
        laserDmg *= 0.72; // Emergency lower damage
      }

      const laser = new Laser(
        worldX,
        worldY,
        laserVx,
        laserVy,
        laserDmg,
        w.isHeavy,
        this.id,
        laserColor,
        this.nation,
        this.stats.fireRange || 600,
        isHeal,
        'standard'
      );
      lasers.push(laser);
    }

    return lasers;
  }
}

// ==========================================
// Real-time Network Remote Player
// ==========================================
class RemotePlayer extends Ship {
  constructor(id, name, shipKey = 'fly', x = 0, y = 0, nation = 'red', scene = null) {
    super(id, name, shipKey, x, y, false, nation, scene);
    this.targetX = x;
    this.targetY = y;
    this.targetVx = 0;
    this.targetVy = 0;
    this.targetRotation = 0;
    this.isRemote = true;
    this.createPlayerNameTag(scene);
  }

  updateInterpolation(dt, worldSize) {
    if (this.isDead) {
      if (this.mesh) this.mesh.visible = false;
      if (this.healthBarGroup) this.healthBarGroup.visible = false;
      if (this.nameSprite) this.nameSprite.visible = false;
      return;
    }

    if (this.mesh) this.mesh.visible = true;
    if (this.nameSprite) this.nameSprite.visible = true;

    // Shortest toroidal path delta
    let dx = this.targetX - this.x;
    let dy = this.targetY - this.y;
    if (worldSize) {
      const half = worldSize / 2;
      while (dx < -half) dx += worldSize;
      while (dx > half) dx -= worldSize;
      while (dy < -half) dy += worldSize;
      while (dy > half) dy -= worldSize;
    }

    // Smooth position interpolation
    const lerpFactor = Math.min(1.0, dt * 18);
    this.x += dx * lerpFactor;
    this.y += dy * lerpFactor;

    if (worldSize) {
      const half = worldSize / 2;
      while (this.x < -half) this.x += worldSize;
      while (this.x > half) this.x -= worldSize;
      while (this.y < -half) this.y += worldSize;
      while (this.y > half) this.y -= worldSize;
    }

    // Angle interpolation (shortest path)
    let diff = (this.targetRotation - this.rotation);
    while (diff < -Math.PI) diff += Math.PI * 2;
    while (diff > Math.PI) diff -= Math.PI * 2;
    this.rotation += diff * lerpFactor;

    // Mesh position & rotation
    if (this.mesh) {
      this.mesh.position.set(this.x, -this.y, 0);
      this.mesh.rotation.z = -this.rotation + Math.PI / 2;
    }

    // Name tag position
    if (this.nameSprite) {
      this.nameSprite.position.set(this.x, -this.y + this.radius + 36, 6);
    }

    // Engine flame (smooth ion light)
    if (this.engineFlame) {
      this.engineFlame.visible = !!this.isThrusting;
      if (this.isThrusting) {
        this.thrustAnimTime = (this.thrustAnimTime || 0) + dt * 10;
        const t = this.thrustAnimTime;
        const lengthPulse = 1.0 + Math.sin(t) * 0.08 + Math.cos(t * 1.6) * 0.04;
        const widthPulse = 0.96 + Math.sin(t * 1.3) * 0.04;
        this.engineFlame.scale.set(widthPulse, widthPulse, lengthPulse);
      }
    }

    if (this.wingTrails) {
      this.wingTrails.visible = !!this.isThrusting;
    }

    // Shield bubble
    if (this.shieldBubble) {
      if (this.spawnShieldTimer > 0) {
        this.shieldBubble.visible = true;
        this.shieldBubble.material.opacity = 0.65;
        this.spawnShieldTimer -= dt;
      } else if (this.shieldDamageFlash > 0) {
        this.shieldBubble.visible = true;
        this.shieldBubble.material.opacity = this.shieldDamageFlash;
        this.shieldDamageFlash -= dt * 2.5;
      } else {
        this.shieldBubble.visible = false;
      }
    }

    this.updateHealthBar();
  }

  destroy(scene) {
    super.destroy(scene);
    if (this.nameSprite && scene) {
      scene.remove(this.nameSprite);
      if (this.nameSprite.material.map) this.nameSprite.material.map.dispose();
      this.nameSprite.material.dispose();
      this.nameSprite = null;
    }
  }
}

// AI Controlled Bot Ship with Smart Tactics
class BotShip extends Ship {
  constructor(id, name, shipKey = 'fly', x = 0, y = 0, nation = 'red', scene = null) {
    super(id, name, shipKey, x, y, false, nation, scene);

    this.state = 'MINING'; // MINING, COMBAT, RETURNING_TO_BASE, DEFENDING_BASE, FLEEING
    this.stateTimer = 0;
    this.targetEntity = null;
    this.autoUpgradeTimer = 1.0;
    this.strafeTimer = 0;
    this.strafeDir = Math.random() > 0.5 ? 1 : -1;
    this.donateTimer = 0;
    this.gemTarget = null;
    this.gemTargetTimer = 0;
    this.ignoredGems = new Map();
  }

  updateAI(dt, asteroids, ships, gems, stations = null) {
    this.stateTimer -= dt;
    this.autoUpgradeTimer -= dt;

    // Special AI for Menu Background Skirmishers (Never flee, never mine, dogfight in camera view)
    if (this.isMenuSkirmish) {
      // Rapid passive shield regen so dogfights last longer and look spectacular
      this.shield = Math.min(this.stats.shieldCap, this.shield + 30 * dt);

      // Keep them centered around (0, 0)
      const distFromCenter = Math.hypot(this.x, this.y);
      if (distFromCenter > 520) {
        // Steer hard back towards center
        const angleToCenter = Math.atan2(-this.y, -this.x);
        this.targetRotation = angleToCenter;
        this.isThrusting = true;
      } else {
        // Find nearest enemy skirmisher
        let nearestEnemy = null;
        let minEnemyDist = 3000;
        for (const s of ships) {
          if (s.isDead || s.nation === this.nation) continue;
          const d = Math.hypot(s.x - this.x, s.y - this.y);
          if (d < minEnemyDist) {
            minEnemyDist = d;
            nearestEnemy = s;
          }
        }

        if (nearestEnemy) {
          const dist = minEnemyDist;
          const laserSpeed = this.stats.fireSpeed || 550;
          const maxRange = this.stats.fireRange || 600;

          // Predictive lead aiming
          const leadTime = Math.min(1.0, dist / Math.max(150, laserSpeed));
          const leadX = nearestEnemy.x + (nearestEnemy.vx || 0) * leadTime;
          const leadY = nearestEnemy.y + (nearestEnemy.vy || 0) * leadTime;
          this.targetRotation = Math.atan2(leadY - this.y, leadX - this.x);

          // Fly towards enemy if distant, circle/strafe if close
          if (dist > 280) {
            this.isThrusting = true;
          } else {
            this.isThrusting = Math.random() > 0.45;
          }

          // Tactical strafing
          this.strafeTimer -= dt;
          if (this.strafeTimer <= 0) {
            this.strafeTimer = 0.8 + Math.random() * 1.5;
            this.strafeDir = Math.random() > 0.5 ? 1 : -1;
          }
          const perpAngle = this.rotation + (Math.PI / 2) * this.strafeDir;
          this.vx += Math.cos(perpAngle) * this.stats.shipSpeed * 0.45 * dt;
          this.vy += Math.sin(perpAngle) * this.stats.shipSpeed * 0.45 * dt;

          // Fire lasers
          let angleDiff = Math.abs(this.targetRotation - this.rotation);
          while (angleDiff > Math.PI) angleDiff = Math.abs(angleDiff - Math.PI * 2);
          this.isShooting = (dist <= maxRange * 1.15 && angleDiff < 0.45);
        } else {
          // Circle center
          this.targetRotation = Math.atan2(-this.y, -this.x);
          this.isThrusting = true;
          this.isShooting = false;
        }
      }
      return; // DO NOT execute mining or base retreat for menu skirmishers!
    }

    // 1. Auto-upgrade stats or evolve when bot has enough crystals
    if (this.autoUpgradeTimer <= 0) {
      this.autoUpgradeTimer = 1.2;
      this.tryAutoUpgrade();
    }

    const homeBase = stations ? stations[this.nation] : null;
    const hasBase = (homeBase && !homeBase.isDead);
    const distToBase = hasBase ? Math.hypot(this.x - homeBase.x, this.y - homeBase.y) : 99999;

    // 2. Base Interaction: Healing & Crystal Donations when docked near friendly base
    if (hasBase && distToBase <= 280) {
      // Heal shield while docked at friendly base
      this.shield = Math.min(this.stats.shieldCap, this.shield + 65 * dt);

      // Auto-donate crystals to upgrade base if cargo is substantial or returning
      this.donateTimer += dt;
      if (this.donateTimer > 0.2 && this.crystals >= 10 && (this.state === 'RETURNING_TO_BASE' || this.crystals >= this.stats.cargoCapacity * 0.7)) {
        this.donateTimer = 0;
        const donateAmt = Math.min(10, this.crystals);
        this.crystals -= donateAmt;
        this.score += donateAmt * 20;
        homeBase.donate(donateAmt);
      }

      // If finished healing & donating, resume active duty
      if (this.state === 'RETURNING_TO_BASE' && this.shield >= this.stats.shieldCap * 0.85 && this.crystals < 10) {
        this.state = 'MINING';
      }
    }

    // 3. High-level Decision Making & State Transitions
    // Check if Home Base is under attack by enemy ships
    let baseAttacker = null;
    if (hasBase) {
      for (const s of ships) {
        if (s.isDead || s.nation === this.nation) continue;
        const d = Math.hypot(s.x - homeBase.x, s.y - homeBase.y);
        if (d < 1000) {
          baseAttacker = s;
          break;
        }
      }
    }
    // Priority A: Defend Base if under threat and reasonably close
    else if (baseAttacker && distToBase < 2800 && this.shield > this.stats.shieldCap * 0.35) {
      this.state = 'DEFENDING_BASE';
      this.targetEntity = baseAttacker;
    }
    // Priority B: Retreat to Base if shield is low
    else if (this.shield < this.stats.shieldCap * 0.30) {
      if (hasBase) {
        this.state = 'RETURNING_TO_BASE';
      } else {
        this.state = 'FLEEING';
      }
    }
    // Priority C: Return to base if cargo is almost full and ship cannot evolve (or high tier)
    else if (hasBase && this.crystals >= this.stats.cargoCapacity * 0.85 && this.state !== 'COMBAT' && this.state !== 'DEFENDING_BASE') {
      const cfg = SHIP_TREE[this.shipKey];
      if (!cfg.evolvesTo || cfg.evolvesTo.length === 0 || cfg.tier >= 3) {
        this.state = 'RETURNING_TO_BASE';
      }
    }
    // Priority D: Healer Support Archetype (Seek and heal injured teammates)
    else if (this.isHealer && this.shield > this.stats.shieldCap * 0.4) {
      let woundedAlly = null;
      let minWoundDist = 1800;
      for (const s of ships) {
        if (s.isDead || s.nation !== this.nation || s.id === this.id) continue;
        if (s.shield < s.stats.shieldCap * 0.8) {
          const d = Math.hypot(s.x - this.x, s.y - this.y);
          if (d < minWoundDist) {
            minWoundDist = d;
            woundedAlly = s;
          }
        }
      }
      if (woundedAlly) {
        this.state = 'SUPPORT';
        this.targetEntity = woundedAlly;
      }
    }
    // Priority E: Combat engagement with nearby enemy ships or enemy stations
    if (this.state !== 'RETURNING_TO_BASE' && this.state !== 'SUPPORT') {
      let nearestEnemy = null;
      const combatEngageRange = Math.max(500, (this.stats.fireRange || 600) * 1.1);
      let minEnemyDist = combatEngageRange;

      for (const s of ships) {
        if (s.isDead || s.nation === this.nation) continue;
        const dist = Math.hypot(s.x - this.x, s.y - this.y);
        if (dist < minEnemyDist) {
          minEnemyDist = dist;
          nearestEnemy = s;
        }
      }

      // If no nearby enemy ship, high tier ships (Tier >= 3) check for enemy bases to siege
      const currentTier = SHIP_TREE[this.shipKey] ? SHIP_TREE[this.shipKey].tier : 1;
      if (!nearestEnemy && currentTier >= 3 && stations) {
        let nearestStation = null;
        let minStationDist = 2200;
        for (const k in stations) {
          const st = stations[k];
          if (!st || st.isDead || st.nation === this.nation) continue;
          const dist = Math.hypot(st.x - this.x, st.y - this.y);
          if (dist < minStationDist) {
            minStationDist = dist;
            nearestStation = st;
          }
        }
        if (nearestStation) {
          nearestEnemy = nearestStation;
        }
      }

      if (nearestEnemy) {
        this.state = 'COMBAT';
        this.targetEntity = nearestEnemy;
      } else if (this.state === 'COMBAT' || this.state === 'DEFENDING_BASE') {
        if (!this.targetEntity || this.targetEntity.isDead) {
          this.state = 'MINING';
          this.targetEntity = null;
        }
      }
    }

    // 4. State Execution
    if (this.state === 'RETURNING_TO_BASE' && hasBase) {
      const dx = homeBase.x - this.x;
      const dy = homeBase.y - this.y;
      this.targetRotation = Math.atan2(dy, dx);
      this.isThrusting = (distToBase > 150);
      this.isShooting = false;
    }
    else if (this.state === 'FLEEING') {
      // Evade away from nearest enemy or center
      let threatX = 0, threatY = 0;
      let minThreatDist = 600;
      for (const s of ships) {
        if (s.isDead || s.nation === this.nation) continue;
        const d = Math.hypot(s.x - this.x, s.y - this.y);
        if (d < minThreatDist) {
          minThreatDist = d;
          threatX = s.x;
          threatY = s.y;
        }
      }
      const awayX = this.x - threatX;
      const awayY = this.y - threatY;
      this.targetRotation = Math.atan2(awayY, awayX);
      this.isThrusting = true;
      this.isShooting = false;

      if (this.shield > this.stats.shieldCap * 0.7) {
        this.state = 'MINING';
      }
    }
    else if (this.state === 'COMBAT' || this.state === 'DEFENDING_BASE') {
      if (!this.targetEntity || this.targetEntity.isDead) {
        this.state = 'MINING';
        this.targetEntity = null;
      } else {
        const dist = Math.hypot(this.targetEntity.x - this.x, this.targetEntity.y - this.y);
        const laserSpeed = this.stats.fireSpeed || 550;
        const maxRange = this.stats.fireRange || 600;

        // Predictive Aiming: lead the target based on its velocity
        const leadTime = Math.min(1.2, dist / Math.max(150, laserSpeed));
        const leadX = this.targetEntity.x + (this.targetEntity.vx || 0) * leadTime;
        const leadY = this.targetEntity.y + (this.targetEntity.vy || 0) * leadTime;
        this.targetRotation = Math.atan2(leadY - this.y, leadX - this.x);

        // Tactical spacing & kiting
        const idealDist = Math.max(160, maxRange * 0.55);
        if (dist > idealDist + 60) {
          this.isThrusting = true;
        } else if (dist < idealDist - 70) {
          this.isThrusting = false;
          // Reverse backpedal
          const backAngle = Math.atan2(this.y - this.targetEntity.y, this.x - this.targetEntity.x);
          this.vx += Math.cos(backAngle) * this.stats.shipSpeed * 0.5 * dt;
          this.vy += Math.sin(backAngle) * this.stats.shipSpeed * 0.5 * dt;
        } else {
          this.isThrusting = false;
        }

        // Tactical strafing (circle/strafe around enemy)
        this.strafeTimer -= dt;
        if (this.strafeTimer <= 0) {
          this.strafeTimer = 1.2 + Math.random() * 2.0;
          this.strafeDir = Math.random() > 0.5 ? 1 : -1;
        }
        const perpAngle = this.rotation + (Math.PI / 2) * this.strafeDir;
        this.vx += Math.cos(perpAngle) * this.stats.shipSpeed * 0.5 * dt;
        this.vy += Math.sin(perpAngle) * this.stats.shipSpeed * 0.5 * dt;

        // Shoot when aligned and within range
        let angleDiff = Math.abs(this.targetRotation - this.rotation);
        while (angleDiff > Math.PI) angleDiff = Math.abs(angleDiff - Math.PI * 2);
        this.isShooting = (dist <= maxRange * 0.95 && angleDiff < 0.42);
      }
    }
    else if (this.state === 'SUPPORT') {
      if (!this.targetEntity || this.targetEntity.isDead || this.targetEntity.shield >= this.targetEntity.stats.shieldCap * 0.98) {
        this.state = 'MINING';
        this.targetEntity = null;
      } else {
        const dist = Math.hypot(this.targetEntity.x - this.x, this.targetEntity.y - this.y);
        const desiredDist = Math.max(140, (this.stats.fireRange || 600) * 0.5);
        const dx = this.targetEntity.x - this.x;
        const dy = this.targetEntity.y - this.y;
        this.targetRotation = Math.atan2(dy, dx);

        if (dist > desiredDist + 40) {
          this.isThrusting = true;
        } else if (dist < desiredDist - 40) {
          this.isThrusting = false;
          this.vx *= 0.93;
          this.vy *= 0.93;
        } else {
          this.isThrusting = false;
        }

        // Aim directly at wounded ally and SHOOT healing lasers to heal them!
        let angleDiff = Math.abs(this.targetRotation - this.rotation);
        while (angleDiff > Math.PI) angleDiff = Math.abs(angleDiff - Math.PI * 2);
        this.isShooting = (dist <= (this.stats.fireRange || 600) * 0.95 && angleDiff < 0.38);
      }
    }
    else { // 'MINING'
      // 1. Check for nearby loose gems ONLY if cargo is not full
      let nearestGem = null;
      const isCargoFull = this.crystals >= this.stats.cargoCapacity;

      if (!isCargoFull) {
        const now = performance.now();
        let minGemDist = 320;
        for (const gem of gems) {
          if (gem.isDead) continue;
          if (this.ignoredGems.has(gem)) {
            if (now < this.ignoredGems.get(gem)) continue;
            else this.ignoredGems.delete(gem);
          }
          const dist = Math.hypot(gem.x - this.x, gem.y - this.y);
          if (dist < minGemDist) {
            minGemDist = dist;
            nearestGem = gem;
          }
        }

        if (nearestGem) {
          if (this.gemTarget === nearestGem) {
            this.gemTargetTimer += dt;
          } else {
            this.gemTarget = nearestGem;
            this.gemTargetTimer = 0;
          }

          // If chasing the same gem for > 2.2 seconds without pickup, give up!
          if (this.gemTargetTimer > 2.2) {
            this.ignoredGems.set(nearestGem, now + 5000);
            this.gemTarget = null;
            this.gemTargetTimer = 0;
            nearestGem = null;
          } else {
            const dx = nearestGem.x - this.x;
            const dy = nearestGem.y - this.y;
            const dist = Math.hypot(dx, dy);
            const targetAngle = Math.atan2(dy, dx);
            this.targetRotation = targetAngle;

            // Prevent centrifugal endless circling when close to gem:
            if (dist < 45) {
              this.rotation = targetAngle; // Align directly towards gem
              this.vx *= 0.88; // Damp velocity
              this.vy *= 0.88;
              this.isThrusting = (dist > 18);
            } else {
              this.isThrusting = true;
            }
            this.isShooting = false;
          }
        } else {
          this.gemTarget = null;
          this.gemTargetTimer = 0;
        }
      } else {
        this.gemTarget = null;
        this.gemTargetTimer = 0;
      }

      if (!nearestGem) {
        // 2. Target nearest asteroid
        if (!this.targetEntity || this.targetEntity.isDead || this.stateTimer <= 0) {
          this.targetEntity = this.findNearestAsteroid(asteroids);
          this.stateTimer = 4.0;
        }

        if (this.targetEntity && !this.targetEntity.isDead) {
          const dx = this.targetEntity.x - this.x;
          const dy = this.targetEntity.y - this.y;
          const dist = Math.hypot(dx, dy);
          this.targetRotation = Math.atan2(dy, dx);

          // Keep firing distance: do not ram into asteroid
          const desiredMin = this.radius + this.targetEntity.radius + 60;
          const desiredMax = Math.min((this.stats.fireRange || 600) * 0.65, desiredMin + 140);

          if (dist > desiredMax) {
            this.isThrusting = true;
          } else if (dist < desiredMin) {
            this.isThrusting = false;
            // Back off slightly from asteroid
            const awayAngle = Math.atan2(this.y - this.targetEntity.y, this.x - this.targetEntity.x);
            this.vx += Math.cos(awayAngle) * 120 * dt;
            this.vy += Math.sin(awayAngle) * 120 * dt;
          } else {
            this.isThrusting = false;
          }

          let angleDiff = Math.abs(this.targetRotation - this.rotation);
          while (angleDiff > Math.PI) angleDiff = Math.abs(angleDiff - Math.PI * 2);
          this.isShooting = (dist < (this.stats.fireRange || 600) * 0.85 && angleDiff < 0.35);
        } else {
          this.isThrusting = false;
          this.isShooting = false;
        }
      }
    }

    // Obstacle avoidance: steer away from collision course with asteroids
    for (const a of asteroids) {
      if (a.isDead) continue;
      const d = Math.hypot(a.x - this.x, a.y - this.y);
      const safePerimeter = this.radius + a.radius + 40;
      if (d < safePerimeter && d > 1) {
        const pushFactor = (1 - d / safePerimeter);
        const pushX = (this.x - a.x) / d;
        const pushY = (this.y - a.y) / d;
        this.vx += pushX * 400 * pushFactor * dt;
        this.vy += pushY * 400 * pushFactor * dt;
      }
    }

    this.update(dt, 10000);
  }

  findNearestAsteroid(asteroids) {
    let nearest = null;
    let minDist = 1800;
    for (const a of asteroids) {
      if (a.isDead) continue;
      const dist = Math.hypot(a.x - this.x, a.y - this.y);
      if (dist < minDist) {
        minDist = dist;
        nearest = a;
      }
    }
    return nearest;
  }

  tryAutoUpgrade() {
    const config = SHIP_TREE[this.shipKey];
    // Evolve as soon as cargo is full
    if (this.crystals >= config.cargoCapacity && config.evolvesTo && config.evolvesTo.length > 0) {
      const nextKey = config.evolvesTo[Math.floor(Math.random() * config.evolvesTo.length)];
      this.evolve(nextKey, this.scene);
      return;
    }

    // Upgrade stats when crystals >= 50, prioritizing combat effectiveness
    const available = UPGRADE_CONFIG.filter(u => this.upgrades[u.id] < u.max && this.crystals >= u.costPerLevel);
    if (available.length > 0) {
      const priorityOrder = ['fireDamage', 'shieldCap', 'fireSpeed', 'energyRegen', 'shipSpeed', 'shieldRegen', 'energyCap', 'shipAgility'];
      let choice = null;
      for (const p of priorityOrder) {
        const found = available.find(u => u.id === p);
        if (found) { choice = found; break; }
      }
      if (!choice) choice = available[0];

      this.crystals -= choice.costPerLevel;
      this.upgrades[choice.id]++;
      this.recomputeStats();
    }
  }
}

// Space Station / Nation Home Base
class SpaceStation extends Entity {
  constructor(nation, x, y, scene) {
    super(x, y, 420, 99999); // Radius adjusted to 420 matching 3.2 scale (1x increase)
    this.nation = nation;
    this.scene = scene;
    this.level = 1;
    this.radius = 450; // Perimeter for docking and healing
    this.hullRadius = 230; // Physical structure collision radius ("rakibin istasyonuna vurunca istasyon objesine vuruşu hissettirmeli")
    this.shudder = 0; // Visual impact shudder timer
    this.maxHp = 100000; // Level 1 HP: 100k
    this.hp = 100000;
    this.shieldRegenRate = 45; // 45 HP/sec passive shield repair
    this.crystalsDonated = 0;
    this.crystalsRequired = 100;
    this.turretTimer = 0;
    this.rotationSpeed = 0.25;
    this.shieldFlashTimer = 0;

    this.mesh = ModelBuilder.createStationMesh(nation, this.level);
    // Station sits at Z = -150 so player ship flying at Z = 0 is always rendered on top of the entire base
    this.mesh.position.set(x, -y, -150);
    this.stationBody = this.mesh.getObjectByName('stationBody');
    this.rotatingRing = this.mesh.getObjectByName('rotatingRing');
    this.shieldMesh = this.mesh.getObjectByName('stationShield');

    if (scene) {
      scene.add(this.mesh);
    }
  }

  donate(amount) {
    this.crystalsDonated += amount;
    this.hp = Math.min(this.maxHp, this.hp + amount * 30);

    let leveledUp = false;
    if (this.crystalsDonated >= this.crystalsRequired && this.level < 5) {
      this.level++;
      this.maxHp = this.level * 100000; // Each level increases HP by 100k (Lv1=100k up to Lv5=500k)
      this.hp = this.maxHp;
      this.crystalsDonated = 0;
      this.crystalsRequired = Math.round(this.crystalsRequired * 2.2);
      leveledUp = true;

      // Preserve current continuous rotation angles so upgrade doesn't jump or change angle
      const currentBodyRotZ = this.stationBody ? this.stationBody.rotation.z : 0;
      const currentRingRotX = this.rotatingRing ? this.rotatingRing.rotation.x : 0;

      // Rebuild 3D mesh for upgraded station (radius & scale remain constant: "istasyon lwl alınca büyümesine gerek yok")
      if (this.scene && this.mesh) {
        this.scene.remove(this.mesh);
      }
      this.mesh = ModelBuilder.createStationMesh(this.nation, this.level);
      this.mesh.position.set(this.x, -this.y, -150);
      this.stationBody = this.mesh.getObjectByName('stationBody');
      this.rotatingRing = this.mesh.getObjectByName('rotatingRing');
      this.shieldMesh = this.mesh.getObjectByName('stationShield');
      if (this.stationBody) this.stationBody.rotation.z = currentBodyRotZ;
      if (this.rotatingRing) this.rotatingRing.rotation.x = currentRingRotX;
      if (this.scene) {
        this.scene.add(this.mesh);
      }
    }

    return { leveledUp, newLevel: this.level };
  }

  takeDamage(amount) {
    this.hp -= amount;
    this.shudder = 0.22; // Physical shudder feedback on impact
    if (this.shieldMesh) {
      this.shieldMesh.material.opacity = 0.55;
      this.shieldFlashTimer = 0.18;
    }
    if (this.hp <= 0) {
      this.hp = 0;
      this.isDead = true;
      return true; // Station destroyed
    }
    return false;
  }

  update(dt, enemyShips, onFireTurret) {
    if (this.isDead) return;

    // Smooth, seamless endless orbital rotation of the station body
    if (this.stationBody) {
      this.stationBody.rotation.z = (this.stationBody.rotation.z + 0.035 * dt) % (Math.PI * 2);
    }

    // Rotate communications radar & sensor array around boom axis
    if (this.rotatingRing) {
      this.rotatingRing.rotation.x = (this.rotatingRing.rotation.x + this.rotationSpeed * dt) % (Math.PI * 2);
    }

    // Apply tactile impact shudder
    let shudderX = 0;
    let shudderY = 0;
    if (this.shudder > 0) {
      this.shudder -= dt;
      shudderX = (Math.random() - 0.5) * 8 * (this.shudder / 0.22);
      shudderY = (Math.random() - 0.5) * 8 * (this.shudder / 0.22);
    }
    if (this.mesh) {
      this.mesh.position.set(this.x + shudderX, -this.y + shudderY, -150);
    }

    // Passive base shield / hull regeneration
    if (this.hp < this.maxHp) {
      this.hp = Math.min(this.maxHp, this.hp + this.shieldRegenRate * dt);
    }

    if (this.shieldFlashTimer > 0) {
      this.shieldFlashTimer -= dt;
      if (this.shieldFlashTimer <= 0 && this.shieldMesh) {
        this.shieldMesh.material.opacity = 0.14;
      }
    }

    // Auto-turret defense: shoot at nearest enemy within perimeter (range 2200 for 4x base)
    this.turretTimer -= dt;
    if (this.turretTimer <= 0) {
      let target = null;
      let minDist = 2200;
      for (const s of enemyShips) {
        if (s.isDead || s.nation === this.nation) continue;
        const d = Math.hypot(s.x - this.x, s.y - this.y);
        if (d < minDist) {
          minDist = d;
          target = s;
        }
      }

      if (target) {
        this.turretTimer = 0.42;
        const dx = target.x - this.x;
        const dy = target.y - this.y;
        const angle = Math.atan2(dy, dx);
        const vx = Math.cos(angle) * 850;
        const vy = Math.sin(angle) * 850;

        const laserColor = NATIONS[this.nation] ? NATIONS[this.nation].laserColor : 0x00f0ff;
        const laser = new Laser(
          this.x,
          this.y,
          vx,
          vy,
          20 + this.level * 8,
          true,
          `base-${this.nation}`,
          laserColor,
          this.nation,
          1800
        );
        if (onFireTurret) onFireTurret(laser);
      }
    }
  }
}

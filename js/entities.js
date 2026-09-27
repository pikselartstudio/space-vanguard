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

    // World boundary bounce
    const limit = worldSize / 2 - this.radius;
    if (this.x < -limit) { this.x = -limit; this.vx *= -0.7; }
    if (this.x > limit) { this.x = limit; this.vx *= -0.7; }
    if (this.y < -limit) { this.y = -limit; this.vy *= -0.7; }
    if (this.y > limit) { this.y = limit; this.vy *= -0.7; }

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
  constructor(x, y, vx, vy, damage, isHeavy, ownerId, color = 0x00f0ff, nation = 'blue', maxRange = 600, isHealBeam = false) {
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
    const speed = Math.hypot(vx, vy);
    this.lifetime = speed > 0 ? (this.maxRange / speed) * 1.08 : 1.5;
    this.rotation = Math.atan2(vy, vx);

    this.mesh = ModelBuilder.createLaserMesh(isHeavy, color, damage);
    this.mesh.position.set(x, -y, 1);
    this.mesh.rotation.z = -this.rotation + Math.PI / 2;
  }

  update(dt, worldSize) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.lifetime -= dt;

    const distTravelled = Math.hypot(this.x - this.startX, this.y - this.startY);
    if (this.lifetime <= 0 || distTravelled >= this.maxRange) {
      this.isDead = true;
    }

    // Border check
    const limit = worldSize / 2;
    if (Math.abs(this.x) > limit || Math.abs(this.y) > limit) {
      this.isDead = true;
    }

    if (this.mesh) {
      this.mesh.position.set(this.x, -this.y, 1);
    }
  }
}

// Gem / Crystal dropped from asteroids & destroyed ships
class Gem extends Entity {
  constructor(x, y, value = 1) {
    super(x, y, value > 5 ? 10 : 7, 0.5);
    this.value = value;
    // Gentle radial dispersal burst
    const angle = Math.random() * Math.PI * 2;
    const burstSpeed = 35 + Math.random() * 45;
    this.vx = Math.cos(angle) * burstSpeed;
    this.vy = Math.sin(angle) * burstSpeed;
    this.drag = 0.95;
    this.mesh = ModelBuilder.createGemMesh(value);
    this.mesh.position.set(x, -y, 0);
    this.rotSpeedX = (Math.random() - 0.5) * 3;
    this.rotSpeedY = (Math.random() - 0.5) * 3;
  }

  update(dt, worldSize, ships) {
    // Local proximity magnet: only activates if a ship is very close (within 18 units of ship hull)
    let magnetShip = null;
    let minHullDist = 18;

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
  constructor(x, y, sizeTier = 1) {
    const tier = Math.max(1, Math.min(7, sizeTier));
    // Size 1 (radius 13) to Size 7 (radius 64)
    const radius = 13 + (tier - 1) * 8.5;
    const mass = 1.5 + tier * 2.5;
    super(x, y, radius, mass);

    this.sizeTier = tier;

    // Proportional health from tier 1 (16 HP) to tier 7 (1650 HP)
    const healths = [0, 16, 42, 105, 230, 460, 920, 1650];
    this.maxHealth = healths[tier] || (tier * 220);
    this.health = this.maxHealth;

    // Yield configuration (Tier 1 drops strictly 1-3 crystals, scaling proportionally up to Tier 7)
    const tierYields = [
      null,
      { min: 1, max: 3, valMult: 1.0 },   // Tier 1: 1 - 3 crystals
      { min: 3, max: 6, valMult: 1.4 },   // Tier 2: 4 - 8 crystals
      { min: 6, max: 11, valMult: 1.8 },  // Tier 3: 11 - 20 crystals
      { min: 11, max: 18, valMult: 2.2 }, // Tier 4: 24 - 40 crystals
      { min: 18, max: 28, valMult: 2.5 }, // Tier 5: 45 - 70 crystals
      { min: 28, max: 42, valMult: 2.8 }, // Tier 6: 78 - 118 crystals
      { min: 42, max: 60, valMult: 3.2 }  // Tier 7: 135 - 192 crystals
    ];
    const yCfg = tierYields[tier] || tierYields[1];
    this.crystalCount = Math.floor(Math.random() * (yCfg.max - yCfg.min + 1)) + yCfg.min;
    this.crystalTotalValue = Math.round(this.crystalCount * yCfg.valMult);

    // Completely stationary (no movement across space)
    this.vx = 0;
    this.vy = 0;

    // Track damage dealt by each player / bot (highest damager gets the drops!)
    this.damageLog = {};

    this.mesh = ModelBuilder.createAsteroidMesh(radius, tier);
    this.mesh.position.set(x, -y, 0);

    this.rotSpeed = {
      x: (Math.random() - 0.5) * 0.3,
      y: (Math.random() - 0.5) * 0.3,
      z: (Math.random() - 0.5) * 0.3
    };
  }

  takeDamage(dmg, attackerId = null) {
    if (attackerId) {
      this.damageLog[attackerId] = (this.damageLog[attackerId] || 0) + dmg;
    }
    this.health -= dmg;
    if (this.health <= 0) {
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
    // Asteroid stays stationary at its fixed coordinates
    this.vx = 0;
    this.vy = 0;
    if (this.mesh) {
      this.mesh.position.set(this.x, -this.y, 0);
      this.mesh.rotation.x += this.rotSpeed.x * dt;
      this.mesh.rotation.y += this.rotSpeed.y * dt;
      this.mesh.rotation.z += this.rotSpeed.z * dt;
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
    this.laserColor = nationCfg.laserColor;

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
    this.rcsEnabled = true; // Reaction Control System (auto-damping)

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

    if (this.mesh) {
      this.mesh.position.set(this.x, -this.y, 0);
      this.mesh.rotation.z = -this.rotation + Math.PI / 2;
    }

    if (this.scene) {
      this.createHealthBar(this.scene);
    }
  }

  recomputeStats() {
    const config = SHIP_TREE[this.shipKey];
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
    if (this.mesh) {
      this.mesh.position.set(this.x, -this.y, 0);
      this.mesh.rotation.z = -this.rotation + Math.PI / 2;
    }
    if (activeScene) {
      activeScene.add(this.mesh);
    }
  }

  takeDamage(amount) {
    if (this.spawnShieldTimer > 0) {
      return false; // Invulnerable during spawn base protection
    }

    this.shield -= amount;
    this.shieldDamageFlash = 0.2; // Show shield bubble for 200ms

    if (this.shield <= 0) {
      this.shield = 0;
      this.isDead = true;
      return true;
    }
    return false;
  }

  update(dt, worldSize) {
    // Rotate towards target rotation with agility limit
    let angleDiff = this.targetRotation - this.rotation;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;

    const maxTurn = this.stats.shipAgility * dt;
    if (Math.abs(angleDiff) < maxTurn) {
      this.rotation = this.targetRotation;
    } else {
      this.rotation += Math.sign(angleDiff) * maxTurn;
    }

    // Reset speed strain if not shooting
    if (!this.isShooting) {
      this.isExhaustedSpeedStrain = false;
    }

    // Special speed penalty if straining empty energy reserves on speed ship ("enerji biterse ve sıkmayı bırakmaz ise yavaşlayacak")
    const speedPenalty = this.isExhaustedSpeedStrain ? 0.55 : 1.0;

    // Thrust acceleration
    if (this.isThrusting) {
      const accel = this.stats.shipSpeed * 2.2 * speedPenalty;
      this.vx += Math.cos(this.rotation) * accel * dt;
      this.vy += Math.sin(this.rotation) * accel * dt;
    }

    // Speed clamping
    const maxAllowedSpeed = this.stats.shipSpeed * speedPenalty;
    const currentSpeed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    if (currentSpeed > maxAllowedSpeed) {
      this.vx = (this.vx / currentSpeed) * maxAllowedSpeed;
      this.vy = (this.vy / currentSpeed) * maxAllowedSpeed;
    }

    // RCS Damping (Starblast physics)
    if (this.rcsEnabled && !this.isThrusting) {
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
    // If energy drops to 0 (<= 0.1), enters starved state. Must reach at least 30 energy to resume full rapid-fire.
    if (this.energy <= 0.1) {
      this.isEnergyStarved = true;
    } else if (this.isEnergyStarved && this.energy >= 30) {
      this.isEnergyStarved = false;
    }

    if (this.fireTimer > 0) this.fireTimer -= dt;

    // Visual updates (engine flames & shield pulse)
    if (this.engineFlame) {
      this.engineFlame.visible = this.isThrusting;
      if (this.isThrusting) {
        const flamePulse = 0.8 + Math.random() * 0.4;
        this.engineFlame.scale.set(flamePulse, flamePulse, flamePulse);
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

    super.update(dt, worldSize);
    this.updateHealthBar();
  }

  createHealthBar(scene) {
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
    if (this.isMenuSkirmish || (window.game && window.game.isMenuBattle)) {
      if (this.healthBarGroup) this.healthBarGroup.visible = false;
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
    if (this.healthBarGroup && activeScene) {
      activeScene.remove(this.healthBarGroup);
      this.healthBarGroup = null;
    }
    super.destroy(activeScene);
  }

  // Shoot lasers from ship's weapon mounts
  tryFire() {
    if (this.fireTimer > 0) return null;
    const config = SHIP_TREE[this.shipKey];
    
    // Check total energy cost
    const totalCost = config.weapons.reduce((sum, w) => sum + w.energyCost, 0);
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
    const laserColor = isHeal ? 0x00ff88 : (this.laserColor || 0x00f0ff);

    for (const w of activeWeapons) {
      // Transform local weapon offset to world position
      const worldX = this.x + (cosR * w.offset.y - sinR * w.offset.x);
      const worldY = this.y + (sinR * w.offset.y + cosR * w.offset.x);

      const laserVx = cosR * this.stats.fireSpeed + this.vx * 0.3;
      const laserVy = sinR * this.stats.fireSpeed + this.vy * 0.3;
      let laserDmg = w.isHeavy ? this.stats.fireDamage * 1.35 : this.stats.fireDamage;
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
        isHeal
      );
      lasers.push(laser);
    }

    return lasers;
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
    super(x, y, 140, 99999);
    this.nation = nation;
    this.scene = scene;
    this.level = 1;
    this.maxHp = 25000; // Heavily fortified base
    this.hp = 25000;
    this.shieldRegenRate = 45; // 45 HP/sec passive shield repair
    this.crystalsDonated = 0;
    this.crystalsRequired = 100;
    this.turretTimer = 0;
    this.rotationSpeed = 0.25;
    this.shieldFlashTimer = 0;

    this.mesh = ModelBuilder.createStationMesh(nation, this.level);
    this.mesh.position.set(x, -y, 0);
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
      this.maxHp += 15000;
      this.hp = this.maxHp;
      this.crystalsDonated = 0;
      this.crystalsRequired = Math.round(this.crystalsRequired * 2.2);
      leveledUp = true;

      // Rebuild 3D mesh for upgraded station
      if (this.scene && this.mesh) {
        this.scene.remove(this.mesh);
      }
      this.mesh = ModelBuilder.createStationMesh(this.nation, this.level);
      this.mesh.position.set(this.x, -this.y, 0);
      this.rotatingRing = this.mesh.getObjectByName('rotatingRing');
      this.shieldMesh = this.mesh.getObjectByName('stationShield');
      if (this.scene) {
        this.scene.add(this.mesh);
      }
    }

    return { leveledUp, newLevel: this.level };
  }

  takeDamage(amount) {
    this.hp -= amount;
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

    // Rotate station ring
    if (this.rotatingRing) {
      this.rotatingRing.rotation.z += this.rotationSpeed * dt;
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

    // Auto-turret defense: shoot at nearest enemy within perimeter (range 850)
    this.turretTimer -= dt;
    if (this.turretTimer <= 0) {
      let target = null;
      let minDist = 850;
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
        const vx = Math.cos(angle) * 750;
        const vy = Math.sin(angle) * 750;

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
          900
        );
        if (onFireTurret) onFireTurret(laser);
      }
    }
  }
}

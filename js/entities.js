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
  static getSharedGeometry() {
    if (!Particle._sharedGeo) {
      Particle._sharedGeo = new THREE.PlaneGeometry(1, 1);
    }
    return Particle._sharedGeo;
  }

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

    const mat = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 1.0,
      depthWrite: false
    });
    this.mesh = new THREE.Mesh(Particle.getSharedGeometry(), mat);
    this.mesh.scale.set(size, size, 1);
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

    const lifeRatio = Math.max(0, this.lifetime / this.maxLife);
    this.mesh.position.set(this.x, -this.y, 2);
    if (this.mesh.material) {
      this.mesh.material.opacity = lifeRatio;
    }
    const currentScale = this.size * lifeRatio;
    this.mesh.scale.set(currentScale, currentScale, 1);
  }

  destroy(scene) {
    this.isDead = true;
    if (this.mesh) {
      if (scene) scene.remove(this.mesh);
      if (this.mesh.material) {
        this.mesh.material.dispose();
      }
      this.mesh = null;
    }
  }
}

// User request: Animated Pixel-Art VFX Asteroid Explosion using custom PNG sprite
class AsteroidExplosionVFX {
  static getSharedGeometry() {
    if (!AsteroidExplosionVFX._sharedGeo) {
      AsteroidExplosionVFX._sharedGeo = new THREE.PlaneGeometry(1, 1);
    }
    return AsteroidExplosionVFX._sharedGeo;
  }

  static getTexture() {
    if (!AsteroidExplosionVFX._texture) {
      const loader = new THREE.TextureLoader();
      AsteroidExplosionVFX._texture = loader.load(AsteroidExplosionVFX.IMAGE_DATA_URI);
      AsteroidExplosionVFX._texture.generateMipmaps = true;
      AsteroidExplosionVFX._texture.magFilter = THREE.NearestFilter; // Keep pixel-art fidelity razor sharp
      AsteroidExplosionVFX._texture.minFilter = THREE.LinearMipmapLinearFilter;
    }
    return AsteroidExplosionVFX._texture;
  }

  constructor(x, y, radius = 30) {
    this.x = x;
    this.y = y;
    this.radius = Math.max(16, radius);
    this.baseSize = this.radius * 3.4; // Bold presence over asteroid footprint
    this.lifetime = 0.52; // 520ms animation
    this.maxLife = this.lifetime;
    this.elapsed = 0;
    this.isDead = false;

    this.group = new THREE.Group();
    this.group.position.set(x, -y, 2.5);

    // Random initial angle & rotation speed
    const startAngle = Math.random() * Math.PI * 2;
    this.rotSpeed = (Math.random() - 0.5) * 1.8;

    // 1. Initial Flash Core (bright white-hot epicenter flash)
    const flashGeo = new THREE.CircleGeometry(this.baseSize * 0.45, 16);
    this.flashMat = new THREE.MeshBasicMaterial({
      color: 0xffeedd,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    this.flashMesh = new THREE.Mesh(flashGeo, this.flashMat);
    this.flashMesh.position.z = 0.4;
    this.group.add(this.flashMesh);

    // 2. Expanding Shockwave Plasma Ring
    const ringGeo = new THREE.RingGeometry(this.baseSize * 0.28, this.baseSize * 0.35, 24);
    this.ringMat = new THREE.MeshBasicMaterial({
      color: 0xff8811,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    this.ringMesh = new THREE.Mesh(ringGeo, this.ringMat);
    this.ringMesh.position.z = -0.1;
    this.group.add(this.ringMesh);

    // 3. Main Pixel-Art Explosion Sprite (The custom user PNG)
    const tex = AsteroidExplosionVFX.getTexture();
    this.mainMat = new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      opacity: 1.0,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    this.mainSprite = new THREE.Mesh(AsteroidExplosionVFX.getSharedGeometry(), this.mainMat);
    this.mainSprite.rotation.z = startAngle;
    this.mainSprite.scale.set(this.baseSize * 0.2, this.baseSize * 0.2, 1);
    this.group.add(this.mainSprite);

    // 4. Secondary Counter-Rotating Fireball Core (Adds 3D depth and organic blast feel)
    this.coreMat = new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
      color: new THREE.Color(0xffaa22),
      depthWrite: false,
      side: THREE.DoubleSide
    });
    this.coreSprite = new THREE.Mesh(AsteroidExplosionVFX.getSharedGeometry(), this.coreMat);
    this.coreSprite.rotation.z = -startAngle;
    this.coreSprite.position.z = 0.2;
    this.coreSprite.scale.set(this.baseSize * 0.15, this.baseSize * 0.15, 1);
    this.group.add(this.coreSprite);
  }

  update(dt) {
    this.elapsed += dt;
    this.lifetime -= dt;
    if (this.lifetime <= 0) {
      this.isDead = true;
      return;
    }

    const progress = Math.min(1.0, this.elapsed / this.maxLife);

    // A. Main Sprite Animation (Fast explosive burst then smooth dissolve)
    if (progress < 0.24) {
      // Rapid expansion pop
      const t = progress / 0.24;
      const scaleProg = 1 + 2.0 * Math.pow(t - 1, 3) + 1.2 * Math.pow(t - 1, 2);
      const s = this.baseSize * (0.2 + 0.95 * Math.max(0, scaleProg));
      this.mainSprite.scale.set(s, s, 1);
    } else {
      // Subtle expansion continuation + dissolve
      const t = (progress - 0.24) / 0.76;
      const s = this.baseSize * (1.15 + 0.25 * Math.sin(t * Math.PI * 0.5));
      this.mainSprite.scale.set(s, s, 1);
    }

    this.mainSprite.rotation.z += this.rotSpeed * dt;

    // Opacity fade
    if (progress < 0.45) {
      this.mainMat.opacity = 1.0;
    } else {
      const fadeT = (progress - 0.45) / 0.55;
      this.mainMat.opacity = Math.max(0, 1.0 - fadeT * fadeT);
    }

    // B. Core Sprite (Additive hot center, counter-rotates)
    const coreS = (this.baseSize * 0.75) * (0.2 + 0.9 * Math.min(1.0, progress * 3.5));
    this.coreSprite.scale.set(coreS, coreS, 1);
    this.coreSprite.rotation.z -= this.rotSpeed * 1.5 * dt;
    this.coreMat.opacity = Math.max(0, (1.0 - progress) * 0.85);

    // C. Initial Flash (first 100ms)
    if (progress < 0.18) {
      const fp = progress / 0.18;
      this.flashMat.opacity = (1.0 - fp) * 0.95;
      const fs = 1.0 + fp * 1.5;
      this.flashMesh.scale.set(fs, fs, 1);
    } else if (this.flashMesh.visible) {
      this.flashMesh.visible = false;
    }

    // D. Shockwave Ring (expands rapidly in first 300ms)
    if (progress < 0.55) {
      const rp = progress / 0.55;
      const rs = 1.0 + Math.sin(rp * Math.PI * 0.5) * 2.8;
      this.ringMesh.scale.set(rs, rs, 1);
      this.ringMat.opacity = Math.max(0, (1.0 - rp) * 0.85);
    } else if (this.ringMesh.visible) {
      this.ringMesh.visible = false;
    }
  }

  destroy(scene) {
    this.isDead = true;
    if (this.group) {
      if (scene) scene.remove(this.group);
      if (this.mainMat) this.mainMat.dispose();
      if (this.coreMat) this.coreMat.dispose();
      if (this.flashMat) this.flashMat.dispose();
      if (this.ringMat) this.ringMat.dispose();
      if (this.flashMesh && this.flashMesh.geometry) this.flashMesh.geometry.dispose();
      if (this.ringMesh && this.ringMesh.geometry) this.ringMesh.geometry.dispose();
      this.group = null;
    }
  }
}
AsteroidExplosionVFX.IMAGE_DATA_URI = 'data:image/png;base64,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';


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

    if (worldSize && worldSize > 0) {
      const half = worldSize * 0.5;
      if (this.x < -half) this.x += worldSize;
      else if (this.x > half) this.x -= worldSize;
      if (this.y < -half) this.y += worldSize;
      else if (this.y > half) this.y -= worldSize;
    }

    if (this.lifetime <= 0) {
      this.isDead = true;
    }

    if (this.mesh) {
      this.mesh.position.set(this.x, -this.y, 1);
    }
  }

  destroy(scene) {
    this.isDead = true;
    if (this.mesh) {
      if (scene) scene.remove(this.mesh);
      this.mesh = null;
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

  update(dt, worldSize, ships, camLogicalX = null, camLogicalY = null) {
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
      let dx = magnetShip.x - this.x;
      let dy = magnetShip.y - this.y;
      if (worldSize > 0) {
        dx -= Math.round(dx / worldSize) * worldSize;
        dy -= Math.round(dy / worldSize) * worldSize;
      }
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

    if (worldSize > 0) {
      const half = worldSize * 0.5;
      if (this.x < -half) this.x += worldSize;
      else if (this.x > half) this.x -= worldSize;
      if (this.y < -half) this.y += worldSize;
      else if (this.y > half) this.y -= worldSize;
    }

    if (this.mesh) {
      let renderX = this.x;
      let renderY = -this.y;
      if (camLogicalX !== null && camLogicalY !== null && worldSize > 0) {
        let cdx = this.x - camLogicalX;
        let cdy = this.y - camLogicalY;
        cdx -= Math.round(cdx / worldSize) * worldSize;
        cdy -= Math.round(cdy / worldSize) * worldSize;
        renderX = camLogicalX + cdx;
        renderY = -(camLogicalY + cdy);
      }
      this.mesh.position.set(renderX, renderY, 0);
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

  update(dt, worldSize, camLogicalX = null, camLogicalY = null) {
    // Asteroid stays strictly stationary at its fixed coordinates
    this.vx = 0;
    this.vy = 0;

    if (this.mesh) {
      let renderX = this.x;
      let renderY = -this.y;

      // Toroidal camera wrapping: seamlessly renders asteroids right across the map seam
      if (camLogicalX !== null && camLogicalY !== null && worldSize > 0) {
        let dx = this.x - camLogicalX;
        let dy = this.y - camLogicalY;
        dx -= Math.round(dx / worldSize) * worldSize;
        dy -= Math.round(dy / worldSize) * worldSize;

        renderX = camLogicalX + dx;
        renderY = -(camLogicalY + dy);
      }

      this.mesh.position.set(renderX, renderY, 0);
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
              if (Math.abs(rp.x - this.x) > minDist || Math.abs(rp.y - this.y) > minDist) continue;
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
          const laserColor = 0xff2244; // Independent high-energy Crimson plasma bolt
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
        this.mesh.rotation.z += dt * 1.2;
        const outerRing = this.mesh.getObjectByName('defenseOuterRing');
        const innerRing = this.mesh.getObjectByName('defenseInnerRing');
        if (outerRing) outerRing.rotation.z += dt * 2.8;
        if (innerRing) innerRing.rotation.y += dt * 3.6;
      }
    } else if (this.type === 'mining') {
      // User request: "maden dronu ben ateş ettiğim asteroite atak yapacak atak yapmadığım durumda saldırı yapmayacak"
      this.fireTimer -= dt;
      if (this.fireTimer <= 0 && game) {
        const targetAst = parentShip.lastTargetAsteroid;
        const now = (typeof performance !== 'undefined') ? performance.now() : Date.now();
        const isRecent = parentShip.lastTargetAsteroidTime && (now - parentShip.lastTargetAsteroidTime < 3500);

        if (targetAst && !targetAst.isDead && isRecent) {
          if (Math.abs(targetAst.x - this.x) <= 520 && Math.abs(targetAst.y - this.y) <= 520) {
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
    ctx.font = 'bold 40px "Orbitron", "Share Tech Mono", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Dark solid outline for maximum clarity against deep space & bright stars
    ctx.strokeStyle = 'rgba(0, 5, 12, 0.95)';
    ctx.lineWidth = 8;
    ctx.strokeText(this.name || 'PILOT', 256, 64);

    // Nation glow
    ctx.shadowColor = nationColor;
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(this.name || 'PILOT', 256, 64);

    const texture = new THREE.CanvasTexture(canvas);
    const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false });
    this.nameSprite = new THREE.Sprite(spriteMat);
    // User request: fontu birazcık daha küçültelim (150, 37.5 -> 118, 29.5)
    this.nameSprite.scale.set(118, 29.5, 1);
    this.nameSprite.position.set(this.x, -this.y + this.radius + 34, 6);
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

    // User request: "kalkan göstergesini 1-2px büyültelim" (height: 4.5 -> 6.2, fill: 3.2 -> 4.6)
    // Background dark bar
    const bgGeo = new THREE.PlaneGeometry(42, 6.2);
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
    const fillGeo = new THREE.PlaneGeometry(40, 4.6);
    fillGeo.translate(20, 0, 0); // Translate origin to left edge for clean scale.x
    this.healthFillMat = new THREE.MeshBasicMaterial({
      color: 0x00e676,
      depthWrite: false
    });
    this.healthFillMesh = new THREE.Mesh(fillGeo, this.healthFillMat);
    this.healthFillMesh.position.set(-20, 0, 0.1);
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
      this.nameSprite.position.set(this.x, -this.y + this.radius + 34, 6);
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
  }
}

/**
 * ============================================================================
 * SPACE UNIVERSE MODULE (js/universe/space-universe.js)
 * Dedicated, isolated, high-performance cosmic background system.
 * Features:
 * - Multi-tier large luminous starfields (bold, radiant celestial bodies)
 * - Calm, serene deep-space parallax drift (non-jarring, cinematic flight)
 * - Volumetric colored nebulae and twinkling cross-flare stars
 * - Peaceful in-game flight dust motes and sporadic meteors
 * ============================================================================
 */

class SpaceUniverse {
  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;

    // Master universe group for clean scene graph management
    this.universeGroup = new THREE.Group();
    this.scene.add(this.universeGroup);

    // Sub-groups
    this.nebulaGroup = new THREE.Group();
    this.starfieldGroup = new THREE.Group();
    this.bgAsteroidsGroup = new THREE.Group();
    this.flightDustGroup = new THREE.Group();
    this.shootingStars = [];

    this.universeGroup.add(this.nebulaGroup);
    this.universeGroup.add(this.starfieldGroup);
    this.universeGroup.add(this.bgAsteroidsGroup);
    this.universeGroup.add(this.flightDustGroup);

    // Active mode: 'menu' or 'game'
    this.mode = 'menu';

    // Animation timers
    this.elapsedTime = 0;
    this.menuScrollY = 0;
    this.shootingStarTimer = 2.5;

    // Flight dust parameters (calm, serene speed motes)
    this.flightDustCount = 380;
    this.flightDustGeo = null;
    this.flightDustPositions = null;

    // Background asteroids array
    this.bgAsteroids = [];
  }

  init() {
    this.createMultiTierStarfield();
    this.createVolumetricNebulae();
    this.createTwinklingFlareStars();
    this.createBackgroundAsteroids();
    this.createFlightDust();
  }

  // =========================================================================
  // =========================================================================
  // 1. VOLUMETRIC NEBULA CLOUDS (BALANCED COSMIC ROSE & DEEP VIOLET VEILS)
  // Deep space gaseous mist providing soft, elegant atmospheric depth
  // =========================================================================
  createVolumetricNebulae() {
    const nebulaCanvas = document.createElement('canvas');
    nebulaCanvas.width = 256;
    nebulaCanvas.height = 256;
    const nctx = nebulaCanvas.getContext('2d');
    const nGrad = nctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    nGrad.addColorStop(0, 'rgba(255, 245, 252, 0.85)');    // Soft luminous core
    nGrad.addColorStop(0.28, 'rgba(225, 125, 175, 0.38)'); // Softened cosmic rose halo (half-step down)
    nGrad.addColorStop(0.60, 'rgba(155, 50, 180, 0.20)');  // Deep magenta cosmic mist
    nGrad.addColorStop(0.82, 'rgba(80, 25, 145, 0.08)');   // Subtle violet outer veil
    nGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    nctx.fillStyle = nGrad;
    nctx.fillRect(0, 0, 256, 256);
    const nebulaCloudTex = new THREE.CanvasTexture(nebulaCanvas);

    this.nebulaClouds = [];
    // Balanced palette: classy cosmic rose & fuchsia highlights blended with deep cosmic indigos and purples
    const cloudColors = [
      0xbe185d, // Soft Cosmic Rose
      0xa21caf, // Balanced Fuchsia
      0x4338ca, // Deep Cosmic Indigo
      0xdb2777, // Rose Pink
      0x6b21a8, // Deep Royal Purple
      0x9d174d, // Carmine Pink
      0x312e81, // Midnight Indigo
      0x86198f, // Deep Wine / Violet
      0x581c87, // Dark Plum
      0x701a75, // Velvet Magenta
      0x1e1b4b, // Deep Space Navy
      0x9333ea, // Vivid Purple
      0x831843, // Cosmic Velvet Rose
      0x3b0764, // Dark Violet
      0xd946ef, // Soft Fuchsia
      0x1e293b  // Cool Slate Blue
    ];

    const totalClouds = cloudColors.length * 2; // 32 clouds across galaxy
    for (let i = 0; i < totalClouds; i++) {
      const color = cloudColors[i % cloudColors.length];
      const cMat = new THREE.SpriteMaterial({
        map: nebulaCloudTex,
        color: color,
        transparent: true,
        opacity: 0.11 + Math.random() * 0.08, // Softened opacity
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const cloudSprite = new THREE.Sprite(cMat);
      const cx = (Math.random() - 0.5) * 11000;
      const cy = (Math.random() - 0.5) * 11000;
      const cz = -750 - Math.random() * 1100;
      cloudSprite.position.set(cx, cy, cz);
      const cScale = 2500 + Math.random() * 1800;
      cloudSprite.scale.set(cScale, cScale * 0.85, 1);
      this.nebulaGroup.add(cloudSprite);
      this.nebulaClouds.push(cloudSprite);
    }
  }

  // =========================================================================
  // 2. MULTI-TIER STARFIELDS (LARGER, BOLD & RADIANT STARS)
  // Replaced tiny single-pixel dots with prominent, luminous star cores & halos
  // =========================================================================
  createMultiTierStarfield() {
    // Rich Luminous Star Texture: Crisp intense solid core + bright radiant aura
    const starCanvas = document.createElement('canvas');
    starCanvas.width = 64;
    starCanvas.height = 64;
    const sctx = starCanvas.getContext('2d');
    const sGrad = sctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    sGrad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    sGrad.addColorStop(0.24, 'rgba(255, 255, 255, 1)');
    sGrad.addColorStop(0.55, 'rgba(240, 248, 255, 0.88)');
    sGrad.addColorStop(0.80, 'rgba(180, 220, 255, 0.35)');
    sGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    sctx.fillStyle = sGrad;
    sctx.fillRect(0, 0, 64, 64);
    this.starTexture = new THREE.CanvasTexture(starCanvas);

    // TIER 1: Major Brilliant Radiant Stars (size: 13.5 - 15.0) - DENSE STELLAR CANOPY
    const majorCount = 9000;
    const majorGeo = new THREE.BufferGeometry();
    const majorPos = new Float32Array(majorCount * 3);
    const majorCol = new Float32Array(majorCount * 3);

    for (let i = 0; i < majorCount; i++) {
      majorPos[i * 3] = (Math.random() - 0.5) * 22000;
      majorPos[i * 3 + 1] = (Math.random() - 0.5) * 22000;
      majorPos[i * 3 + 2] = -40 - Math.random() * 800;

      const shade = 0.90 + Math.random() * 0.35;
      const type = Math.random();

      if (type > 0.68) {
        // Pure Brilliant Diamond White
        majorCol[i * 3] = 1.0 * shade;
        majorCol[i * 3 + 1] = 1.0 * shade;
        majorCol[i * 3 + 2] = 1.0 * shade;
      } else if (type > 0.44) {
        // Vibrant Cyan / Aquamarine Star
        majorCol[i * 3] = 0.40 * shade;
        majorCol[i * 3 + 1] = 0.90 * shade;
        majorCol[i * 3 + 2] = 1.0 * shade;
      } else if (type > 0.26) {
        // Warm Amber / Golden Star
        majorCol[i * 3] = 1.0 * shade;
        majorCol[i * 3 + 1] = 0.88 * shade;
        majorCol[i * 3 + 2] = 0.48 * shade;
      } else {
        // Starlight Lilac / Lavender
        majorCol[i * 3] = 0.88 * shade;
        majorCol[i * 3 + 1] = 0.70 * shade;
        majorCol[i * 3 + 2] = 1.0 * shade;
      }
    }

    majorGeo.setAttribute('position', new THREE.BufferAttribute(majorPos, 3));
    majorGeo.setAttribute('color', new THREE.BufferAttribute(majorCol, 3));

    const majorMat = new THREE.PointsMaterial({
      size: 13.5, // Significantly larger, bold, luminous
      map: this.starTexture,
      vertexColors: true,
      transparent: true,
      opacity: 0.96,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.majorStarfield = new THREE.Points(majorGeo, majorMat);
    this.starfieldGroup.add(this.majorStarfield);

    // TIER 2: Dense Background Radiant Starfield (size: 8.8) - 45K STARS
    const bgCount = 45000;
    const bgGeo = new THREE.BufferGeometry();
    const bgPos = new Float32Array(bgCount * 3);
    const bgCol = new Float32Array(bgCount * 3);

    for (let i = 0; i < bgCount; i++) {
      bgPos[i * 3] = (Math.random() - 0.5) * 22000;
      bgPos[i * 3 + 1] = (Math.random() - 0.5) * 22000;
      bgPos[i * 3 + 2] = -150 - Math.random() * 1300;

      const shade = 0.82 + Math.random() * 0.38;
      const type = Math.random();

      if (type > 0.65) {
        bgCol[i * 3] = 1.0 * shade;
        bgCol[i * 3 + 1] = 1.0 * shade;
        bgCol[i * 3 + 2] = 1.0 * shade;
      } else if (type > 0.40) {
        bgCol[i * 3] = 0.50 * shade;
        bgCol[i * 3 + 1] = 0.85 * shade;
        bgCol[i * 3 + 2] = 1.0 * shade;
      } else if (type > 0.20) {
        bgCol[i * 3] = 0.85 * shade;
        bgCol[i * 3 + 1] = 0.65 * shade;
        bgCol[i * 3 + 2] = 1.0 * shade;
      } else {
        bgCol[i * 3] = 1.0 * shade;
        bgCol[i * 3 + 1] = 0.85 * shade;
        bgCol[i * 3 + 2] = 0.55 * shade;
      }
    }

    bgGeo.setAttribute('position', new THREE.BufferAttribute(bgPos, 3));
    bgGeo.setAttribute('color', new THREE.BufferAttribute(bgCol, 3));

    const bgMat = new THREE.PointsMaterial({
      size: 8.8, // Clearly visible stars, never pinpoint noise
      map: this.starTexture,
      vertexColors: true,
      transparent: true,
      opacity: 0.90,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.starfield = new THREE.Points(bgGeo, bgMat);
    this.starfieldGroup.add(this.starfield);

    // Continuous vertical scrolling partner for menu flow
    this.starfield2 = new THREE.Points(bgGeo, bgMat);
    this.starfield2.position.y = -22000;
    this.starfieldGroup.add(this.starfield2);

    this.majorStarfield2 = new THREE.Points(majorGeo, majorMat);
    this.majorStarfield2.position.y = -22000;
    this.starfieldGroup.add(this.majorStarfield2);
  }

  // =========================================================================
  // 3. TWINKLING SPECULAR 4-POINT CROSS FLARE STARS
  // =========================================================================
  createTwinklingFlareStars() {
    const flareCanvas = document.createElement('canvas');
    flareCanvas.width = 128;
    flareCanvas.height = 128;
    const fctx = flareCanvas.getContext('2d');

    const rad = fctx.createRadialGradient(64, 64, 0, 64, 64, 52);
    rad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    rad.addColorStop(0.14, 'rgba(240, 230, 255, 0.95)');
    rad.addColorStop(0.35, 'rgba(190, 140, 255, 0.45)');
    rad.addColorStop(0.7, 'rgba(120, 60, 210, 0.15)');
    rad.addColorStop(1, 'rgba(70, 20, 140, 0)');
    fctx.fillStyle = rad;
    fctx.fillRect(0, 0, 128, 128);

    const hSpike = fctx.createLinearGradient(0, 64, 128, 64);
    hSpike.addColorStop(0, 'rgba(255, 255, 255, 0)');
    hSpike.addColorStop(0.5, 'rgba(255, 255, 255, 0.95)');
    hSpike.addColorStop(1, 'rgba(255, 255, 255, 0)');
    fctx.fillStyle = hSpike;
    fctx.fillRect(2, 63, 124, 2);

    const vSpike = fctx.createLinearGradient(64, 0, 64, 128);
    vSpike.addColorStop(0, 'rgba(255, 255, 255, 0)');
    vSpike.addColorStop(0.5, 'rgba(255, 255, 255, 0.95)');
    vSpike.addColorStop(1, 'rgba(255, 255, 255, 0)');
    fctx.fillStyle = vSpike;
    fctx.fillRect(63, 2, 2, 124);

    const flareTexture = new THREE.CanvasTexture(flareCanvas);

    this.flareStars = [];
    const flareColors = [0xffffff, 0xfce7f3, 0xf472b6, 0xfbcfe8, 0xe0e7ff, 0xddd6fe, 0xfef3c7];
    for (let i = 0; i < 48; i++) {
      const color = flareColors[i % flareColors.length];
      const fMat = new THREE.SpriteMaterial({
        map: flareTexture,
        color: color,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const sprite = new THREE.Sprite(fMat);
      const fx = (Math.random() - 0.5) * 6500;
      const fy = (Math.random() - 0.5) * 4500;
      const fz = -120 - Math.random() * 750;
      sprite.position.set(fx, fy, fz);
      const baseSize = 52 + Math.random() * 58; // Noticeably larger diffraction spikes
      sprite.scale.set(baseSize, baseSize, 1);
      sprite.baseSize = baseSize;
      sprite.twinkleSpeed = 1.0 + Math.random() * 1.8;
      sprite.twinklePhase = Math.random() * Math.PI * 2;
      this.starfieldGroup.add(sprite);
      this.flareStars.push(sprite);
    }
  }

  // =========================================================================
  // 4. DEEP-SPACE BACKGROUND ASTEROIDS (UNHITTABLE DRIFTING CELESTIAL REOLITHS)
  // - Replicates procedural 3D cratered asteroid geometry in the deep abyss below Z=0
  // - True physical depth lighting falloff (dimmer, atmospheric scattering with depth)
  // - Completely non-colliding (invulnerable ambient space scenery)
  // - 3D tumble rotation & tranquil drift across deep space
  // =========================================================================
  createBackgroundAsteroids() {
    this.bgAsteroids = [];

    // Distinct depth layers from near-deep to abyssal void
    const count = 75;
    const worldSpan = 18000;

    // Dark near-black obsidian / charcoal / basalt rock tones ("siyaha yakın bir koyu renk")
    const darkObsidianTones = [
      0x16181b, // Deep carbon obsidian
      0x121417, // Near-black basalt
      0x0e1013, // Dark abyssal stone
      0x1a1c20, // Dark charcoal slate
      0x141619, // Deep basalt
      0x0a0c0e, // Midnight obsidian
      0x181a1e  // Dark meteor stone
    ];

    for (let i = 0; i < count; i++) {
      // 1. Stratified Depth Assignment (Z = -320 down to -1850)
      let depthZ;
      let radius;
      let detail;

      const layerRoll = Math.random();
      if (layerRoll > 0.65) {
        // Near-deep layer: clearly visible below ships, radius 16-38
        depthZ = -320 - Math.random() * 340; // -320 to -660
        radius = 16 + Math.random() * 22;
        detail = 1;
      } else if (layerRoll > 0.28) {
        // Mid-deep layer: medium distant boulders, radius 26-58
        depthZ = -660 - Math.random() * 560; // -660 to -1220
        radius = 26 + Math.random() * 32;
        detail = 1;
      } else {
        // Abyssal deep layer: colossal dark megaliths, radius 48-95
        depthZ = -1220 - Math.random() * 630; // -1220 to -1850
        radius = 48 + Math.random() * 47;
        detail = 2;
      }

      // 2. Procedural Cratered Asteroid Geometry
      const geo = new THREE.IcosahedronGeometry(radius, detail);
      const pos = geo.attributes.position;

      // Seed 3-5 procedural crater impacts
      const craterCount = 3 + Math.floor(Math.random() * 3);
      const craters = [];
      for (let c = 0; c < craterCount; c++) {
        const u = Math.random();
        const v = Math.random();
        const theta = u * 2.0 * Math.PI;
        const phi = Math.acos(2.0 * v - 1.0);
        craters.push({
          x: Math.sin(phi) * Math.cos(theta),
          y: Math.sin(phi) * Math.sin(theta),
          z: Math.cos(phi),
          radius: 0.26 + Math.random() * 0.32,
          depth: 0.20 + Math.random() * 0.25
        });
      }

      for (let vIdx = 0; vIdx < pos.count; vIdx++) {
        let vx = pos.getX(vIdx);
        let vy = pos.getY(vIdx);
        let vz = pos.getZ(vIdx);

        const len = Math.hypot(vx, vy, vz) || 1;
        const nx = vx / len;
        const ny = vy / len;
        const nz = vz / len;

        // Irregular rocky deformation noise
        let noise = 1.0 + (Math.sin(nx * 3.2) * Math.cos(ny * 2.8) * Math.sin(nz * 2.5)) * 0.28;
        noise += (Math.sin(nx * 7.5 + ny * 5.0) * Math.cos(nz * 6.5)) * 0.10;

        // Carve craters
        for (const crater of craters) {
          const dot = nx * crater.x + ny * crater.y + nz * crater.z;
          const dist = Math.acos(Math.max(-1, Math.min(1, dot)));
          if (dist < crater.radius) {
            const factor = dist / crater.radius;
            const bowl = Math.cos(factor * Math.PI * 0.5);
            const rim = Math.sin(factor * Math.PI) * 0.10;
            noise -= (bowl * crater.depth - rim);
          }
        }

        pos.setXYZ(vIdx, vx * noise, vy * noise, vz * noise);
      }
      geo.computeVertexNormals();

      // 3. Distance Light Attenuation & Dark Near-Black Rock Shading
      const depthDist = Math.abs(depthZ); // 320 to 1850
      const normDepth = Math.max(0, Math.min(1, (depthDist - 320) / 1530));

      const lightMultiplier = 0.70 - normDepth * 0.35; // 0.70 down to 0.35
      const baseTone = darkObsidianTones[Math.floor(Math.random() * darkObsidianTones.length)];
      const rockColor = new THREE.Color(baseTone).multiplyScalar(lightMultiplier);

      // Minimal cool dark ambient bounce (close to black, no glow)
      const starlightBounce = new THREE.Color(0x06080b).multiplyScalar(1.0 - normDepth * 0.5);

      const mat = new THREE.MeshStandardMaterial({
        color: rockColor,
        emissive: starlightBounce,
        roughness: 0.94,
        metalness: 0.06,
        flatShading: true,
        fog: false,
        depthWrite: false
      });

      const mesh = new THREE.Mesh(geo, mat);

      // Random position across the galaxy
      const posX = (Math.random() - 0.5) * worldSpan;
      const posY = (Math.random() - 0.5) * worldSpan;
      mesh.position.set(posX, posY, depthZ);

      // Random initial orientation
      mesh.rotation.set(
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2
      );

      this.bgAsteroidsGroup.add(mesh);

      this.bgAsteroids.push({
        mesh: mesh,
        baseX: posX,
        baseY: posY,
        baseZ: depthZ,
        rotSpeedX: (Math.random() - 0.5) * 0.20,
        rotSpeedY: (Math.random() - 0.5) * 0.20,
        rotSpeedZ: (Math.random() - 0.5) * 0.20,
        driftVx: (Math.random() - 0.5) * 10,
        driftVy: (Math.random() - 0.5) * 10,
        normDepth: normDepth
      });
    }
  }

  // =========================================================================
  // 5. IN-GAME FLIGHT DUST (CALM, SERENE COSMIC MOTES)
  // Gentle micro-stardust particles giving tranquil sense of orientation
  // =========================================================================
  createFlightDust() {
    const count = this.flightDustCount;
    this.flightDustGeo = new THREE.BufferGeometry();
    this.flightDustPositions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    const rangeX = 1400;
    const rangeY = 900;

    for (let i = 0; i < count; i++) {
      this.flightDustPositions[i * 3] = (Math.random() - 0.5) * rangeX;
      this.flightDustPositions[i * 3 + 1] = (Math.random() - 0.5) * rangeY;
      this.flightDustPositions[i * 3 + 2] = -20 - Math.random() * 220;

      const lum = 0.55 + Math.random() * 0.45;
      colors[i * 3] = lum * 0.75;
      colors[i * 3 + 1] = lum * 0.90;
      colors[i * 3 + 2] = lum;
    }

    this.flightDustGeo.setAttribute('position', new THREE.BufferAttribute(this.flightDustPositions, 3));
    this.flightDustGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const dustMat = new THREE.PointsMaterial({
      size: 7.2, // One click larger: radiant visible stardust motes during ship flight
      map: this.starTexture,
      vertexColors: true,
      transparent: true,
      opacity: 0.0, // Soft tranquil fade-in during gameplay
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.flightDustPoints = new THREE.Points(this.flightDustGeo, dustMat);
    this.flightDustGroup.add(this.flightDustPoints);
  }

  // =========================================================================
  // 7. SHOOTING STARS / METEORS (SPORADIC, PEACEFUL LIGHT STREAKS)
  // =========================================================================
  spawnShootingStar() {
    const camX = this.camera ? this.camera.position.x : 0;
    const camY = this.camera ? -this.camera.position.y : 0;

    const angle = (0.2 + Math.random() * 0.25) * Math.PI;
    const speed = 1400 + Math.random() * 700; // Calmer speed
    const length = 200 + Math.random() * 220;
    const duration = 0.8 + Math.random() * 0.5;

    const startX = camX + (Math.random() - 0.5) * 2200 - Math.cos(angle) * 700;
    const startY = camY + (Math.random() - 0.5) * 1600 - Math.sin(angle) * 700;
    const z = -60 - Math.random() * 80;

    const streakColor = Math.random() > 0.4 ? 0x99e5ff : 0xffe8aa;

    const lineGeo = new THREE.BufferGeometry();
    const posArr = new Float32Array(6);
    posArr[0] = startX;
    posArr[1] = -startY;
    posArr[2] = z;
    posArr[3] = startX - Math.cos(angle) * length;
    posArr[4] = -(startY - Math.sin(angle) * length);
    posArr[5] = z;

    lineGeo.setAttribute('position', new THREE.BufferAttribute(posArr, 3));

    const lineMat = new THREE.LineBasicMaterial({
      color: streakColor,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending
    });

    const lineMesh = new THREE.Line(lineGeo, lineMat);
    this.scene.add(lineMesh);

    this.shootingStars.push({
      mesh: lineMesh,
      x: startX,
      y: startY,
      z: z,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      length: length,
      dirX: Math.cos(angle),
      dirY: Math.sin(angle),
      life: duration,
      maxLife: duration
    });
  }

  updateShootingStars(dt) {
    this.shootingStarTimer -= dt;
    if (this.shootingStarTimer <= 0) {
      this.shootingStarTimer = 3.5 + Math.random() * 5.0; // Serene intervals
      this.spawnShootingStar();
    }

    for (let i = this.shootingStars.length - 1; i >= 0; i--) {
      const s = this.shootingStars[i];
      s.life -= dt;
      if (s.life <= 0) {
        if (s.mesh) {
          this.scene.remove(s.mesh);
          s.mesh.geometry.dispose();
          s.mesh.material.dispose();
        }
        this.shootingStars.splice(i, 1);
        continue;
      }

      s.x += s.vx * dt;
      s.y += s.vy * dt;

      const posArr = s.mesh.geometry.attributes.position.array;
      posArr[0] = s.x;
      posArr[1] = -s.y;
      posArr[2] = s.z;
      posArr[3] = s.x - s.dirX * s.length;
      posArr[4] = -(s.y - s.dirY * s.length);
      posArr[5] = s.z;
      s.mesh.geometry.attributes.position.needsUpdate = true;
      s.mesh.material.opacity = (s.life / s.maxLife) * 0.85;
    }
  }

  // =========================================================================
  // 7. MENU MODE UPDATE: Gentle, hypnotic upward cosmic drift
  // =========================================================================
  updateMenu(dt, driftSpeed = 38) {
    this.elapsedTime += dt;
    const calmSpeed = Math.min(driftSpeed, 45);
    this.menuScrollY = (this.menuScrollY || 0) + calmSpeed * dt;
    const wrapHeight = 22000;
    const normY = this.menuScrollY % wrapHeight;

    const camX = this.camera ? this.camera.position.x : 0;
    const camY = this.camera ? this.camera.position.y : 0;

    // Upwards drifting starfield partners
    if (this.starfield && this.starfield2) {
      this.starfield.visible = true;
      this.starfield2.visible = true;
      this.starfield.position.x = camX * 0.85;
      this.starfield.position.y = normY + camY * 0.85;
      this.starfield2.position.x = camX * 0.85;
      this.starfield2.position.y = (normY - wrapHeight) + camY * 0.85;
    }

    if (this.majorStarfield && this.majorStarfield2) {
      this.majorStarfield.visible = true;
      this.majorStarfield2.visible = true;
      this.majorStarfield.position.x = camX * 0.85;
      this.majorStarfield.position.y = normY + camY * 0.85;
      this.majorStarfield2.position.x = camX * 0.85;
      this.majorStarfield2.position.y = (normY - wrapHeight) + camY * 0.85;
    }

    // Parallax upwards drift for soft nebula mist clouds
    if (this.nebulaClouds) {
      for (const cloud of this.nebulaClouds) {
        cloud.position.y += calmSpeed * 0.28 * dt;
        if (cloud.position.y > 2500) {
          cloud.position.y -= 5000;
        }
      }
    }

    // Specular flare stars twinkle & drift
    if (this.flareStars) {
      for (const star of this.flareStars) {
        star.position.y += calmSpeed * 0.45 * dt;
        if (star.position.y > 1900) {
          star.position.y -= 3800;
          star.position.x = (Math.random() - 0.5) * 4800;
        }
        star.twinklePhase += star.twinkleSpeed * dt;
        const scaleMul = 0.78 + 0.35 * Math.sin(star.twinklePhase);
        star.scale.set(star.baseSize * scaleMul, star.baseSize * scaleMul, 1);
      }
    }

    // Background asteroids drift slowly upward with menu cosmos
    if (this.bgAsteroids) {
      const menuDrift = (calmSpeed || 38) * 0.35;
      for (let i = 0; i < this.bgAsteroids.length; i++) {
        const ast = this.bgAsteroids[i];
        ast.mesh.rotation.x += ast.rotSpeedX * dt;
        ast.mesh.rotation.y += ast.rotSpeedY * dt;
        ast.mesh.rotation.z += ast.rotSpeedZ * dt;

        ast.mesh.position.y += menuDrift * dt;
        if (ast.mesh.position.y > 6000) {
          ast.mesh.position.y -= 12000;
          ast.mesh.position.x = (Math.random() - 0.5) * 9000;
        }
      }
    }

    // Shooting stars
    this.updateShootingStars(dt);

    // Ensure flight dust is hidden in menu
    if (this.flightDustPoints && this.flightDustPoints.material.opacity > 0) {
      this.flightDustPoints.material.opacity = Math.max(0, this.flightDustPoints.material.opacity - dt * 2);
    }
  }

  // =========================================================================
  // 6. IN-GAME FLIGHT MODE UPDATE:
  // Serene deep-space parallax, radiant starfields, and calm stardust
  // =========================================================================
  updateGame(dt, camera, playerShip) {
    if (!camera) return;

    this.elapsedTime += dt;
    const camX = camera.position.x;
    const camY = camera.position.y;

    // Single unified starfield in game mode with CALM, STABLE parallax (0.965 factor)
    if (this.starfield2) this.starfield2.visible = false;
    if (this.majorStarfield2) this.majorStarfield2.visible = false;

    const starfieldTileSize = 18000;
    const parallaxFactor = 0.965; // Serene deep space
    const targetX = camX * parallaxFactor;
    const targetY = camY * parallaxFactor;

    const offsetX = Math.floor((camX * (1 - parallaxFactor) + starfieldTileSize * 0.5) / starfieldTileSize) * starfieldTileSize;
    const offsetY = Math.floor((camY * (1 - parallaxFactor) + starfieldTileSize * 0.5) / starfieldTileSize) * starfieldTileSize;

    if (this.starfield) {
      this.starfield.visible = true;
      this.starfield.position.x = targetX + offsetX;
      this.starfield.position.y = targetY + offsetY;
    }
    if (this.majorStarfield) {
      this.majorStarfield.visible = true;
      this.majorStarfield.position.x = targetX + offsetX;
      this.majorStarfield.position.y = targetY + offsetY;
    }

    // Nebulae follow with ultra-deep slow parallax (0.975 ratio)
    if (this.nebulaGroup) {
      this.nebulaGroup.position.x = camX * 0.975;
      this.nebulaGroup.position.y = camY * 0.975;
    }

    // Deep-Space Background Asteroids: 3D tumble, space drift, and infinite wrapping
    if (this.bgAsteroids) {
      const fieldSize = 18000;
      const halfField = fieldSize * 0.5;

      for (let i = 0; i < this.bgAsteroids.length; i++) {
        const ast = this.bgAsteroids[i];

        // 3D tumble rotation around natural axes
        ast.mesh.rotation.x += ast.rotSpeedX * dt;
        ast.mesh.rotation.y += ast.rotSpeedY * dt;
        ast.mesh.rotation.z += ast.rotSpeedZ * dt;

        // Gentle space drift
        ast.baseX += ast.driftVx * dt;
        ast.baseY += ast.driftVy * dt;

        // Infinite wrapping relative to player camera
        let relX = (ast.baseX - camX) % fieldSize;
        if (relX > halfField) relX -= fieldSize;
        else if (relX < -halfField) relX += fieldSize;

        let relY = (ast.baseY - camY) % fieldSize;
        if (relY > halfField) relY -= fieldSize;
        else if (relY < -halfField) relY += fieldSize;

        ast.mesh.position.x = camX + relX;
        ast.mesh.position.y = camY + relY;
        ast.mesh.position.z = ast.baseZ;
      }
    }

    // Flare stars twinkling
    if (this.flareStars) {
      for (let i = 0; i < this.flareStars.length; i++) {
        const star = this.flareStars[i];
        star.twinklePhase += star.twinkleSpeed * dt;
        const scaleMul = 0.78 + 0.35 * Math.sin(star.twinklePhase);
        star.scale.set(star.baseSize * scaleMul, star.baseSize * scaleMul, 1);
      }
    }

    // In-Game Flight Dust: CALM, SERENE stardust motes (reduced velocity flow: 0.08)
    if (this.flightDustPoints && this.flightDustPositions) {
      if (this.flightDustPoints.material.opacity < 0.48) {
        this.flightDustPoints.material.opacity = Math.min(0.48, this.flightDustPoints.material.opacity + dt * 0.6);
      }

      this.flightDustPoints.position.x = camX;
      this.flightDustPoints.position.y = camY;

      const pVx = playerShip ? (playerShip.vx || 0) : 0;
      const pVy = playerShip ? (playerShip.vy || 0) : 0;

      const dustFlowX = -pVx * dt * 0.08;
      const dustFlowY = -pVy * dt * 0.08;

      const rangeX = 1400;
      const rangeY = 900;
      const halfX = rangeX * 0.5;
      const halfY = rangeY * 0.5;

      const pos = this.flightDustPositions;
      const count = this.flightDustCount;

      for (let i = 0; i < count; i++) {
        const idx = i * 3;
        pos[idx] += dustFlowX;
        pos[idx + 1] += dustFlowY;

        if (pos[idx] > halfX) pos[idx] -= rangeX;
        else if (pos[idx] < -halfX) pos[idx] += rangeX;

        if (pos[idx + 1] > halfY) pos[idx + 1] -= rangeY;
        else if (pos[idx + 1] < -halfY) pos[idx + 1] += rangeY;
      }
      this.flightDustGeo.attributes.position.needsUpdate = true;
    }

    // Shooting stars
    this.updateShootingStars(dt);
  }

  // =========================================================================
  // 7. LIFECYCLE HOOKS
  // =========================================================================
  onGameStart() {
    this.mode = 'game';
    if (this.flightDustPoints) {
      this.flightDustPoints.material.opacity = 0.05;
    }
    if (this.shootingStars) {
      for (const s of this.shootingStars) {
        if (s.mesh) {
          this.scene.remove(s.mesh);
          s.mesh.geometry.dispose();
          s.mesh.material.dispose();
        }
      }
      this.shootingStars = [];
    }
  }

  onMenuReturn() {
    this.mode = 'menu';
    if (this.flightDustPoints) {
      this.flightDustPoints.material.opacity = 0;
    }
  }
}

// Expose globally
window.SpaceUniverse = SpaceUniverse;

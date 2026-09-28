// Master Game Engine for Starblast 3D Space Arcade with 8x Map and 3 Nation Bases
const NATION_BOT_NAMES = {
  red: [
    'Kryos-Vortex', 'Kryos-Nemesis', 'Kryos-Baron', 'Kryos-Ejder',
    'Kryos-Gölge', 'Kryos-Fırtına', 'Kryos-Pençe', 'Kryos-Kılıç',
    'Kryos-Yıldırım', 'Kryos-Alev'
  ],
  blue: [
    'Veylar-Orion', 'Veylar-Astra', 'Veylar-Pulsar', 'Veylar-Nova',
    'Veylar-Kozmos', 'Veylar-Siriüs', 'Veylar-Vega', 'Veylar-Bora',
    'Veylar-Kutup', 'Veylar-Safir'
  ],
  gold: [
    'Aethel-Solaris', 'Aethel-Titan', 'Aethel-Zeus', 'Aethel-Anka',
    'Aethel-Kartal', 'Aethel-Şafak', 'Aethel-Güneş', 'Aethel-Kral',
    'Aethel-Pars', 'Aethel-Zirve'
  ]
};

class StarblastGame {
  constructor() {
    this.worldSize = 10000; // 8x area expansion
    this.isPlaying = false;
    this.playerNation = 'blue';
    this.playerDeadHandled = false;

    // Three.js Core
    this.container = document.getElementById('canvas-container');
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x03060d, 0.0001);

    this.camera = new THREE.PerspectiveCamera(
      55,
      window.innerWidth / window.innerHeight,
      1,
      12000
    );
    this.camera.position.set(0, 0, 750); // Overhead view
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.25;
    this.container.appendChild(this.renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0x334455, 1.4);
    this.scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0xddeeff, 0x112233, 1.3);
    this.scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight(0xffffff, 2.2);
    sunLight.position.set(1500, 2500, 2000);
    this.scene.add(sunLight);

    const blueBackLight = new THREE.DirectionalLight(0x0077ff, 0.9);
    blueBackLight.position.set(-1500, -1500, 800);
    this.scene.add(blueBackLight);

    // Entity Collections
    this.player = null;
    this.asteroids = [];
    this.gems = [];
    this.lasers = [];
    this.particles = [];
    this.bots = [];
    this.remotePlayers = new Map();
    this.stations = {};

    // 3 Nation Base Locations (120-degree balanced layout across 10000x10000 galaxy)
    this.baseLocations = {
      blue: { x: 0, y: -3800 },      // South
      red:  { x: -3300, y: 2200 },    // North-West
      gold: { x: 3300, y: 2200 }      // North-East
    };

    // Inputs
    this.keys = {};
    this.mouseWorld = { x: 0, y: 0 };
    this.donateTimer = 0;

    // Setup Systems
    this.createStarfield();
    this.createWorldBoundary();
    this.ui = new UIManager(this);

    // Network Engine (Socket.IO Multiplayer)
    this.network = new NetworkManager(this);

    this.setupInputs();
    this.lastTime = performance.now();

    // Start live 3D cosmic universe view on main menu (no bots)
    this.initMenuBattle();

    window.addEventListener('resize', () => this.onWindowResize());
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  initMenuBattle() {
    this.isMenuBattle = true;
    this.clearWorld();

    const inGameHud = document.getElementById('in-game-hud');
    if (inGameHud) inGameHud.style.display = 'none';

    // 1. Spawn 3 Home Bases
    for (const key of ['red', 'blue', 'gold']) {
      const loc = this.baseLocations[key];
      this.stations[key] = new SpaceStation(key, loc.x, loc.y, this.scene);
    }

    // 2. Spawn Asteroids across the galaxy with a central engagement zone
    for (let i = 0; i < 130; i++) {
      const tier = (i % 7) + 1;
      this.spawnRandomAsteroid(tier);
    }
    // Extra central asteroids for cosmic backdrop
    for (let i = 0; i < 20; i++) {
      const dist = 70 + Math.random() * 450;
      const angle = Math.random() * Math.PI * 2;
      const x = Math.cos(angle) * dist;
      const y = Math.sin(angle) * dist;
      const ast = new Asteroid(x, y, (i % 4) + 1);
      this.asteroids.push(ast);
      this.scene.add(ast.mesh);
    }
    // Bot simulation removed - pure multiplayer arena
  }

  createStarfield() {
    // High-density multi-depth starfield with cosmic colors for 10000x10000 universe
    const starCount = 6500;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 18000;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 18000;
      positions[i * 3 + 2] = -80 - Math.random() * 1400;

      const shade = 0.45 + Math.random() * 0.55;
      const type = Math.random();
      if (type > 0.8) {
        // Cyan / Ice-blue stars
        colors[i * 3] = 0.35 * shade;
        colors[i * 3 + 1] = 0.85 * shade;
        colors[i * 3 + 2] = 1.0 * shade;
      } else if (type > 0.65) {
        // Warm gold / orange dwarf stars
        colors[i * 3] = 1.0 * shade;
        colors[i * 3 + 1] = 0.78 * shade;
        colors[i * 3 + 2] = 0.35 * shade;
      } else {
        // Crisp white / silver stars
        colors[i * 3] = shade;
        colors[i * 3 + 1] = shade;
        colors[i * 3 + 2] = shade;
      }
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.PointsMaterial({
      size: 2.7,
      vertexColors: true,
      transparent: true,
      opacity: 0.9
    });

    this.starfield = new THREE.Points(geo, mat);
    this.scene.add(this.starfield);

    // Deep space celestial bodies (Massive Moon, Saturn with Rings, Mars)
    this.createCelestialBodies();

    // Shooting stars / meteor streaks
    this.shootingStars = [];
    this.shootingStarTimer = 1.5;
  }

  spawnShootingStar() {
    const camX = this.camera ? this.camera.position.x : 0;
    const camY = this.camera ? -this.camera.position.y : 0;

    // Diagonal sweeping angle
    const angle = (0.2 + Math.random() * 0.25) * Math.PI;
    const speed = 1900 + Math.random() * 1100;
    const length = 220 + Math.random() * 260;
    const duration = 0.65 + Math.random() * 0.45;

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
      opacity: 0.95,
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
      this.shootingStarTimer = 2.2 + Math.random() * 3.8;
      this.spawnShootingStar();
      if (Math.random() < 0.25) {
        setTimeout(() => this.spawnShootingStar(), 180);
      }
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
      s.mesh.material.opacity = (s.life / s.maxLife) * 0.95;
    }
  }

  createCelestialBodies() {
    this.celestialGroup = new THREE.Group();
    this.scene.add(this.celestialGroup);

    // 1. DEVASA BİR AY (Massive Moon in North-West Deep Space: "devasa bir ay olabilir")
    const moonCanvas = document.createElement('canvas');
    moonCanvas.width = 512;
    moonCanvas.height = 512;
    const mctx = moonCanvas.getContext('2d');
    
    // Moon base surface gradient
    const mGrad = mctx.createRadialGradient(256, 256, 40, 256, 256, 256);
    mGrad.addColorStop(0, '#e2e8f0');
    mGrad.addColorStop(0.65, '#94a3b8');
    mGrad.addColorStop(1, '#475569');
    mctx.fillStyle = mGrad;
    mctx.fillRect(0, 0, 512, 512);

    // Dark lunar maria (basalt plains)
    const maria = [
      { x: 190, y: 160, r: 85 },
      { x: 310, y: 200, r: 70 },
      { x: 230, y: 290, r: 95 },
      { x: 340, y: 320, r: 60 },
      { x: 150, y: 260, r: 50 }
    ];
    for (const m of maria) {
      const grad = mctx.createRadialGradient(m.x, m.y, 10, m.x, m.y, m.r);
      grad.addColorStop(0, 'rgba(51, 65, 85, 0.85)');
      grad.addColorStop(0.7, 'rgba(71, 85, 105, 0.55)');
      grad.addColorStop(1, 'rgba(100, 116, 139, 0)');
      mctx.fillStyle = grad;
      mctx.beginPath();
      mctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
      mctx.fill();
    }

    // Impact craters with rim highlights
    for (let i = 0; i < 35; i++) {
      const cx = (Math.sin(i * 9.3) * 0.5 + 0.5) * 440 + 36;
      const cy = (Math.cos(i * 7.1) * 0.5 + 0.5) * 440 + 36;
      const cr = 5 + (i % 5) * 4;
      mctx.fillStyle = 'rgba(30, 41, 59, 0.65)';
      mctx.beginPath();
      mctx.arc(cx, cy, cr, 0, Math.PI * 2);
      mctx.fill();
      mctx.strokeStyle = 'rgba(241, 245, 249, 0.65)';
      mctx.lineWidth = 1.5;
      mctx.stroke();
    }

    const moonTex = new THREE.CanvasTexture(moonCanvas);
    const moonGeo = new THREE.SphereGeometry(620, 36, 36);
    const moonMat = new THREE.MeshStandardMaterial({
      map: moonTex,
      roughness: 0.85,
      metalness: 0.1
    });
    this.moonMesh = new THREE.Mesh(moonGeo, moonMat);
    this.moonMesh.position.set(-2700, 2400, -1450);
    this.celestialGroup.add(this.moonMesh);

    // Soft celestial rim glow around the moon
    const moonGlowGeo = new THREE.SphereGeometry(645, 32, 32);
    const moonGlowMat = new THREE.MeshBasicMaterial({
      color: 0xe2e8f0,
      transparent: true,
      opacity: 0.18,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide
    });
    this.moonMesh.add(new THREE.Mesh(moonGlowGeo, moonGlowMat));

    // 2. SATÜRN GEZEGENİ (Saturn with Iconic Inclined Rings in South-East Deep Space: "arkada farklı bir yerde satürn gezegeni olaiblir")
    const saturnCanvas = document.createElement('canvas');
    saturnCanvas.width = 512;
    saturnCanvas.height = 256;
    const sctx = saturnCanvas.getContext('2d');
    
    // Atmospheric golden cloud bands
    const bandColors = ['#f5cd79', '#e58e26', '#f7d794', '#f19066', '#f5cd79', '#cf6a87', '#f7d794', '#d48806', '#f5cd79'];
    for (let i = 0; i < bandColors.length; i++) {
      sctx.fillStyle = bandColors[i];
      sctx.fillRect(0, (i / bandColors.length) * 256, 512, (1 / bandColors.length) * 256 + 2);
    }
    const saturnTex = new THREE.CanvasTexture(saturnCanvas);
    const saturnGeo = new THREE.SphereGeometry(390, 32, 32);
    const saturnMat = new THREE.MeshStandardMaterial({
      map: saturnTex,
      roughness: 0.7,
      metalness: 0.15
    });
    this.saturnMesh = new THREE.Mesh(saturnGeo, saturnMat);
    this.saturnMesh.position.set(3400, -2500, -1550);
    this.celestialGroup.add(this.saturnMesh);

    // Saturn Tilted Rings
    const ringGeo = new THREE.RingGeometry(480, 860, 64);
    const ringCanvas = document.createElement('canvas');
    ringCanvas.width = 512;
    ringCanvas.height = 32;
    const rctx = ringCanvas.getContext('2d');
    const rGrad = rctx.createLinearGradient(0, 0, 512, 0);
    rGrad.addColorStop(0, 'rgba(245, 205, 121, 0.1)');
    rGrad.addColorStop(0.2, 'rgba(255, 222, 130, 0.75)');
    rGrad.addColorStop(0.55, 'rgba(229, 142, 38, 0.85)');
    rGrad.addColorStop(0.62, 'rgba(0, 0, 0, 0)'); // Cassini Division gap
    rGrad.addColorStop(0.68, 'rgba(245, 205, 121, 0.6)');
    rGrad.addColorStop(1, 'rgba(200, 130, 30, 0.1)');
    rctx.fillStyle = rGrad;
    rctx.fillRect(0, 0, 512, 32);

    const ringTex = new THREE.CanvasTexture(ringCanvas);
    const ringMat = new THREE.MeshBasicMaterial({
      map: ringTex,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = Math.PI / 3.2;
    ringMesh.rotation.y = 0.28;
    this.saturnMesh.add(ringMesh);

    // 3. MARS GEZEGENİ (Red Planet in North-East Deep Space: "mars olabilir")
    const marsCanvas = document.createElement('canvas');
    marsCanvas.width = 512;
    marsCanvas.height = 256;
    const marctx = marsCanvas.getContext('2d');
    
    // Mars terracotta / rust red surface
    const marsGrad = marctx.createLinearGradient(0, 0, 0, 256);
    marsGrad.addColorStop(0, '#ffffff'); // North polar ice cap
    marsGrad.addColorStop(0.12, '#e17055');
    marsGrad.addColorStop(0.45, '#c0392b');
    marsGrad.addColorStop(0.75, '#63171b'); // Dark canyons
    marsGrad.addColorStop(1, '#d63031');
    marctx.fillStyle = marsGrad;
    marctx.fillRect(0, 0, 512, 256);

    marctx.fillStyle = 'rgba(75, 18, 12, 0.55)';
    marctx.beginPath();
    marctx.ellipse(260, 140, 110, 45, -0.15, 0, Math.PI * 2);
    marctx.fill();

    const marsTex = new THREE.CanvasTexture(marsCanvas);
    const marsGeo = new THREE.SphereGeometry(340, 32, 32);
    const marsMat = new THREE.MeshStandardMaterial({
      map: marsTex,
      roughness: 0.75,
      metalness: 0.1
    });
    this.marsMesh = new THREE.Mesh(marsGeo, marsMat);
    this.marsMesh.position.set(2600, 3200, -1650);
    this.celestialGroup.add(this.marsMesh);

    // Red atmospheric rim glow around Mars
    const marsGlowGeo = new THREE.SphereGeometry(358, 32, 32);
    const marsGlowMat = new THREE.MeshBasicMaterial({
      color: 0xff6b6b,
      transparent: true,
      opacity: 0.22,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide
    });
    this.marsMesh.add(new THREE.Mesh(marsGlowGeo, marsGlowMat));

    // Fiery Meteors List & Spawner Timer
    this.fieryMeteors = [];
    this.fieryMeteorTimer = 2.5;
  }

  // Blazing Fiery Meteor with Incandescent Core & Flame Embers ("ateşli bir meteor arkadan geçebilir")
  spawnFieryMeteor() {
    const camX = this.camera ? this.camera.position.x : 0;
    const camY = this.camera ? -this.camera.position.y : 0;

    const angle = (0.22 + Math.random() * 0.28) * Math.PI;
    const speed = 2500 + Math.random() * 1100;
    const duration = 1.4 + Math.random() * 0.8;

    const startX = camX + (Math.random() - 0.5) * 2800 - Math.cos(angle) * 1200;
    const startY = camY + (Math.random() - 0.5) * 2000 - Math.sin(angle) * 1200;
    const z = -450 - Math.random() * 400;

    const meteorGroup = new THREE.Group();

    // Hot incandescent white core
    const coreGeo = new THREE.SphereGeometry(12, 12, 12);
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending
    });
    meteorGroup.add(new THREE.Mesh(coreGeo, coreMat));

    // Blazing outer orange fireball
    const fireGeo = new THREE.SphereGeometry(20, 12, 12);
    const fireMat = new THREE.MeshBasicMaterial({
      color: 0xff8800,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending
    });
    meteorGroup.add(new THREE.Mesh(fireGeo, fireMat));

    // Glowing flame tail cone
    const tailGeo = new THREE.ConeGeometry(18, 160, 12);
    tailGeo.rotateX(Math.PI / 2);
    const tailMat = new THREE.MeshBasicMaterial({
      color: 0xff3300,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending
    });
    const tailMesh = new THREE.Mesh(tailGeo, tailMat);
    tailMesh.position.set(0, 0, -80);
    meteorGroup.add(tailMesh);

    meteorGroup.position.set(startX, -startY, z);
    meteorGroup.rotation.z = -angle + Math.PI / 2;
    this.scene.add(meteorGroup);

    this.fieryMeteors.push({
      group: meteorGroup,
      x: startX,
      y: startY,
      z: z,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: duration,
      maxLife: duration,
      flameTimer: 0
    });
  }

  updateFieryMeteors(dt) {
    if (!this.fieryMeteors) return;
    this.fieryMeteorTimer -= dt;
    if (this.fieryMeteorTimer <= 0) {
      this.fieryMeteorTimer = 5.0 + Math.random() * 5.0; // Spawns every 5-10s
      this.spawnFieryMeteor();
    }

    for (let i = this.fieryMeteors.length - 1; i >= 0; i--) {
      const m = this.fieryMeteors[i];
      m.life -= dt;
      if (m.life <= 0) {
        if (m.group) {
          this.scene.remove(m.group);
          m.group.traverse(obj => {
            if (obj.geometry) obj.geometry.dispose();
            if (obj.material) obj.material.dispose();
          });
        }
        this.fieryMeteors.splice(i, 1);
        continue;
      }

      m.x += m.vx * dt;
      m.y += m.vy * dt;
      m.group.position.set(m.x, -m.y, m.z);

      // Trailing flame embers & smoke sparks
      m.flameTimer += dt;
      if (m.flameTimer >= 0.035) {
        m.flameTimer = 0;
        const col = Math.random() > 0.4 ? 0xff4500 : (Math.random() > 0.5 ? 0xffd700 : 0xff1100);
        const p = new Particle(
          m.x + (Math.random() - 0.5) * 16,
          m.y + (Math.random() - 0.5) * 16,
          (Math.random() - 0.5) * 45 - m.vx * 0.08,
          (Math.random() - 0.5) * 45 - m.vy * 0.08,
          col,
          5.0 + Math.random() * 5.0,
          0.4 + Math.random() * 0.3
        );
        p.mesh.position.z = m.z;
        this.particles.push(p);
        this.scene.add(p.mesh);
      }
    }
  }

  createWorldBoundary() {
    // Visual boundary circle line removed per user request: "alanın bittiği yerde daire çizgisinin görülmesine gerek yok"
  }

  setupInputs() {
    window.addEventListener('keydown', (e) => {
      // Toggle Chat with [T]
      if (e.code === 'KeyT' && (!this.ui || !this.ui.isChatOpen)) {
        e.preventDefault();
        if (this.ui) this.ui.openChat();
        return;
      }

      // If chat is open, suppress ship game controls while typing
      if (this.ui && this.ui.isChatOpen) {
        if (e.code === 'Escape') {
          this.ui.closeChat();
        }
        return;
      }

      this.keys[e.code] = true;

      // 1-8 Upgrade hotkeys
      if (e.key >= '1' && e.key <= '8') {
        const idx = parseInt(e.key) - 1;
        if (UPGRADE_CONFIG[idx]) {
          this.upgradeStat(UPGRADE_CONFIG[idx].id);
        }
      }

      // [B] Donate to home base
      if (e.code === 'KeyB') {
        this.donateToHomeBase();
      }

      // RCS toggle (Ctrl or Shift)
      if (e.code === 'ControlLeft' || e.code === 'ShiftLeft') {
        if (this.player) {
          this.player.rcsEnabled = !this.player.rcsEnabled;
        }
      }
    });

    window.addEventListener('keyup', (e) => {
      if (this.ui && this.ui.isChatOpen) return;
      this.keys[e.code] = false;
    });

    window.addEventListener('mousemove', (e) => {
      // Convert screen mouse to 3D world coordinates
      const ndcX = (e.clientX / window.innerWidth) * 2 - 1;
      const ndcY = -(e.clientY / window.innerHeight) * 2 + 1;

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), this.camera);
      const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
      const intersection = new THREE.Vector3();
      raycaster.ray.intersectPlane(plane, intersection);

      if (intersection) {
        this.mouseWorld.x = intersection.x;
        this.mouseWorld.y = -intersection.y;
      }
    });

    window.addEventListener('mousedown', (e) => {
      window.soundSystem.ensureContext();
      // If clicking outside chat while chat is open, dismiss chat
      if (this.ui && this.ui.isChatOpen) {
        if (!e.target.closest('#game-chat-box')) {
          this.ui.closeChat();
        }
        return;
      }

      if (e.button === 0) {
        this.keys['MouseLeft'] = true;
      } else if (e.button === 2) {
        this.keys['MouseRight'] = true;
      }
    });

    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) {
        this.keys['MouseLeft'] = false;
      } else if (e.button === 2) {
        this.keys['MouseRight'] = false;
      }
    });

    window.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  getNationSpawn(nation) {
    const baseLoc = this.baseLocations[nation] || this.baseLocations['blue'];
    const offsetAngle = Math.random() * Math.PI * 2;
    const offsetDist = 200 + Math.random() * 80;
    return {
      x: baseLoc.x + Math.cos(offsetAngle) * offsetDist,
      y: baseLoc.y + Math.sin(offsetAngle) * offsetDist
    };
  }

  // Calculate volume based on distance to the player (only nearby sounds are audible)
  getPositionalVolume(x, y, maxDist = 750) {
    if (this.isMenuBattle) return 0; // Keep main menu background battle silent
    if (!this.player || this.player.isDead) return 0;
    const dist = Math.hypot(x - this.player.x, y - this.player.y);
    if (dist > maxDist) return 0;
    const falloff = 1 - (dist / maxDist);
    return Math.max(0, Math.min(1, falloff * falloff));
  }

  startGame(playerName, chosenNation = 'blue') {
    this.isMenuBattle = false;
    window.soundSystem.ensureContext();
    window.soundSystem.startMusic();
    this.clearWorld();

    this.playerNation = chosenNation;
    this.lastPlayerShipKey = 'fly';
    this.lastPlayerUpgrades = null;
    this.lastPlayerScore = 0;

    // Spawn 3 Home Bases
    for (const key of ['red', 'blue', 'gold']) {
      const loc = this.baseLocations[key];
      this.stations[key] = new SpaceStation(key, loc.x, loc.y, this.scene);
    }

    // Spawn player at own nation base
    const spawn = this.getNationSpawn(chosenNation);
    const myId = (this.network && this.network.myId) ? this.network.myId : 'player';
    this.player = new Ship(myId, playerName, 'fly', spawn.x, spawn.y, true, chosenNation, this.scene);
    this.player.spawnShieldTimer = 3.5;
    this.playerDeadHandled = false;
    this.scene.add(this.player.mesh);

    // Snap camera directly to base spawn location and reset any tilt/rotation
    this.camera.position.set(spawn.x, -spawn.y, 750);
    this.camera.rotation.set(0, 0, 0);
    this.camera.quaternion.set(0, 0, 0, 1);
    this.camera.up.set(0, 1, 0);

    // Notify server of join
    if (this.network && this.network.isConnected) {
      this.network.joinGame(playerName, chosenNation);
    } else {
      this.spawnInitialWorld();
    }

    const startScreen = document.getElementById('start-screen');
    if (startScreen) startScreen.style.display = 'none';
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) loadingScreen.style.display = 'none';

    const inGameHud = document.getElementById('in-game-hud');
    if (inGameHud) inGameHud.style.display = 'block';

    this.ui.hideGameOver();
    this.isPlaying = true;

    if (this.ui) {
      const nCfg = NATIONS[chosenNation] || NATIONS['blue'];
      this.ui.addChatMessage('KOMUTA MERKEZİ', `${nCfg.name} filosuna hoş geldiniz, Komutan ${playerName}! Space Vanguard çevrimiçi protokolü aktif. [T] tuşuna basarak sohbete katılabilirsiniz.`, chosenNation, true);
    }
  }

  respawnPlayer() {
    this.ui.hideGameOver();
    const nation = this.playerNation || 'blue';

    this.playerDeadHandled = false;
    if (this.player && this.player.mesh) {
      this.scene.remove(this.player.mesh);
    }
    const name = this.player ? this.player.name : 'KOMUTAN';
    const spawn = this.getNationSpawn(nation);
    const shipKey = this.lastPlayerShipKey || (this.player ? this.player.shipKey : 'fly');
    const myId = (this.network && this.network.myId) ? this.network.myId : 'player';

    // Respawn with the SAME tier ship, but cargo crystals (ganimet) reset to 0!
    this.player = new Ship(myId, name, shipKey, spawn.x, spawn.y, true, nation, this.scene);
    this.player.isDead = false;
    if (this.lastPlayerUpgrades) {
      this.player.upgrades = { ...this.lastPlayerUpgrades };
      this.player.recomputeStats();
    }
    if (this.lastPlayerScore) {
      this.player.score = this.lastPlayerScore;
    }
    this.player.crystals = 0; // Ganimet sıfırlandı!
    this.player.shield = this.player.stats.shieldCap;
    this.player.energy = this.player.stats.energyCap;
    this.player.spawnShieldTimer = 4.0; // 4 seconds invulnerability and glowing shield at base

    if (this.player.mesh) {
      this.player.mesh.position.set(spawn.x, -spawn.y, 0);
      this.player.mesh.rotation.z = -this.player.rotation + Math.PI / 2;
      this.scene.add(this.player.mesh);
    }

    // Snap camera smoothly to base spawn location
    this.camera.position.set(spawn.x, -spawn.y, 750);

    this.createExplosionParticles(spawn.x, spawn.y, NATIONS[nation].color, 35);
    window.soundSystem.playUpgrade();
    this.ui.showAnnouncement('Üssünüzden yeniden doğdunuz! (4sn Koruma Aktif)', 3500);

    this.ui.updateHUD(this.player, this.stations);
    this.isPlaying = true;

    if (this.network && this.network.isConnected) {
      this.network.emitRespawn();
    }
  }

  clearWorld() {
    for (const a of this.asteroids) {
      if (a.mesh) this.scene.remove(a.mesh);
    }
    for (const g of this.gems) g.destroy(this.scene);
    for (const l of this.lasers) l.destroy(this.scene);
    for (const p of this.particles) p.destroy(this.scene);
    for (const b of this.bots) b.destroy(this.scene);
    for (const [id, rp] of this.remotePlayers) rp.destroy(this.scene);
    for (const key in this.stations) {
      const st = this.stations[key];
      if (st && st.mesh) this.scene.remove(st.mesh);
    }

    if (this.shootingStars) {
      for (const s of this.shootingStars) {
        if (s.mesh) {
          this.scene.remove(s.mesh);
          if (s.mesh.geometry) s.mesh.geometry.dispose();
          if (s.mesh.material) s.mesh.material.dispose();
        }
      }
      this.shootingStars = [];
    }

    if (this.player) {
      this.player.destroy(this.scene);
      this.player = null;
    }

    this.asteroids = [];
    this.gems = [];
    this.lasers = [];
    this.particles = [];
    this.bots = [];
    this.remotePlayers.clear();
    this.stations = {};
  }

  spawnInitialWorld() {
    // Only spawn offline asteroids if not populated by server
    if (this.asteroids.length === 0) {
      for (let i = 0; i < 130; i++) {
        const tier = (i % 7) + 1;
        this.spawnRandomAsteroid(tier);
      }
    }
    // Bots removed: only real online players participate!
  }

  spawnRandomAsteroid(tier = null) {
    const sizeTier = tier || Math.floor(Math.random() * 7) + 1;
    const dist = 350 + Math.random() * (this.worldSize / 2 - 500);
    const angle = Math.random() * Math.PI * 2;
    const x = Math.cos(angle) * dist;
    const y = Math.sin(angle) * dist;

    const asteroid = new Asteroid(x, y, sizeTier);
    this.asteroids.push(asteroid);
    this.scene.add(asteroid.mesh);
  }

  spawnBot(name, shipKey = 'fly', nation = 'red') {
    // Legacy stub - Bot simulation stripped for human multiplayer
  }

  upgradeStat(statId) {
    if (!this.player || this.player.isDead) return;
    const cfg = UPGRADE_CONFIG.find(u => u.id === statId);
    if (!cfg) return;

    if (this.player.upgrades[statId] < cfg.max && this.player.crystals >= cfg.costPerLevel) {
      this.player.crystals -= cfg.costPerLevel;
      this.player.upgrades[statId]++;
      this.player.recomputeStats();
      this.lastPlayerUpgrades = { ...this.player.upgrades };
      window.soundSystem.playUpgrade();
      if (this.ui) {
        this.ui.updateHUD(this.player, this.stations);
      }
      if (this.network && this.network.isConnected) {
        this.network.sendPlayerState(this.player);
      }
    }
  }

  evolvePlayer(shipKey) {
    if (!this.player || this.player.isDead) return;
    this.player.evolve(shipKey, this.scene);
    this.lastPlayerShipKey = shipKey;
    this.lastPlayerUpgrades = { ...this.player.upgrades };
    window.soundSystem.playTierUp();
    this.createExplosionParticles(this.player.x, this.player.y, NATIONS[this.player.nation].color, 40);
    this.ui.updateHUD(this.player);
    if (this.network && this.network.isConnected) {
      this.network.emitEvolve(shipKey);
    }
  }

  donateToHomeBase() {
    if (!this.player || this.player.isDead || this.player.crystals <= 0) return;
    const homeBase = this.stations[this.player.nation];
    if (!homeBase) return;

    const dist = Math.hypot(this.player.x - homeBase.x, this.player.y - homeBase.y);
    if (dist <= 300) {
      const amount = this.player.crystals;
      this.player.crystals = 0;
      this.player.score += amount * 25;
      this.player.shield = this.player.stats.shieldCap;

      if (this.network && this.network.isConnected) {
        this.network.emitDonateBase(amount);
      } else {
        const result = homeBase.donate(amount);
        if (result.leveledUp) {
          window.soundSystem.playTierUp();
        }
      }

      window.soundSystem.playUpgrade();
      this.createExplosionParticles(homeBase.x, homeBase.y, NATIONS[this.player.nation].color, 25);
      this.ui.updateHUD(this.player);
    }
  }

  createExplosionParticles(x, y, color = 0xff5500, count = 25) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 220;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      const size = 3 + Math.random() * 6;
      const life = 0.3 + Math.random() * 0.5;
      const p = new Particle(x, y, vx, vy, color, size, life);
      this.particles.push(p);
      this.scene.add(p.mesh);
    }
  }

  createLaserHitParticles(x, y, color = 0x00f0ff) {
    for (let i = 0; i < 6; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 60 + Math.random() * 120;
      const p = new Particle(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, color, 3, 0.2);
      this.particles.push(p);
      this.scene.add(p.mesh);
    }
  }

  createHealingParticle(x, y) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 18 + Math.random() * 32;
    const p = new Particle(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, 0x00ff88, 3.5, 0.35);
    this.particles.push(p);
    this.scene.add(p.mesh);
  }

  // Radiant sparkling crystal shattering burst effect ("ganimetlerin görünümünü parçalanması güzel bir parlama efekti koy")
  createCrystalBurstEffect(x, y, count = 12) {
    // 1. Expanding radiant crystal shockwave ring
    const ringGeo = new THREE.RingGeometry(2, 9, 24);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.position.set(x, -y, 3);
    this.scene.add(ringMesh);

    const startTime = performance.now();
    const expandDuration = 380; // ms
    const animateRing = () => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(1.0, elapsed / expandDuration);
      const scale = 1.0 + progress * 4.8;
      ringMesh.scale.set(scale, scale, 1);
      ringMat.opacity = (1 - progress) * 0.9;
      if (progress < 1.0) {
        requestAnimationFrame(animateRing);
      } else {
        this.scene.remove(ringMesh);
        ringGeo.dispose();
        ringMat.dispose();
      }
    };
    requestAnimationFrame(animateRing);

    // 2. Sparkling crystalline jewel shard particles
    const colors = [0xff1550, 0xff5500, 0xff007f, 0x00f0ff, 0xffffff, 0xffd700];
    const shardCount = Math.max(12, Math.min(26, count * 2));
    for (let i = 0; i < shardCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 70 + Math.random() * 220;
      const col = colors[Math.floor(Math.random() * colors.length)];
      const size = 3.5 + Math.random() * 4.5;
      const life = 0.35 + Math.random() * 0.4;
      const p = new Particle(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, col, size, life);
      this.particles.push(p);
      this.scene.add(p.mesh);
    }
  }

  // Sparkling pickup flash on gem collection
  createGemPickupFlash(x, y, value = 1) {
    const isBig = value > 5;
    const col = isBig ? 0xff5500 : 0xff1550;
    for (let i = 0; i < 8; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 85;
      const p = new Particle(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, (i % 2 === 0 ? 0xffffff : col), 3.2, 0.22);
      this.particles.push(p);
      this.scene.add(p.mesh);
    }
  }

  spawnCrystalsFromEntity(x, y, count, totalValue, targetShip = null) {
    this.createCrystalBurstEffect(x, y, count);
    const valEach = Math.max(1, Math.round(totalValue / count));
    for (let i = 0; i < count; i++) {
      const gem = new Gem(x + (Math.random() - 0.5) * 20, y + (Math.random() - 0.5) * 20, valEach, targetShip);
      this.gems.push(gem);
      this.scene.add(gem.mesh);
    }
  }

  handlePlayerInput(dt) {
    if (!this.player || this.player.isDead) return;

    // Rotate player ship towards mouse pointer
    const dx = this.mouseWorld.x - this.player.x;
    const dy = this.mouseWorld.y - this.player.y;
    this.player.targetRotation = Math.atan2(dy, dx);

    // Thrust control: Right click, W, Up Arrow
    this.player.isThrusting = (
      this.keys['MouseRight'] ||
      this.keys['KeyW'] ||
      this.keys['ArrowUp']
    );

    // Reverse / Brake: S, Down Arrow
    if (this.keys['KeyS'] || this.keys['ArrowDown']) {
      this.player.vx *= Math.pow(0.2, dt);
      this.player.vy *= Math.pow(0.2, dt);
    }

    // Fire laser: Left click or Space
    if (this.keys['MouseLeft'] || this.keys['Space']) {
      const newLasers = this.player.tryFire();
      if (newLasers && newLasers.length > 0) {
        newLasers.forEach(laser => {
          this.lasers.push(laser);
          this.scene.add(laser.mesh);
        });
        window.soundSystem.playLaser(newLasers[0].isHeavy);

        if (this.network && this.network.isConnected) {
          this.network.emitFireLasers(newLasers.map(l => ({
            x: Math.round(l.x),
            y: Math.round(l.y),
            vx: Math.round(l.vx),
            vy: Math.round(l.vy),
            damage: l.damage,
            isHeavy: !!l.isHeavy,
            isHealBeam: !!l.isHealBeam,
            color: l.mesh ? (l.nation === 'red' ? 0xff3b5c : (l.nation === 'blue' ? 0x00f0ff : 0xffcc00)) : 0x00f0ff,
            maxRange: l.maxRange
          })));
        }
      }
    }

    // Send player state to server at ~28Hz
    if (this.network && this.network.isConnected) {
      this.network.sendPlayerState(this.player);
    }
  }

  handlePlayerChat(text) {
    if (this.network && this.network.isConnected) {
      this.network.sendChat(text);
    }
  }

  updatePhysicsAndCollisions(dt) {
    // Dynamic background shooting stars & fiery blazing meteors
    this.updateShootingStars(dt);
    this.updateFieryMeteors(dt);

    const allShips = [];
    if (this.player && !this.player.isDead) allShips.push(this.player);
    for (const rp of this.remotePlayers.values()) {
      if (!rp.isDead) allShips.push(rp);
    }

    // Update Remote Players Smooth Interpolation
    for (const rp of this.remotePlayers.values()) {
      rp.updateInterpolation(dt);
    }

    // 1. Update 3 Nation Home Bases
    for (const key in this.stations) {
      const st = this.stations[key];
      st.update(dt, allShips, (laser) => {
        this.lasers.push(laser);
        this.scene.add(laser.mesh);
        // Play turret laser sound ONLY if near player
        const vol = this.getPositionalVolume(laser.x, laser.y, 800);
        if (vol > 0.04) {
          window.soundSystem.playLaser(true, vol * 0.7);
        }
      });
    }

    // Base interaction for player: heal shield and auto-donate in perimeter
    if (this.player && !this.player.isDead) {
      const homeBase = this.stations[this.player.nation];
      if (homeBase) {
        const d = Math.hypot(this.player.x - homeBase.x, this.player.y - homeBase.y);
        if (d <= 250) {
          // Heal friendly ship shield
          this.player.shield = Math.min(this.player.stats.shieldCap, this.player.shield + 60 * dt);
          // Auto donate crystals to base
          if (this.player.crystals > 0) {
            this.donateTimer += dt;
            if (this.donateTimer > 0.15) {
              this.donateTimer = 0;
              const donated = Math.min(5, this.player.crystals);
              this.player.crystals -= donated;
              this.player.score += donated * 25;
              const res = homeBase.donate(donated);
              window.soundSystem.playGemPickup();
              if (res.leveledUp) {
                window.soundSystem.playTierUp();
              }
            }
          }
        }
      }
    }

    // 2. Update Asteroids & permanently remove any dead ones
    for (let i = this.asteroids.length - 1; i >= 0; i--) {
      const a = this.asteroids[i];
      if (a.isDead || a.health <= 0) {
        this.handleAsteroidDestroyed(a, null);
        continue;
      }
      a.update(dt, this.worldSize);
    }

    // 3. Bot simulation removed - pure multiplayer arena with human pilots

    // 4. Update Player
    if (this.player) {
      if (this.player.isDead) {
        if (!this.playerDeadHandled) {
          this.playerDeadHandled = true;
          this.lastPlayerShipKey = this.player.shipKey;
          this.lastPlayerUpgrades = { ...this.player.upgrades };
          this.lastPlayerScore = this.player.score;
          // Scatter 100% of player's crystals on death: 1 drops 1, 300 drops 300!
          this.dropShipCrystals(this.player.x, this.player.y, this.player.crystals || 0);
          this.player.destroy(this.scene);
          this.createExplosionParticles(this.player.x, this.player.y, NATIONS[this.player.nation].color, 50);
          window.soundSystem.playExplosion(true);
          this.ui.showGameOver(this.player);
        }
      } else {
        this.player.update(dt, this.worldSize);
      }
    }

    // 5. Update Lasers & Collisions
    for (let i = this.lasers.length - 1; i >= 0; i--) {
      const laser = this.lasers[i];
      laser.update(dt, this.worldSize);

      if (laser.isDead) {
        laser.destroy(this.scene);
        this.lasers.splice(i, 1);
        continue;
      }

      // Laser vs Asteroids
      let hit = false;
      for (let j = this.asteroids.length - 1; j >= 0; j--) {
        const ast = this.asteroids[j];
        if (ast.isDead || ast.health <= 0) continue;

        const dist = Math.hypot(laser.x - ast.x, laser.y - ast.y);
        if (dist < ast.radius + laser.radius) {
          hit = true;
          this.createLaserHitParticles(laser.x, laser.y, 0xffbb44);
          const hitVol = (laser.ownerId === 'player' || (this.network && laser.ownerId === this.network.myId)) ? 1.0 : this.getPositionalVolume(laser.x, laser.y, 650);
          if (hitVol > 0.04) window.soundSystem.playHit(hitVol);

          if (this.network && this.network.isConnected) {
            this.network.emitHitAsteroid(ast.id, laser.damage);
          } else {
            const destroyed = ast.takeDamage(laser.damage, laser.ownerId);
            if (destroyed) {
              this.handleAsteroidDestroyed(ast, laser.ownerId);
            }
          }

          // Healer life regeneration on hit: "şifacı vurduğu zaman can yeniler"
          if (laser.isHealBeam) {
            const shooter = allShips.find(s => s.id === laser.ownerId);
            if (shooter && !shooter.isDead && shooter.shield < shooter.stats.shieldCap) {
              const selfHeal = Math.max(2, laser.damage * 0.35);
              shooter.shield = Math.min(shooter.stats.shieldCap, shooter.shield + selfHeal);
              this.createHealingParticle(shooter.x, shooter.y);
            }
          }
          break;
        }
      }

      // Laser vs Ships
      if (!hit) {
        for (const ship of allShips) {
          if (ship.isDead || ship.id === laser.ownerId) continue;

          const dist = Math.hypot(laser.x - ship.x, laser.y - ship.y);
          if (dist < ship.radius + laser.radius) {
            // Case 1: Healer shooting own friendly player/ship -> RESTORE HEALTH / SHIELD!
            if (laser.isHealBeam && ship.nation === laser.nation) {
              hit = true;
              const healAmt = laser.damage * 1.6;
              ship.shield = Math.min(ship.stats.shieldCap, ship.shield + healAmt);
              this.createHealingParticle(laser.x, laser.y);
              this.createHealingParticle(ship.x, ship.y);
              const healVol = (ship === this.player || laser.ownerId === 'player') ? 1.0 : this.getPositionalVolume(ship.x, ship.y, 650);
              if (healVol > 0.04) window.soundSystem.playUpgrade();

              // Shooter also regenerates health: "şifacı vurduğu zaman can yeniler"
              const shooter = allShips.find(s => s.id === laser.ownerId);
              if (shooter && !shooter.isDead && shooter.shield < shooter.stats.shieldCap) {
                const selfHeal = Math.max(2, healAmt * 0.35);
                shooter.shield = Math.min(shooter.stats.shieldCap, shooter.shield + selfHeal);
                this.createHealingParticle(shooter.x, shooter.y);
              }

              if ((laser.ownerId === 'player' || (this.network && laser.ownerId === this.network.myId)) && this.player) {
                this.player.score += Math.round(healAmt * 2);
                this.ui.updateHUD(this.player);
              }

              if (this.network && this.network.isConnected) {
                this.network.emitHitPlayer(ship.id, laser.damage, true);
              }
              break;
            }

            // Friendly fire protection for non-healer weapons
            if (ship.nation === laser.nation) continue;

            // Case 2: Laser vs Enemy Ship -> Damage enemy!
            hit = true;
            this.createLaserHitParticles(laser.x, laser.y, NATIONS[ship.nation].color);
            const hitVol = (ship === this.player || laser.ownerId === 'player') ? 1.0 : this.getPositionalVolume(ship.x, ship.y, 650);
            if (hitVol > 0.04) window.soundSystem.playHit(hitVol);

            ship.vx += (laser.vx / ship.mass) * 0.12;
            ship.vy += (laser.vy / ship.mass) * 0.12;

            if (this.network && this.network.isConnected) {
              this.network.emitHitPlayer(ship.id, laser.damage * 0.70, false);
            } else {
              const shipKilled = ship.takeDamage(laser.damage * 0.70);
              if (shipKilled) {
                this.handleShipDestroyed(ship, laser.ownerId);
              }
            }

            // Healer hitting enemy also regenerates health: "şifacı vurduğu zaman can yeniler"
            if (laser.isHealBeam) {
              const shooter = allShips.find(s => s.id === laser.ownerId);
              if (shooter && !shooter.isDead && shooter.shield < shooter.stats.shieldCap) {
                const selfHeal = Math.max(3, laser.damage * 0.4);
                shooter.shield = Math.min(shooter.stats.shieldCap, shooter.shield + selfHeal);
                this.createHealingParticle(shooter.x, shooter.y);
              }
            }
            break;
          }
        }
      }

      // Laser vs Home Bases
      if (!hit) {
        for (const key in this.stations) {
          const station = this.stations[key];
          if (!station || station.isDead) continue;

          const dist = Math.hypot(laser.x - station.x, laser.y - station.y);
          if (dist < station.radius + laser.radius) {
            // Healer shooting friendly home base -> repair base!
            if (laser.isHealBeam && laser.nation === station.nation) {
              hit = true;
              station.hp = Math.min(station.maxHp, station.hp + laser.damage * 2.0);
              this.createHealingParticle(laser.x, laser.y);
              const healVol = (laser.ownerId === 'player') ? 1.0 : this.getPositionalVolume(station.x, station.y, 800);
              if (healVol > 0.04) window.soundSystem.playUpgrade();

              const shooter = allShips.find(s => s.id === laser.ownerId);
              if (shooter && !shooter.isDead && shooter.shield < shooter.stats.shieldCap) {
                shooter.shield = Math.min(shooter.stats.shieldCap, shooter.shield + laser.damage * 0.35);
                this.createHealingParticle(shooter.x, shooter.y);
              }

              if (this.network && this.network.isConnected) {
                this.network.emitHitBase(station.nation, laser.damage, true);
              }
              break;
            }

            if (laser.nation === station.nation) continue; // Friendly-fire protected

            hit = true;
            const stationColor = NATIONS[station.nation] ? NATIONS[station.nation].color : 0xff2244;
            this.createLaserHitParticles(laser.x, laser.y, stationColor);
            const hitVol = (laser.ownerId === 'player') ? 1.0 : this.getPositionalVolume(station.x, station.y, 800);
            if (hitVol > 0.04) window.soundSystem.playHit(hitVol);

            if (this.network && this.network.isConnected) {
              this.network.emitHitBase(station.nation, laser.damage, false);
            } else {
              const destroyed = station.takeDamage(laser.damage);
              if (destroyed) {
                this.handleStationDestroyed(station, laser.ownerId);
              }
            }

            if (laser.isHealBeam) {
              const shooter = allShips.find(s => s.id === laser.ownerId);
              if (shooter && !shooter.isDead && shooter.shield < shooter.stats.shieldCap) {
                shooter.shield = Math.min(shooter.stats.shieldCap, shooter.shield + laser.damage * 0.35);
                this.createHealingParticle(shooter.x, shooter.y);
              }
            }
            break;
          }
        }
      }

      if (hit) {
        laser.destroy(this.scene);
        this.lasers.splice(i, 1);
      }
    }

    // 6. Update Gems & Pickup
    for (let i = this.gems.length - 1; i >= 0; i--) {
      const gem = this.gems[i];
      gem.update(dt, this.worldSize, allShips);

      for (const ship of allShips) {
        if (ship.isDead) continue;
        // User request: "son seviye ve kargo full dolunca daha toplama yapılmasın"
        if (ship.tier >= 4 && ship.crystals >= ship.stats.cargoCapacity) {
          continue;
        }

        const dist = Math.hypot(gem.x - ship.x, gem.y - ship.y);
        const distFromHull = dist - ship.radius - gem.radius;
        if (distFromHull <= 15) {
          if (ship.isPlayer && this.network && this.network.isConnected) {
            this.network.emitCollectCrystal(gem.id);
          } else {
            ship.crystals += gem.value;
            ship.score += gem.value * 10;
            if (ship.isPlayer) {
              window.soundSystem.playGemPickup();
              const currentCfg = SHIP_TREE[ship.shipKey];
              if (ship.crystals >= currentCfg.cargoCapacity && currentCfg.evolvesTo && currentCfg.evolvesTo.length > 0) {
                this.ui.showTierUpDropBanner(ship);
              }
            }

            this.createGemPickupFlash(gem.x, gem.y, gem.value);
            gem.destroy(this.scene);
            this.gems.splice(i, 1);
          }
          break;
        }
      }
    }

    // 7. Ship vs Asteroid Collisions
    for (const ship of allShips) {
      if (ship.isDead) continue;
      for (let j = this.asteroids.length - 1; j >= 0; j--) {
        const ast = this.asteroids[j];
        if (ast.isDead || ast.health <= 0) continue;
        const dx = ship.x - ast.x;
        const dy = ship.y - ast.y;
        const dist = Math.hypot(dx, dy);
        const minDist = ship.radius + ast.radius;

        if (dist < minDist && dist > 0.001) {
          const nx = dx / dist;
          const ny = dy / dist;
          const overlap = minDist - dist;

          // Displace ship (asteroid is completely stationary)
          ship.x += nx * overlap;
          ship.y += ny * overlap;

          const normalVelocity = ship.vx * nx + ship.vy * ny;
          if (normalVelocity < 0) {
            const restitution = 0.7;
            const impulse = -(1 + restitution) * normalVelocity;
            ship.vx += impulse * nx;
            ship.vy += impulse * ny;

            const impactForce = Math.abs(normalVelocity);
            // Metal crash sound on asteroid collision: "gemi asteroide çarpınca metal bir ses çıksın"
            if (impactForce > 20) {
              const colVol = (ship === this.player) ? 1.0 : this.getPositionalVolume(ship.x, ship.y, 650);
              if (colVol > 0.04) {
                window.soundSystem.playMetalCrash(colVol, impactForce);
              }
            }

            if (impactForce > 40) {
              ship.takeDamage(impactForce * 0.05);
              const astDead = ast.takeDamage(impactForce * 0.10, ship.id);
              if (astDead) {
                this.handleAsteroidDestroyed(ast, ship.id);
              }
            }
          }
        }
      }
    }

    // 7b. Ship vs Ship Physical Collisions (friendly and enemy bumping)
    // User request: "kendi ulustaki gemiler ilede çarpışma yapılsın"
    for (let i = 0; i < allShips.length; i++) {
      const s1 = allShips[i];
      if (s1.isDead) continue;
      for (let j = i + 1; j < allShips.length; j++) {
        const s2 = allShips[j];
        if (s2.isDead) continue;

        const dx = s2.x - s1.x;
        const dy = s2.y - s1.y;
        const dist = Math.hypot(dx, dy);
        const minDist = s1.radius + s2.radius;

        if (dist < minDist && dist > 0.001) {
          const nx = dx / dist;
          const ny = dy / dist;
          const overlap = minDist - dist;

          const m1 = s1.mass || 1;
          const m2 = s2.mass || 1;
          const totalMass = m1 + m2;
          const r1 = m2 / totalMass;
          const r2 = m1 / totalMass;

          // Displace ships based on mass
          s1.x -= nx * overlap * r1;
          s1.y -= ny * overlap * r1;
          s2.x += nx * overlap * r2;
          s2.y += ny * overlap * r2;

          const relVx = s2.vx - s1.vx;
          const relVy = s2.vy - s1.vy;
          const normalVel = relVx * nx + relVy * ny;

          if (normalVel < 0) {
            const restitution = 0.65;
            const impulse = -(1 + restitution) * normalVel / ((1 / m1) + (1 / m2));

            s1.vx -= (impulse / m1) * nx;
            s1.vy -= (impulse / m1) * ny;
            s2.vx += (impulse / m2) * nx;
            s2.vy += (impulse / m2) * ny;

            const impactForce = Math.abs(normalVel);
            if (impactForce > 25) {
              const colVol = (s1 === this.player || s2 === this.player) ? 1.0 : this.getPositionalVolume((s1.x + s2.x) / 2, (s1.y + s2.y) / 2, 700);
              if (colVol > 0.04) {
                window.soundSystem.playMetalCrash(colVol, impactForce);
              }
              this.createLaserHitParticles((s1.x + s2.x) / 2, (s1.y + s2.y) / 2, 0xffe088);

              // Friendly ships do not take damage (tactical bumping), enemies take mild collision damage
              if (s1.nation !== s2.nation && impactForce > 60) {
                const s1Dead = s1.takeDamage(impactForce * 0.03);
                const s2Dead = s2.takeDamage(impactForce * 0.03);
                if (s1Dead) this.handleShipDestroyed(s1, s2.id);
                if (s2Dead) this.handleShipDestroyed(s2, s1.id);
              }
            }
          }
        }
      }
    }

    // 8. Update Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.update(dt);
      if (p.isDead) {
        p.destroy(this.scene);
        this.particles.splice(i, 1);
      }
    }

    // Replenish asteroids to 130 across the 10000 arena
    while (this.asteroids.length < 130) {
      this.spawnRandomAsteroid();
    }
  }

  handleAsteroidDestroyed(asteroid, killerId) {
    if (!asteroid) return;

    // Immediately remove 3D mesh and free memory
    if (asteroid.mesh) {
      this.scene.remove(asteroid.mesh);
      if (asteroid.mesh.geometry && typeof asteroid.mesh.geometry.dispose === 'function') {
        asteroid.mesh.geometry.dispose();
      }
      if (asteroid.mesh.material && typeof asteroid.mesh.material.dispose === 'function') {
        asteroid.mesh.material.dispose();
      }
      asteroid.mesh = null;
    }
    asteroid.isDead = true;

    const idx = this.asteroids.indexOf(asteroid);
    if (idx !== -1) {
      this.asteroids.splice(idx, 1);
    }

    // Identify top damager
    const topDamagerId = (typeof asteroid.getTopContributor === 'function' ? asteroid.getTopContributor() : null) || killerId;

    let topShip = null;
    if (this.player && this.player.id === topDamagerId && !this.player.isDead) {
      topShip = this.player;
    } else if (topDamagerId) {
      topShip = this.bots.find(b => b.id === topDamagerId && !b.isDead);
    }

    if (topShip) {
      topShip.score += asteroid.sizeTier * 50;
    }

    this.createExplosionParticles(asteroid.x, asteroid.y, 0x8a7f72, asteroid.sizeTier * 8);
    const expVol = (topShip === this.player) ? 1.0 : this.getPositionalVolume(asteroid.x, asteroid.y, 850);
    if (expVol > 0.04) {
      window.soundSystem.playExplosion(asteroid.sizeTier >= 5, expVol);
    }

    const count = asteroid.crystalCount || (Math.floor(Math.random() * 3) + 1);
    const totalVal = asteroid.crystalTotalValue || count;

    // Check if the top damager (or killer) is right beside the asteroid (within 15 units of hull)
    let collectedDirectly = false;
    if (topShip) {
      const centerDist = Math.hypot(topShip.x - asteroid.x, topShip.y - asteroid.y);
      const hullDist = centerDist - topShip.radius - asteroid.radius;
      if (hullDist <= 15) {
        // User request: "son seviye ve kargo full dolunca daha toplama yapılmasın"
        if (topShip.tier >= 4 && topShip.crystals >= topShip.stats.cargoCapacity) {
          // Do not directly collect crystals if max tier and full cargo
        } else {
          // Player/bot is right next to the asteroid (<= 15 units)
          const spaceLeft = Math.max(0, topShip.stats.cargoCapacity - topShip.crystals);
          const added = Math.min(totalVal, spaceLeft);
          topShip.crystals += added;
          collectedDirectly = true;

          const leftover = totalVal - added;
          if (leftover > 0) {
            const leftoverCount = Math.max(1, Math.min(count, Math.round(count * (leftover / totalVal))));
            this.spawnCrystalsFromEntity(asteroid.x, asteroid.y, leftoverCount, leftover);
          }

          if (topShip.isPlayer) {
            window.soundSystem.playGemPickup();
            const currentCfg = SHIP_TREE[topShip.shipKey];
            if (topShip.crystals >= currentCfg.cargoCapacity && currentCfg.evolvesTo && currentCfg.evolvesTo.length > 0) {
              this.ui.showTierUpDropBanner(topShip);
            }
          }
        }
      }
    }

    // If not within 15 units, drop all crystals as floating gems in space!
    // Ships must fly close (within 15 units) to pick them up.
    if (!collectedDirectly) {
      this.spawnCrystalsFromEntity(asteroid.x, asteroid.y, count, totalVal);
    }

    // Immediately spawn a new random asteroid at a random location
    this.spawnRandomAsteroid();
  }

  dropShipCrystals(x, y, totalCrystals) {
    if (totalCrystals <= 0) return;
    // Exactly totalCrystals are dropped: 1 drops 1, 300 drops 300
    const count = totalCrystals <= 25 ? totalCrystals : Math.min(40, totalCrystals);
    this.createCrystalBurstEffect(x, y, count);
    const baseVal = Math.floor(totalCrystals / count);
    let remainder = totalCrystals % count;
    for (let i = 0; i < count; i++) {
      const val = baseVal + (remainder > 0 ? 1 : 0);
      if (remainder > 0) remainder--;
      const gem = new Gem(x + (Math.random() - 0.5) * 45, y + (Math.random() - 0.5) * 45, val);
      this.gems.push(gem);
      this.scene.add(gem.mesh);
    }
  }

  handleShipDestroyed(ship, killerId) {
    this.createExplosionParticles(ship.x, ship.y, NATIONS[ship.nation].color, 50);
    const expVol = (ship === this.player || killerId === 'player') ? 1.0 : this.getPositionalVolume(ship.x, ship.y, 1000);
    if (expVol > 0.04) {
      window.soundSystem.playExplosion(true, expVol);
    }

    const totalToDrop = Math.max(0, ship.crystals || 0);
    this.dropShipCrystals(ship.x, ship.y, totalToDrop);

    if (this.player && killerId === this.player.id) {
      this.player.score += 350;
    }
  }

  handleStationDestroyed(station, killerId) {
    if (!station || station.isDeadHandled) return;
    station.isDeadHandled = true;
    station.isDead = true;

    if (station.mesh) {
      this.scene.remove(station.mesh);
    }

    const nCfg = NATIONS[station.nation] || NATIONS['red'];
    this.createExplosionParticles(station.x, station.y, nCfg.color, 120);
    window.soundSystem.playExplosion(true);

    if (this.player && killerId === this.player.id) {
      this.player.score += 5000;
    }

    // Broadcast base destruction announcement
    this.ui.showAnnouncement(`⚠️ ${nCfg.name.toUpperCase()} ÜSSÜ İMHA EDİLDİ! ULUS ELENDİ!`, 4500);

    // Check remaining standing home bases
    const remainingNations = Object.keys(this.stations).filter(k => this.stations[k] && !this.stations[k].isDead);
    if (remainingNations.length === 1) {
      const winningNation = remainingNations[0];
      setTimeout(() => {
        this.handleGameWon(winningNation);
      }, 1500);
    } else if (station.nation === this.playerNation) {
      this.ui.showAnnouncement(`⚠️ KENDİ ÜSSÜNÜZ İMHA EDİLDİ! ARTIK YENİDEN DOĞUŞ YOK!`, 5000);
    }
  }

  handleGameWon(winningNation) {
    this.isPlaying = false;
    const isPlayerWin = (winningNation === this.playerNation);
    window.soundSystem.playTierUp();
    this.ui.showVictory(winningNation, isPlayerWin, this.player);
  }

  animate(currentTime) {
    requestAnimationFrame(this.animate);

    const dt = Math.min(0.1, (currentTime - this.lastTime) / 1000);
    this.lastTime = currentTime;

    if (this.isPlaying) {
      this.handlePlayerInput(dt);
      this.updatePhysicsAndCollisions(dt);

      // Camera smoothly tracks player directly from above
      if (this.player && !this.player.isDead) {
        const targetCamX = this.player.x + this.player.vx * 0.3;
        const targetCamY = -this.player.y - this.player.vy * 0.3;
        this.camera.position.x += (targetCamX - this.camera.position.x) * 0.08;
        this.camera.position.y += (targetCamY - this.camera.position.y) * 0.08;
        this.camera.position.z = 750;
        this.camera.rotation.set(0, 0, 0);
        this.camera.quaternion.set(0, 0, 0, 1);
        this.camera.up.set(0, 1, 0);
      }

      // Parallax starfield and celestial bodies follow camera
      if (this.starfield) {
        this.starfield.position.x = this.camera.position.x * 0.85;
        this.starfield.position.y = this.camera.position.y * 0.85;
      }
      if (this.celestialGroup) {
        this.celestialGroup.position.x = this.camera.position.x * 0.90;
        this.celestialGroup.position.y = this.camera.position.y * 0.90;
        if (this.moonMesh) this.moonMesh.rotation.y += dt * 0.012;
        if (this.saturnMesh) this.saturnMesh.rotation.y += dt * 0.016;
        if (this.marsMesh) this.marsMesh.rotation.y += dt * 0.014;
      }

      // Update UI components
      this.ui.updateHUD(this.player, this.stations);
      this.ui.updateRadar(this.player, this.asteroids, this.remotePlayers, this.gems, this.stations, this.worldSize);
      this.ui.updateLeaderboard(this.player, this.remotePlayers);
    } else if (this.isMenuBattle) {
      // Live background cosmic galaxy view
      this.updatePhysicsAndCollisions(dt);

      // Cinematic gentle camera orbit around the cosmic galaxy
      this.menuCamAngle = (this.menuCamAngle || 0) + dt * 0.04;
      this.camera.position.x = Math.sin(this.menuCamAngle) * 380;
      this.camera.position.y = Math.cos(this.menuCamAngle) * 380;
      this.camera.position.z = 750 + Math.sin(this.menuCamAngle * 1.5) * 50;
      this.camera.lookAt(0, 0, 0);

      if (this.starfield) {
        this.starfield.position.x = this.camera.position.x * 0.85;
        this.starfield.position.y = this.camera.position.y * 0.85;
      }
      if (this.celestialGroup) {
        this.celestialGroup.position.x = this.camera.position.x * 0.90;
        this.celestialGroup.position.y = this.camera.position.y * 0.90;
        if (this.moonMesh) this.moonMesh.rotation.y += dt * 0.012;
        if (this.saturnMesh) this.saturnMesh.rotation.y += dt * 0.016;
        if (this.marsMesh) this.marsMesh.rotation.y += dt * 0.014;
      }
    }

    this.renderer.render(this.scene, this.camera);
  }

  // ==========================================
  // MULTIPLAYER NETWORK SYNCHRONIZATION
  // ==========================================
  syncServerAsteroids(serverAsteroids) {
    if (!serverAsteroids || serverAsteroids.length === 0) return;
    for (const a of this.asteroids) {
      if (a.mesh) this.scene.remove(a.mesh);
    }
    this.asteroids = [];

    serverAsteroids.forEach(astData => {
      const ast = new Asteroid(astData.x, astData.y, astData.tier);
      ast.id = astData.id;
      ast.health = astData.health;
      ast.maxHealth = astData.maxHealth;
      ast.radius = astData.radius;
      ast.crystalCount = astData.crystalCount;
      ast.crystalTotalValue = astData.crystalTotalValue;
      ast.isDead = !!astData.isDead;
      if (!ast.isDead) {
        this.asteroids.push(ast);
        this.scene.add(ast.mesh);
      }
    });
  }

  syncServerStations(serverStations) {
    if (!serverStations) return;
    for (const key of ['red', 'blue', 'gold']) {
      const stData = serverStations[key];
      if (stData && this.stations[key]) {
        this.stations[key].hp = stData.hp;
        this.stations[key].maxHp = stData.maxHp;
        this.stations[key].level = stData.level;
        this.stations[key].crystalsDonated = stData.crystalsDonated;
        this.stations[key].crystalsRequired = stData.crystalsRequired;
        this.stations[key].isDead = !!stData.isDead;
      }
    }
  }

  syncServerCrystals(serverCrystals) {
    if (!serverCrystals) return;
    serverCrystals.forEach(c => {
      if (this.gems.some(g => g.id === c.id)) return;
      const gem = new Gem(c.x, c.y, c.value, null);
      gem.id = c.id;
      this.gems.push(gem);
      this.scene.add(gem.mesh);
    });
  }

  syncServerExistingPlayers(existingPlayers) {
    if (!existingPlayers) return;
    existingPlayers.forEach(p => {
      if (p.id === this.network.myId) return;
      this.addRemotePlayer(p);
    });
  }

  onServerJoinSuccess(playerData, spawn) {
    console.log('[GAME] Server onayladı, konumlandırılıyor:', spawn);
    if (this.player) {
      this.player.id = playerData.id;
      this.player.x = spawn.x;
      this.player.y = spawn.y;
      this.player.nation = playerData.nation;
      if (this.player.mesh) {
        this.player.mesh.position.set(spawn.x, -spawn.y, 0);
      }
      this.camera.position.set(spawn.x, -spawn.y, 750);
    }
  }

  syncRemotePlayersTick(playersList) {
    if (!playersList) return;
    const activeIds = new Set();

    playersList.forEach(pData => {
      if (pData.id === this.network.myId) {
        return;
      }
      activeIds.add(pData.id);

      let rp = this.remotePlayers.get(pData.id);
      if (!rp) {
        rp = this.addRemotePlayer(pData);
      }

      if (rp) {
        rp.targetX = pData.x;
        rp.targetY = pData.y;
        rp.targetVx = pData.vx;
        rp.targetVy = pData.vy;
        rp.targetRotation = pData.rotation;
        rp.isThrusting = pData.isThrusting;
        rp.shield = pData.shield;
        rp.energy = pData.energy;
        rp.score = pData.score || 0;
        rp.crystals = pData.crystals || 0;
        rp.isDead = !!pData.isDead;
        rp.spawnShieldTimer = pData.spawnShieldTimer || 0;

        if (pData.shipKey && pData.shipKey !== rp.shipKey) {
          rp.evolve(pData.shipKey, this.scene);
        }
      }
    });

    // Remove any disconnected players not in tick
    for (const [id, rp] of this.remotePlayers) {
      if (!activeIds.has(id)) {
        this.removeRemotePlayer(id);
      }
    }
  }

  addRemotePlayer(pData) {
    if (this.remotePlayers.has(pData.id)) return this.remotePlayers.get(pData.id);
    const rp = new RemotePlayer(pData.id, pData.name, pData.shipKey || 'fly', pData.x, pData.y, pData.nation, this.scene);
    rp.score = pData.score || 0;
    rp.crystals = pData.crystals || 0;
    rp.shield = pData.shield || 170;
    rp.spawnShieldTimer = pData.spawnShieldTimer || 0;
    this.remotePlayers.set(pData.id, rp);
    this.scene.add(rp.mesh);
    return rp;
  }

  removeRemotePlayer(playerId) {
    const rp = this.remotePlayers.get(playerId);
    if (rp) {
      rp.destroy(this.scene);
      this.remotePlayers.delete(playerId);
    }
  }

  spawnRemoteLasers(data) {
    if (!data.lasers) return;
    data.lasers.forEach(l => {
      const laser = new Laser(
        l.x, l.y, l.vx, l.vy, l.damage, l.isHeavy, data.playerId,
        l.color, data.nation, l.maxRange, l.isHealBeam
      );
      this.lasers.push(laser);
      this.scene.add(laser.mesh);
    });

    const vol = this.getPositionalVolume(data.lasers[0].x, data.lasers[0].y, 650);
    if (vol > 0.04) {
      window.soundSystem.playLaser(data.lasers[0].isHeavy, vol * 0.65);
    }
  }

  onRemotePlayerEvolve(playerId, shipKey) {
    const rp = this.remotePlayers.get(playerId);
    if (rp) {
      rp.evolve(shipKey, this.scene);
      this.createExplosionParticles(rp.x, rp.y, NATIONS[rp.nation].color, 35);
    }
  }

  onServerAsteroidDamaged(data) {
    const ast = this.asteroids.find(a => a.id === data.asteroidId);
    if (ast) {
      ast.health = data.health;
      this.createLaserHitParticles(ast.x, ast.y, 0xffbb44);
      const hitVol = this.getPositionalVolume(ast.x, ast.y, 650);
      if (hitVol > 0.04) window.soundSystem.playHit(hitVol);
    }
  }

  onServerAsteroidDestroyed(data) {
    const idx = this.asteroids.findIndex(a => a.id === data.asteroidId);
    if (idx !== -1) {
      const ast = this.asteroids[idx];
      this.createCrystalBurstEffect(data.x, data.y, (data.crystals ? data.crystals.length : 14));
      if (ast.mesh) this.scene.remove(ast.mesh);
      this.asteroids.splice(idx, 1);
    }

    if (Array.isArray(data.crystals)) {
      data.crystals.forEach(c => {
        const gem = new Gem(c.x, c.y, c.value, null);
        gem.id = c.id;
        this.gems.push(gem);
        this.scene.add(gem.mesh);
      });
    }
  }

  onServerAsteroidSpawned(astData) {
    const ast = new Asteroid(astData.x, astData.y, astData.tier);
    ast.id = astData.id;
    ast.health = astData.health;
    ast.maxHealth = astData.maxHealth;
    ast.radius = astData.radius;
    ast.crystalCount = astData.crystalCount;
    ast.crystalTotalValue = astData.crystalTotalValue;
    this.asteroids.push(ast);
    this.scene.add(ast.mesh);
  }

  onServerCrystalCollected(data) {
    const idx = this.gems.findIndex(g => g.id === data.crystalId);
    if (idx !== -1) {
      const gem = this.gems[idx];
      this.createGemPickupFlash(gem.x, gem.y, gem.value);
      gem.destroy(this.scene);
      this.gems.splice(idx, 1);
    }
    if (this.network && data.collectorId === this.network.myId && this.player) {
      this.player.crystals = data.playerCrystals;
      this.player.score = data.playerScore;
      window.soundSystem.playGemPickup();
      this.ui.updateHUD(this.player, this.stations);
    }
  }

  onServerPlayerDamaged(data) {
    if (this.network && data.targetId === this.network.myId && this.player) {
      this.player.shield = data.currentShield;
      this.player.shieldDamageFlash = 0.25;
      window.soundSystem.playHit(1.0);
      this.createLaserHitParticles(this.player.x, this.player.y, NATIONS[this.player.nation].color);
      this.ui.updateHUD(this.player, this.stations);
    } else {
      const rp = this.remotePlayers.get(data.targetId);
      if (rp) {
        rp.shield = data.currentShield;
        rp.shieldDamageFlash = 0.25;
        this.createLaserHitParticles(rp.x, rp.y, NATIONS[rp.nation].color);
        const hitVol = this.getPositionalVolume(rp.x, rp.y, 650);
        if (hitVol > 0.04) window.soundSystem.playHit(hitVol);
      }
    }
  }

  onServerPlayerHealed(data) {
    if (this.network && data.targetId === this.network.myId && this.player) {
      this.player.shield = data.currentShield;
      this.createHealingParticle(this.player.x, this.player.y);
      window.soundSystem.playUpgrade();
      this.ui.updateHUD(this.player, this.stations);
    } else {
      const rp = this.remotePlayers.get(data.targetId);
      if (rp) {
        rp.shield = data.currentShield;
        this.createHealingParticle(rp.x, rp.y);
        const vol = this.getPositionalVolume(rp.x, rp.y, 650);
        if (vol > 0.04) window.soundSystem.playUpgrade();
      }
    }
  }

  onServerPlayerKilled(data) {
    this.createExplosionParticles(data.x, data.y, NATIONS[data.victimNation] ? NATIONS[data.victimNation].color : 0xff3355, 55);
    const vol = this.getPositionalVolume(data.x, data.y, 850);
    if (vol > 0.04) window.soundSystem.playExplosion(true);

    if (Array.isArray(data.crystals)) {
      data.crystals.forEach(c => {
        const gem = new Gem(c.x, c.y, c.value, null);
        gem.id = c.id;
        this.gems.push(gem);
        this.scene.add(gem.mesh);
      });
    }

    if (this.network && data.victimId === this.network.myId && this.player) {
      this.player.isDead = true;
      this.player.shield = 0;
      this.player.crystals = 0;
      this.lastPlayerShipKey = this.player.shipKey;
      this.lastPlayerUpgrades = { ...this.player.upgrades };
      this.lastPlayerScore = this.player.score;
      this.player.destroy(this.scene);
      this.ui.showGameOver(this.player);
    } else {
      const rp = this.remotePlayers.get(data.victimId);
      if (rp) {
        rp.isDead = true;
      }
    }
  }

  onServerPlayerRespawned(data) {
    if (this.network && data.playerId === this.network.myId) {
      // Local player respawn handled by respawnPlayer
    } else {
      const rp = this.remotePlayers.get(data.playerId);
      if (rp) {
        rp.isDead = false;
        rp.x = data.x;
        rp.y = data.y;
        rp.targetX = data.x;
        rp.targetY = data.y;
        rp.shield = 350;
        rp.spawnShieldTimer = 4.0;
        if (rp.mesh) {
          rp.mesh.visible = true;
          rp.mesh.position.set(data.x, -data.y, 0);
        }
      }
    }
  }

  onServerBaseDamaged(data) {
    const base = this.stations[data.nation];
    if (base) {
      base.hp = data.hp;
      base.maxHp = data.maxHp;
      const vol = this.getPositionalVolume(base.x, base.y, 850);
      if (vol > 0.04) window.soundSystem.playHit(vol);
    }
  }

  onServerBaseUpdated(data) {
    const base = this.stations[data.nation];
    if (base) {
      base.hp = data.hp;
      base.maxHp = data.maxHp;
      base.crystalsDonated = data.crystalsDonated;
      base.crystalsRequired = data.crystalsRequired;
      if (data.level && data.level !== base.level) {
        base.level = data.level;
        if (data.leveledUp) {
          window.soundSystem.playTierUp();
          this.createExplosionParticles(base.x, base.y, NATIONS[data.nation].color, 35);
        }
      }
    }
  }

  onServerBaseDestroyed(data) {
    const base = this.stations[data.nation];
    if (base) {
      base.hp = 0;
      base.isDead = true;
      this.createExplosionParticles(base.x, base.y, 0xff2200, 60);
      window.soundSystem.playExplosion(true);
    }
  }
}

// Start Game when DOM ready
window.addEventListener('DOMContentLoaded', () => {
  window.game = new StarblastGame();
});

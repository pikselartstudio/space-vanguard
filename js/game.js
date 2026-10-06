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
    this.worldSize = 10000; // 1.2x shrunken universe arena size (was 12000)
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
      10000
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
    this.refineries = {};
    this.locallyDestroyedAsteroidIds = new Set();

    // 3 Nation Base Locations (Scaled symmetrically for 10000 world size)
    this.baseLocations = {
      blue: { x: 0, y: -2625 },      // South
      red:  { x: -2290, y: 1520 },   // North-West
      gold: { x: 2290, y: 1520 }     // North-East
    };

    // Plan A: 3 Neutral Mining Refineries (Territory Control / King of the Hill)
    this.refineryLocations = {
      alpha: { id: 'alpha', name: 'Rafineri Alfa', letter: 'α', x: 0, y: 2800 },
      beta:  { id: 'beta',  name: 'Rafineri Beta',  letter: 'β', x: -2500, y: -1500 },
      gamma: { id: 'gamma', name: 'Rafineri Gama',  letter: 'γ', x: 2500, y: -1500 }
    };

    // Inputs
    this.keys = {};
    this.mouseWorld = { x: 0, y: 0 };
    this.mouseScreenX = window.innerWidth / 2;
    this.donateTimer = 0;
    this.isAutoDonating = false;
    this.autoDonateTimer = 0;
    this.cameraShakeTimer = 0;
    // Camera Zoom Controls (Mouse wheel roll in/out per user request)
    this.cameraZoomFactor = 1.0;
    this.targetCameraZoomFactor = 1.0;
    this.minZoomFactor = 0.50; // Zoom in close to ship
    this.maxZoomFactor = 1.0;  // Zoom out clamped to normal 1.0 per user request

    // Setup Systems
    if (window.SpaceUniverse) {
      this.universe = new SpaceUniverse(this.scene, this.camera);
      this.universe.init();
    }
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
    if (this.asteroids) {
      for (const a of this.asteroids) {
        if (a && a.mesh) this.scene.remove(a.mesh);
      }
      this.asteroids = [];
    }

    const inGameHud = document.getElementById('in-game-hud');
    if (inGameHud) inGameHud.style.display = 'none';

    // 1. Spawn 3 Home Bases (Deep space background)
    for (const key of ['red', 'blue', 'gold']) {
      const loc = this.baseLocations[key];
      this.stations[key] = new SpaceStation(key, loc.x, loc.y, this.scene);
    }

    // 2. Peaceful 3-Ship Formation Flyby Squadron (Pure deep space, no hanging asteroids)
    this.menuBots = [];
    this.menuSquadronNations = ['red', 'blue', 'gold']; // Starts with Kryos (red)
    this.menuSquadronIndex = 0;
    this.menuSquadron = {
      ships: [],
      active: false,
      delayTimer: 0.3
    };
    this.launchNextMenuSquadron();
  }

  launchNextMenuSquadron() {
    // Clean up previous squadron ships if any
    if (this.menuBots) {
      for (const bot of this.menuBots) {
        if (bot.healthBarGroup) this.scene.remove(bot.healthBarGroup);
        if (bot.mesh) this.scene.remove(bot.mesh);
      }
      this.menuBots = [];
    }

    const nation = this.menuSquadronNations[this.menuSquadronIndex % this.menuSquadronNations.length];
    this.menuSquadronIndex++;

    // Pick random start angle and target exit angle on the opposite hemisphere
    const startAngle = Math.random() * Math.PI * 2;
    const endAngle = startAngle + Math.PI + (Math.random() - 0.5) * 1.0;

    const startRadius = 1200;
    const endRadius = 1200;

    // Slight Y compression to fit 16:9 widescreen camera bounds
    const startX = Math.cos(startAngle) * startRadius;
    const startY = Math.sin(startAngle) * (startRadius * 0.75);

    const endX = Math.cos(endAngle) * endRadius;
    const endY = Math.sin(endAngle) * (endRadius * 0.75);

    const dx = endX - startX;
    const dy = endY - startY;
    const totalDist = Math.hypot(dx, dy);
    const flightAngle = Math.atan2(dy, dx);

    const speed = (235 + Math.random() * 45) * 2; // 2x faster flyby patrol speed

    const ships = [];
    for (let i = 0; i < 3; i++) {
      const ship = new Ship(`menu-sq-${i}`, `PILOT-${i + 1}`, 'fly', startX, startY, false, nation, null);
      ship.isMenuBot = true;
      if (ship.healthBarGroup) {
        this.scene.remove(ship.healthBarGroup);
        ship.healthBarGroup = null;
      }
      ships.push(ship);
      this.scene.add(ship.mesh);
      this.menuBots.push(ship);
    }

    this.menuSquadron = {
      nation,
      ships,
      startX,
      startY,
      endX,
      endY,
      currentX: startX,
      currentY: startY,
      flightAngle,
      speed,
      totalDist,
      distanceTraveled: 0,
      active: true,
      delayTimer: 0
    };
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

      // Hotkey Q: Laser - S1 (Cryo / Buz)
      if (e.code === 'KeyQ') {
        if (this.player && !this.player.isDead) {
          if (this.player.activeWeapon === 'ice') {
            this.player.activeWeapon = 'standard';
            window.soundSystem.playUpgrade();
          } else {
            const ammo = (this.player.elementalAmmo && this.player.elementalAmmo.ice) || 0;
            if (ammo > 0) {
              this.player.activeWeapon = 'ice';
              window.soundSystem.playUpgrade();
            } else if (this.ui) {
              if (window.soundSystem.playHit) window.soundSystem.playHit(0.5);
              this.ui.showAnnouncement('❄️ Laser - S1 cephanesi tükendi! Asteroit parçala.', 2200);
            }
          }
          if (this.ui) this.ui.updateHUD(this.player, this.stations);
        }
        return;
      }

      // Hotkey W: Laser - S2 (Thermal / Alev)
      if (e.code === 'KeyW') {
        if (this.player && !this.player.isDead) {
          if (this.player.activeWeapon === 'fire') {
            this.player.activeWeapon = 'standard';
            window.soundSystem.playUpgrade();
          } else {
            const ammo = (this.player.elementalAmmo && this.player.elementalAmmo.fire) || 0;
            if (ammo > 0) {
              this.player.activeWeapon = 'fire';
              window.soundSystem.playUpgrade();
            } else if (this.ui) {
              if (window.soundSystem.playHit) window.soundSystem.playHit(0.5);
              this.ui.showAnnouncement('🔥 Laser - S2 cephanesi tükendi! Asteroit parçala.', 2200);
            }
          }
          if (this.ui) this.ui.updateHUD(this.player, this.stations);
        }
        return;
      }

      // Hotkey E: Laser - S3 (Void / Karanlık)
      if (e.code === 'KeyE') {
        if (this.player && !this.player.isDead) {
          if (this.player.activeWeapon === 'dark') {
            this.player.activeWeapon = 'standard';
            window.soundSystem.playUpgrade();
          } else {
            const ammo = (this.player.elementalAmmo && this.player.elementalAmmo.dark) || 0;
            if (ammo > 0) {
              this.player.activeWeapon = 'dark';
              window.soundSystem.playUpgrade();
            } else if (this.ui) {
              if (window.soundSystem.playHit) window.soundSystem.playHit(0.5);
              this.ui.showAnnouncement('🌑 Laser - S3 cephanesi tükendi! Asteroit parçala.', 2200);
            }
          }
          if (this.ui) this.ui.updateHUD(this.player, this.stations);
        }
        return;
      }

      // Hotkey [Space]: Warp Dash (Directly active, no credit unlock required)
      if (e.code === 'Space') {
        if (this.player && !this.player.isDead) {
          this.triggerPlayerWarp();
        }
        return;
      }

      // Hotkey [R]: SUPER (Directly active, no credit unlock required)
      if (e.code === 'KeyR') {
        this.triggerPlayerSuper();
        return;
      }

      this.keys[e.code] = true;

      // 1-8 Top Panel Upgrade hotkeys
      if (e.key >= '1' && e.key <= '8') {
        const idx = parseInt(e.key) - 1;
        if (UPGRADE_CONFIG[idx]) {
          this.upgradeStat(UPGRADE_CONFIG[idx].id);
        }
        return;
      }

      // [B] Donate to home base
      if (e.code === 'KeyB') {
        this.donateToHomeBase();
      }

      // [M] Shop (Market) Toggle
      if (e.code === 'KeyM') {
        this.toggleShop();
        return;
      }

      // [Y] Ship Tree Modal Toggle
      if (e.code === 'KeyY') {
        if (this.ui) this.ui.toggleShipTreeModal();
        return;
      }

      // [Escape] closes modals if open
      if (e.code === 'Escape') {
        if (this.ui && this.ui.isShipTreeOpen) {
          this.ui.toggleShipTreeModal(false);
          return;
        }
        if (this.ui && this.ui.isShopOpen) {
          this.toggleShop(false);
          return;
        }
      }

      // RCS & DFRT Drift toggle (Ctrl tuşu ile uzayda sürtünmesiz süzülme)
      if (e.code === 'ControlLeft' || e.code === 'ControlRight') {
        this.toggleDriftMode();
      } else if (e.code === 'ShiftLeft') {
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
      this.mouseScreenX = e.clientX;
      this.mouseScreenY = e.clientY;

      // Convert screen mouse to 3D world coordinates
      const ndcX = (e.clientX / window.innerWidth) * 2 - 1;
      const ndcY = -(e.clientY / window.innerHeight) * 2 + 1;

      if (!this._mouseRaycaster) {
        this._mouseRaycaster = new THREE.Raycaster();
        this._mouseNdc = new THREE.Vector2();
        this._mousePlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
        this._mouseIntersection = new THREE.Vector3();
      }
      this._mouseNdc.set(ndcX, ndcY);
      this._mouseRaycaster.setFromCamera(this._mouseNdc, this.camera);
      this._mouseRaycaster.ray.intersectPlane(this._mousePlane, this._mouseIntersection);

      this.mouseWorld.x = this._mouseIntersection.x;
      this.mouseWorld.y = -this._mouseIntersection.y;
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

      // User request: "radar üzerinde tıklama oluncada ateş etmemeli gemimiz."
      if (this.ui && this.ui.radarCanvas) {
        const rRect = this.ui.radarCanvas.getBoundingClientRect();
        if (e.clientX >= rRect.left && e.clientX <= rRect.right && e.clientY >= rRect.top && e.clientY <= rRect.bottom) {
          return;
        }
      }

      // User request: UI / paneller / butonlara tıklanırken asla ateş etme
      const isUI = e.target.closest(
        '#upgrade-dock, #upgrade-tree-modal, #radar-container, #top-right-hud, ' +
        '#game-chat-box, #top-left-hud, #tactical-action-bar, #leaderboard, ' +
        '#ship-evaluator-bar, #drift-mode-indicator, #base-dock-status, .interactive, button, input, select, .tactical-slot, ' +
        '.stat-upgrade-slot, .eval-btn, .lb-tab, .upgrade-card, .upg-icon-card, .upg-add-btn'
      );
      if (isUI) {
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

    // User request: "farenin roll tuşu gemiye yanaşa bilsin uzaklaşabilsin."
    window.addEventListener('wheel', (e) => {
      if (!this.isPlaying || this.isMenuBattle) return;
      if (e.target && (e.target.closest('#chat-messages') || e.target.closest('#upgrade-cards-grid'))) {
        return;
      }
      e.preventDefault();
      const zoomStep = (e.deltaY > 0 ? 0.08 : -0.08);
      this.targetCameraZoomFactor = Math.max(this.minZoomFactor, Math.min(this.maxZoomFactor, this.targetCameraZoomFactor + zoomStep));
    }, { passive: false });
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  getNationSpawn(nation) {
    const baseLoc = this.baseLocations[nation] || this.baseLocations['blue'];
    const offsetAngle = Math.random() * Math.PI * 2;
    const offsetDist = 280 + Math.random() * 80; // Safely inside 450+120 base docking perimeter, outside 230 hull
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

  triggerWarpSpeedSurge() {
    this.warpSpeedSurgeTimer = 0.55;
  }

  startGame(playerName, chosenNation = 'blue') {
    this.isMenuBattle = false;
    if (this.universe) this.universe.onGameStart();
    window.soundSystem.ensureContext();
    window.soundSystem.startMusic();
    if (this.stations && this.stations[chosenNation] && this.stations[chosenNation].isDead) {
      if (this.ui) this.ui.showNotification("Bu ulusun uzay üssü yok edildi! Başka bir ulus seçiniz.", 3500);
      return false;
    }

    this.playerNation = chosenNation;
    this.lastPlayerShipKey = 'fly';
    this.lastPlayerUpgrades = null;
    this.lastPlayerScore = 0;

    // Clean up temporary projectiles, particles, floating gems and previous player mesh
    for (const l of this.lasers) l.destroy(this.scene);
    for (const p of this.particles) p.destroy(this.scene);
    for (const g of this.gems) g.destroy(this.scene);
    this.lasers = [];
    this.particles = [];
    this.gems = [];
    if (this.player) {
      this.player.destroy(this.scene);
      this.player = null;
    }

    // Clean up menu dogfight ships
    if (this.menuBots) {
      for (const bot of this.menuBots) {
        if (bot.healthBarGroup) {
          this.scene.remove(bot.healthBarGroup);
          bot.healthBarGroup = null;
        }
        if (bot.mesh) this.scene.remove(bot.mesh);
      }
      this.menuBots = [];
    }
    this.menuSquadron = null;

    // Spawn 3 Home Bases if not already present
    for (const key of ['red', 'blue', 'gold']) {
      if (!this.stations[key] || !this.stations[key].mesh) {
        const loc = this.baseLocations[key];
        this.stations[key] = new SpaceStation(key, loc.x, loc.y, this.scene);
      }
    }

    // Spawn 3 Neutral Mining Refineries (Plan A)
    this.initRefineries();

    // Spawn 3 Bots per team (9 bots total: 3 red, 3 blue, 3 gold)
    this.initBots();

    // Spawn player at own nation base
    const spawn = this.getNationSpawn(chosenNation);
    const myId = (this.network && this.network.myId) ? this.network.myId : 'player';
    this.player = new Ship(myId, playerName, 'fly', spawn.x, spawn.y, true, chosenNation, this.scene);
    this.player.spawnShieldTimer = 3.5;
    this.playerDeadHandled = false;
    this.player.createPlayerNameTag(this.scene);
    this.scene.add(this.player.mesh);

    // Snap camera directly to base spawn location and look straight down at player
    this.camera.position.set(spawn.x, -spawn.y, 750);
    this.camera.up.set(0, 1, 0);
    this.camera.lookAt(spawn.x, -spawn.y, 0);

    // Apply cached server asteroids or notify server of join
    if (this.cachedServerAsteroids) {
      this.syncServerAsteroids(this.cachedServerAsteroids);
      this.cachedServerAsteroids = null;
    }
    if (this.network && this.network.isConnected) {
      this.network.joinGame(playerName, chosenNation);
    } else if (this.asteroids.length === 0) {
      this.spawnInitialWorld();
    }

    const startScreen = document.getElementById('start-screen');
    if (startScreen) startScreen.style.display = 'none';
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) loadingScreen.style.display = 'none';

    const inGameHud = document.getElementById('in-game-hud');
    if (inGameHud) inGameHud.style.display = 'block';

    const actionBar = document.getElementById('tactical-action-bar');
    if (actionBar) {
      actionBar.style.display = 'block';
      actionBar.classList.remove('nation-eliminated-filter');
    }

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

    // Respawn with the SAME tier ship, keeping 50% crystals and tactical loadout
    this.player = new Ship(myId, name, shipKey, spawn.x, spawn.y, true, nation, this.scene);
    this.player.isDead = false;
    this.player.createPlayerNameTag(this.scene);
    if (this.lastPlayerUpgrades) {
      this.player.upgrades = { ...this.lastPlayerUpgrades };
      this.player.recomputeStats();
    }
    if (this.lastPlayerScore) {
      this.player.score = this.lastPlayerScore;
    }
    this.player.crystals = 0; // User request: öldükten sonra dirilmede envanter 0a inecek
    this.player.mined = 0;    // User request: pvpde yada çarpmada ölürsede sıfırlanacak
    this.lastRetainedCrystals = 0;
    if (this.lastUnlockedWeapons) {
      this.player.unlockedWeapons = { ...this.lastUnlockedWeapons };
    }
    if (this.lastActiveWeapon) {
      this.player.activeWeapon = this.lastActiveWeapon;
    }
    if (this.lastWarpUnlocked !== undefined) {
      this.player.warpUnlocked = this.lastWarpUnlocked;
    }
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
    const actionBar = document.getElementById('tactical-action-bar');
    if (actionBar) {
      actionBar.style.display = 'block';
      actionBar.classList.remove('nation-eliminated-filter');
    }
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

    if (this.player) {
      this.player.destroy(this.scene);
      this.player = null;
    }
    if (this.universe) this.universe.onMenuReturn();

    this.asteroids = [];
    this.gems = [];
    this.lasers = [];
    this.particles = [];
    this.bots = [];
    this.remotePlayers.clear();
    this.stations = {};
  }

  spawnInitialWorld() {
    // User request: "asteroit sayılarını 1.5 kat artıralım. boş olan harita bölgelerine de asteroit koyalım"
    // 240 deep-space asteroids (1.5x of 160) + 14 beginner asteroids per base + 80 empty rim asteroids
    if (this.asteroids.length === 0) {
      for (let i = 0; i < 240; i++) {
        const tier = (i % 7) + 1;
        this.spawnRandomAsteroid(tier);
      }
      // Base surroundings (14 beginner asteroids per base)
      const baseTiers = [1, 1, 2, 1, 2, 2, 3, 1, 2, 1, 2, 3, 2, 1];
      for (const n of ['blue', 'red', 'gold']) {
        const b = this.baseLocations[n];
        for (const tier of baseTiers) {
          const angle = Math.random() * Math.PI * 2;
          const r = 800 + Math.random() * 550; // Outside 780px base perimeter
          const x = b.x + Math.cos(angle) * r;
          const y = b.y + Math.sin(angle) * r;
          if (this.isInsideExclusionZone(x, y)) continue;
          const ast = new Asteroid(x, y, tier);
          // Beginner base perimeter: predominantly ice (88%), rare fire (12%)
          ast.element = Math.random() < 0.88 ? 'ice' : 'fire';
          this.asteroids.push(ast);
          this.scene.add(ast.mesh);
        }
      }
      // User request: uzayın boş alanlarında da asteroit ekle (soteye farm alanları)
      for (let i = 0; i < 80; i++) {
        const tier = (i % 7) + 1;
        const dist = 2200 + Math.random() * (this.worldSize / 2 - 2300);
        const angle = Math.random() * Math.PI * 2;
        const x = Math.cos(angle) * dist;
        const y = Math.sin(angle) * dist;
        if (this.isInsideExclusionZone(x, y)) continue;
        const ast = new Asteroid(x, y, tier);
        const roll = Math.random();
        ast.element = roll < 0.35 ? 'ice' : (roll < 0.70 ? 'fire' : 'dark');
        this.asteroids.push(ast);
        this.scene.add(ast.mesh);
      }
    }
  }

  isInsideExclusionZone(px, py) {
    const worldSpan = this.worldSize || 10000;
    const halfWorld = worldSpan * 0.5;
    // Check all 3 bases: exclusion radius 780px
    for (const bKey of ['red', 'blue', 'gold']) {
      const b = this.baseLocations[bKey];
      if (!b) continue;
      let dx = Math.abs(px - b.x);
      if (dx > halfWorld) dx = worldSpan - dx;
      let dy = Math.abs(py - b.y);
      if (dy > halfWorld) dy = worldSpan - dy;
      if (Math.hypot(dx, dy) < 780) return true;
    }
    // Check all 3 refineries: exclusion radius 650px
    for (const rKey in this.refineryLocations) {
      const r = this.refineryLocations[rKey];
      if (!r) continue;
      let dx = Math.abs(px - r.x);
      if (dx > halfWorld) dx = worldSpan - dx;
      let dy = Math.abs(py - r.y);
      if (dy > halfWorld) dy = worldSpan - dy;
      if (Math.hypot(dx, dy) < 650) return true;
    }
    return false;
  }

  spawnRandomAsteroid(tier = null) {
    if (this.isMenuBattle) return null;
    const sizeTier = tier || Math.floor(Math.random() * 7) + 1;
    let x = 0, y = 0;
    let attempts = 0;
    do {
      attempts++;
      const dist = 400 + Math.random() * (this.worldSize / 2 - 450);
      const angle = Math.random() * Math.PI * 2;
      x = Math.cos(angle) * dist;
      y = Math.sin(angle) * dist;
    } while (attempts < 25 && this.isInsideExclusionZone(x, y));

    const asteroid = new Asteroid(x, y, sizeTier);
    // Element rarity based on value: Ice common (72%), Fire uncommon (21%), Dark rare (7%)
    const roll = Math.random();
    if (roll < 0.72) {
      asteroid.element = 'ice';
    } else if (roll < 0.93) {
      asteroid.element = 'fire';
    } else {
      asteroid.element = 'dark'; // Precious Dark Matter
    }
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

    // User requirement:
    // "örnek ben seviye 2 gemideyim tüm hepsini 3e kadar yükseltebilirim seviye 1 gemi için maks 2 yapabilirim"
    const shipCfg = SHIP_TREE[this.player.shipKey] || {};
    const maxAllowedByTier = Math.min(cfg.max, (shipCfg.tier || 1) + 1);
    const currentLevel = this.player.upgrades[statId] || 0;

    if (currentLevel >= maxAllowedByTier) {
      if (this.ui) {
        this.ui.showAnnouncement(`⚠️ Bu stat için Seviye ${currentLevel} gemi gereklidir! (Şu anki Gemi: Lv.${shipCfg.tier || 1})`, 2200);
      }
      return;
    }

    // Scaling stat upgrade costs: [30, 50, 80, 120, 180, 260]
    const cost = typeof getUpgradeCost === 'function' ? getUpgradeCost(currentLevel) : (UPGRADE_COSTS[currentLevel] || 50);

    if (currentLevel < cfg.max && this.player.crystals >= cost) {
      this.player.crystals -= cost;
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
    } else if (currentLevel < cfg.max && this.player.crystals < cost) {
      if (this.ui) {
        this.ui.showAnnouncement(`⚠️ Yetersiz kristal! Gereken: ${cost} Kristal (Mevcut: ${this.player.crystals})`, 1800);
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
      this.network.emitEvolve(shipKey, this.player.tier);
    }
  }

  // User request: "baseye geldiğimde otomatik üzerinden boşlalma olmasın b tuşuna basınca 10ar şekilde alsın tekrar b basılınca dursun"
  donateToHomeBase() {
    if (!this.player || this.player.isDead) return;
    const homeBase = this.stations[this.player.nation];
    if (!homeBase || homeBase.isDead) return;

    const basePerimeter = (homeBase.radius || 420) + 180;
    const worldSpan = this.worldSize || 8250;
    const halfWorld = worldSpan * 0.5;
    let dx = Math.abs(this.player.x - homeBase.x);
    if (dx > halfWorld) dx = worldSpan - dx;
    let dy = Math.abs(this.player.y - homeBase.y);
    if (dy > halfWorld) dy = worldSpan - dy;
    const dist = Math.hypot(dx, dy);
    if (dist > basePerimeter) {
      this.isAutoDonating = false;
      if (this.ui) {
        this.ui.showAnnouncement(`⚠️ Üsse bağış yapmak için kendi üssünüzün içine girmelisiniz! (${Math.round(dist)}m uzaktasınız)`, 2500);
      }
      return;
    }

    // Toggle: if already donating, pressing B stops donation
    if (this.isAutoDonating) {
      this.isAutoDonating = false;
      this.autoDonateTimer = 0;
      if (this.ui) {
        this.ui.showAnnouncement('⏸️ Üsse bağış durduruldu.', 2000);
        this.ui.updateHUD(this.player, this.stations);
      }
      return;
    }

    if (this.player.crystals <= 0) {
      if (this.ui) {
        this.ui.showAnnouncement('⚠️ Bağışlanacak kargo bulunmuyor!', 2000);
      }
      return;
    }

    // Start 10-by-10 donation stream!
    this.isAutoDonating = true;
    this.autoDonateTimer = 0;
    this.executeSingleDonationStep();
    if (this.ui) {
      this.ui.showAnnouncement(`🏛️ Üsse bağış başlatıldı (10'ar aktarılıyor... Durdurmak için [B])`, 2500);
    }
  }

  executeSingleDonationStep() {
    if (!this.player || this.player.isDead || this.player.crystals <= 0) {
      this.isAutoDonating = false;
      if (this.ui) this.ui.updateHUD(this.player, this.stations);
      return;
    }
    const homeBase = this.stations[this.player.nation];
    if (!homeBase || homeBase.isDead) {
      this.isAutoDonating = false;
      return;
    }

    const amount = Math.min(10, this.player.crystals);
    this.player.crystals -= amount;
    this.player.score += amount * 25;
    this.player.donations = (this.player.donations || 0) + amount;
    this.player.shield = Math.min(this.player.stats.shieldCap, this.player.shield + amount * 8);

    if (this.network && this.network.isConnected) {
      this.network.emitDonateBase(amount);
    } else {
      const result = homeBase.donate(amount);
      if (result.leveledUp) {
        window.soundSystem.playTierUp();
      }
    }

    if (window.soundSystem) {
      window.soundSystem.playUpgrade();
    }
    this.createExplosionParticles(homeBase.x, homeBase.y, NATIONS[this.player.nation].color, 14);

    if (this.player.crystals <= 0) {
      this.isAutoDonating = false;
      if (this.ui) {
        this.ui.showAnnouncement('✅ Kargo tamamen üsse aktarıldı!', 2500);
      }
    }
    if (this.ui) {
      this.ui.updateHUD(this.player, this.stations);
    }
  }

  // User request: "ctrl nin işlevini tam tersine çevirelim üst panelde açıkken kayma yok kapalıyken kayma var"
  toggleDriftMode(forceState = null) {
    if (!this.player || this.player.isDead) return;
    const newState = (forceState !== null) ? forceState : !this.player.isStabilizerActive;
    this.player.isStabilizerActive = newState;
    this.player.rcsEnabled = newState; // AÇIKKEN rcs ve fren devrede
    if (this.ui) {
      this.ui.updateDriftIndicator(newState);
      const msg = newState
        ? '🛡️ DFRT Sabitleme AÇIK: Kayma yok, otomatik fren devrede.'
        : '🚀 DFRT Sabitleme KAPALI: Kayma var, uzayda sürtünmesiz süzülme aktif!';
      this.ui.showAnnouncement(msg, 2000);
    }
  }

  // Check if player is currently within the friendly home base perimeter
  isPlayerInHomeBase() {
    if (!this.player || this.player.isDead) return false;
    const homeBase = this.stations ? this.stations[this.player.nation] : null;
    if (!homeBase || homeBase.isDead) return false;
    const worldSpan = this.worldSize || 10000;
    const halfWorld = worldSpan * 0.5;
    let dx = Math.abs(this.player.x - homeBase.x);
    if (dx > halfWorld) dx = worldSpan - dx;
    let dy = Math.abs(this.player.y - homeBase.y);
    if (dy > halfWorld) dy = worldSpan - dy;
    const dist = Math.hypot(dx, dy);
    const perimeter = (homeBase.radius || 420) + 120;
    return dist <= perimeter;
  }

  // User request: "shop kısmını base dışında açamayacak oyuncu."
  toggleShop(forceState = null) {
    if (!this.ui) return;
    const insideBase = this.isPlayerInHomeBase();
    const desiredState = (forceState !== null) ? forceState : !this.ui.isShopOpen;

    if (desiredState && !insideBase) {
      this.ui.setShopOpen(false);
      this.ui.showAnnouncement('⚠️ Pazar (SHOP) sadece ana üssünüzün içindeyken açılabilir!', 2500);
      return;
    }

    this.ui.setShopOpen(desiredState);
    if (desiredState) {
      if (window.soundSystem) window.soundSystem.playUpgrade();
      this.ui.showAnnouncement('🛒 Uzay Pazarı (SHOP) Açıldı! [M] veya [ESC] ile kapatabilirsiniz.', 2000);
    } else {
      this.ui.showAnnouncement('🛒 Uzay Pazarı kapatıldı.', 1500);
    }
  }

  // User request: "shop alışverişini base dışında yapamayacak oyuncu."
  purchaseBaseItem(action) {
    if (!this.player || this.player.isDead) return;
    if (!this.isPlayerInHomeBase()) {
      if (this.ui) {
        this.ui.setShopOpen(false);
        this.ui.showAnnouncement('⚠️ Alışveriş yapmak için ana üssünüzün sınırları içinde olmalısınız!', 2500);
      }
      return;
    }

    const homeBase = this.stations[this.player.nation];
    if (!homeBase || homeBase.isDead) return;

    const names = { attack: 'Saldırı Dronu', defense: 'Savunma Dronu', mining: 'Maden Dronu' };

    // Drone purchase and leveling (Max Lv. 3, 500 / 600 / 720 crystals)
    if (action.startsWith('drone_') || action.startsWith('upgrade_drone_')) {
      const droneType = action.replace('upgrade_drone_', '').replace('drone_', ''); // 'attack', 'defense', 'mining'
      if (!this.player.drones) this.player.drones = [];

      const existingDrone = this.player.drones.find(d => d.type === droneType);

      if (existingDrone && (action.startsWith('upgrade_drone_') || existingDrone.level < 3)) {
        if (existingDrone.level >= 3) {
          if (this.ui) this.ui.showAnnouncement(`⭐ ${names[droneType]} zaten maksimum Seviye 3!`, 2200);
          return;
        }
        const upgradeCost = existingDrone.level === 1 ? 300 : 500;
        if (this.player.crystals < upgradeCost) {
          if (this.ui) this.ui.showAnnouncement(`⚠️ Yetersiz kristal! Seviye ${existingDrone.level + 1} yükseltmesi için ${upgradeCost} Kristal gereklidir.`, 2500);
          return;
        }
        this.player.crystals -= upgradeCost;
        existingDrone.setLevel(existingDrone.level + 1);
        window.soundSystem.playUpgrade();
        if (this.ui) {
          this.ui.showAnnouncement(`⬆️ ${names[droneType]} Seviye ${existingDrone.level}'e yükseltildi! (Güç x${(Math.pow(1.2, existingDrone.level - 1)).toFixed(2)})`, 2500);
          this.ui.updateHUD(this.player, this.stations);
        }
        return;
      }

      // Purchase new drone (Sv.1 = 150 Kristal)
      const buyCost = 150;
      if (this.player.crystals < buyCost) {
        if (this.ui) this.ui.showAnnouncement(`⚠️ Yetersiz kristal! Dron satın almak için ${buyCost} Kristal gereklidir.`, 2500);
        return;
      }

      const maxDrones = this.player.maxDrones;
      if (this.player.drones.length >= maxDrones) {
        const old = this.player.drones.shift();
        if (old) old.destroy(this.scene);
      }

      this.player.crystals -= buyCost;
      const drone = new Drone(droneType, this.player.nation, this.scene, 1);
      drone.x = this.player.x;
      drone.y = this.player.y;
      this.player.drones.push(drone);

      window.soundSystem.playUpgrade();
      if (this.ui) {
        this.ui.showAnnouncement(`🛸 ${names[droneType]} (Sv.1) konuşlandırıldı! (${buyCost} Kristal • Kapasite: ${this.player.drones.length}/${maxDrones})`, 2500);
        this.ui.updateHUD(this.player, this.stations);
      }
      return;
    }

    // 100x S1 Cryo Buz Lazeri (250 Kristal • Üs Sv. 1+)
    if (action === 'refill_s1' || action === 'buy_s1') {
      const cost = 250;
      if (homeBase.level < 1) {
        if (this.ui) this.ui.showAnnouncement('⚠️ S1 Buz Lazeri için Ana Üs Seviye 1 olmalıdır!', 2500);
        return;
      }
      if (this.player.crystals < cost) {
        if (this.ui) this.ui.showAnnouncement(`⚠️ Yetersiz kristal! 100x S1 Lazeri için ${cost} Kristal gereklidir.`, 2500);
        return;
      }
      this.player.crystals -= cost;
      if (!this.player.elementalAmmo) this.player.elementalAmmo = { ice: 0, fire: 0, dark: 0 };
      if (!this.player.unlockedWeapons) this.player.unlockedWeapons = {};
      this.player.unlockedWeapons['ice'] = true;
      this.player.elementalAmmo.ice = Math.min(999, (this.player.elementalAmmo.ice || 0) + 100);
      window.soundSystem.playUpgrade();
      if (this.ui) {
        this.ui.showAnnouncement(`❄️ 100x S1 Cryo Buz Lazeri satın alındı! (Mevcut: ${this.player.elementalAmmo.ice} Adet)`, 2500);
        this.ui.updateHUD(this.player, this.stations);
      }
      return;
    }

    // 100x S2 Termal Alev Lazeri (500 Kristal • Üs Sv. 2+)
    if (action === 'refill_s2' || action === 'buy_s2') {
      const cost = 500;
      if (homeBase.level < 2) {
        if (this.ui) this.ui.showAnnouncement(`⚠️ S2 Termal Lazer KİLİTLİ! Ana Üssü Seviye 2'ye yükseltmek için kristal bağışlayın. (Şu anki: Sv.${homeBase.level})`, 3000);
        return;
      }
      if (this.player.crystals < cost) {
        if (this.ui) this.ui.showAnnouncement(`⚠️ Yetersiz kristal! 100x S2 Lazeri için ${cost} Kristal gereklidir.`, 2500);
        return;
      }
      this.player.crystals -= cost;
      if (!this.player.elementalAmmo) this.player.elementalAmmo = { ice: 0, fire: 0, dark: 0 };
      if (!this.player.unlockedWeapons) this.player.unlockedWeapons = {};
      this.player.unlockedWeapons['fire'] = true;
      this.player.elementalAmmo.fire = Math.min(999, (this.player.elementalAmmo.fire || 0) + 100);
      window.soundSystem.playUpgrade();
      if (this.ui) {
        this.ui.showAnnouncement(`🔥 100x S2 Termal Alev Lazeri satın alındı! (Mevcut: ${this.player.elementalAmmo.fire} Adet)`, 2500);
        this.ui.updateHUD(this.player, this.stations);
      }
      return;
    }

    // 100x S3 Void Karanlık Lazeri (750 Kristal • Üs Sv. 3+)
    if (action === 'refill_s3' || action === 'buy_s3') {
      const cost = 750;
      if (homeBase.level < 3) {
        if (this.ui) this.ui.showAnnouncement(`⚠️ S3 Void Lazeri KİLİTLİ! Ana Üssü Seviye 3'e yükseltmek için kristal bağışlayın. (Şu anki: Sv.${homeBase.level})`, 3000);
        return;
      }
      if (this.player.crystals < cost) {
        if (this.ui) this.ui.showAnnouncement(`⚠️ Yetersiz kristal! 100x S3 Lazeri için ${cost} Kristal gereklidir.`, 2500);
        return;
      }
      this.player.crystals -= cost;
      if (!this.player.elementalAmmo) this.player.elementalAmmo = { ice: 0, fire: 0, dark: 0 };
      if (!this.player.unlockedWeapons) this.player.unlockedWeapons = {};
      this.player.unlockedWeapons['dark'] = true;
      this.player.elementalAmmo.dark = Math.min(999, (this.player.elementalAmmo.dark || 0) + 100);
      window.soundSystem.playUpgrade();
      if (this.ui) {
        this.ui.showAnnouncement(`🌑 100x S3 Void Karanlık Lazeri satın alındı! (Mevcut: ${this.player.elementalAmmo.dark} Adet)`, 2500);
        this.ui.updateHUD(this.player, this.stations);
      }
      return;
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

  createLaserHitParticles(x, y, color = 0x00ff44, count = 8) {
    const finalCount = Math.min(count, 10);
    // Safety cap to prevent particle accumulation during sustained combat
    if (this.particles.length > 180) {
      const excess = this.particles.length - 180;
      for (let i = 0; i < excess; i++) {
        const oldP = this.particles.shift();
        if (oldP) oldP.destroy(this.scene);
      }
    }
    for (let i = 0; i < finalCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 70 + Math.random() * 180;
      const size = 2.0 + Math.random() * 2.5;
      const p = new Particle(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, color, size, 0.22);
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

  // User request: "asteorit için yeni eklediğimiz patlama efektini kaldıralım çok kötü oldu. onun yerine aynı ona benzer bir alev partükül patlaması ekleyelim"
  createFieryAsteroidExplosion(x, y, radius = 30) {
    const scaleFactor = Math.max(0.7, radius / 30);

    // 1. Core Thermal Flash: ultra-bright white & sun-gold hot-center particles
    const coreColors = [0xffffff, 0xfff4cc, 0xffdd44, 0xffaa00];
    const coreCount = Math.round(12 * scaleFactor);
    for (let i = 0; i < coreCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = (18 + Math.random() * 65) * scaleFactor;
      const col = coreColors[Math.floor(Math.random() * coreColors.length)];
      const size = (4.0 + Math.random() * 5.0) * scaleFactor;
      const life = 0.22 + Math.random() * 0.28;
      const p = new Particle(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, col, size, life);
      this.particles.push(p);
      this.scene.add(p.mesh);
    }

    // 2. Primary Blazing Flame Eruption: vibrant fiery orange, combustion red & bright gold particles
    const flameColors = [0xff5500, 0xff7700, 0xff3300, 0xee2200, 0xff9900];
    const flameCount = Math.round(18 * scaleFactor);
    for (let i = 0; i < flameCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = (35 + Math.random() * 140) * scaleFactor;
      const col = flameColors[Math.floor(Math.random() * flameColors.length)];
      const size = (3.2 + Math.random() * 4.6) * scaleFactor;
      const life = 0.32 + Math.random() * 0.38;
      const p = new Particle(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, col, size, life);
      this.particles.push(p);
      this.scene.add(p.mesh);
    }

    // 3. Asteroid Rock Shards & Fiery Smoke Embers: bursting stone fragments
    const rockColors = [0x5c4033, 0x3d2b1f, 0x2b1d14, 0x8b5a2b, 0x4a3728];
    const rockCount = Math.round(10 * scaleFactor);
    for (let i = 0; i < rockCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = (25 + Math.random() * 115) * scaleFactor;
      const col = rockColors[Math.floor(Math.random() * rockColors.length)];
      const size = (2.4 + Math.random() * 3.4) * scaleFactor;
      const life = 0.40 + Math.random() * 0.35;
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

  // Heavy physical hit effect on space station structure ("rakibin istasyonuna vurunca istasyon objesine vuruşu hissettirmeli")
  createStationHitEffect(x, y, color = 0xff2244, station = null) {
    if (station) {
      station.shudder = 0.22;
    }
    // 1. Heavy spark shower on the hull impact point
    for (let i = 0; i < 16; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 90 + Math.random() * 220;
      const p = new Particle(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, (i % 2 === 0 ? 0xffffff : color), 3.8, 0.28);
      this.particles.push(p);
      this.scene.add(p.mesh);
    }
    // 2. Expanding shield ripple on the hull surface
    const rippleGeo = new THREE.RingGeometry(3, 14, 20);
    const rippleMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const rippleMesh = new THREE.Mesh(rippleGeo, rippleMat);
    rippleMesh.position.set(x, -y, 2);
    this.scene.add(rippleMesh);

    const startTime = performance.now();
    const duration = 280;
    const animateRipple = () => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(1.0, elapsed / duration);
      const scale = 1.0 + progress * 3.2;
      rippleMesh.scale.set(scale, scale, 1);
      rippleMat.opacity = (1 - progress) * 0.9;
      if (progress < 1.0) {
        requestAnimationFrame(animateRipple);
      } else {
        this.scene.remove(rippleMesh);
        rippleGeo.dispose();
        rippleMat.dispose();
      }
    };
    requestAnimationFrame(animateRipple);
  }

  // User request: "r skilinde ki çember gibi alan falan bunlara gerek yok basit bir partikül bigbang animasyonu yeterli"
  createSuperNovaVisualEffect(x, y, player = null) {
    this.cameraShakeTimer = 0.35;

    // Pure Cosmic Stardust Big Bang Burst (User request: Space and R sounds muted)
    const bigBangColors = [
      0xffffff, // Diamond White
      0x00f0ff, // Ion Cyan
      0xffd700, // Solar Gold
      0xff3b30, // Thermal Flare
      0xc084fc  // Singularity Violet
    ];
    for (let i = 0; i < 95; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 80 + Math.random() * 260;
      const col = bigBangColors[Math.floor(Math.random() * bigBangColors.length)];
      const size = 2.4 + Math.random() * 3.6;
      const life = 0.35 + Math.random() * 0.45;
      const p = new Particle(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, col, size, life);
      this.particles.push(p);
      this.scene.add(p.mesh);
    }
  }

  spawnCrystalsFromEntity(x, y, count, totalValue, targetShip = null, element = 'green') {
    this.createCrystalBurstEffect(x, y, count);
    const valEach = Math.max(1, Math.round(totalValue / count));
    for (let i = 0; i < count; i++) {
      // User request: "asteroitlerden nadir s1,s2,s3 malzemesi çıksın genel olarak yeşil taşlar çıksın lvl için"
      const roll = Math.random();
      let crystalElement = 'green';
      if (roll < 0.07) {
        crystalElement = 'ice';   // Rare Laser - S1 material
      } else if (roll < 0.12) {
        crystalElement = 'fire';  // Rare Laser - S2 material
      } else if (roll < 0.15) {
        crystalElement = 'dark';  // Ultra-rare Laser - S3 material
      } else {
        crystalElement = 'green'; // General Level-Up Green Power Crystals (~85%)
      }
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.5;
      const speed = 40 + Math.random() * 60;
      const bVx = Math.cos(angle) * speed;
      const bVy = Math.sin(angle) * speed;
      const gem = new Gem(x + Math.cos(angle) * 10, y + Math.sin(angle) * 10, valEach, crystalElement, null, bVx, bVy);
      this.gems.push(gem);
      this.scene.add(gem.mesh);
    }
  }

  triggerPlayerWarp() {
    if (!this.player || this.player.isDead) return;
    const ok = this.player.triggerWarpDash((x, y, rot) => {
      // Warp dash trail particles (User request: Space and R sounds muted)
      for (let i = 0; i < 24; i++) {
        const speed = -220 - Math.random() * 260;
        const vx = Math.cos(rot) * speed + (Math.random() - 0.5) * 80;
        const vy = Math.sin(rot) * speed + (Math.random() - 0.5) * 80;
        const p = new Particle(x, y, vx, vy, 0x00f0ff, 5.0, 0.45);
        this.particles.push(p);
        this.scene.add(p.mesh);
      }
    });
    if (ok && this.ui) {
      this.ui.updateHUD(this.player, this.stations);
    }
  }

  triggerPlayerSuper() {
    if (!this.player || this.player.isDead) return;
    const ok = this.player.triggerSuper((novaLaser) => {
      this.lasers.push(novaLaser);
      this.scene.add(novaLaser.mesh);
    });
    if (ok) {
      this.createSuperNovaVisualEffect(this.player.x, this.player.y, this.player);
      if (this.ui) this.ui.updateHUD(this.player, this.stations);
    }
  }

  handlePlayerInput(dt) {
    if (!this.player || this.player.isDead) return;

    // Direct, stable mouse steering relative to screen center (player is always at screen center)
    const screenCenterX = window.innerWidth / 2;
    const screenCenterY = window.innerHeight / 2;
    const screenDx = this.mouseScreenX - screenCenterX;
    const screenDy = this.mouseScreenY - screenCenterY;
    const screenDist = Math.hypot(screenDx, screenDy);

    // Smooth deadzone around player ship (22px): hovering over ship prevents involuntary 180 flips/spins
    if (screenDist > 22) {
      this.player.targetRotation = Math.atan2(screenDy, screenDx);
    }

    // Thrust control: Right click or Up Arrow (KeyW reserved for tactical weapon skill)
    this.player.isThrusting = (
      this.keys['MouseRight'] ||
      this.keys['ArrowUp']
    );

    // Active 3-second sustained warp propulsion visual trail ("space skili 3 saniye itmeli gemiyi")
    if (this.player.warpActiveTimer > 0) {
      const backAngle = this.player.rotation + Math.PI + (Math.random() - 0.5) * 0.45;
      const speed = 140 + Math.random() * 220;
      const px = this.player.x - Math.cos(this.player.rotation) * (this.player.radius + 6);
      const py = this.player.y - Math.sin(this.player.rotation) * (this.player.radius + 6);
      const p = new Particle(px, py, Math.cos(backAngle) * speed + this.player.vx * 0.2, Math.sin(backAngle) * speed + this.player.vy * 0.2, 0x00f0ff, 4.5, 0.28);
      this.particles.push(p);
      this.scene.add(p.mesh);
    }

    // Subtle wingtip aerodynamic slipstream wisps ("kanatlarda hafif çizgisel bir süzülme efekti, aşırı uzamasın")
    const playerSpeed = Math.hypot(this.player.vx, this.player.vy);
    if ((this.player.isThrusting || playerSpeed > 90) && Math.random() < 0.38) {
      const cosR = Math.cos(this.player.rotation);
      const sinR = Math.sin(this.player.rotation);
      const nColor = NATIONS[this.player.nation] ? NATIONS[this.player.nation].color : 0x00f0ff;
      [-1, 1].forEach(side => {
        const wx = this.player.x + (cosR * -5.0 - sinR * (side * 14.6));
        const wy = this.player.y + (sinR * -5.0 + cosR * (side * 14.6));
        const p = new Particle(wx, wy, this.player.vx * 0.12, this.player.vy * 0.12, nColor, 1.8, 0.16);
        this.particles.push(p);
        this.scene.add(p.mesh);
      });
    }

    // Reverse / Brake: S, Down Arrow
    if (this.keys['KeyS'] || this.keys['ArrowDown']) {
      this.player.vx *= Math.pow(0.2, dt);
      this.player.vy *= Math.pow(0.2, dt);
    }

    // Fire laser: Left click or Space (when warp is not active/unlocked)
    const isWantsFire = !!(this.keys['MouseLeft'] || (this.keys['Space'] && !this.player.warpUnlocked));
    this.player.isShooting = isWantsFire;
    if (isWantsFire) {
      const newLasers = this.player.tryFire();
      if (newLasers && newLasers.length > 0) {
        // Track targeted asteroid for mining drone
        let targetedAst = null;
        let minAimDist = 180;
        const mx = this.mouseWorld.x;
        const my = this.mouseWorld.y;
        for (let ai = 0; ai < this.asteroids.length; ai++) {
          const a = this.asteroids[ai];
          if (a && !a.isDead) {
            const dx = Math.abs(a.x - mx);
            const dy = Math.abs(a.y - my);
            if (dx > minAimDist || dy > minAimDist) continue;
            const d = Math.hypot(dx, dy);
            if (d < (a.radius + 70) && d < minAimDist) {
              minAimDist = d;
              targetedAst = a;
            }
          }
        }
        if (targetedAst) {
          this.player.lastTargetAsteroid = targetedAst;
          this.player.lastTargetAsteroidTime = (typeof performance !== 'undefined') ? performance.now() : Date.now();
        }

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
            element: l.element || 'standard',
            color: l.color,
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
    const camLogX = this.camera ? this.camera.position.x : (this.player ? this.player.x : 0);
    const camLogY = this.camera ? -this.camera.position.y : (this.player ? this.player.y : 0);

    const allShips = [];
    if (this.player && !this.player.isDead) allShips.push(this.player);
    for (const rp of this.remotePlayers.values()) {
      if (!rp.isDead) allShips.push(rp);
    }
    for (const b of this.bots) {
      if (!b.isDead) allShips.push(b);
    }

    // Update Remote Players Smooth Interpolation
    for (const rp of this.remotePlayers.values()) {
      rp.updateInterpolation(dt, this.worldSize);
    }

    // 1. Update 3 Nation Home Bases (Rotation, Shudder, Passive Shield Regen - no turret shooting per user request)
    for (const key in this.stations) {
      const st = this.stations[key];
      st.update(dt);
    }

    // 2. Update 3 Neutral Mining Refineries (Plan A - Rings, Core rotation, territory speed boost)
    for (const key in this.refineries) {
      const ref = this.refineries[key];
      if (ref) ref.update(dt);
    }

    // 2a. Neutral Mining Refineries Capture Loop (Plan A - 10s capture, turns to nation color, awards 10 base points)
    if (!this.network || !this.network.isConnected) {
      const worldSpan = this.worldSize || 10000;
      const halfWorld = worldSpan * 0.5;
      for (const rKey in this.refineries) {
        const ref = this.refineries[rKey];
        if (!ref) continue;

        const presentNations = new Set();
        const nationShips = { blue: [], red: [], gold: [] };

        for (const s of allShips) {
          if (s.isDead || !s.nation) continue;
          let dx = Math.abs(s.x - ref.x);
          if (dx > halfWorld) dx = worldSpan - dx;
          let dy = Math.abs(s.y - ref.y);
          if (dy > halfWorld) dy = worldSpan - dy;
          if (Math.hypot(dx, dy) <= 480) {
            presentNations.add(s.nation);
            if (nationShips[s.nation]) nationShips[s.nation].push(s);
          }
        }

        if (presentNations.size === 0) {
          ref.contested = false;
        } else if (presentNations.size > 1) {
          ref.contested = true;
        } else {
          ref.contested = false;
          const occNation = Array.from(presentNations)[0];
          if (ref.controllingNation === occNation) {
            ref.captureProgress = Math.min(100, (ref.captureProgress || 0) + 10 * dt);
          } else if (ref.controllingNation !== null) {
            ref.captureProgress = Math.max(0, (ref.captureProgress || 0) - 10 * dt);
            if (ref.captureProgress <= 0) {
              ref.setControllingNation(null);
            }
          } else {
            // Capturing neutral territory: 10 seconds total (10% per second)
            ref.captureProgress = Math.min(100, (ref.captureProgress || 0) + 10 * dt);
            if (ref.captureProgress >= 100) {
              ref.setControllingNation(occNation);
              // +10 Base Points to nation station
              const st = this.stations[occNation];
              if (st) {
                st.crystalsDonated = (st.crystalsDonated || 0) + 10;
                st.hp = Math.min(st.maxHp, st.hp + 300);
                if (st.crystalsDonated >= st.crystalsRequired && st.level < 5) {
                  st.level++;
                  st.maxHp = st.level * 100000;
                  st.hp = st.maxHp;
                  st.crystalsDonated = 0;
                  st.crystalsRequired = Math.round(st.crystalsRequired * 2.2);
                  if (st.mesh) this.scene.remove(st.mesh);
                  st.mesh = ModelBuilder.createStationMesh(occNation, st.level);
                  st.mesh.position.set(st.x, -st.y, -150);
                  this.scene.add(st.mesh);
                }
              }
              // Award +10 donations to ships inside
              for (const s of (nationShips[occNation] || [])) {
                s.donations = (s.donations || 0) + 10;
                s.score = (s.score || 0) + 250;
              }
              if (this.ui) {
                this.ui.addChatMessage('STRATEJİ', `🚩 [${ref.name}] ${occNation.toUpperCase()} ulusu tarafından ele geçirildi! (+10 Üs Puanı)`, occNation, true);
              }
            }
          }
        }
      }
    }

    // 2b. Update 9 Active Bots (AI stepping, respawn timers, laser shooting)
    for (const b of this.bots) {
      if (b.isDead) {
        b.respawnTimer = (b.respawnTimer || 6.0) - dt;
        if (b.respawnTimer <= 0) {
          const sp = this.getNationSpawn(b.nation);
          b.x = sp.x + (Math.random() - 0.5) * 120;
          b.y = sp.y + (Math.random() - 0.5) * 120;
          b.vx = 0;
          b.vy = 0;
          b.shield = b.stats.shieldCap;
          b.energy = b.stats.energyCap;
          b.isDead = false;
          b.respawnTimer = 0;
          b.spawnShieldTimer = 3.5;
          if (b.mesh) {
            b.mesh.visible = true;
            b.mesh.position.set(b.x, -b.y, 0);
          }
          if (b.healthBarGroup) {
            b.healthBarGroup.visible = true;
            b.healthBarGroup.position.set(b.x, -b.y + b.radius + 18, 4);
          }
        }
        continue;
      }

      // Step Bot AI with 3 roles (miner, fighter, explorer)
      b.updateAI(dt, this.asteroids, allShips, this.gems, this.stations, this.refineries);

      // Fire Bot Lasers
      if (b.isShooting) {
        const botLasers = b.tryFire();
        if (botLasers && botLasers.length > 0) {
          for (const l of botLasers) {
            this.lasers.push(l);
            this.scene.add(l.mesh);
          }
          const fireVol = this.getPositionalVolume(b.x, b.y, 800);
          if (fireVol > 0.03 && window.soundSystem) {
            window.soundSystem.playLaser(b.activeWeapon || 'standard');
          }
        }
      }
    }

    // Territory speed boost (+10% speed within 1200px of refinery controlled by player's nation)
    if (this.player && !this.player.isDead) {
      let nearControlledRefinery = false;
      const worldSpan = this.worldSize || 10000;
      const halfWorld = worldSpan * 0.5;
      for (const key in this.refineries) {
        const ref = this.refineries[key];
        if (ref && ref.controllingNation === this.player.nation) {
          let dx = Math.abs(this.player.x - ref.x);
          if (dx > halfWorld) dx = worldSpan - dx;
          let dy = Math.abs(this.player.y - ref.y);
          if (dy > halfWorld) dy = worldSpan - dy;
          if (Math.hypot(dx, dy) <= 1200) {
            nearControlledRefinery = true;
            break;
          }
        }
      }
      this.player.isRefineryBoosted = nearControlledRefinery;
    }

    // Base interaction for player: heal shield and auto-donate in perimeter
    if (this.player && !this.player.isDead) {
      const homeBase = this.stations[this.player.nation];
      if (homeBase) {
        const worldSpan = this.worldSize || 8250;
        const halfWorld = worldSpan * 0.5;
        let dx = Math.abs(this.player.x - homeBase.x);
        if (dx > halfWorld) dx = worldSpan - dx;
        let dy = Math.abs(this.player.y - homeBase.y);
        if (dy > halfWorld) dy = worldSpan - dy;
        const d = Math.hypot(dx, dy);
        const healPerimeter = (homeBase.radius || 420) + 180;
        if (d <= healPerimeter) {
          // Heal friendly ship shield
          this.player.shield = Math.min(this.player.stats.shieldCap, this.player.shield + 60 * dt);
          // User request: "otomatik üzerinden boşalma olmasın b tuşuna basınca 10ar şekilde alsın tekrar b basılınca dursun"
          if (this.isAutoDonating) {
            if (this.player.crystals <= 0) {
              this.isAutoDonating = false;
              if (this.ui) this.ui.updateHUD(this.player, this.stations);
            } else {
              this.autoDonateTimer = (this.autoDonateTimer || 0) + dt;
              if (this.autoDonateTimer >= 0.40) {
                this.autoDonateTimer = 0;
                this.executeSingleDonationStep();
              }
            }
          }
        } else {
          // If player flew outside base perimeter while donating, cancel donation stream
          if (this.isAutoDonating) {
            this.isAutoDonating = false;
            this.autoDonateTimer = 0;
            if (this.ui) {
              this.ui.showAnnouncement('⚠️ Üs bölgesinden çıkıldığı için bağış durduruldu.', 2000);
              this.ui.updateHUD(this.player, this.stations);
            }
          }
        }
      }
    }

    // 2. Update Asteroids & permanently remove any dead ones
    for (let i = this.asteroids.length - 1; i >= 0; i--) {
      const a = this.asteroids[i];
      if (a.isDead || a.health <= 0) {
        if (!this.network || !this.network.isConnected) {
          this.handleAsteroidDestroyed(a, null);
        } else {
          a.destroy(this.scene);
          this.asteroids.splice(i, 1);
        }
        continue;
      }
      a.update(dt, this.worldSize, camLogX, camLogY);
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
          this.lastUnlockedWeapons = { ...(this.player.unlockedWeapons || {}) };
          this.lastActiveWeapon = this.player.activeWeapon || 'standard';
          this.lastWarpUnlocked = !!this.player.warpUnlocked;

          // User request: öldükten sonra dirilmede envanter 0a inecek
          const totalCrystals = this.player.crystals || 0;
          this.lastRetainedCrystals = 0;
          this.player.mined = 0; // User request: pvpde yada çarpmada ölürsede sıfırlanacak
          this.dropShipCrystals(this.player.x, this.player.y, totalCrystals);

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
      laser.update(dt, this.worldSize, camLogX, camLogY);

      if (laser.isDead) {
        laser.destroy(this.scene);
        this.lasers.splice(i, 1);
        continue;
      }

      // Laser vs Asteroids: Pick the CLOSEST intersecting asteroid along the laser trajectory (never penetrate to background)
      let hit = false;
      let closestAst = null;
      let minHitDistSq = Infinity;

      for (let j = 0; j < this.asteroids.length; j++) {
        const ast = this.asteroids[j];
        if (ast.isDead || ast.health <= 0) continue;

        let ldx = laser.x - ast.x;
        let ldy = laser.y - ast.y;
        if (this.worldSize > 0) {
          ldx -= Math.round(ldx / this.worldSize) * this.worldSize;
          ldy -= Math.round(ldy / this.worldSize) * this.worldSize;
        }
        const checkR = ast.radius + laser.radius;
        // Fast AABB rejection before distance check
        if (Math.abs(ldx) > checkR || Math.abs(ldy) > checkR) continue;

        const distSq = ldx * ldx + ldy * ldy;
        if (distSq < checkR * checkR) {
          const startX = (laser.startX !== undefined) ? laser.startX : laser.x;
          const startY = (laser.startY !== undefined) ? laser.startY : laser.y;
          let odx = startX - ast.x;
          let ody = startY - ast.y;
          if (this.worldSize > 0) {
            odx -= Math.round(odx / this.worldSize) * this.worldSize;
            ody -= Math.round(ody / this.worldSize) * this.worldSize;
          }
          const fromOriginDistSq = odx * odx + ody * ody;
          if (fromOriginDistSq < minHitDistSq) {
            minHitDistSq = fromOriginDistSq;
            closestAst = ast;
          }
        }
      }

      if (closestAst) {
        hit = true;
        const ast = closestAst;
        // Match particle color to laser bolt per user request: "lazer ile ateş ettiğimizde hangi renkse çarptığı yerde partiküllerine ayrılsın"
        const hitCol = (typeof laser.getHitColor === 'function') ? laser.getHitColor() : (laser.color || 0x00ff44);
        this.createLaserHitParticles(laser.x, laser.y, hitCol, 8);
        const hitVol = (laser.ownerId === 'player' || (this.network && laser.ownerId === this.network.myId)) ? 1.0 : this.getPositionalVolume(laser.x, laser.y, 650);
        if (hitVol > 0.04) window.soundSystem.playHit(hitVol);

        // Instant local damage prediction & visual flash feedback
        const destroyedLocally = ast.takeDamage(laser.damage, laser.ownerId);

        // User request: "maden dronu ben ateş ettiğim asteroite atak yapacak"
        if (this.player && (laser.ownerId === 'player' || (this.network && laser.ownerId === this.network.myId) || laser.ownerId === this.player.id)) {
          this.player.lastTargetAsteroid = ast;
          this.player.lastTargetAsteroidTime = (typeof performance !== 'undefined') ? performance.now() : Date.now();
        }

        if (destroyedLocally) {
          if (this.locallyDestroyedAsteroidIds) {
            this.locallyDestroyedAsteroidIds.add(ast.id);
          }
          this.handleAsteroidDestroyed(ast, laser.ownerId);
          if (this.network && this.network.isConnected) {
            this.network.emitHitAsteroid(ast.id, laser.damage, ast.x, ast.y);
          }
        } else if (this.network && this.network.isConnected) {
          this.network.emitHitAsteroid(ast.id, laser.damage, ast.x, ast.y);
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
      }

      // Laser vs Ships
      if (!hit) {
        for (const ship of allShips) {
          if (ship.isDead || ship.id === laser.ownerId) continue;

          let sdx = laser.x - ship.x;
          let sdy = laser.y - ship.y;
          if (this.worldSize > 0) {
            sdx -= Math.round(sdx / this.worldSize) * this.worldSize;
            sdy -= Math.round(sdy / this.worldSize) * this.worldSize;
          }
          const checkR = ship.radius + laser.radius;
          if (Math.abs(sdx) > checkR || Math.abs(sdy) > checkR) continue;
          const distSq = sdx * sdx + sdy * sdy;
          if (distSq < checkR * checkR) {
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
            // Exact laser bolt color disintegration particles
            const hitCol = (typeof laser.getHitColor === 'function') ? laser.getHitColor() : (laser.color || 0x00ff44);
            this.createLaserHitParticles(laser.x, laser.y, hitCol, 8);
            const hitVol = (ship === this.player || laser.ownerId === 'player') ? 1.0 : this.getPositionalVolume(ship.x, ship.y, 650);
            if (hitVol > 0.04) window.soundSystem.playHit(hitVol);

            ship.vx += (laser.vx / ship.mass) * 0.12;
            ship.vy += (laser.vy / ship.mass) * 0.12;

            // Apply Elemental Combat Status Effects!
            if (laser.element === 'ice') {
              if (typeof ship.applyStatusEffect === 'function') {
                ship.applyStatusEffect('freeze', 3.5, 0.40); // 40% slow for 3.5s
              }
            } else if (laser.element === 'fire') {
              if (typeof ship.applyStatusEffect === 'function') {
                ship.applyStatusEffect('burn', 3.5, 8.0); // 8 DPS DoT for 3.5s
              }
            } else if (laser.element === 'dark') {
              // Heavy impulse & void singularity distortion
              ship.vx += (laser.vx / ship.mass) * 0.35;
              ship.vy += (laser.vy / ship.mass) * 0.35;
            }

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

          let bdx = laser.x - station.x;
          let bdy = laser.y - station.y;
          if (this.worldSize > 0) {
            bdx -= Math.round(bdx / this.worldSize) * this.worldSize;
            bdy -= Math.round(bdy / this.worldSize) * this.worldSize;
          }
          const stationHitRadius = station.hullRadius || 230; // Physical structure collision radius
          const checkR = stationHitRadius + laser.radius;
          if (Math.abs(bdx) > checkR || Math.abs(bdy) > checkR) continue;
          const distSq = bdx * bdx + bdy * bdy;
          if (distSq < checkR * checkR) {
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
            // Physical impact feedback: station shudder, metallic clank, sparks, and hull shield ripple!
            this.createStationHitEffect(laser.x, laser.y, stationColor, station);
            const hitCol = (typeof laser.getHitColor === 'function') ? laser.getHitColor() : (laser.color || 0x00ff44);
            this.createLaserHitParticles(laser.x, laser.y, hitCol, 8);
            const hitVol = (laser.ownerId === 'player') ? 1.0 : this.getPositionalVolume(station.x, station.y, 800);
            if (hitVol > 0.04) {
              window.soundSystem.playMetalCrash(hitVol * 0.9, 90);
              window.soundSystem.playHit(hitVol);
            }

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
      gem.update(dt, this.worldSize, allShips, camLogX, camLogY);

      if (gem.isExpired) {
        gem.destroy(this.scene);
        this.gems.splice(i, 1);
        continue;
      }

      for (const ship of allShips) {
        if (ship.isDead) continue;
        if (gem.collectDelay > 0) continue;
        // User request: "asteroitlerden çıkan yeşil renk harici kristaller ilgili lazeri verecek sadece. lazer full miktar olursa yerde kalabilir aksi halde ambar full olsada lazeri ilgilendirdiği için yerden toplanılabilecek."
        const isGreen = (!gem.element || gem.element === 'green');
        if (isGreen) {
          if (ship.crystals >= ship.stats.cargoCapacity) {
            continue; // Yeşil kristal için ambar doluysa yerde kalır
          }
        } else {
          const elem = gem.element;
          const maxCap = (ship.maxElementalAmmo && ship.maxElementalAmmo[elem]) || 150;
          const curAmmo = (ship.elementalAmmo && ship.elementalAmmo[elem]) || 0;
          if (curAmmo >= maxCap) {
            continue; // İlgili lazer zaten full ise yerde kalır
          }
          // Lazer dolu değilse ambar full olsa bile toplanır!
        }

        let gdx = gem.x - ship.x;
        let gdy = gem.y - ship.y;
        if (this.worldSize > 0) {
          gdx -= Math.round(gdx / this.worldSize) * this.worldSize;
          gdy -= Math.round(gdy / this.worldSize) * this.worldSize;
        }
        const dist = Math.hypot(gdx, gdy);
        const distFromHull = dist - ship.radius - gem.radius;
        if (distFromHull <= 18 || dist <= ship.radius + 14) {
          // Immediately destroy and remove crystal locally - guarantees zero crystals get stuck on the ship!
          this.createGemPickupFlash(ship.x, ship.y, gem.value);
          gem.destroy(this.scene);
          this.gems.splice(i, 1);
          ship.mined = (ship.mined || 0) + 1;

          if (isGreen) {
            // Yeşil kristal ambara eklenir
            ship.crystals += gem.value;
            ship.score += gem.value * 15;
            if (ship.isPlayer) {
              const currentCfg = SHIP_TREE[ship.shipKey];
              if (ship.crystals >= currentCfg.cargoCapacity && currentCfg.evolvesTo && currentCfg.evolvesTo.length > 0) {
                this.ui.showTierUpDropBanner(ship);
              }
            }
          } else {
            // Renkli kristal sadece ilgili lazeri doldurur, ambara eklenmez!
            const elem = gem.element;
            if (!ship.elementalAmmo) ship.elementalAmmo = { ice: 0, fire: 0, dark: 0 };
            const maxCap = (ship.maxElementalAmmo && ship.maxElementalAmmo[elem]) || 150;
            const ammoGain = Math.min(2, Math.max(1, Math.round(gem.value || 1)));
            ship.elementalAmmo[elem] = Math.min(maxCap, (ship.elementalAmmo[elem] || 0) + ammoGain);
            ship.score += 20;
          }

          if (ship.isPlayer) {
            window.soundSystem.playGemPickup();
            this.ui.updateHUD(ship, this.stations);
            if (this.network && this.network.isConnected) {
              this.network.emitCollectCrystal(gem.id, gem.x, gem.y);
            }
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
        let dx = ship.x - ast.x;
        let dy = ship.y - ast.y;
        if (this.worldSize > 0) {
          dx -= Math.round(dx / this.worldSize) * this.worldSize;
          dy -= Math.round(dy / this.worldSize) * this.worldSize;
        }
        const minDist = ship.radius + ast.radius;
        if (Math.abs(dx) > minDist || Math.abs(dy) > minDist) continue;
        const dist = Math.hypot(dx, dy);

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
            if (impactForce > 15) {
              const colVol = (ship === this.player) ? 1.0 : this.getPositionalVolume(ship.x, ship.y, 650);
              if (colVol > 0.04) {
                window.soundSystem.playMetalCrash(colVol, impactForce);
              }
              this.createLaserHitParticles(ship.x, ship.y, 0xffbb44);

              // User request: "gemiler asteroitlere çarptığında kalkanları düşmeli ve 0a kadar düşerse envanterdeki malzemeler gökyüzüne çarptığı sürece dağılsın."
              if (ship.shield > 0) {
                const shieldLoss = Math.max(8, impactForce * 0.22);
                ship.shield = Math.max(0, ship.shield - shieldLoss);
                ship.shieldDamageFlash = 0.2;
                if (ship === this.player && this.ui) {
                  this.ui.updateHUD(ship, this.stations);
                }
              } else {
                // Shield is at 0: spill inventory crystals into space as long as colliding!
                if (ship.crystals > 0) {
                  const spillCount = Math.max(1, Math.min(ship.crystals, Math.round(impactForce * 0.08)));
                  this.spillCollisionCrystals(ship, spillCount, nx, ny);
                } else if (impactForce > 45) {
                  // No crystals left at 0 shield: take fatal hull collision damage
                  const isDead = ship.takeDamage(impactForce * 0.15, true);
                  if (isDead) {
                    this.handleShipDestroyed(ship, null);
                  }
                }
              }

              const astDead = ast.takeDamage(impactForce * 0.10, ship.id);
              if (astDead) {
                if (this.locallyDestroyedAsteroidIds) {
                  this.locallyDestroyedAsteroidIds.add(ast.id);
                }
                this.handleAsteroidDestroyed(ast, ship.id);
                if (this.network && this.network.isConnected) {
                  this.network.emitHitAsteroid(ast.id, impactForce * 0.10, ast.x, ast.y);
                }
              }
            }
          }
        }
      }
    }

    // 7b. Ship vs Ship Physical Collisions (friendly and enemy bumping)
    // User request: "kendi ulustaki gemiler ilede çarpışma yapılsın" & "aynı şekilde kişilerle çarpışmada da aynı"
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

            // Tier / mass disparity pushback: heavier/higher-tier ship shoves lighter ship away
            // User request: "gemiler birbirine çarpınca birbirini itmeli örneğin svye3 seviye1 ile çarpışınca 1 i biraz ileri atmalı yani cüsseye göre."
            const tierDiff = (s1.tier || 1) - (s2.tier || 1);
            if (tierDiff !== 0) {
              const shoveSpeed = Math.abs(tierDiff) * 38;
              if (tierDiff > 0) {
                // s1 is heavier, s2 gets shoved forward in direction nx, ny
                s2.vx += nx * shoveSpeed;
                s2.vy += ny * shoveSpeed;
              } else {
                // s2 is heavier, s1 gets shoved backwards (-nx, -ny)
                s1.vx -= nx * shoveSpeed;
                s1.vy -= ny * shoveSpeed;
              }
            }

            const impactForce = Math.abs(normalVel);
            if (impactForce > 18) {
              const colVol = (s1 === this.player || s2 === this.player) ? 1.0 : this.getPositionalVolume((s1.x + s2.x) / 2, (s1.y + s2.y) / 2, 700);
              if (colVol > 0.04) {
                window.soundSystem.playMetalCrash(colVol, impactForce);
              }
              this.createLaserHitParticles((s1.x + s2.x) / 2, (s1.y + s2.y) / 2, 0xffe088);

              // User request: "aynı şekilde kişilerle çarpışmada da aynı"
              // S1 shield reduction or crystal spill
              if (s1.shield > 0) {
                const sLoss1 = Math.max(6, impactForce * 0.18);
                s1.shield = Math.max(0, s1.shield - sLoss1);
                s1.shieldDamageFlash = 0.2;
                if (s1 === this.player && this.ui) this.ui.updateHUD(s1, this.stations);
              } else {
                if (s1.crystals > 0) {
                  const spill1 = Math.max(1, Math.min(s1.crystals, Math.round(impactForce * 0.08)));
                  this.spillCollisionCrystals(s1, spill1, -nx, -ny);
                } else if (impactForce > 50) {
                  const s1Dead = s1.takeDamage(impactForce * 0.15, true);
                  if (s1Dead) this.handleShipDestroyed(s1, s2.id);
                }
              }

              // S2 shield reduction or crystal spill
              if (s2.shield > 0) {
                const sLoss2 = Math.max(6, impactForce * 0.18);
                s2.shield = Math.max(0, s2.shield - sLoss2);
                s2.shieldDamageFlash = 0.2;
                if (s2 === this.player && this.ui) this.ui.updateHUD(s2, this.stations);
              } else {
                if (s2.crystals > 0) {
                  const spill2 = Math.max(1, Math.min(s2.crystals, Math.round(impactForce * 0.08)));
                  this.spillCollisionCrystals(s2, spill2, nx, ny);
                } else if (impactForce > 50) {
                  const s2Dead = s2.takeDamage(impactForce * 0.15, true);
                  if (s2Dead) this.handleShipDestroyed(s2, s1.id);
                }
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

    // Replenish offline asteroids if not connected to server (270 cap, 1.5x increase)
    if (this.isPlaying && !this.isMenuBattle && (!this.network || !this.network.isConnected)) {
      while (this.asteroids.length < 270) {
        this.spawnRandomAsteroid();
      }
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

    // Fiery flaming explosion: "asteorit alevli ateşli bir patlama olarak patlasın."
    this.createFieryAsteroidExplosion(asteroid.x, asteroid.y, asteroid.radius || 28);
    const expVol = ((topShip === this.player) ? 0.40 : this.getPositionalVolume(asteroid.x, asteroid.y, 850) * 0.40);
    if (expVol > 0.02 && window.soundSystem) {
      window.soundSystem.playExplosion(false, expVol);
    }

    const count = Math.max(2, asteroid.crystalCount || (Math.floor(Math.random() * 3) + 2));
    const totalVal = Math.max(count * 2, asteroid.crystalTotalValue || (count * 3));

    // User request: "her asteroitten içerik düşmeli bazılarından nedense düşmüyor."
    // Always spawn incandescent mini-asteroid chunks directly into space for pickup
    this.spawnCrystalsFromEntity(asteroid.x, asteroid.y, count, totalVal, null, asteroid.element || 'green');

    // Only replenish local asteroid if running offline
    if (!this.network || !this.network.isConnected) {
      this.spawnRandomAsteroid();
    }
  }

  dropShipCrystals(x, y, totalCrystals) {
    if (totalCrystals <= 0) return;
    const count = totalCrystals <= 25 ? totalCrystals : Math.min(40, totalCrystals);
    this.createCrystalBurstEffect(x, y, count);
    const baseVal = Math.floor(totalCrystals / count);
    let remainder = totalCrystals % count;
    for (let i = 0; i < count; i++) {
      const val = baseVal + (remainder > 0 ? 1 : 0);
      if (remainder > 0) remainder--;
      const gem = new Gem(x + (Math.random() - 0.5) * 45, y + (Math.random() - 0.5) * 45, val, 'green');
      this.gems.push(gem);
      this.scene.add(gem.mesh);
    }
  }

  // User request: "gemiler asteroitlere çarptığında kalkanları düşmeli ve 0a kadar düşerse envanterdeki malzemeler gökyüzüne çarptığı sürece dağılsın. aynı şekilde kişilerle çarpışmada da aynı."
  spillCollisionCrystals(ship, count, pushDirX = 0, pushDirY = 0) {
    if (!ship || ship.crystals <= 0 || count <= 0) return;
    const actualSpill = Math.min(ship.crystals, count);
    ship.crystals -= actualSpill;

    if (ship === this.player && this.ui) {
      this.ui.updateHUD(ship, this.stations);
    }

    const vol = (ship === this.player) ? 0.9 : this.getPositionalVolume(ship.x, ship.y, 650);
    if (vol > 0.05 && window.soundSystem) {
      window.soundSystem.playGemPickup();
    }

    for (let i = 0; i < actualSpill; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 75 + Math.random() * 115;
      const gx = ship.x + (Math.random() - 0.5) * 16;
      const gy = ship.y + (Math.random() - 0.5) * 16;
      const gem = new Gem(gx, gy, 1, 'green');
      gem.vx = pushDirX * speed * 0.7 + Math.cos(angle) * (speed * 0.4);
      gem.vy = pushDirY * speed * 0.7 + Math.sin(angle) * (speed * 0.4);
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

    // Exactly 50% crystals drop on death per user specification
    const totalToDrop = Math.floor(Math.max(0, ship.crystals || 0) * 0.5);
    this.dropShipCrystals(ship.x, ship.y, totalToDrop);

    // Track PvP Kills for Leaderboard
    if (this.player && killerId === this.player.id) {
      this.player.score += 350;
      this.player.kills = (this.player.kills || 0) + 1;
    } else if (killerId) {
      const killerBot = this.bots.find(b => b.id === killerId);
      if (killerBot) {
        killerBot.score += 350;
        killerBot.kills = (killerBot.kills || 0) + 1;
      }
    }

    if (ship !== this.player) {
      ship.isDead = true;
      ship.respawnTimer = 6.0;
      if (ship.mesh) ship.mesh.visible = false;
      if (ship.healthBarGroup) ship.healthBarGroup.visible = false;
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

    // Eliminate remote players belonging to the fallen nation
    if (this.remotePlayers) {
      for (const [id, rp] of this.remotePlayers) {
        if (rp.nation === station.nation) {
          rp.isDead = true;
          if (rp.mesh) this.scene.remove(rp.mesh);
        }
      }
    }

    // If player's own home base is destroyed, player team is eliminated!
    // ("oyunda bir ulusun üssü patlarsa o takım oyundan düşecek ve ekran bulanıklaşıp doygunluğu %80 düşecek ulusunuz yok oldu... yazacak sadece.")
    if (station.nation === this.playerNation) {
      this.isPlaying = false;
      if (this.player) {
        this.player.isDead = true;
      }
      setTimeout(() => {
        this.ui.showNationEliminated();
      }, 700);
      return;
    }

    // Broadcast base destruction announcement to surviving players
    this.ui.showAnnouncement(`⚠️ ${nCfg.name.toUpperCase()} ÜSSÜ İMHA EDİLDİ! ULUS ELENDİ!`, 4500);

    // Check remaining standing home bases
    const remainingNations = Object.keys(this.stations).filter(k => this.stations[k] && !this.stations[k].isDead);
    if (remainingNations.length === 1) {
      const winningNation = remainingNations[0];
      setTimeout(() => {
        this.handleGameWon(winningNation);
      }, 1500);
    }
  }

  handleGameWon(winningNation, countdownSeconds = 8) {
    this.isPlaying = false;
    if (this.player) {
      this.player.isDead = true;
    }
    const isPlayerWin = (winningNation === this.playerNation);
    window.soundSystem.playTierUp();
    this.ui.showVictory(winningNation, isPlayerWin, this.player, countdownSeconds);
  }

  animate(currentTime) {
    requestAnimationFrame(this.animate);

    const dt = Math.min(0.1, (currentTime - this.lastTime) / 1000);
    this.lastTime = currentTime;

    if (this.isPlaying) {
      try {
        this.handlePlayerInput(dt);
        this.updatePhysicsAndCollisions(dt);
      } catch (err) {
        console.error('[GAME LOOP ERROR]:', err);
      }

      // Camera smoothly tracks player directly from above with tactical screen shake
      if (this.player && !this.player.isDead) {
        let shakeX = 0;
        let shakeY = 0;
        if (this.cameraShakeTimer > 0) {
          this.cameraShakeTimer -= dt;
          const shakeMag = (this.cameraShakeTimer / 0.35) * 12;
          shakeX = (Math.random() - 0.5) * shakeMag;
          shakeY = (Math.random() - 0.5) * shakeMag;
        }
        const targetCamX = this.player.x + this.player.vx * 0.3 + shakeX;
        const targetCamY = -this.player.y - this.player.vy * 0.3 + shakeY;

        // Toroidal camera wrap handling: prevent camera from sweeping across entire arena when player wraps
        if (this.worldSize) {
          const half = this.worldSize * 0.5;
          if (targetCamX - this.camera.position.x > half) {
            this.camera.position.x += this.worldSize;
          } else if (targetCamX - this.camera.position.x < -half) {
            this.camera.position.x -= this.worldSize;
          }
          if (targetCamY - this.camera.position.y > half) {
            this.camera.position.y += this.worldSize;
          } else if (targetCamY - this.camera.position.y < -half) {
            this.camera.position.y -= this.worldSize;
          }
        }

        const distToCam = Math.hypot(targetCamX - this.camera.position.x, targetCamY - this.camera.position.y);
        if (distToCam > 1200) {
          this.camera.position.x = targetCamX;
          this.camera.position.y = targetCamY;
        } else {
          this.camera.position.x += (targetCamX - this.camera.position.x) * 0.12;
          this.camera.position.y += (targetCamY - this.camera.position.y) * 0.12;
        }

        // Smooth Mouse Wheel Zoom (Roll tuşu ile gemiye yanaşma/uzaklaşma)
        this.cameraZoomFactor += (this.targetCameraZoomFactor - this.cameraZoomFactor) * 0.12;
        const baseCamZ = Math.max(750, 600 + (this.player.radius || 18) * 6.5);
        const targetCamZ = baseCamZ * this.cameraZoomFactor;
        this.camera.position.z += (targetCamZ - this.camera.position.z) * 0.12;
        this.camera.up.set(0, 1, 0);
        this.camera.lookAt(this.camera.position.x, this.camera.position.y, 0);
      }

      // Update background universe with flight parallax, infinite star tiling, and flight dust
      if (this.universe) {
        this.universe.updateGame(dt, this.camera, this.player);
      }

      // Update UI components
      this.ui.updateHUD(this.player, this.stations);
      this.ui.updateRadar(this.player, this.asteroids, this.remotePlayers, this.gems, this.stations, this.worldSize);
      this.ui.updateLeaderboard(this.player, this.remotePlayers);
    } else if (this.isMenuBattle) {
      // Live background cosmic galaxy view
      this.updateMenuBots(dt);

      // Cinematic gentle floating camera
      this.menuCamAngle = (this.menuCamAngle || 0) + dt * 0.05;
      this.camera.position.x = Math.sin(this.menuCamAngle * 0.4) * 60;
      this.camera.position.y = Math.cos(this.menuCamAngle * 0.3) * 40;
      this.camera.position.z = 760;
      this.camera.lookAt(this.camera.position.x * 0.25, this.camera.position.y * 0.25, 0);

      // Continuous upwards drift through cosmic space ("sürekli yukarı doğru kayıyor gibi olsun uzayda boşlukta akıyor gibi")
      if (this.warpSpeedSurgeTimer > 0) {
        this.warpSpeedSurgeTimer -= dt;
      }
      const targetSpeed = (this.warpSpeedSurgeTimer > 0) ? 320 : 65;
      this.currentDriftSpeed = THREE.MathUtils.lerp(this.currentDriftSpeed || 65, targetSpeed, dt * 8);
      const driftSpeed = this.currentDriftSpeed;

      // Update dedicated universe in menu drift mode
      if (this.universe) {
        this.universe.updateMenu(dt, driftSpeed);
      }
    }

    this.renderer.render(this.scene, this.camera);
  }

  updateMenuBots(dt) {
    if (!this.isMenuBattle || !this.menuSquadron) return;

    // Handle delay between squad runs
    if (!this.menuSquadron.active) {
      this.menuSquadron.delayTimer -= dt;
      if (this.menuSquadron.delayTimer <= 0) {
        this.launchNextMenuSquadron();
      }
      return;
    }

    const sq = this.menuSquadron;
    sq.distanceTraveled += sq.speed * dt;
    const progress = sq.distanceTraveled / sq.totalDist;

    // Check if squadron has completely passed and exited the screen
    if (progress >= 1.0) {
      if (sq.ships) {
        for (const ship of sq.ships) {
          if (ship.mesh) ship.mesh.visible = false;
        }
      }
      sq.active = false;
      sq.delayTimer = 1.0 + Math.random() * 0.8; // Brief cinematic pause between formations
      return;
    }

    // Leader position along straight path
    sq.currentX = sq.startX + (sq.endX - sq.startX) * progress;
    sq.currentY = sq.startY + (sq.endY - sq.startY) * progress;

    const angle = sq.flightAngle;
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);

    // Arrowhead / Wedge 3-ship formation:
    // Leader (0): tip
    // Left Wing (1): back 42, left 38
    // Right Wing (2): back 42, right 38
    const formationOffsets = [
      { fwd: 0, lat: 0 },
      { fwd: -42, lat: 38 },
      { fwd: -42, lat: -38 }
    ];

    for (let i = 0; i < sq.ships.length; i++) {
      const ship = sq.ships[i];
      if (!ship || !ship.mesh) continue;

      const off = formationOffsets[i];
      const posX = sq.currentX + cosA * off.fwd - sinA * off.lat;
      const posY = sq.currentY + sinA * off.fwd + cosA * off.lat;

      ship.x = posX;
      ship.y = posY;
      ship.rotation = angle;

      ship.mesh.visible = true;
      ship.mesh.position.set(posX, -posY, 0);
      ship.mesh.rotation.z = -angle + Math.PI / 2;

      // Active engine thruster flame
      if (ship.engineFlame) {
        ship.engineFlame.visible = true;
        const flamePulse = 1.0 + Math.sin(Date.now() * 0.025 + i * 1.5) * 0.25;
        ship.engineFlame.scale.set(1.0, flamePulse, 1.0);
      }
    }
  }

  // ==========================================
  // MULTIPLAYER NETWORK SYNCHRONIZATION
  // ==========================================
  syncServerAsteroids(serverAsteroids) {
    if (!serverAsteroids || !Array.isArray(serverAsteroids)) return;

    if (this.isMenuBattle) {
      // While on main start screen, store server asteroids in cache but DO NOT spawn/show them in the scene!
      this.cachedServerAsteroids = serverAsteroids;
      return;
    }

    const currentMap = new Map();
    this.asteroids.forEach(a => currentMap.set(a.id, a));

    const updatedList = [];
    const serverIdSet = new Set();

    serverAsteroids.forEach(astData => {
      serverIdSet.add(astData.id);
      let ast = currentMap.get(astData.id);

      if (ast) {
        ast.health = astData.health;
        ast.maxHealth = astData.maxHealth;
        ast.x = astData.x;
        ast.y = astData.y;
        if (astData.element) ast.element = astData.element;
        ast.isDead = !!astData.isDead;
        if (ast.mesh) ast.mesh.visible = !ast.isDead;
        if (!ast.isDead) updatedList.push(ast);
      } else if (!astData.isDead) {
        ast = new Asteroid(astData.x, astData.y, astData.tier, astData.id, astData.element || 'ice');
        ast.health = astData.health;
        ast.maxHealth = astData.maxHealth;
        ast.radius = astData.radius;
        ast.crystalCount = astData.crystalCount;
        ast.crystalTotalValue = astData.crystalTotalValue;
        updatedList.push(ast);
        this.scene.add(ast.mesh);
      }
    });

    for (const [id, a] of currentMap) {
      if (!serverIdSet.has(id)) {
        a.destroy(this.scene);
      }
    }

    this.asteroids = updatedList;
  }

  syncServerStations(serverStations) {
    if (!serverStations) return;
    for (const key of ['red', 'blue', 'gold']) {
      const stData = serverStations[key];
      if (stData) {
        if (!this.stations[key] || !this.stations[key].mesh || !this.stations[key].mesh.parent) {
          const loc = this.baseLocations[key];
          this.stations[key] = new SpaceStation(key, loc.x, loc.y, this.scene);
        }
        this.stations[key].hp = stData.hp;
        this.stations[key].maxHp = stData.maxHp;
        this.stations[key].level = stData.level;
        this.stations[key].crystalsDonated = stData.crystalsDonated;
        this.stations[key].crystalsRequired = stData.crystalsRequired;
        this.stations[key].isDead = !!stData.isDead;
        this.stations[key].isDeadHandled = !!stData.isDead;
        if (this.stations[key].mesh) {
          this.stations[key].mesh.visible = !stData.isDead;
        }
      }
    }
  }

  initRefineries() {
    if (!this.refineries) this.refineries = {};
    for (const key of ['alpha', 'beta', 'gamma']) {
      const loc = this.refineryLocations[key];
      if (loc && (!this.refineries[key] || !this.refineries[key].mesh || !this.refineries[key].mesh.parent)) {
        this.refineries[key] = new MiningRefinery(loc.id, loc.name, loc.letter, loc.x, loc.y, this.scene);
      }
    }
  }

  initBots() {
    // Clean up existing bots
    for (const b of this.bots) {
      if (b.healthBarGroup) {
        this.scene.remove(b.healthBarGroup);
        b.healthBarGroup = null;
      }
      if (b.mesh) this.scene.remove(b.mesh);
    }
    this.bots = [];

    // User request: 3 teams x 3 bots = 9 bots total with varied autonomous roles
    const botConfigs = [
      // Red Team: Kryos (Mars)
      { id: 'bot-red-1', name: 'Kryos-Avcı', nation: 'red', role: 'fighter', shipKey: 'fly' },
      { id: 'bot-red-2', name: 'Kryos-Muhafız', nation: 'red', role: 'miner', shipKey: 'fly' },
      { id: 'bot-red-3', name: 'Kryos-Öncü', nation: 'red', role: 'explorer', shipKey: 'fly' },

      // Blue Team: Veylar (Earth)
      { id: 'bot-blue-1', name: 'Veylar-Gözcü', nation: 'blue', role: 'explorer', shipKey: 'fly' },
      { id: 'bot-blue-2', name: 'Veylar-Savaşçı', nation: 'blue', role: 'fighter', shipKey: 'fly' },
      { id: 'bot-blue-3', name: 'Veylar-Mühendis', nation: 'blue', role: 'miner', shipKey: 'fly' },

      // Gold Team: Aethel (Saturn)
      { id: 'bot-gold-1', name: 'Aethel-Şahin', nation: 'gold', role: 'fighter', shipKey: 'fly' },
      { id: 'bot-gold-2', name: 'Aethel-Titan', nation: 'gold', role: 'miner', shipKey: 'fly' },
      { id: 'bot-gold-3', name: 'Aethel-Maden', nation: 'gold', role: 'explorer', shipKey: 'fly' }
    ];

    for (const cfg of botConfigs) {
      const spawn = this.getNationSpawn(cfg.nation);
      const offsetX = (Math.random() - 0.5) * 160;
      const offsetY = (Math.random() - 0.5) * 160;
      const bot = new BotShip(cfg.id, cfg.name, cfg.shipKey, spawn.x + offsetX, spawn.y + offsetY, cfg.nation, this.scene, cfg.role);
      bot.createPlayerNameTag(this.scene);
      this.bots.push(bot);
    }
  }

  syncServerRefineries(serverRefineries) {
    if (!serverRefineries) return;
    this.initRefineries();
    const list = Array.isArray(serverRefineries) ? serverRefineries : Object.values(serverRefineries);
    list.forEach(rData => {
      if (!rData || !rData.id) return;
      const ref = this.refineries[rData.id];
      if (ref) {
        ref.setControllingNation(rData.controllingNation);
        ref.captureProgress = rData.captureProgress || 0;
        ref.contested = !!rData.contested;
      }
    });
  }

  syncServerCrystals(serverCrystals) {
    if (!serverCrystals || this.isMenuBattle) return;
    serverCrystals.forEach(c => {
      if (this.gems.some(g => g.id === c.id)) return;
      const gem = new Gem(c.x, c.y, c.value, null);
      gem.id = c.id;
      this.gems.push(gem);
      this.scene.add(gem.mesh);
    });
  }

  removeExpiredCrystals(crystalIds) {
    if (!Array.isArray(crystalIds)) return;
    const idSet = new Set(crystalIds);
    for (let i = this.gems.length - 1; i >= 0; i--) {
      const g = this.gems[i];
      if (idSet.has(g.id)) {
        g.destroy(this.scene);
        this.gems.splice(i, 1);
      }
    }
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

      const newNation = playerData.nation;
      if (newNation && this.player.nation !== newNation) {
        console.log(`[GAME] Takım dengelendi: ${this.player.nation} -> ${newNation}. Gemi modeli güncelleniyor.`);
        this.playerNation = newNation;
        if (typeof this.player.setNation === 'function') {
          this.player.setNation(newNation, this.scene);
        } else {
          this.player.nation = newNation;
        }
        if (this.ui) {
          const nCfg = NATIONS[newNation] || NATIONS['blue'];
          this.ui.showNotification(`Takım dengesi sağlandı: ${nCfg.name} filosuna atandınız!`, 4000);
          this.ui.addChatMessage('KOMUTA MERKEZİ', `Dengeleme protokolü: ${nCfg.name} filosuna aktarıldınız!`, newNation, true);
          this.ui.updateHUD(this.player, this.stations);
        }
      }

      if (this.player.mesh) {
        this.player.mesh.position.set(spawn.x, -spawn.y, 0);
      }
      this.camera.position.set(spawn.x, -spawn.y, 750);
      this.camera.up.set(0, 1, 0);
      this.camera.lookAt(spawn.x, -spawn.y, 0);
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
        rp.kills = pData.kills || 0;
        rp.mined = pData.mined || 0;
        rp.donations = pData.donations || 0;
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
    rp.kills = pData.kills || 0;
    rp.mined = pData.mined || 0;
    rp.donations = pData.donations || 0;
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
        l.color, data.nation, l.maxRange, l.isHealBeam, l.element || 'standard'
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
      ast.flashDamage();
      // If attacker is local player, hit effects and sound were already predicted locally with 0 latency
      const isSelf = this.network && data.attackerId === this.network.myId;
      if (!isSelf) {
        this.createLaserHitParticles(ast.x, ast.y, 0xffbb44, 6);
        const hitVol = this.getPositionalVolume(ast.x, ast.y, 650);
        if (hitVol > 0.04) window.soundSystem.playHit(hitVol);
      }
    }
  }

  onServerAsteroidDestroyed(data) {
    // If destroyed locally by this client, explosion and drops already occurred instantly
    const wasLocal = this.locallyDestroyedAsteroidIds && this.locallyDestroyedAsteroidIds.has(data.asteroidId);
    if (wasLocal) {
      this.locallyDestroyedAsteroidIds.delete(data.asteroidId);
      // Map server crystal IDs onto local gems if any
      if (Array.isArray(data.crystals)) {
        data.crystals.forEach((c, idx) => {
          if (this.gems[idx] && !this.gems[idx].serverRegistered) {
            this.gems[idx].id = c.id;
            this.gems[idx].serverRegistered = true;
          }
        });
      }
      return;
    }

    const idx = this.asteroids.findIndex(a => a.id === data.asteroidId);
    let astRadius = 26;
    if (idx !== -1) {
      const ast = this.asteroids[idx];
      astRadius = ast.radius || 26;
      ast.destroy(this.scene);
      this.asteroids.splice(idx, 1);
    }

    // Fiery flaming explosion: "asteorit alevli ateşli bir patlama olarak patlasın."
    this.createFieryAsteroidExplosion(data.x, data.y, astRadius);

    // Moderate soft explosion sound for asteroid destruction
    const expVol = this.getPositionalVolume(data.x, data.y, 850) * 0.40;
    if (expVol > 0.02 && window.soundSystem) {
      window.soundSystem.playExplosion(false, expVol);
    }

    // User request: "her asteroitten içerik düşmeli bazılarından nedense düşmüyor."
    const crystalsToSpawn = (Array.isArray(data.crystals) && data.crystals.length > 0)
      ? data.crystals
      : [
          { id: `gem-fb-${Date.now()}-1`, x: data.x - 6, y: data.y - 6, value: 4, element: 'green' },
          { id: `gem-fb-${Date.now()}-2`, x: data.x + 6, y: data.y + 6, value: 4, element: 'green' }
        ];

    crystalsToSpawn.forEach((c, i) => {
      if (this.gems.some(g => g.id === c.id)) return;
      const angle = (i / crystalsToSpawn.length) * Math.PI * 2 + Math.random() * 0.5;
      const speed = 40 + Math.random() * 60;
      const bVx = Math.cos(angle) * speed;
      const bVy = Math.sin(angle) * speed;
      const gem = new Gem(c.x, c.y, c.value, c.element || 'green', c.id, bVx, bVy);
      this.gems.push(gem);
      this.scene.add(gem.mesh);
    });
  }

  onServerAsteroidSpawned(astData) {
    if (this.isMenuBattle) return;
    if (this.asteroids.some(a => a.id === astData.id)) return;
    const ast = new Asteroid(astData.x, astData.y, astData.tier, astData.id, astData.element || 'ice');
    ast.health = astData.health;
    ast.maxHealth = astData.maxHealth;
    ast.radius = astData.radius;
    ast.crystalCount = astData.crystalCount;
    ast.crystalTotalValue = astData.crystalTotalValue;
    this.asteroids.push(ast);
    this.scene.add(ast.mesh);
  }

  onServerCrystalCollected(data) {
    let collectedElement = 'ice';
    let gemVal = 2;
    const idx = this.gems.findIndex(g => g.id === data.crystalId);
    if (idx !== -1) {
      const gem = this.gems[idx];
      collectedElement = gem.element || 'ice';
      gemVal = gem.value || 2;
      this.createGemPickupFlash(gem.x, gem.y, gem.value);
      gem.destroy(this.scene);
      this.gems.splice(idx, 1);
    }
    if (this.network && data.collectorId === this.network.myId && this.player) {
      this.player.crystals = data.playerCrystals;
      this.player.score = data.playerScore;
      this.player.mined = (this.player.mined || 0) + gemVal;
      if (this.player.elementalAmmo && this.player.elementalAmmo[collectedElement] !== undefined) {
        const ammoGain = Math.min(2, Math.max(1, Math.round(gemVal || 1)));
        const maxCap = (this.player.maxElementalAmmo && this.player.maxElementalAmmo[collectedElement]) || 150;
        this.player.elementalAmmo[collectedElement] = Math.min(maxCap, this.player.elementalAmmo[collectedElement] + ammoGain);
      }
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
        const gem = new Gem(c.x, c.y, c.value, c.element || 'fire');
        gem.id = c.id;
        this.gems.push(gem);
        this.scene.add(gem.mesh);
      });
    }

    if (this.network && data.victimId === this.network.myId && this.player) {
      this.player.isDead = true;
      this.player.mined = 0; // User request: pvpde yada çarpmada ölürsede sıfırlanacak
      this.player.shield = 0;
      this.lastPlayerShipKey = this.player.shipKey;
      this.lastPlayerUpgrades = { ...this.player.upgrades };
      this.lastPlayerScore = this.player.score;
      this.lastUnlockedWeapons = { ...(this.player.unlockedWeapons || {}) };
      this.lastActiveWeapon = this.player.activeWeapon || 'standard';
      this.lastWarpUnlocked = !!this.player.warpUnlocked;
      const totalC = this.player.crystals || 0;
      this.lastRetainedCrystals = data.retainedCrystals !== undefined ? data.retainedCrystals : Math.floor(totalC * 0.5);
      this.player.crystals = this.lastRetainedCrystals;
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
      this.handleStationDestroyed(base, data.killerId || data.killerName);
    }
  }

  onServerRoundConcluded(data) {
    console.log('[GAME] Raunt sona erdi, kazanan ulus:', data.winnerNation);
    this.handleGameWon(data.winnerNation, data.countdownSeconds || 8);
  }

  onServerGalaxyReset(data) {
    console.log('[GAME] Sunucu evreni sıfırladı, yeni raunt hazır.');
    if (data.stations) {
      this.syncServerStations(data.stations);
    }
    if (data.asteroids) {
      this.syncServerAsteroids(data.asteroids);
    }
    for (const g of this.gems) g.destroy(this.scene);
    this.gems = [];
    for (const l of this.lasers) l.destroy(this.scene);
    this.lasers = [];
    for (const p of this.particles) p.destroy(this.scene);
    this.particles = [];

    // Ensure player drops from old match and returns to fresh main menu
    this.returnToMenu();

    if (this.ui && data.teamStatus) {
      this.ui.updateTeamStatus(data.teamStatus);
    }
  }

  returnToMenu() {
    this.isPlaying = false;
    this.isMenuBattle = true;
    if (this.player) {
      this.player.destroy(this.scene);
      this.player = null;
    }
    for (const l of this.lasers) l.destroy(this.scene);
    for (const p of this.particles) p.destroy(this.scene);
    for (const g of this.gems) g.destroy(this.scene);
    this.lasers = [];
    this.particles = [];
    this.gems = [];
    this.camera.position.set(0, 0, 1100);
    this.camera.up.set(0, 1, 0);
    this.camera.lookAt(0, 0, 0);
    this.initMenuBattle();
    if (this.ui) {
      this.ui.showMainMenu();
    }
  }
}

// Start Game when DOM ready
window.addEventListener('DOMContentLoaded', () => {
  window.game = new StarblastGame();
});

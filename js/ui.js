// UI, Radar Minimap, Upgrade System, Top-Down Evolution Banner, Nation Controller & Base Docking
class UIManager {
  constructor(game) {
    this.game = game;
    this.selectedNation = 'blue';

    // HUD Elements
    this.shieldFill = document.querySelector('.shield-fill');
    this.shieldText = document.getElementById('shield-text');
    this.energyFill = document.querySelector('.energy-fill');
    this.energyText = document.getElementById('energy-text');
    this.cargoFill = document.querySelector('.cargo-fill');
    this.cargoText = document.getElementById('cargo-text');

    this.crystalCount = document.getElementById('crystal-count');
    this.tierBadge = document.getElementById('tier-badge');
    this.nationBadge = document.getElementById('nation-badge');
    this.baseDockStatus = document.getElementById('base-dock-status');

    this.upgradeDock = document.getElementById('upgrade-dock');
    this.upgradeGrid = document.getElementById('upgrade-cards-grid');
    this.upgradeDockDismissed = false;
    this.lastCrystals = 0;

    // Top-down sliding tier-up banner
    this.topTierBanner = document.getElementById('top-tier-banner');
    this.topTierChoices = document.getElementById('top-tier-choices');

    this.radarCanvas = document.getElementById('radar-canvas');
    this.radarCtx = this.radarCanvas.getContext('2d');

    this.leaderboardList = document.getElementById('leaderboard-list');

    this.startScreen = document.getElementById('start-screen');
    this.gameOverScreen = document.getElementById('game-over-screen');

    // Chat Box Elements
    this.chatBox = document.getElementById('game-chat-box');
    this.chatMessages = document.getElementById('chat-messages');
    this.chatInput = document.getElementById('chat-input');
    this.chatForm = document.getElementById('chat-form');
    this.isChatOpen = false;
    this.activeChatTab = 'global';
    this.chatLog = [];

    // Loading Screen Animation State
    this.loadingAnimFrame = null;
    this.loadingTimeouts = [];

    // Tactical Action Bar elements
    this.tacticalSlots = {
      1: document.getElementById('tactical-slot-1'),
      2: document.getElementById('tactical-slot-2'),
      3: document.getElementById('tactical-slot-3'),
      4: document.getElementById('tactical-slot-4'),
      5: document.getElementById('tactical-slot-5')
    };

    // EXP Bar & Ship Evaluator Bar
    this.expFill = document.querySelector('.exp-fill');
    this.expText = document.getElementById('exp-text');
    this.shipEvaluatorBar = document.getElementById('ship-evaluator-bar');

    this.initUpgradesUI();
    this.initTacticalBar();
    this.initShipEvaluatorBar();
    this.initEventListeners();
  }

  initUpgradesUI() {
    if (!this.upgradeGrid) return;
    this.upgradeGrid.innerHTML = '';

    const HOLO_ICONS = {
      shieldCap: `<svg class="holo-stat-svg" viewBox="0 0 24 24" fill="none" stroke="#00f0ff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L4 5v6c0 5.5 3.5 10 8 11 4.5-1 8-5.5 8-11V5l-8-3z"/><path d="M12 6v12M8 10h8" stroke="#38bdf8" stroke-width="1.4" opacity="0.8"/></svg>`,
      shieldRegen: `<svg class="holo-stat-svg" viewBox="0 0 24 24" fill="none" stroke="#00f0ff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L5 5v6c0 4.5 2.8 8.5 7 9.8 4.2-1.3 7-5.3 7-9.8V5l-7-3z" opacity="0.6"/><path d="M12 7v6m-3-3h6" stroke="#34d399" stroke-width="2"/><circle cx="12" cy="10" r="4.5" stroke="#34d399" stroke-dasharray="2 2" stroke-width="1.2"/></svg>`,
      energyCap: `<svg class="holo-stat-svg" viewBox="0 0 24 24" fill="none" stroke="#00f0ff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="6" width="14" height="15" rx="2.5"/><path d="M9 3h6v3H9z" fill="#00f0ff" fill-opacity="0.3"/><line x1="8" y1="11" x2="16" y2="11" stroke="#38bdf8" stroke-width="1.6"/><line x1="8" y1="14" x2="16" y2="14" stroke="#38bdf8" stroke-width="1.6"/><line x1="8" y1="17" x2="14" y2="17" stroke="#38bdf8" stroke-width="1.6"/></svg>`,
      energyRegen: `<svg class="holo-stat-svg" viewBox="0 0 24 24" fill="none" stroke="#00f0ff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2L4 13h6l-1 9 9-11h-6l1-9z" fill="#00f0ff" fill-opacity="0.25"/><path d="M19 8a7 7 0 0 1 0 8" stroke="#38bdf8" stroke-width="1.4" stroke-dasharray="2 2"/></svg>`,
      fireDamage: `<svg class="holo-stat-svg" viewBox="0 0 24 24" fill="none" stroke="#ff4466" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8" stroke="#f43f5e" opacity="0.6"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4" stroke="#f43f5e"/><circle cx="12" cy="12" r="3" fill="#ff4466" fill-opacity="0.6"/></svg>`,
      fireSpeed: `<svg class="holo-stat-svg" viewBox="0 0 24 24" fill="none" stroke="#00f0ff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8l6-4v8L4 8z" fill="#38bdf8" fill-opacity="0.4"/><line x1="10" y1="8" x2="20" y2="8" stroke="#00f0ff" stroke-width="2"/><line x1="12" y1="14" x2="21" y2="14" stroke="#38bdf8" stroke-width="1.8"/><line x1="14" y1="19" x2="19" y2="19" stroke="#38bdf8" stroke-width="1.4"/></svg>`,
      shipSpeed: `<svg class="holo-stat-svg" viewBox="0 0 24 24" fill="none" stroke="#00f0ff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l4 7H8l4-7z" fill="#00f0ff" fill-opacity="0.3"/><path d="M9 10h6l1 5H8l1-5z"/><path d="M10 16l2 6 2-6" stroke="#38bdf8" stroke-width="1.8"/><path d="M7 16l1 3m9-3l-1 3" stroke="#00f0ff" opacity="0.7"/></svg>`,
      shipAgility: `<svg class="holo-stat-svg" viewBox="0 0 24 24" fill="none" stroke="#00f0ff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8" stroke="#00f0ff" stroke-dasharray="4 2"/><ellipse cx="12" cy="12" rx="9" ry="4" stroke="#38bdf8" transform="rotate(35 12 12)"/><circle cx="12" cy="12" r="2.2" fill="#00f0ff"/></svg>`
    };

    UPGRADE_CONFIG.forEach(cfg => {
      const card = document.createElement('div');
      card.className = 'upgrade-card';
      card.id = `upgrade-${cfg.id}`;
      card.title = `${cfg.name} [${cfg.key}] (Maliyet: ${cfg.costPerLevel} Kristal)`;
      const iconMarkup = HOLO_ICONS[cfg.id] || cfg.icon || '⚡';
      card.innerHTML = `
        <span class="upgrade-key-badge">${cfg.key}</span>
        <div class="upgrade-card-icon">${iconMarkup}</div>
        <div class="upgrade-pips-row">
          ${Array(cfg.max).fill(0).map((_, i) => `<div class="upgrade-pip" id="pip-${cfg.id}-${i}"></div>`).join('')}
        </div>
      `;
      card.addEventListener('click', () => {
        this.game.upgradeStat(cfg.id);
      });
      this.upgradeGrid.appendChild(card);
    });
  }

  initShipEvaluatorBar() {
    if (!this.shipEvaluatorBar) return;
    const btns = this.shipEvaluatorBar.querySelectorAll('.eval-btn');
    btns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const tier = btn.dataset.tier;
        if (!tier) return;
        const targetShipKey = 'tier-' + tier;
        if (this.game && this.game.player) {
          this.game.evolvePlayer(targetShipKey);
          const cfg = SHIP_TREE[targetShipKey];
          this.showAnnouncement(`⭐ GEMİ DEĞİŞTİRİLDİ: SEVİYE ${tier} - ${cfg ? cfg.name : ''}`, 2500);
        }
      });
    });
  }

  openUpgradeDock() {
    if (this.upgradeDock) {
      this.upgradeDock.classList.add('open');
    }
  }

  closeUpgradeDock() {
    if (this.upgradeDock) {
      this.upgradeDock.classList.remove('open');
    }
  }

  dismissUpgradeDock() {
    this.upgradeDockDismissed = true;
    this.closeUpgradeDock();
  }

  initTacticalBar() {
    // Direct Tactical Action Bar Slot interactions (Click to equip or direct buy & unlock)
    for (let slot = 1; slot <= 5; slot++) {
      const el = this.tacticalSlots[slot];
      if (!el) continue;

      el.addEventListener('click', () => {
        const player = this.game.player;
        if (!player || player.isDead) return;

        if (slot === 1) {
          if (player.activeWeapon === 'ice') {
            player.activeWeapon = 'standard';
            window.soundSystem.playUpgrade();
          } else {
            const ammo = (player.elementalAmmo && player.elementalAmmo.ice) || 0;
            if (ammo > 0) {
              player.activeWeapon = 'ice';
              window.soundSystem.playUpgrade();
            } else {
              if (window.soundSystem.playHit) window.soundSystem.playHit(0.5);
              this.showAnnouncement('❄️ Laser - S1 cephanesi tükendi! Asteroit parçala.', 2200);
            }
          }
        } else if (slot === 2) {
          if (player.activeWeapon === 'fire') {
            player.activeWeapon = 'standard';
            window.soundSystem.playUpgrade();
          } else {
            const ammo = (player.elementalAmmo && player.elementalAmmo.fire) || 0;
            if (ammo > 0) {
              player.activeWeapon = 'fire';
              window.soundSystem.playUpgrade();
            } else {
              if (window.soundSystem.playHit) window.soundSystem.playHit(0.5);
              this.showAnnouncement('🔥 Laser - S2 cephanesi tükendi! Asteroit parçala.', 2200);
            }
          }
        } else if (slot === 3) {
          if (player.activeWeapon === 'dark') {
            player.activeWeapon = 'standard';
            window.soundSystem.playUpgrade();
          } else {
            const ammo = (player.elementalAmmo && player.elementalAmmo.dark) || 0;
            if (ammo > 0) {
              player.activeWeapon = 'dark';
              window.soundSystem.playUpgrade();
            } else {
              if (window.soundSystem.playHit) window.soundSystem.playHit(0.5);
              this.showAnnouncement('🌑 Laser - S3 cephanesi tükendi! Asteroit parçala.', 2200);
            }
          }
        } else if (slot === 4) {
          this.game.triggerPlayerWarp();
        } else if (slot === 5) {
          this.game.triggerPlayerSuper();
        }

        this.updateHUD(player, this.game.stations);
      });
    }
  }

  updateMerchantAndTacticalBar(player) {
    this.updateTacticalBar(player);
  }

  updateTacticalBar(player) {
    if (!player) return;

    const ammo = player.elementalAmmo || { ice: 0, fire: 0, dark: 0 };
    const maxAmmo = player.maxElementalAmmo || { ice: 100, fire: 100, dark: 100 };

    // Slot 1: Laser - S1 (Buz)
    if (this.tacticalSlots[1]) {
      const isActive = player.activeWeapon === 'ice';
      this.tacticalSlots[1].classList.add('unlocked');
      this.tacticalSlots[1].classList.remove('locked', 'affordable');
      this.tacticalSlots[1].classList.toggle('active', isActive);

      const iceAmmo = ammo.ice || 0;
      const iceMax = maxAmmo.ice || 100;
      const icePct = Math.min(100, Math.max(0, (iceAmmo / iceMax) * 100));
      const fillEl = document.getElementById('fluid-fill-1');
      if (fillEl) fillEl.style.height = `${icePct}%`;
      const ammoEl = document.getElementById('slot-ammo-1');
      if (ammoEl) ammoEl.textContent = iceAmmo;
    }

    // Slot 2: Laser - S2 (Alev)
    if (this.tacticalSlots[2]) {
      const isActive = player.activeWeapon === 'fire';
      this.tacticalSlots[2].classList.add('unlocked');
      this.tacticalSlots[2].classList.remove('locked', 'affordable');
      this.tacticalSlots[2].classList.toggle('active', isActive);

      const fireAmmo = ammo.fire || 0;
      const fireMax = maxAmmo.fire || 100;
      const firePct = Math.min(100, Math.max(0, (fireAmmo / fireMax) * 100));
      const fillEl = document.getElementById('fluid-fill-2');
      if (fillEl) fillEl.style.height = `${firePct}%`;
      const ammoEl = document.getElementById('slot-ammo-2');
      if (ammoEl) ammoEl.textContent = fireAmmo;
    }

    // Slot 3: Laser - S3 (Boşluk / Karanlık)
    if (this.tacticalSlots[3]) {
      const isActive = player.activeWeapon === 'dark';
      this.tacticalSlots[3].classList.add('unlocked');
      this.tacticalSlots[3].classList.remove('locked', 'affordable');
      this.tacticalSlots[3].classList.toggle('active', isActive);

      const darkAmmo = ammo.dark || 0;
      const darkMax = maxAmmo.dark || 100;
      const darkPct = Math.min(100, Math.max(0, (darkAmmo / darkMax) * 100));
      const fillEl = document.getElementById('fluid-fill-3');
      if (fillEl) fillEl.style.height = `${darkPct}%`;
      const ammoEl = document.getElementById('slot-ammo-3');
      if (ammoEl) ammoEl.textContent = darkAmmo;
    }

    // Slot 4: Warp (120s cooldown)
    if (this.tacticalSlots[4]) {
      this.tacticalSlots[4].classList.add('unlocked');
      this.tacticalSlots[4].classList.remove('locked', 'affordable');
      const isWarping = (player.warpActiveTimer > 0);
      this.tacticalSlots[4].classList.toggle('active', isWarping);
      const cdOverlay = document.getElementById('cooldown-warp');
      const cdText = document.getElementById('cooldown-warp-text');

      if (isWarping) {
        if (cdOverlay) cdOverlay.style.height = '0%';
        if (cdText) {
          cdText.style.display = 'block';
          cdText.style.color = '#00f0ff';
          cdText.textContent = `⚡${player.warpActiveTimer.toFixed(1)}s`;
        }
      } else if (player.warpCooldown > 0) {
        const pct = Math.min(100, Math.max(0, (player.warpCooldown / 120.0) * 100));
        if (cdOverlay) cdOverlay.style.height = `${pct}%`;
        if (cdText) {
          cdText.style.display = 'block';
          cdText.style.color = '#fff';
          cdText.textContent = Math.ceil(player.warpCooldown) + 's';
        }
      } else {
        if (cdOverlay) cdOverlay.style.height = '0%';
        if (cdText) cdText.style.display = 'none';
      }
    }

    // Slot 5: Super (60s cooldown)
    if (this.tacticalSlots[5]) {
      this.tacticalSlots[5].classList.add('unlocked');
      const cdOverlay = document.getElementById('cooldown-super');
      const cdText = document.getElementById('cooldown-super-text');
      if (player.superCooldown > 0) {
        const pct = Math.min(100, Math.max(0, (player.superCooldown / 60.0) * 100));
        if (cdOverlay) cdOverlay.style.height = `${pct}%`;
        if (cdText) {
          cdText.style.display = 'block';
          cdText.textContent = Math.ceil(player.superCooldown) + 's';
        }
      } else {
        if (cdOverlay) cdOverlay.style.height = '0%';
        if (cdText) cdText.style.display = 'none';
      }
    }
  }

  initEventListeners() {
    // Nation selection with dynamic hover preview
    const loreTitle = document.getElementById('nation-lore-title');
    const loreDesc = document.getElementById('nation-lore-desc');

    const nationData = {
      red: {
        title: '🔴 KRYOS ULUSU',
        desc: 'Soğuk, hesapçı ve bürokratik bir askeri-sanayi gücü çağrıştırır. Yapay zekâ entegrasyonu, insansız filo sistemleri veya maden/kaynak kontrolünü elinde tutan teknokratik bir yapıya çok iyi uyar.'
      },
      blue: {
        title: '🌍 VEYLARIAN ULUSU',
        desc: 'Kadim, disiplinli ve teknolojik olarak üstün bir ırk/ulus hissi verir. Ağır zırhlı kruvazörler, merkezi bir imparatorluk yapısı ve enerji silahlarında uzmanlaşmış bir doktrin için idealdir.'
      },
      gold: {
        title: '🪐 AETHELON ULUSU',
        desc: 'Birden fazla yıldız sisteminin veya özgür koloninin kurduğu diplomatik ve esnek bir koalisyon havası taşır. Hızlı saldırı gemileri, ticaret filoları ve gelişmiş kalkan teknolojisi kullanan dengeli bir ulus için uygundur.'
      }
    };

    const updateLore = (nationKey) => {
      const data = nationData[nationKey] || nationData['blue'];
      if (loreTitle) loreTitle.textContent = data.title;
      if (loreDesc) loreDesc.textContent = data.desc;
    };

    const cards = document.querySelectorAll('.nation-card');
    cards.forEach(card => {
      // Hover preview: shows lore without overcrowding the card
      card.addEventListener('mouseenter', () => {
        const nation = card.dataset.nation;
        updateLore(nation);
      });

      // Click to select with team balance check
      card.addEventListener('click', (e) => {
        e.stopPropagation();
        if (card.classList.contains('destroyed')) {
          this.showAnnouncement('💥 Bu ulusun uzay üssü imha edildi! Bu ulus ile savaşa başlanamaz.', 3500);
          return;
        }
        if (card.classList.contains('locked')) {
          this.showAnnouncement('Bu ulus dolu! Takım dengesini korumak için lütfen diğer açık uluslardan birini seçin.', 3000);
          return;
        }
        cards.forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        this.selectedNation = card.dataset.nation;
        updateLore(this.selectedNation);
      });
    });

    const cardsContainer = document.getElementById('nation-cards-container');
    if (cardsContainer) {
      cardsContainer.addEventListener('mouseleave', () => {
        updateLore(this.selectedNation);
      });
    }

    // Play Button -> checks team balance and launches smooth loading sequence
    const playBtn = document.getElementById('play-btn');
    if (playBtn) {
      playBtn.addEventListener('click', () => {
        const currentCard = document.querySelector(`.nation-card.${this.selectedNation}`);
        if (currentCard && currentCard.classList.contains('destroyed')) {
          this.showAnnouncement('💥 Bu ulusun uzay üssü imha edilmiş! Lütfen aktif bir ulus seçin.', 3500);
          return;
        }
        if (this.game && this.game.stations && this.game.stations[this.selectedNation] && this.game.stations[this.selectedNation].isDead) {
          this.showAnnouncement('💥 Bu ulusun uzay üssü imha edilmiş! Lütfen aktif bir ulus seçin.', 3500);
          return;
        }
        if (currentCard && currentCard.classList.contains('locked')) {
          this.showAnnouncement('Seçili ulus şu anda dolu! Lütfen açık olan bir ulusu seçin.', 3000);
          return;
        }
        const nameInput = document.getElementById('player-name-input');
        let name = (nameInput ? nameInput.value.trim() : '') || 'VANGUARD-1';

        // Check if name is taken by any remote player in room, bump number if so
        const existingNames = new Set();
        if (this.game && this.game.remotePlayers) {
          for (const rp of this.game.remotePlayers.values()) {
            if (rp && rp.name) existingNames.add(rp.name.toUpperCase());
          }
        }
        let baseName = name;
        let num = 1;
        const match = name.match(/^(.*?)[-_](\d+)$/);
        if (match) {
          baseName = match[1];
          num = parseInt(match[2], 10);
        }
        while (existingNames.has(name.toUpperCase())) {
          num++;
          name = `${baseName}-${num}`;
        }
        if (nameInput) nameInput.value = name;

        this.startLoadingSequence(name, this.selectedNation);
      });
    }

    // Server Settings Modal Event Listeners
    const serverSettingsBtn = document.getElementById('server-settings-btn');
    const serverModal = document.getElementById('server-modal');
    const serverModalClose = document.getElementById('server-modal-close');
    const serverSaveBtn = document.getElementById('server-save-btn');
    const serverLocalBtn = document.getElementById('server-local-btn');
    const serverUrlInput = document.getElementById('server-url-input');

    if (serverSettingsBtn && serverModal) {
      serverSettingsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (serverUrlInput && this.game && this.game.network) {
          serverUrlInput.value = this.game.network.serverUrl;
        }
        serverModal.style.display = 'flex';
      });
    }

    if (serverModalClose && serverModal) {
      serverModalClose.addEventListener('click', () => {
        serverModal.style.display = 'none';
      });
    }

    if (serverSaveBtn && serverModal && serverUrlInput) {
      serverSaveBtn.addEventListener('click', () => {
        const val = serverUrlInput.value.trim();
        if (val && this.game && this.game.network) {
          this.game.network.setServerUrl(val);
        }
        serverModal.style.display = 'none';
      });
    }

    if (serverLocalBtn && serverModal && serverUrlInput) {
      serverLocalBtn.addEventListener('click', () => {
        if (this.game && this.game.network) {
          const defaultUrl = (window.location.protocol === 'file:') ? 'http://localhost:3000' : window.location.origin;
          serverUrlInput.value = defaultUrl;
          this.game.network.setServerUrl(defaultUrl);
        }
        serverModal.style.display = 'none';
      });
    }

    // Audio Toggle Controls (Music & Sound)
    const musicBtn = document.getElementById('music-toggle-btn');
    const musicIcon = document.getElementById('music-icon');
    if (musicBtn) {
      musicBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOn = window.soundSystem.toggleMusic();
        musicBtn.classList.toggle('muted', !isOn);
        if (musicIcon) musicIcon.textContent = isOn ? '🎵' : '🔇';
      });
    }

    const soundBtn = document.getElementById('sound-toggle-btn');
    const soundIcon = document.getElementById('sound-icon');
    if (soundBtn) {
      soundBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOn = window.soundSystem.toggleSound();
        soundBtn.classList.toggle('muted', !isOn);
        if (soundIcon) soundIcon.textContent = isOn ? '🔊' : '🔇';
      });
    }

    const closeUpgradeBtn = document.getElementById('upgrade-close-btn');
    if (closeUpgradeBtn) {
      closeUpgradeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.dismissUpgradeDock();
      });
    }

    const respawnBtn = document.getElementById('respawn-btn');
    if (respawnBtn) {
      respawnBtn.addEventListener('click', () => {
        if (this.respawnInterval) {
          clearInterval(this.respawnInterval);
          this.respawnInterval = null;
        }
        this.hideGameOver();
        this.game.respawnPlayer();
      });
    }

    // Chat Box Form, Tabs and Input Listeners
    const chatTabs = document.querySelectorAll('.chat-tab');
    chatTabs.forEach(tab => {
      tab.addEventListener('click', (e) => {
        e.stopPropagation();
        const ch = tab.dataset.channel || 'global';
        this.activeChatTab = ch;
        chatTabs.forEach(t => t.classList.toggle('active', t === tab));
        this.renderChatMessages();
      });
    });

    // Leaderboard Tabs (3 Tabs: PvP Kills, Mining Farm, Base Donations)
    this.activeLeaderboardMetric = 'kills';
    const lbTabs = document.querySelectorAll('.lb-tab');
    lbTabs.forEach(tab => {
      tab.addEventListener('click', (e) => {
        e.stopPropagation();
        lbTabs.forEach(t => t.classList.toggle('active', t === tab));
        this.activeLeaderboardMetric = tab.dataset.metric || 'kills';
        if (this.game && this.game.player) {
          this.updateLeaderboard(this.game.player, this.game.remotePlayers);
        }
      });
    });

    if (this.chatForm) {
      this.chatForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.sendPlayerChat();
      });
    }

    if (this.chatInput) {
      this.chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          this.closeChat();
          e.stopPropagation();
        } else if (e.key === 'Enter') {
          e.preventDefault();
          this.sendPlayerChat();
        } else {
          e.stopPropagation();
        }
      });
    }
  }

  runLoadingSequence(onComplete = null) {
    if (this.loadingAnimFrame) {
      cancelAnimationFrame(this.loadingAnimFrame);
      this.loadingAnimFrame = null;
    }
    if (this.loadingTimeouts) {
      this.loadingTimeouts.forEach(t => clearTimeout(t));
      this.loadingTimeouts = [];
    } else {
      this.loadingTimeouts = [];
    }

    const loadingBar = document.getElementById('loading-bar-fill');
    const loadingStatus = document.getElementById('loading-status');
    const loadingPct = document.getElementById('loading-pct');
    const logo = document.getElementById('loading-logo');
    const subEls = document.getElementById('loading-sub-elements');

    if (logo) logo.classList.remove('warp-out');
    if (subEls) subEls.classList.remove('fade-out');

    if (loadingBar) loadingBar.style.width = '0%';
    if (loadingPct) loadingPct.textContent = '0%';
    if (loadingStatus) loadingStatus.textContent = 'EVREN YÜKLENİYOR...';

    // Timeline Configuration (User specifications):
    // 1. Until 24%: "EVREN YÜKLENİYOR..."
    // 2. At 24%: pause for 2.0s (gives realistic loading feel)
    // 3. From 24% to 61%: "GEMİNİZ OLUŞTURULUYOR..."
    // 4. At 61%: pause for 2.0s (gives realistic loading feel)
    // 5. From 61% to 100%: "GEMİNİZ OLUŞTURULUYOR..."
    // 6. At 100%: "HAZIRSINIZ" (hold 700ms)
    const T_STAGE1 = 1000;                // 0 -> 24% (1.0s)
    const T_PAUSE1 = 2000;                // 2.0s pause at 24%
    const T_STAGE2 = 1200;                // 24% -> 61% (1.2s)
    const T_PAUSE2 = 2000;                // 2.0s pause at 61%
    const T_STAGE3 = 1000;                // 61% -> 100% (1.0s)
    const T_HOLD100 = 700;                // Hold at 100% showing HAZIRSINIZ

    const t1 = T_STAGE1;                  // 1000ms: reaches 24%
    const t2 = t1 + T_PAUSE1;             // 3000ms: ends 24% pause
    const t3 = t2 + T_STAGE2;             // 4200ms: reaches 61%
    const t4 = t3 + T_PAUSE2;             // 6200ms: ends 61% pause
    const t5 = t4 + T_STAGE3;             // 7200ms: reaches 100%
    const t6 = t5 + T_HOLD100;            // 7900ms: hold finishes

    const startTime = performance.now();

    const frameStep = (now) => {
      const elapsed = now - startTime;
      let progress = 0;
      let statusText = 'EVREN YÜKLENİYOR...';

      if (elapsed < t1) {
        const r = elapsed / T_STAGE1;
        progress = r * 24;
        statusText = 'EVREN YÜKLENİYOR...';
      } else if (elapsed < t2) {
        progress = 24;
        statusText = 'EVREN YÜKLENİYOR...';
      } else if (elapsed < t3) {
        const r = (elapsed - t2) / T_STAGE2;
        progress = 24 + r * (61 - 24);
        statusText = 'GEMİNİZ OLUŞTURULUYOR...';
      } else if (elapsed < t4) {
        progress = 61;
        statusText = 'GEMİNİZ OLUŞTURULUYOR...';
      } else if (elapsed < t5) {
        const r = (elapsed - t4) / T_STAGE3;
        progress = 61 + r * (100 - 61);
        statusText = 'GEMİNİZ OLUŞTURULUYOR...';
      } else {
        progress = 100;
        statusText = 'HAZIRSINIZ';
      }

      if (loadingBar) loadingBar.style.width = `${progress.toFixed(1)}%`;
      if (loadingPct) loadingPct.textContent = `${Math.round(progress)}%`;
      if (loadingStatus) loadingStatus.textContent = statusText;

      if (elapsed < t6) {
        this.loadingAnimFrame = requestAnimationFrame(frameStep);
      } else {
        if (loadingBar) loadingBar.style.width = '100%';
        if (loadingPct) loadingPct.textContent = '100%';
        if (loadingStatus) loadingStatus.textContent = 'HAZIRSINIZ';

        if (onComplete) {
          onComplete();
        }
      }
    };

    this.loadingAnimFrame = requestAnimationFrame(frameStep);
  }

  startLoadingSequence(name, nation) {
    const startScreen = this.startScreen || document.getElementById('start-screen');
    const loadingScreen = document.getElementById('loading-screen');
    const logo = document.getElementById('loading-logo');
    const subEls = document.getElementById('loading-sub-elements');

    if (!loadingScreen) {
      this.game.startGame(name, nation);
      return;
    }

    // Cinematic warp speed surge in background space
    if (this.game && this.game.triggerWarpSpeedSurge) {
      this.game.triggerWarpSpeedSurge();
    }

    // Step 1: Smoothly dissolve start screen out with motion blur
    if (startScreen) {
      startScreen.classList.add('screen-fade-out');
    }

    setTimeout(() => {
      if (startScreen) {
        startScreen.style.display = 'none';
        startScreen.classList.remove('screen-fade-out');
      }

      if (logo) logo.classList.remove('warp-out');
      if (subEls) subEls.classList.remove('fade-out');

      // Step 2: Smoothly enter loading screen with logo flare and rising controls
      loadingScreen.style.display = 'flex';
      loadingScreen.style.opacity = '1';
      loadingScreen.classList.add('screen-fade-in');

      // Step 3: Run realistic loading sequence with pauses at 24% and 61%
      this.runLoadingSequence(() => {
        // Loading complete - logo warp exit into game!
        if (logo) logo.classList.add('warp-out');
        if (subEls) subEls.classList.add('fade-out');

        const tId1 = setTimeout(() => {
          loadingScreen.style.transition = 'opacity 0.4s ease';
          loadingScreen.style.opacity = '0';
          const tId2 = setTimeout(() => {
            loadingScreen.style.display = 'none';
            loadingScreen.classList.remove('screen-fade-in');
            if (logo) logo.classList.remove('warp-out');
            if (subEls) subEls.classList.remove('fade-out');
            this.game.startGame(name, nation);
          }, 400);
          if (!this.loadingTimeouts) this.loadingTimeouts = [];
          this.loadingTimeouts.push(tId2);
        }, 650);
        if (!this.loadingTimeouts) this.loadingTimeouts = [];
        this.loadingTimeouts.push(tId1);
      });
    }, 360);
  }

  openChat() {
    if (!this.chatBox || !this.chatInput) return;
    this.isChatOpen = true;
    this.chatBox.classList.add('active');
    this.chatInput.focus();
    if (this.game) {
      this.game.keys = {}; // Clear keys to prevent unintended flying while typing
    }
  }

  closeChat() {
    if (!this.chatBox || !this.chatInput) return;
    this.isChatOpen = false;
    this.chatBox.classList.remove('active');
    this.chatInput.blur();
  }

  toggleChat() {
    if (this.isChatOpen) {
      this.closeChat();
    } else {
      this.openChat();
    }
  }

  escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  renderChatMessages() {
    if (!this.chatMessages) return;
    this.chatMessages.innerHTML = '';
    const myNation = (this.game && this.game.player) ? this.game.player.nation : 'blue';

    const filtered = this.chatLog.filter(m => {
      if (this.activeChatTab === 'global') {
        return m.channel === 'global' || m.isSystem;
      } else {
        return (m.channel === 'team' && m.nation === myNation) || (m.nation === myNation && !m.isSystem);
      }
    });

    filtered.forEach(m => {
      const msg = document.createElement('div');
      msg.className = 'chat-msg';

      let nationClass = `nation-${m.nation || 'blue'}`;
      let prefix = '';
      if (m.isSystem) {
        nationClass = 'chat-sys';
        prefix = '[SİSTEM]';
      } else {
        const nationName = m.nation === 'red' ? 'Kryos' : m.nation === 'gold' ? 'Aethelon' : 'Veylarian';
        if (m.channel === 'team') {
          prefix = `[TAKIM] ${m.sender}:`;
        } else {
          prefix = `[${nationName.toUpperCase()}] ${m.sender}:`;
        }
      }

      msg.innerHTML = `<span class="chat-author ${nationClass}">${prefix}</span> <span class="chat-text">${this.escapeHtml(m.text)}</span>`;
      this.chatMessages.appendChild(msg);
    });

    this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
  }

  addChatMessage(sender, text, nation = 'blue', isSystem = false, channel = 'global') {
    this.chatLog.push({ sender, text, nation, isSystem, channel });
    if (this.chatLog.length > 60) {
      this.chatLog.shift();
    }
    this.renderChatMessages();
  }

  updateTeamStatus(data) {
    if (!data) return;
    const { counts, status } = data;
    if (!counts || !status) return;

    for (const nation of ['red', 'blue', 'gold']) {
      const badge = document.getElementById(`pilot-count-${nation}`);
      if (badge) {
        badge.textContent = `${counts[nation] || 0}`;
      }
      const card = document.querySelector(`.nation-card.${nation}`);
      const lockOverlay = document.getElementById(`nation-lock-${nation}`);
      const isDestroyed = !!(status[nation] && status[nation].destroyed);
      const isLocked = !!(status[nation] && status[nation].locked) && !isDestroyed;

      if (card) {
        card.classList.toggle('destroyed', isDestroyed);
        card.classList.toggle('locked', isLocked);
      }
      if (lockOverlay) {
        if (isDestroyed) {
          lockOverlay.style.display = 'flex';
          lockOverlay.innerHTML = `
            <span class="lock-icon" style="font-size:1.15rem;margin-bottom:3px;">💥</span>
            <span class="lock-text" style="color:#ef4444;font-size:0.7rem;line-height:1.2;text-align:center;">ÜS YOK EDİLDİ<br><small style="font-size:0.6rem;opacity:0.85;">(SEÇİLEMEZ)</small></span>
          `;
        } else if (isLocked) {
          lockOverlay.style.display = 'flex';
          lockOverlay.innerHTML = `
            <span class="lock-icon">🔒</span>
            <span class="lock-text">DOLU<br><small>(DENGE)</small></span>
          `;
        } else {
          lockOverlay.style.display = 'none';
        }
      }
    }

    // Auto-switch away from destroyed or locked nation if currently selected
    const currentCard = document.querySelector(`.nation-card.${this.selectedNation}`);
    if (currentCard && (currentCard.classList.contains('destroyed') || currentCard.classList.contains('locked'))) {
      const open = ['red', 'blue', 'gold'].filter(n => status[n] && !status[n].destroyed && !status[n].locked);
      if (open.length > 0) {
        this.selectNation(open[0]);
        this.showAnnouncement(`Seçili ulus pasif! ${open[0].toUpperCase()} ulusuna geçildi.`, 3500);
      }
    }
  }

  selectNation(nationKey) {
    const cards = document.querySelectorAll('.nation-card');
    cards.forEach(c => c.classList.remove('selected'));
    const target = document.querySelector(`.nation-card.${nationKey}`);
    if (target) {
      target.classList.add('selected');
      this.selectedNation = nationKey;

      const nationData = {
        red: { title: '🔴 KRYOS ULUSU', desc: 'Soğuk, hesapçı ve bürokratik bir askeri-sanayi gücü çağrıştırır. Yapay zekâ entegrasyonu, insansız filo sistemleri veya maden/kaynak kontrolünü elinde tutan teknokratik bir yapıya çok iyi uyar.' },
        blue: { title: '🌍 VEYLARIAN ULUSU', desc: 'Kadim, disiplinli ve teknolojik olarak üstün bir ırk/ulus hissi verir. Ağır zırhlı kruvazörler, merkezi bir imparatorluk yapısı ve enerji silahlarında uzmanlaşmış bir doktrin için idealdir.' },
        gold: { title: '🪐 AETHELON ULUSU', desc: 'Birden fazla yıldız sisteminin veya özgür koloninin kurduğu diplomatik ve esnek bir koalisyon havası taşır. Hızlı saldırı gemileri, ticaret filoları ve gelişmiş kalkan teknolojisi kullanan dengeli bir ulus için uygundur.' }
      };

      const loreTitle = document.getElementById('nation-lore-title');
      const loreDesc = document.getElementById('nation-lore-desc');
      const data = nationData[nationKey] || nationData['blue'];
      if (loreTitle) loreTitle.textContent = data.title;
      if (loreDesc) loreDesc.textContent = data.desc;
    }
  }

  sendPlayerChat() {
    if (!this.chatInput) return;
    const text = this.chatInput.value.trim();
    if (text.length > 0 && this.game && this.game.player) {
      if (this.game.network && this.game.network.isConnected) {
        this.game.network.sendChat(text, this.activeChatTab);
      } else {
        this.addChatMessage(this.game.player.name, text, this.game.player.nation, false, this.activeChatTab);
      }
      this.chatInput.value = '';
    }
    this.closeChat();
  }

  updateHUD(player, stations) {
    if (!player) return;

    const shipCfg = SHIP_TREE[player.shipKey] || SHIP_TREE['fly'];
    const nationCfg = NATIONS[player.nation] || NATIONS['blue'];

    // Shield (Numbers only per user request)
    const shieldPct = Math.max(0, Math.min(100, (player.shield / player.stats.shieldCap) * 100));
    this.shieldFill.style.width = `${shieldPct}%`;
    this.shieldText.textContent = `${Math.round(player.shield)} / ${Math.round(player.stats.shieldCap)}`;

    // Lazer / Energy (Numbers only per user request)
    const energyPct = Math.max(0, Math.min(100, (player.energy / player.stats.energyCap) * 100));
    this.energyFill.style.width = `${energyPct}%`;
    if (player.isEnergyStarved) {
      this.energyFill.classList.add('starved');
      this.energyText.textContent = `${Math.round(player.energy)} / ${Math.round(player.stats.energyCap)} (0.6s)`;
    } else {
      this.energyFill.classList.remove('starved');
      this.energyText.textContent = `${Math.round(player.energy)} / ${Math.round(player.stats.energyCap)}`;
    }

    // Cargo / Crystals (Numbers only per user request)
    const cargoPct = Math.max(0, Math.min(100, (player.crystals / player.stats.cargoCapacity) * 100));
    this.cargoFill.style.width = `${cargoPct}%`;
    this.cargoText.textContent = `${player.crystals} / ${player.stats.cargoCapacity}`;

    if (this.crystalCount) {
      this.crystalCount.textContent = player.crystals;
    }

    // EXP / Level Progress Bar ("exp barıda ekle sol üstteki kısma")
    const expCap = shipCfg.cargoCapacity || 50;
    const expCurrent = Math.min(expCap, player.crystals || 0);
    const expPct = Math.max(0, Math.min(100, (expCurrent / expCap) * 100));
    if (this.expFill) {
      this.expFill.style.width = `${expPct}%`;
      if (expPct >= 100) {
        this.expFill.classList.add('ready');
      } else {
        this.expFill.classList.remove('ready');
      }
    }
    if (this.expText) {
      this.expText.textContent = `Lvl ${shipCfg.tier || 1}`;
    }

    // Highlight Active Tier in Ship Evaluator Bar
    if (this.shipEvaluatorBar) {
      const currentTierStr = String(shipCfg.tier || 1);
      const btns = this.shipEvaluatorBar.querySelectorAll('.eval-btn');
      btns.forEach(b => {
        b.classList.toggle('active', b.dataset.tier === currentTierStr);
      });
    }

    // Update In-Flight Merchant & Bottom Tactical Action Bar
    this.updateMerchantAndTacticalBar(player);

    if (this.tierBadge) {
      this.tierBadge.innerHTML = `<span style="margin-right: 5px;">${shipCfg.classIcon || '🛸'}</span>SEVİYE ${shipCfg.tier}: ${shipCfg.name} <span style="opacity: 0.8; font-size: 0.75rem; margin-left: 3px;">(${shipCfg.className || ''})</span>`;
    }

    if (this.nationBadge) {
      this.nationBadge.innerHTML = `${nationCfg.icon} ${nationCfg.name}`;
      this.nationBadge.style.color = nationCfg.hex;
      this.nationBadge.style.borderColor = nationCfg.hex;
      this.nationBadge.style.boxShadow = `0 0 10px ${nationCfg.hex}44`;
    }

    // Base docking & donation prompt OR enemy base siege alert
    let nearStation = false;
    const homeBase = stations ? stations[player.nation] : null;
    if (homeBase && !homeBase.isDead && this.baseDockStatus) {
      const dist = Math.hypot(player.x - homeBase.x, player.y - homeBase.y);
      const dockPerimeter = (homeBase.radius || 420) + 180;
      if (dist <= dockPerimeter) {
        nearStation = true;
        this.baseDockStatus.style.display = 'block';
        const pct = Math.round((homeBase.crystalsDonated / homeBase.crystalsRequired) * 100);
        this.baseDockStatus.innerHTML = `
          <div style="font-weight: bold; color: #ffdd44; letter-spacing: 1px;">★ ${nationCfg.name.toUpperCase()} ÜSSÜNDESİNİZ ★</div>
          <div style="font-size: 0.8rem; margin-top: 3px;">Kalkan/Can Yenileniyor • <b>[B]</b> Tuşuyla Anında Bağış Yap</div>
          <div style="font-size: 0.75rem; color: #9eccdf; margin-top: 2px;">Üs Seviyesi: <b>${homeBase.level}</b> | Can: <b>${Math.round(homeBase.hp)}/${homeBase.maxHp}</b> | Gelişim: <b>${homeBase.crystalsDonated}/${homeBase.crystalsRequired} (%${pct})</b></div>
        `;
      }
    }

    if (!nearStation && stations && this.baseDockStatus) {
      // Check if near any hostile station (siege alert)
      let hostileStation = null;
      let minHostileDist = 1350;
      for (const k in stations) {
        const st = stations[k];
        if (!st || st.isDead || st.nation === player.nation) continue;
        const d = Math.hypot(player.x - st.x, player.y - st.y);
        if (d < minHostileDist) {
          minHostileDist = d;
          hostileStation = st;
        }
      }

      if (hostileStation) {
        nearStation = true;
        this.baseDockStatus.style.display = 'block';
        const hostileNationCfg = NATIONS[hostileStation.nation] || NATIONS['red'];
        const hpPct = Math.round((hostileStation.hp / hostileStation.maxHp) * 100);
        this.baseDockStatus.innerHTML = `
          <div style="font-weight: bold; color: #ff3355; letter-spacing: 1px;">⚔️ DÜŞMAN ÜS HEDEFTE: ${hostileNationCfg.name.toUpperCase()} ⚔️</div>
          <div style="font-size: 0.8rem; margin-top: 3px; color: #fff;">Üs Canı: <b>${Math.round(hostileStation.hp)} / ${hostileStation.maxHp} (%${hpPct})</b> | Seviye: <b>${hostileStation.level}</b></div>
          <div style="font-size: 0.75rem; color: #ff8899; margin-top: 2px;">Düşman üssü yok etmek için ateş açın! Dikkat: Savunma taretleri ateş ediyor!</div>
        `;
      }
    }

    if (!nearStation && this.baseDockStatus) {
      this.baseDockStatus.style.display = 'none';
    }

    // Check if any stat can still be upgraded
    let hasUnmaxedStats = false;
    UPGRADE_CONFIG.forEach(cfg => {
      const lvl = player.upgrades[cfg.id] || 0;
      if (lvl < cfg.max) hasUnmaxedStats = true;
    });

    // Auto-slide up at 50 crystals ("50 ganimet olunca alttan açılsın")
    if (player.crystals > this.lastCrystals) {
      // Gained crystals: allow opening if >= 50
      this.upgradeDockDismissed = false;
    }
    if (player.crystals < 50) {
      this.upgradeDockDismissed = false;
    }
    this.lastCrystals = player.crystals;

    if (player.crystals >= 50 && hasUnmaxedStats && !this.upgradeDockDismissed) {
      this.openUpgradeDock();
    } else {
      this.closeUpgradeDock();
    }

    // Synchronize ship evaluator bar active state
    if (this.shipEvaluatorBar) {
      const btns = this.shipEvaluatorBar.querySelectorAll('.eval-btn');
      btns.forEach(b => b.classList.toggle('active', b.dataset.tier == player.tier));
    }

    // Update Upgrade Cards (Tier-capped visibility: maxAllowedByTier = Math.min(cfg.max, (shipCfg.tier || 1) + 1))
    const maxAllowedByTier = Math.min(6, (shipCfg.tier || 1) + 1);
    UPGRADE_CONFIG.forEach(cfg => {
      const lvl = player.upgrades[cfg.id] || 0;
      const card = document.getElementById(`upgrade-${cfg.id}`);
      const isMax = lvl >= cfg.max;
      const isTierCapped = lvl >= maxAllowedByTier;
      const canAfford = player.crystals >= cfg.costPerLevel && !isMax && !isTierCapped;

      if (card) {
        card.classList.toggle('maxed', isMax);
        card.classList.toggle('tier-capped', isTierCapped && !isMax);
        card.classList.toggle('disabled', (!canAfford && !isMax) || isTierCapped);
        card.title = isTierCapped
          ? `${cfg.name} (Seviye ${lvl + 1} için Lv.${lvl + 1} gemi gereklidir!)`
          : `${cfg.name} [${cfg.key}] (Maliyet: ${cfg.costPerLevel} Kristal)`;

        const lvlBadge = document.getElementById(`level-${cfg.id}`);
        if (lvlBadge) {
          lvlBadge.textContent = isMax ? 'MAX' : `${lvl}/${maxAllowedByTier}`;
        }

        // Only display pips up to maxAllowedByTier (later bars hidden per user request)
        for (let i = 0; i < cfg.max; i++) {
          const pip = document.getElementById(`pip-${cfg.id}-${i}`);
          if (pip) {
            if (i >= maxAllowedByTier) {
              pip.style.display = 'none';
            } else {
              pip.style.display = '';
              pip.classList.toggle('active', i < lvl);
            }
          }
        }
      }
    });

    // Top-down drop banner check
    const hasNextTier = shipCfg.evolvesTo && shipCfg.evolvesTo.length > 0;
    if (player.crystals >= player.stats.cargoCapacity && hasNextTier) {
      this.showTierUpDropBanner(player);
    }
  }

  showTierUpDropBanner(player) {
    if (!player) return;
    const currentCfg = SHIP_TREE[player.shipKey];
    if (!currentCfg.evolvesTo || currentCfg.evolvesTo.length === 0) return;

    if (this.topTierBanner.classList.contains('dropped') && this.currentBannerShipKey === player.shipKey) {
      return;
    }
    this.currentBannerShipKey = player.shipKey;

    // Clean up existing hologram instances
    if (this.hologramAnimFrame) {
      cancelAnimationFrame(this.hologramAnimFrame);
      this.hologramAnimFrame = null;
    }
    if (this.hologramInstances) {
      this.hologramInstances.forEach(item => {
        try { item.renderer.dispose(); } catch (e) {}
      });
    }
    this.hologramInstances = [];

    this.topTierChoices.innerHTML = '';
    currentCfg.evolvesTo.forEach(shipKey => {
      const card = document.createElement('div');
      card.className = 'tier-choice-card';
      card.title = 'Gelişmek için tıkla';

      const canvas = document.createElement('canvas');
      canvas.className = 'hologram-canvas';
      canvas.width = 154;
      canvas.height = 130;
      card.appendChild(canvas);

      // Sci-fi tech corners
      ['tl', 'tr', 'bl', 'br'].forEach(pos => {
        const corner = document.createElement('div');
        corner.className = `hologram-corner ${pos}`;
        card.appendChild(corner);
      });

      // Holographic scanlines overlay
      const scanlines = document.createElement('div');
      scanlines.className = 'hologram-scanlines';
      card.appendChild(scanlines);

      // Initialize mini Three.js hologram renderer
      try {
        const renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.setSize(154, 130, false);

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(45, 154 / 130, 0.1, 1000);
        camera.up.set(0, 0, 1);
        camera.position.set(0, -68, 54);
        camera.lookAt(0, 0, 0);

        const ambLight = new THREE.AmbientLight(0xffffff, 1.2);
        scene.add(ambLight);
        const dirLight = new THREE.DirectionalLight(0xddeeff, 1.8);
        dirLight.position.set(15, -30, 40);
        scene.add(dirLight);

        // Build the ship model for this tier with natural nation materials (User request: gemileri daha küçük göster sığmıyor gibi)
        const shipRoot = ModelBuilder.createShipMesh(shipKey, player.nation || 'blue');
        shipRoot.scale.set(0.68, 0.68, 0.68);
        scene.add(shipRoot);

        this.hologramInstances.push({ renderer, scene, camera, shipRoot });
      } catch (err) {
        console.warn('[HOLOGRAM] Mini renderer init error:', err);
      }

      card.addEventListener('click', () => {
        this.game.evolvePlayer(shipKey);
        this.hideTierUpDropBanner();
      });
      this.topTierChoices.appendChild(card);
    });

    this.topTierBanner.classList.add('dropped');

    // Run holographic rotation loop
    const animateHolograms = () => {
      if (!this.topTierBanner.classList.contains('dropped')) return;
      if (this.hologramInstances) {
        this.hologramInstances.forEach(item => {
          if (item.shipRoot) {
            item.shipRoot.rotation.z += 0.024;
          }
          item.renderer.render(item.scene, item.camera);
        });
      }
      this.hologramAnimFrame = requestAnimationFrame(animateHolograms);
    };
    this.hologramAnimFrame = requestAnimationFrame(animateHolograms);
  }

  hideTierUpDropBanner() {
    this.topTierBanner.classList.remove('dropped');
    this.currentBannerShipKey = null;
    if (this.hologramAnimFrame) {
      cancelAnimationFrame(this.hologramAnimFrame);
      this.hologramAnimFrame = null;
    }
    if (this.hologramInstances) {
      this.hologramInstances.forEach(item => {
        try { item.renderer.dispose(); } catch (e) {}
      });
      this.hologramInstances = [];
    }
  }

  updateRadar(player, asteroids, bots, gems, stations, worldSize) {
    const ctx = this.radarCtx;
    const w = this.radarCanvas.width;
    const h = this.radarCanvas.height;
    ctx.clearRect(0, 0, w, h);

    if (!player) return;

    const cx = w / 2;
    const cy = h / 2;
    const radarRadius = 106; // Usable radius inside 240px container
    const tacticalRange = 2400; // Local tactical scanning range (scaled for 8250 galaxy)
    const scale = radarRadius / tacticalRange;

    // 1. Draw Radar Range Rings & Crosshairs
    ctx.strokeStyle = 'rgba(80, 200, 255, 0.16)';
    ctx.lineWidth = 1;
    [0.33, 0.66, 1.0].forEach(r => {
      ctx.beginPath();
      ctx.arc(cx, cy, radarRadius * r, 0, Math.PI * 2);
      ctx.stroke();
    });

    // Subtle 4-axis cardinal tick marks
    ctx.strokeStyle = 'rgba(80, 220, 255, 0.35)';
    ctx.lineWidth = 1.2;
    [[0, -1], [0, 1], [-1, 0], [1, 0]].forEach(([dx, dy]) => {
      ctx.beginPath();
      ctx.moveTo(cx + dx * (radarRadius - 7), cy + dy * (radarRadius - 7));
      ctx.lineTo(cx + dx * radarRadius, cy + dy * radarRadius);
      ctx.stroke();
    });

    // 2. Draw Nation Stations (Bases)
    if (stations) {
      for (const key of ['blue', 'red', 'gold']) {
        const st = stations[key];
        if (!st) continue;
        const dx = st.x - player.x;
        const dy = st.y - player.y;
        const dist = Math.hypot(dx, dy);
        const nCfg = NATIONS[key] || NATIONS['blue'];
        const isOwnBase = (player.nation === key);

        if (dist <= tacticalRange) {
          // Inside tactical range: Render at exact relative position
          const rx = cx + dx * scale;
          const ry = cy + dy * scale;

          if (st.isDead) {
            // Destroyed base marker
            ctx.strokeStyle = '#555555';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(rx, ry, 8, 0, Math.PI * 2);
            ctx.stroke();

            ctx.strokeStyle = '#ff3344';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(rx - 5, ry - 5); ctx.lineTo(rx + 5, ry + 5);
            ctx.moveTo(rx + 5, ry - 5); ctx.lineTo(rx - 5, ry + 5);
            ctx.stroke();

            ctx.fillStyle = '#ff6677';
            ctx.font = '8px "Play", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('YIKILDI', rx, ry + 15);
          } else {
            // Active Base halo ring & core
            ctx.strokeStyle = nCfg.hex;
            ctx.lineWidth = isOwnBase ? 2.5 : 1.8;
            ctx.beginPath();
            ctx.arc(rx, ry, 9, 0, Math.PI * 2);
            ctx.stroke();

            ctx.fillStyle = nCfg.hex;
            ctx.beginPath();
            ctx.arc(rx, ry, 4.5, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 9px "Play", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(`${nCfg.name.toUpperCase()} Lv${st.level || 1}`, rx, ry + 15);
          }
        } else {
          // Distant Base (> 3600 units): Render as Navigational Beacon on Radar Rim!
          const angle = Math.atan2(dy, dx);
          const beaconR = radarRadius - 8;
          const bx = cx + Math.cos(angle) * beaconR;
          const by = cy + Math.sin(angle) * beaconR;

          ctx.save();
          ctx.translate(bx, by);
          ctx.rotate(angle);

          ctx.fillStyle = st.isDead ? '#666666' : nCfg.hex;
          ctx.beginPath();
          ctx.moveTo(6, 0);
          ctx.lineTo(-5, -4);
          ctx.lineTo(-3, 0);
          ctx.lineTo(-5, 4);
          ctx.closePath();
          ctx.fill();

          if (isOwnBase && !st.isDead) {
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1;
            ctx.stroke();
          }
          ctx.restore();

          // Distance readout in km
          const distKm = (dist / 1000).toFixed(1) + 'k';
          ctx.fillStyle = st.isDead ? '#777777' : (isOwnBase ? '#ffffff' : nCfg.hex);
          ctx.font = 'bold 8px "Play", monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          const labelR = beaconR - 11;
          ctx.fillText(distKm, cx + Math.cos(angle) * labelR, cy + Math.sin(angle) * labelR);
        }
      }
    }

    // 3. Draw Tactical Asteroids within scanner range
    // Passive background asteroids outside tacticalRange are excluded (User request: "radar da arka planda kalan pasif asteroitler görülmeyecek")
    if (asteroids) {
      for (const a of asteroids) {
        if (a.isDead) continue;
        const dx = a.x - player.x;
        const dy = a.y - player.y;
        const dist = Math.hypot(dx, dy);

        // Exclude distant background asteroids (> 3600 units)
        if (dist > tacticalRange) continue;

        const rx = cx + dx * scale;
        const ry = cy + dy * scale;

        // Size tier: 1 to 7 -> dot radius from 2.2px to 6.0px
        const tier = a.sizeTier || 1;
        const dotRadius = Math.max(2.2, Math.min(6.0, 1.8 + tier * 0.65));

        // Uniform radar blue with 25% overlay ("radarda tüm asteroitler aynı mavi görülsün ama böyle net bir mavi değil %25 overlay verebilrisin")
        const fillColor = 'rgba(60, 160, 255, 0.25)';

        // Active mining indicator if damaged
        if (a.health < a.maxHealth) {
          ctx.strokeStyle = 'rgba(100, 190, 255, 0.40)';
          ctx.lineWidth = 1.0;
          ctx.beginPath();
          ctx.arc(rx, ry, dotRadius + 1.8, 0, Math.PI * 2);
          ctx.stroke();
        }

        ctx.fillStyle = fillColor;
        ctx.beginPath();
        ctx.arc(rx, ry, dotRadius, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Gems are hidden from radar per user request: "radarda düşen ganimetin görülmesini engelleyelim"

    // 4. Draw Remote Ships / Bots on Radar within tactical range
    const otherShips = Array.isArray(bots) ? bots : (bots instanceof Map ? Array.from(bots.values()) : []);
    for (const b of otherShips) {
      if (b.isDead) continue;
      const dx = b.x - player.x;
      const dy = b.y - player.y;
      const dist = Math.hypot(dx, dy);

      if (dist <= tacticalRange) {
        const rx = cx + dx * scale;
        const ry = cy + dy * scale;
        const nationCfg = NATIONS[b.nation] || NATIONS['red'];

        ctx.save();
        ctx.translate(rx, ry);
        if (typeof b.rotation === 'number') {
          ctx.rotate(b.rotation);
        }
        ctx.fillStyle = nationCfg.hex;
        ctx.beginPath();
        ctx.moveTo(6, 0);
        ctx.lineTo(-4.5, -3.5);
        ctx.lineTo(-2.5, 0);
        ctx.lineTo(-4.5, 3.5);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
    }

    // 5. Draw Player Marker at Center (Sharp tactical chevron + forward heading line)
    const playerNationCfg = NATIONS[player.nation] || NATIONS['blue'];
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(player.rotation);

    // Forward heading beam
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(11, 0);
    ctx.lineTo(24, 0);
    ctx.stroke();

    // Outer white chevron border
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(10, 0);
    ctx.lineTo(-7.5, -6);
    ctx.lineTo(-4.5, 0);
    ctx.lineTo(-7.5, 6);
    ctx.closePath();
    ctx.fill();

    // Inner nation color core
    ctx.fillStyle = playerNationCfg.hex;
    ctx.beginPath();
    ctx.moveTo(8, 0);
    ctx.lineTo(-6, -4.5);
    ctx.lineTo(-3, 0);
    ctx.lineTo(-6, 4.5);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  updateLeaderboard(player, remotePlayers = []) {
    const metric = this.activeLeaderboardMetric || 'kills';
    const all = [];
    if (player && !player.isDead) {
      all.push({
        name: player.name,
        score: player.score || 0,
        kills: player.kills || 0,
        mined: player.mined || 0,
        donations: player.donations || 0,
        isPlayer: true,
        nation: player.nation
      });
    }
    const remotes = Array.isArray(remotePlayers) ? remotePlayers : (remotePlayers instanceof Map ? Array.from(remotePlayers.values()) : []);
    for (const b of remotes) {
      if (!b.isDead) {
        all.push({
          name: b.name,
          score: b.score || 0,
          kills: b.kills || 0,
          mined: b.mined || 0,
          donations: b.donations || 0,
          isPlayer: false,
          nation: b.nation
        });
      }
    }

    if (metric === 'kills') {
      all.sort((a, b) => (b.kills - a.kills) || (b.score - a.score));
    } else if (metric === 'mined') {
      all.sort((a, b) => (b.mined - a.mined) || (b.score - a.score));
    } else if (metric === 'donations') {
      all.sort((a, b) => (b.donations - a.donations) || (b.score - a.score));
    } else {
      all.sort((a, b) => b.score - a.score);
    }

    const top = all.slice(0, 7);

    this.leaderboardList.innerHTML = top.map((entry, idx) => {
      const nationCfg = NATIONS[entry.nation] || NATIONS['blue'];
      let metricVal = '';
      if (metric === 'kills') {
        metricVal = `${entry.kills}`;
      } else if (metric === 'mined') {
        metricVal = `${entry.mined}`;
      } else if (metric === 'donations') {
        metricVal = `${entry.donations}`;
      } else {
        metricVal = `${entry.score}`;
      }

      return `
        <div class="leader-item ${entry.isPlayer ? 'player' : ''}">
          <span class="leader-rank">#${idx + 1}</span>
          <span style="margin-right: 5px;">${nationCfg.icon}</span>
          <span class="leader-name" style="color: ${nationCfg.hex};">${entry.name}</span>
          <span class="leader-score">${metricVal}</span>
        </div>
      `;
    }).join('');
  }

  showGameOver(player) {
    this.hideTierUpDropBanner();
    if (this.respawnInterval) {
      clearInterval(this.respawnInterval);
      this.respawnInterval = null;
    }

    document.getElementById('final-score').textContent = player ? player.score : 0;
    document.getElementById('final-crystals').textContent = player ? player.crystals : 0;
    const shipName = player ? SHIP_TREE[player.shipKey].name : 'Fly';
    document.getElementById('final-tier').textContent = shipName;

    // Show 5-second countdown timer box immediately
    const timerBox = document.getElementById('respawn-timer-container');
    const countdownNum = document.getElementById('respawn-countdown-num');
    const progressFill = document.getElementById('respawn-progress-fill');
    const respawnBtn = document.getElementById('respawn-btn');

    if (timerBox) timerBox.style.display = 'flex';
    if (countdownNum) countdownNum.textContent = '5';
    if (progressFill) progressFill.style.width = '100%';

    if (respawnBtn) {
      respawnBtn.style.display = 'none';
    }

    this.gameOverScreen.style.display = 'flex';

    // Start 5-second automatic respawn countdown immediately
    const totalDuration = 5000;
    const startTime = Date.now();

    this.respawnInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, totalDuration - elapsed);
      const secondsLeft = Math.ceil(remaining / 1000);

      if (countdownNum) {
        countdownNum.textContent = secondsLeft;
      }
      if (progressFill) {
        progressFill.style.width = `${(remaining / totalDuration) * 100}%`;
      }

      if (remaining <= 0) {
        clearInterval(this.respawnInterval);
        this.respawnInterval = null;
        this.hideGameOver();
        this.game.respawnPlayer();
      }
    }, 50);
  }

  startRespawnCountdown() {
    if (this.respawnInterval) {
      clearInterval(this.respawnInterval);
      this.respawnInterval = null;
    }
    this.hideGameOver();
    this.game.respawnPlayer();
  }

  showAnnouncement(msg, duration = 4000) {
    const banner = document.getElementById('announcement-banner');
    if (!banner) return;
    banner.textContent = msg;
    banner.style.display = 'block';
    if (this.announceTimer) clearTimeout(this.announceTimer);
    this.announceTimer = setTimeout(() => {
      banner.style.display = 'none';
    }, duration);
  }

  showVictory(winningNation, isPlayerWin, player, countdownSeconds = 8) {
    this.hideTierUpDropBanner();
    this.hideGameOver();

    if (this.victoryCountdownInterval) {
      clearInterval(this.victoryCountdownInterval);
      this.victoryCountdownInterval = null;
    }

    const victoryScreen = document.getElementById('victory-screen');
    const title = document.getElementById('victory-title');
    const subtitle = document.getElementById('victory-subtitle');
    const banner = document.getElementById('victory-nation-banner');
    const countdownSecEl = document.getElementById('victory-countdown-sec');
    const nCfg = NATIONS[winningNation] || NATIONS['blue'];

    if (isPlayerWin) {
      title.textContent = '🏆 ZAFER! 🏆';
      title.style.color = '#ffd700';
      subtitle.textContent = 'Tüm düşman üsleri imha edildi! Galaksinin tek hakimi sizsiniz!';
      banner.innerHTML = `${nCfg.icon} <span style="color:${nCfg.hex}">${nCfg.name.toUpperCase()}</span> GALAKSİYİ FETHETTİ!`;
    } else {
      title.textContent = 'KAYBETTİNİZ';
      title.style.color = '#ff3355';
      subtitle.textContent = `Üssünüz düştü ve ${nCfg.name} galaksiyi ele geçirdi.`;
      banner.innerHTML = `${nCfg.icon} <span style="color:${nCfg.hex}">${nCfg.name.toUpperCase()}</span> KAZANDI!`;
    }

    document.getElementById('victory-score').textContent = player ? player.score : 0;
    document.getElementById('victory-crystals').textContent = player ? player.crystals : 0;
    const shipName = player ? SHIP_TREE[player.shipKey].name : 'Fly';
    document.getElementById('victory-tier').textContent = shipName;

    let timeLeft = countdownSeconds;
    if (countdownSecEl) {
      countdownSecEl.textContent = timeLeft;
    }

    const returnAction = () => {
      if (this.victoryCountdownInterval) {
        clearInterval(this.victoryCountdownInterval);
        this.victoryCountdownInterval = null;
      }
      victoryScreen.style.display = 'none';
      if (this.game && typeof this.game.returnToMenu === 'function') {
        this.game.returnToMenu();
      }
    };

    const restartBtn = document.getElementById('victory-restart-btn');
    if (restartBtn) {
      restartBtn.onclick = returnAction;
    }

    this.victoryCountdownInterval = setInterval(() => {
      timeLeft--;
      if (countdownSecEl) {
        countdownSecEl.textContent = Math.max(0, timeLeft);
      }
      if (timeLeft <= 0) {
        returnAction();
      }
    }, 1000);

    victoryScreen.style.display = 'flex';
  }

  hideGameOver() {
    if (this.respawnInterval) {
      clearInterval(this.respawnInterval);
      this.respawnInterval = null;
    }
    this.gameOverScreen.style.display = 'none';
  }

  showNationEliminated() {
    this.hideTierUpDropBanner();
    this.hideGameOver();
    const vic = document.getElementById('victory-screen');
    if (vic) vic.style.display = 'none';

    // Screen blur & saturation -80% ("ekran bulanıklaşıp doygunluğu %80 düşecek ulusunuz yok oldu... yazacak sadece.")
    const canvasCont = document.getElementById('canvas-container');
    const hud = document.getElementById('in-game-hud');
    const actionBar = document.getElementById('tactical-action-bar');
    if (canvasCont) canvasCont.classList.add('nation-eliminated-filter');
    if (hud) hud.classList.add('nation-eliminated-filter');
    if (actionBar) actionBar.classList.add('nation-eliminated-filter');

    const overlay = document.getElementById('nation-eliminated-overlay');
    if (overlay) {
      overlay.style.display = 'flex';
      overlay.onclick = () => {
        if (this._eliminatedTimeout) clearTimeout(this._eliminatedTimeout);
        this.hideNationEliminated();
        if (this.game) this.game.returnToMenu();
      };
    }

    if (this._eliminatedTimeout) clearTimeout(this._eliminatedTimeout);
    this._eliminatedTimeout = setTimeout(() => {
      this.hideNationEliminated();
      if (this.game) this.game.returnToMenu();
    }, 3500);
  }

  hideNationEliminated() {
    const overlay = document.getElementById('nation-eliminated-overlay');
    if (overlay) overlay.style.display = 'none';

    const canvasCont = document.getElementById('canvas-container');
    const hud = document.getElementById('in-game-hud');
    const actionBar = document.getElementById('tactical-action-bar');
    if (canvasCont) canvasCont.classList.remove('nation-eliminated-filter');
    if (hud) hud.classList.remove('nation-eliminated-filter');
    if (actionBar) actionBar.classList.remove('nation-eliminated-filter');
  }

  showMainMenu() {
    if (this.victoryCountdownInterval) {
      clearInterval(this.victoryCountdownInterval);
      this.victoryCountdownInterval = null;
    }
    this.hideGameOver();
    this.hideTierUpDropBanner();
    this.hideNationEliminated();
    const vic = document.getElementById('victory-screen');
    if (vic) vic.style.display = 'none';

    const inGameHud = document.getElementById('in-game-hud');
    if (inGameHud) inGameHud.style.display = 'none';

    const actionBar = document.getElementById('tactical-action-bar');
    if (actionBar) actionBar.style.display = 'none';

    this.closeUpgradeDock();

    const startScreen = this.startScreen || document.getElementById('start-screen');
    if (startScreen) {
      startScreen.style.display = 'flex';
      startScreen.style.opacity = '1';
    }

    if (this.game && this.game.stations) {
      for (const nation of ['red', 'blue', 'gold']) {
        const st = this.game.stations[nation];
        const card = document.querySelector(`.nation-card.${nation}`);
        const lockOverlay = document.getElementById(`nation-lock-${nation}`);
        if (st && st.isDead) {
          if (card) {
            card.classList.add('destroyed');
            card.classList.remove('selected');
          }
          if (lockOverlay) {
            lockOverlay.style.display = 'flex';
            lockOverlay.innerHTML = `
              <span class="lock-icon" style="font-size:1.15rem;margin-bottom:3px;">💥</span>
              <span class="lock-text" style="color:#ef4444;font-size:0.7rem;line-height:1.2;text-align:center;">ÜS YOK EDİLDİ<br><small style="font-size:0.6rem;opacity:0.85;">(SEÇİLEMEZ)</small></span>
            `;
          }
        } else {
          if (card) {
            card.classList.remove('destroyed');
          }
          if (lockOverlay && !card.classList.contains('locked')) {
            lockOverlay.style.display = 'none';
          }
        }
      }
    }

    if (this.game && this.game.network && this.game.network.socket) {
      this.game.network.socket.emit('get_team_status');
    }
  }
}

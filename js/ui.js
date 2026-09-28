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

    this.initUpgradesUI();
    this.initEventListeners();
  }

  initUpgradesUI() {
    if (!this.upgradeGrid) return;
    this.upgradeGrid.innerHTML = '';
    UPGRADE_CONFIG.forEach(cfg => {
      const card = document.createElement('div');
      card.className = 'upgrade-card';
      card.id = `upgrade-${cfg.id}`;
      card.title = `${cfg.name} [${cfg.key}] (Maliyet: ${cfg.costPerLevel} Kristal)`;
      card.innerHTML = `
        <span class="upgrade-key-badge">${cfg.key}</span>
        <div class="upgrade-card-icon">${cfg.icon || '⚡'}</div>
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
        if (currentCard && currentCard.classList.contains('locked')) {
          this.showAnnouncement('Seçili ulus şu anda dolu! Lütfen açık olan bir ulusu seçin.', 3000);
          return;
        }
        const nameInput = document.getElementById('player-name-input');
        const name = (nameInput ? nameInput.value.trim() : '') || 'KOMUTAN';
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

    // Chat Box Form and Input Listeners
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

  startLoadingSequence(name, nation) {
    if (this.startScreen) this.startScreen.style.display = 'none';
    const loadingScreen = document.getElementById('loading-screen');
    const loadingBar = document.getElementById('loading-bar-fill');
    const loadingStatus = document.getElementById('loading-status');
    const loadingPct = document.getElementById('loading-pct');

    if (!loadingScreen) {
      this.game.startGame(name, nation);
      return;
    }

    loadingScreen.style.display = 'flex';
    loadingScreen.style.opacity = '1';

    let progress = 0;
    const duration = 2200; // 2.2 seconds loading animation
    const startTime = performance.now();

    const updateLoading = (currentTime) => {
      const elapsed = currentTime - startTime;
      progress = Math.min(100, (elapsed / duration) * 100);

      if (loadingBar) loadingBar.style.width = `${progress}%`;
      if (loadingPct) loadingPct.textContent = `${Math.round(progress)}%`;

      if (loadingStatus) {
        if (progress < 25) {
          loadingStatus.textContent = 'GRAVİTASYON MOTORLARI BAŞLATILIYOR...';
        } else if (progress < 55) {
          loadingStatus.textContent = 'ULUS SİSTEMLERİNE VE MERKEZ ÜSSE BAĞLANILIYOR...';
        } else if (progress < 85) {
          loadingStatus.textContent = 'LAZER & KALKAN MODÜLLERİ AKTİVE EDİLİYOR...';
        } else {
          loadingStatus.textContent = 'SAVAŞ VANGUARD PROTOKOLÜ HAZIR!';
        }
      }

      if (progress < 100) {
        requestAnimationFrame(updateLoading);
      } else {
        setTimeout(() => {
          loadingScreen.style.transition = 'opacity 0.35s ease';
          loadingScreen.style.opacity = '0';
          setTimeout(() => {
            loadingScreen.style.display = 'none';
            this.game.startGame(name, nation);
          }, 350);
        }, 250);
      }
    };

    requestAnimationFrame(updateLoading);
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

  addChatMessage(sender, text, nation = 'blue', isSystem = false) {
    if (!this.chatMessages) return;
    const msg = document.createElement('div');
    msg.className = 'chat-msg';

    let nationClass = `nation-${nation}`;
    let prefix = '';
    if (isSystem) {
      nationClass = 'chat-sys';
      prefix = '⚡ SİSTEM:';
    } else {
      const nationName = nation === 'red' ? 'Kryos' : nation === 'gold' ? 'Aethelon' : 'Veylarian';
      prefix = `[${nationName}] ${sender}:`;
    }

    msg.innerHTML = `<span class="chat-author ${nationClass}">${prefix}</span> <span class="chat-text">${this.escapeHtml(text)}</span>`;
    this.chatMessages.appendChild(msg);

    // Keep max 40 messages to avoid clutter
    while (this.chatMessages.children.length > 40) {
      this.chatMessages.removeChild(this.chatMessages.firstChild);
    }
    this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
  }

  updateTeamStatus(data) {
    if (!data) return;
    const { counts, status } = data;
    if (!counts || !status) return;

    for (const nation of ['red', 'blue', 'gold']) {
      const badge = document.getElementById(`pilot-count-${nation}`);
      if (badge) {
        badge.textContent = `${counts[nation] || 0} Pilot`;
      }
      const card = document.querySelector(`.nation-card.${nation}`);
      const lockOverlay = document.getElementById(`nation-lock-${nation}`);
      const isLocked = !!(status[nation] && status[nation].locked);

      if (card) {
        card.classList.toggle('locked', isLocked);
      }
      if (lockOverlay) {
        lockOverlay.style.display = isLocked ? 'flex' : 'none';
      }
    }

    // Auto-switch away from locked nation if currently selected
    const currentCard = document.querySelector(`.nation-card.${this.selectedNation}`);
    if (currentCard && currentCard.classList.contains('locked')) {
      const open = ['red', 'blue', 'gold'].filter(n => status[n] && !status[n].locked);
      if (open.length > 0) {
        this.selectNation(open[0]);
        this.showAnnouncement(`Takım dengesini korumak için ${open[0].toUpperCase()} ulusuna geçildi!`, 3500);
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
        this.game.network.sendChat(text);
      } else {
        this.addChatMessage(this.game.player.name, text, this.game.player.nation);
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
      if (dist <= 300) {
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
      let minHostileDist = 650;
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

    // Update Upgrade Cards (Square Grid)
    UPGRADE_CONFIG.forEach(cfg => {
      const lvl = player.upgrades[cfg.id] || 0;
      const card = document.getElementById(`upgrade-${cfg.id}`);
      const isMax = lvl >= cfg.max;
      const canAfford = player.crystals >= cfg.costPerLevel && !isMax;

      if (card) {
        card.classList.toggle('maxed', isMax);
        card.classList.toggle('disabled', !canAfford && !isMax);

        const lvlBadge = document.getElementById(`level-${cfg.id}`);
        if (lvlBadge) {
          lvlBadge.textContent = isMax ? 'MAX' : `${lvl}/${cfg.max}`;
        }

        for (let i = 0; i < cfg.max; i++) {
          const pip = document.getElementById(`pip-${cfg.id}-${i}`);
          if (pip) {
            pip.classList.toggle('active', i < lvl);
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

    this.topTierChoices.innerHTML = '';
    currentCfg.evolvesTo.forEach(shipKey => {
      const cfg = SHIP_TREE[shipKey];
      const card = document.createElement('div');
      card.className = `tier-choice-card ${cfg.classType || ''}`;

      let traitText = '';
      if (cfg.classType === 'tank') traitText = 'Ağır Kuşatma Topu';
      else if (cfg.classType === 'speed') traitText = "3'lü Seri Atış";
      else if (cfg.classType === 'bruiser') traitText = 'Dengeli İkiz Top';
      else if (cfg.classType === 'healer') traitText = 'Şifa Işınları';

      card.innerHTML = `
        <div class="choice-class-badge ${cfg.classType || ''}">
          <span>${cfg.classIcon || '🛸'}</span>
          <span>${cfg.className || 'Sınıf'}</span>
        </div>
        <div class="choice-ship-name">${cfg.name.split('(')[0].trim()}</div>
        <div class="choice-trait-tag ${cfg.classType || ''}">${traitText}</div>
        <button class="choice-select-btn">SEÇ</button>
      `;
      card.addEventListener('click', () => {
        this.game.evolvePlayer(shipKey);
        this.hideTierUpDropBanner();
      });
      this.topTierChoices.appendChild(card);
    });

    this.topTierBanner.classList.add('dropped');
  }

  hideTierUpDropBanner() {
    this.topTierBanner.classList.remove('dropped');
    this.currentBannerShipKey = null;
  }

  updateRadar(player, asteroids, bots, gems, stations, worldSize) {
    const ctx = this.radarCtx;
    const w = this.radarCanvas.width;
    const h = this.radarCanvas.height;
    ctx.clearRect(0, 0, w, h);

    if (!player) return;

    const radarRange = 4800; // Wide range across the 10000 arena
    const scale = (w / 2) / radarRange;
    const cx = w / 2;
    const cy = h / 2;

    // Draw Radar rings
    ctx.strokeStyle = 'rgba(80, 200, 255, 0.18)';
    ctx.lineWidth = 1;
    [0.33, 0.66, 0.95].forEach(r => {
      ctx.beginPath();
      ctx.arc(cx, cy, (w / 2) * r, 0, Math.PI * 2);
      ctx.stroke();
    });

    // Draw the 3 Nation Bases on Radar
    if (stations) {
      for (const key in stations) {
        const st = stations[key];
        const dx = st.x - player.x;
        const dy = st.y - player.y;
        const nCfg = NATIONS[key] || NATIONS['blue'];
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
          ctx.moveTo(rx - 5, ry - 5);
          ctx.lineTo(rx + 5, ry + 5);
          ctx.moveTo(rx + 5, ry - 5);
          ctx.lineTo(rx - 5, ry + 5);
          ctx.stroke();

          ctx.fillStyle = '#ff6677';
          ctx.font = '8px Play';
          ctx.textAlign = 'center';
          ctx.fillText('YIKILDI', rx, ry + 15);
          continue;
        }

        // Active Base halo ring
        ctx.strokeStyle = nCfg.hex;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(rx, ry, 9, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = nCfg.hex;
        ctx.beginPath();
        ctx.arc(rx, ry, 4.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.font = '9px Play';
        ctx.textAlign = 'center';
        ctx.fillText(`Lv${st.level}`, rx, ry + 15);
      }
    }

    // Draw Asteroids on Radar (7 sizes)
    ctx.fillStyle = 'rgba(160, 160, 160, 0.7)';
    for (const a of asteroids) {
      if (a.isDead) continue;
      const dx = a.x - player.x;
      const dy = a.y - player.y;
      if (Math.hypot(dx, dy) < radarRange) {
        ctx.beginPath();
        const dotRadius = Math.max(1.4, Math.min(4.5, a.sizeTier * 0.65));
        ctx.arc(cx + dx * scale, cy + dy * scale, dotRadius, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Gems are hidden from radar per user request: "radarda düşen ganimetin görülmesini engelleyelim"

    // Draw Remote Ships on Radar (Colored by their nation)
    const otherShips = Array.isArray(bots) ? bots : (bots instanceof Map ? Array.from(bots.values()) : []);
    for (const b of otherShips) {
      if (b.isDead) continue;
      const dx = b.x - player.x;
      const dy = b.y - player.y;
      if (Math.hypot(dx, dy) < radarRange) {
        const nationCfg = NATIONS[b.nation] || NATIONS['red'];
        ctx.fillStyle = nationCfg.hex;
        ctx.beginPath();
        ctx.arc(cx + dx * scale, cy + dy * scale, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Draw Player marker (Arrow in player's nation color)
    const playerNationCfg = NATIONS[player.nation] || NATIONS['blue'];
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(player.rotation);
    ctx.fillStyle = playerNationCfg.hex;
    ctx.beginPath();
    ctx.moveTo(10, 0);
    ctx.lineTo(-8, -6);
    ctx.lineTo(-5, 0);
    ctx.lineTo(-8, 6);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  updateLeaderboard(player, remotePlayers = []) {
    const all = [];
    if (player && !player.isDead) {
      all.push({ name: player.name, score: player.score, isPlayer: true, nation: player.nation });
    }
    const remotes = Array.isArray(remotePlayers) ? remotePlayers : (remotePlayers instanceof Map ? Array.from(remotePlayers.values()) : []);
    for (const b of remotes) {
      if (!b.isDead) {
        all.push({ name: b.name, score: b.score || 0, isPlayer: false, nation: b.nation });
      }
    }

    all.sort((a, b) => b.score - a.score);
    const top = all.slice(0, 7);

    this.leaderboardList.innerHTML = top.map((entry, idx) => {
      const nationCfg = NATIONS[entry.nation] || NATIONS['blue'];
      return `
        <div class="leader-item ${entry.isPlayer ? 'player' : ''}">
          <span class="leader-rank">#${idx + 1}</span>
          <span style="margin-right: 5px;">${nationCfg.icon}</span>
          <span class="leader-name" style="color: ${nationCfg.hex};">${entry.name}</span>
          <span class="leader-score">${entry.score}</span>
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

  showVictory(winningNation, isPlayerWin, player) {
    this.hideTierUpDropBanner();
    this.hideGameOver();

    const victoryScreen = document.getElementById('victory-screen');
    const title = document.getElementById('victory-title');
    const subtitle = document.getElementById('victory-subtitle');
    const banner = document.getElementById('victory-nation-banner');
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

    const restartBtn = document.getElementById('victory-restart-btn');
    restartBtn.onclick = () => {
      victoryScreen.style.display = 'none';
      const name = player ? player.name : 'KOMUTAN';
      this.game.startGame(name, this.selectedNation);
    };

    victoryScreen.style.display = 'flex';
  }

  hideGameOver() {
    if (this.respawnInterval) {
      clearInterval(this.respawnInterval);
      this.respawnInterval = null;
    }
    this.gameOverScreen.style.display = 'none';
  }
}

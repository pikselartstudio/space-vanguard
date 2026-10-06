// ===================================================================
// Space Vanguard Network Manager (Socket.IO Real-time Multiplayer)
// Handles Live Synchronization, Team Balancing & Persistent Galaxy
// ===================================================================

class NetworkManager {
  constructor(game) {
    this.game = game;
    this.socket = null;
    this.myId = null;
    this.isConnected = false;
    this.serverUrl = this.resolveServerUrl();
    this.lastStateSentTime = 0;
    this.teamStatus = null;

    this.initSocket();
  }

  resolveServerUrl() {
    // 1. Check custom user-defined server from localStorage
    const saved = localStorage.getItem('sv_server_url');
    if (saved && saved.trim()) {
      return saved.trim();
    }

    // 2. If running on HTTP or HTTPS (Render, Railway, Fly, Localhost, etc.)
    if (window.location.protocol === 'http:' || window.location.protocol === 'https:') {
      // If hosted statically on GitHub Pages (username.github.io), fallback to remote backend
      if (window.location.hostname.endsWith('github.io')) {
        return 'https://space-vanguard.onrender.com';
      }
      return window.location.origin;
    }

    // 3. Local file:// fallback
    return 'http://localhost:3000';
  }

  setServerUrl(newUrl) {
    if (!newUrl) return;
    let url = newUrl.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    localStorage.setItem('sv_server_url', url);
    this.serverUrl = url;

    if (this.socket) {
      this.socket.disconnect();
    }
    this.initSocket();
  }

  initSocket() {
    this.updateConnectionStatus('connecting', 'Sunucuya bağlanılıyor...');

    try {
      if (typeof io === 'undefined') {
        console.warn('[NETWORK] Socket.io client script not yet loaded.');
        this.updateConnectionStatus('offline', 'Socket.IO kütüphanesi yüklenemedi');
        return;
      }

      this.socket = io(this.serverUrl, {
        transports: ['websocket', 'polling'],
        timeout: 7000,
        reconnectionAttempts: 10,
        reconnectionDelay: 1500
      });

      this.setupListeners();
    } catch (err) {
      console.error('[NETWORK] Socket connection error:', err);
      this.updateConnectionStatus('offline', 'Bağlantı hatası: ' + err.message);
    }
  }

  updateConnectionStatus(status, text) {
    const dot = document.getElementById('server-status-dot');
    const label = document.getElementById('server-status-text');
    if (dot) {
      dot.className = `server-dot ${status}`;
    }
    if (label) {
      label.textContent = text;
    }
  }

  setupListeners() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      this.isConnected = true;
      this.myId = this.socket.id;
      console.log(`[NETWORK] Sunucuya Bağlandı! ID: ${this.myId} (${this.serverUrl})`);
      this.updateConnectionStatus('online', `Çevrimiçi (${this.serverUrl.replace(/https?:\/\//, '')})`);
      this.socket.emit('get_team_status');
    });

    this.socket.on('connect_error', (err) => {
      this.isConnected = false;
      console.warn('[NETWORK] Bağlantı kurulamadı:', err.message);
      this.updateConnectionStatus('offline', 'Sunucu Çevrimdışı (Ayarlardan adresi kontrol edin)');
    });

    this.socket.on('disconnect', (reason) => {
      this.isConnected = false;
      console.log('[NETWORK] Sunucu bağlantısı koptu:', reason);
      this.updateConnectionStatus('offline', 'Bağlantı kesildi. Yeniden bağlanılıyor...');
    });

    // Initial galaxy data
    this.socket.on('init_data', (data) => {
      this.myId = data.yourId;
      if (data.teamStatus) {
        this.handleTeamStatus(data.teamStatus);
      }
      if (data.asteroids && this.game) {
        this.game.syncServerAsteroids(data.asteroids);
      }
      if (data.stations && this.game) {
        this.game.syncServerStations(data.stations);
      }
      if (data.refineries && this.game) {
        this.game.syncServerRefineries(data.refineries);
      }
      if (data.crystals && this.game) {
        this.game.syncServerCrystals(data.crystals);
      }
      if (data.players && this.game) {
        this.game.syncServerExistingPlayers(data.players);
      }
      if (data.galaxyTheme && this.game && this.game.universe) {
        this.game.universe.setCosmicTheme(data.galaxyTheme);
      }
    });

    // Real-time team balance updates
    this.socket.on('team_status', (data) => {
      this.handleTeamStatus(data);
    });

    // Join game response
    this.socket.on('join_success', (data) => {
      console.log('[NETWORK] Oyuna Başarıyla Katılındı:', data.player);
      if (this.game) {
        if (data.galaxyTheme && this.game.universe) {
          this.game.universe.setCosmicTheme(data.galaxyTheme);
        }
        if (data.asteroids) {
          this.game.syncServerAsteroids(data.asteroids);
        }
        if (data.stations) {
          this.game.syncServerStations(data.stations);
        }
        if (data.refineries) {
          this.game.syncServerRefineries(data.refineries);
        }
        if (data.crystals) {
          this.game.syncServerCrystals(data.crystals);
        }
        if (data.players) {
          this.game.syncServerExistingPlayers(data.players);
        }
        this.game.onServerJoinSuccess(data.player, data.spawn);
      }
    });

    // High frequency player state ticks from server
    this.socket.on('players_tick', (data) => {
      if (this.game && Array.isArray(data.players)) {
        this.game.syncRemotePlayersTick(data.players);
      }
    });

    // A new player joined the galaxy
    this.socket.on('player_joined', (playerData) => {
      if (playerData.id === this.myId) return;
      console.log('[NETWORK] Yeni Pilot Katıldı:', playerData.name);
      if (this.game) {
        this.game.addRemotePlayer(playerData);
      }
    });

    // A player disconnected
    this.socket.on('player_left', (data) => {
      if (this.game) {
        this.game.removeRemotePlayer(data.playerId);
      }
    });

    // Remote lasers fired
    this.socket.on('remote_fire', (data) => {
      if (data.playerId === this.myId) return;
      if (this.game) {
        this.game.spawnRemoteLasers(data);
      }
    });

    // Remote player evolved ship tier
    this.socket.on('player_evolved', (data) => {
      if (data.playerId === this.myId) return;
      if (this.game) {
        this.game.onRemotePlayerEvolve(data.playerId, data.shipKey);
      }
    });

    // Asteroids
    this.socket.on('asteroid_damaged', (data) => {
      if (this.game) {
        this.game.onServerAsteroidDamaged(data);
      }
    });

    this.socket.on('asteroid_destroyed', (data) => {
      if (this.game) {
        this.game.onServerAsteroidDestroyed(data);
      }
    });

    this.socket.on('asteroid_spawned', (astData) => {
      if (this.game) {
        this.game.onServerAsteroidSpawned(astData);
      }
    });

    // Crystals
    this.socket.on('crystals_spawned', (data) => {
      if (this.game && Array.isArray(data.crystals)) {
        this.game.syncServerCrystals(data.crystals);
      }
    });

    this.socket.on('crystal_collected', (data) => {
      if (this.game) {
        this.game.onServerCrystalCollected(data);
      }
    });

    this.socket.on('crystals_expired', (data) => {
      if (this.game && Array.isArray(data.crystalIds)) {
        this.game.removeExpiredCrystals(data.crystalIds);
      }
    });

    // Player Combat Hits
    this.socket.on('player_damaged', (data) => {
      if (this.game) {
        this.game.onServerPlayerDamaged(data);
      }
    });

    this.socket.on('player_healed', (data) => {
      if (this.game) {
        this.game.onServerPlayerHealed(data);
      }
    });

    this.socket.on('player_killed', (data) => {
      if (this.game) {
        this.game.onServerPlayerKilled(data);
      }
    });

    this.socket.on('player_respawned', (data) => {
      if (this.game) {
        this.game.onServerPlayerRespawned(data);
      }
    });

    // Bases
    this.socket.on('base_damaged', (data) => {
      if (this.game) {
        this.game.onServerBaseDamaged(data);
      }
    });

    this.socket.on('base_updated', (data) => {
      if (this.game) {
        this.game.onServerBaseUpdated(data);
      }
    });

    this.socket.on('base_destroyed', (data) => {
      if (this.game) {
        this.game.onServerBaseDestroyed(data);
      }
    });

    // Neutral Mining Refineries (Plan A)
    this.socket.on('refineries_state', (data) => {
      if (this.game && data.refineries) {
        this.game.syncServerRefineries(data.refineries);
      }
    });

    this.socket.on('refineries_income', (data) => {
      if (this.game && this.game.player && data.rewards) {
        const myReward = data.rewards[this.game.player.nation] || 0;
        if (myReward > 0 && this.game.ui) {
          // User request: "rafineri gelirini sadece istatistik kısmında arttığını görelim ekstra görmemize gerek yok. ortada ki gelen yazı ile gerek yok."
          this.game.ui.updateHUD(this.game.player, this.game.stations);
        }
      }
    });

    // Round Concluded (Victory & Countdown)
    this.socket.on('round_concluded', (data) => {
      if (this.game) {
        this.game.onServerRoundConcluded(data);
      }
    });

    // Galaxy Reset (New Round Initialized on Server)
    this.socket.on('galaxy_reset', (data) => {
      if (this.game) {
        if (data.galaxyTheme && this.game.universe) {
          this.game.universe.setCosmicTheme(data.galaxyTheme);
        }
        this.game.onServerGalaxyReset(data);
      }
    });

    // Tactical Chat
    this.socket.on('chat_message', (data) => {
      if (this.game && this.game.ui) {
        this.game.ui.addChatMessage(data.senderName, data.text, data.nation, data.isSystem, data.channel || 'global');
      }
    });
  }

  handleTeamStatus(data) {
    this.teamStatus = data;
    if (this.game && this.game.ui) {
      this.game.ui.updateTeamStatus(data);
    }
  }

  // Emitters
  joinGame(name, nation) {
    if (!this.isConnected || !this.socket) {
      console.warn('[NETWORK] Sunucuya bağlı değil, yerel modda başlatılıyor...');
      return false;
    }
    this.socket.emit('join_game', { name, nation });
    return true;
  }

  sendPlayerState(player) {
    if (!this.isConnected || !this.socket || !player) return;

    const now = performance.now();
    if (now - this.lastStateSentTime < 35) return; // ~28Hz throttle
    this.lastStateSentTime = now;

    this.socket.emit('player_state', {
      x: Math.round(player.x),
      y: Math.round(player.y),
      vx: Math.round(player.vx * 10) / 10,
      vy: Math.round(player.vy * 10) / 10,
      rotation: Math.round(player.rotation * 1000) / 1000,
      isThrusting: !!player.isThrusting,
      shield: Math.round(player.shield),
      energy: Math.round(player.energy),
      crystals: player.crystals || 0,
      score: player.score || 0,
      shipKey: player.shipKey,
      upgrades: player.upgrades
    });
  }

  emitFireLasers(lasers) {
    if (!this.isConnected || !this.socket) return;
    this.socket.emit('fire_lasers', { lasers });
  }

  emitHitAsteroid(asteroidId, damage, x = null, y = null) {
    if (!this.isConnected || !this.socket) return;
    this.socket.emit('hit_asteroid', {
      asteroidId,
      damage,
      x: x !== null ? Math.round(x) : undefined,
      y: y !== null ? Math.round(y) : undefined
    });
  }

  emitHitPlayer(targetId, damage, isHeal = false) {
    if (!this.isConnected || !this.socket) return;
    this.socket.emit('hit_player', { targetId, damage, isHeal });
  }

  emitHitBase(nation, damage, isHeal = false) {
    if (!this.isConnected || !this.socket) return;
    this.socket.emit('hit_base', { nation, damage, isHeal });
  }

  emitCollectCrystal(crystalId, x = null, y = null) {
    if (!this.isConnected || !this.socket) return;
    this.socket.emit('collect_crystal', {
      crystalId,
      x: x !== null ? Math.round(x) : undefined,
      y: y !== null ? Math.round(y) : undefined
    });
  }

  emitEvolve(shipKey, tier) {
    if (!this.isConnected || !this.socket) return;
    this.socket.emit('evolve_ship', { shipKey, tier });
  }

  emitDonateBase(amount) {
    if (!this.isConnected || !this.socket) return;
    this.socket.emit('donate_base', { amount });
  }

  emitRespawn() {
    if (!this.isConnected || !this.socket) return;
    this.socket.emit('respawn_player');
  }

  sendChat(text, channel = 'global') {
    if (!this.isConnected || !this.socket) return;
    this.socket.emit('send_chat', { text, channel });
  }
}

window.NetworkManager = NetworkManager;

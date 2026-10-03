// Ship evolution tree, base stats, upgrade definitions, and 5 tiers of ships
const NATIONS = {
  red: {
    id: 'red',
    name: 'Kryos Ulusu',
    planet: 'Mars',
    color: 0xff2a4b,
    hex: '#ff2a4b',
    laserColor: 0xff2a4b,
    icon: '🔴',
    description: 'Soğuk, hesapçı ve bürokratik bir askeri-sanayi gücü çağrıştırır. Yapay zekâ entegrasyonu, insansız filo sistemleri veya maden/kaynak kontrolünü elinde tutan teknokratik bir yapıya çok iyi uyar.'
  },
  blue: {
    id: 'blue',
    name: 'Veylarian Ulusu',
    planet: 'Dünya',
    color: 0x0099ff,
    hex: '#0099ff',
    laserColor: 0x00e5ff,
    icon: '🌍',
    description: 'Kadim, disiplinli ve teknolojik olarak üstün bir ırk/ulus hissi verir. Ağır zırhlı kruvazörler, merkezi bir imparatorluk yapısı ve enerji silahlarında uzmanlaşmış bir doktrin için idealdir.'
  },
  gold: {
    id: 'gold',
    name: 'Aethelon Ulusu',
    planet: 'Satürn',
    color: 0xffbb00,
    hex: '#ffbb00',
    laserColor: 0xffdd22,
    icon: '🪐',
    description: 'Birden fazla yıldız sisteminin veya özgür koloninin kurduğu diplomatik ve esnek bir koalisyon havası taşır. Hızlı saldırı gemileri, ticaret filoları ve gelişmiş kalkan teknolojisi kullanan dengeli bir ulus için uygundur.'
  }
};

const UPGRADE_CONFIG = [
  { id: 'shieldCap', name: 'Kalkan Kapasitesi', shortName: 'KALKAN', icon: '🛡️', key: '1', max: 6, costPerLevel: 50, bonusPercent: 0.15 },
  { id: 'shieldRegen', name: 'Kalkan Yenilenmesi', shortName: 'K. YENİLEME', icon: '🔄', key: '2', max: 6, costPerLevel: 50, bonusPercent: 0.20 },
  { id: 'energyCap', name: 'Lazer Kapasitesi', shortName: 'LAZER', icon: '🔋', key: '3', max: 6, costPerLevel: 50, bonusPercent: 0.15 },
  { id: 'energyRegen', name: 'Lazer Yenilemesi', shortName: 'L. YENİLEME', icon: '⚡', key: '4', max: 6, costPerLevel: 50, bonusPercent: 0.20 },
  { id: 'fireDamage', name: 'Lazer Hasarı', shortName: 'HASAR', icon: '💥', key: '5', max: 6, costPerLevel: 50, bonusPercent: 0.14 },
  { id: 'fireSpeed', name: 'Lazer Hızı', shortName: 'ATIŞ HIZI', icon: '🚀', key: '6', max: 6, costPerLevel: 50, bonusPercent: 0.12 },
  { id: 'shipSpeed', name: 'Gemi Hızı', shortName: 'HIZ', icon: '💨', key: '7', max: 6, costPerLevel: 50, bonusPercent: 0.12 },
  { id: 'shipAgility', name: 'Gemi Çevikliği', shortName: 'ÇEVİKLİK', icon: '🎯', key: '8', max: 6, costPerLevel: 50, bonusPercent: 0.15 },
];

const SHIP_TREE = {
  // =========================================================================
  // === 7 ANA SEVİYE GEMİLERİ (GÖRSELLER İLE BİREBİR ÖZEL MODELLEME) ===
  // =========================================================================

  // SEVİYE 1: Keşif Avcısı (1.png)
  'tier-1': {
    name: 'Keşif Avcısı (Lv.1)',
    tier: 1,
    classType: 'scout',
    className: 'Keşif Avcısı',
    classIcon: '🛸',
    description: 'Çevik delta kanatlı başlangıç keşif gemisi. Yüksek verimli tek namlulu plazma madenci lazeri.',
    cargoCapacity: 60,
    radius: 18,
    baseStats: {
      shieldCap: 180,
      shieldRegen: 24,
      energyCap: 100,
      energyRegen: 38,
      fireDamage: 22,
      fireSpeed: 600,
      fireRange: 600,
      fireRate: 0.18,
      shipSpeed: 250,
      shipAgility: 5.5,
      mass: 1.0
    },
    weapons: [
      { offset: { x: 0, y: 25 }, isHeavy: false, energyCost: 5 }
    ],
    evolvesTo: ['tier-2']
  },

  // SEVİYE 2: İğne Avcı (2.png)
  'tier-2': {
    name: 'İğne Avcı (Lv.2)',
    tier: 2,
    classType: 'interceptor',
    className: 'Keskin Nişancı Avcı',
    classIcon: '🎯',
    description: 'Uzun menzilli iğne plazma topu ve geniş hücum kanatlarına sahip aerodinamik süpersonik önleme gemisi.',
    cargoCapacity: 160,
    radius: 20,
    baseStats: {
      shieldCap: 320,
      shieldRegen: 30,
      energyCap: 140,
      energyRegen: 45,
      fireDamage: 40,
      fireSpeed: 720,
      fireRange: 750,
      fireRate: 0.22,
      shipSpeed: 275,
      shipAgility: 5.2,
      mass: 2.2
    },
    weapons: [
      { offset: { x: 0, y: 26 }, isHeavy: false, energyCost: 8 }
    ],
    evolvesTo: ['tier-3']
  },

  // SEVİYE 3: Çift Gövde Katamarana (3.png)
  'tier-3': {
    name: 'Katamarana (Lv.3)',
    tier: 3,
    classType: 'assault',
    className: 'Çift Gövdeli Taarruz',
    classIcon: '⚡',
    description: 'Çift kokpitli ve paralel gövdeli ağır taarruz avcısı. İki yan gövdeden ateşlenen ikiz ağır lazer bataryası.',
    cargoCapacity: 350,
    radius: 22,
    baseStats: {
      shieldCap: 520,
      shieldRegen: 36,
      energyCap: 190,
      energyRegen: 52,
      fireDamage: 36,
      fireSpeed: 650,
      fireRange: 680,
      fireRate: 0.20,
      shipSpeed: 240,
      shipAgility: 4.6,
      mass: 4.2
    },
    weapons: [
      // User request: Seviye 3 geminin tüm lazerleri namlu ucundan çıkmalı (scaled to model barrel tips)
      { offset: { x: -16.8, y: 26.5 }, isHeavy: false, energyCost: 6 },
      { offset: { x: 16.8, y: 26.5 }, isHeavy: false, energyCost: 6 }
    ],
    evolvesTo: ['tier-4']
  },

  // SEVİYE 4: Çift Çatal Saldırı Muharibi (5.png - Eski Lv.5)
  'tier-4': {
    name: 'Mızrak Muharip (Lv.4)',
    tier: 4,
    classType: 'destroyer',
    className: 'Çift Çatal Muharip',
    classIcon: '🔱',
    description: 'İleri uzanan çift enerji çatalından ateşlenen yırtıcı taarruz muhribi.',
    cargoCapacity: 650,
    radius: 25,
    baseStats: {
      shieldCap: 950,
      shieldRegen: 50,
      energyCap: 300,
      energyRegen: 65,
      fireDamage: 44,
      fireSpeed: 660,
      fireRange: 750,
      fireRate: 0.22,
      shipSpeed: 210,
      shipAgility: 3.6,
      mass: 7.5
    },
    weapons: [
      // User request: Seviye 4 geminin tüm lazerleri namlu ucundan çıkmalı (scaled to prong tips)
      { offset: { x: -9.8, y: 36.5 }, isHeavy: true, energyCost: 8 },
      { offset: { x: 9.8, y: 36.5 }, isHeavy: true, energyCost: 8 }
    ],
    evolvesTo: ['tier-5']
  },

  // SEVİYE 5: Yüce Amiral Sancağı (7.png - Zirve Seviye Gemi)
  'tier-5': {
    name: 'Amiral Titan (Lv.5)',
    tier: 5,
    classType: 'titan',
    className: 'Yüce Amiral Sancağı',
    classIcon: '👑',
    description: 'Galaksinin zirvesi. Dış pilonlar, ağır zırh ve çift pruva namlusundan ateşlenen sancak gemisi.',
    cargoCapacity: 1200,
    radius: 28,
    baseStats: {
      shieldCap: 1650,
      shieldRegen: 70,
      energyCap: 450,
      energyRegen: 85,
      fireDamage: 54,
      fireSpeed: 700,
      fireRange: 860,
      fireRate: 0.24,
      shipSpeed: 180,
      shipAgility: 2.8,
      mass: 12.0
    },
    weapons: [
      // User request: Seviye 5 geminin tüm lazerleri çift pruva namlu ucundan çıkmalı
      { offset: { x: -5.3, y: 38.0 }, isHeavy: true, energyCost: 8 },
      { offset: { x: 5.3, y: 38.0 }, isHeavy: true, energyCost: 8 }
    ],
    evolvesTo: []
  },

  // Legacy aliases for backward safety
  'tier-6': null, // Replaced
  'tier-7': null, // Replaced

  // fly alias to tier-1
  'fly': {
    name: 'Keşif Avcısı (Lv.1)',
    tier: 1,
    classType: 'scout',
    className: 'Keşif Avcısı',
    classIcon: '🛸',
    description: 'Çevik delta kanatlı başlangıç keşif gemisi. Yüksek verimli tek namlulu plazma madenci lazeri.',
    cargoCapacity: 60,
    radius: 18,
    baseStats: {
      shieldCap: 180,
      shieldRegen: 24,
      energyCap: 100,
      energyRegen: 38,
      fireDamage: 22,
      fireSpeed: 600,
      fireRange: 600,
      fireRate: 0.18,
      shipSpeed: 250,
      shipAgility: 5.5,
      mass: 1.0
    },
    weapons: [
      { offset: { x: 0, y: 25 }, isHeavy: false, energyCost: 5 }
    ],
    evolvesTo: ['tier-2']
  },

  // =========================================================================
  // 1. AĞIR TANK SINIFI (Maksimum Zırh & Kalkan, Yavaş ama Güçlü Tek Atış)
  // =========================================================================
  // Seviye 2 Tank
  'tank-rhino': {
    name: 'Gergedan (Rhino)',
    tier: 2,
    classType: 'tank',
    className: 'Ağır Tank',
    classIcon: '🛡️',
    description: 'Ağır zırhlı öncü tank. Tek namlulu yüksek hasarlı ağır lazer topu.',
    cargoCapacity: 100,
    radius: 24,
    baseStats: {
      shieldCap: 420,
      shieldRegen: 30,
      energyCap: 130,
      energyRegen: 35,
      fireDamage: 42,
      fireSpeed: 520,
      fireRange: 680,
      fireRate: 0.58,
      shipSpeed: 175,
      shipAgility: 3.2,
      mass: 2.2
    },
    weapons: [
      { offset: { x: 0, y: 22 }, isHeavy: true, energyCost: 26 }
    ],
    evolvesTo: []
  },
  // Seviye 3 Tank
  'tank-goliath': {
    name: 'Golyat (Goliath)',
    tier: 3,
    classType: 'tank',
    className: 'Ağır Tank',
    classIcon: '🛡️',
    description: 'Ağır zırhlı muharebe tankı. Tekli devasa ağır kuşatma topu ve yüksek kalkan.',
    cargoCapacity: 200,
    radius: 32,
    baseStats: {
      shieldCap: 680,
      shieldRegen: 46,
      energyCap: 220,
      energyRegen: 55,
      fireDamage: 76,
      fireSpeed: 580,
      fireRange: 800,
      fireRate: 0.70,
      shipSpeed: 160,
      shipAgility: 2.6,
      mass: 3.4
    },
    weapons: [
      { offset: { x: 0, y: 29 }, isHeavy: true, energyCost: 45 }
    ],
    evolvesTo: []
  },
  // Seviye 4 Tank (Zirve)
  'tank-titan': {
    name: 'Titan (Zırhlı Kale)',
    tier: 4,
    classType: 'tank',
    className: 'Ağır Tank',
    classIcon: '🛡️',
    description: 'Aşılmaz uçan kale. Yıkıcı hasara sahip devasa sancak kuşatma raylı topu.',
    cargoCapacity: 400,
    radius: 40,
    baseStats: {
      shieldCap: 1120,
      shieldRegen: 72,
      energyCap: 380,
      energyRegen: 90,
      fireDamage: 140,
      fireSpeed: 660,
      fireRange: 960,
      fireRate: 0.85,
      shipSpeed: 145,
      shipAgility: 2.2,
      mass: 5.2
    },
    weapons: [
      { offset: { x: 0, y: 38 }, isHeavy: true, energyCost: 65 }
    ],
    evolvesTo: []
  },

  // =========================================================================
  // 2. AŞIRI MANEVRALI SERİ GEMİ (Kırılgan, Hızlı & Kaçış Ustası)
  // =========================================================================
  // Seviye 2 Hızlı Avcı
  'speed-dart': {
    name: 'Dart (Ok)',
    tier: 2,
    classType: 'speed',
    className: 'Seri Avcı',
    classIcon: '⚡',
    description: 'Aşırı hızlı ve manevralı avcı. 3\'lü seri lazer atışı (enerji biterse yavaşlar ve 2\'li atışa geçer).',
    cargoCapacity: 100,
    radius: 22,
    baseStats: {
      shieldCap: 240,
      shieldRegen: 24,
      energyCap: 120,
      energyRegen: 45,
      fireDamage: 9,
      fireSpeed: 650,
      fireRange: 680,
      fireRate: 0.16,
      shipSpeed: 270,
      shipAgility: 5.6,
      mass: 0.95
    },
    weapons: [
      { offset: { x: -8, y: 16 }, isHeavy: false, energyCost: 6 },
      { offset: { x: 0, y: 22 }, isHeavy: false, energyCost: 7 },
      { offset: { x: 8, y: 16 }, isHeavy: false, energyCost: 6 }
    ],
    evolvesTo: []
  },
  // Seviye 3 Hızlı Avcı
  'speed-phantom': {
    name: 'Gölge (Phantom)',
    tier: 3,
    classType: 'speed',
    className: 'Seri Avcı',
    classIcon: '⚡',
    description: 'Işık hızında it dalaşı ustası. 3\'lü plazma atışı (enerji biterse yavaşlar ve 2\'li atışa geçer).',
    cargoCapacity: 200,
    radius: 29,
    baseStats: {
      shieldCap: 380,
      shieldRegen: 36,
      energyCap: 190,
      energyRegen: 65,
      fireDamage: 14,
      fireSpeed: 750,
      fireRange: 820,
      fireRate: 0.14,
      shipSpeed: 295,
      shipAgility: 5.4,
      mass: 1.2
    },
    weapons: [
      { offset: { x: -12, y: 20 }, isHeavy: false, energyCost: 10 },
      { offset: { x: 0, y: 28 }, isHeavy: false, energyCost: 12 },
      { offset: { x: 12, y: 20 }, isHeavy: false, energyCost: 10 }
    ],
    evolvesTo: []
  },
  // Seviye 4 Hızlı Avcı (Zirve)
  'speed-tempest': {
    name: 'Fırtına (Tempest)',
    tier: 4,
    classType: 'speed',
    className: 'Seri Avcı',
    classIcon: '⚡',
    description: 'Maksimum sürat ve kaçış gücü. 3\'lü yüksek frekanslı plazma püskürtücü.',
    cargoCapacity: 400,
    radius: 36,
    baseStats: {
      shieldCap: 580,
      shieldRegen: 50,
      energyCap: 320,
      energyRegen: 105,
      fireDamage: 20,
      fireSpeed: 820,
      fireRange: 920,
      fireRate: 0.12,
      shipSpeed: 320,
      shipAgility: 5.2,
      mass: 1.6
    },
    weapons: [
      { offset: { x: -16, y: 25 }, isHeavy: false, energyCost: 14 },
      { offset: { x: 0, y: 34 }, isHeavy: true, energyCost: 18 },
      { offset: { x: 16, y: 25 }, isHeavy: false, energyCost: 14 }
    ],
    evolvesTo: []
  },

  // =========================================================================
  // 3. HEM TANK HEM SAVAŞÇI (Dengeli Orta Düzey Kalkan & Saldırı)
  // =========================================================================
  // Seviye 2 Dengeli Savaşçı
  'bruiser-crusader': {
    name: 'Haçlı (Crusader)',
    tier: 2,
    classType: 'bruiser',
    className: 'Dengeli Savaşçı',
    classIcon: '⚔️',
    description: 'Dengeli kalkan ve saldırı gücü. Çift namlulu etkili taarruz lazerleri.',
    cargoCapacity: 100,
    radius: 24,
    baseStats: {
      shieldCap: 330,
      shieldRegen: 28,
      energyCap: 125,
      energyRegen: 40,
      fireDamage: 16,
      fireSpeed: 590,
      fireRange: 660,
      fireRate: 0.19,
      shipSpeed: 215,
      shipAgility: 4.3,
      mass: 1.5
    },
    weapons: [
      { offset: { x: -10, y: 20 }, isHeavy: false, energyCost: 11 },
      { offset: { x: 10, y: 20 }, isHeavy: false, energyCost: 11 }
    ],
    evolvesTo: []
  },
  // Seviye 3 Dengeli Savaşçı
  'bruiser-marauder': {
    name: 'Akıncı (Marauder)',
    tier: 3,
    classType: 'bruiser',
    className: 'Dengeli Savaşçı',
    classIcon: '⚔️',
    description: 'Hem zırhı güçlü hem saldırısı etkili. İkiz ağır taarruz bataryaları.',
    cargoCapacity: 200,
    radius: 31,
    baseStats: {
      shieldCap: 520,
      shieldRegen: 42,
      energyCap: 210,
      energyRegen: 60,
      fireDamage: 26,
      fireSpeed: 650,
      fireRange: 780,
      fireRate: 0.19,
      shipSpeed: 210,
      shipAgility: 3.9,
      mass: 2.3
    },
    weapons: [
      { offset: { x: -14, y: 26 }, isHeavy: true, energyCost: 18 },
      { offset: { x: 14, y: 26 }, isHeavy: true, energyCost: 18 }
    ],
    evolvesTo: []
  },
  // Seviye 4 Dengeli Savaşçı (Zirve)
  'bruiser-warlord': {
    name: 'Savaş Lordu (Warlord)',
    tier: 4,
    classType: 'bruiser',
    className: 'Dengeli Savaşçı',
    classIcon: '⚔️',
    description: 'Ağır kruvazör mimarisi. Çift devasa ana batarya ile yüksek hasarlı yaylım ateşi.',
    cargoCapacity: 400,
    radius: 39,
    baseStats: {
      shieldCap: 840,
      shieldRegen: 62,
      energyCap: 340,
      energyRegen: 90,
      fireDamage: 42,
      fireSpeed: 700,
      fireRange: 900,
      fireRate: 0.18,
      shipSpeed: 200,
      shipAgility: 3.5,
      mass: 3.2
    },
    weapons: [
      { offset: { x: -18, y: 32 }, isHeavy: true, energyCost: 28 },
      { offset: { x: 18, y: 32 }, isHeavy: true, energyCost: 28 }
    ],
    evolvesTo: []
  },

  // =========================================================================
  // 4. ŞİFACI & DESTEK GEMİSİ (Ağır Manevra, Dostlarını Ateşle İyileştiren)
  // =========================================================================
  // Seviye 2 Şifacı
  'healer-cleric': {
    name: 'Rahip (Cleric)',
    tier: 2,
    classType: 'healer',
    className: 'Şifacı Destek',
    classIcon: '💚',
    description: 'Ağır manevralı şifacı. İkiz yeşil lazerleri dost oyuncuları iyileştirir, vurdukça can yeniler.',
    cargoCapacity: 100,
    radius: 24,
    isHealer: true,
    baseStats: {
      shieldCap: 320,
      shieldRegen: 30,
      energyCap: 150,
      energyRegen: 45,
      fireDamage: 13,
      fireSpeed: 540,
      fireRange: 620,
      fireRate: 0.22,
      shipSpeed: 180,
      shipAgility: 3.3,
      mass: 2.0
    },
    weapons: [
      { offset: { x: -10, y: 18 }, isHeavy: false, energyCost: 10 },
      { offset: { x: 10, y: 18 }, isHeavy: false, energyCost: 10 }
    ],
    evolvesTo: []
  },
  // Seviye 3 Şifacı
  'healer-guardian': {
    name: 'Muhafız (Guardian)',
    tier: 3,
    classType: 'healer',
    className: 'Şifacı Destek',
    classIcon: '💚',
    description: 'Çift emitörlü güçlü şifacı. Dost oyunculara ateş ederek canlarını hızla doldurur.',
    cargoCapacity: 200,
    radius: 31,
    isHealer: true,
    baseStats: {
      shieldCap: 520,
      shieldRegen: 46,
      energyCap: 250,
      energyRegen: 70,
      fireDamage: 20,
      fireSpeed: 600,
      fireRange: 720,
      fireRate: 0.22,
      shipSpeed: 165,
      shipAgility: 2.8,
      mass: 2.9
    },
    weapons: [
      { offset: { x: -14, y: 24 }, isHeavy: false, energyCost: 16 },
      { offset: { x: 14, y: 24 }, isHeavy: false, energyCost: 16 }
    ],
    evolvesTo: []
  },
  // Seviye 4 Şifacı (Zirve)
  'healer-aegis': {
    name: 'Hayat Gemisi (Aegis)',
    tier: 4,
    classType: 'healer',
    className: 'Şifacı Destek',
    classIcon: '💚',
    description: 'Filo restorasyon amiral gemisi. İkiz ağır şifa kanalları ile yüksek hasar ve süratli tamir.',
    cargoCapacity: 400,
    radius: 39,
    isHealer: true,
    baseStats: {
      shieldCap: 820,
      shieldRegen: 66,
      energyCap: 380,
      energyRegen: 100,
      fireDamage: 32,
      fireSpeed: 640,
      fireRange: 820,
      fireRate: 0.20,
      shipSpeed: 155,
      shipAgility: 2.4,
      mass: 4.2
    },
    weapons: [
      { offset: { x: -18, y: 30 }, isHeavy: true, energyCost: 24 },
      { offset: { x: 18, y: 30 }, isHeavy: true, energyCost: 24 }
    ],
    evolvesTo: []
  }
};

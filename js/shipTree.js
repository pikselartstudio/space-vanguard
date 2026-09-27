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
  // === SEVİYE 1: ORTAK BAŞLANGIÇ KEŞİF GEMİSİ ===
  'fly': {
    name: 'Fly (Keşif)',
    tier: 1,
    classType: 'starter',
    className: 'Keşif Gemisi',
    classIcon: '🛸',
    description: 'Ortak başlangıç keşif gemisi. Kargo dolunca 4 sınıftan birini seçersiniz.',
    cargoCapacity: 60,
    radius: 18,
    baseStats: {
      shieldCap: 170,
      shieldRegen: 18,
      energyCap: 75,
      energyRegen: 25,
      fireDamage: 5,
      fireSpeed: 540,
      fireRange: 580,
      fireRate: 0.22,
      shipSpeed: 240,
      shipAgility: 5.2,
      mass: 1.0
    },
    weapons: [
      { offset: { x: 0, y: 16 }, isHeavy: false, energyCost: 9 }
    ],
    evolvesTo: ['tank-rhino', 'speed-dart', 'bruiser-crusader', 'healer-cleric']
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
    cargoCapacity: 140,
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
    evolvesTo: ['tank-goliath']
  },
  // Seviye 3 Tank
  'tank-goliath': {
    name: 'Golyat (Goliath)',
    tier: 3,
    classType: 'tank',
    className: 'Ağır Tank',
    classIcon: '🛡️',
    description: 'Ağır zırhlı muharebe tankı. Tekli devasa ağır kuşatma topu ve yüksek kalkan.',
    cargoCapacity: 300,
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
    evolvesTo: ['tank-titan']
  },
  // Seviye 4 Tank (Zirve)
  'tank-titan': {
    name: 'Titan (Zırhlı Kale)',
    tier: 4,
    classType: 'tank',
    className: 'Ağır Tank',
    classIcon: '🛡️',
    description: 'Aşılmaz uçan kale. Yıkıcı hasara sahip devasa sancak kuşatma raylı topu.',
    cargoCapacity: 600,
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
    cargoCapacity: 140,
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
    evolvesTo: ['speed-phantom']
  },
  // Seviye 3 Hızlı Avcı
  'speed-phantom': {
    name: 'Gölge (Phantom)',
    tier: 3,
    classType: 'speed',
    className: 'Seri Avcı',
    classIcon: '⚡',
    description: 'Işık hızında it dalaşı ustası. 3\'lü plazma atışı (enerji biterse yavaşlar ve 2\'li atışa geçer).',
    cargoCapacity: 300,
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
    evolvesTo: ['speed-tempest']
  },
  // Seviye 4 Hızlı Avcı (Zirve)
  'speed-tempest': {
    name: 'Fırtına (Tempest)',
    tier: 4,
    classType: 'speed',
    className: 'Seri Avcı',
    classIcon: '⚡',
    description: 'Maksimum sürat ve kaçış gücü. 3\'lü yüksek frekanslı plazma püskürtücü.',
    cargoCapacity: 600,
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
    cargoCapacity: 140,
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
    evolvesTo: ['bruiser-marauder']
  },
  // Seviye 3 Dengeli Savaşçı
  'bruiser-marauder': {
    name: 'Akıncı (Marauder)',
    tier: 3,
    classType: 'bruiser',
    className: 'Dengeli Savaşçı',
    classIcon: '⚔️',
    description: 'Hem zırhı güçlü hem saldırısı etkili. İkiz ağır taarruz bataryaları.',
    cargoCapacity: 300,
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
    evolvesTo: ['bruiser-warlord']
  },
  // Seviye 4 Dengeli Savaşçı (Zirve)
  'bruiser-warlord': {
    name: 'Savaş Lordu (Warlord)',
    tier: 4,
    classType: 'bruiser',
    className: 'Dengeli Savaşçı',
    classIcon: '⚔️',
    description: 'Ağır kruvazör mimarisi. Çift devasa ana batarya ile yüksek hasarlı yaylım ateşi.',
    cargoCapacity: 600,
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
    cargoCapacity: 140,
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
    evolvesTo: ['healer-guardian']
  },
  // Seviye 3 Şifacı
  'healer-guardian': {
    name: 'Muhafız (Guardian)',
    tier: 3,
    classType: 'healer',
    className: 'Şifacı Destek',
    classIcon: '💚',
    description: 'Çift emitörlü güçlü şifacı. Dost oyunculara ateş ederek canlarını hızla doldurur.',
    cargoCapacity: 300,
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
    evolvesTo: ['healer-aegis']
  },
  // Seviye 4 Şifacı (Zirve)
  'healer-aegis': {
    name: 'Hayat Gemisi (Aegis)',
    tier: 4,
    classType: 'healer',
    className: 'Şifacı Destek',
    classIcon: '💚',
    description: 'Filo restorasyon amiral gemisi. İkiz ağır şifa kanalları ile yüksek hasar ve süratli tamir.',
    cargoCapacity: 600,
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

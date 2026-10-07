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

const UPGRADE_COSTS = [30, 50, 80, 120, 180, 260];
function getUpgradeCost(level) {
  const lvl = Math.max(0, Math.min(5, Math.floor(level || 0)));
  return UPGRADE_COSTS[lvl] || 50;
}

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

  // SEVİYE 1: Void Piercer 3D Başlangıç Gemisi
  'tier-1': {
    name: 'Void Piercer (Lv.1)',
    tier: 1,
    classType: 'scout',
    className: 'Void Piercer',
    classIcon: '🛸',
    description: '3D aerodinamik iğne gövdeli başlangıç avcısı. Yüksek verimli tek namlulu plazma madenci lazeri.',
    cargoCapacity: 60,
    radius: 18,
    baseStats: {
      shieldCap: 160,
      shieldRegen: 20,
      energyCap: 100,
      energyRegen: 32,
      fireDamage: 14,
      fireSpeed: 580,
      fireRange: 580,
      fireRate: 0.24,
      shipSpeed: 235,
      shipAgility: 5.2,
      mass: 1.0
    },
    weapons: [
      { offset: { x: 0, y: 25 }, isHeavy: false, energyCost: 5 }
    ],
    // User request: Ağaç sistemi ile 4 uzmanlık sınıfına ayrılır
    evolvesTo: ['tank-rhino', 'speed-dart', 'bruiser-crusader', 'healer-cleric']
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
      shieldCap: 380,
      shieldRegen: 34,
      energyCap: 150,
      energyRegen: 48,
      fireDamage: 45,
      fireSpeed: 720,
      fireRange: 750,
      fireRate: 0.22,
      shipSpeed: 260,
      shipAgility: 4.8,
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
      shieldCap: 750,
      shieldRegen: 46,
      energyCap: 220,
      energyRegen: 58,
      fireDamage: 52,
      fireSpeed: 670,
      fireRange: 720,
      fireRate: 0.20,
      shipSpeed: 230,
      shipAgility: 4.2,
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
      shieldCap: 1400,
      shieldRegen: 65,
      energyCap: 340,
      energyRegen: 75,
      fireDamage: 72,
      fireSpeed: 690,
      fireRange: 780,
      fireRate: 0.22,
      shipSpeed: 200,
      shipAgility: 3.4,
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
      shieldCap: 2500,
      shieldRegen: 95,
      energyCap: 500,
      energyRegen: 100,
      fireDamage: 110,
      fireSpeed: 740,
      fireRange: 900,
      fireRate: 0.24,
      shipSpeed: 175,
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
    name: 'Void Piercer (Lv.1)',
    tier: 1,
    classType: 'scout',
    className: 'Void Piercer',
    classIcon: '🛸',
    description: '3D aerodinamik iğne gövdeli başlangıç avcısı. Yüksek verimli tek namlulu plazma madenci lazeri.',
    cargoCapacity: 60,
    radius: 18,
    baseStats: {
      shieldCap: 160,
      shieldRegen: 20,
      energyCap: 100,
      energyRegen: 32,
      fireDamage: 14,
      fireSpeed: 580,
      fireRange: 580,
      fireRate: 0.24,
      shipSpeed: 235,
      shipAgility: 5.2,
      mass: 1.0
    },
    weapons: [
      { offset: { x: 0, y: 25 }, isHeavy: false, energyCost: 5 }
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
    cargoCapacity: 100,
    radius: 24,
    baseStats: {
      shieldCap: 500,
      shieldRegen: 34,
      energyCap: 140,
      energyRegen: 38,
      fireDamage: 55,
      fireSpeed: 520,
      fireRange: 680,
      fireRate: 0.55,
      shipSpeed: 175,
      shipAgility: 3.2,
      mass: 2.5
    },
    weapons: [
      { offset: { x: 0, y: 22 }, isHeavy: true, energyCost: 24 }
    ],
    evolvesTo: ['tank-goliath', 'bruiser-marauder']
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
      shieldCap: 950,
      shieldRegen: 52,
      energyCap: 240,
      energyRegen: 60,
      fireDamage: 110,
      fireSpeed: 580,
      fireRange: 800,
      fireRate: 0.65,
      shipSpeed: 160,
      shipAgility: 2.6,
      mass: 3.8
    },
    weapons: [
      { offset: { x: 0, y: 29 }, isHeavy: true, energyCost: 40 }
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
    cargoCapacity: 400,
    radius: 40,
    baseStats: {
      shieldCap: 1750,
      shieldRegen: 80,
      energyCap: 400,
      energyRegen: 95,
      fireDamage: 220,
      fireSpeed: 660,
      fireRange: 960,
      fireRate: 0.78,
      shipSpeed: 145,
      shipAgility: 2.2,
      mass: 5.6
    },
    weapons: [
      { offset: { x: 0, y: 38 }, isHeavy: true, energyCost: 55 }
    ],
    evolvesTo: ['tier-5']
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
      shieldCap: 300,
      shieldRegen: 28,
      energyCap: 130,
      energyRegen: 48,
      fireDamage: 12,
      fireSpeed: 660,
      fireRange: 700,
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
    evolvesTo: ['speed-phantom', 'bruiser-marauder']
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
      shieldCap: 560,
      shieldRegen: 42,
      energyCap: 210,
      energyRegen: 70,
      fireDamage: 20,
      fireSpeed: 760,
      fireRange: 830,
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
    cargoCapacity: 400,
    radius: 36,
    baseStats: {
      shieldCap: 950,
      shieldRegen: 58,
      energyCap: 340,
      energyRegen: 110,
      fireDamage: 32,
      fireSpeed: 830,
      fireRange: 930,
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
    evolvesTo: ['tier-5']
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
      shieldCap: 420,
      shieldRegen: 32,
      energyCap: 135,
      energyRegen: 44,
      fireDamage: 24,
      fireSpeed: 600,
      fireRange: 680,
      fireRate: 0.19,
      shipSpeed: 215,
      shipAgility: 4.3,
      mass: 1.5
    },
    weapons: [
      { offset: { x: -10, y: 20 }, isHeavy: false, energyCost: 11 },
      { offset: { x: 10, y: 20 }, isHeavy: false, energyCost: 11 }
    ],
    evolvesTo: ['bruiser-marauder', 'tank-goliath', 'speed-phantom']
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
      shieldCap: 800,
      shieldRegen: 48,
      energyCap: 230,
      energyRegen: 65,
      fireDamage: 45,
      fireSpeed: 660,
      fireRange: 790,
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
    cargoCapacity: 400,
    radius: 39,
    baseStats: {
      shieldCap: 1400,
      shieldRegen: 70,
      energyCap: 360,
      energyRegen: 95,
      fireDamage: 75,
      fireSpeed: 710,
      fireRange: 910,
      fireRate: 0.18,
      shipSpeed: 200,
      shipAgility: 3.5,
      mass: 3.2
    },
    weapons: [
      { offset: { x: -18, y: 32 }, isHeavy: true, energyCost: 28 },
      { offset: { x: 18, y: 32 }, isHeavy: true, energyCost: 28 }
    ],
    evolvesTo: ['tier-5']
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
      shieldCap: 380,
      shieldRegen: 34,
      energyCap: 160,
      energyRegen: 50,
      fireDamage: 20,
      fireSpeed: 550,
      fireRange: 640,
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
    cargoCapacity: 200,
    radius: 31,
    isHealer: true,
    baseStats: {
      shieldCap: 720,
      shieldRegen: 52,
      energyCap: 260,
      energyRegen: 75,
      fireDamage: 38,
      fireSpeed: 610,
      fireRange: 730,
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
    cargoCapacity: 400,
    radius: 39,
    isHealer: true,
    baseStats: {
      shieldCap: 1300,
      shieldRegen: 74,
      energyCap: 400,
      energyRegen: 105,
      fireDamage: 65,
      fireSpeed: 650,
      fireRange: 840,
      fireRate: 0.20,
      shipSpeed: 155,
      shipAgility: 2.4,
      mass: 4.2
    },
    weapons: [
      { offset: { x: -18, y: 30 }, isHeavy: true, energyCost: 24 },
      { offset: { x: 18, y: 30 }, isHeavy: true, energyCost: 24 }
    ],
    evolvesTo: ['tier-5']
  }
};

if (typeof window !== 'undefined') {
  window.NATIONS = NATIONS;
  window.SHIP_TREE = SHIP_TREE;
  window.UPGRADE_CONFIG = UPGRADE_CONFIG;
  window.UPGRADE_COSTS = UPGRADE_COSTS;
  window.getUpgradeCost = getUpgradeCost;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    NATIONS,
    SHIP_TREE,
    UPGRADE_CONFIG,
    UPGRADE_COSTS,
    getUpgradeCost
  };
}

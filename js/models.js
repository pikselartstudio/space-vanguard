// 3D Procedural Model Builders for Starblast-style ships, asteroids, and gems
const ModelBuilder = {
  // Common materials
  materials: {
    cockpit: new THREE.MeshStandardMaterial({
      color: 0x051525,
      metalness: 0.9,
      roughness: 0.1,
      flatShading: true
    }),
    thruster: new THREE.MeshBasicMaterial({
      color: 0x00f0ff
    }),
    gemRed: new THREE.MeshStandardMaterial({
      color: 0xff1545,
      emissive: 0xff0033,
      emissiveIntensity: 0.6,
      roughness: 0.2,
      metalness: 0.8,
      flatShading: true
    }),
    gemBig: new THREE.MeshStandardMaterial({
      color: 0xff5500,
      emissive: 0xff3300,
      emissiveIntensity: 0.7,
      roughness: 0.2,
      metalness: 0.8,
      flatShading: true
    })
  },

  createShipMesh(shipKey, customColor = null) {
    const config = SHIP_TREE[shipKey] || SHIP_TREE['fly'];
    const shipRoot = new THREE.Group();
    const shipGroup = new THREE.Group();
    shipGroup.name = 'hullGroup';
    // Rotate 3D aircraft frame into the 2D gameplay plane:
    // Longitudinal (nose +Z, engines -Z) -> lies flat in XY plane (flight axis)
    // Dorsal / Canopy (+Y) -> points towards camera (+Z, top surface visible)
    shipGroup.rotation.x = Math.PI / 2;
    shipRoot.add(shipGroup);

    const nationColor = customColor !== null ? customColor : (config.color || 0x0099ff);

    // 1. Primary Off-White / Titanium Hull Alloy (Matches reference image body)
    const baseHullMat = new THREE.MeshStandardMaterial({
      color: 0xdde2ea,
      roughness: 0.32,
      metalness: 0.35,
      flatShading: true
    });

    // 2. Vibrant Nation / Accent Color (Matches reference image purple wingtips & nose collar)
    const accentMat = new THREE.MeshStandardMaterial({
      color: nationColor,
      roughness: 0.28,
      metalness: 0.45,
      flatShading: true
    });

    // 3. Dark Titanium / Charcoal Mechanics (Matches reference image snout, barrels & engine)
    const darkMat = new THREE.MeshStandardMaterial({
      color: 0x19202c,
      roughness: 0.45,
      metalness: 0.70,
      flatShading: true
    });

    // 4. Secondary Dark Hull Inset Panels
    const panelMat = new THREE.MeshStandardMaterial({
      color: 0x263040,
      roughness: 0.40,
      metalness: 0.60,
      flatShading: true
    });

    // 5. Polished Gunmetal for Weapon Barrels
    const gunMetalMat = new THREE.MeshStandardMaterial({
      color: 0x8294a6,
      roughness: 0.20,
      metalness: 0.90,
      flatShading: true
    });

    // 6. Deep Tinted Cockpit Glass (Matches reference image canopy)
    const cockpitMat = new THREE.MeshStandardMaterial({
      color: 0x0a1626,
      emissive: 0x002238,
      emissiveIntensity: 0.65,
      roughness: 0.08,
      metalness: 0.95,
      flatShading: true
    });

    // 7. Canopy Center White Frame Ridge (Matches reference image center white stripe)
    const canopyFrameMat = new THREE.MeshStandardMaterial({
      color: 0xf0f4f8,
      roughness: 0.25,
      metalness: 0.60,
      flatShading: true
    });

    // 8. Glowing Neon Grille Slits (Matches reference image horizontal intake lights)
    const isHealerShip = (config.classType === 'healer');
    const grilleGlowMat = new THREE.MeshBasicMaterial({
      color: isHealerShip ? 0x00ffaa : nationColor
    });

    // 9. Healer Bio-Luminescent Materials
    const bioCoreMat = new THREE.MeshStandardMaterial({
      color: 0x00ff88,
      emissive: 0x00cc66,
      emissiveIntensity: 0.85,
      roughness: 0.10,
      metalness: 0.80,
      flatShading: true
    });
    const bioRingMat = new THREE.MeshStandardMaterial({
      color: 0x00ffaa,
      emissive: 0x00ee88,
      emissiveIntensity: 0.75,
      roughness: 0.15,
      metalness: 0.70,
      flatShading: true
    });

    // 10. Engine Flame Group (toggled by isThrusting in Ship.update)
    const flameGroup = new THREE.Group();
    flameGroup.name = 'engineFlame';
    flameGroup.visible = false;
    shipGroup.add(flameGroup);

    const flameMat = new THREE.MeshBasicMaterial({
      color: isHealerShip ? 0x00ffaa : (nationColor === 0xff2a4b ? 0xff4477 : (nationColor === 0xffbb00 ? 0xffaa00 : 0x00e5ff))
    });

    // Helper: Add Corrugated / Ribbed Turbine Engine (matches reference image engine)
    const addRibbedEngine = (x, y, z, r = 3.6, len = 12, flameLen = 16) => {
      // Dark turbine body
      const bodyGeo = new THREE.CylinderGeometry(r * 0.92, r * 1.25, len, 10);
      bodyGeo.rotateX(Math.PI / 2);
      const bMesh = new THREE.Mesh(bodyGeo, darkMat);
      bMesh.position.set(x, y, z);
      shipGroup.add(bMesh);

      // Alternating cooling rib rings
      for (let i = 0; i < 2; i++) {
        const ribGeo = new THREE.TorusGeometry(r * 1.15, r * 0.10, 4, 10);
        const rMesh = new THREE.Mesh(ribGeo, panelMat);
        rMesh.position.set(x, y, z - len * 0.2 + i * len * 0.35);
        shipGroup.add(rMesh);
      }

      // Exhaust flame cone
      const fGeo = new THREE.ConeGeometry(r * 0.82, flameLen, 8);
      fGeo.rotateX(-Math.PI / 2);
      const fMesh = new THREE.Mesh(fGeo, flameMat);
      fMesh.position.set(x, y, z - len / 2 - flameLen / 2);
      flameGroup.add(fMesh);
    };

    // Helper: Add Angled Intake Cheek with Glowing Neon Slits (matches reference image cheeks)
    const addIntakeCheek = (x, y, z, w = 4.5, h = 3.5, len = 10, isLeft = true) => {
      // Dark intake cheek wedge
      const cheekGeo = new THREE.BoxGeometry(w, h, len);
      const cheek = new THREE.Mesh(cheekGeo, darkMat);
      cheek.position.set(x, y, z);
      cheek.rotation.y = isLeft ? -0.16 : 0.16;
      cheek.rotation.z = isLeft ? 0.22 : -0.22;
      shipGroup.add(cheek);

      // 3 glowing horizontal neon slits
      [-len * 0.24, 0, len * 0.24].forEach((offsetZ, idx) => {
        const slitGeo = new THREE.BoxGeometry(w * 0.8, 0.45, len * 0.2);
        const slit = new THREE.Mesh(slitGeo, grilleGlowMat);
        slit.position.set(x + (isLeft ? 0.4 : -0.4), y + 0.3, z + offsetZ);
        slit.rotation.y = cheek.rotation.y;
        slit.rotation.z = cheek.rotation.z;
        shipGroup.add(slit);
      });
    };

    // Helper: Add Faceted Canopy with White Center Ridge (matches reference image cockpit)
    const addFacetedCanopy = (x, y, z, w = 3.6, h = 4.0, len = 11) => {
      const cockGeo = new THREE.ConeGeometry(w, len, 4);
      cockGeo.rotateX(Math.PI / 2);
      const cockpit = new THREE.Mesh(cockGeo, cockpitMat);
      cockpit.scale.set(1.0, h / w, 1.0);
      cockpit.position.set(x, y, z);
      shipGroup.add(cockpit);

      // White center frame ridge
      const spineGeo = new THREE.BoxGeometry(0.7, 0.7, len * 0.88);
      const spine = new THREE.Mesh(spineGeo, canopyFrameMat);
      spine.position.set(x, y + h * 0.38, z);
      shipGroup.add(spine);
    };

    // Helper: Add Triangular Wingtip Cap in Nation Color (matches reference image wingtips)
    const addWingtipCap = (x, y, z, w = 5, len = 10, isLeft = true) => {
      const capGeo = new THREE.ConeGeometry(w, len, 3);
      capGeo.rotateX(Math.PI / 2);
      const cap = new THREE.Mesh(capGeo, accentMat);
      cap.scale.set(1.1, 0.45, 1.0);
      cap.position.set(x, y, z);
      cap.rotation.z = isLeft ? -0.4 : 0.4;
      shipGroup.add(cap);
    };

    // Helper: Add Gun Barrel with Muzzle Brake
    const addGun = (x, y, z, r = 1.6, len = 16, isHeavy = false) => {
      const barrelGeo = new THREE.CylinderGeometry(r, r * (isHeavy ? 1.2 : 1.0), len, 6);
      barrelGeo.rotateX(Math.PI / 2);
      const barrel = new THREE.Mesh(barrelGeo, gunMetalMat);
      barrel.position.set(x, y, z);
      shipGroup.add(barrel);

      const shroudGeo = new THREE.CylinderGeometry(r * 1.35, r * 1.1, len * 0.32, 6);
      shroudGeo.rotateX(Math.PI / 2);
      const shroud = new THREE.Mesh(shroudGeo, darkMat);
      shroud.position.set(x, y, z - len * 0.2);
      shipGroup.add(shroud);
    };

    let tierScale = 1.0;

    switch (shipKey) {
      // =====================================================================
      // === SEVİYE 1: ORTAK BAŞLANGIÇ KEŞİF GEMİSİ (REFERENCE IMAGE EXACT) ===
      // =====================================================================
      case 'fly': {
        tierScale = 1.05;

        // 1. Off-White Faceted Nose Prow
        const noseGeo = new THREE.ConeGeometry(7.5, 24, 4);
        noseGeo.rotateX(Math.PI / 2);
        const nose = new THREE.Mesh(noseGeo, baseHullMat);
        nose.scale.set(1.3, 0.55, 1.0);
        nose.position.set(0, 0, 3);
        shipGroup.add(nose);

        // 2. Colored Collar Band on Nose
        const collarGeo = new THREE.CylinderGeometry(3.6, 4.8, 3.8, 6);
        collarGeo.rotateX(Math.PI / 2);
        const collar = new THREE.Mesh(collarGeo, accentMat);
        collar.position.set(0, 0, 14);
        shipGroup.add(collar);

        // 3. Dark Snout Tip
        const snoutGeo = new THREE.ConeGeometry(2.2, 4, 6);
        snoutGeo.rotateX(Math.PI / 2);
        const snout = new THREE.Mesh(snoutGeo, darkMat);
        snout.position.set(0, 0, 16.5);
        shipGroup.add(snout);

        // 4. Underslung Cannon beneath nose
        addGun(0, -2.6, 12, 1.3, 14, false);

        // 5. Dual Angled Intake Cheeks with Glowing Neon Slits
        addIntakeCheek(-6.2, 0.5, 7, 4.2, 3.2, 8, true);
        addIntakeCheek(6.2, 0.5, 7, 4.2, 3.2, 8, false);

        // 6. Faceted Canopy with White Center Ridge
        addFacetedCanopy(0, 2.8, 2, 3.6, 4.0, 11);

        // 7. Off-White Swept Wings with Inset Panel Details
        const wingGeo = new THREE.BoxGeometry(26, 1.8, 9);
        const wings = new THREE.Mesh(wingGeo, baseHullMat);
        wings.position.set(0, -0.5, -4);
        shipGroup.add(wings);

        [-8, 8].forEach(x => {
          const pGeo = new THREE.BoxGeometry(5.5, 0.4, 4.5);
          const pMesh = new THREE.Mesh(pGeo, panelMat);
          pMesh.position.set(x, 0.6, -4);
          shipGroup.add(pMesh);
        });

        // 8. Triangular Colored Wingtip Caps (Nation Color)
        addWingtipCap(-15, -0.5, -4, 4.5, 9, true);
        addWingtipCap(15, -0.5, -4, 4.5, 9, false);

        // 9. Rear Ribbed Turbine Engine
        addRibbedEngine(0, 0, -11, 3.8, 12, 16);
        break;
      }

      // =====================================================================
      // === 1. AĞIR TANK SINIFI (1'den 4'e Cüsseli Muharebe Kaleleri) ===
      // =====================================================================
      case 'tank-rhino': {
        tierScale = 1.20;

        // Broad armored nose prow with heavy ram beak
        const prowGeo = new THREE.ConeGeometry(15, 20, 4);
        prowGeo.rotateX(Math.PI / 2);
        const prow = new THREE.Mesh(prowGeo, baseHullMat);
        prow.scale.set(1.5, 0.7, 1.0);
        prow.position.set(0, 0, 14);
        shipGroup.add(prow);

        const collarGeo = new THREE.BoxGeometry(10, 6, 4);
        const collar = new THREE.Mesh(collarGeo, accentMat);
        collar.position.set(0, 0, 20);
        shipGroup.add(collar);

        const snoutGeo = new THREE.BoxGeometry(6, 5, 5);
        const snout = new THREE.Mesh(snoutGeo, darkMat);
        snout.position.set(0, 0, 23);
        shipGroup.add(snout);

        // Off-white main armored chassis
        const bodyGeo = new THREE.BoxGeometry(26, 10, 32);
        const body = new THREE.Mesh(bodyGeo, baseHullMat);
        shipGroup.add(body);

        // Heavy side armor skirts with triangular colored wingtips
        [-15, 15].forEach(x => {
          const skirtGeo = new THREE.BoxGeometry(6, 8, 28);
          const skirt = new THREE.Mesh(skirtGeo, darkMat);
          skirt.position.set(x, -0.5, 0);
          shipGroup.add(skirt);
        });
        addWingtipCap(-19, -0.5, 0, 5.5, 12, true);
        addWingtipCap(19, -0.5, 0, 5.5, 12, false);

        // Dual heavy intake cheeks
        addIntakeCheek(-9, 1.2, 10, 5, 4, 10, true);
        addIntakeCheek(9, 1.2, 10, 5, 4, 10, false);

        // Armored cockpit with frame
        addFacetedCanopy(0, 5.8, 3, 5, 4.5, 12);

        // Single heavy siege cannon under snout ("savunma tipi gemide tek atış lazer olacak hasarı yüksek")
        addGun(0, -2, 22, 4.0, 22, true);

        // Dual ribbed turbine engines
        addRibbedEngine(-7.5, 0, -16, 4.0, 14, 18);
        addRibbedEngine(7.5, 0, -16, 4.0, 14, 18);
        break;
      }

      case 'tank-goliath': {
        tierScale = 1.45;

        // Stepped hexagonal battle prow
        const prowGeo = new THREE.ConeGeometry(20, 26, 4);
        prowGeo.rotateX(Math.PI / 2);
        const prow = new THREE.Mesh(prowGeo, baseHullMat);
        prow.scale.set(1.5, 0.75, 1.0);
        prow.position.set(0, 0, 22);
        shipGroup.add(prow);

        const ramBeak = new THREE.BoxGeometry(10, 8, 8);
        const ram = new THREE.Mesh(ramBeak, darkMat);
        ram.position.set(0, 0, 32);
        shipGroup.add(ram);

        const collar = new THREE.BoxGeometry(16, 6, 4);
        const col = new THREE.Mesh(collar, accentMat);
        col.position.set(0, 1, 26);
        shipGroup.add(col);

        // Main battle chassis
        const mainGeo = new THREE.BoxGeometry(34, 13, 44);
        const main = new THREE.Mesh(mainGeo, baseHullMat);
        shipGroup.add(main);

        // Broadside armor skirts
        [-20, 20].forEach(x => {
          const skirtGeo = new THREE.BoxGeometry(8, 11, 40);
          const skirt = new THREE.Mesh(skirtGeo, darkMat);
          skirt.position.set(x, -1, -2);
          shipGroup.add(skirt);
        });
        addWingtipCap(-25, -1, 0, 6.5, 14, true);
        addWingtipCap(25, -1, 0, 6.5, 14, false);

        // Dual double-intake cheeks
        addIntakeCheek(-12, 2, 12, 5.5, 4.5, 12, true);
        addIntakeCheek(12, 2, 12, 5.5, 4.5, 12, false);

        // Citadel command bridge tower
        addFacetedCanopy(0, 9.5, -4, 6.5, 6.0, 14);

        const mastGeo = new THREE.CylinderGeometry(0.8, 1.0, 10, 4);
        const mast = new THREE.Mesh(mastGeo, gunMetalMat);
        mast.position.set(0, 15, -6);
        shipGroup.add(mast);

        // Single colossal siege cannon on central nose prow
        addGun(0, -1, 26, 5.0, 28, true);

        // Triple heavy ribbed turbine engines
        addRibbedEngine(-11, 0, -22, 4.4, 16, 22);
        addRibbedEngine(0, 1.5, -23, 5.0, 17, 24);
        addRibbedEngine(11, 0, -22, 4.4, 16, 22);
        break;
      }

      case 'tank-titan': {
        tierScale = 1.75;

        // === DEVASA UÇAN KALE (APEX SUPER-DREADNOUGHT) ===
        // Lower armored hull
        const lowerHull = new THREE.BoxGeometry(48, 14, 62);
        const lMesh = new THREE.Mesh(lowerHull, darkMat);
        lMesh.position.set(0, 0, -2);
        shipGroup.add(lMesh);

        // Upper battle deck (off-white alloy)
        const upperDeck = new THREE.BoxGeometry(36, 10, 50);
        const uMesh = new THREE.Mesh(upperDeck, baseHullMat);
        uMesh.position.set(0, 8, -2);
        shipGroup.add(uMesh);

        // Colossal chevron prow
        const prowGeo = new THREE.ConeGeometry(28, 32, 4);
        prowGeo.rotateX(Math.PI / 2);
        const prow = new THREE.Mesh(prowGeo, baseHullMat);
        prow.scale.set(1.6, 0.75, 1.0);
        prow.position.set(0, 2, 32);
        shipGroup.add(prow);

        const beakGeo = new THREE.BoxGeometry(10, 12, 16);
        const beak = new THREE.Mesh(beakGeo, darkMat);
        beak.position.set(0, 2, 44);
        shipGroup.add(beak);

        const collar = new THREE.BoxGeometry(22, 8, 5);
        const col = new THREE.Mesh(collar, accentMat);
        col.position.set(0, 3, 36);
        shipGroup.add(col);

        // Broadside armor sponsons & outriggers
        [-27, 27].forEach(x => {
          const skirtGeo = new THREE.BoxGeometry(9, 14, 56);
          const skirt = new THREE.Mesh(skirtGeo, panelMat);
          skirt.position.set(x, -1, -4);
          shipGroup.add(skirt);
        });
        addWingtipCap(-33, 0, 4, 8, 18, true);
        addWingtipCap(33, 0, 4, 8, 18, false);

        // Quad intake cheeks
        addIntakeCheek(-14, 3, 16, 6, 5, 14, true);
        addIntakeCheek(14, 3, 16, 6, 5, 14, false);

        // Citadel Command Tower
        addFacetedCanopy(0, 15, -8, 8, 7.5, 18);

        [-5, 5].forEach(x => {
          const spireGeo = new THREE.CylinderGeometry(0.8, 1.2, 14, 4);
          const spire = new THREE.Mesh(spireGeo, gunMetalMat);
          spire.position.set(x, 22, -12);
          shipGroup.add(spire);
        });

        // Single Colossal Central Spinal Railgun
        addGun(0, 0, 32, 6.2, 38, true);

        // Quad colossal ribbed turbine engine block
        addRibbedEngine(-18, 0, -32, 5.2, 20, 28);
        addRibbedEngine(-6, 2, -33, 5.8, 22, 30);
        addRibbedEngine(6, 2, -33, 5.8, 22, 30);
        addRibbedEngine(18, 0, -32, 5.2, 20, 28);
        break;
      }

      // =====================================================================
      // === 2. AŞIRI MANEVRALI SERİ GEMİ SINIFI ===
      // =====================================================================
      case 'speed-dart': {
        tierScale = 1.20;

        // Needle aerospike prow
        const noseGeo = new THREE.ConeGeometry(6, 38, 4);
        noseGeo.rotateX(Math.PI / 2);
        const nose = new THREE.Mesh(noseGeo, baseHullMat);
        nose.scale.set(1.2, 0.45, 1.0);
        nose.position.set(0, 0, 8);
        shipGroup.add(nose);

        const collar = new THREE.CylinderGeometry(3.0, 4.2, 4, 6);
        collar.rotateX(Math.PI / 2);
        const col = new THREE.Mesh(collar, accentMat);
        col.position.set(0, 0, 20);
        shipGroup.add(col);

        const snoutGeo = new THREE.ConeGeometry(1.8, 5, 6);
        snoutGeo.rotateX(Math.PI / 2);
        const sn = new THREE.Mesh(snoutGeo, darkMat);
        sn.position.set(0, 0, 24);
        shipGroup.add(sn);

        // Slim supersonic fuselage
        const spineGeo = new THREE.BoxGeometry(8, 3.5, 24);
        const spine = new THREE.Mesh(spineGeo, darkMat);
        spine.position.set(0, 0, -6);
        shipGroup.add(spine);

        // Swept razor delta wings
        const wingGeo = new THREE.BoxGeometry(32, 1.6, 12);
        const wings = new THREE.Mesh(wingGeo, baseHullMat);
        wings.position.set(0, -0.4, -8);
        shipGroup.add(wings);

        addWingtipCap(-18, -0.4, -8, 4.5, 10, true);
        addWingtipCap(18, -0.4, -8, 4.5, 10, false);

        addIntakeCheek(-5, 0.8, 6, 3.5, 2.8, 8, true);
        addIntakeCheek(5, 0.8, 6, 3.5, 2.8, 8, false);

        addFacetedCanopy(0, 2.5, 4, 3.2, 3.5, 14);

        // Triple high-speed needle blasters ("manevra yüksek olanda 3'lü atış")
        addGun(-7, 0, 16, 1.3, 16, false);
        addGun(0, 0, 22, 1.4, 18, false);
        addGun(7, 0, 16, 1.3, 16, false);

        // Dual high-speed afterburners
        addRibbedEngine(-5.5, 0, -18, 3.0, 14, 20);
        addRibbedEngine(5.5, 0, -18, 3.0, 14, 20);
        break;
      }

      case 'speed-phantom': {
        tierScale = 1.45;

        // Faceted stealth nose
        const noseGeo = new THREE.ConeGeometry(7, 44, 4);
        noseGeo.rotateX(Math.PI / 2);
        const nose = new THREE.Mesh(noseGeo, baseHullMat);
        nose.scale.set(1.25, 0.40, 1.0);
        nose.position.set(0, 0, 12);
        shipGroup.add(nose);

        const collar = new THREE.CylinderGeometry(3.5, 5.0, 5, 6);
        collar.rotateX(Math.PI / 2);
        const col = new THREE.Mesh(collar, accentMat);
        col.position.set(0, 0, 26);
        shipGroup.add(col);

        // Angular stealth fuselage
        const fuseGeo = new THREE.BoxGeometry(12, 4.2, 32);
        const fuse = new THREE.Mesh(fuseGeo, darkMat);
        fuse.position.set(0, 0, -4);
        shipGroup.add(fuse);

        // FORWARD-SWEPT WINGS
        const wingGeo = new THREE.BoxGeometry(44, 1.8, 14);
        const wings = new THREE.Mesh(wingGeo, baseHullMat);
        wings.position.set(0, -0.4, -4);
        wings.rotation.y = 0.22;
        shipGroup.add(wings);

        addWingtipCap(-23, 0, 0, 5, 12, true);
        addWingtipCap(23, 0, 0, 5, 12, false);

        [-22, 22].forEach(x => {
          const finGeo = new THREE.BoxGeometry(1.6, 9, 12);
          const fin = new THREE.Mesh(finGeo, accentMat);
          fin.position.set(x, 3, -2);
          shipGroup.add(fin);
        });

        addIntakeCheek(-6.5, 1.0, 8, 4.0, 3.2, 10, true);
        addIntakeCheek(6.5, 1.0, 8, 4.0, 3.2, 10, false);

        addFacetedCanopy(0, 3.2, 6, 4.0, 4.0, 16);

        // Triple needle gun configuration
        addGun(-8, 0, 18, 1.5, 18, false);
        addGun(0, 0, 26, 1.8, 22, false);
        addGun(8, 0, 18, 1.5, 18, false);

        // Dual vectoring ribbed engines
        addRibbedEngine(-7, 0, -20, 3.8, 16, 24);
        addRibbedEngine(7, 0, -20, 3.8, 16, 24);
        break;
      }

      case 'speed-tempest': {
        tierScale = 1.75;

        // === GÖRKEMLİ SÜPERSONİK AMİRAL GEMİSİ ===
        const noseGeo = new THREE.ConeGeometry(8, 54, 4);
        noseGeo.rotateX(Math.PI / 2);
        const nose = new THREE.Mesh(noseGeo, baseHullMat);
        nose.scale.set(1.25, 0.38, 1.0);
        nose.position.set(0, 0, 18);
        shipGroup.add(nose);

        const collar = new THREE.CylinderGeometry(4.0, 5.5, 6, 6);
        collar.rotateX(Math.PI / 2);
        const col = new THREE.Mesh(collar, accentMat);
        col.position.set(0, 0, 34);
        shipGroup.add(col);

        // Intake spine & fuselage
        const fuseGeo = new THREE.BoxGeometry(13, 5.2, 48);
        const fuse = new THREE.Mesh(fuseGeo, darkMat);
        fuse.position.set(0, 0, -6);
        shipGroup.add(fuse);

        // Tandem Quad Wings: Forward canards + swept main wings
        const canardGeo = new THREE.BoxGeometry(28, 1.6, 8);
        const canards = new THREE.Mesh(canardGeo, baseHullMat);
        canards.position.set(0, 0, 18);
        shipGroup.add(canards);

        const wingGeo = new THREE.BoxGeometry(56, 2.2, 18);
        const wings = new THREE.Mesh(wingGeo, baseHullMat);
        wings.position.set(0, -0.5, -8);
        shipGroup.add(wings);

        addWingtipCap(-30, -0.5, -8, 6, 14, true);
        addWingtipCap(30, -0.5, -8, 6, 14, false);

        [-28, 28].forEach(x => {
          const finGeo = new THREE.BoxGeometry(2, 10, 14);
          const fin = new THREE.Mesh(finGeo, accentMat);
          fin.position.set(x, 3, -10);
          shipGroup.add(fin);
        });

        addIntakeCheek(-8, 1.2, 12, 4.5, 3.5, 12, true);
        addIntakeCheek(8, 1.2, 12, 4.5, 3.5, 12, false);

        addFacetedCanopy(0, 3.8, 8, 4.8, 4.5, 20);

        // Triple plasma needle cannons
        addGun(-9, 0, 22, 1.8, 24, false);
        addGun(0, 0, 32, 2.2, 28, true);
        addGun(9, 0, 22, 1.8, 24, false);

        // Triple hyperdrive ribbed engines
        addRibbedEngine(-8, 0, -26, 4.2, 18, 28);
        addRibbedEngine(0, 1, -28, 4.8, 20, 32);
        addRibbedEngine(8, 0, -26, 4.2, 18, 28);
        break;
      }

      // =====================================================================
      // === 3. HEM TANK HEM SAVAŞÇI (BRUISER) ===
      // =====================================================================
      case 'bruiser-crusader': {
        tierScale = 1.20;

        // Angular combat nose
        const noseGeo = new THREE.ConeGeometry(8, 28, 4);
        noseGeo.rotateX(Math.PI / 2);
        const nose = new THREE.Mesh(noseGeo, baseHullMat);
        nose.scale.set(1.3, 0.6, 1.0);
        nose.position.set(0, 0, 10);
        shipGroup.add(nose);

        const collar = new THREE.CylinderGeometry(4.0, 5.2, 4, 6);
        collar.rotateX(Math.PI / 2);
        const col = new THREE.Mesh(collar, accentMat);
        col.position.set(0, 0, 18);
        shipGroup.add(col);

        // Combat fuselage
        const fuseGeo = new THREE.BoxGeometry(14, 6.5, 28);
        const fuse = new THREE.Mesh(fuseGeo, baseHullMat);
        fuse.position.set(0, 0, -4);
        shipGroup.add(fuse);

        // Cross-wing strike wings
        const wingGeo = new THREE.BoxGeometry(36, 2.5, 12);
        const wings = new THREE.Mesh(wingGeo, baseHullMat);
        wings.position.set(0, -0.5, -6);
        shipGroup.add(wings);

        addWingtipCap(-20, -0.5, -6, 5, 10, true);
        addWingtipCap(20, -0.5, -6, 5, 10, false);

        addIntakeCheek(-7.5, 1.0, 8, 4.2, 3.5, 9, true);
        addIntakeCheek(7.5, 1.0, 8, 4.2, 3.5, 9, false);

        addFacetedCanopy(0, 4.0, 4, 4.5, 4.2, 12);

        // Dual assault cannons ("ortalama olan gemide 2'li atış hasar daha güzel")
        addGun(-8, 0, 18, 2.4, 20, false);
        addGun(8, 0, 18, 2.4, 20, false);

        // Dual ribbed engines
        addRibbedEngine(-7, 0, -17, 3.8, 14, 18);
        addRibbedEngine(7, 0, -17, 3.8, 14, 18);
        break;
      }

      case 'bruiser-marauder': {
        tierScale = 1.45;

        // Heavy chisel ram nose
        const noseGeo = new THREE.ConeGeometry(12, 22, 4);
        noseGeo.rotateX(Math.PI / 2);
        const nose = new THREE.Mesh(noseGeo, baseHullMat);
        nose.scale.set(1.35, 0.7, 1.0);
        nose.position.set(0, 0, 22);
        shipGroup.add(nose);

        const collar = new THREE.BoxGeometry(12, 6, 4);
        const col = new THREE.Mesh(collar, accentMat);
        col.position.set(0, 1, 24);
        shipGroup.add(col);

        // Central command hull
        const bodyGeo = new THREE.BoxGeometry(18, 8.5, 40);
        const body = new THREE.Mesh(bodyGeo, baseHullMat);
        shipGroup.add(body);

        // Broad assault wings
        const wingGeo = new THREE.BoxGeometry(48, 3.2, 16);
        const wings = new THREE.Mesh(wingGeo, baseHullMat);
        wings.position.set(0, -0.5, -6);
        shipGroup.add(wings);

        addWingtipCap(-26, -0.5, -6, 6, 12, true);
        addWingtipCap(26, -0.5, -6, 6, 12, false);

        // Side engine nacelles
        [-18, 18].forEach(x => {
          const nacGeo = new THREE.BoxGeometry(8, 7.5, 34);
          const nac = new THREE.Mesh(nacGeo, darkMat);
          nac.position.set(x, 0, -4);
          shipGroup.add(nac);
        });

        addIntakeCheek(-9.5, 1.5, 12, 5.0, 4.0, 11, true);
        addIntakeCheek(9.5, 1.5, 12, 5.0, 4.0, 11, false);

        addFacetedCanopy(0, 6.0, 2, 5.5, 5.0, 14);

        // Dual heavy assault batteries
        addGun(-10, 0, 22, 3.2, 24, true);
        addGun(10, 0, 22, 3.2, 24, true);

        // Triple propulsion cluster
        addRibbedEngine(-16, 0, -20, 4.2, 16, 22);
        addRibbedEngine(0, 0, -21, 4.4, 16, 22);
        addRibbedEngine(16, 0, -20, 4.2, 16, 22);
        break;
      }

      case 'bruiser-warlord': {
        tierScale = 1.75;

        // === DEVASA MUHAREBE KRUVAZÖRÜ (APEX BATTLECRUISER) ===
        const bodyGeo = new THREE.BoxGeometry(38, 12, 56);
        const body = new THREE.Mesh(bodyGeo, baseHullMat);
        body.position.set(0, 0, -2);
        shipGroup.add(body);

        const prowGeo = new THREE.ConeGeometry(25, 28, 4);
        prowGeo.rotateX(Math.PI / 2);
        const prow = new THREE.Mesh(prowGeo, baseHullMat);
        prow.scale.set(1.45, 0.75, 1.0);
        prow.position.set(0, 0, 28);
        shipGroup.add(prow);

        const collar = new THREE.BoxGeometry(18, 8, 5);
        const col = new THREE.Mesh(collar, accentMat);
        col.position.set(0, 1, 32);
        shipGroup.add(col);

        const spineGeo = new THREE.BoxGeometry(16, 6, 36);
        const spine = new THREE.Mesh(spineGeo, darkMat);
        spine.position.set(0, 8, -4);
        shipGroup.add(spine);

        // Broad swept armor wing platforms
        const wingGeo = new THREE.BoxGeometry(64, 4, 22);
        const wings = new THREE.Mesh(wingGeo, panelMat);
        wings.position.set(0, 0, -10);
        shipGroup.add(wings);

        addWingtipCap(-34, 0, -8, 8, 16, true);
        addWingtipCap(34, 0, -8, 8, 16, false);

        addIntakeCheek(-13, 2.5, 16, 6, 5, 14, true);
        addIntakeCheek(13, 2.5, 16, 6, 5, 14, false);

        addFacetedCanopy(0, 12, -6, 7.5, 7.0, 18);

        [-5, 5].forEach(x => {
          const mastGeo = new THREE.CylinderGeometry(0.8, 1.2, 14, 4);
          const mast = new THREE.Mesh(mastGeo, gunMetalMat);
          mast.position.set(x, 18, -10);
          shipGroup.add(mast);
        });

        // Twin colossal broadside batteries
        addGun(-12, 1, 26, 4.2, 30, true);
        addGun(12, 1, 26, 4.2, 30, true);

        // Quad battleship ribbed engines
        addRibbedEngine(-18, 0, -29, 4.8, 18, 26);
        addRibbedEngine(-6, 1, -30, 5.4, 20, 28);
        addRibbedEngine(6, 1, -30, 5.4, 20, 28);
        addRibbedEngine(18, 0, -29, 4.8, 18, 26);
        break;
      }

      // =====================================================================
      // === 4. ŞİFACI & DESTEK GEMİSİ ===
      // =====================================================================
      case 'healer-cleric': {
        tierScale = 1.20;

        // Curved faceted saucer chassis
        const saucerGeo = new THREE.CylinderGeometry(15, 17, 7, 16);
        saucerGeo.rotateX(Math.PI / 2);
        const saucer = new THREE.Mesh(saucerGeo, baseHullMat);
        shipGroup.add(saucer);

        // Prow sensor arc
        const prowGeo = new THREE.ConeGeometry(10, 16, 4);
        prowGeo.rotateX(Math.PI / 2);
        const prow = new THREE.Mesh(prowGeo, darkMat);
        prow.scale.set(1.4, 0.5, 1.0);
        prow.position.set(0, 0, 14);
        shipGroup.add(prow);

        addIntakeCheek(-8, 0.8, 8, 4, 3, 7, true);
        addIntakeCheek(8, 0.8, 8, 4, 3, 7, false);

        // Glowing emerald bio-energy dome
        const domeGeo = new THREE.SphereGeometry(7, 14, 12);
        const dome = new THREE.Mesh(domeGeo, bioCoreMat);
        dome.position.set(0, 4, 0);
        shipGroup.add(dome);

        // Outer emerald stabilizer ring
        const ringGeo = new THREE.TorusGeometry(12, 1.5, 8, 20);
        const ring = new THREE.Mesh(ringGeo, bioRingMat);
        ring.position.set(0, 1, 0);
        shipGroup.add(ring);

        // Twin bio-projector lenses ("iyileştirmede 2'li atış hasar güzel")
        addGun(-8, 0, 16, 2.2, 16, false);
        addGun(8, 0, 16, 2.2, 16, false);

        // Dual curved ion ribbed engines with emerald flame
        addRibbedEngine(-8, 0, -13, 3.4, 12, 16);
        addRibbedEngine(8, 0, -13, 3.4, 12, 16);
        break;
      }

      case 'healer-guardian': {
        tierScale = 1.45;

        // Tri-hull central support body
        const bodyGeo = new THREE.BoxGeometry(20, 9, 36);
        const body = new THREE.Mesh(bodyGeo, baseHullMat);
        shipGroup.add(body);

        const prowGeo = new THREE.ConeGeometry(12, 18, 4);
        prowGeo.rotateX(Math.PI / 2);
        const prow = new THREE.Mesh(prowGeo, darkMat);
        prow.scale.set(1.3, 0.6, 1.0);
        prow.position.set(0, 0, 20);
        shipGroup.add(prow);

        addIntakeCheek(-10, 1.2, 10, 4.5, 3.5, 10, true);
        addIntakeCheek(10, 1.2, 10, 4.5, 3.5, 10, false);

        // Glowing emerald torus energy ring
        const ringGeo = new THREE.TorusGeometry(12, 2.4, 10, 24);
        const ring = new THREE.Mesh(ringGeo, bioRingMat);
        ring.position.set(0, 4, 0);
        shipGroup.add(ring);

        // Pulsing emerald reactor core
        const coreGeo = new THREE.SphereGeometry(6.5, 12, 10);
        const core = new THREE.Mesh(coreGeo, bioCoreMat);
        core.position.set(0, 4, 0);
        shipGroup.add(core);

        // Side outriggers with conduit tubes & beacons
        [-18, 18].forEach(x => {
          const outGeo = new THREE.BoxGeometry(6, 6, 32);
          const out = new THREE.Mesh(outGeo, panelMat);
          out.position.set(x, 0, 2);
          shipGroup.add(out);

          const tipGeo = new THREE.SphereGeometry(3, 8, 8);
          const tip = new THREE.Mesh(tipGeo, bioCoreMat);
          tip.position.set(x, 0, 18);
          shipGroup.add(tip);
        });

        // Twin bio-beam projectors
        addGun(-10, 0, 22, 2.6, 22, false);
        addGun(10, 0, 22, 2.6, 22, false);

        // Dual heavy ion ribbed engines
        addRibbedEngine(-12, 0, -19, 4.2, 16, 22);
        addRibbedEngine(12, 0, -19, 4.2, 16, 22);
        break;
      }

      case 'healer-aegis': {
        tierScale = 1.75;

        // === GÖRKEMLİ VE BÜYÜLEYİCİ DESTEK AMİRAL GEMİSİ (CELESTIAL BIO-CARRIER) ===
        const bodyGeo = new THREE.CylinderGeometry(28, 30, 12, 16);
        bodyGeo.rotateX(Math.PI / 2);
        const body = new THREE.Mesh(bodyGeo, baseHullMat);
        body.position.set(0, 0, -2);
        shipGroup.add(body);

        const wingGeo = new THREE.BoxGeometry(66, 3.2, 24);
        const wings = new THREE.Mesh(wingGeo, panelMat);
        wings.position.set(0, 0, -6);
        shipGroup.add(wings);

        addWingtipCap(-35, 0, -6, 7, 16, true);
        addWingtipCap(35, 0, -6, 7, 16, false);

        const prowGeo = new THREE.ConeGeometry(18, 24, 4);
        prowGeo.rotateX(Math.PI / 2);
        const prow = new THREE.Mesh(prowGeo, darkMat);
        prow.scale.set(1.35, 0.65, 1.0);
        prow.position.set(0, 0, 26);
        shipGroup.add(prow);

        addIntakeCheek(-12, 2.0, 14, 5.5, 4.0, 12, true);
        addIntakeCheek(12, 2.0, 14, 5.5, 4.0, 12, false);

        // Double concentric glowing emerald torus energy rings
        const outerRingGeo = new THREE.TorusGeometry(18, 2.6, 10, 32);
        const outerRing = new THREE.Mesh(outerRingGeo, bioRingMat);
        outerRing.position.set(0, 4, -2);
        shipGroup.add(outerRing);

        const innerRingGeo = new THREE.TorusGeometry(11, 2.0, 10, 24);
        const innerRing = new THREE.Mesh(innerRingGeo, bioRingMat);
        innerRing.position.set(0, 5.5, -2);
        shipGroup.add(innerRing);

        const coreGeo = new THREE.OctahedronGeometry(7, 1);
        const core = new THREE.Mesh(coreGeo, bioCoreMat);
        core.position.set(0, 5.5, -2);
        shipGroup.add(core);

        const domeGeo = new THREE.SphereGeometry(8, 14, 12);
        const dome = new THREE.Mesh(domeGeo, cockpitMat);
        dome.position.set(0, 9, 8);
        shipGroup.add(dome);

        // Twin heavy bio-restoration beams
        addGun(-12, 1, 26, 3.8, 30, true);
        addGun(12, 1, 26, 3.8, 30, true);

        // Triple heavy emerald ion ribbed engines
        addRibbedEngine(-14, 0, -24, 5.0, 18, 26);
        addRibbedEngine(0, 1, -26, 5.6, 20, 30);
        addRibbedEngine(14, 0, -24, 5.0, 18, 26);
        break;
      }

      default: {
        tierScale = 1.0;
        const bodyGeo = new THREE.ConeGeometry(10, 30, 4);
        bodyGeo.rotateX(Math.PI / 2);
        const body = new THREE.Mesh(bodyGeo, baseHullMat);
        shipGroup.add(body);
        addRibbedEngine(0, 0, -15, 3.5, 12, 16);
        break;
      }
    }

    // Shield Bubble (scaled to match ship radius and tier)
    const shieldRadius = (config.radius || 25) / tierScale * 1.35;
    const shieldGeo = new THREE.SphereGeometry(shieldRadius, 16, 14);
    const shieldMat = new THREE.MeshBasicMaterial({
      color: isHealerShip ? 0x00ffaa : 0x00d9ff,
      transparent: true,
      opacity: 0.0,
      wireframe: true
    });
    const shieldMesh = new THREE.Mesh(shieldGeo, shieldMat);
    shieldMesh.name = 'shieldBubble';
    shipRoot.add(shieldMesh);

    // Apply Tier Scale: Escalate presence & massiveness (geliştikçe daha cüsseli)
    shipRoot.scale.set(tierScale, tierScale, tierScale);

    return shipRoot;
  },

  // Highly Detailed Procedural Asteroid 3D Mesh with craters, ridges, and rugged facets
  createAsteroidMesh(radius, sizeTier) {
    // 7 size tiers: higher subdivision for realistic rocky deformation
    const detail = sizeTier <= 2 ? 1 : (sizeTier <= 5 ? 2 : 3);
    const geometry = new THREE.IcosahedronGeometry(radius, detail);
    
    // Seed 4-6 procedural crater centers across the asteroid surface
    const craterCount = 4 + (sizeTier % 3);
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
        radius: 0.28 + Math.random() * 0.35, // Angular crater radius
        depth: 0.25 + Math.random() * 0.30   // Depression depth
      });
    }

    // Perturb vertices with multi-octave noise + craters
    const position = geometry.attributes.position;
    for (let i = 0; i < position.count; i++) {
      let vx = position.getX(i);
      let vy = position.getY(i);
      let vz = position.getZ(i);

      // Normalized direction vector from center
      const len = Math.hypot(vx, vy, vz) || 1;
      const nx = vx / len;
      const ny = vy / len;
      const nz = vz / len;

      // 1. Broad irregular shape deformation (large boulders & oblong asymmetry)
      let noise = 1.0 + (Math.sin(nx * 3.5) * Math.cos(ny * 3.2) * Math.sin(nz * 2.8)) * 0.32;
      // 2. High-frequency rocky surface ridges and crags
      noise += (Math.sin(nx * 9.0 + ny * 6.0) * Math.cos(nz * 8.5)) * 0.12;

      // 3. Impact craters (carved bowl depression with raised lip rim)
      for (const crater of craters) {
        const dot = nx * crater.x + ny * crater.y + nz * crater.z;
        const dist = Math.acos(Math.max(-1, Math.min(1, dot))); // Angle to crater center
        if (dist < crater.radius) {
          const factor = dist / crater.radius;
          // Crater bowl dips in the middle and elevates slightly at the rim edge
          const bowl = Math.cos(factor * Math.PI * 0.5);
          const rim = Math.sin(factor * Math.PI) * 0.12;
          noise -= (bowl * crater.depth - rim);
        }
      }

      position.setXYZ(i, vx * noise, vy * noise, vz * noise);
    }
    geometry.computeVertexNormals();

    // 7 distinct rocky shades ranging from sandstone (size 1) to dark cratered obsidian/basalt (size 7)
    const rockColors = [
      0x867e72, // 1 (smallest)
      0x7b7367, // 2
      0x70685c, // 3
      0x645c50, // 4
      0x574f44, // 5
      0x4a4237, // 6
      0x383228  // 7 (largest)
    ];
    const baseColor = rockColors[Math.min(6, Math.max(0, sizeTier - 1))];

    const material = new THREE.MeshStandardMaterial({
      color: baseColor,
      roughness: 0.92,
      metalness: 0.16,
      flatShading: true
    });

    const mesh = new THREE.Mesh(geometry, material);
    return mesh;
  },

  // Gem / Crystal 3D Mesh (Gorgeous faceted space crystal with inner radiant core & diamond aura)
  createGemMesh(value = 1) {
    const group = new THREE.Group();
    const size = value > 5 ? 6.5 : 4.2;
    const isBig = value > 5;

    // Outer faceted crystal
    const geometry = new THREE.OctahedronGeometry(size, 0);
    geometry.scale(1.0, 1.45, 1.0);
    const outerMat = new THREE.MeshStandardMaterial({
      color: isBig ? 0xff4411 : 0xff1550,
      emissive: isBig ? 0xff2200 : 0xff0044,
      emissiveIntensity: 0.85,
      roughness: 0.12,
      metalness: 0.25,
      transparent: true,
      opacity: 0.92,
      flatShading: true
    });
    const crystal = new THREE.Mesh(geometry, outerMat);
    group.add(crystal);

    // Inner radiant glowing core
    const coreGeo = new THREE.OctahedronGeometry(size * 0.52, 0);
    coreGeo.scale(1.0, 1.4, 1.0);
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending
    });
    const core = new THREE.Mesh(coreGeo, coreMat);
    group.add(core);

    // Subtle diamond sparkle halo ring
    const ringGeo = new THREE.RingGeometry(size * 1.15, size * 1.35, 6);
    const ringMat = new THREE.MeshBasicMaterial({
      color: isBig ? 0xffaa44 : 0xff88cc,
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.name = 'gemRing';
    group.add(ring);

    return group;
  },

  // Laser Bolt Mesh (glow capsule with dynamic power scaling & heavy beam core)
  createLaserMesh(isHeavy = false, color = 0x00f0ff, damage = 10) {
    const scaleFactor = Math.max(0.85, Math.min(2.5, Math.sqrt(damage / 10)));
    const length = (isHeavy ? 28 : 17) * scaleFactor;
    const radius = (isHeavy ? 3.0 : 1.5) * scaleFactor;

    const group = new THREE.Group();
    const geometry = new THREE.CylinderGeometry(radius, radius, length, 6);
    
    const material = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.95
    });
    const outerBeam = new THREE.Mesh(geometry, material);
    group.add(outerBeam);

    // Heavy siege blast inner intense white beam core
    if (isHeavy) {
      const coreGeo = new THREE.CylinderGeometry(radius * 0.55, radius * 0.55, length * 1.05, 5);
      const coreMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.95,
        blending: THREE.AdditiveBlending
      });
      const innerBeam = new THREE.Mesh(coreGeo, coreMat);
      group.add(innerBeam);
    }

    return group;
  },

  // 3D Space Station / Nation Home Base Mesh
  createStationMesh(nation = 'blue', level = 1) {
    const group = new THREE.Group();
    const nationCfg = NATIONS[nation] || NATIONS['blue'];

    const baseColor = nationCfg.color;
    const hullMat = new THREE.MeshStandardMaterial({
      color: 0x1f2937,
      roughness: 0.35,
      metalness: 0.7,
      flatShading: true
    });
    const nationMat = new THREE.MeshStandardMaterial({
      color: baseColor,
      roughness: 0.3,
      metalness: 0.8,
      flatShading: true
    });
    const glowMat = new THREE.MeshBasicMaterial({
      color: baseColor
    });

    // 1. Central Core Hub
    const coreRadius = 36 + level * 6;
    const coreGeo = new THREE.CylinderGeometry(coreRadius, coreRadius * 1.15, 30, 8);
    const core = new THREE.Mesh(coreGeo, nationMat);
    core.rotateX(Math.PI / 2);
    group.add(core);

    // Inner dome
    const domeGeo = new THREE.SphereGeometry(coreRadius * 0.7, 8, 6);
    const dome = new THREE.Mesh(domeGeo, hullMat);
    dome.position.set(0, 0, 16);
    group.add(dome);

    // 2. Structural Pylons / Arms
    const pylonCount = 4 + (level > 2 ? 2 : 0);
    const armLength = 110 + level * 15;
    for (let i = 0; i < pylonCount; i++) {
      const angle = (i / pylonCount) * Math.PI * 2;
      const armGeo = new THREE.BoxGeometry(12, armLength, 10);
      const arm = new THREE.Mesh(armGeo, hullMat);
      arm.position.set(Math.cos(angle) * (armLength / 2), Math.sin(angle) * (armLength / 2), 0);
      arm.rotation.z = angle + Math.PI / 2;
      group.add(arm);

      // Defense turret at arm tip
      const turretGeo = new THREE.CylinderGeometry(4, 5, 12, 6);
      const turret = new THREE.Mesh(turretGeo, glowMat);
      turret.position.set(Math.cos(angle) * armLength, Math.sin(angle) * armLength, 4);
      turret.rotation.z = angle;
      group.add(turret);
    }

    // 3. Rotating Outer Ring
    const ringRadius = armLength * 0.95;
    const ringGeo = new THREE.TorusGeometry(ringRadius, 6, 6, 24);
    const ring = new THREE.Mesh(ringGeo, nationMat);
    ring.name = 'rotatingRing';
    group.add(ring);

    // 4. Force Field Shield Dome
    const shieldRadius = armLength * 1.25;
    const shieldGeo = new THREE.SphereGeometry(shieldRadius, 16, 12);
    const shieldMat = new THREE.MeshBasicMaterial({
      color: baseColor,
      transparent: true,
      opacity: 0.14,
      wireframe: true
    });
    const shieldMesh = new THREE.Mesh(shieldGeo, shieldMat);
    shieldMesh.name = 'stationShield';
    group.add(shieldMesh);

    return group;
  }
};

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

    const isRedNation = (nationColor === 0xff2a4b);
    const isGoldNation = (nationColor === 0xffbb00);
    const neonColorHex = isRedNation ? 0xff2244 : (isGoldNation ? 0xffaa00 : 0x00f0ff);
    const flameColorHex = isRedNation ? 0xff3355 : (isGoldNation ? 0xffaa00 : 0x00d4ff);

    // Shared Sci-Fi Materials for 7 Tier Ship Models
    const whiteArmorMat = new THREE.MeshStandardMaterial({
      color: 0xf2f6fa,
      roughness: 0.22,
      metalness: 0.30,
      flatShading: true
    });
    const darkArmorMat = new THREE.MeshStandardMaterial({
      color: 0x182230,
      roughness: 0.35,
      metalness: 0.65,
      flatShading: true
    });
    const canopyTint = isRedNation ? 0x2e0814 : (isGoldNation ? 0x2e1e08 : 0x092238);
    const canopyEmissive = isRedNation ? 0x550c1e : (isGoldNation ? 0x55380c : 0x063e66);
    const canopyGlassMat = new THREE.MeshStandardMaterial({
      color: canopyTint,
      emissive: canopyEmissive,
      emissiveIntensity: 0.82,
      roughness: 0.08,
      metalness: 0.92,
      flatShading: true
    });
    const neonStripMat = new THREE.MeshBasicMaterial({ color: neonColorHex });
    const violetNeonMat = new THREE.MeshBasicMaterial({ color: 0xa855f7 });
    const amberMarkerMat = new THREE.MeshBasicMaterial({ color: 0xffaa00 });
    const gunMetalMatShared = new THREE.MeshStandardMaterial({
      color: 0x1f2732,
      roughness: 0.28,
      metalness: 0.88,
      flatShading: true
    });

    const addIonThruster = (x, y, z, r = 3.2, len = 12, beamLen = 22) => {
      const nozGeo = new THREE.CylinderGeometry(r * 0.9, r * 1.25, len, 10);
      nozGeo.rotateX(Math.PI / 2);
      const noz = new THREE.Mesh(nozGeo, darkArmorMat);
      noz.position.set(x, y, z);
      shipGroup.add(noz);

      const rimGeo = new THREE.TorusGeometry(r * 1.05, r * 0.12, 6, 16);
      const rim = new THREE.Mesh(rimGeo, neonStripMat);
      rim.position.set(x, y, z - len / 2);
      shipGroup.add(rim);

      const beamGeo = new THREE.CylinderGeometry(r * 0.72, r * 0.18, beamLen, 10);
      beamGeo.rotateX(Math.PI / 2);
      const beamMat = new THREE.MeshBasicMaterial({
        color: flameColorHex,
        transparent: true,
        opacity: 0.82,
        blending: THREE.AdditiveBlending
      });
      const beam = new THREE.Mesh(beamGeo, beamMat);
      beam.position.set(x, y, z - len / 2 - beamLen / 2);
      flameGroup.add(beam);

      const coreGeo = new THREE.CylinderGeometry(r * 0.32, r * 0.08, beamLen * 0.85, 8);
      coreGeo.rotateX(Math.PI / 2);
      const coreMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.95,
        blending: THREE.AdditiveBlending
      });
      const core = new THREE.Mesh(coreGeo, coreMat);
      core.position.set(x, y, z - len / 2 - (beamLen * 0.85) / 2);
      flameGroup.add(core);
    };

    const addWingTrails = (wingWidth, zPos = -16, len = 18) => {
      const wingTrails = new THREE.Group();
      wingTrails.name = 'wingTrails';
      wingTrails.visible = false;
      shipGroup.add(wingTrails);

      [-1, 1].forEach(side => {
        const wx = side * wingWidth;
        const trailGeo = new THREE.CylinderGeometry(0.22, 0.45, len, 6);
        trailGeo.rotateX(Math.PI / 2);
        const trailMat = new THREE.MeshBasicMaterial({
          color: neonColorHex,
          transparent: true,
          opacity: 0.55,
          blending: THREE.AdditiveBlending
        });
        const trailMesh = new THREE.Mesh(trailGeo, trailMat);
        trailMesh.position.set(wx, 0.4, zPos - len / 2);
        wingTrails.add(trailMesh);

        const threadGeo = new THREE.CylinderGeometry(0.08, 0.18, len * 0.75, 6);
        threadGeo.rotateX(Math.PI / 2);
        const threadMat = new THREE.MeshBasicMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: 0.70,
          blending: THREE.AdditiveBlending
        });
        const threadMesh = new THREE.Mesh(threadGeo, threadMat);
        threadMesh.position.set(wx, 0.4, zPos - (len * 0.75) / 2);
        wingTrails.add(threadMesh);
      });
    };

    switch (shipKey) {
      // =====================================================================
      // === SEVİYE 1: ORTAK BAŞLANGIÇ KEŞİF GEMİSİ (1.png) ===
      // =====================================================================
      case 'fly':
      case 'tier-1': {
        tierScale = 1.00;

        // Dedicated materials matching media_1790886036925.jpg reference
        const isRedNation = (nationColor === 0xff2a4b);
        const isGoldNation = (nationColor === 0xffbb00);
        const neonColorHex = isRedNation ? 0xff2244 : (isGoldNation ? 0xffaa00 : 0x00f0ff);
        const flameColorHex = isRedNation ? 0xff3355 : (isGoldNation ? 0xffaa00 : 0x00d4ff);

        // 1. Dark Midnight Navy / Charcoal Primary Hull
        const flyDarkHullMat = new THREE.MeshStandardMaterial({
          color: 0x182230,
          roughness: 0.35,
          metalness: 0.65,
          flatShading: true
        });

        // 2. Pure White / Ceramic Armor Plates
        const flyWhiteArmorMat = new THREE.MeshStandardMaterial({
          color: 0xf2f6fa,
          roughness: 0.22,
          metalness: 0.30,
          flatShading: true
        });

        // 3. Faceted Gem Cockpit Glass (Nation tinted)
        const canopyTint = isRedNation ? 0x2e0814 : (isGoldNation ? 0x2e1e08 : 0x092238);
        const canopyEmissive = isRedNation ? 0x550c1e : (isGoldNation ? 0x55380c : 0x063e66);
        const flyCanopyMat = new THREE.MeshStandardMaterial({
          color: canopyTint,
          emissive: canopyEmissive,
          emissiveIntensity: 0.80,
          roughness: 0.08,
          metalness: 0.92,
          flatShading: true
        });

        // 4. Vibrant Neon Emissive Trim (Wing strips, nacelle intake rings, muzzle ring)
        const flyNeonMat = new THREE.MeshBasicMaterial({
          color: neonColorHex
        });

        // 5. Polished Gunmetal Barrel
        const flyGunMat = new THREE.MeshStandardMaterial({
          color: 0x1f2732,
          roughness: 0.28,
          metalness: 0.88,
          flatShading: true
        });

        // --- A. CENTRAL FUSELAGE & NOSE ---
        // 1. Lower hull wedge base
        const lowerHullGeo = new THREE.BoxGeometry(10.5, 3.2, 23);
        const lowerHull = new THREE.Mesh(lowerHullGeo, flyDarkHullMat);
        lowerHull.position.set(0, -0.4, 0);
        shipGroup.add(lowerHull);

        // 2. Upper spine ridge
        const spineGeo = new THREE.BoxGeometry(6.6, 2.6, 20);
        const spineMesh = new THREE.Mesh(spineGeo, flyDarkHullMat);
        spineMesh.position.set(0, 1.4, 1.0);
        shipGroup.add(spineMesh);

        // 3. Forward prow wedge
        const prowGeo = new THREE.ConeGeometry(5.8, 12, 4);
        prowGeo.rotateX(Math.PI / 2);
        prowGeo.rotateY(Math.PI / 4);
        const prowMesh = new THREE.Mesh(prowGeo, flyDarkHullMat);
        prowMesh.scale.set(1.15, 0.55, 1.0);
        prowMesh.position.set(0, 0.4, 11);
        shipGroup.add(prowMesh);

        // 4. Stepped nose mount block
        const noseMountGeo = new THREE.BoxGeometry(3.6, 2.6, 4.5);
        const noseMount = new THREE.Mesh(noseMountGeo, flyDarkHullMat);
        noseMount.position.set(0, 0.2, 14.5);
        shipGroup.add(noseMount);

        // --- B. FORWARD CANNON BARREL & GLOWING RINGS ---
        // Cannon barrel collar base
        const bCollarGeo = new THREE.CylinderGeometry(1.6, 1.8, 2.8, 8);
        bCollarGeo.rotateX(Math.PI / 2);
        const bCollar = new THREE.Mesh(bCollarGeo, flyDarkHullMat);
        bCollar.position.set(0, 0.1, 16.2);
        shipGroup.add(bCollar);

        // Main cylindrical cannon barrel
        const barrelGeo = new THREE.CylinderGeometry(1.05, 1.25, 9.5, 8);
        barrelGeo.rotateX(Math.PI / 2);
        const barrel = new THREE.Mesh(barrelGeo, flyGunMat);
        barrel.position.set(0, 0.1, 20);
        shipGroup.add(barrel);

        // Glowing neon ring near barrel tip
        const tipRingGeo = new THREE.TorusGeometry(1.18, 0.22, 6, 16);
        const tipRing = new THREE.Mesh(tipRingGeo, flyNeonMat);
        tipRing.position.set(0, 0.1, 23.2);
        shipGroup.add(tipRing);

        // Glowing muzzle aperture ring at front tip
        const muzzleApertureGeo = new THREE.TorusGeometry(1.05, 0.24, 6, 16);
        const muzzleAperture = new THREE.Mesh(muzzleApertureGeo, flyNeonMat);
        muzzleAperture.position.set(0, 0.1, 24.6);
        shipGroup.add(muzzleAperture);

        // --- C. FACETED GEM COCKPIT CANOPY ---
        // Faceted gem canopy
        const canopyGeo = new THREE.CylinderGeometry(1.6, 3.8, 9.2, 6);
        canopyGeo.rotateX(Math.PI / 2);
        const canopy = new THREE.Mesh(canopyGeo, flyCanopyMat);
        canopy.scale.set(0.92, 0.70, 1.0);
        canopy.position.set(0, 2.6, 3.5);
        shipGroup.add(canopy);

        // Cockpit framing rim
        const frameGeo = new THREE.CylinderGeometry(1.8, 4.2, 9.4, 6);
        frameGeo.rotateX(Math.PI / 2);
        const frame = new THREE.Mesh(frameGeo, flyDarkHullMat);
        frame.scale.set(0.98, 0.40, 1.0);
        frame.position.set(0, 1.9, 3.5);
        shipGroup.add(frame);

        // --- D. WHITE CERAMIC AFT COWL BEHIND CANOPY ---
        // Raised white armor plate behind cockpit canopy
        const aftCowlGeo = new THREE.BoxGeometry(4.8, 2.0, 7.5);
        const aftCowl = new THREE.Mesh(aftCowlGeo, flyWhiteArmorMat);
        aftCowl.position.set(0, 2.4, -3.2);
        shipGroup.add(aftCowl);

        // Faceted transition wedge between canopy and aft cowl
        const cowlSlopeGeo = new THREE.ConeGeometry(3.6, 4.0, 4);
        cowlSlopeGeo.rotateX(Math.PI / 2);
        cowlSlopeGeo.rotateY(Math.PI / 4);
        const cowlSlope = new THREE.Mesh(cowlSlopeGeo, flyWhiteArmorMat);
        cowlSlope.scale.set(1.1, 0.5, 0.9);
        cowlSlope.position.set(0, 2.5, 0.2);
        shipGroup.add(cowlSlope);

        // --- E. SWEPT DELTA WINGS & WHITE CERAMIC PLATES ---
        // Main dark wing platform
        const wingBedGeo = new THREE.BoxGeometry(28, 1.6, 14);
        const wingBed = new THREE.Mesh(wingBedGeo, flyDarkHullMat);
        wingBed.position.set(0, -0.2, -1.0);
        shipGroup.add(wingBed);

        // White ceramic armor wing panels (Left & Right)
        const createWingPlateGeometry = (isRight) => {
          const s = isRight ? 1 : -1;
          const geom = new THREE.BufferGeometry();
          const verts = new Float32Array([
            // Top face (0-3)
            s * 3.4, 0.9, 7.2,
            s * 12.0, 0.7, 0.5,
            s * 12.4, 0.7, -6.8,
            s * 4.8, 0.9, -6.5,
            // Bottom face (4-7)
            s * 3.4, -0.1, 7.2,
            s * 12.0, -0.1, 0.5,
            s * 12.4, -0.1, -6.8,
            s * 4.8, -0.1, -6.5
          ]);
          geom.setAttribute('position', new THREE.BufferAttribute(verts, 3));

          let indices;
          if (isRight) {
            indices = [
              0, 1, 2,  0, 2, 3,
              4, 6, 5,  4, 7, 6,
              0, 5, 1,  0, 4, 5,
              1, 6, 2,  1, 5, 6,
              2, 7, 3,  2, 6, 7,
              3, 4, 0,  3, 7, 4
            ];
          } else {
            indices = [
              0, 2, 1,  0, 3, 2,
              4, 5, 6,  4, 6, 7,
              0, 1, 5,  0, 5, 4,
              1, 2, 6,  1, 6, 5,
              2, 3, 7,  2, 7, 6,
              3, 0, 4,  3, 4, 7
            ];
          }
          geom.setIndex(indices);
          geom.computeVertexNormals();
          return geom;
        };

        const rightWingPlate = new THREE.Mesh(createWingPlateGeometry(true), flyWhiteArmorMat);
        shipGroup.add(rightWingPlate);

        const leftWingPlate = new THREE.Mesh(createWingPlateGeometry(false), flyWhiteArmorMat);
        shipGroup.add(leftWingPlate);

        // --- F. GLOWING NEON TRIM LINES (Leading edges & seams) ---
        [-1, 1].forEach(side => {
          // 1. Leading edge glowing stripe
          const leLen = 17.0;
          const leGeo = new THREE.BoxGeometry(0.55, 0.55, leLen);
          const leMesh = new THREE.Mesh(leGeo, flyNeonMat);
          leMesh.position.set(side * 8.4, 0.6, 4.4);
          leMesh.rotation.y = side * -0.60;
          shipGroup.add(leMesh);

          // 2. Inner fuselage seam glowing stripe
          const inLen = 14.5;
          const inGeo = new THREE.BoxGeometry(0.50, 0.50, inLen);
          const inMesh = new THREE.Mesh(inGeo, flyNeonMat);
          inMesh.position.set(side * 4.4, 0.95, 0.6);
          inMesh.rotation.y = side * -0.18;
          shipGroup.add(inMesh);
        });

        // --- G. DUAL WINGTIP ENGINE NACELLES / PODS ---
        [-1, 1].forEach(side => {
          const px = side * 14.6;
          const py = 0.4;
          const pz = -2.5;

          // 1. Main cylindrical nacelle body (Dark navy/charcoal)
          const podGeo = new THREE.CylinderGeometry(2.6, 3.0, 13.5, 8);
          podGeo.rotateX(Math.PI / 2);
          const podMesh = new THREE.Mesh(podGeo, flyDarkHullMat);
          podMesh.position.set(px, py, pz);
          shipGroup.add(podMesh);

          // 2. White armor cap on top of pod (Exact reference match!)
          const topCowlGeo = new THREE.BoxGeometry(2.8, 1.3, 8.5);
          const topCowl = new THREE.Mesh(topCowlGeo, flyWhiteArmorMat);
          topCowl.position.set(px, py + 2.1, pz + 0.5);
          shipGroup.add(topCowl);

          // 3. Glowing neon intake ring on front rim
          const intakeRingGeo = new THREE.TorusGeometry(2.5, 0.32, 6, 16);
          const intakeRing = new THREE.Mesh(intakeRingGeo, flyNeonMat);
          intakeRing.position.set(px, py, pz + 6.8);
          shipGroup.add(intakeRing);

          // 4. Recessed dark intake interior
          const intakeInnerGeo = new THREE.CylinderGeometry(1.8, 2.3, 2.2, 8);
          intakeInnerGeo.rotateX(Math.PI / 2);
          const intakeInner = new THREE.Mesh(intakeInnerGeo, flyDarkHullMat);
          intakeInner.position.set(px, py, pz + 6.0);
          shipGroup.add(intakeInner);

          // 5. Outer flank glowing neon accent slit
          const slitGeo = new THREE.BoxGeometry(0.45, 0.45, 5.5);
          const slit = new THREE.Mesh(slitGeo, flyNeonMat);
          slit.position.set(px + side * 2.8, py + 0.6, pz);
          shipGroup.add(slit);

          // 6. Rear exhaust nozzle
          const nozGeo = new THREE.CylinderGeometry(2.4, 2.1, 2.5, 8);
          nozGeo.rotateX(Math.PI / 2);
          const noz = new THREE.Mesh(nozGeo, flyGunMat);
          noz.position.set(px, py, pz - 7.5);
          shipGroup.add(noz);

          // Side nacelle sleek ion light jets
          const podFlameGeo = new THREE.CylinderGeometry(0.8, 0.25, 12, 8);
          podFlameGeo.rotateX(Math.PI / 2);
          const podFlameMat = new THREE.MeshBasicMaterial({
            color: flameColorHex,
            transparent: true,
            opacity: 0.85,
            blending: THREE.AdditiveBlending
          });
          const podFlame = new THREE.Mesh(podFlameGeo, podFlameMat);
          podFlame.position.set(px, py, pz - 13.5);
          flameGroup.add(podFlame);

          // Side nacelle inner white core
          const podCoreGeo = new THREE.CylinderGeometry(0.35, 0.1, 9.5, 6);
          podCoreGeo.rotateX(Math.PI / 2);
          const podCore = new THREE.Mesh(podCoreGeo, new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.92,
            blending: THREE.AdditiveBlending
          }));
          podCore.position.set(px, py, pz - 12.0);
          flameGroup.add(podCore);
        });

        // --- H. CENTER MAIN ENGINE & FUTURISTIC SCI-FI ION LIGHT BEAM ---
        // Center rear nozzle bell
        const mainNozzleGeo = new THREE.CylinderGeometry(3.4, 4.3, 4.5, 10);
        mainNozzleGeo.rotateX(Math.PI / 2);
        const mainNozzle = new THREE.Mesh(mainNozzleGeo, flyDarkHullMat);
        mainNozzle.position.set(0, 0.2, -12);
        shipGroup.add(mainNozzle);

        // Glowing neon interior rim
        const nozzleRingGeo = new THREE.TorusGeometry(3.1, 0.35, 6, 16);
        const nozzleRing = new THREE.Mesh(nozzleRingGeo, flyNeonMat);
        nozzleRing.position.set(0, 0.2, -14.2);
        shipGroup.add(nozzleRing);

        // 1. Sci-Fi Outer Ion Plasma Glow Beam (Clean, steady celestial light)
        const ionBeamGeo = new THREE.CylinderGeometry(2.4, 0.5, 24, 12);
        ionBeamGeo.rotateX(Math.PI / 2);
        const ionBeamMat = new THREE.MeshBasicMaterial({
          color: flameColorHex,
          transparent: true,
          opacity: 0.82,
          blending: THREE.AdditiveBlending
        });
        const ionBeam = new THREE.Mesh(ionBeamGeo, ionBeamMat);
        ionBeam.position.set(0, 0.2, -24.5);
        flameGroup.add(ionBeam);

        // 2. High-Energy White Core Ion Beam
        const ionCoreGeo = new THREE.CylinderGeometry(1.1, 0.2, 19, 10);
        ionCoreGeo.rotateX(Math.PI / 2);
        const ionCoreMat = new THREE.MeshBasicMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: 0.95,
          blending: THREE.AdditiveBlending
        });
        const ionCore = new THREE.Mesh(ionCoreGeo, ionCoreMat);
        ionCore.position.set(0, 0.2, -22);
        flameGroup.add(ionCore);

        // 3. Ion Containment Shock Rings (Pulse Diamonds)
        [-19, -25].forEach((zPos, idx) => {
          const sRingGeo = new THREE.TorusGeometry(idx === 0 ? 1.7 : 1.15, 0.20, 6, 16);
          const sRingMat = new THREE.MeshBasicMaterial({
            color: flameColorHex,
            transparent: true,
            opacity: 0.85,
            blending: THREE.AdditiveBlending
          });
          const sRing = new THREE.Mesh(sRingGeo, sRingMat);
          sRing.position.set(0, 0.2, zPos);
          flameGroup.add(sRing);
        });

        // --- I. WINGTIP AERODYNAMIC SLIPSTREAM GLIDE TRAILS ("kanatlarda hafif çizgisel bir süzülme efekti, aşırı uzamasın") ---
        const wingTrails = new THREE.Group();
        wingTrails.name = 'wingTrails';
        wingTrails.visible = false;
        shipGroup.add(wingTrails);

        [-1, 1].forEach(side => {
          const wx = side * 14.6;
          // Outer subtle glowing slipstream ribbon (length 18 units, neatly restrained)
          const trailGeo = new THREE.CylinderGeometry(0.20, 0.38, 18, 6);
          trailGeo.rotateX(Math.PI / 2);
          const trailMat = new THREE.MeshBasicMaterial({
            color: neonColorHex,
            transparent: true,
            opacity: 0.55,
            blending: THREE.AdditiveBlending
          });
          const trailMesh = new THREE.Mesh(trailGeo, trailMat);
          trailMesh.position.set(wx, 0.4, -17.5);
          wingTrails.add(trailMesh);

          // Inner white slipstream thread
          const threadGeo = new THREE.CylinderGeometry(0.08, 0.16, 13, 6);
          threadGeo.rotateX(Math.PI / 2);
          const threadMat = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.70,
            blending: THREE.AdditiveBlending
          });
          const threadMesh = new THREE.Mesh(threadGeo, threadMat);
          threadMesh.position.set(wx, 0.4, -15.0);
          wingTrails.add(threadMesh);
        });

        break;
      }

      // =====================================================================
      // === SEVİYE 2: İĞNE AVCI (2.png) - KESKİN NİŞANCI ÖNLEME GEMİSİ ===
      // =====================================================================
      case 'tier-2': {
        tierScale = 1.10;

        // --- A. Central Fuselage & Needle Dart Hull ---
        const lowerKeelGeo = new THREE.BoxGeometry(7.5, 2.8, 22);
        const lowerKeel = new THREE.Mesh(lowerKeelGeo, darkArmorMat);
        lowerKeel.position.set(0, -0.3, -2);
        shipGroup.add(lowerKeel);

        const spineGeo = new THREE.BoxGeometry(4.5, 2.0, 18);
        const spine = new THREE.Mesh(spineGeo, darkArmorMat);
        spine.position.set(0, 1.1, -3);
        shipGroup.add(spine);

        // Forward prow wedge
        const prowGeo = new THREE.BoxGeometry(5.0, 2.2, 10);
        const prow = new THREE.Mesh(prowGeo, darkArmorMat);
        prow.position.set(0, 0.2, 8);
        shipGroup.add(prow);

        // White ceramic side armor fairings
        [-1, 1].forEach(side => {
          const sideArmorGeo = new THREE.BoxGeometry(1.8, 1.6, 18);
          const sideArmor = new THREE.Mesh(sideArmorGeo, whiteArmorMat);
          sideArmor.position.set(side * 3.6, 0.5, -3);
          shipGroup.add(sideArmor);

          const stripGeo = new THREE.BoxGeometry(0.3, 0.3, 16);
          const strip = new THREE.Mesh(stripGeo, neonStripMat);
          strip.position.set(side * 4.6, 0.5, -3);
          shipGroup.add(strip);
        });

        // --- B. Forward Long Needle Sniper Lance ---
        const collarGeo = new THREE.CylinderGeometry(1.3, 1.7, 3.0, 8);
        collarGeo.rotateX(Math.PI / 2);
        const collar = new THREE.Mesh(collarGeo, darkArmorMat);
        collar.position.set(0, 0.2, 14);
        shipGroup.add(collar);

        const needleGeo = new THREE.CylinderGeometry(0.7, 0.9, 14, 8);
        needleGeo.rotateX(Math.PI / 2);
        const needle = new THREE.Mesh(needleGeo, gunMetalMatShared);
        needle.position.set(0, 0.2, 21);
        shipGroup.add(needle);

        // Glowing longitudinal neon strip on needle barrel
        const nChannelGeo = new THREE.BoxGeometry(0.2, 0.2, 13);
        const nChannel = new THREE.Mesh(nChannelGeo, neonStripMat);
        nChannel.position.set(0, 0.75, 21);
        shipGroup.add(nChannel);

        const tipRingGeo = new THREE.TorusGeometry(0.85, 0.18, 6, 16);
        const tipRing = new THREE.Mesh(tipRingGeo, neonStripMat);
        tipRing.position.set(0, 0.2, 25);
        shipGroup.add(tipRing);

        const muzzleApertureGeo = new THREE.TorusGeometry(0.7, 0.2, 6, 16);
        const muzzleAperture = new THREE.Mesh(muzzleApertureGeo, neonStripMat);
        muzzleAperture.position.set(0, 0.2, 26);
        shipGroup.add(muzzleAperture);

        // --- C. Elongated Faceted Cockpit Canopy ---
        const canopyGeo = new THREE.CylinderGeometry(1.2, 2.6, 8.5, 6);
        canopyGeo.rotateX(Math.PI / 2);
        const canopy = new THREE.Mesh(canopyGeo, canopyGlassMat);
        canopy.scale.set(0.9, 0.65, 1.0);
        canopy.position.set(0, 2.0, 2.5);
        shipGroup.add(canopy);

        // Raised white armor plate behind canopy
        const aftCowlGeo = new THREE.BoxGeometry(3.6, 1.5, 6.0);
        const aftCowl = new THREE.Mesh(aftCowlGeo, whiteArmorMat);
        aftCowl.position.set(0, 1.8, -4.5);
        shipGroup.add(aftCowl);

        // --- D. Swept Wings with Glowing Cyan Outlines ---
        const wingBedGeo = new THREE.BoxGeometry(30, 1.2, 11);
        const wingBed = new THREE.Mesh(wingBedGeo, darkArmorMat);
        wingBed.position.set(0, -0.2, -4);
        shipGroup.add(wingBed);

        [-1, 1].forEach(side => {
          const wArmorGeo = new THREE.BoxGeometry(11, 1.0, 7);
          const wArmor = new THREE.Mesh(wArmorGeo, whiteArmorMat);
          wArmor.position.set(side * 10, 0.3, -4);
          wArmor.rotation.y = side * -0.25;
          shipGroup.add(wArmor);

          const edgeGeo = new THREE.BoxGeometry(13, 0.35, 0.35);
          const edge = new THREE.Mesh(edgeGeo, neonStripMat);
          edge.position.set(side * 9.5, 0.4, 0);
          edge.rotation.y = side * -0.25;
          shipGroup.add(edge);
        });

        // --- E. Dual Outboard Nacelle Engines (At Wingtips) ---
        [-1, 1].forEach(side => {
          const px = side * 16;
          const py = 0.4;
          const pz = -6;

          const nacelleGeo = new THREE.CylinderGeometry(2.8, 2.8, 13, 10);
          nacelleGeo.rotateX(Math.PI / 2);
          const nacelle = new THREE.Mesh(nacelleGeo, darkArmorMat);
          nacelle.position.set(px, py, pz);
          shipGroup.add(nacelle);

          const inCollarGeo = new THREE.CylinderGeometry(3.1, 2.9, 3.0, 10);
          inCollarGeo.rotateX(Math.PI / 2);
          const inCollar = new THREE.Mesh(inCollarGeo, whiteArmorMat);
          inCollar.position.set(px, py, pz + 5);
          shipGroup.add(inCollar);

          const inRingGeo = new THREE.TorusGeometry(2.8, 0.25, 6, 16);
          const inRing = new THREE.Mesh(inRingGeo, neonStripMat);
          inRing.position.set(px, py, pz + 6.5);
          shipGroup.add(inRing);

          addIonThruster(px, py, pz - 6.5, 2.8, 5, 20);
        });

        addIonThruster(0, 0.2, -12, 2.2, 5, 14);
        addWingTrails(16, -12, 16);

        break;
      }

      // =====================================================================
      // === SEVİYE 3: KATAMARANA (3.png) - ÇİFT GÖVDELİ AĞIR TAARRUZ AVCI ===
      // =====================================================================
      case 'tier-3': {
        tierScale = 1.20;

        const hullSpacing = 14; // Port -14, Starboard +14

        // --- A. Twin Parallel Fuselages (Left & Right Hulls) ---
        [-1, 1].forEach(side => {
          const hx = side * hullSpacing;

          // Main hull body
          const hullKeelGeo = new THREE.BoxGeometry(6.5, 3.8, 28);
          const hullKeel = new THREE.Mesh(hullKeelGeo, darkArmorMat);
          hullKeel.position.set(hx, 0, -2);
          shipGroup.add(hullKeel);

          // Forward tapered nose block
          const prowGeo = new THREE.BoxGeometry(5.2, 3.0, 10);
          const prow = new THREE.Mesh(prowGeo, darkArmorMat);
          prow.position.set(hx, 0.2, 13);
          shipGroup.add(prow);

          // Outer ceramic white armor plate
          const outerArmorGeo = new THREE.BoxGeometry(1.6, 3.2, 24);
          const outerArmor = new THREE.Mesh(outerArmorGeo, whiteArmorMat);
          outerArmor.position.set(hx + side * 3.4, 0.3, -2);
          shipGroup.add(outerArmor);

          // Inner ceramic white armor plate
          const innerArmorGeo = new THREE.BoxGeometry(1.4, 3.0, 20);
          const innerArmor = new THREE.Mesh(innerArmorGeo, whiteArmorMat);
          innerArmor.position.set(hx - side * 3.4, 0.3, -4);
          shipGroup.add(innerArmor);

          // Glowing cyan contour strip
          const prowStripGeo = new THREE.BoxGeometry(0.3, 0.3, 12);
          const prowStrip = new THREE.Mesh(prowStripGeo, neonStripMat);
          prowStrip.position.set(hx + side * 2.0, 0.4, 12);
          shipGroup.add(prowStrip);

          // Faceted Cockpit Canopy on each hull
          const canopyGeo = new THREE.CylinderGeometry(1.3, 2.5, 8.0, 6);
          canopyGeo.rotateX(Math.PI / 2);
          const canopy = new THREE.Mesh(canopyGeo, canopyGlassMat);
          canopy.scale.set(0.9, 0.65, 1.0);
          canopy.position.set(hx, 2.4, 6);
          shipGroup.add(canopy);

          // CANNON ON EACH SIDE HULL NOSE (Matches user request: "atışını 2 yanda olan kısımlardan yap")
          const gunGeo = new THREE.CylinderGeometry(1.1, 1.3, 10, 8);
          gunGeo.rotateX(Math.PI / 2);
          const gun = new THREE.Mesh(gunGeo, gunMetalMatShared);
          gun.position.set(hx, 0.2, 18);
          shipGroup.add(gun);

          const mRingGeo = new THREE.TorusGeometry(1.2, 0.2, 6, 16);
          const mRing = new THREE.Mesh(mRingGeo, neonStripMat);
          mRing.position.set(hx, 0.2, 22);
          shipGroup.add(mRing);

          // Rear engine nacelle
          const nacelleGeo = new THREE.CylinderGeometry(3.6, 4.0, 12, 12);
          nacelleGeo.rotateX(Math.PI / 2);
          const nacelle = new THREE.Mesh(nacelleGeo, darkArmorMat);
          nacelle.position.set(hx, 0.3, -15);
          shipGroup.add(nacelle);

          const ringGeo = new THREE.CylinderGeometry(4.0, 4.0, 3.0, 12);
          ringGeo.rotateX(Math.PI / 2);
          const ring = new THREE.Mesh(ringGeo, whiteArmorMat);
          ring.position.set(hx, 0.3, -13);
          shipGroup.add(ring);

          addIonThruster(hx, 0.3, -17, 3.8, 5, 22);
        });

        // --- B. Connecting Crossbar / Bridge (Between the two side hulls) ---
        const crossbarGeo = new THREE.BoxGeometry(24, 3.0, 12);
        const crossbar = new THREE.Mesh(crossbarGeo, darkArmorMat);
        crossbar.position.set(0, 0.3, -3);
        shipGroup.add(crossbar);

        const chevronGeo = new THREE.BoxGeometry(18, 1.2, 8);
        const chevron = new THREE.Mesh(chevronGeo, whiteArmorMat);
        chevron.position.set(0, 1.8, -3);
        shipGroup.add(chevron);

        const leadEdgeGeo = new THREE.BoxGeometry(24, 0.35, 0.35);
        const leadEdge = new THREE.Mesh(leadEdgeGeo, neonStripMat);
        leadEdge.position.set(0, 0.4, 3.0);
        shipGroup.add(leadEdge);

        // Central bridge avionics node
        const avionicsGeo = new THREE.CylinderGeometry(2.4, 2.8, 2.0, 8);
        avionicsGeo.rotateX(Math.PI / 2);
        const avionics = new THREE.Mesh(avionicsGeo, darkArmorMat);
        avionics.position.set(0, 2.2, -3);
        shipGroup.add(avionics);

        const avionicsSlitGeo = new THREE.BoxGeometry(2.5, 0.35, 0.6);
        const avionicsSlit = new THREE.Mesh(avionicsSlitGeo, neonStripMat);
        avionicsSlit.position.set(0, 2.6, -3);
        shipGroup.add(avionicsSlit);

        addWingTrails(15, -20, 18);

        break;
      }

      // =====================================================================
      // === SEVİYE 4: MIZRAK MUHARİP (5.png) - ÇİFT ÇATAL YIRTICI MUHRİP ===
      // =====================================================================
      case 'tier-4': {
        tierScale = 1.30;

        // --- A. Forward Twin Weapon Prongs (Lances) ---
        // Clean beveled wedge architecture: sharp forward lances with glowing cyan edges
        [-1, 1].forEach(side => {
          const px = side * 7.5;

          // Main prong blade
          const prongGeo = new THREE.BoxGeometry(3.2, 2.6, 26);
          const prong = new THREE.Mesh(prongGeo, darkArmorMat);
          prong.position.set(px, 0.2, 13);
          shipGroup.add(prong);

          // Ceramic white armor plate on top
          const pArmorGeo = new THREE.BoxGeometry(2.6, 1.0, 24);
          const pArmor = new THREE.Mesh(pArmorGeo, whiteArmorMat);
          pArmor.position.set(px, 1.7, 13);
          shipGroup.add(pArmor);

          // Sharp beveled nose tip wedge
          const tipWedgeGeo = new THREE.BoxGeometry(2.4, 2.0, 6.0);
          const tipWedge = new THREE.Mesh(tipWedgeGeo, darkArmorMat);
          tipWedge.position.set(px, 0.2, 26);
          shipGroup.add(tipWedge);

          // Clean glowing emitter aperture muzzle at prong tip (Matches 5.png)
          const muzzleRingGeo = new THREE.TorusGeometry(1.2, 0.22, 6, 16);
          const muzzleRing = new THREE.Mesh(muzzleRingGeo, neonStripMat);
          muzzleRing.position.set(px, 0.2, 28);
          shipGroup.add(muzzleRing);

          // Full-length glowing cyan outer line
          const outerStripGeo = new THREE.BoxGeometry(0.3, 0.3, 26);
          const outerStrip = new THREE.Mesh(outerStripGeo, neonStripMat);
          outerStrip.position.set(px + side * 1.7, 0.4, 13);
          shipGroup.add(outerStrip);

          // Glowing violet inner channel line
          const innerStripGeo = new THREE.BoxGeometry(0.3, 0.3, 26);
          const innerStrip = new THREE.Mesh(innerStripGeo, violetNeonMat);
          innerStrip.position.set(px - side * 1.7, 0.4, 13);
          shipGroup.add(innerStrip);
        });

        // --- B. Central Fuselage & Nestled Cockpit Pod ---
        const fuseGeo = new THREE.BoxGeometry(8.5, 4.0, 24);
        const fuse = new THREE.Mesh(fuseGeo, darkArmorMat);
        fuse.position.set(0, 0.2, -4);
        shipGroup.add(fuse);

        const cowlGeo = new THREE.BoxGeometry(7.0, 1.6, 18);
        const cowl = new THREE.Mesh(cowlGeo, whiteArmorMat);
        cowl.position.set(0, 2.1, -5);
        shipGroup.add(cowl);

        // Dorsal Faceted Cockpit Canopy (Nestled between prongs)
        const canopyGeo = new THREE.CylinderGeometry(1.4, 2.8, 8.5, 6);
        canopyGeo.rotateX(Math.PI / 2);
        const canopy = new THREE.Mesh(canopyGeo, canopyGlassMat);
        canopy.scale.set(0.9, 0.65, 1.0);
        canopy.position.set(0, 2.5, 4);
        shipGroup.add(canopy);

        const cFrameGeo = new THREE.TorusGeometry(2.1, 0.2, 4, 16);
        cFrameGeo.rotateX(Math.PI / 2);
        const cFrame = new THREE.Mesh(cFrameGeo, neonStripMat);
        cFrame.position.set(0, 1.9, 4);
        shipGroup.add(cFrame);

        // --- C. Flank Heavy Missile Launcher Pods ---
        [-1, 1].forEach(side => {
          const mx = side * 13;
          const podGeo = new THREE.BoxGeometry(4.5, 5.0, 11);
          const pod = new THREE.Mesh(podGeo, darkArmorMat);
          pod.position.set(mx, 0.4, -3);
          shipGroup.add(pod);

          const podCapGeo = new THREE.BoxGeometry(4.8, 1.2, 11.2);
          const podCap = new THREE.Mesh(podCapGeo, whiteArmorMat);
          podCap.position.set(mx, 3.2, -3);
          shipGroup.add(podCap);

          // 2x3 Grid of Missile Tubes
          [-1.1, 1.1].forEach(colX => {
            [-1.3, 0.4, 2.1].forEach(rowY => {
              const tubeGeo = new THREE.CylinderGeometry(0.5, 0.5, 2.5, 8);
              tubeGeo.rotateX(Math.PI / 2);
              const tube = new THREE.Mesh(tubeGeo, gunMetalMatShared);
              tube.position.set(mx + colX, rowY, 2.5);
              shipGroup.add(tube);
            });
          });
        });

        // --- D. Triple Heavy Stern Engines ---
        addIonThruster(0, 0.6, -17, 3.5, 10, 24);
        addIonThruster(-7.5, 0.3, -15, 2.8, 8, 20);
        addIonThruster(7.5, 0.3, -15, 2.8, 8, 20);

        addWingTrails(14, -17, 18);

        break;
      }

      // =====================================================================
      // === SEVİYE 5: AMİRAL TİTAN (7.png) - YÜCE AMİRAL SANCAĞI (ZİRVE GEMİ) ===
      // =====================================================================
      case 'tier-5':
      case 'tier-6':
      case 'tier-7': {
        tierScale = 1.40;

        // --- A. Supreme Flagship Titan Dagger Hull ---
        const keelGeo = new THREE.BoxGeometry(13, 5.5, 38);
        const keel = new THREE.Mesh(keelGeo, darkArmorMat);
        keel.position.set(0, 0, 0);
        shipGroup.add(keel);

        // Central Spine Trench with Glowing Energy Conduit
        const trenchGeo = new THREE.BoxGeometry(1.8, 1.0, 34);
        const trench = new THREE.Mesh(trenchGeo, darkArmorMat);
        trench.position.set(0, 2.5, 0);
        shipGroup.add(trench);

        const conduitGeo = new THREE.BoxGeometry(0.9, 0.3, 32);
        const conduit = new THREE.Mesh(conduitGeo, neonStripMat);
        conduit.position.set(0, 3.0, 0);
        shipGroup.add(conduit);

        // White Ceramic Deck Armor Chevron Plating
        [-1, 1].forEach(side => {
          const deckPlatesGeo = new THREE.BoxGeometry(5.5, 1.6, 32);
          const deckPlates = new THREE.Mesh(deckPlatesGeo, whiteArmorMat);
          deckPlates.position.set(side * 4.2, 2.1, -2);
          shipGroup.add(deckPlates);

          const skirtGeo = new THREE.BoxGeometry(4.2, 1.4, 26);
          const skirt = new THREE.Mesh(skirtGeo, darkArmorMat);
          skirt.position.set(side * 8.5, 1.4, -4);
          shipGroup.add(skirt);

          const cStrip1 = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.25, 26), neonStripMat);
          cStrip1.position.set(side * 6.8, 2.2, -2);
          shipGroup.add(cStrip1);

          const cStrip2 = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.25, 22), violetNeonMat);
          cStrip2.position.set(side * 10.4, 1.5, -4);
          shipGroup.add(cStrip2);
        });

        // Twin Forward Prow Blades (Clean beveled cutting edges - Matches 7.png)
        [-1, 1].forEach(side => {
          const bladeGeo = new THREE.BoxGeometry(2.4, 2.0, 14);
          const blade = new THREE.Mesh(bladeGeo, whiteArmorMat);
          blade.position.set(side * 3.8, 0.4, 20);
          shipGroup.add(blade);

          const edgeGeo = new THREE.BoxGeometry(0.3, 0.3, 14);
          const edge = new THREE.Mesh(edgeGeo, neonStripMat);
          edge.position.set(side * 3.8, 0.4, 20);
          shipGroup.add(edge);

          const muzzleGeo = new THREE.TorusGeometry(0.9, 0.18, 6, 16);
          const muzzle = new THREE.Mesh(muzzleGeo, neonStripMat);
          muzzle.position.set(side * 3.8, 0.4, 27);
          shipGroup.add(muzzle);
        });

        // --- B. 4 Dorsal Heavy Dual-Turrets ---
        const turretPositions = [
          { x: -6.5, y: 2.8, z: 9 },
          { x: 6.5, y: 2.8, z: 9 },
          { x: -7.5, y: 2.9, z: -5 },
          { x: 7.5, y: 2.9, z: -5 }
        ];

        turretPositions.forEach(tp => {
          const tRingGeo = new THREE.CylinderGeometry(2.6, 3.0, 1.3, 12);
          const tRing = new THREE.Mesh(tRingGeo, darkArmorMat);
          tRing.position.set(tp.x, tp.y, tp.z);
          shipGroup.add(tRing);

          const tHouseGeo = new THREE.BoxGeometry(3.0, 1.6, 4.0);
          const tHouse = new THREE.Mesh(tHouseGeo, darkArmorMat);
          tHouse.position.set(tp.x, tp.y + 1.1, tp.z);
          shipGroup.add(tHouse);

          [-0.8, 0.8].forEach(bx => {
            const barrelGeo = new THREE.CylinderGeometry(0.5, 0.6, 6, 6);
            barrelGeo.rotateX(Math.PI / 2);
            const barrel = new THREE.Mesh(barrelGeo, gunMetalMatShared);
            barrel.position.set(tp.x + bx, tp.y + 1.1, tp.z + 3.0);
            shipGroup.add(barrel);

            const tipGeo = new THREE.TorusGeometry(0.5, 0.12, 6, 12);
            const tip = new THREE.Mesh(tipGeo, neonStripMat);
            tip.position.set(tp.x + bx, tp.y + 1.1, tp.z + 6.0);
            shipGroup.add(tip);
          });
        });

        // --- C. Outrigger Warp Nacelles (Port & Starboard) ---
        [-1, 1].forEach(side => {
          const pylonGeo = new THREE.BoxGeometry(16, 1.0, 1.6);
          const pylon = new THREE.Mesh(pylonGeo, darkArmorMat);
          pylon.position.set(side * 16, 0.4, -3);
          shipGroup.add(pylon);

          const ox = side * 24;
          const podGeo = new THREE.BoxGeometry(5.2, 4.8, 18);
          const pod = new THREE.Mesh(podGeo, darkArmorMat);
          pod.position.set(ox, 0.4, -3);
          shipGroup.add(pod);

          const podArmorGeo = new THREE.BoxGeometry(5.6, 1.4, 18);
          const podArmor = new THREE.Mesh(podArmorGeo, whiteArmorMat);
          podArmor.position.set(ox, 2.8, -3);
          shipGroup.add(podArmor);

          const scoopGeo = new THREE.BoxGeometry(4.5, 3.5, 5);
          const scoop = new THREE.Mesh(scoopGeo, darkArmorMat);
          scoop.position.set(ox, 0.4, 8);
          shipGroup.add(scoop);

          const scoopStrip = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.25, 6), neonStripMat);
          scoopStrip.position.set(ox, 0.9, 8);
          shipGroup.add(scoopStrip);

          addIonThruster(ox, 0.4, -12, 2.2, 6, 18);
        });

        // --- D. Bank of 5 Inline Main Stern Engines ---
        [-8, -4, 0, 4, 8].forEach(ex => {
          addIonThruster(ex, 0.4, -20, 1.8, 6, 18);
        });

        addWingTrails(24, -12, 20);

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

    // Shield Perimeter Halo (sleek planar outer ring that never covers/blocks the ship model)
    const shieldRadius = (config.radius || 25) / tierScale * 1.25;
    const shieldGeo = new THREE.RingGeometry(shieldRadius * 0.98, shieldRadius * 1.12, 32);
    const shieldMat = new THREE.MeshBasicMaterial({
      color: isHealerShip ? 0x00ffaa : 0x00e5ff,
      transparent: true,
      opacity: 0.0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide
    });
    const shieldMesh = new THREE.Mesh(shieldGeo, shieldMat);
    shieldMesh.position.z = -1.0; // Sits just below ship plane so ship remains 100% visible
    shieldMesh.name = 'shieldBubble';
    shipRoot.add(shieldMesh);

    // Apply Tier Scale: Escalate presence & massiveness (geliştikçe daha cüsseli)
    shipRoot.scale.set(tierScale, tierScale, tierScale);

    return shipRoot;
  },

  // Procedural Seamless Rocky Bump Map for tactile surface depth
  getAsteroidBumpMap() {
    if (this._asteroidBumpMap) return this._asteroidBumpMap;
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    // Base neutral height (128)
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, 256, 256);

    // Procedural high-frequency Perlin noise grit
    const imgData = ctx.getImageData(0, 0, 256, 256);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      const n = (Math.random() - 0.5) * 44;
      const v = Math.min(255, Math.max(0, 128 + n));
      data[i] = v;
      data[i + 1] = v;
      data[i + 2] = v;
    }
    ctx.putImageData(imgData, 0, 0);

    // 28 Micro-impact craters with shaded interiors and raised bright rims
    for (let c = 0; c < 28; c++) {
      const cx = Math.random() * 256;
      const cy = Math.random() * 256;
      const cr = 4 + Math.random() * 8;
      const grad = ctx.createRadialGradient(cx - cr * 0.25, cy - cr * 0.25, cr * 0.1, cx, cy, cr);
      grad.addColorStop(0, 'rgba(25, 25, 25, 0.75)');
      grad.addColorStop(0.7, 'rgba(85, 85, 85, 0.4)');
      grad.addColorStop(1, 'rgba(235, 235, 235, 0.65)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, cr, 0, Math.PI * 2);
      ctx.fill();
    }

    // Rocky fault lines and impact fracture fissures
    ctx.strokeStyle = 'rgba(20, 20, 20, 0.65)';
    ctx.lineWidth = 1.4;
    for (let f = 0; f < 9; f++) {
      ctx.beginPath();
      let fx = Math.random() * 256;
      let fy = Math.random() * 256;
      ctx.moveTo(fx, fy);
      for (let s = 0; s < 4; s++) {
        fx += (Math.random() - 0.5) * 45;
        fy += (Math.random() - 0.5) * 45;
        ctx.lineTo(fx, fy);
      }
      ctx.stroke();
    }

    this._asteroidBumpMap = new THREE.CanvasTexture(canvas);
    this._asteroidBumpMap.wrapS = THREE.RepeatWrapping;
    this._asteroidBumpMap.wrapT = THREE.RepeatWrapping;
    this._asteroidBumpMap.repeat.set(2, 2);
    return this._asteroidBumpMap;
  },

  // Highly Detailed Procedural Asteroid 3D Mesh with enhanced depth, relief and vertex shadows
  createAsteroidMesh(radius, sizeTier, element = 'ice') {
    // Enhanced subdivision detail for deep rocky facets ("asteroitlere biraz daha gerçeklik vermek için daha derinlik katalım")
    const detail = sizeTier <= 2 ? 2 : (sizeTier <= 5 ? 3 : 4);
    const geometry = new THREE.IcosahedronGeometry(radius, detail);
    
    // Seed 5-8 procedural impact craters across surface
    const craterCount = 5 + (sizeTier % 4);
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
        radius: 0.26 + Math.random() * 0.35,
        depth: 0.30 + Math.random() * 0.30
      });
    }

    // User request: "asteoritlerin renklerini tek tip yap yani koyu gri füme renk ."
    // Uniform charcoal smoke dark gray palette for all asteroids
    const baseHex = 0x2e333a;
    const baseCol = new THREE.Color(baseHex);

    // Perturb vertices with multi-octave noise, deep craters, and compute vertex ambient occlusion
    const position = geometry.attributes.position;
    const colors = [];

    for (let i = 0; i < position.count; i++) {
      let vx = position.getX(i);
      let vy = position.getY(i);
      let vz = position.getZ(i);

      const len = Math.hypot(vx, vy, vz) || 1;
      const nx = vx / len;
      const ny = vy / len;
      const nz = vz / len;

      // 1. Broad irregular boulder deformation
      let noise = 1.0 + (Math.sin(nx * 3.2) * Math.cos(ny * 2.8) * Math.sin(nz * 2.5)) * 0.32;
      // 2. Terraced geological ridges
      noise += (Math.sin(nx * 8.0 + ny * 5.0) * Math.cos(nz * 7.5)) * 0.12;
      // 3. Sharp rock crags and step facets
      noise += (Math.sin(nx * 14.0) * Math.cos(ny * 12.0) * Math.sin(nz * 13.0)) * 0.05;

      // 4. Steep bowl craters with raised rim lips
      let inCraterFactor = 0;
      for (const crater of craters) {
        const dot = nx * crater.x + ny * crater.y + nz * crater.z;
        const dist = Math.acos(Math.max(-1, Math.min(1, dot)));
        if (dist < crater.radius) {
          const factor = dist / crater.radius;
          const bowl = Math.cos(factor * Math.PI * 0.5);
          const rim = Math.sin(factor * Math.PI) * 0.14;
          noise -= (bowl * crater.depth - rim);
          inCraterFactor = Math.max(inCraterFactor, bowl);
        }
      }

      position.setXYZ(i, vx * noise, vy * noise, vz * noise);

      // Deep shadow occlusion for craters/crevices & sunlit dusty highlights for high ridges
      const shade = Math.max(0.35, Math.min(1.25, 0.94 + (noise - 1.0) * 1.5 - inCraterFactor * 0.40));
      const vColor = baseCol.clone().multiplyScalar(shade);
      colors.push(vColor.r, vColor.g, vColor.b);
    }

    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.computeVertexNormals();

    const bumpMap = this.getAsteroidBumpMap();
    const material = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      vertexColors: true,
      bumpMap: bumpMap,
      bumpScale: 2.5,
      emissive: 0x000000,
      emissiveIntensity: 0.0,
      roughness: 0.88,
      metalness: 0.18,
      flatShading: true
    });

    const mesh = new THREE.Mesh(geometry, material);
    return mesh;
  },

  // Incandescent Mini-Asteroid Ore Fragment (User request: "asteroit içinden çıkan kristaller artık kristal değil. asteorite benzer akkor bir nesne olsun. s1,s2,s3 için yanında aynı asteoritten fakat ilgili renkle yansın.")
  createGemMesh(value = 1, element = 'green') {
    const group = new THREE.Group();
    const size = value >= 60 ? 11.8 : (value > 8 ? 8.4 : 5.8);

    let emissiveColor = 0x10b981;
    let coreColor = 0xa7f3d0;
    let auraColor = 0x059669;

    if (element === 'ice') {
      // S1: Cryo Cyan Incandescent Ore
      emissiveColor = 0x00e5ff;
      coreColor = 0xd0f8ff;
      auraColor = 0x0099cc;
    } else if (element === 'fire') {
      // S2: Magma Fire Incandescent Ore
      emissiveColor = 0xff4d00;
      coreColor = 0xffdf70;
      auraColor = 0xd92600;
    } else if (element === 'dark') {
      // S3: Void Violet Incandescent Ore
      emissiveColor = 0xaa3bff;
      coreColor = 0xf5d0fe;
      auraColor = 0x6b21a8;
    } else {
      // Standard EXP: Radiant Emerald Incandescent Ore
      emissiveColor = 0x10b981;
      coreColor = 0xa7f3d0;
      auraColor = 0x059669;
    }

    // 1. Procedural Craggy Asteroid Boulder Geometry
    const rockGeo = new THREE.IcosahedronGeometry(size, 2);
    const pos = rockGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      let vx = pos.getX(i);
      let vy = pos.getY(i);
      let vz = pos.getZ(i);
      const len = Math.hypot(vx, vy, vz) || 1;
      const nx = vx / len;
      const ny = vy / len;
      const nz = vz / len;

      // Rocky irregular ridges and craters matching asteroid topology
      const noise = 1.0 + (Math.sin(nx * 4.6) * Math.cos(ny * 3.8) * Math.sin(nz * 4.2)) * 0.32
                        + (Math.sin(nx * 9.2 + ny * 6.0) * Math.cos(nz * 8.4)) * 0.14;
      pos.setXYZ(i, vx * noise, vy * noise, vz * noise);
    }
    rockGeo.computeVertexNormals();

    // 2. Basalt Crust Material with Glowing Incandescent Fissures
    const rockMat = new THREE.MeshStandardMaterial({
      color: 0x181c20, // Dark obsidian meteorite crust
      emissive: emissiveColor,
      emissiveIntensity: 0.95,
      roughness: 0.58,
      metalness: 0.28,
      flatShading: true
    });
    const rockMesh = new THREE.Mesh(rockGeo, rockMat);
    group.add(rockMesh);

    // 3. Glowing Incandescent Core (Intense light bleeding through crevices)
    const coreGeo = new THREE.IcosahedronGeometry(size * 0.62, 1);
    const coreMat = new THREE.MeshBasicMaterial({
      color: coreColor,
      transparent: true,
      opacity: 0.88,
      blending: THREE.AdditiveBlending
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    group.add(coreMesh);

    // 4. Subtle Radiant Elemental Aura
    const auraGeo = new THREE.SphereGeometry(size * 1.22, 12, 10);
    const auraMat = new THREE.MeshBasicMaterial({
      color: auraColor,
      transparent: true,
      opacity: 0.30,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      depthWrite: false
    });
    const auraMesh = new THREE.Mesh(auraGeo, auraMat);
    group.add(auraMesh);

    return group;
  },

  // Laser Bolt Mesh with Elemental Power scaling (Ice Frost, Magma Blast, Pitch-Black Void with White Glow)
  createLaserMesh(isHeavy = false, color = 0x00f0ff, damage = 10, element = 'standard') {
    if (!this._laserGeoCache) this._laserGeoCache = {};
    if (!this._laserMatCache) this._laserMatCache = {};

    // Sleek needle-like laser bolt scaling - quantize scales to reuse geometries in cache
    const lengthScale = Math.round(Math.max(0.9, Math.min(1.6, Math.pow(damage / 10, 0.28))) * 10) / 10;
    const radiusScale = Math.round(Math.max(0.85, Math.min(1.25, Math.pow(damage / 10, 0.16))) * 10) / 10;
    const length = Math.round((isHeavy ? 24 : 17) * lengthScale);
    const radius = Math.round(((isHeavy ? 1.6 : 1.1) * radiusScale) * 10) / 10;

    const group = new THREE.Group();

    // Special User Request: "karanlık lazer de aynı diğerleri gibi ince olabilir." (Thin black core with intense white glow)
    if (element === 'dark') {
      const thinRadius = 1.5;
      const beamLength = 26;

      // 1. Center Solid Obsidian Pitch-Black Beam Core (Thin needle)
      if (!this._laserGeoCache['dark_core']) {
        this._laserGeoCache['dark_core'] = new THREE.CylinderGeometry(thinRadius, thinRadius, beamLength, 8);
      }
      if (!this._laserMatCache['dark_core']) {
        this._laserMatCache['dark_core'] = new THREE.MeshBasicMaterial({
          color: 0x040407 // Pure pitch black
        });
      }
      const blackCore = new THREE.Mesh(this._laserGeoCache['dark_core'], this._laserMatCache['dark_core']);
      group.add(blackCore);

      // 2. Radiant Pure White Glow Capsule (Thin outline)
      if (!this._laserGeoCache['dark_glow']) {
        this._laserGeoCache['dark_glow'] = new THREE.CylinderGeometry(thinRadius * 1.55, thinRadius * 1.55, beamLength * 1.05, 8);
      }
      if (!this._laserMatCache['dark_glow']) {
        this._laserMatCache['dark_glow'] = new THREE.MeshBasicMaterial({
          color: 0xffffff, // Pure intense white glow
          transparent: true,
          opacity: 0.90,
          blending: THREE.AdditiveBlending,
          side: THREE.DoubleSide
        });
      }
      const whiteGlow = new THREE.Mesh(this._laserGeoCache['dark_glow'], this._laserMatCache['dark_glow']);
      group.add(whiteGlow);

      // 3. Ethereal Outer Soft White Halo (Subtle fringe)
      if (!this._laserGeoCache['dark_halo']) {
        this._laserGeoCache['dark_halo'] = new THREE.CylinderGeometry(thinRadius * 2.2, thinRadius * 2.2, beamLength * 1.10, 8);
      }
      if (!this._laserMatCache['dark_halo']) {
        this._laserMatCache['dark_halo'] = new THREE.MeshBasicMaterial({
          color: 0xf0f4ff,
          transparent: true,
          opacity: 0.35,
          blending: THREE.AdditiveBlending,
          side: THREE.DoubleSide
        });
      }
      const whiteHalo = new THREE.Mesh(this._laserGeoCache['dark_halo'], this._laserMatCache['dark_halo']);
      group.add(whiteHalo);

      // 4. White Head and Tail Glow Spheres
      if (!this._laserGeoCache['dark_tip']) {
        this._laserGeoCache['dark_tip'] = new THREE.SphereGeometry(thinRadius * 1.5, 8, 8);
      }
      if (!this._laserMatCache['dark_tip']) {
        this._laserMatCache['dark_tip'] = new THREE.MeshBasicMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: 0.95,
          blending: THREE.AdditiveBlending
        });
      }
      const frontTip = new THREE.Mesh(this._laserGeoCache['dark_tip'], this._laserMatCache['dark_tip']);
      frontTip.position.set(0, beamLength / 2, 0);
      group.add(frontTip);

      const rearTip = new THREE.Mesh(this._laserGeoCache['dark_tip'], this._laserMatCache['dark_tip']);
      rearTip.position.set(0, -beamLength / 2, 0);
      group.add(rearTip);

      return group;
    }

    // User request: "ilk lazer her zaman yeşil olacak."
    let laserColor = 0x00ff44; // Default initial laser is always neon green
    if (element === 'ice') laserColor = 0x00f0ff;
    else if (element === 'fire') laserColor = 0xff4500;
    else if (element === 'standard' || !element) laserColor = 0x00ff44;

    const geoKey = `cyl_${radius}_${length}`;
    if (!this._laserGeoCache[geoKey]) {
      this._laserGeoCache[geoKey] = new THREE.CylinderGeometry(radius, radius, length, 6);
    }
    const matKey = `mat_${laserColor}`;
    if (!this._laserMatCache[matKey]) {
      this._laserMatCache[matKey] = new THREE.MeshBasicMaterial({
        color: laserColor,
        transparent: true,
        opacity: 0.95
      });
    }
    const outerBeam = new THREE.Mesh(this._laserGeoCache[geoKey], this._laserMatCache[matKey]);
    group.add(outerBeam);

    // Inner Core (Fire yellow plasma, heavy white core, or bright green core for initial laser)
    if (isHeavy || element === 'fire' || element === 'standard' || !element) {
      const coreR = Math.round((radius * 0.55) * 10) / 10;
      const coreL = Math.round(length * 1.05);
      const coreGeoKey = `core_${coreR}_${coreL}`;
      if (!this._laserGeoCache[coreGeoKey]) {
        this._laserGeoCache[coreGeoKey] = new THREE.CylinderGeometry(coreR, coreR, coreL, 5);
      }
      const coreCol = element === 'fire' ? 0xfff0aa : (element === 'standard' || !element ? 0xeeffee : 0xffffff);
      const coreMatKey = `core_mat_${coreCol}`;
      if (!this._laserMatCache[coreMatKey]) {
        this._laserMatCache[coreMatKey] = new THREE.MeshBasicMaterial({
          color: coreCol,
          transparent: true,
          opacity: 0.95,
          blending: THREE.AdditiveBlending
        });
      }
      const innerBeam = new THREE.Mesh(this._laserGeoCache[coreGeoKey], this._laserMatCache[coreMatKey]);
      group.add(innerBeam);
    }

    return group;
  },

  // Procedural Hexagon Armor Plating Texture for Space Stations
  _getStationHexTexture(nationHex = '#00f0ff', darkBase = '#151d26') {
    if (typeof document === 'undefined') return null;
    if (!this._stationHexCache) this._stationHexCache = {};
    const cacheKey = `${nationHex}_${darkBase}`;
    if (this._stationHexCache[cacheKey]) return this._stationHexCache[cacheKey];

    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = darkBase;
    ctx.fillRect(0, 0, 256, 128);

    const r = 12;
    const h = r * Math.sqrt(3);
    const side = r * 1.5;

    ctx.lineWidth = 1.3;
    for (let row = -1; row < 10; row++) {
      for (let col = -1; col < 12; col++) {
        const cx = col * side;
        const cy = row * h + (col % 2 === 1 ? h / 2 : 0);

        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const a = (Math.PI / 3) * i;
          const px = cx + r * Math.cos(a);
          const py = cy + r * Math.sin(a);
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();

        const seed = (col * 17 + row * 31) % 6;
        if (seed === 0) {
          ctx.fillStyle = '#263342';
          ctx.fill();
        } else if (seed === 1) {
          ctx.fillStyle = nationHex;
          ctx.globalAlpha = 0.28;
          ctx.fill();
          ctx.globalAlpha = 1.0;
        }

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
        ctx.stroke();
      }
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(3, 2);
    this._stationHexCache[cacheKey] = tex;
    return tex;
  },

  // 3D Modular Space Station / Capital Outpost Mesh (Matches Reference Diagrams)
  createStationMesh(nation = 'blue', level = 1) {
    const stationRoot = new THREE.Group();

    // 3D Isometric View Angle: Locked on stationRoot so camera sees depth and circular modules
    stationRoot.rotation.x = 0.22;
    stationRoot.rotation.y = 0.12;

    const stationModel = new THREE.Group();
    stationModel.name = 'stationBody';
    // Internal rotation starts pure and spins cleanly around Z without tumbling
    stationModel.rotation.set(0, 0, 0);

    // Station scale increased by +1x (from 2.2 to 3.2 per user request: "istasyonu 1x büyült")
    stationModel.scale.set(3.2, 3.2, 3.2);
    stationRoot.add(stationModel);

    // Nation-Specific Visual Styling & Color Themes
    const NATION_THEMES = {
      blue: {
        primaryHull: 0x1f2c3b,      // Titanium alloy with cold blue undertone
        secondaryHull: 0x131a24,    // Dark gunmetal structure
        nationColor: 0x00a8ff,      // Veylarian cyan/blue plating
        nationHex: '#00a8ff',
        glow: 0x00f0ff,             // Ion cyan glow
        solarCell: 0x081c3b,        // Photovoltaic deep navy blue
        solarFrame: 0x3d5a80,
        enginePlasma: 0x00f0ff,     // Cyan ion plasma
        beacon: 0x00ffff
      },
      red: {
        primaryHull: 0x2b1c23,      // Crimson-tinted dark tungsten
        secondaryHull: 0x181014,    // Dark charcoal carbon
        nationColor: 0xff2a4b,      // Kryos aggressive vermilion
        nationHex: '#ff2a4b',
        glow: 0xff2244,             // Molten ruby red glow
        solarCell: 0x1c0a13,        // Dark maroon photovoltaic
        solarFrame: 0x6b1d2e,
        enginePlasma: 0xff4500,     // Fiery fusion plasma
        beacon: 0xff3355
      },
      gold: {
        primaryHull: 0x2a241b,      // Warm brass/graphite alloy
        secondaryHull: 0x17130d,    // Dark aged bronze
        nationColor: 0xffbb00,      // Aethelon imperial gold
        nationHex: '#ffbb00',
        glow: 0xffcc00,             // Solar golden glow
        solarCell: 0x121726,        // Deep space blue with gold framing
        solarFrame: 0x8f7241,
        enginePlasma: 0xffaa00,     // Golden solar plasma
        beacon: 0xffdd44
      }
    };

    const theme = NATION_THEMES[nation] || NATION_THEMES['blue'];
    const darkBaseHex = nation === 'red' ? '#201217' : (nation === 'gold' ? '#201a11' : '#131b26');
    const hexTex = this._getStationHexTexture(theme.nationHex, darkBaseHex);

    // Materials Palette (Stylized Sci-Fi Arcade)
    const hullMat = new THREE.MeshStandardMaterial({
      color: theme.primaryHull,
      roughness: 0.38,
      metalness: 0.72,
      flatShading: true
    });

    const hullHexMat = new THREE.MeshStandardMaterial({
      color: theme.primaryHull,
      map: hexTex || null,
      roughness: 0.40,
      metalness: 0.65
    });

    const darkMetalMat = new THREE.MeshStandardMaterial({
      color: theme.secondaryHull,
      roughness: 0.45,
      metalness: 0.82,
      flatShading: true
    });

    const nationMat = new THREE.MeshStandardMaterial({
      color: theme.nationColor,
      roughness: 0.32,
      metalness: 0.78,
      flatShading: true
    });

    const glowMat = new THREE.MeshBasicMaterial({
      color: theme.glow
    });

    const engineInteriorMat = new THREE.MeshStandardMaterial({
      color: 0x0a0d12,
      roughness: 0.65,
      metalness: 0.45,
      side: THREE.DoubleSide
    });

    const plasmaMat = new THREE.MeshBasicMaterial({
      color: theme.enginePlasma
    });

    const solarCellMat = new THREE.MeshStandardMaterial({
      color: theme.solarCell,
      roughness: 0.22,
      metalness: 0.9,
      flatShading: true
    });

    const solarFrameMat = new THREE.MeshStandardMaterial({
      color: theme.solarFrame,
      roughness: 0.35,
      metalness: 0.8
    });

    // Helper: Single Solar Wing Panel
    function makeSolarWing(width, height) {
      const pGroup = new THREE.Group();
      const frame = new THREE.Mesh(new THREE.BoxGeometry(width, height, 1.2), solarFrameMat);
      pGroup.add(frame);

      const cellF = new THREE.Mesh(new THREE.BoxGeometry(width * 0.9, height * 0.88, 0.4), solarCellMat);
      cellF.position.z = 0.55;
      pGroup.add(cellF);

      const cellB = new THREE.Mesh(new THREE.BoxGeometry(width * 0.9, height * 0.88, 0.4), solarCellMat);
      cellB.position.z = -0.55;
      pGroup.add(cellB);

      const crossH = new THREE.Mesh(new THREE.BoxGeometry(width * 0.88, 0.6, 0.5), glowMat);
      crossH.position.z = 0.58;
      pGroup.add(crossH);

      return pGroup;
    }

    // Helper: 4-Blade Cruciform Solar Array
    function makeCruciformSolarArray(length = 22, panelW = 14, panelH = 9) {
      const cGroup = new THREE.Group();
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(3.5, 3.5, length, 8), darkMetalMat);
      cGroup.add(shaft);

      const angles = [0, Math.PI / 2, Math.PI, Math.PI * 1.5];
      angles.forEach((ang) => {
        const wing = makeSolarWing(panelW, panelH);
        wing.position.set(Math.cos(ang) * (panelW * 0.5 + 3.8), 0, Math.sin(ang) * (panelW * 0.5 + 3.8));
        wing.rotation.y = -ang + Math.PI / 2;
        cGroup.add(wing);
      });
      return cGroup;
    }

    // Helper: Dual-Prong Industrial Docking Clamp / Pincer
    function makeDockingPincer(scale = 1.0) {
      const pGroup = new THREE.Group();
      const bMesh = new THREE.Mesh(new THREE.CylinderGeometry(5 * scale, 6 * scale, 6 * scale, 8), darkMetalMat);
      bMesh.rotateZ(Math.PI / 2);
      pGroup.add(bMesh);

      const uProng = new THREE.Mesh(new THREE.BoxGeometry(11 * scale, 3.2 * scale, 4 * scale), nationMat);
      uProng.position.set(6 * scale, 3.8 * scale, 0);
      uProng.rotation.z = -0.15;
      pGroup.add(uProng);

      const lProng = new THREE.Mesh(new THREE.BoxGeometry(11 * scale, 3.2 * scale, 4 * scale), nationMat);
      lProng.position.set(6 * scale, -3.8 * scale, 0);
      lProng.rotation.z = 0.15;
      pGroup.add(lProng);

      const pCore = new THREE.Mesh(new THREE.CylinderGeometry(1.8 * scale, 1.8 * scale, 5 * scale, 6), glowMat);
      pCore.position.set(3.5 * scale, 0, 0);
      pGroup.add(pCore);

      return pGroup;
    }

    // =========================================================================
    // 1. CENTRAL HEAVY PROPULSION & REACTOR MODULE (MIDDLE)
    // =========================================================================
    // Main horizontal reactor cylinder
    const reactorCylinder = new THREE.Mesh(new THREE.CylinderGeometry(20, 20, 72, 24), hullHexMat);
    reactorCylinder.rotateZ(Math.PI / 2);
    stationModel.add(reactorCylinder);

    // Nation armor collar bands
    const collarBand1 = new THREE.Mesh(new THREE.CylinderGeometry(21.2, 21.2, 9, 24), nationMat);
    collarBand1.rotateZ(Math.PI / 2);
    collarBand1.position.set(-12, 0, 0);
    stationModel.add(collarBand1);

    const collarBand2 = new THREE.Mesh(new THREE.CylinderGeometry(21.2, 21.2, 9, 24), nationMat);
    collarBand2.rotateZ(Math.PI / 2);
    collarBand2.position.set(12, 0, 0);
    stationModel.add(collarBand2);

    // Front (Left) Flared Magnetic Intake Cowl
    const intakeCowl = new THREE.Mesh(new THREE.CylinderGeometry(33, 20, 30, 24, 1, false), darkMetalMat);
    intakeCowl.rotateZ(Math.PI / 2);
    intakeCowl.position.set(-51, 0, 0);
    stationModel.add(intakeCowl);

    const intakeLip = new THREE.Mesh(new THREE.TorusGeometry(33, 1.8, 8, 24), nationMat);
    intakeLip.rotateY(Math.PI / 2);
    intakeLip.position.set(-66, 0, 0);
    stationModel.add(intakeLip);

    const intakeGlowRing = new THREE.Mesh(new THREE.TorusGeometry(23, 1.8, 8, 24), glowMat);
    intakeGlowRing.rotateY(Math.PI / 2);
    intakeGlowRing.position.set(-45, 0, 0);
    stationModel.add(intakeGlowRing);

    // Center structural bridge collar
    const centerCollar = new THREE.Mesh(new THREE.BoxGeometry(25, 32, 28), darkMetalMat);
    stationModel.add(centerCollar);

    // Radiator heat-sink fins on sides (+Z and -Z)
    [-15, 15].forEach(zPos => {
      const radiator = new THREE.Mesh(new THREE.BoxGeometry(22, 14, 2.5), nationMat);
      radiator.position.set(0, 0, zPos);
      stationModel.add(radiator);
    });

    // Rear Engine Shroud & Piping
    const engineShroud = new THREE.Mesh(new THREE.CylinderGeometry(18, 20, 16, 24), darkMetalMat);
    engineShroud.rotateZ(Math.PI / 2);
    engineShroud.position.set(44, 0, 0);
    stationModel.add(engineShroud);

    // Gimbal actuator ring
    const gimbalRing = new THREE.Mesh(new THREE.TorusGeometry(19, 2.2, 8, 24), nationMat);
    gimbalRing.rotateY(Math.PI / 2);
    gimbalRing.position.set(52, 0, 0);
    stationModel.add(gimbalRing);

    // 6 External cooling conduit struts
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 17, 6), darkMetalMat);
      pipe.rotateZ(Math.PI / 2);
      pipe.position.set(44, Math.sin(angle) * 20.5, Math.cos(angle) * 20.5);
      stationModel.add(pipe);
    }

    // Giant Flared Rocket Thruster Nozzle Bell (Signature Feature)
    const nozzleBell = new THREE.Mesh(new THREE.CylinderGeometry(37, 17, 36, 28, 1, true), engineInteriorMat);
    nozzleBell.rotateZ(-Math.PI / 2);
    nozzleBell.position.set(70, 0, 0);
    stationModel.add(nozzleBell);

    const nozzleOuterBand = new THREE.Mesh(new THREE.TorusGeometry(37, 2.0, 8, 28), nationMat);
    nozzleOuterBand.rotateY(Math.PI / 2);
    nozzleOuterBand.position.set(88, 0, 0);
    stationModel.add(nozzleOuterBand);

    // Glowing Ion Core inside Nozzle
    const plasmaDisc = new THREE.Mesh(new THREE.CircleGeometry(15, 20), plasmaMat);
    plasmaDisc.rotateY(Math.PI / 2);
    plasmaDisc.position.set(53.5, 0, 0);
    stationModel.add(plasmaDisc);

    const plasmaBall = new THREE.Mesh(new THREE.SphereGeometry(9, 12, 8), glowMat);
    plasmaBall.position.set(60, 0, 0);
    stationModel.add(plasmaBall);

    // =========================================================================
    // 2. MAIN VERTICAL SPINE & MID JUNCTION
    // =========================================================================
    const spineColumn = new THREE.Mesh(new THREE.BoxGeometry(9, 128, 9), darkMetalMat);
    spineColumn.position.set(0, 8.5, 0);
    stationModel.add(spineColumn);

    // Vertical power conduit running along spine
    const spineConduit = new THREE.Mesh(new THREE.BoxGeometry(2.5, 126, 2.5), glowMat);
    spineConduit.position.set(0, 8.5, 5);
    stationModel.add(spineConduit);

    // Mid Transition Adapter
    const midAdapter = new THREE.Mesh(new THREE.CylinderGeometry(11, 15, 14, 12), darkMetalMat);
    midAdapter.position.set(0, 34, 0);
    stationModel.add(midAdapter);

    // Mid Solar Wing Array
    const midSolarCross = new THREE.Mesh(new THREE.BoxGeometry(54, 4.5, 4.5), darkMetalMat);
    midSolarCross.position.set(0, 34, 0);
    stationModel.add(midSolarCross);

    // Left & Right Dual Solar Wings
    [-27, 27].forEach(xOffset => {
      const wingPair = new THREE.Group();
      const wing1 = makeSolarWing(15, 9);
      wing1.position.y = 4.8;
      const wing2 = makeSolarWing(15, 9);
      wing2.position.y = -4.8;
      wingPair.add(wing1);
      wingPair.add(wing2);
      wingPair.position.set(xOffset, 34, 0);
      stationModel.add(wingPair);
    });

    // =========================================================================
    // 3. UPPER DECK: HABITATION / RESEARCH DRUM & SENSOR BOOM
    // =========================================================================
    // Heavy Arching Pylon Bracket
    const upperPylon = new THREE.Mesh(new THREE.BoxGeometry(11, 40, 13), darkMetalMat);
    upperPylon.position.set(-1.5, 60, 0);
    stationModel.add(upperPylon);

    const upperPylonStripe = new THREE.Mesh(new THREE.BoxGeometry(11.4, 6, 13.4), nationMat);
    upperPylonStripe.position.set(-1.5, 66, 0);
    stationModel.add(upperPylonStripe);

    // Main Habitation Drum Cylinder (Offset to Left)
    const habCylinder = new THREE.Mesh(new THREE.CylinderGeometry(17, 17, 56, 20), hullHexMat);
    habCylinder.rotateZ(Math.PI / 2);
    habCylinder.position.set(-31, 80, 0);
    stationModel.add(habCylinder);

    // Observation deck glowing window slit
    const obsDeck = new THREE.Mesh(new THREE.BoxGeometry(22, 2.2, 17.6), glowMat);
    obsDeck.position.set(-42, 80, 0);
    stationModel.add(obsDeck);

    // Front Hemispherical Dome & Airlock
    const habDome = new THREE.Mesh(new THREE.SphereGeometry(17, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), hullMat);
    habDome.rotateZ(Math.PI / 2);
    habDome.position.set(-59, 80, 0);
    stationModel.add(habDome);

    const airlockHatch = new THREE.Mesh(new THREE.BoxGeometry(2.5, 8, 8), nationMat);
    airlockHatch.position.set(-75.5, 80, 0);
    stationModel.add(airlockHatch);

    // Aft Sensor Boom (Right side of upper deck)
    const sensorBoom = new THREE.Mesh(new THREE.CylinderGeometry(5, 8, 36, 10), darkMetalMat);
    sensorBoom.rotateZ(-Math.PI / 2);
    sensorBoom.position.set(18, 80, 0);
    stationModel.add(sensorBoom);

    // Upper 4-Blade Cruciform Solar Array
    const upperCrossArray = makeCruciformSolarArray(16, 13, 8);
    upperCrossArray.rotateZ(Math.PI / 2);
    upperCrossArray.position.set(26, 80, 0);
    stationModel.add(upperCrossArray);

    // Aft Communications Endcap & Radar Dish (Rotating Group)
    const rotatingGroup = new THREE.Group();
    rotatingGroup.name = 'rotatingRing'; // Preserves engine rotation hook
    rotatingGroup.position.set(40, 80, 0); // Position group at the sensor boom tip

    const commEndcap = new THREE.Mesh(new THREE.CylinderGeometry(7, 4, 8, 12), nationMat);
    commEndcap.rotateZ(-Math.PI / 2);
    commEndcap.position.set(0, 0, 0);
    rotatingGroup.add(commEndcap);

    const radarDish = new THREE.Mesh(new THREE.CylinderGeometry(9, 2.5, 4, 16, 1, true), darkMetalMat);
    radarDish.rotateZ(-Math.PI / 2);
    radarDish.position.set(5, 0, 0);
    rotatingGroup.add(radarDish);

    const sensorSpire = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 1.8, 18, 6), glowMat);
    sensorSpire.rotateZ(-Math.PI / 2);
    sensorSpire.position.set(13, 0, 0);
    rotatingGroup.add(sensorSpire);

    stationModel.add(rotatingGroup);

    // =========================================================================
    // 4. LOWER DECK: INDUSTRIAL DOCKING GANTRY, CLAMPS & SOLAR ARRAYS
    // =========================================================================
    // Horizontal Docking Cross-Truss
    const crossTruss = new THREE.Mesh(new THREE.BoxGeometry(86, 9.5, 9.5), darkMetalMat);
    crossTruss.position.set(-11, -58, 0);
    stationModel.add(crossTruss);

    // Right-Hand Heavy Docking Clamp (Pointing Right +X)
    const rightClamp = makeDockingPincer(1.0);
    rightClamp.position.set(34, -58, 0);
    stationModel.add(rightClamp);

    // Center Vertical Mast to Bottom Tip
    const centerMast = new THREE.Mesh(new THREE.BoxGeometry(8, 36, 8), darkMetalMat);
    centerMast.position.set(0, -76, 0);
    stationModel.add(centerMast);

    // Bottom 4-Blade Cruciform Solar Array
    const bottomCrossArray = makeCruciformSolarArray(16, 13, 8);
    bottomCrossArray.position.set(0, -94, 0);
    stationModel.add(bottomCrossArray);

    // Left Docking Hub (Inverted T-Junction)
    const leftHub = new THREE.Mesh(new THREE.BoxGeometry(14, 14, 12), darkMetalMat);
    leftHub.position.set(-54, -58, 0);
    stationModel.add(leftHub);

    // Far-Left Tip 4-Blade Cruciform Solar Array
    const farLeftCrossArray = makeCruciformSolarArray(16, 13, 8);
    farLeftCrossArray.rotateZ(Math.PI / 2);
    farLeftCrossArray.position.set(-76, -58, 0);
    stationModel.add(farLeftCrossArray);

    // Left Gantry Upward Sensor Tower
    const upTower = new THREE.Mesh(new THREE.CylinderGeometry(5.5, 5.5, 24, 10), darkMetalMat);
    upTower.position.set(-54, -44, 0);
    stationModel.add(upTower);

    const upCap = new THREE.Mesh(new THREE.CylinderGeometry(8, 7, 7, 8), nationMat);
    upCap.position.set(-54, -30, 0);
    stationModel.add(upCap);

    const upSpire = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 1.2, 14, 6), glowMat);
    upSpire.position.set(-54, -20, 0);
    stationModel.add(upSpire);

    // Left Gantry Downward Docking Arm & Clamp
    const downGantry = new THREE.Mesh(new THREE.CylinderGeometry(5.5, 7, 30, 8), darkMetalMat);
    downGantry.position.set(-54, -74, 0);
    stationModel.add(downGantry);

    const downClamp = makeDockingPincer(1.0);
    downClamp.rotateZ(-Math.PI / 2);
    downClamp.position.set(-54, -90, 0);
    stationModel.add(downClamp);

    // =========================================================================
    // 5. POINT-DEFENSE TURRETS & HARDPOINTS (BASE DEFENSE)
    // =========================================================================
    function makeTurret() {
      const tGroup = new THREE.Group();
      const base = new THREE.Mesh(new THREE.CylinderGeometry(4.5, 5.5, 3.5, 8), darkMetalMat);
      tGroup.add(base);

      const sphere = new THREE.Mesh(new THREE.SphereGeometry(3.5, 8, 8), nationMat);
      sphere.position.y = 2.5;
      tGroup.add(sphere);

      [-1.4, 1.4].forEach(x => {
        const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.9, 9, 6), darkMetalMat);
        barrel.rotateX(Math.PI / 2);
        barrel.position.set(x, 2.5, 5);
        tGroup.add(barrel);

        const tip = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, 1.8, 6), glowMat);
        tip.rotateX(Math.PI / 2);
        tip.position.set(x, 2.5, 9.8);
        tGroup.add(tip);
      });
      return tGroup;
    }

    // 4 Strategic Defense Turrets
    const turret1 = makeTurret();
    turret1.position.set(0, 90, 7);
    stationModel.add(turret1);

    const turret2 = makeTurret();
    turret2.rotateX(Math.PI / 2);
    turret2.position.set(0, 16, 17);
    stationModel.add(turret2);

    const turret3 = makeTurret();
    turret3.rotateX(-Math.PI / 2);
    turret3.position.set(0, -16, -17);
    stationModel.add(turret3);

    const turret4 = makeTurret();
    turret4.position.set(-54, -58, 8);
    stationModel.add(turret4);

    // Additional Level Fortifications (Levels 2-5)
    if (level >= 2) {
      const tExtra1 = makeTurret();
      tExtra1.position.set(24, 0, 22);
      stationModel.add(tExtra1);
    }
    if (level >= 3) {
      const extraRing = new THREE.Mesh(new THREE.TorusGeometry(26, 2.5, 8, 24), nationMat);
      extraRing.rotateY(Math.PI / 2);
      extraRing.position.set(-18, 0, 0);
      stationModel.add(extraRing);
    }

    return stationRoot;
  },

  // User request: "hologram kalkan görünümünü overlay %20 olarak yapalım daha az görülsün"
  createDockShieldHologram(shipRadius = 24, nation = 'blue') {
    const nationColor = (nation === 'red') ? 0xff3b5c : (nation === 'gold' ? 0xffd044 : 0x00f0ff);
    const r = Math.max(30, shipRadius * 1.55);

    const group = new THREE.Group();

    // 1. Faceted translucent glowing dome (softened to 20% overlay)
    const sphereGeo = new THREE.IcosahedronGeometry(r, 2);
    const sphereMat = new THREE.MeshBasicMaterial({
      color: nationColor,
      transparent: true,
      opacity: 0.20,
      wireframe: false,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const sphereMesh = new THREE.Mesh(sphereGeo, sphereMat);
    group.add(sphereMesh);

    // 2. Wireframe hex lattice for holographic sci-fi structure
    const wireMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      wireframe: true,
      transparent: true,
      opacity: 0.16,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const wireMesh = new THREE.Mesh(sphereGeo, wireMat);
    group.add(wireMesh);

    // 3. Equatorial pulsing ring
    const ringGeo = new THREE.RingGeometry(r * 0.94, r * 1.08, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: nationColor,
      transparent: true,
      opacity: 0.22,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    group.add(ringMesh);

    group.pulseMat = sphereMat; // reference for opacity pulse
    group.wireMat = wireMat;
    group.ringMat = ringMat;
    return group;
  },

  // User request: "yandaki dronların ulus renklerinde olmalarına gerek yok ve tasarımlarını değişebilirsin"
  createDroneMesh(type = 'attack', nation = 'blue') {
    const root = new THREE.Group();

    if (type === 'attack') {
      // 1. ATTACK DRONE: "Spectre-IV Strike Interceptor"
      // Stealth Titanium Charcoal, Gunmetal & High-Energy Crimson Plasma Emitters
      const stealthCarbonMat = new THREE.MeshStandardMaterial({
        color: 0x161a22,
        roughness: 0.32,
        metalness: 0.75,
        flatShading: true
      });
      const gunmetalMat = new THREE.MeshStandardMaterial({
        color: 0x334155,
        roughness: 0.28,
        metalness: 0.85,
        flatShading: true
      });
      const crimsonPlasmaMat = new THREE.MeshBasicMaterial({
        color: 0xff2244
      });

      // Sharp aerodynamic wedge chassis
      const bodyGeo = new THREE.ConeGeometry(3.4, 10.5, 4);
      bodyGeo.rotateX(Math.PI / 2);
      bodyGeo.rotateZ(Math.PI / 4);
      const body = new THREE.Mesh(bodyGeo, stealthCarbonMat);
      root.add(body);

      // Angled stealth delta wings
      const wingGeo = new THREE.BoxGeometry(9.2, 0.75, 4.2);
      const wing = new THREE.Mesh(wingGeo, gunmetalMat);
      wing.position.set(0, 0, -1.2);
      root.add(wing);

      // Crimson plasma wingtip rails
      const tipL = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.2, 4.8), crimsonPlasmaMat);
      tipL.position.set(-4.6, 0.1, -1.0);
      root.add(tipL);

      const tipR = tipL.clone();
      tipR.position.x = 4.6;
      root.add(tipR);

      // Twin forward heavy railgun barrels
      const barrelL = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.62, 5.8, 6), gunmetalMat);
      barrelL.rotation.x = Math.PI / 2;
      barrelL.position.set(-2.2, 0.1, 2.8);
      root.add(barrelL);

      const muzzleL = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.16, 6, 12), crimsonPlasmaMat);
      muzzleL.position.set(-2.2, 0.1, 5.8);
      root.add(muzzleL);

      const barrelR = barrelL.clone();
      barrelR.position.x = 2.2;
      root.add(barrelR);

      const muzzleR = muzzleL.clone();
      muzzleR.position.x = 2.2;
      root.add(muzzleR);

      // Twin micro ion thrusters at rear
      const thrustL = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.5, 1.5, 6), stealthCarbonMat);
      thrustL.rotation.x = Math.PI / 2;
      thrustL.position.set(-1.4, 0, -5.2);
      root.add(thrustL);

      const glowL = new THREE.Mesh(new THREE.SphereGeometry(0.65, 6, 6), crimsonPlasmaMat);
      glowL.position.set(-1.4, 0, -5.8);
      root.add(glowL);

      const thrustR = thrustL.clone();
      thrustR.position.x = 1.4;
      root.add(thrustR);

      const glowR = glowL.clone();
      glowR.position.x = 1.4;
      root.add(glowR);

    } else if (type === 'defense') {
      // 2. DEFENSE DRONE: "Aegis-X Sentinel Core"
      // Polished Platinum Pearl, Cybernetic Chrome & Quantum Cyan Gyroscopic Gimbal Rings
      const pearlMat = new THREE.MeshStandardMaterial({
        color: 0xf1f5f9,
        roughness: 0.18,
        metalness: 0.90,
        flatShading: true
      });
      const chromeMat = new THREE.MeshStandardMaterial({
        color: 0x94a3b8,
        roughness: 0.22,
        metalness: 0.85
      });
      const cyanQuantumMat = new THREE.MeshBasicMaterial({
        color: 0x00f5ff
      });
      const shieldCoronaMat = new THREE.MeshBasicMaterial({
        color: 0x00e5ff,
        transparent: true,
        opacity: 0.35,
        wireframe: true
      });

      // Faceted platinum central guardian core
      const core = new THREE.Mesh(new THREE.IcosahedronGeometry(3.6, 0), pearlMat);
      root.add(core);

      // Pulsating internal quantum plasma orb
      const innerOrb = new THREE.Mesh(new THREE.SphereGeometry(2.3, 12, 12), cyanQuantumMat);
      root.add(innerOrb);

      // Outer wireframe holographic shield bubble
      const shieldBubble = new THREE.Mesh(new THREE.SphereGeometry(4.8, 10, 8), shieldCoronaMat);
      shieldBubble.name = 'defenseShieldBubble';
      root.add(shieldBubble);

      // Concentric gyroscopic stabilizer rings
      const outerRing = new THREE.Mesh(new THREE.TorusGeometry(6.2, 0.42, 6, 24), chromeMat);
      outerRing.name = 'defenseOuterRing';
      root.add(outerRing);

      const innerRing = new THREE.Mesh(new THREE.TorusGeometry(4.8, 0.36, 6, 20), cyanQuantumMat);
      innerRing.rotation.x = Math.PI / 3;
      innerRing.name = 'defenseInnerRing';
      root.add(innerRing);

      // 4 Orbital energy nodal pips along outer ring
      for (let i = 0; i < 4; i++) {
        const ang = (i / 4) * Math.PI * 2;
        const node = new THREE.Mesh(new THREE.SphereGeometry(0.72, 6, 6), cyanQuantumMat);
        node.position.set(Math.cos(ang) * 6.2, Math.sin(ang) * 6.2, 0);
        root.add(node);
      }

    } else {
      // 3. MINING DRONE: "Goliath Heavy Excavator"
      // Heavy Industrial Basalt Carbon, Hazard Amber-Gold & Intense Laser Bore Emitter
      const basaltMat = new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        roughness: 0.38,
        metalness: 0.65,
        flatShading: true
      });
      const industrialGoldMat = new THREE.MeshStandardMaterial({
        color: 0xf59e0b,
        roughness: 0.25,
        metalness: 0.70,
        flatShading: true
      });
      const amberGlowMat = new THREE.MeshBasicMaterial({
        color: 0xffb703
      });

      // Rugged hexagonal extractor chassis
      const chassisGeo = new THREE.CylinderGeometry(3.2, 3.7, 7.5, 6);
      chassisGeo.rotateX(Math.PI / 2);
      const chassis = new THREE.Mesh(chassisGeo, basaltMat);
      root.add(chassis);

      // Heavy conical excavator drill head
      const drillGeo = new THREE.ConeGeometry(3.0, 4.8, 6);
      drillGeo.rotateX(-Math.PI / 2);
      const drillHead = new THREE.Mesh(drillGeo, industrialGoldMat);
      drillHead.position.set(0, 0, 4.8);
      root.add(drillHead);

      // Intense focal amber drill lens at nose tip
      const tipLens = new THREE.Mesh(new THREE.SphereGeometry(1.4, 8, 8), amberGlowMat);
      tipLens.position.set(0, 0, 7.2);
      root.add(tipLens);

      // Dual articulated hydraulic cutter arms
      const armGeo = new THREE.BoxGeometry(1.1, 1.1, 6.2);
      const armL = new THREE.Mesh(armGeo, industrialGoldMat);
      armL.position.set(-3.2, 0, 3.2);
      root.add(armL);

      const clawL = new THREE.Mesh(new THREE.ConeGeometry(0.9, 2.2, 4), basaltMat);
      clawL.rotation.x = -Math.PI / 2;
      clawL.position.set(-3.2, 0, 6.8);
      root.add(clawL);

      const armR = new THREE.Mesh(armGeo, industrialGoldMat);
      armR.position.set(3.2, 0, 3.2);
      root.add(armR);

      const clawR = clawL.clone();
      clawR.position.x = 3.2;
      root.add(clawR);

      // Heavy-duty rear power pack & solar radiator fins
      const radiatorL = new THREE.Mesh(new THREE.BoxGeometry(6.2, 0.45, 3.0), basaltMat);
      radiatorL.position.set(-3.5, 0, -2.0);
      root.add(radiatorL);

      const radiatorR = radiatorL.clone();
      radiatorR.position.x = 3.5;
      root.add(radiatorR);

      const rearReactor = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 1.8, 2.2, 6), amberGlowMat);
      rearReactor.rotation.x = Math.PI / 2;
      rearReactor.position.set(0, 0, -4.4);
      root.add(rearReactor);
    }

    // User request: "dronların boyutunu 3x arttır" (1.15 -> 3.45)
    root.scale.set(3.45, 3.45, 3.45);
    return root;
  }
};

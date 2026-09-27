const https = require('https');
const fs = require('fs');

https.get('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const mod = { exports: {} };
    new Function('exports', 'module', data)(mod.exports, mod);
    global.THREE = mod.exports;

    const treeCode = fs.readFileSync('js/shipTree.js', 'utf8');
    eval(treeCode + '; global.SHIP_TREE = SHIP_TREE;');

    let modelCode = fs.readFileSync('js/models.js', 'utf8');
    // Replace creation in createShipMesh
    modelCode = modelCode.replace(
      'const shipGroup = new THREE.Group();',
      'const shipRoot = new THREE.Group(); const shipGroup = new THREE.Group(); shipGroup.name = "hullGroup"; shipGroup.rotation.x = Math.PI / 2; shipRoot.add(shipGroup);'
    );
    // Replace shieldBubble addition and return
    modelCode = modelCode.replace(
      'shipGroup.add(shieldMesh);',
      'shipRoot.add(shieldMesh);'
    );
    modelCode = modelCode.replace(
      'shipGroup.scale.set(tierScale, tierScale, tierScale);',
      'shipRoot.scale.set(tierScale, tierScale, tierScale);'
    );
    modelCode = modelCode.replace(
      'return shipGroup;',
      'return shipRoot;'
    );

    eval(modelCode + '; global.ModelBuilder = ModelBuilder;');

    const ships = [
      'fly',
      'tank-rhino', 'tank-goliath', 'tank-titan',
      'speed-dart', 'speed-phantom', 'speed-tempest',
      'bruiser-crusader', 'bruiser-marauder', 'bruiser-warlord',
      'healer-cleric', 'healer-guardian', 'healer-aegis'
    ];

    ships.forEach(key => {
      const mesh = global.ModelBuilder.createShipMesh(key, 0x00f0ff);
      const flame = mesh.getObjectByName('engineFlame');
      const shield = mesh.getObjectByName('shieldBubble');
      const hull = mesh.getObjectByName('hullGroup');
      
      mesh.updateMatrixWorld(true);
      const bbox = new THREE.Box3().setFromObject(hull);
      const size = new THREE.Vector3();
      bbox.getSize(size);

      console.log('✓', key, 'HULL (Wingspan X, Length Y, Height Z):', size.x.toFixed(1), size.y.toFixed(1), size.z.toFixed(1));
    });
  });
});

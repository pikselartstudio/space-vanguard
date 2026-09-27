const fs = require('fs');
const code = fs.readFileSync('js/models.js', 'utf8');

const shipKeys = [
  'fly',
  'tank-rhino', 'tank-goliath', 'tank-titan',
  'speed-dart', 'speed-phantom', 'speed-tempest',
  'bruiser-crusader', 'bruiser-marauder', 'bruiser-warlord',
  'healer-cleric', 'healer-guardian', 'healer-aegis'
];

shipKeys.forEach(k => {
  const needle = "case '" + k + "':";
  const idx = code.indexOf(needle);
  if (idx !== -1) {
    const snippet = code.substring(idx, idx + 400);
    const hasZ = snippet.includes('z') || snippet.includes('Z');
    console.log(k, 'found! Has Z coord:', hasZ);
  }
});

const fs = require('fs');
const path = require('path');

const configsDir = path.join(__dirname, 'configs');
const outputPath = path.join(__dirname, 'public', 'config.json');
const scssOutputPath = path.join(__dirname, 'src', 'distro-config.scss');

console.log(`🔧 Building universal multi-distribution config`);

// Load common config
const commonConfigPath = path.join(configsDir, 'common.json');
let commonConfig = {};
if (fs.existsSync(commonConfigPath)) {
  commonConfig = JSON.parse(fs.readFileSync(commonConfigPath, 'utf8'));
  console.log(`✅ Loaded common config`);
}

// Load all distribution configs (excluding common.json)
const configFiles = fs.readdirSync(configsDir)
  .filter(f => f.endsWith('.json') && f !== 'common.json');
const distroConfigs = {};

console.log(`📦 Found ${configFiles.length} distribution configs: ${configFiles.join(', ')}`);

for (const file of configFiles) {
  const configPath = path.join(configsDir, file);
  const distroName = path.basename(file, '.json');
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  distroConfigs[distroName] = config;
  console.log(`  ✅ Loaded ${distroName}: ${config.branding?.name || distroName}`);
}

// Combine common and distro configs
const unifiedConfig = {
  common: commonConfig,
  distributions: distroConfigs
};

// Write unified config
fs.writeFileSync(outputPath, JSON.stringify(unifiedConfig, null, 2));
console.log(`✅ Unified config written to: ${outputPath}`);

// Generate base SCSS (will be overridden dynamically per distribution)
const scssContent = `// Auto-generated base configuration
// Styling will be applied dynamically based on active distribution
#archnavbar #logo {
  background-size: contain !important;
  background-position: left center !important;
}

#archnavbar {
  background-color: #333 !important;
  border-bottom-color: #08c !important;
}
`;

fs.writeFileSync(scssOutputPath, scssContent);
console.log(`✅ Base SCSS config written`);

console.log(`🚀 Universal build configuration complete with ${Object.keys(distroConfigs).length} distributions!`);
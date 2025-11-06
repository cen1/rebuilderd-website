import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const configsDir = path.join(__dirname, 'configs');
const outputPath = path.join(__dirname, 'public', 'config.json');

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

console.log(`🚀 Universal build configuration complete with ${Object.keys(distroConfigs).length} distributions!`);
const fs = require('fs');
const path = require('path');

const distro = process.env.DISTRO || 'arch';
const configPath = path.join(__dirname, 'configs', `${distro}.json`);
const outputPath = path.join(__dirname, 'public', 'config.json');
const navbarOutputPath = path.join(__dirname, 'public', 'navbar-config.json');
const htmlTemplatePath = path.join(__dirname, 'public', 'index.html.template');
const htmlOutputPath = path.join(__dirname, 'public', 'index.html');
const scssOutputPath = path.join(__dirname, 'src', 'distro-config.scss');

console.log(`🔧 Building for distro: ${distro}`);

// Check if config exists
if (!fs.existsSync(configPath)) {
  console.error(`❌ Config file not found: ${configPath}`);
  console.error(`Available configs: ${fs.readdirSync(path.join(__dirname, 'configs')).join(', ')}`);
  process.exit(1);
}

// Load the config
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

// Write the full config
fs.writeFileSync(outputPath, JSON.stringify(config, null, 2));
console.log(`✅ Config written to: ${outputPath}`);

// Write navbar-specific config for backwards compatibility
fs.writeFileSync(navbarOutputPath, JSON.stringify(config.navbar, null, 2));
console.log(`✅ Navbar config written to: ${navbarOutputPath}`);

// Generate HTML from template with distro-specific branding
let html = fs.readFileSync(htmlTemplatePath, 'utf8');
html = html.replace(/\{\{TITLE\}\}/g, config.branding.title);
html = html.replace(/\{\{FAVICON\}\}/g, config.branding.favicon);
html = html.replace(/\{\{BRANDING_NAME\}\}/g, config.branding.name);

fs.writeFileSync(htmlOutputPath, html);
console.log(`✅ HTML generated from template with ${config.branding.name} branding`);

// Generate distro-specific SCSS using config styling
const styling = config.styling || {};
const logoAsset = styling.logo || 'archlogo.8a05bc7f6cd1.svg';
const colors = styling.colors || {};
const borderColor = colors.navbarBorder || '#08c';
const backgroundColor = colors.navbarBackground || '#333';

const scssContent = `// Auto-generated distro configuration for ${config.branding.name}
#archnavbar #logo {
  background-image: url("${logoAsset}") !important;
  background-size: contain !important;
  background-position: left center !important;
}

#archnavbar {
  background-color: ${backgroundColor} !important;
  border-bottom-color: ${borderColor} !important;
}
`;

fs.writeFileSync(scssOutputPath, scssContent);
console.log(`✅ SCSS config written with ${logoAsset} logo`);

console.log(`🚀 Build configuration complete for ${config.branding.name}!`);
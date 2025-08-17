# Rebuilderd Status Website

This is a fork of [rebuilderd-website](https://gitlab.archlinux.org/archlinux/rebuilderd-website) but made more generic, so it can be used for any distro. Debian configuration is added with instructions for generic branding.

A simple status display with the number of reproducible packages. Uses rebuilderd's API to fetch the current status of reproducibility.

## Dependencies

* node 20
* yarn

## Development

Copy `.env.example` to `.env` and point it to your rebuilderd instance.

```
yarn install
npm run build:debian
npm run dev:debian
```

Open http://localhost:3000

Calls to `/api` path are proxied to rebuilderd backend to avoid CORS issues.

## Adding a New Distribution

This repository is designed to be generic and support any distribution. Here's how to add support for a new distribution:

### Step 1: Create Distribution Configuration

Create a new JSON configuration file in the `configs/` directory:

```bash
# Example: configs/mydistro.json
```

```json
{
  "distro": "mydistro",
  "branding": {
    "name": "MyDistro",
    "title": "MyDistro Reproducible Status",
    "favicon": "assets/mydistro/favicon.ico",
    "poweredBy": "assets/mydistro/powered_by_mydistro.png"
  },
  "styling": {
    "logo": "assets/mydistro/mydistro_logo.svg",
    "colors": {
      "navbarBorder": "#3c6eb4",
      "navbarBackground": "#333"
    }
  },
  "content": {
    "welcomeText": {
      "paragraph1": "Welcome to the MyDistro <a href=\"https://github.com/kpcyrd/rebuilderd\">rebuilderd</a> instance...",
      "paragraph2": "For more information..."
    },
    "packageUrlTemplate": "https://packages.example.com/pkgs/{suite}/{architecture}/{name}"
  },
  "navbar": {
    "logo": {
      "text": "MyDistro",
      "url": "https://example.com",
      "title": "Return to the main page"
    },
    "menuItems": [
      {
        "id": "mydistro-home",
        "text": "Home",
        "url": "https://example.com",
        "title": "MyDistro homepage"
      }
    ]
  }
}
```

### Step 2: Add Distribution Assets

Create an asset directory and add your distribution's assets:

```bash
mkdir -p public/assets/mydistro/
```

Add your assets:
- **Logo**: Main logo for the navbar (SVG/PNG)
- **Favicon**: Site icon (ICO/PNG)
- **Powered by logo**: Optional footer logo (PNG)

```bash
# Example files:
public/assets/mydistro/mydistro_logo.svg
public/assets/mydistro/favicon.ico
public/assets/mydistro/powered_by_mydistro.png
```

### Step 3: Add NPM Scripts

Add distribution-specific scripts to `package.json`:

```json
{
  "scripts": {
    "dev:mydistro": "DISTRO=mydistro npm run dev",
    "build:mydistro": "DISTRO=mydistro npm run build",
    "build:prod:mydistro": "DISTRO=mydistro npm run build:prod"
  }
}
```

### Step 4: Configure Package URL Template

The `packageUrlTemplate` in your config supports these placeholders:
- `{name}` - Package name
- `{suite}` - Repository/suite name
- `{architecture}` - Package architecture

Examples:
- Debian: `"https://packages.debian.org/search?keywords={name}"`
- Arch: `"https://archlinux.org/packages/{suite}/{architecture}/{name}"`

### Step 5: Test Your Configuration

```bash
# Development server
npm run build:mydistro
npm run dev:debian
```
## Deployment

Deploy using Docker with nginx base. The Dockerfile supports build-time configuration for different distributions.

### Docker Build

Build the container with your desired distribution:

```bash
# Build for Debian
docker build --build-arg DISTRO=debian --build-arg REBUILDERD_URL=https://rebuilderd.example.com --build-arg REBUILDERD_AUTH_TOKEN=your-token -t rebuilderd-website:debian .
```

### Build Arguments

- `DISTRO`: Distribution name (matches config file in `configs/`)
- `REBUILDERD_URL`: URL of your rebuilderd instance
- `REBUILDERD_AUTH_TOKEN`: Optional authentication token for API access

The Dockerfile will automatically build the static files for your chosen distribution and serve them via nginx.

### Run with compose

A `docker-compose.yml` is provided in the repo.
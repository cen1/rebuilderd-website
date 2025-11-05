# Rebuilderd Status Website

This is a fork of [rebuilderd-website](https://gitlab.archlinux.org/archlinux/rebuilderd-website) redesigned to support **multiple distributions simultaneously** in a single deployment.

A universal status dashboard that displays reproducibility stats for all distributions configured in your rebuilderd instance using the v1 API.

## Features

- **Multi-distribution support**: Display multiple distributions side-by-side
- **Auto-discovery**: Automatically detects available distributions from rebuilderd API
- **Single build**: One universal build serves all distributions
- **Configurable**: Easy to add new distributions via JSON configs

## Dependencies

* node 20
* yarn

## Development

Copy `.env.example` to `.env` and point it to your rebuilderd instance.

```bash
yarn install
yarn run build
yarn run dev
```

Open http://localhost:3000

Calls to `/api` path are proxied to rebuilderd backend to avoid CORS issues.

## Configuration

The website uses two types of configuration files:

### Common Configuration (`configs/common.json`)

Shared content displayed once on the page:

```json
{
  "title": "Rebuilderd Reproducible Status",
  "content": {
    "welcomeText": {
      "paragraph1": "Welcome message...",
      "paragraph2": "Additional info..."
    }
  },
  "footer": {
    "text": "Footer HTML content"
  }
}
```

### Distribution-Specific Configurations

Create a JSON file in `configs/` for each distribution (e.g., `configs/mydistro.json`):

```json
{
  "distro": "mydistro",
  "branding": {
    "name": "MyDistro",
    "title": "MyDistro Reproducible Status"
  },
  "styling": {
    "logo": "assets/mydistro/logo.svg",
    "colors": {
      "navbarBorder": "#3c6eb4",
      "navbarBackground": "#333"
    }
  },
  "content": {
    "packageUrlTemplate": "https://packages.example.com/search?keywords={name}",
    "welcomeText": {
      "paragraph1": "Optional distro-specific welcome text"
    }
  },
  "navbar": {
    "logo": {
      "text": "MyDistro",
      "url": "https://example.com"
    },
    "menuItems": [
      {
        "id": "home",
        "text": "Home",
        "url": "https://example.com",
        "title": "Homepage"
      }
    ]
  }
}
```

### Adding Assets

Add distribution-specific assets to `public/assets/`:

```bash
mkdir -p public/assets/mydistro/
# Add: logo.svg, favicon.ico, etc.
```

### Rebuild

After adding a new distribution config:

```bash
yarn run build
yarn run dev
```

The new distribution will automatically appear on the page!
## Deployment

Deploy using Docker with nginx base. The container serves a universal build that displays all configured distributions.

### Docker Build

Build the container:

```bash
docker build \
  --build-arg REBUILDERD_URL=https://rebuilderd.example.com \
  --build-arg REBUILDERD_AUTH_TOKEN=your-token \
  -t rebuilderd-website:latest .
```

### Build Arguments

- `REBUILDERD_URL`: URL of your rebuilderd instance
- `REBUILDERD_AUTH_TOKEN`: Optional authentication token for API access

The Dockerfile will build the static files and serve them via nginx. All distributions configured in `configs/` will be displayed automatically.

### Docker Compose

A `docker-compose.yml` is provided in the repo.

### Runtime Behavior

The website will:
1. Auto-discover distributions from the rebuilderd API (`/api/v1/meta/distributions`)
2. Load corresponding configs from `configs/*.json`
3. Display each distribution's dashboard in a card layout
4. Fetch and update stats independently for each distribution
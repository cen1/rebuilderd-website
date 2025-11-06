# Rebuilderd Status Website

This is a fork of [rebuilderd-website](https://gitlab.archlinux.org/archlinux/rebuilderd-website) redesigned to support **multiple distributions** in a single deployment.

A universal status dashboard that displays reproducibility stats for all distributions configured in your rebuilderd instance using the v1 API.

## Features

- **Multi-distribution support**: Display multiple distributions side-by-side.
- **Auto-discovery**: Automatically detects available distributions from rebuilderd API.
- **Single build**: One universal build serves all distributions.
- **Configurable**: Easy to add new distributions via JSON configs.

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

Create a JSON file in `configs/` for each distribution (e.g., `configs/mydistro.json`). You can use `archlinux.json` or `debian.json` as a template.

### Adding Assets

Add distribution-specific assets to `public/assets/`:

```bash
mkdir -p public/assets/mydistro/
# Add: logo.svg, favicon.ico, etc.
```

## Deployment

Deploy using Docker with nginx base.

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
# Rebuilderd Status Website

This is a fork of [https://gitlab.archlinux.org/archlinux/rebuilderd-website](rebuilderd-website) but made more generic, so it can be used for any distro. Debian configuration is added.

A simple status display with the number of reproducible packages. Uses rebuilderd's API to fetch the current status of reproducibility.

## Dependencies

* node 20
* yarn (for building/development)

## Development

Copy `.env.example` to `.env` and point it to your rebuilderd instance.

```
yarn install
npm start
```

Open http://localhost:3000

Calls to `/api` path are proxied to rebuilderd backend to avoid CORS issues.

## Deployment

Static build in an nginx Docker container is used.
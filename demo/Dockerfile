FROM debian:unstable

ENV DEBIAN_FRONTEND=noninteractive

# Install Rust toolchain and build repro-threshold
RUN apt-get update -qq \
 && apt-get install -y -qq --no-install-recommends \
        cargo rustc libssl-dev pkg-config git ca-certificates curl jq \
 && rm -rf /var/lib/apt/lists/*

RUN cargo install --git https://github.com/kpcyrd/repro-threshold repro-threshold \
        >/dev/null 2>&1

# Register as apt transport method
RUN ln -s /root/.cargo/bin/repro-threshold /usr/lib/apt/methods/reproduced+http \
 && ln -s /root/.cargo/bin/repro-threshold /usr/lib/apt/methods/reproduced+https

# Configure: threshold 2/2, rebuilders xpam.pl + reproduce.debian.net
# Signing keys are fetched live from each rebuilder's /api/v1/meta/public-keys
RUN ARCH=$(dpkg --print-architecture) \
 && XPAM_KEY=$(curl -sf https://rebuilderd.xpam.pl:2096/api/v1/meta/public-keys | jq -r '.current[0]' | tr -d '\r') \
 && REPRO_KEY=$(curl -sf https://reproduce.debian.net/$ARCH/api/v1/meta/public-keys | jq -r '.current[0]' | tr -d '\r') \
 && cat > /etc/repro-threshold.conf <<EOF
[rules]
required_threshold = 2

[[trusted_rebuilder]]
name = "xpam.pl"
url = "https://rebuilderd.xpam.pl:2096"
distributions = ["debian"]
signing_keyring = """
${XPAM_KEY}
"""

[[trusted_rebuilder]]
name = "reproduce.debian.net"
url = "https://reproduce.debian.net/${ARCH}"
distributions = ["debian"]
signing_keyring = """
${REPRO_KEY}
"""
EOF

# Switch apt sources to reproduced+https transport
RUN ARCH=$(dpkg --print-architecture) \
 && rm -f /etc/apt/sources.list /etc/apt/sources.list.d/* \
 && cat > /etc/apt/sources.list.d/debian-reproduced.sources <<EOF
Types: deb
URIs: reproduced+https://deb.debian.org/debian
Suites: unstable
Components: main
Architectures: ${ARCH}
Signed-By: /usr/share/keyrings/debian-archive-keyring.gpg
EOF

RUN apt-get update -qq 2>/dev/null

# Demo - run with: docker run --rm repro-threshold-demo
RUN cat > /demo.sh <<'EOF'
#!/bin/bash
echo ''
echo 'repro-threshold demo  |  threshold: 2/2'
echo 'rebuilders: rebuilderd.xpam.pl  +  reproduce.debian.net'
echo ''
echo '[1/2] apt-get install openjdk-8-jre-headless  (not reproducible - expect: BLOCKED)'
echo '--------------------------------------------------------------'
apt-get install -y openjdk-8-jre-headless \
  && echo 'UNEXPECTED: installed (should have been blocked)' \
  || echo 'BLOCKED  (0/2 rebuilders confirmed)'
echo ''
sleep 5
echo '[2/2] apt-get install bsdiff  (reproducible - expect: SUCCESS)'
echo '--------------------------------------------------------------'
apt-get install -y bsdiff \
  && echo '--------------------------------------------------------------' \
  && echo 'bsdiff: OK  (2/2 rebuilders confirmed)'
echo '--------------------------------------------------------------'
echo ''
EOF
RUN chmod +x /demo.sh
CMD ["/demo.sh"]

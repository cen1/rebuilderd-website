'use strict';

const React = require('react');
import ConfigurableNavbar from './navbar';


const { Body } = require('./Body');

class App extends React.Component {
  constructor(props) {
    super(props);

    // Check for query parameters to show packages
    const params = new URLSearchParams(window.location.search);
    // Release can be empty for rolling distributions
    const showPackages = params.has('distro') && (params.has('release') || params.get('release') === '');

    this.state = {
      fetchFailed: false,
      commonConfig: null, // Common config shared across all distros
      distroConfigs: null, // All distribution configs {debian: {...}, arch: {...}}
      distroReleases: [], // Array of {distro, release} combinations
      dashboards: {}, // Dashboard data keyed by "distro-release"
      releaseMetadata: {}, // Metadata (components, archs) keyed by "distro-release"
      showPackages: showPackages,
      selectedDistro: params.get('distro'),
      selectedRelease: params.get('release'),
      suites: [],
      loadingPackages: false
    };
  }

  render() {
    const { commonConfig, distroConfigs, distroReleases, dashboards, releaseMetadata, showPackages, selectedDistro, selectedRelease, suites, fetchFailed, loadingPackages } = this.state;

    // If showing packages, render packages view
    if (showPackages) {
      const config = distroConfigs?.[selectedDistro];
      return (
        <React.Fragment>
          <ConfigurableNavbar
            title={config?.branding?.name || selectedDistro}
            showMenu={true}
            config={config}
          />

          <section className="hero is-primary">
            <div className="hero-body">
              <div className="container">
                <h1 className="title">
                  {config?.branding?.name || selectedDistro} - {selectedRelease.toUpperCase()} Packages
                </h1>
                <p>
                  <a href="/">← Back to dashboard</a>
                </p>
              </div>
            </div>
          </section>

          <Body fetchFailed={fetchFailed} suites={suites} config={config} distro={selectedDistro} release={selectedRelease} />

          <footer className="footer">
            <div className="content has-text-centered">
              <p>Source on <a href="https://github.com/cen1/rebuilderd-website">GitHub</a>. License is <a href="http://opensource.org/licenses/mit-license.php">MIT</a>.</p>
            </div>
          </footer>
        </React.Fragment>
      );
    }

    // Otherwise render dashboard
    return (
      <React.Fragment>
        {/* Main navbar at top - generic title only, no menu items */}
        <ConfigurableNavbar title={commonConfig?.title || 'Rebuilderd'} showMenu={false} />

        <section className="hero is-primary">
          <div className="hero-body">
            <div className="container">
              <h1 className="title">{commonConfig?.title || 'Rebuilderd Reproducible Status'}</h1>

              {/* Common welcome text */}
              {commonConfig?.content?.welcomeText && (
                <div className="content">
                  <p dangerouslySetInnerHTML={{ __html: commonConfig.content.welcomeText.paragraph1 }} />
                  <p dangerouslySetInnerHTML={{ __html: commonConfig.content.welcomeText.paragraph2 }} />
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="section">
          <div className="container">

            <div className="columns is-multiline">
              {distroReleases && distroReleases.length > 0 ? distroReleases.map(({ distro, release }) => {
                const key = `${distro}-${release}`;
                const config = distroConfigs ? distroConfigs[distro] : null;
                const dashboard = dashboards[key];
                const metadata = releaseMetadata[key];

                return (
                  <div key={key} className="column is-one-third">
                    <div className="box distro-card" style={{
                      border: `4px solid ${config?.styling?.colors?.navbarBorder || '#3273dc'}`,
                      borderRadius: '12px',
                      backgroundColor: config?.styling?.colors?.cardBackground || '#fff',
                      padding: 0,
                      overflow: 'hidden'
                    }}>
                      {/* Distro-specific menu items - styled like navbar - MOVED TO TOP */}
                      {config?.navbar?.menuItems && config.navbar.menuItems.length > 0 && (
                        <nav className="distro-nav" style={{
                          backgroundColor: config?.styling?.colors?.navbarBackground || '#333',
                          borderBottom: `3px solid ${config?.styling?.colors?.navbarBorder || '#3273dc'}`,
                          padding: '0.5rem'
                        }}>
                          <ul style={{
                            listStyle: 'none',
                            margin: 0,
                            padding: 0,
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: '0.5rem',
                            justifyContent: 'center'
                          }}>
                            {config.navbar.menuItems.map(item => (
                              <li key={item.id}>
                                <a
                                  href={item.url}
                                  title={item.title}
                                  style={{
                                    color: '#fff',
                                    textDecoration: 'none',
                                    padding: '0.25rem 0.75rem',
                                    display: 'block',
                                    fontSize: '0.875rem',
                                    transition: 'opacity 0.2s'
                                  }}
                                  onMouseOver={(e) => e.target.style.opacity = '0.7'}
                                  onMouseOut={(e) => e.target.style.opacity = '1'}
                                >
                                  {item.text}
                                </a>
                              </li>
                            ))}
                          </ul>
                        </nav>
                      )}

                      {/* Logo */}
                      <div style={{ padding: '1.5rem 1.5rem 1rem' }}>
                        {config?.styling?.logo && (
                          <div className="distro-logo" style={{
                            backgroundImage: `url("${config.styling.logo}")`,
                            backgroundSize: 'contain',
                            backgroundRepeat: 'no-repeat',
                            backgroundPosition: 'center',
                            width: '120px',
                            height: '60px',
                            margin: '0 auto'
                          }}></div>
                        )}
                      </div>

                      {/* Release info and percentage row with background */}
                      {dashboard && dashboard.rebuilds && (
                        <div style={{
                          backgroundColor: config?.styling?.colors?.navbarBackground || '#333',
                          color: 'white',
                          padding: '1rem 1.5rem',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          margin: '0 0 1rem 0',
                          gap: '1rem',
                          ...(config?.styling?.backgroundImage && {
                            backgroundImage: `url("${config.styling.backgroundImage}")`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            backgroundRepeat: 'no-repeat'
                          })
                        }}>
                          {/* Left side: Release, Components, Architectures */}
                          <div style={{ textAlign: 'left', fontSize: '0.9rem', flex: '1' }}>
                            <div>Release: <span style={{ fontWeight: 'bold' }}>{release ? release : 'rolling'}</span></div>
                            {metadata && metadata.components && metadata.components.length > 0 && (
                              <div>Components: <span style={{ fontWeight: 'bold' }}>{metadata.components.join(', ')}</span></div>
                            )}
                            {metadata && metadata.architectures && metadata.architectures.length > 0 && (
                              <div>Architectures: <span style={{ fontWeight: 'bold' }}>{metadata.architectures.join(', ')}</span></div>
                            )}
                            <div style={{ marginTop: '0.5rem' }}>
                              <a
                                href={`?distro=${distro}&release=${release}`}
                                style={{
                                  color: 'white',
                                  textDecoration: 'underline',
                                  fontSize: '0.85rem'
                                }}
                              >
                                View all rebuilt packages →
                              </a>
                            </div>
                          </div>

                          {/* Right side: Percentage */}
                          <div style={{ textAlign: 'right', fontSize: '2rem', fontWeight: 'bold', flex: '0 0 auto' }}>
                            {((dashboard.rebuilds.good / (dashboard.rebuilds.good + dashboard.rebuilds.bad + dashboard.rebuilds.fail + dashboard.rebuilds.unknown)) * 100).toFixed(1)}%
                            <div style={{ fontSize: '0.75rem', fontWeight: 'normal', marginTop: '0.25rem' }}>reproducible</div>
                          </div>
                        </div>
                      )}

                      {/* Dashboard stats */}
                      {dashboard && dashboard.rebuilds ? (
                        <div style={{ padding: '0 1.5rem 1.5rem' }}>
                          <div className="columns is-mobile is-multiline" style={{ textAlign: 'center' }}>
                            <div className="column is-half">
                              <a href={`?distro=${distro}&release=${release}&status=GOOD&letter=A`} style={{ textDecoration: 'none' }}>
                                <div className="box" style={{ backgroundColor: '#23d160', color: 'white', cursor: 'pointer', transition: 'opacity 0.2s' }}
                                     onMouseOver={(e) => e.currentTarget.style.opacity = '0.8'}
                                     onMouseOut={(e) => e.currentTarget.style.opacity = '1'}>
                                  <p className="heading" style={{ color: 'white' }}>Good</p>
                                  <p className="title is-5" style={{ color: 'white' }}>{dashboard.rebuilds.good}</p>
                                </div>
                              </a>
                            </div>
                            <div className="column is-half">
                              <a href={`?distro=${distro}&release=${release}&status=BAD&letter=A`} style={{ textDecoration: 'none' }}>
                                <div className="box" style={{ backgroundColor: '#ff3860', color: 'white', cursor: 'pointer', transition: 'opacity 0.2s' }}
                                     onMouseOver={(e) => e.currentTarget.style.opacity = '0.8'}
                                     onMouseOut={(e) => e.currentTarget.style.opacity = '1'}>
                                  <p className="heading" style={{ color: 'white' }}>Bad</p>
                                  <p className="title is-5" style={{ color: 'white' }}>{dashboard.rebuilds.bad}</p>
                                </div>
                              </a>
                            </div>
                            <div className="column is-half">
                              <a href={`?distro=${distro}&release=${release}&status=FAIL&letter=A`} style={{ textDecoration: 'none' }}>
                                <div className="box" style={{ backgroundColor: '#ffdd57', color: '#363636', cursor: 'pointer', transition: 'opacity 0.2s' }}
                                     onMouseOver={(e) => e.currentTarget.style.opacity = '0.8'}
                                     onMouseOut={(e) => e.currentTarget.style.opacity = '1'}>
                                  <p className="heading" style={{ color: '#363636' }}>Fail</p>
                                  <p className="title is-5" style={{ color: '#363636' }}>{dashboard.rebuilds.fail}</p>
                                </div>
                              </a>
                            </div>
                            <div className="column is-half">
                              <a href={`?distro=${distro}&release=${release}&status=UNKWN&letter=A`} style={{ textDecoration: 'none' }}>
                                <div className="box" style={{ backgroundColor: '#7a7a7a', color: 'white', cursor: 'pointer', transition: 'opacity 0.2s' }}
                                     onMouseOver={(e) => e.currentTarget.style.opacity = '0.8'}
                                     onMouseOut={(e) => e.currentTarget.style.opacity = '1'}>
                                  <p className="heading" style={{ color: 'white' }}>Unknown</p>
                                  <p className="title is-5" style={{ color: 'white' }}>{dashboard.rebuilds.unknown}</p>
                                </div>
                              </a>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <p className="has-text-centered">Loading dashboard...</p>
                      )}
                    </div>
                  </div>
                );
              }) : (
                <div className="column">
                  <p className="has-text-centered">Loading distributions and releases...</p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Common footer */}
        <footer className="footer">
          <div className="content has-text-centered">
            <p>Source on <a href="https://github.com/cen1/rebuilderd-website">GitHub</a>. License is <a href="http://opensource.org/licenses/mit-license.php">MIT</a>.</p>

            {/* Powered by logos from all distros */}
            {distroConfigs && Object.values(distroConfigs).some(config => config?.branding?.poweredBy) && (
              <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1.5rem', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}>
                {Object.values(distroConfigs).map((config, index) =>
                  config?.branding?.poweredBy ? (
                    <img
                      key={index}
                      src={config.branding.poweredBy}
                      alt={`Powered by ${config.branding?.name || 'distribution'}`}
                      style={{ maxHeight: '80px', maxWidth: '200px' }}
                    />
                  ) : null
                )}
              </div>
            )}
          </div>
        </footer>
      </React.Fragment>
    );
  }


  loadDistributions() {
    // Load available distributions from API
    fetch('/api/v1/meta/distributions')
      .then((response) => {
        if (!response.ok) {
          throw new Error(response.statusText);
        }
        return response.json();
      })
      .then((distributions) => {

        // For each distribution, get its releases
        const releasePromises = distributions.map(distro =>
          fetch(`/api/v1/meta/distributions/${encodeURIComponent(distro)}/releases`)
            .then(res => {
              if (!res.ok) {
                console.error(`Failed to load releases for ${distro}:`, res.status);
                return [];
              }
              return res.json();
            })
            .then(releases => {
              // Handle null releases (e.g., rolling release distros like Arch Linux)
              return releases
                .filter(release => release !== undefined)
                .map(release => ({
                  distro,
                  release: release === null ? '' : release
                }));
            })
            .catch((error) => {
              console.error(`Error loading releases for ${distro}:`, error);
              return [];
            })
        );

        Promise.all(releasePromises).then(results => {
          const distroReleases = results.flat();

          this.setState({ distroReleases }, () => {
            // Load dashboard and metadata for each distro-release combination
            distroReleases.forEach(({ distro, release }) => {
              this.loadDashboardForRelease(distro, release);
              this.loadMetadataForRelease(distro, release);
            });
          });
        });
      })
      .catch((error) => {
        console.error('Failed to load distributions:', error);
        this.setState({fetchFailed: true});
      });
  }

  async loadMetadataForRelease(distribution, release) {
    const key = `${distribution}-${release}`;

    try {
      let componentsUrl, architecturesUrl;

      if (release) {
        // Distribution with releases (e.g., Debian)
        componentsUrl = `/api/v1/meta/distributions/${encodeURIComponent(distribution)}/${encodeURIComponent(release)}/components`;
        architecturesUrl = `/api/v1/meta/distributions/${encodeURIComponent(distribution)}/${encodeURIComponent(release)}/architectures`;
      } else {
        // Rolling distribution without releases (e.g., Arch Linux)
        componentsUrl = `/api/v1/meta/distributions/${encodeURIComponent(distribution)}/components`;
        architecturesUrl = `/api/v1/meta/distributions/${encodeURIComponent(distribution)}/architectures`;
      }

      const [componentsRes, architecturesRes] = await Promise.all([
        fetch(componentsUrl),
        fetch(architecturesUrl)
      ]);

      const components = componentsRes.ok ? await componentsRes.json() : [];
      const architectures = architecturesRes.ok ? await architecturesRes.json() : [];

      // Wrap setState in a Promise to wait for it to finish
      await new Promise((resolve) => {
        this.setState((prevState) => ({
          releaseMetadata: {
            ...prevState.releaseMetadata,
            [key]: {
              components: components,
              architectures: architectures
            }
          }
        }), resolve);  // Resolve the promise once setState is done
      });
    } catch (error) {
      console.error(`Failed to load metadata for ${distribution}/${release}:`, error);
    }
  }

  loadDashboardForRelease(distribution, release) {
    const key = `${distribution}-${release}`;
    const url = `/api/v1/dashboard?distribution=${encodeURIComponent(distribution)}&release=${encodeURIComponent(release)}`;

    fetch(url)
      .then((response) => {
        if (!response.ok) {
          throw new Error(response.statusText);
        }
        return response.json();
      })
      .then((data) => {
        this.setState((prevState) => ({
          dashboards: {
            ...prevState.dashboards,
            [key]: data
          }
        }));
      })
      .catch((error) => {
        console.error(`Failed to load dashboard for ${distribution}/${release}:`, error);
      });
  }

  loadConfigs() {
    // Load unified config (common + distribution-specific)
    fetch('/config.json')
      .then(response => response.json())
      .then(data => {
        this.setState({
          commonConfig: data.common || {},
          distroConfigs: data.distributions || {}
        });
      })
      .catch(error => {
        console.error('Failed to load configs:', error);
      });
  }

  loadPkgs() {
    const { selectedDistro, selectedRelease } = this.state;

    // Get the architectures and components for this release from metadata
    const key = `${selectedDistro}-${selectedRelease}`;
    const metadata = this.state.releaseMetadata[key];

    // Create empty suite structures for each component-architecture combination
    // Packages will be loaded on-demand by the Section component when filters are applied
    const suites = [];
    metadata.components.forEach(component => {
      metadata.architectures.forEach(arch => {
        suites.push({
          name: component,
          architecture: arch,
          key: `${component}-${arch}`,
          pkgs: []
        });
      });
    });

    this.setState({ suites, loadingPackages: false });
  }

  async componentDidMount() {
    this.loadConfigs();
    if (this.state.showPackages) {
      const { selectedDistro, selectedRelease } = this.state;
      // Load metadata first, then packages
      await this.loadMetadataForRelease(selectedDistro, selectedRelease);
      this.loadPkgs();
    } else {
      this.loadDistributions();
    }
  }
}

module.exports = {App};

// vim: ts=2 sw=2 et:

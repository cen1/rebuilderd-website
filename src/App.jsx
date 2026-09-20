import React from 'react';
import ConfigurableNavbar from './navbar';
import { Body } from './Body';
import { StatsCharts } from './StatsCharts';

function formatDuration(startedAt) {
  if (!startedAt) return '-';
  const utc = startedAt.endsWith('Z') ? startedAt : startedAt + 'Z';
  const s = Math.floor((Date.now() - new Date(utc).getTime()) / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m${s % 60}s`;
  return `${Math.floor(m / 60)}h${m % 60}m`;
}

class App extends React.Component {
  constructor(props) {
    super(props);

    // Check for query parameters to show packages
    const params = new URLSearchParams(window.location.search);
    // Release can be empty for rolling distributions
    const showPackages = params.has('distro') && (params.has('release') || params.get('release') === '') && params.has('arch');

    this.state = {
      fetchFailed: false,
      commonConfig: null, // Common config shared across all distros
      distroConfigs: null, // All distribution configs {debian: {...}, arch: {...}}
      distroReleases: [], // Array of {distro, release} combinations
      dashboards: {}, // Dashboard data keyed by "distro-release"
      archDashboards: {}, // Per-architecture dashboard data keyed by "distro-release-arch"
      archQueues: {}, // Queue data keyed by "distro-release-arch"
      upstreamDashboards: {}, // Upstream dashboard data keyed by "distro-release"
      releaseMetadata: {}, // Metadata (components, archs) keyed by "distro-release"
      workerJobs: {}, // Aggregated job stats per architecture keyed by arch name
      showPackages: showPackages,
      selectedDistro: params.get('distro'),
      selectedRelease: params.get('release'),
      selectedArch: params.get('arch'),
      suites: [],
      loadingPackages: false
    };
  }

  render() {
    const { commonConfig, distroConfigs, distroReleases, dashboards, archDashboards, archQueues, upstreamDashboards, releaseMetadata, workerJobs, showPackages, selectedDistro, selectedRelease, selectedArch, suites, fetchFailed, loadingPackages } = this.state;

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
                  {config?.branding?.name || selectedDistro} - {selectedRelease.toUpperCase()} - {selectedArch} Packages
                </h1>
                <p>
                  <a href="/">← Back to dashboard</a>
                </p>
              </div>
            </div>
          </section>

          <StatsCharts distro={selectedDistro} release={selectedRelease} arch={selectedArch} />

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
        {/* Main navbar at top with common menu items */}
        <ConfigurableNavbar title={commonConfig?.title || 'Rebuilderd'} showMenu={true} config={commonConfig} />

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
                          flexDirection: 'column',
                          margin: '0 0 1rem 0',
                          ...(config?.styling?.backgroundImage && {
                            backgroundImage: `url("${config.styling.backgroundImage}")`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            backgroundRepeat: 'no-repeat'
                          })
                        }}>
                          {/* Top row: Release/Components + Percentage */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
                            {/* Left side: Release, Components */}
                            <div style={{ textAlign: 'left', fontSize: '0.9rem', flex: '1' }}>
                              <div>Release: <span style={{ fontWeight: 'bold' }}>{release ? release : 'rolling'}</span></div>
                              {metadata && metadata.components && metadata.components.length > 0 && (
                                <div>Components: <span style={{ fontWeight: 'bold' }}>{metadata.components.filter(Boolean).join(', ') || '/'}</span></div>
                              )}
                            </div>

                            {/* Right side: Percentage */}
                            <div style={{ textAlign: 'right', fontSize: '2rem', fontWeight: 'bold', flex: '0 0 auto' }}>
                            {(() => {
                              const localPercentage = ((dashboard.rebuilds.good / (dashboard.rebuilds.good + dashboard.rebuilds.bad + dashboard.rebuilds.fail + dashboard.rebuilds.unknown)) * 100).toFixed(1);
                              const upstreamKey = `${distro}-${release}`;
                              const upstreamDashboard = upstreamDashboards[upstreamKey];

                              return (
                                <>
                                  {localPercentage}%
                                  <div style={{ fontSize: '0.75rem', fontWeight: 'normal', marginTop: '0.25rem' }}>reproducible</div>

                                  {upstreamDashboard && config?.upstream && (
                                    (() => {
                                      // Handle different possible upstream API structures
                                      const upstreamRebuilds = upstreamDashboard.rebuilds || upstreamDashboard;
                                      const upstreamGood = upstreamRebuilds.good || 0;
                                      const upstreamBad = upstreamRebuilds.bad || 0;
                                      const upstreamFail = upstreamRebuilds.fail || 0;
                                      const upstreamUnknown = upstreamRebuilds.unknown || 0;
                                      const upstreamTotal = upstreamGood + upstreamBad + upstreamFail + upstreamUnknown;

                                      // Only show if we have valid upstream data
                                      if (upstreamTotal === 0) return null;

                                      const upstreamPercentage = ((upstreamGood / upstreamTotal) * 100).toFixed(1);

                                      const upstreamUrl = (() => {
                                        if (config.upstream.urlTemplate) {
                                          let rel = release;
                                          if (distro === 'debian' && release === 'sid') rel = 'unstable';
                                          return config.upstream.urlTemplate.replace('{release}', rel);
                                        }
                                        return config.upstream.url;
                                      })();

                                      return (
                                        <div style={{ fontSize: '0.65rem', fontWeight: 'normal', marginTop: '0.5rem', lineHeight: '1.3' }}>
                                          {new URL(config.upstream.url).hostname} rebuilder claims{' '}
                                          <a
                                            href={upstreamUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style={{ color: 'white', textDecoration: 'underline' }}
                                          >
                                            {upstreamPercentage}%
                                          </a>
                                        </div>
                                      );
                                    })()
                                  )}
                                </>
                              );
                            })()}
                            </div>
                          </div>

                          {/* Arch table below release/percentage row */}
                          {metadata && metadata.architectures && metadata.architectures.length > 0 && (
                            <div style={{ marginTop: '0.75rem' }}>
                              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
                                <thead>
                                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.3)' }}>
                                    <th style={{ textAlign: 'left', padding: '1px 4px', fontWeight: 'normal', color: 'white' }}>Arch</th>
                                    <th style={{ textAlign: 'right', padding: '1px 4px', fontWeight: 'normal', color: 'white' }}>Repro</th>
                                    <th style={{ textAlign: 'left', padding: '1px 4px', fontWeight: 'normal', color: 'white' }}>Building</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {metadata.architectures.map(arch => {
                                    const archKey = `${distro}-${release}-${arch}`;
                                    const archDashboard = archDashboards[archKey];
                                    const queue = archQueues[archKey];
                                    let percentage = '...';
                                    if (archDashboard && archDashboard.rebuilds) {
                                      const total = archDashboard.rebuilds.good + archDashboard.rebuilds.bad + archDashboard.rebuilds.fail + archDashboard.rebuilds.unknown;
                                      percentage = total > 0 ? ((archDashboard.rebuilds.good / total) * 100).toFixed(1) + '%' : '0%';
                                    }
                                    const inProgress = (queue?.inProgress || [])
                                      .sort((a, b) => new Date(b.started_at) - new Date(a.started_at))
                                      .slice(0, 5);
                                    const pending = queue?.pending ?? '...';
                                    return (
                                      <tr key={arch}>
                                        <td style={{ padding: '2px 4px', whiteSpace: 'nowrap', verticalAlign: 'top' }}>
                                          <span style={{ fontWeight: 'bold', color: 'white' }}>{arch}</span>
                                        </td>
                                        <td style={{ padding: '2px 4px', textAlign: 'right', whiteSpace: 'nowrap', verticalAlign: 'top', color: 'white' }}>
                                          {percentage}
                                        </td>
                                        <td style={{ padding: '2px 4px', verticalAlign: 'top' }}>
                                          {inProgress.length === 0
                                            ? <span style={{ opacity: 0.5, color: 'white' }}>-</span>
                                            : inProgress.map(job => (
                                                <div key={job.id} style={{ marginBottom: '2px' }}>
                                                  <span style={{ display: 'inline-flex', borderRadius: '4px', overflow: 'hidden', fontSize: '0.7rem', whiteSpace: 'nowrap' }}>
                                                    <span style={{ background: '#555', color: '#fff', padding: '2px 6px' }} title={`${job.name} ${job.version}`}>{(() => { const full = `${job.name} ${job.version}`; return full.length > 35 ? full.slice(0, 35) + '…' : full; })()}</span>
                                                    <span style={{ background: '#0075ca', color: '#fff', padding: '2px 6px' }}><span className="clock-pulse">🕐</span> {formatDuration(job.started_at)}</span>
                                                  </span>
                                                </div>
                                              ))
                                          }
                                          <div style={{ marginTop: '4px', color: 'white', opacity: 0.85 }}>
                                            Queue: {pending} &nbsp;·&nbsp; <a href={`?distro=${distro}&release=${release}&arch=${arch}`} style={{ color: 'white', textDecoration: 'underline' }}>View All →</a>
                                          </div>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Dashboard stats */}
                      {dashboard && dashboard.rebuilds ? (
                        <div style={{ padding: '0 1.5rem 1.5rem' }}>
                          {(() => {
                            const defaultArch = metadata?.architectures?.[0] || '';
                            return (
                              <>
                              <p style={{ fontSize: '0.7rem', color: '#888', marginBottom: '0.5rem', textAlign: 'center' }}
                                 title="Count of builds">
                                ⓘ Count of builds with a particular end status. Since a single build can produce multiple binaries, the package listing can show more results.
                              </p>
                              <div className="columns is-mobile is-multiline" style={{ textAlign: 'center' }}>
                                <div className="column is-half">
                                  <a href={`?distro=${distro}&release=${release}&arch=${defaultArch}&status=GOOD`} style={{ textDecoration: 'none' }}>
                                    <div className="box" style={{ backgroundColor: '#23d160', color: 'white', cursor: 'pointer', transition: 'opacity 0.2s' }}
                                         onMouseOver={(e) => e.currentTarget.style.opacity = '0.8'}
                                         onMouseOut={(e) => e.currentTarget.style.opacity = '1'}>
                                      <p className="heading" style={{ color: 'white' }}>Good</p>
                                      <p className="title is-5" style={{ color: 'white' }}>{dashboard.rebuilds.good}</p>
                                    </div>
                                  </a>
                                </div>
                                <div className="column is-half">
                                  <a href={`?distro=${distro}&release=${release}&arch=${defaultArch}&status=BAD`} style={{ textDecoration: 'none' }}>
                                    <div className="box" style={{ backgroundColor: '#ff3860', color: 'white', cursor: 'pointer', transition: 'opacity 0.2s' }}
                                         onMouseOver={(e) => e.currentTarget.style.opacity = '0.8'}
                                         onMouseOut={(e) => e.currentTarget.style.opacity = '1'}>
                                      <p className="heading" style={{ color: 'white' }}>Bad</p>
                                      <p className="title is-5" style={{ color: 'white' }}>{dashboard.rebuilds.bad}</p>
                                    </div>
                                  </a>
                                </div>
                                <div className="column is-half">
                                  <a href={`?distro=${distro}&release=${release}&arch=${defaultArch}&status=FAIL`} style={{ textDecoration: 'none' }}>
                                    <div className="box" style={{ backgroundColor: '#ffdd57', color: '#363636', cursor: 'pointer', transition: 'opacity 0.2s' }}
                                         onMouseOver={(e) => e.currentTarget.style.opacity = '0.8'}
                                         onMouseOut={(e) => e.currentTarget.style.opacity = '1'}>
                                      <p className="heading" style={{ color: '#363636' }}>Fail</p>
                                      <p className="title is-5" style={{ color: '#363636' }}>{dashboard.rebuilds.fail}</p>
                                    </div>
                                  </a>
                                </div>
                                <div className="column is-half">
                                  <a href={`?distro=${distro}&release=${release}&arch=${defaultArch}&status=UNKWN`} style={{ textDecoration: 'none' }}>
                                    <div className="box" style={{ backgroundColor: '#7a7a7a', color: 'white', cursor: 'pointer', transition: 'opacity 0.2s' }}
                                         onMouseOver={(e) => e.currentTarget.style.opacity = '0.8'}
                                         onMouseOut={(e) => e.currentTarget.style.opacity = '1'}>
                                      <p className="heading" style={{ color: 'white' }}>Unknown</p>
                                      <p className="title is-5" style={{ color: 'white' }}>{dashboard.rebuilds.unknown}</p>
                                    </div>
                                  </a>
                                </div>
                              </div>
                              </>
                            );
                          })()}
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

        {/* Workers table */}
        {commonConfig?.content?.workers && commonConfig.content.workers.length > 0 && (
          <section className="section" style={{ paddingTop: '2rem', paddingBottom: '2rem' }}>
            <div className="container">
              <table className="table is-striped is-narrow is-hoverable" style={{ margin: '0 auto', fontSize: '0.75rem', maxWidth: '1000px' }}>
                <thead>
                  <tr>
                    <th>Worker name</th>
                    <th>Architecture</th>
                    <th>Platform</th>
                    <th>RAM</th>
                    <th style={{ borderLeft: '3px double #ddd' }}>Running</th>
                    <th>Pending</th>
                    <th>Available jobs</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const sorted = [...commonConfig.content.workers].sort((a, b) => a.arch.localeCompare(b.arch));
                    const archCounts = {};
                    sorted.forEach(w => { archCounts[w.arch] = (archCounts[w.arch] || 0) + 1; });
                    const archSeen = {};
                    return sorted.map((worker, index) => {
                      const jobs = workerJobs[worker.arch] || { running: '-', pending: '-', available: '-' };
                      const isFirst = !archSeen[worker.arch];
                      archSeen[worker.arch] = true;
                      return (
                        <tr key={index}>
                          <td><strong>{worker.name}</strong></td>
                          <td>{worker.arch}</td>
                          <td>{worker.cpu}</td>
                          <td>{worker.ram}</td>
                          {isFirst && (
                            <>
                              <td rowSpan={archCounts[worker.arch]} style={{ borderLeft: '3px double #ddd', verticalAlign: 'middle' }}>{jobs.running}</td>
                              <td rowSpan={archCounts[worker.arch]} style={{ verticalAlign: 'middle' }}>{jobs.pending}</td>
                              <td rowSpan={archCounts[worker.arch]} style={{ verticalAlign: 'middle' }}>{jobs.available}</td>
                            </>
                          )}
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Common footer */}
        <footer className="footer">
          <div className="content has-text-centered">
            <p>Source on <a href="https://github.com/cen1/rebuilderd-website">GitHub</a>. License is <a href="http://opensource.org/licenses/mit-license.php">MIT</a>.</p>

            {/* Powered by - host machine logo */}
            {commonConfig?.footer?.poweredBy && (
              <div style={{ marginTop: '1.5rem' }}>
                <img
                  src={commonConfig.footer.poweredBy}
                  alt="Powered by"
                  style={{ maxHeight: '80px', maxWidth: '200px' }}
                />
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
          const distroReleases = results.flat().sort((a, b) => {
            const d = a.distro.localeCompare(b.distro);
            return d !== 0 ? d : a.release.localeCompare(b.release);
          });

          this.setState({ distroReleases }, () => {
            // Load dashboard and metadata for each distro-release combination
            distroReleases.forEach(async ({ distro, release }) => {
              this.loadDashboardForRelease(distro, release);

              // Load metadata first, then per-arch dashboards and upstream dashboard
              await this.loadMetadataForRelease(distro, release);

              // Load per-architecture dashboards and queues
              const key = `${distro}-${release}`;
              const metadata = this.state.releaseMetadata[key];
              if (metadata && metadata.architectures) {
                metadata.architectures.forEach(arch => {
                  this.loadArchDashboardForRelease(distro, release, arch);
                  this.loadQueueForArch(distro, release, arch);
                });
              }

              // Load upstream dashboard if configured, using the metadata we just loaded
              const config = this.state.distroConfigs?.[distro];
              if (config && metadata) {
                this.loadUpstreamDashboardForRelease(distro, release, config, metadata);
              }
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
        componentsUrl = `/api/v1/meta/distributions/${encodeURIComponent(distribution)}/releases/${encodeURIComponent(release)}/components`;
        architecturesUrl = `/api/v1/meta/distributions/${encodeURIComponent(distribution)}/releases/${encodeURIComponent(release)}/architectures`;
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

  loadArchDashboardForRelease(distribution, release, architecture) {
    const key = `${distribution}-${release}-${architecture}`;
    const url = `/api/v1/dashboard?distribution=${encodeURIComponent(distribution)}&release=${encodeURIComponent(release)}&architecture=${encodeURIComponent(architecture)}`;

    fetch(url)
      .then((response) => {
        if (!response.ok) {
          throw new Error(response.statusText);
        }
        return response.json();
      })
      .then((data) => {
        this.setState((prevState) => ({
          archDashboards: {
            ...prevState.archDashboards,
            [key]: data
          }
        }), () => {
          // After updating archDashboards, aggregate worker jobs
          this.aggregateWorkerJobs();
        });
      })
      .catch((error) => {
        console.error(`Failed to load dashboard for ${distribution}/${release}/${architecture}:`, error);
      });
  }

  loadQueueForArch(distro, release, arch) {
    const key = `${distro}-${release}-${arch}`;
    const base = `/api/v1/queue?distribution=${encodeURIComponent(distro)}&release=${encodeURIComponent(release)}&architecture=${encodeURIComponent(arch)}`;

    Promise.all([
      fetch(`${base}&started=true`).then(r => r.ok ? r.json() : { total: 0, records: [] }),
      fetch(`${base}&limit=1`).then(r => r.ok ? r.json() : { total: 0, records: [] })
    ]).then(([inProgressData, allData]) => {
      const inProgress = inProgressData.records || [];
      const pending = Math.max(0, (allData.total || 0) - (inProgressData.total || 0));
      this.setState(prevState => ({
        archQueues: { ...prevState.archQueues, [key]: { inProgress, pending } }
      }), () => {
        this.aggregateWorkerJobs();
      });
    }).catch(err => {
      console.error(`Failed to load queue for ${distro}/${release}/${arch}:`, err);
    });
  }

  aggregateWorkerJobs() {
    // Aggregate job stats across all distributions for each architecture
    const { archDashboards, archQueues } = this.state;
    const workerJobs = {};

    const normalizeArch = (arch) => {
      if (arch === 'x86_64' || arch === 'all') return 'amd64';
      return arch;
    };

    // Use queue inProgress for running count — more accurate than dashboard API
    Object.entries(archQueues).forEach(([key, data]) => {
      const parts = key.split('-');
      const arch = normalizeArch(parts[parts.length - 1]);
      if (!workerJobs[arch]) workerJobs[arch] = { running: 0, available: 0, pending: 0 };
      workerJobs[arch].running += (data.inProgress || []).length;
    });

    // Use dashboard API for available and pending counts
    Object.entries(archDashboards).forEach(([key, data]) => {
      const parts = key.split('-');
      const arch = normalizeArch(parts[parts.length - 1]);
      if (data && data.jobs) {
        if (!workerJobs[arch]) workerJobs[arch] = { running: 0, available: 0, pending: 0 };
        workerJobs[arch].available += data.jobs.available || 0;
        workerJobs[arch].pending += data.jobs.pending || 0;
      }
    });

    this.setState({ workerJobs });
  }

  async loadUpstreamDashboardForRelease(distribution, release, config, metadata) {
    // Check if upstream is configured for this distribution
    if (!config?.upstream?.apiUrl || !metadata) {
      return;
    }

    const key = `${distribution}-${release}`;

    // Map release names for upstream API compatibility
    let upstreamRelease = release;
    if (distribution === 'debian' && release === 'sid') {
      upstreamRelease = 'unstable';
    }

    try {
      let normalizedData;

      // Handle Debian with multiple architectures - fetch per architecture
      if (distribution === 'debian' && metadata.architectures && metadata.architectures.length > 0) {
        const architectures = metadata.architectures;
        const fetchPromises = architectures.map(arch => {
          // Build URL: /upstream/debian/amd64/dashboard
          const archUrl = `/upstream/debian/${arch}/dashboard`;
          const url = upstreamRelease
            ? `${archUrl}?release=${encodeURIComponent(upstreamRelease)}`
            : archUrl;
          return fetch(url).then(res => res.ok ? res.json() : null).catch(() => null);
        });

        const results = await Promise.all(fetchPromises);

        // Combine all architecture results
        const aggregated = { good: 0, bad: 0, fail: 0, unknown: 0 };
        results.forEach(data => {
          if (data && data.rebuilds) {
            aggregated.good += data.rebuilds.good || 0;
            aggregated.bad += data.rebuilds.bad || 0;
            aggregated.fail += data.rebuilds.fail || 0;
            aggregated.unknown += data.rebuilds.unknown || 0;
          }
        });
        normalizedData = { rebuilds: aggregated };
      } else {
        // Standard single fetch (for Arch and others)
        const url = upstreamRelease
          ? `${config.upstream.apiUrl}?release=${encodeURIComponent(upstreamRelease)}`
          : config.upstream.apiUrl;

        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(response.statusText);
        }
        const data = await response.json();

        // Normalize v0 API response (Arch) to v1 format
        normalizedData = data;
        if (data.suites && !data.rebuilds) {
          // v0 API format - filter to components we're actually building
          const aggregated = { good: 0, bad: 0, fail: 0, unknown: 0 };
          const componentsToInclude = metadata.components || [];

          componentsToInclude.forEach(componentName => {
            const suite = data.suites[componentName];
            if (suite) {
              aggregated.good += suite.good || 0;
              aggregated.bad += suite.bad || 0;
              aggregated.fail += suite.fail || 0;
              aggregated.unknown += suite.unknown || 0;
            }
          });
          normalizedData = { rebuilds: aggregated };
        }
      }

      this.setState((prevState) => ({
        upstreamDashboards: {
          ...prevState.upstreamDashboards,
          [key]: normalizedData
        }
      }));
    } catch (error) {
      console.error(`Failed to load upstream dashboard for ${distribution}/${release}:`, error);
    }
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
    const { selectedDistro, selectedRelease, selectedArch } = this.state;

    // Get the architectures and components for this release from metadata
    const key = `${selectedDistro}-${selectedRelease}`;
    const metadata = this.state.releaseMetadata[key];

    const architectures = metadata.architectures.filter(a => a === selectedArch);

    // Create empty suite structures for each component-architecture combination
    // Packages will be loaded on-demand by the Section component when filters are applied
    const suites = [];

    if (metadata.components && metadata.components.length > 0) {
      // Has components: create suite for each component-architecture combination
      metadata.components.forEach(component => {
        architectures.forEach(arch => {
          suites.push({
            name: component,
            architecture: arch,
            key: `${component}-${arch}`,
            pkgs: []
          });
        });
      });
    } else {
      // No components (e.g., FreeBSD): create suite for each architecture only
      architectures.forEach(arch => {
        suites.push({
          name: null,
          architecture: arch,
          key: `none-${arch}`,
          pkgs: []
        });
      });
    }

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

export { App };

// vim: ts=2 sw=2 et:

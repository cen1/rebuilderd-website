import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import Collapsible from 'react-collapsible';

const STATUS_BADGE = {
  GOOD: { bg: '#23d160', label: 'GOOD' },
  BAD:  { bg: '#ff3860', label: 'BAD' },
  FAIL: { bg: '#ffdd57', label: 'FAIL', color: '#363636' },
  UNKWN: { bg: '#7a7a7a', label: 'UNKWN' },
};

function PeerResults({ pkg, distro, inlineLinks, showDisagreements }) {
  const [expanded, setExpanded] = useState(false);
  const [peers, setPeers] = useState(null);
  const [loading, setLoading] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const anchorRef = useRef(null);

  const toggle = (e) => {
    e.preventDefault();
    if (!expanded) {
      const r = anchorRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + window.scrollY, left: r.left + window.scrollX });
    }
    if (!expanded && peers === null) {
      setLoading(true);
      const params = new URLSearchParams({
        distribution: distro,
        architecture: pkg.architecture,
        name: pkg.name,
        version: pkg.version,
      });
      fetch(`/api/v1/peers/package?${params}&live=false`)
        .then(r => r.ok ? r.json() : [])
        .catch(() => [])
        .then(data => { setPeers(data); setLoading(false); });
    }
    setExpanded(v => !v);
  };

  const spoiler = expanded ? ReactDOM.createPortal(
    <div style={{ position: 'absolute', top: pos.top, left: pos.left, zIndex: 1000, minWidth: '300px', padding: '0.5rem 0.75rem', background: 'rgba(20,20,40,0.97)', borderRadius: '4px', fontSize: '0.75rem', color: '#fff', boxShadow: '0 4px 12px rgba(0,0,0,0.4)' }}>
          <p style={{ marginBottom: '0.3rem', opacity: 0.8 }}>Build results as seen by other rebuilderd instances</p>
          {loading && <progress className="progress is-small is-info" style={{ maxWidth: '200px', margin: '0.25rem 0' }} />}
          {!loading && peers && peers.length === 0 && <span style={{ opacity: 0.7 }}>No peer data available.</span>}
          {!loading && peers && peers.length > 0 && (
            <table style={{ borderCollapse: 'collapse', width: '100%', color: '#fff' }}>
              <thead>
                <tr style={{ opacity: 0.7 }}>
                  <th style={{ textAlign: 'left', paddingRight: '1rem', fontWeight: 'normal', color: '#fff' }}>Instance</th>
                  <th style={{ textAlign: 'left', paddingRight: '1rem', fontWeight: 'normal', color: '#fff' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {peers.map((peer, i) => {
                  const badge = STATUS_BADGE[peer.status] || { bg: '#aaa', label: peer.status };
                  let hostname = peer.url;
                  try { hostname = new URL(peer.url).hostname; } catch (_) {}
                  return (
                    <tr key={i}>
                      <td style={{ paddingRight: '1rem', color: '#fff' }}>
                        <a href={peer.url} target="_blank" rel="noreferrer" style={{ color: '#fff' }}>{hostname}</a>
                        <span className="noselect">
                          {peer.log_url && <a href={peer.log_url} target="_blank" rel="noreferrer" title="build log" style={{ marginLeft: '0.25rem' }}><img src="icons/note-16.svg" className="icon" style={{ filter: 'invert(1)' }} /></a>}
                          {peer.diffoscope_url && <a href={peer.diffoscope_url} target="_blank" rel="noreferrer" title="diffoscope" style={{ marginLeft: '0.25rem' }}><img src="icons/search-16.svg" className="icon" style={{ filter: 'invert(1)' }} /></a>}
                        </span>
                      </td>
                      <td style={{ paddingRight: '1rem', color: '#fff' }}>
                        <span style={{ background: badge.bg, color: badge.color || '#fff', borderRadius: '3px', padding: '1px 6px', fontSize: '0.7rem' }}>{badge.label}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>,
    document.body
  ) : null;

  return (
    <>
      {showDisagreements
        ? <a href="#" onClick={toggle} ref={anchorRef}>{pkg.name} {pkg.version}</a>
        : <span>{pkg.name} {pkg.version}</span>
      }
      {inlineLinks}
      {spoiler}
    </>
  );
}

function PackageList(props) {
  const { pkgs, config, distro, showDisagreements } = props;

  const getStatusClass = (status) => {
    if (!status) return '';
    switch(status.toUpperCase()) {
      case 'GOOD': return 'has-text-success';
      case 'BAD': return 'has-text-danger';
      case 'FAIL': return 'has-text-warning';
      case 'UNKWN': return 'has-text-grey';
      default: return '';
    }
  };

  return (
    <ul>
    {pkgs.map(function(pkg) {
      const urlTemplate = config?.content?.packageUrlTemplate || 'https://www.archlinux.org/packages/{component}/{architecture}/{name}';
      const url = urlTemplate
        .replace('{suite}', pkg.component)
        .replace('{component}', pkg.component)
        .replace('{architecture}', pkg.architecture)
        .replace('{name}', pkg.name);
      let links='';
      if (pkg.build_id && pkg.artifact_id) {
        const build_log_url=`/api/v1/builds/${pkg.build_id}/log`;
        const build_log_link=<a href={build_log_url} target="_blank noreferrer" title="build log"><img src="icons/note-16.svg" className="icon" /></a>;
        const attestation_url=`/api/v1/builds/${pkg.build_id}/artifacts/${pkg.artifact_id}/attestation`;
        const attestation_link=pkg.status?.toUpperCase() === 'GOOD' ? <a href={attestation_url} target="_blank noreferrer" title="attestation"><img src="icons/in-toto.svg" className="icon" /></a> : '';
        let diffoscope_link='';
        if (pkg.diffoscope_log_id) {
          const diffoscope_url=`/api/v1/builds/${pkg.build_id}/artifacts/${pkg.artifact_id}/diffoscope`;
          diffoscope_link=<a href={diffoscope_url} target="_blank noreferrer" title="diffoscope"><img src="icons/search-16.svg" className="icon" /></a>;
        }
        links=<span className="noselect"> {build_log_link} {attestation_link} {diffoscope_link}</span>;
      }
      const statusClass = getStatusClass(pkg.status);
      return (
        <li key={pkg.id}>
          <div className={`subtitle is-6 ${statusClass}`}>
            <PeerResults pkg={pkg} distro={distro} showDisagreements={showDisagreements} inlineLinks={<>{links}{' '}<a href={url} target="_blank" rel="noreferrer" title="open package page" style={{ fontSize: '0.75em', opacity: 0.6 }}>↗</a></>} />
          </div>
        </li>
      );
    })}
    </ul>
  );
}

class Section extends React.Component {
  constructor(props) {
    super(props);

    // Read initial filter state from URL
    const params = new URLSearchParams(window.location.search);
    const statusParam = params.get('status');
    const searchParam = params.get('search');
    const letterParam = params.get('letter');
    const pageParam = params.get('page');
    const seenOnlyParam = params.get('seen_only');
    const hasDisagreementParam = params.get('has_disagreement');
    const peerParam = params.get('peer');
    // Parse status filters from URL
    const statusFilters = {
      GOOD: false,
      BAD: true,
      FAIL: true,
      UNKNOWN: false
    };
    if (statusParam) {
      // Reset all to false first
      Object.keys(statusFilters).forEach(key => statusFilters[key] = false);
      // Enable only the ones in the URL
      statusParam.split(',').forEach(status => {
        const normalized = status.toUpperCase();
        if (normalized === 'UNKWN') statusFilters.UNKNOWN = true;
        else if (statusFilters.hasOwnProperty(normalized)) statusFilters[normalized] = true;
      });
    }

    this.state = {
      pkgs: [], // Packages to display
      loading: false,
      statusFilters: statusFilters,
      searchQuery: searchParam || '',
      letterFilter: letterParam || '', // No default letter filter
      showStale: seenOnlyParam === 'false', // seen_only=false means show stale packages
      showDisagreements: hasDisagreementParam === 'true',
      availablePeers: [],
      selectedPeers: peerParam ? peerParam.split(',') : [],
      total: 0,
      currentPage: pageParam ? parseInt(pageParam, 10) : 1,
      limit: 1000,
      lastId: null,
      firstId: null,
      hasMore: true
    };

    // Bind methods
    this.handleStatusChange = this.handleStatusChange.bind(this);
    this.handleSearchChange = this.handleSearchChange.bind(this);
    this.handleLetterFilter = this.handleLetterFilter.bind(this);
    this.handlePageChange = this.handlePageChange.bind(this);
    this.loadPackages = this.loadPackages.bind(this);
    this.handleSearchClick = this.handleSearchClick.bind(this);
    this.updateURL = this.updateURL.bind(this);
    this.handleStaleChange = this.handleStaleChange.bind(this);
    this.handleDisagreementChange = this.handleDisagreementChange.bind(this);
    this.handlePeerToggle = this.handlePeerToggle.bind(this);
    this.loadPeers = this.loadPeers.bind(this);
  }

  componentDidMount() {
    // Update URL to reflect initial filter state
    this.updateURL();
    // Load first page of packages
    this.loadPackages();
    // If disagreements filter is active from URL, load peers
    if (this.state.showDisagreements) this.loadPeers();
  }

  updateURL() {
    const { statusFilters, searchQuery, letterFilter, currentPage, showStale, showDisagreements, selectedPeers } = this.state;
    const { distro, release, suite } = this.props;

    const params = new URLSearchParams();
    params.set('distro', distro);
    params.set('release', release);
    params.set('arch', suite.architecture);

    // Add status filters
    const activeStatuses = Object.keys(statusFilters)
      .filter(key => statusFilters[key])
      .map(key => key === 'UNKNOWN' ? 'UNKWN' : key);
    if (activeStatuses.length > 0) {
      params.set('status', activeStatuses.join(','));
    }

    // Add search query
    if (searchQuery) {
      params.set('search', searchQuery);
    }

    // Add letter filter
    if (letterFilter) {
      params.set('letter', letterFilter);
    }

    // Add page number
    if (currentPage > 1) {
      params.set('page', currentPage);
    }

    // Add stale filter (seen_only=false means show stale packages)
    if (showStale) {
      params.set('seen_only', 'false');
    }

    if (showDisagreements) {
      params.set('has_disagreement', 'true');
    }

    if (selectedPeers.length > 0) {
      params.set('peer', selectedPeers.join(','));
    }

    // Update URL without reloading
    const newURL = `${window.location.pathname}?${params.toString()}`;
    window.history.pushState({}, '', newURL);
  }

  handleStatusChange(status) {
    this.setState(prevState => ({
      statusFilters: {
        ...prevState.statusFilters,
        [status]: !prevState.statusFilters[status]
      }
    }), () => {
      this.updateURL();
      this.loadPackages();
    });
  }

  handleSearchChange(e) {
    this.setState({ searchQuery: e.target.value });
  }

  handleLetterFilter(letter) {
    this.setState({
      letterFilter: letter === this.state.letterFilter ? '' : letter,
      searchQuery: '', // Clear search when using letter filter
      currentPage: 1,
      lastId: null,
      firstId: null
    }, () => {
      this.updateURL();
      this.loadPackages();
    });
  }

  handlePageChange(direction) {
    const { currentPage, lastId, firstId } = this.state;

    if (direction === 'next') {
      this.setState({
        currentPage: currentPage + 1
      }, () => {
        this.updateURL();
        this.loadPackages('after', lastId);
      });
    } else if (direction === 'prev' && currentPage > 1) {
      this.setState({
        currentPage: currentPage - 1
      }, () => {
        this.updateURL();
        // Use the first ID of current page to go back
        this.loadPackages('before', firstId);
      });
    }
  }

  handleStaleChange() {
    this.setState(prevState => ({ showStale: !prevState.showStale, currentPage: 1, lastId: null, firstId: null }), () => {
      this.updateURL();
      this.loadPackages();
    });
  }

  handleDisagreementChange() {
    this.setState(prevState => {
      const next = !prevState.showDisagreements;
      return {
        showDisagreements: next,
        availablePeers: [],
        selectedPeers: [],
        statusFilters: next
          ? { ...prevState.statusFilters, GOOD: true, FAIL: false, UNKNOWN: false }
          : prevState.statusFilters,
        currentPage: 1, lastId: null, firstId: null
      };
    }, () => {
      this.updateURL();
      this.loadPackages();
      if (this.state.showDisagreements) this.loadPeers();
    });
  }

  loadPeers() {
    const { distro, release, suite } = this.props;
    const params = new URLSearchParams({ distribution: distro, architecture: suite.architecture });
    if (release) params.set('release', release);
    fetch(`/api/v1/peers?${params}`)
      .then(r => r.ok ? r.json() : [])
      .catch(() => [])
      .then(peers => {
        const hostnames = peers.map(p => { try { return new URL(p.url).hostname; } catch (_) { return p.url; } });
        this.setState(prevState => ({
          availablePeers: hostnames,
          selectedPeers: prevState.selectedPeers.length > 0 ? prevState.selectedPeers : hostnames,
        }), () => {
          this.updateURL();
        });
      });
  }

  handlePeerToggle(hostname) {
    this.setState(prevState => {
      const selected = prevState.selectedPeers.includes(hostname)
        ? prevState.selectedPeers.filter(h => h !== hostname)
        : [...prevState.selectedPeers, hostname];
      return { selectedPeers: selected, currentPage: 1, lastId: null, firstId: null };
    }, () => {
      this.updateURL();
      this.loadPackages();
    });
  }

  loadPackages(direction = null, cursorId = null) {
    const { suite, distro, release } = this.props;
    const { statusFilters, searchQuery, letterFilter, limit, lastId, showStale, showDisagreements, selectedPeers } = this.state;

    // Build status filter - only include checked statuses
    const selectedStatuses = Object.keys(statusFilters).filter(s => statusFilters[s]);
    if (selectedStatuses.length === 0 && !searchQuery && !letterFilter) {
      // No filters selected, don't load
      return;
    }

    this.setState({ loading: true });

    // Build query parameters
    const params = new URLSearchParams({
      distribution: distro,
      release: release,
      architecture: suite.architecture,
      limit: limit
    });

    // Only add component if it exists (FreeBSD doesn't have components)
    if (suite.name) {
      params.set('component', suite.name);
    }

    // Add pagination cursor
    if (direction === 'after' && cursorId) {
      params.set('after', cursorId);
    } else if (direction === 'before' && cursorId) {
      params.set('before', cursorId);
    }

    // Add status filters if any selected (comma-separated)
    if (selectedStatuses.length > 0) {
      // Convert UNKNOWN to UNKWN for API compatibility
      const apiStatuses = selectedStatuses.map(status => status === 'UNKNOWN' ? 'UNKWN' : status);
      params.set('status', apiStatuses.join(','));
    }

    // Add search query (substring match)
    if (searchQuery) {
      params.set('name', searchQuery);
      params.set('search_type', 'contains');
    }

    // Add letter filter (starts with)
    if (letterFilter) {
      params.set('name', letterFilter);
      params.set('search_type', 'starts_with');
    }

    // Add stale filter: seen_only=false shows only stale packages
    if (showStale) {
      params.set('seen_only', 'false');
    }

    if (showDisagreements) {
      params.set('has_disagreement', 'true');
    }

    if (selectedPeers.length > 0) params.set('peer', selectedPeers.join(','));

    fetch(`/api/v1/packages/binary?${params.toString()}`)
      .then(response => response.ok ? response.json() : { records: [], total: 0 })
      .then(data => {
        const records = data.records || [];
        const newLastId = records.length > 0 ? records[records.length - 1].id : null;
        const newFirstId = records.length > 0 ? records[0].id : null;

        this.setState({
          pkgs: records,
          total: data.total || 0,
          lastId: newLastId,
          firstId: newFirstId,
          loading: false
        });
      })
      .catch(error => {
        console.error('Failed to load packages:', error);
        this.setState({ loading: false });
      });
  }

  handleSearchClick() {
    this.setState({
      letterFilter: '', // Clear letter filter when searching
      currentPage: 1,
      lastId: null,
      firstId: null
    }, () => {
      this.updateURL();
      this.loadPackages();
    });
  }

  render() {
    const { suite, config } = this.props;
    const { pkgs, loading, statusFilters, searchQuery, letterFilter, showStale, showDisagreements, availablePeers, selectedPeers, total, currentPage, limit } = this.state;

    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.split('');
    const totalPages = Math.ceil(total / limit);

    // Format the display name based on whether component exists
    const name = suite.name
      ? `${suite.name} (${suite.architecture})`
      : `Component: / Platform: ${suite.architecture}`;

    return (
      <section key={suite.key} className="section pt-4 pb-4" id={suite.key}>
        <div className="tile box has-background-info">
          <div style={{ padding: '1rem' }}>
            <h2 className="title is-4   has-text-primary-invert">{name}</h2>

            {/* Status filters */}
            <div className="field is-grouped" style={{ marginBottom: '1rem' }}>
              <label className="checkbox" style={{ marginRight: '1rem' }}>
                <input
                  type="checkbox"
                  checked={statusFilters.GOOD}
                  onChange={() => this.handleStatusChange('GOOD')}
                  style={{ marginRight: '0.5rem' }}
                />
                Good
              </label>
              <label className="checkbox" style={{ marginRight: '1rem' }}>
                <input
                  type="checkbox"
                  checked={statusFilters.BAD}
                  onChange={() => this.handleStatusChange('BAD')}
                  style={{ marginRight: '0.5rem' }}
                />
                Bad
              </label>
              <label className="checkbox" style={{ marginRight: '1rem', opacity: showDisagreements ? 0.4 : 1 }}>
                <input
                  type="checkbox"
                  checked={statusFilters.FAIL}
                  onChange={() => this.handleStatusChange('FAIL')}
                  disabled={showDisagreements}
                  style={{ marginRight: '0.5rem' }}
                />
                Fail
              </label>
              <label className="checkbox" style={{ marginRight: '1rem', opacity: showDisagreements ? 0.4 : 1 }}>
                <input
                  type="checkbox"
                  checked={statusFilters.UNKNOWN}
                  onChange={() => this.handleStatusChange('UNKNOWN')}
                  disabled={showDisagreements}
                  style={{ marginRight: '0.5rem' }}
                />
                Unknown
              </label>
              <label className="checkbox" style={{ marginLeft: '1.5rem', borderLeft: '1px solid rgba(255,255,255,0.3)', paddingLeft: '1.5rem', opacity: showDisagreements ? 0.4 : 1 }}>
                <input
                  type="checkbox"
                  checked={showStale}
                  onChange={this.handleStaleChange}
                  disabled={showDisagreements}
                  style={{ marginRight: '0.5rem' }}
                />
                Show stale packages
              </label>
              <label className="checkbox" style={{ marginLeft: '1rem' }}>
                <input
                  type="checkbox"
                  checked={showDisagreements}
                  onChange={this.handleDisagreementChange}
                  style={{ marginRight: '0.5rem' }}
                />
                Show peer disagreements
              </label>
            </div>

            {/* Peer filter checkboxes */}
            {showDisagreements && availablePeers.length > 0 && (
              <div style={{ marginBottom: '1rem' }}>
                <div className="field is-grouped" style={{ flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                  <span style={{ marginRight: '0.75rem', fontSize: '0.85rem' }}>Filter by peer:</span>
                  {availablePeers.map(hostname => (
                    <label key={hostname} className="checkbox" style={{ marginRight: '1rem' }}>
                      <input
                        type="checkbox"
                        checked={selectedPeers.includes(hostname)}
                        onChange={() => this.handlePeerToggle(hostname)}
                        style={{ marginRight: '0.4rem' }}
                      />
                      {hostname}
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Search box */}
            <div className="field has-addons" style={{ marginBottom: '1rem', display: 'inline-flex', maxWidth: '500px' }}>
              <div className="control is-expanded">
                <input
                  className="input"
                  type="text"
                  placeholder="Search packages..."
                  value={searchQuery}
                  onChange={this.handleSearchChange}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      this.handleSearchClick();
                    }
                  }}
                  style={{ minWidth: '300px' }}
                />
              </div>
              <div className="control">
                <button
                  className="button is-primary"
                  onClick={this.handleSearchClick}
                  disabled={loading}
                  style={{
                    cursor: loading ? 'not-allowed' : 'pointer'
                  }}
                >
                  {loading ? 'Loading...' : 'Search'}
                </button>
              </div>
            </div>

            {/* Alphabet filter */}
            <div style={{ marginBottom: '1rem' }}>
              <div className="buttons are-small">
                {alphabet.map(letter => (
                  <button
                    key={letter}
                    className={`button ${letterFilter === letter ? 'is-primary' : ''}`}
                    onClick={() => this.handleLetterFilter(letter)}
                    style={{ minWidth: '35px' }}
                  >
                    {letter}
                  </button>
                ))}
              </div>
            </div>

            {/* Results */}
            {total > 0 && (
              <div style={{ marginBottom: '1rem' }}>
                <p><strong>Found {total} packages</strong></p>
              </div>
            )}

            {/* Pagination controls */}
            {total > limit && (
              <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <button
                  className="button"
                  disabled={currentPage === 1 || loading}
                  onClick={() => this.handlePageChange('prev')}
                >
                  Previous
                </button>
                <span style={{ padding: '0 0.5rem' }}>
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  className="button"
                  disabled={pkgs.length < limit || loading}
                  onClick={() => this.handlePageChange('next')}
                >
                  Next
                </button>
              </div>
            )}

            {pkgs.length > 0 && (
              <PackageList pkgs={pkgs} config={config} distro={this.props.distro} showDisagreements={showDisagreements} />
            )}

            {pkgs.length === 0 && !loading && (
              <p>No packages found.</p>
            )}
          </div>
        </div>
      </section>
    )
  }
}

export { Section };

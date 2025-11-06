import React from 'react';
import Collapsible from 'react-collapsible';

function PackageList(props) {
  const { pkgs, config } = props;

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
        let diffoscope_link='';
        let attestation_link='';
        if (pkg.has_diffoscope) {
          const diffoscope_url=`/api/v1/builds/${pkg.build_id}/artifacts/${pkg.artifact_id}/diffoscope`;
          diffoscope_link=<a href={diffoscope_url} target="_blank noreferrer" title="diffoscope"><img src="icons/search-16.svg" className="icon" /></a>;
        }
        if (pkg.has_attestation) {
          const attestation_url=`/api/v1/builds/${pkg.build_id}/artifacts/${pkg.artifact_id}/attestation`;
          attestation_link=<a href={attestation_url} target="_blank noreferrer" title="attestation"><img src="icons/in-toto.svg" className="icon" /></a>;
        }
        links=<span className="noselect"> {build_log_link} {diffoscope_link} {attestation_link}</span>;
      }
      const statusClass = getStatusClass(pkg.status);
      return <li key={pkg.id}><p className={`subtitle is-6 ${statusClass}`}><a href={url} target="_blank noreferrer" >{pkg.name} {pkg.version}</a>{links}</p></li>
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
      letterFilter: letterParam || (searchParam ? '' : 'A'), // Default to 'A' if no search query
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
  }

  componentDidMount() {
    // Update URL to reflect initial filter state
    this.updateURL();
    // Load first page of packages
    this.loadPackages();
  }

  updateURL() {
    const { statusFilters, searchQuery, letterFilter, currentPage } = this.state;
    const { distro, release } = this.props;

    const params = new URLSearchParams();
    params.set('distro', distro);
    params.set('release', release);

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

  loadPackages(direction = null, cursorId = null) {
    const { suite, distro, release } = this.props;
    const { statusFilters, searchQuery, letterFilter, limit, lastId } = this.state;

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
      component: suite.name,
      limit: limit
    });

    // Add pagination cursor
    if (direction === 'after' && cursorId) {
      params.set('after', cursorId);
    } else if (direction === 'before' && cursorId) {
      params.set('before', cursorId);
    }

    // Add status filters if any selected (comma-separated)
    if (selectedStatuses.length > 0) {
      params.set('status', selectedStatuses.join(','));
    }

    // Add search query (exact match)
    if (searchQuery) {
      params.set('name', searchQuery);
    }

    // Add letter filter (starts with)
    if (letterFilter) {
      params.set('name_starts_with', letterFilter);
    }

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
    const { pkgs, loading, statusFilters, searchQuery, letterFilter, total, currentPage, limit } = this.state;

    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.split('');
    const totalPages = Math.ceil(total / limit);

    const name = `${suite.name} (${suite.architecture})`;

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
              <label className="checkbox" style={{ marginRight: '1rem' }}>
                <input
                  type="checkbox"
                  checked={statusFilters.FAIL}
                  onChange={() => this.handleStatusChange('FAIL')}
                  style={{ marginRight: '0.5rem' }}
                />
                Fail
              </label>
              <label className="checkbox" style={{ marginRight: '1rem' }}>
                <input
                  type="checkbox"
                  checked={statusFilters.UNKNOWN}
                  onChange={() => this.handleStatusChange('UNKNOWN')}
                  style={{ marginRight: '0.5rem' }}
                />
                Unknown
              </label>
            </div>

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
              <PackageList pkgs={pkgs} config={config} />
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

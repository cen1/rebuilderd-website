'use strict';

const React = require('react');
import ConfigurableNavbar from './navbar';


class Header extends React.Component {

  calculateSuiteStats(data) {
    let good = data['good'] || 0;
    let bad = data['bad'] || 0;
    let fail = data['fail'] || 0;
    let unknown = data['unknown'] || 0;

    const total = good + bad + fail + unknown;
    const percentage = total > 0 ? (good / total * 100).toFixed(1) : '0.0';
    return {good, bad, fail, unknown, percentage};
  }

  // TODO: this is duplciated code from App.js
  compareSuites(a, b) {
    if (a.name == 'core') {
      return -1;
    } else if (a.name == 'core' && b.name != 'core') {
      return -1;
    } else if (a.name == 'extra' && b.name == 'core') {
      return 1;
    } else if (a.name == 'extra' && b.name != 'core') {
      return -1;
    } else {
      return 1;
    }
  }

  render() {
    const {fetchFailed, dashboard, config, activeDistribution } = this.props;
    const configLoading = !config;

    // v1 API returns {rebuilds: {good, bad, fail, unknown}, jobs: {running, available, pending}}
    // v0 API returned {suites: {...}}
    let overall = {good: 0, bad: 0, fail: 0, unknown: 0};
    const suitesStats = [];

    if (dashboard && dashboard.rebuilds) {
      // v1 API structure - overall stats only
      overall = {
        good: dashboard.rebuilds.good || 0,
        bad: dashboard.rebuilds.bad || 0,
        fail: dashboard.rebuilds.fail || 0,
        unknown: dashboard.rebuilds.unknown || 0
      };
    }

    const {good, bad, fail, unknown, percentage} = this.calculateSuiteStats(overall);
    const overallStats = {name: 'overall', good, bad, fail, unknown, percentage};

    return (
      <section className="hero is-primary">
        <ConfigurableNavbar config={config} />
        <div className="hero-body">
          <div id="status">
            <h1 className="title">Reproducible status</h1>
            <br/>
            {configLoading ? (
              <p>Loading...</p>
            ) : config && config.content && config.content.welcomeText ? (
              <>
                <p dangerouslySetInnerHTML={{ __html: config.content.welcomeText.paragraph1 }} />
                <p dangerouslySetInnerHTML={{ __html: config.content.welcomeText.paragraph2 }} />
              </>
            ) : (
              <>
                <p>Welcome to the official experimental Arch Linux <a href="https://github.com/kpcyrd/rebuilderd">rebuilderd</a> instance, this page shows the results of verification builds of official Arch Linux packages in the repositories in an effort to be fully reproducible.</p>
                <p>For more information read the <a href="https://reproducible-builds.org/">Reproducible Builds website</a> or join the <a href="ircs://irc.libera.chat/archlinux-reproducible">#archlinux-reproducible</a> IRC channel on <a href="https://libera.chat/">Libera Chat</a>.</p>
              </>
            )}
            <br/>
            <ul className="repo-summary">
            {!fetchFailed && !dashboard &&
            <p><b>Loading stats...</b></p>
            }
            {!fetchFailed && dashboard &&
            <li key="overall">{config?.branding?.name || activeDistribution || 'Rebuilderd'} is <span className="has-text-weight-bold">{ overallStats.percentage }%</span> reproducible with <span className="bad has-text-weight-bold">{ overallStats.bad } bad</span>  <span className="fail has-text-weight-bold">{ overallStats.fail } fail</span>  <span className="unknown has-text-weight-bold">{ overallStats.unknown } unknown</span> and <span className="good has-text-weight-bold">{ overallStats.good } good</span> packages.</li>
            }
            {!fetchFailed && suitesStats.map(function(repo, index) {
              return <li key={ index }><a href={"#" + repo.name }>[{ repo.name }]</a> repository is <span className="has-text-weight-bold">{ repo.percentage }%</span> reproducible with <span className="bad has-text-weight-bold">{ repo.bad } bad</span>  <span className="unknown has-text-weight-bold">{ repo.unknown } unknown</span> and <span className="good has-text-weight-bold">{ repo.good } good</span> packages.</li>;
            })}
            </ul>
          </div>
        </div>
      </section>
    );
  }
}

module.exports = {Header};

// vim: ts=2 sw=2 et:

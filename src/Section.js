'use strict';

const React = require('react');
import Collapsible from 'react-collapsible'

function StatusSection(props) {
  const isOpen = props.open || false;
  const content = (
    <ul>
    {props.pkgs.map(function(pkg) {
      const urlTemplate = props.config?.content?.packageUrlTemplate || 'https://www.archlinux.org/packages/{suite}/{architecture}/{name}';
      const url = urlTemplate
        .replace('{suite}', pkg.suite)
        .replace('{architecture}', pkg.architecture)
        .replace('{name}', pkg.name);
      let links='';
      if (pkg.build_id) {
        const build_log_url=`/api/v0/builds/${pkg.build_id}/log`;
        const build_log_link=<a href={build_log_url} target="_blank noreferrer" title="build log"><img src="icons/note-16.svg" className="icon" /></a>;
        let diffoscope_link='';
        let attestation_link='';
        if (pkg.has_diffoscope) {
          const diffoscope_url=`/api/v0/builds/${pkg.build_id}/diffoscope`;
          diffoscope_link=<a href={diffoscope_url} target="_blank noreferrer" title="diffoscope"><img src="icons/search-16.svg" className="icon" /></a>;
        }
        if (pkg.has_attestation) {
          const attestation_url=`/api/v0/builds/${pkg.build_id}/attestation`;
          attestation_link=<a href={attestation_url} target="_blank noreferrer" title="attestation"><img src="icons/in-toto.svg" className="icon" /></a>;
        }
        links=<span className="noselect"> {build_log_link} {diffoscope_link} {attestation_link}</span>;
      }
      return <li key={pkg.name}><p className="subtitle is-6"><a href={url} target="_blank noreferrer" >{pkg.name} {pkg.version}</a>{links}</p></li>
    })}
    </ul>
  );
  const label = `${props.label} (${props.pkgs.length})`;
  return (
    <div className={ props.label }>
      <Collapsible trigger={label} lazyRender open={isOpen}>{ content }</Collapsible>
    </div>
  );
}

class Section extends React.Component {
  render() {
    const { suite, config } = this.props;
    const good = suite.pkgs.filter(pkg => pkg.status == "GOOD");
    const bad = suite.pkgs.filter(pkg => pkg.status == "BAD");
    const unknown = suite.pkgs.filter(pkg => pkg.status == "UNKWN");
    const name = `${suite.name} (${suite.pkgs.length})`;
    return (
      <section key={suite.name} className="section pt-4 pb-4" id={ suite.name }>
        <div className="tile box has-background-info">
          <Collapsible trigger={ name } open>
            {good.length > 0 && <StatusSection label="good" pkgs={ good } config={config} />}
            {bad.length > 0 && <StatusSection label="bad" pkgs={ bad } config={config} open />}
            {unknown.length > 0 && <StatusSection label="unknown" pkgs={ unknown } config={config} open />}
          </Collapsible>
        </div>
      </section>
    )
  }
}

module.exports = {Section};

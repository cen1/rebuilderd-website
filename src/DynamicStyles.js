'use strict';

const React = require('react');

class DynamicStyles extends React.Component {
  componentDidMount() {
    this.updateStyles();
  }

  componentDidUpdate(prevProps) {
    if (prevProps.config !== this.props.config) {
      this.updateStyles();
    }
  }

  updateStyles() {
    const { config } = this.props;

    // Remove any existing dynamic style element
    const existingStyle = document.getElementById('dynamic-distro-styles');
    if (existingStyle) {
      existingStyle.remove();
    }

    if (!config || !config.styling) {
      return;
    }

    const styling = config.styling;
    const colors = styling.colors || {};
    const logoAsset = styling.logo || '';

    let css = '';

    // Logo styling
    if (logoAsset) {
      css += `
#archnavbar #logo {
  background-image: url("${logoAsset}") !important;
  background-size: contain !important;
  background-position: left center !important;
}
`;
    }

    // Color styling
    if (colors.navbarBackground) {
      css += `
#archnavbar {
  background-color: ${colors.navbarBackground} !important;
}
`;
    }

    if (colors.navbarBorder) {
      css += `
#archnavbar {
  border-bottom-color: ${colors.navbarBorder} !important;
}
`;
    }

    // Inject the styles
    if (css) {
      const styleElement = document.createElement('style');
      styleElement.id = 'dynamic-distro-styles';
      styleElement.textContent = css;
      document.head.appendChild(styleElement);
    }
  }

  render() {
    return null; // This component doesn't render anything visible
  }
}

module.exports = { DynamicStyles };

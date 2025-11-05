'use strict';

const React = require('react');
const { createRoot } = require('react-dom/client');

const { App } = require('./App');

const container = document.getElementById('root');
const root = createRoot(container);
root.render(<App />);

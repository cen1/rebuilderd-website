'use strict';

const React = require('react');
import { createRoot } from 'react-dom/client';

const { App } = require('./App');

const container = document.getElementById('root');
const root = createRoot(container);
root.render(<App tab="home" />);

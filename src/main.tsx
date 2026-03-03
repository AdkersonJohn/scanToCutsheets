import React from 'react';
import ReactDOM from 'react-dom/client';
import { FluentProvider, teamsLightTheme, teamsDarkTheme } from '@fluentui/react-components';
import App from './App';

const root = document.getElementById('root');

if (!root) {
  throw new Error('Root element not found');
}

const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <FluentProvider theme={prefersDark ? teamsDarkTheme : teamsLightTheme}>
      <App />
    </FluentProvider>
  </React.StrictMode>
);

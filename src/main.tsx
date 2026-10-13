import React from 'react';
import ReactDOM from 'react-dom/client';
import { HomePage } from './presentation/pages/HomePage';
import './presentation/styles/index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HomePage />
  </React.StrictMode>
);

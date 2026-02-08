import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import './output.css'; // Import the generated CSS
import App from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

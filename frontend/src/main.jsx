/**
 * @file Browser entry point.
 *
 * English: Mounts the application inside StrictMode and the language and
 * theme provider, and loads the global styles.
 *
 * Español: Monta la aplicación dentro de StrictMode y del proveedor de idioma
 * y tema, y carga los estilos globales.
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import 'leaflet/dist/leaflet.css';
import './styles/tokens.css';
import './styles/app.css';
import { I18nProvider } from './i18n/I18nProvider.jsx';
import App from './App.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <I18nProvider>
      <App />
    </I18nProvider>
  </StrictMode>,
);

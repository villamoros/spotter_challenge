/**
 * @file Global setup for every Vitest test file.
 *
 * English: Loads the jest-dom matchers, unmounts rendered trees and clears
 * the saved language and theme after each test.
 *
 * Español: Carga los matchers de jest-dom, desmonta los árboles renderizados y
 * borra el idioma y el tema guardados después de cada prueba.
 */

import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Without "globals" in Vitest, Testing Library does not clean the DOM between tests.
// Saved language and theme are cleared too, so each test starts from the defaults.
afterEach(() => {
  cleanup();
  window.localStorage.clear();
  delete document.documentElement.dataset.theme;
});

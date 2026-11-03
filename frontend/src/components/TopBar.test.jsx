/**
 * @file Tests for the language switch and the light/dark toggle.
 *
 * Español: Pruebas del selector de idioma y del interruptor claro/oscuro.
 */

import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TopBar from './TopBar.jsx';
import { renderWithProviders } from '../test/render.jsx';

describe('TopBar', () => {
  it('switches the color theme and remembers it', async () => {
    renderWithProviders(<TopBar />);

    await userEvent.click(screen.getByRole('button', { name: 'Switch to dark mode' }));

    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(window.localStorage.getItem('spotter.theme')).toBe('dark');
    expect(screen.getByRole('button', { name: 'Switch to light mode' })).toBeInTheDocument();
  });

  it('switches the language and remembers it', async () => {
    renderWithProviders(<TopBar />);

    await userEvent.click(screen.getByRole('button', { name: 'ES' }));

    expect(document.documentElement.lang).toBe('es');
    expect(window.localStorage.getItem('spotter.locale')).toBe('es');
    expect(screen.getByRole('button', { name: 'ES' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('starts in English with the light theme by default', () => {
    renderWithProviders(<TopBar />);
    expect(screen.getByRole('button', { name: 'EN' })).toHaveAttribute('aria-pressed', 'true');
    expect(document.documentElement.dataset.theme).toBe('light');
  });
});

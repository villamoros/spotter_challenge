/**
 * @file Tests for the recommendation summary and the no-safe-route state.
 *
 * Español: Pruebas del resumen de recomendación y del estado sin ruta segura.
 */

import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Verdict from './Verdict.jsx';
import { departuresResult, tripResult } from '../test/fixtures.js';
import { renderWithProviders } from '../test/render.jsx';

describe('Verdict', () => {
  it('states the recommendation and the criterion that decided it', () => {
    renderWithProviders(<Verdict result={tripResult()} departures={departuresResult()} onUseDeparture={() => {}} />);

    expect(screen.getByRole('heading', { name: 'Take Route 1.' })).toBeInTheDocument();
    expect(screen.getByText(/Wins on severe miles: 0 mi versus 30 mi\./)).toBeInTheDocument();
  });

  it('shows the same recommendation in Spanish when the language is switched', () => {
    renderWithProviders(<Verdict result={tripResult()} departures={departuresResult()} onUseDeparture={() => {}} />, { locale: 'es' });
    expect(screen.getByRole('heading', { name: 'Toma la Ruta 1.' })).toBeInTheDocument();
  });

  it('shows the no-safe-route state with the earliest clean departure', async () => {
    const onUseDeparture = vi.fn();
    const result = tripResult({ recommended_route_id: null, ranking: [] });
    renderWithProviders(<Verdict result={result} departures={departuresResult()} onUseDeparture={onUseDeparture} />);

    expect(screen.getByRole('heading', { name: 'Do not leave at this time.' })).toBeInTheDocument();
    await userEvent.click(screen.getAllByRole('button', { name: /Use this departure/ })[0]);
    expect(onUseDeparture).toHaveBeenCalledWith('2026-11-03T08:00:00-06:00');
  });

  it('says so when there are no clean departures in the window', () => {
    const departures = { ...departuresResult(), columns: [departuresResult().columns[0]], earliest_clean_departure: null };
    const result = tripResult({ recommended_route_id: null, ranking: [] });
    renderWithProviders(<Verdict result={result} departures={departures} onUseDeparture={() => {}} />);

    expect(screen.getByText('No departure in the next 48 hours can be driven with this load.')).toBeInTheDocument();
  });
});

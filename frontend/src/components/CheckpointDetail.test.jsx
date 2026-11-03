/**
 * @file Tests for the checkpoint detail panel and the load-rule explanation.
 *
 * Español: Pruebas del panel de detalle del checkpoint y de la explicación de la regla de carga.
 */

import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CheckpointDetail, { loadRuleKey } from './CheckpointDetail.jsx';
import { tripResult } from '../test/fixtures.js';
import { renderWithProviders } from '../test/render.jsx';

const windyCheckpoint = (wind) => ({ driver: 'wind', wind_mph: wind, rain_in_h: 0, snow_in_h: 0, level: 'severe' });

describe('loadRuleKey', () => {
  it('explains the 45 to 54 mph rule above 30,000 lb', () => {
    expect(loadRuleKey(windyCheckpoint(47), 41000)).toBe('checkpoint.ruleNoTravel');
  });

  it('explains the 35 to 44 mph rule above 40,000 lb', () => {
    expect(loadRuleKey(windyCheckpoint(40), 41000)).toBe('checkpoint.ruleSevere');
  });

  it('stays silent when the load does not change the decision', () => {
    expect(loadRuleKey(windyCheckpoint(47), 20000)).toBeNull();
    expect(loadRuleKey({ driver: 'rain', wind_mph: 10 }, 60000)).toBeNull();
  });
});

describe('CheckpointDetail', () => {
  it('shows the conditions at arrival and the component that decides', () => {
    renderWithProviders(<CheckpointDetail route={tripResult().routes[1]} index={1} loadLb={41000} onClose={() => {}} />);

    expect(screen.getByRole('heading', { name: 'Mile 10 · Route 2' })).toBeInTheDocument();
    expect(screen.getByText('Severe')).toBeInTheDocument();
    expect(screen.getByText(/Decided by wind/)).toBeInTheDocument();
  });

  it('marks unknown hours as beyond the forecast', () => {
    const route = tripResult().routes[0];
    const unknown = { ...route, checkpoints: [{ ...route.checkpoints[0], level: 'unknown', driver: undefined }] };
    renderWithProviders(<CheckpointDetail route={unknown} index={0} loadLb={41000} onClose={() => {}} />);
    expect(screen.getByText(/beyond the 48-hour forecast/)).toBeInTheDocument();
  });

  it('closes when asked', async () => {
    const onClose = vi.fn();
    renderWithProviders(<CheckpointDetail route={tripResult().routes[0]} index={0} loadLb={41000} onClose={onClose} />);
    await userEvent.click(screen.getByRole('button', { name: 'Close details' }));
    expect(onClose).toHaveBeenCalled();
  });
});

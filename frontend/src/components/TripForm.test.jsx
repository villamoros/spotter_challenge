/**
 * @file Tests for the trip form: validation, submission and translated messages.
 *
 * Español: Pruebas del formulario: validación, envío y mensajes traducidos.
 */

import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TripForm, { validateForm } from './TripForm.jsx';
import { tripResult } from '../test/fixtures.js';
import { renderWithProviders } from '../test/render.jsx';

describe('validateForm', () => {
  it('returns a translation key for each missing field', () => {
    const errors = validateForm({ origin: ' ', destination: '', departure: '', load_lb: '250000' });
    expect(errors).toEqual({
      origin: 'field.origin.required',
      destination: 'field.destination.required',
      departure: 'field.departure.required',
      load_lb: 'field.load.range',
    });
  });

  it('accepts a complete trip', () => {
    expect(validateForm({ origin: 'Dallas', destination: 'Denver', departure: '2026-11-03T06:00', load_lb: '41000' })).toEqual({});
  });
});

describe('TripForm', () => {
  it('submits the trip with an ISO departure that carries the zone offset', async () => {
    const onSubmit = vi.fn();
    renderWithProviders(<TripForm onSubmit={onSubmit} onCancel={() => {}} />);

    await userEvent.type(screen.getByLabelText('Origin'), 'Dallas, TX');
    await userEvent.type(screen.getByLabelText('Destination'), 'Denver, CO');
    await userEvent.click(screen.getByRole('button', { name: /Calculate 3 routes/ }));

    const payload = onSubmit.mock.calls[0][0];
    expect(payload.origin).toBe('Dallas, TX');
    expect(payload.departure).toMatch(/T06:00:00-05:00$|T06:00:00-06:00$/);
    expect(payload.load_lb).toBe(41000);
  });

  it('does not submit an incomplete trip and names the missing field', async () => {
    const onSubmit = vi.fn();
    renderWithProviders(<TripForm onSubmit={onSubmit} onCancel={() => {}} />);

    await userEvent.click(screen.getByRole('button', { name: /Calculate 3 routes/ }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText('Enter the origin.')).toBeInTheDocument();
  });

  it('shows a server error code as a translated message next to its field', () => {
    renderWithProviders(
      <TripForm trip={tripResult()} serverFields={{ load_lb: 'number_range' }} onSubmit={() => {}} onCancel={() => {}} />,
    );
    expect(screen.getByText('Enter a valid number within the allowed range.')).toBeInTheDocument();
  });

  it('translates the labels when Spanish is selected', () => {
    renderWithProviders(<TripForm onSubmit={() => {}} onCancel={() => {}} />, { locale: 'es' });
    expect(screen.getByRole('button', { name: /Calcular 3 rutas/ })).toBeInTheDocument();
  });
});

import React from 'react';
import { render, screen } from '@testing-library/react';
import Disclaimer from '../src/components/Disclaimer';

describe('Disclaimer Component', () => {
  it('renders the mandatory legal disclaimer with exact wording and alert role', () => {
    render(<Disclaimer />);

    // Check for role="alert" ensuring screen reader priority
    const alertBanner = screen.getByRole('alert');
    expect(alertBanner).toBeInTheDocument();

    // Verify mandatory disclaimer statement
    expect(
      screen.getByText(/This tool provides AI-generated legal information and assistance/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/It does/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/not/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/constitute, nor should it replace, professional legal advice/i)
    ).toBeInTheDocument();
  });

  it('has accessible label and warning indicator', () => {
    render(<Disclaimer />);
    const disclaimer = screen.getByLabelText(/legal disclaimer/i);
    expect(disclaimer).toBeInTheDocument();
    expect(disclaimer).toHaveAttribute('id', 'legal-disclaimer');
  });
});

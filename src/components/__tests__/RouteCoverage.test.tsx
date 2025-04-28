import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import RouteCoverage from '../RouteCoverage';
import { getCoverageColor } from '../RouteCoverage';

// Mock test data
const mockData = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: {
        operator: 'Test Operator',
        city_name: 'Test City',
        status: '5G'
      },
      geometry: {
        type: 'Point',
        coordinates: ['-79.3832', '43.6532'] // Toronto coordinates
      }
    },
    {
      type: 'Feature',
      properties: {
        operator: 'Test Operator',
        city_name: 'Test City',
        status: '4G'
      },
      geometry: {
        type: 'Point',
        coordinates: ['-123.1207', '49.2827'] // Vancouver coordinates
      }
    }
  ]
};

describe('RouteCoverage Component', () => {
  it('renders without crashing', () => {
    render(<RouteCoverage data={mockData} />);
  });

  it('calculates correct coverage colors', () => {
    // Test color calculations
    expect(getCoverageColor(1)).toBe('hsl(120, 100%, 50%)'); // Full coverage (green)
    expect(getCoverageColor(0.5)).toBe('hsl(60, 100%, 50%)'); // Medium coverage (yellow)
    expect(getCoverageColor(0)).toBe('hsl(0, 100%, 50%)'); // No coverage (red)
  });

  it('handles route segment coverage calculation', () => {
    const { container } = render(<RouteCoverage data={mockData} />);
    
    // Simulate route calculation
    const startInput = screen.getByLabelText('Start Location');
    const endInput = screen.getByLabelText('End Location');
    const submitButton = screen.getByText('Show Route');

    fireEvent.change(startInput, { target: { value: 'Toronto, ON' } });
    fireEvent.change(endInput, { target: { value: 'Vancouver, BC' } });
    fireEvent.click(submitButton);

    // Wait for coverage calculation
    setTimeout(() => {
      const coverageElements = container.querySelectorAll('.coverage-segment');
      expect(coverageElements.length).toBeGreaterThan(0);
      
      // Verify coverage colors
      coverageElements.forEach(element => {
        const style = window.getComputedStyle(element);
        const color = style.getPropertyValue('stroke-color');
        expect(color).toMatch(/^hsl\(\d+, 100%, 50%\)$/);
      });
    }, 1000);
  });
}); 
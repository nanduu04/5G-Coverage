import React from 'react';
import { render, screen } from '@testing-library/react';
import CoverageMap from './CoverageMap';

// Mock the Google Maps components
jest.mock('@react-google-maps/api', () => ({
  LoadScript: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  GoogleMap: ({ children }: { children: React.ReactNode }) => <div data-testid="google-map">{children}</div>,
  Marker: () => <div data-testid="marker" />,
  InfoWindow: () => <div data-testid="info-window" />
}));

describe('Google Maps API Integration', () => {
  const mockData = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: {
          operator: 'Test Operator',
          city_name: 'Test City',
          status: 'Test Status'
        },
        geometry: {
          type: 'Point',
          coordinates: ['0', '0'] as [string, string]
        }
      }
    ]
  };

  beforeEach(() => {
    process.env.REACT_APP_GOOGLE_MAPS_API_KEY = 'test_api_key';
  });

  it('successfully loads Google Maps with API key', () => {
    render(<CoverageMap data={mockData} />);
    expect(screen.getByTestId('google-map')).toBeInTheDocument();
  });

  it('handles missing API key gracefully', () => {
    delete process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
    render(<CoverageMap data={mockData} />);
    expect(screen.getByTestId('google-map')).toBeInTheDocument();
  });
}); 
export interface CoveragePoint {
  type: 'Feature';
  properties: {
    operator: string;
    city_name: string;
    status: string;
    country?: string;
    phone_type?: string;
    technology?: string;
  };
  geometry: {
    type: 'Point';
    coordinates: [number, number];
  };
}

export interface RouteSegment {
  path: google.maps.LatLng[];
  coverage: number;
  coverageDetails: {
    '5G': number;
    '4G': number;
    '3G': number;
    other: number;
  };
}

export interface FilterState {
  countries: string[];
  phoneTypes: string[];
  operators: string[];
  statuses: string[];
}

export interface CoverageStats {
  totalSegments: number;
  averageCoverage: number;
  coverageDistribution: Array<{
    coverage: number;
    color: string;
    nearbyPoints: number;
  }>;
} 
export interface CoveragePoint {
  type: string;
  properties: {
    operator: string;
    city_name: string;
    status: string;
    country?: string;
    phone_type?: string;
  };
  geometry: {
    type: string;
    coordinates: [string, string];
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
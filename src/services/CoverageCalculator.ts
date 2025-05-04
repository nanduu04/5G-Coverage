import { CoveragePoint, RouteSegment, FilterState } from '../types/coverage';

// Constants for coverage calculation
const COVERAGE_WEIGHTS = {
  '5G': 1.0,
  '4G': 0.7,
  '3G': 0.4,
  'other': 0.1
};

const DEFAULT_SEARCH_RADIUS = 0.01; // Approximately 1km in degrees
const SEGMENT_LENGTH = 5; // Number of points per segment

export class CoverageCalculator {
  private points: CoveragePoint[];
  private spatialIndex: Map<string, CoveragePoint[]>;
  private cache: Map<string, RouteSegment>;

  constructor(points: CoveragePoint[]) {
    this.points = points;
    this.spatialIndex = new Map();
    this.cache = new Map();
    this.buildSpatialIndex();
  }

  private buildSpatialIndex() {
    // Create a grid-based spatial index
    this.points.forEach(point => {
      const [lng, lat] = point.geometry.coordinates;
      const gridKey = this.getGridKey(lat, lng);
      
      if (!this.spatialIndex.has(gridKey)) {
        this.spatialIndex.set(gridKey, []);
      }
      this.spatialIndex.get(gridKey)!.push(point);
    });
  }

  private getGridKey(lat: number, lng: number): string {
    // Create a grid key based on rounded coordinates
    const gridSize = 0.1; // Adjust based on your needs
    const latKey = Math.floor(lat / gridSize) * gridSize;
    const lngKey = Math.floor(lng / gridSize) * gridSize;
    return `${latKey},${lngKey}`;
  }

  private getNearbyGridKeys(lat: number, lng: number, radius: number): string[] {
    const gridSize = 0.1;
    const latKey = Math.floor(lat / gridSize) * gridSize;
    const lngKey = Math.floor(lng / gridSize) * gridSize;
    const keys: string[] = [];

    // Get keys for the 3x3 grid around the point
    for (let i = -1; i <= 1; i++) {
      for (let j = -1; j <= 1; j++) {
        keys.push(`${latKey + i * gridSize},${lngKey + j * gridSize}`);
      }
    }

    return keys;
  }

  private haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  private toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  private getCacheKey(segment: google.maps.LatLng[], filters: FilterState): string {
    const segmentKey = segment.map(p => `${p.lat()},${p.lng()}`).join('|');
    const filterKey = JSON.stringify(filters);
    return `${segmentKey}|${filterKey}`;
  }

  public calculateSegmentCoverage(
    segment: google.maps.LatLng[],
    filters: FilterState,
    searchRadius: number = DEFAULT_SEARCH_RADIUS
  ): RouteSegment {
    const cacheKey = this.getCacheKey(segment, filters);
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    const coverageDetails = {
      '5G': 0,
      '4G': 0,
      '3G': 0,
      'other': 0
    };
    let totalPoints = 0;
    let coverageScore = 0;

    // Get all points in nearby grid cells
    const nearbyPoints = new Set<CoveragePoint>();
    segment.forEach(point => {
      const gridKeys = this.getNearbyGridKeys(point.lat(), point.lng(), searchRadius);
      gridKeys.forEach(key => {
        const pointsInCell = this.spatialIndex.get(key) || [];
        pointsInCell.forEach(p => nearbyPoints.add(p));
      });
    });

    // Filter and process points
    Array.from(nearbyPoints).forEach(point => {
      // Apply filters
      if (filters.countries.length > 0 && point.properties.country && 
          !filters.countries.includes(point.properties.country)) {
        return;
      }
      if (filters.phoneTypes.length > 0 && point.properties.phone_type && 
          !filters.phoneTypes.includes(point.properties.phone_type)) {
        return;
      }
      if (filters.operators.length > 0 && !filters.operators.includes(point.properties.operator)) {
        return;
      }
      if (filters.statuses.length > 0 && !filters.statuses.includes(point.properties.status)) {
        return;
      }

      // Check if point is within search radius of any segment point
      const [lng, lat] = point.geometry.coordinates;
      const isNearby = segment.some(p => 
        this.haversineDistance(
          lat,
          lng,
          p.lat(),
          p.lng()
        ) <= searchRadius
      );

      if (isNearby) {
        const status = point.properties.status;
        coverageDetails[status as keyof typeof coverageDetails]++;
        totalPoints++;
        coverageScore += COVERAGE_WEIGHTS[status as keyof typeof COVERAGE_WEIGHTS] || COVERAGE_WEIGHTS.other;
      }
    });

    const normalizedCoverage = totalPoints > 0 ? coverageScore / totalPoints : 0;
    const result = {
      path: segment,
      coverage: normalizedCoverage,
      coverageDetails
    };

    this.cache.set(cacheKey, result);
    return result;
  }

  public analyzeRouteCoverage(
    path: google.maps.LatLng[],
    filters: FilterState
  ): {
    segments: RouteSegment[];
    stats: {
      totalSegments: number;
      averageCoverage: number;
      coverageDistribution: Array<{
        coverage: number;
        color: string;
        nearbyPoints: number;
      }>;
    };
  } {
    const segments: RouteSegment[] = [];
    const statusCount: { [key: string]: number } = {};

    // Split path into segments
    for (let i = 0; i < path.length; i += SEGMENT_LENGTH) {
      const segment = path.slice(i, i + SEGMENT_LENGTH);
      const result = this.calculateSegmentCoverage(segment, filters);

      // Update status count
      Object.entries(result.coverageDetails).forEach(([status, count]) => {
        statusCount[status] = (statusCount[status] || 0) + count;
      });

      if (Object.values(result.coverageDetails).some(count => count > 0)) {
        segments.push(result);
      }
    }

    // Calculate statistics
    const stats = {
      totalSegments: segments.length,
      averageCoverage: segments.reduce((acc, seg) => acc + seg.coverage, 0) / segments.length,
      coverageDistribution: segments.map(seg => ({
        coverage: seg.coverage,
        color: this.getCoverageColor(seg.coverage),
        nearbyPoints: Object.values(seg.coverageDetails).reduce((a, b) => a + b, 0)
      }))
    };

    return { segments, stats };
  }

  private getCoverageColor(coverage: number): string {
    if (coverage < 0 || coverage > 1) {
      console.warn(`Invalid coverage value: ${coverage}. Must be between 0 and 1.`);
      coverage = Math.max(0, Math.min(1, coverage));
    }
    const hue = coverage * 120; // 0 = red, 120 = green
    return `hsl(${hue}, 100%, 50%)`;
  }
} 
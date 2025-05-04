import { CoveragePoint } from '../types/coverage';

const API_BASE_URL = 'http://localhost:5000/api';

export class CoverageService {
  public async findNearbyPoints(lat: number, lng: number, maxDistance: number = 10000): Promise<CoveragePoint[]> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/coverage/nearby?lat=${lat}&lng=${lng}&maxDistance=${maxDistance}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch coverage points');
      }
      
      const points = await response.json();
      return points as CoveragePoint[];
    } catch (error) {
      console.error('Error finding nearby points:', error);
      throw error;
    }
  }

  public async getCoverageStats(): Promise<{
    totalPoints: number;
    coverageByType: Record<string, number>;
  }> {
    // Implementation for getting coverage stats
    throw new Error('Method not implemented');
  }

  public async insertCoveragePoints(points: CoveragePoint[]): Promise<void> {
    // Implementation for inserting coverage points
    throw new Error('Method not implemented');
  }
}

export const coverageService = new CoverageService(); 
declare module '*.geojson' {
  const value: {
    type: string;
    features: Array<{
      type: string;
      properties: {
        operator: string;
        city_name: string;
        status: string;
      };
      geometry: {
        type: string;
        coordinates: string[];
      };
    }>;
  };
  export default value;
} 
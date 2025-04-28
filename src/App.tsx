import React, { useState, useEffect } from 'react';
import { Box, Container } from '@mui/material';
import './App.css';
import RouteCoverage from './components/RouteCoverage';

interface CoveragePoint {
  type: string;
  properties: {
    operator: string;
    city_name: string;
    status: string;
  };
  geometry: {
    type: string;
    coordinates: [string, string];
  };
}

interface GeoJSONData {
  type: string;
  features: CoveragePoint[];
}

function App() {
  const [data, setData] = useState<GeoJSONData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(process.env.PUBLIC_URL + '/data.geojson');
        if (!response.ok) {
          throw new Error('Failed to fetch data');
        }
        const jsonData = await response.json();
        setData(jsonData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        Loading...
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        Error: {error}
      </Box>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <Container maxWidth={false} sx={{ height: '100vh', p: 0 }}>
      <RouteCoverage data={data} />
    </Container>
  );
}

export default App; 
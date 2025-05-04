import React, { useState, useRef } from 'react';
import { GoogleMap, LoadScript, DirectionsRenderer, Autocomplete, Polyline, InfoWindow, useLoadScript } from '@react-google-maps/api';
import { Box, TextField, Button, Typography, CircularProgress, Card, CardContent, ToggleButton, ToggleButtonGroup, Paper, Stack, Slider } from '@mui/material';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import SearchIcon from '@mui/icons-material/Search';
import { coverageService } from '../services/CoverageService';
import { CoveragePoint } from '../types/coverage';

const COVERAGE_TYPES = ['5G', '4G', '3G', 'All'] as const;

const COVERAGE_COLORS: Record<string, string> = {
  '5G': '#00ff00', // Green
  '4G': '#ffff00', // Yellow
  '3G': '#ffa500', // Orange
  'other': '#ff0000', // Red
};

const libraries = ['places', 'geometry'] as const;

const RouteCoverage: React.FC = () => {
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY || '',
    libraries: libraries as any
  });

  const [start, setStart] = useState<string>('Toronto, ON, Canada');
  const [end, setEnd] = useState<string>('New York, NY, USA');
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [coveragePoints, setCoveragePoints] = useState<CoveragePoint[]>([]);
  const [selectedPoint, setSelectedPoint] = useState<CoveragePoint | null>(null);
  const [mousePosition, setMousePosition] = useState<google.maps.LatLng | null>(null);
  const [coverageType, setCoverageType] = useState<string>('5G');
  const [searchRadius, setSearchRadius] = useState<number>(5000);
  const mapRef = useRef<google.maps.Map | null>(null);

  const startAutocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const endAutocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  const mapContainerStyle = {
    width: '100%',
    height: '70vh',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
  };

  const center = {
    lat: 51.2538,
    lng: -85.3232
  };

  const onLoad = (autocomplete: google.maps.places.Autocomplete, ref: React.MutableRefObject<google.maps.places.Autocomplete | null>) => {
    ref.current = autocomplete;
  };

  const getCoverageColor = (status: string) => COVERAGE_COLORS[status] || COVERAGE_COLORS['other'];

  const handleMouseMove = (e: google.maps.MapMouseEvent) => {
    if (e.latLng) {
      setMousePosition(e.latLng);
      const filtered = filteredCoveragePoints();
      const nearestPoint = filtered.reduce((nearest, point) => {
        const pointLatLng = new google.maps.LatLng(
          point.geometry.coordinates[1],
          point.geometry.coordinates[0]
        );
        const distance = google.maps.geometry.spherical.computeDistanceBetween(
          e.latLng!,
          pointLatLng
        );
        if (!nearest || distance < nearest.distance) {
          return { point, distance };
        }
        return nearest;
      }, null as { point: CoveragePoint; distance: number } | null);
      if (nearestPoint && nearestPoint.distance < 5000) {
        setSelectedPoint(nearestPoint.point);
      } else {
        setSelectedPoint(null);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (start && end) {
      setIsLoading(true);
      const directionsService = new google.maps.DirectionsService();
      try {
        const result = await new Promise<google.maps.DirectionsResult>((resolve, reject) => {
          directionsService.route(
            {
              origin: start,
              destination: end,
              travelMode: google.maps.TravelMode.DRIVING
            },
            (result, status) => {
              if (status === 'OK' && result) {
                resolve(result);
              } else {
                reject(new Error('Directions request failed'));
              }
            }
          );
        });
        setDirections(result);
        const path = result.routes[0].overview_path;
        const coveragePromises = path.map(point => 
          coverageService.findNearbyPoints(point.lat(), point.lng(), searchRadius)
        );
        const coverageResults = await Promise.all(coveragePromises);
        const uniquePoints = new Set<string>();
        const allCoveragePoints = coverageResults.flat().filter(point => {
          const key = `${point.geometry.coordinates[0]},${point.geometry.coordinates[1]}`;
          if (!uniquePoints.has(key)) {
            uniquePoints.add(key);
            return true;
          }
          return false;
        });
        setCoveragePoints(allCoveragePoints);
      } catch (error) {
        console.error('Error getting route or coverage:', error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleCoverageType = (_: React.MouseEvent<HTMLElement>, newType: string) => {
    if (newType) setCoverageType(newType);
  };

  const filteredCoveragePoints = () => {
    if (coverageType === 'All') return coveragePoints;
    return coveragePoints.filter(p => p.properties.status === coverageType);
  };

  // Legend
  const legend = (
    <Stack direction="row" spacing={2} alignItems="center" sx={{ mt: 1 }}>
      {COVERAGE_TYPES.filter(t => t !== 'All').map(type => (
        <Box key={type} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box sx={{ width: 18, height: 8, bgcolor: getCoverageColor(type), borderRadius: 1, mr: 0.5 }} />
          <Typography variant="caption">{type}</Typography>
        </Box>
      ))}
    </Stack>
  );

  if (loadError) {
    return <Box sx={{ p: 4, textAlign: 'center' }}><Typography color="error">Failed to load Google Maps API</Typography></Box>;
  }

  if (!isLoaded) {
    return <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress /><Typography sx={{ mt: 2 }}>Loading Map...</Typography></Box>;
  }

  return (
    <Box sx={{ p: { xs: 1, md: 3 }, height: '100vh', bgcolor: '#f5f7fa' }}>
      <Card sx={{ maxWidth: 900, mx: 'auto', mt: 2, mb: 2, p: 2, borderRadius: 3, boxShadow: 3 }}>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center">
              <Autocomplete
                onLoad={autocomplete => onLoad(autocomplete, startAutocompleteRef)}
                onPlaceChanged={() => {
                  if (startAutocompleteRef.current) {
                    setStart(startAutocompleteRef.current.getPlace().formatted_address || '');
                  }
                }}
              >
                <TextField
                  fullWidth
                  label="Start Location"
                  value={start}
                  onChange={e => setStart(e.target.value)}
                  InputProps={{ startAdornment: <LocationOnIcon color="primary" /> }}
                  variant="outlined"
                  size="small"
                />
              </Autocomplete>
              <Autocomplete
                onLoad={autocomplete => onLoad(autocomplete, endAutocompleteRef)}
                onPlaceChanged={() => {
                  if (endAutocompleteRef.current) {
                    setEnd(endAutocompleteRef.current.getPlace().formatted_address || '');
                  }
                }}
              >
                <TextField
                  fullWidth
                  label="End Location"
                  value={end}
                  onChange={e => setEnd(e.target.value)}
                  InputProps={{ startAdornment: <LocationOnIcon color="primary" /> }}
                  variant="outlined"
                  size="small"
                />
              </Autocomplete>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                disabled={!start || !end || isLoading}
                startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : <SearchIcon />}
                sx={{ minWidth: 140, height: 40, fontWeight: 600 }}
              >
                {isLoading ? 'Loading...' : 'Show Route'}
              </Button>
            </Stack>
            <Box sx={{ mt: 2 }}>
              <Typography gutterBottom>Search Radius: {searchRadius} meters</Typography>
              <Slider
                value={searchRadius}
                min={1000}
                max={20000}
                step={500}
                marks={[{ value: 1000, label: '1km' }, { value: 5000, label: '5km' }, { value: 10000, label: '10km' }, { value: 20000, label: '20km' }]}
                onChange={(_, value) => setSearchRadius(value as number)}
                valueLabelDisplay="auto"
              />
            </Box>
          </form>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center" justifyContent="space-between" sx={{ mt: 2 }}>
            <ToggleButtonGroup
              value={coverageType}
              exclusive
              onChange={handleCoverageType}
              size="small"
              color="primary"
              sx={{ bgcolor: '#f0f0f0', borderRadius: 2 }}
            >
              {COVERAGE_TYPES.map(type => (
                <ToggleButton key={type} value={type} sx={{ fontWeight: 600 }}>
                  {type}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
            <Box>
              <Typography variant="body2" color="text.secondary">
                {filteredCoveragePoints().length} {coverageType === 'All' ? 'coverage points' : `${coverageType} points`} found
              </Typography>
            </Box>
            {legend}
          </Stack>
        </CardContent>
      </Card>
      <Paper elevation={3} sx={{ maxWidth: 1200, mx: 'auto', borderRadius: 3, overflow: 'hidden' }}>
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={center}
          zoom={6}
          onLoad={map => {
            mapRef.current = map;
          }}
          onMouseMove={handleMouseMove}
        >
          {directions && <DirectionsRenderer directions={directions} />}
          {filteredCoveragePoints().map((point, index) => (
            <Polyline
              key={index}
              path={[
                {
                  lat: point.geometry.coordinates[1],
                  lng: point.geometry.coordinates[0]
                }
              ]}
              options={{
                strokeColor: getCoverageColor(point.properties.status),
                strokeOpacity: 0.8,
                strokeWeight: 4,
                geodesic: true,
                zIndex: 1
              }}
            />
          ))}
          {selectedPoint && mousePosition && (
            <InfoWindow
              position={mousePosition}
              onCloseClick={() => setSelectedPoint(null)}
            >
              <Box sx={{ p: 1, minWidth: '200px' }}>
                <Typography variant="subtitle1" gutterBottom>
                  Coverage Details
                </Typography>
                <Typography variant="body2">
                  Network: {selectedPoint.properties.status}
                </Typography>
                <Typography variant="body2">
                  Operator: {selectedPoint.properties.operator}
                </Typography>
                <Typography variant="body2">
                  City: {selectedPoint.properties.city_name}
                </Typography>
              </Box>
            </InfoWindow>
          )}
        </GoogleMap>
      </Paper>
    </Box>
  );
};

export default RouteCoverage; 
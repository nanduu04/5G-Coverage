import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { GoogleMap, LoadScript, Marker, InfoWindow, MarkerClusterer, HeatmapLayer } from '@react-google-maps/api';
import { Box, FormControl, InputLabel, Select, MenuItem, CircularProgress, Typography, SelectChangeEvent, Switch, FormControlLabel } from '@mui/material';

interface CoveragePoint {
  type: string;
  properties: {
    operator: string;
    city_name: string;
    status: string;
  };
  geometry: {
    type: string;
    coordinates: [number, number];
  };
}

interface CoverageMapProps {
  data: {
    type: string;
    features: CoveragePoint[];
  };
}

// Cache for filtered points
const pointsCache = new Map<string, CoveragePoint[]>();

// Constants for data chunking
const CHUNK_SIZE = 1000; // Number of points per chunk
const ZOOM_LEVELS = {
  WORLD: 2,
  CONTINENT: 4,
  COUNTRY: 6,
  CITY: 10
};

const CoverageMap: React.FC<CoverageMapProps> = ({ data }) => {
  const [selectedPoint, setSelectedPoint] = useState<CoveragePoint | null>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [selectedOperator, setSelectedOperator] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [visibleMarkers, setVisibleMarkers] = useState<CoveragePoint[]>([]);
  const [mapBounds, setMapBounds] = useState<google.maps.LatLngBounds | null>(null);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [isGoogleMapsLoaded, setIsGoogleMapsLoaded] = useState(false);
  const [currentChunk, setCurrentChunk] = useState(0);
  const [processedData, setProcessedData] = useState<CoveragePoint[]>([]);
  const [isProcessing, setIsProcessing] = useState(true);

  const mapContainerStyle = {
    width: '100%',
    height: '100vh'
  };

  // Ontario center coordinates
  const center = {
    lat: 51.2538,
    lng: -85.3232
  };

  const defaultZoom = 6; // Zoom level focused on Ontario

  const onLoad = useCallback((map: google.maps.Map) => {
    setMap(map);
    setIsLoading(false);
    setIsGoogleMapsLoaded(true);
  }, []);

  // Memoize unique operators and statuses
  const operators = useMemo(() => 
    Array.from(new Set(data.features.map(point => point.properties.operator))),
    [data.features]
  );

  const statuses = useMemo(() => 
    Array.from(new Set(data.features.map(point => point.properties.status))),
    [data.features]
  );

  // Process data in chunks
  useEffect(() => {
    const processData = async () => {
      setIsProcessing(true);
      const totalPoints = data.features.length;
      const chunks = Math.ceil(totalPoints / CHUNK_SIZE);
      
      // Process first chunk immediately
      const firstChunk = data.features.slice(0, CHUNK_SIZE);
      setProcessedData(firstChunk);
      setCurrentChunk(1);
      
      // Process remaining chunks in background
      for (let i = 1; i < chunks; i++) {
        const chunk = data.features.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
        setProcessedData(prev => [...prev, ...chunk]);
        setCurrentChunk(i + 1);
        // Add small delay to prevent UI blocking
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      setIsProcessing(false);
    };

    processData();
  }, [data.features]);

  // Memoize filtered points with chunking
  const filteredPoints = useMemo(() => {
    const cacheKey = `${selectedOperator}-${selectedStatus}-${currentChunk}`;
    if (pointsCache.has(cacheKey)) {
      return pointsCache.get(cacheKey)!;
    }

    const filtered = processedData.filter(point => {
      const operatorMatch = selectedOperator === 'all' || point.properties.operator === selectedOperator;
      const statusMatch = selectedStatus === 'all' || point.properties.status === selectedStatus;
      return operatorMatch && statusMatch;
    });

    pointsCache.set(cacheKey, filtered);
    return filtered;
  }, [processedData, selectedOperator, selectedStatus, currentChunk]);

  // Optimize heat map data based on zoom level
  const heatmapData = useMemo(() => {
    if (!isGoogleMapsLoaded || !map) return [];
    
    const zoom = map.getZoom() || 2;
    let sampleRate = 1;

    // Adjust sample rate based on zoom level
    if (zoom <= ZOOM_LEVELS.WORLD) sampleRate = 0.1;
    else if (zoom <= ZOOM_LEVELS.CONTINENT) sampleRate = 0.3;
    else if (zoom <= ZOOM_LEVELS.COUNTRY) sampleRate = 0.5;
    else if (zoom <= ZOOM_LEVELS.CITY) sampleRate = 0.8;

    const sampledData = filteredPoints.filter((_, index) => 
      Math.random() < sampleRate
    );

    return sampledData.map(point => ({
      location: new google.maps.LatLng(
        point.geometry.coordinates[1],
        point.geometry.coordinates[0]
      ),
      weight: 1
    }));
  }, [filteredPoints, isGoogleMapsLoaded, map]);

  // Update visible markers based on map bounds and zoom level
  useEffect(() => {
    if (!map || !mapBounds) return;

    const zoom = map.getZoom() || 2;
    let sampleRate = 1;

    // Adjust sample rate based on zoom level
    if (zoom <= ZOOM_LEVELS.WORLD) sampleRate = 0.1;
    else if (zoom <= ZOOM_LEVELS.CONTINENT) sampleRate = 0.3;
    else if (zoom <= ZOOM_LEVELS.COUNTRY) sampleRate = 0.5;
    else if (zoom <= ZOOM_LEVELS.CITY) sampleRate = 0.8;

    const visible = filteredPoints
      .filter((_, index) => Math.random() < sampleRate)
      .filter(point => {
        const lat = point.geometry.coordinates[1];
        const lng = point.geometry.coordinates[0];
        return mapBounds.contains({ lat, lng });
      });

    setVisibleMarkers(visible);
  }, [map, mapBounds, filteredPoints]);

  const onBoundsChanged = useCallback(() => {
    if (map) {
      setMapBounds(map.getBounds() || null);
    }
  }, [map]);

  const handleOperatorChange = (event: SelectChangeEvent) => {
    setSelectedOperator(event.target.value);
    setSelectedPoint(null);
  };

  const handleStatusChange = (event: SelectChangeEvent) => {
    setSelectedStatus(event.target.value);
    setSelectedPoint(null);
  };

  return (
    <Box sx={{ position: 'relative', height: '100vh' }}>
      {isLoading && (
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 1,
            textAlign: 'center'
          }}
        >
          <CircularProgress />
          <Typography variant="h6" sx={{ mt: 2 }}>Loading map data...</Typography>
        </Box>
      )}

      {isProcessing && (
        <Box
          sx={{
            position: 'absolute',
            top: '60%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 1,
            textAlign: 'center'
          }}
        >
          <Typography variant="body1">
            Processing data: {Math.round((currentChunk * CHUNK_SIZE / data.features.length) * 100)}%
          </Typography>
        </Box>
      )}

      <Box
        sx={{
          position: 'absolute',
          top: 10,
          left: 10,
          zIndex: 1,
          backgroundColor: 'white',
          padding: 2,
          borderRadius: 1,
          boxShadow: 3,
          display: 'flex',
          gap: 2,
          flexDirection: 'column'
        }}
      >
        <Box sx={{ display: 'flex', gap: 2 }}>
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>Operator</InputLabel>
            <Select
              value={selectedOperator}
              label="Operator"
              onChange={handleOperatorChange}
            >
              <MenuItem value="all">All Operators</MenuItem>
              {operators.map(operator => (
                <MenuItem key={operator} value={operator}>{operator}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={selectedStatus}
              label="Status"
              onChange={handleStatusChange}
            >
              <MenuItem value="all">All Statuses</MenuItem>
              {statuses.map(status => (
                <MenuItem key={status} value={status}>{status}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        <FormControlLabel
          control={
            <Switch
              checked={showHeatmap}
              onChange={(e) => setShowHeatmap(e.target.checked)}
              color="primary"
            />
          }
          label="Show Heat Map"
        />
      </Box>

      <LoadScript googleMapsApiKey={process.env.REACT_APP_GOOGLE_MAPS_API_KEY || ''}>
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={center}
          zoom={defaultZoom}
          onLoad={onLoad}
          onBoundsChanged={onBoundsChanged}
          options={{
            zoomControl: true,
            mapTypeControl: true,
            scaleControl: true,
            streetViewControl: true,
            rotateControl: true,
            fullscreenControl: true
          }}
        >
          {showHeatmap && isGoogleMapsLoaded ? (
            <HeatmapLayer
              data={heatmapData}
              options={{
                radius: 20,
                opacity: 0.6,
                gradient: [
                  'rgba(0, 255, 255, 0)',
                  'rgba(0, 255, 255, 1)',
                  'rgba(0, 191, 255, 1)',
                  'rgba(0, 127, 255, 1)',
                  'rgba(0, 63, 255, 1)',
                  'rgba(0, 0, 255, 1)',
                  'rgba(0, 0, 223, 1)',
                  'rgba(0, 0, 191, 1)',
                  'rgba(0, 0, 159, 1)',
                  'rgba(0, 0, 127, 1)',
                  'rgba(63, 0, 91, 1)',
                  'rgba(127, 0, 63, 1)',
                  'rgba(191, 0, 31, 1)',
                  'rgba(255, 0, 0, 1)'
                ]
              }}
            />
          ) : (
            <MarkerClusterer>
              {(clusterer) => (
                <>
                  {visibleMarkers.map((point, index) => (
                    <Marker
                      key={index}
                      position={{
                        lat: point.geometry.coordinates[1],
                        lng: point.geometry.coordinates[0]
                      }}
                      onClick={() => setSelectedPoint(point)}
                      clusterer={clusterer}
                    />
                  ))}
                </>
              )}
            </MarkerClusterer>
          )}

          {selectedPoint && (
            <InfoWindow
              position={{
                lat: selectedPoint.geometry.coordinates[1],
                lng: selectedPoint.geometry.coordinates[0]
              }}
              onCloseClick={() => setSelectedPoint(null)}
            >
              <div>
                <h3>{selectedPoint.properties.city_name}</h3>
                <p>Operator: {selectedPoint.properties.operator}</p>
                <p>Status: {selectedPoint.properties.status}</p>
              </div>
            </InfoWindow>
          )}
        </GoogleMap>
      </LoadScript>
    </Box>
  );
};

export default React.memo(CoverageMap); 
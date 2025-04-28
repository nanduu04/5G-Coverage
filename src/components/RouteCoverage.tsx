import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { GoogleMap, LoadScript, DirectionsRenderer, Autocomplete, Polyline, InfoWindow } from '@react-google-maps/api';
import { Box, TextField, Button, Typography, CircularProgress, Paper, InputAdornment, FormControl, InputLabel, Select, MenuItem, Chip, SelectChangeEvent } from '@mui/material';
import { DirectionsService } from '@react-google-maps/api';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import { styled } from '@mui/material/styles';
import { CoverageCalculator } from '../services/CoverageCalculator';
import { CoveragePoint, FilterState, RouteSegment } from '../types/coverage';

interface RouteCoverageProps {
  data: {
    type: string;
    features: CoveragePoint[];
  };
}

const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  marginBottom: theme.spacing(2),
  borderRadius: '12px',
  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
  background: 'rgba(255, 255, 255, 0.9)',
  backdropFilter: 'blur(10px)',
}));

const StyledTextField = styled(TextField)(({ theme }) => ({
  '& .MuiOutlinedInput-root': {
    borderRadius: '8px',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    '&:hover': {
      backgroundColor: 'rgba(255, 255, 255, 1)',
    },
  },
}));

const StyledButton = styled(Button)(({ theme }) => ({
  borderRadius: '8px',
  textTransform: 'none',
  fontWeight: 600,
  padding: '10px 20px',
  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
  '&:hover': {
    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
  },
}));

// Move getCoverageColor outside the component
const getCoverageColor = (coverage: number) => {
  // Validate coverage value
  if (coverage < 0 || coverage > 1) {
    console.warn(`Invalid coverage value: ${coverage}. Must be between 0 and 1.`);
    coverage = Math.max(0, Math.min(1, coverage));
  }
  
  // Color scale from red (poor coverage) to green (good coverage)
  const hue = coverage * 120; // 0 = red, 120 = green
  return `hsl(${hue}, 100%, 50%)`;
};

// Export for testing
export { getCoverageColor };

const RouteCoverage: React.FC<RouteCoverageProps> = ({ data }) => {
  const [start, setStart] = useState<string>('Toronto, ON');
  const [end, setEnd] = useState<string>('Vancouver, BC');
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
  const [routePoints, setRoutePoints] = useState<google.maps.LatLng[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);
  const [routeSegments, setRouteSegments] = useState<RouteSegment[]>([]);
  const [selectedSegment, setSelectedSegment] = useState<RouteSegment | null>(null);
  const [infoWindowPosition, setInfoWindowPosition] = useState<google.maps.LatLng | null>(null);
  const [coverageStats, setCoverageStats] = useState<{
    totalSegments: number;
    averageCoverage: number;
    coverageDistribution: Array<{ coverage: number; color: string; nearbyPoints: number }>;
  } | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);

  const startAutocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const endAutocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  const [filters, setFilters] = useState<FilterState>({
    countries: [],
    phoneTypes: [],
    operators: [],
    statuses: []
  });
  const [availableFilters, setAvailableFilters] = useState<FilterState>({
    countries: [],
    phoneTypes: [],
    operators: [],
    statuses: []
  });

  // Initialize coverage calculator
  const coverageCalculator = useMemo(() => new CoverageCalculator(data.features), [data.features]);

  const mapContainerStyle = {
    width: '100%',
    height: '70vh'
  };

  const center = {
    lat: 51.2538,
    lng: -85.3232
  };

  const onLoad = (autocomplete: google.maps.places.Autocomplete, ref: React.MutableRefObject<google.maps.places.Autocomplete | null>) => {
    ref.current = autocomplete;
  };

  const directionsCallback = useCallback((result: google.maps.DirectionsResult | null, status: google.maps.DirectionsStatus) => {
    if (status === 'OK' && result) {
      setDirections(result);
      const path = result.routes[0].overview_path;
      setRoutePoints(path);
      
      // Analyze coverage using the calculator
      const { segments, stats } = coverageCalculator.analyzeRouteCoverage(path, filters);
      setRouteSegments(segments);
      setCoverageStats(stats);
    }
  }, [coverageCalculator, filters]);

  // Extract available filter options from data
  useEffect(() => {
    if (data) {
      const countries = new Set<string>();
      const phoneTypes = new Set<string>();
      const operators = new Set<string>();
      const statuses = new Set<string>();

      data.features.forEach(feature => {
        if (feature.properties.country) countries.add(feature.properties.country);
        if (feature.properties.phone_type) phoneTypes.add(feature.properties.phone_type);
        if (feature.properties.operator) operators.add(feature.properties.operator);
        if (feature.properties.status) statuses.add(feature.properties.status);
      });

      setAvailableFilters({
        countries: Array.from(countries),
        phoneTypes: Array.from(phoneTypes),
        operators: Array.from(operators),
        statuses: Array.from(statuses)
      });
    }
  }, [data]);

  const handleFilterChange = (type: keyof FilterState) => (event: SelectChangeEvent<string[]>) => {
    setFilters(prev => ({
      ...prev,
      [type]: event.target.value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (start && end && window.google) {
      setIsLoading(true);
      const directionsService = new google.maps.DirectionsService();
      directionsService.route(
        {
          origin: start,
          destination: end,
          travelMode: google.maps.TravelMode.DRIVING
        },
        (result, status) => {
          directionsCallback(result, status);
          setIsLoading(false);
        }
      );
    }
  };

  const handleScriptLoad = () => {
    setIsScriptLoaded(true);
  };

  const onMapLoad = (map: google.maps.Map) => {
    mapRef.current = map;
    
    // Create legend control
    const legend = document.createElement('div');
    legend.style.backgroundColor = 'white';
    legend.style.padding = '10px';
    legend.style.borderRadius = '5px';
    legend.style.boxShadow = '0 2px 6px rgba(0,0,0,0.3)';
    legend.style.fontFamily = 'Roboto, Arial, sans-serif';
    legend.style.fontSize = '14px';
    legend.style.margin = '10px';
    legend.style.minWidth = '150px';

    const title = document.createElement('div');
    title.style.fontWeight = 'bold';
    title.style.marginBottom = '8px';
    title.textContent = 'Coverage Legend';
    legend.appendChild(title);

    const createLegendItem = (color: string, label: string) => {
      const item = document.createElement('div');
      item.style.display = 'flex';
      item.style.alignItems = 'center';
      item.style.marginBottom = '4px';

      const colorBox = document.createElement('div');
      colorBox.style.width = '20px';
      colorBox.style.height = '20px';
      colorBox.style.backgroundColor = color;
      colorBox.style.marginRight = '8px';
      colorBox.style.border = '1px solid #ccc';

      const labelText = document.createElement('div');
      labelText.textContent = label;

      item.appendChild(colorBox);
      item.appendChild(labelText);
      return item;
    };

    legend.appendChild(createLegendItem(getCoverageColor(1), 'Good Coverage (5G)'));
    legend.appendChild(createLegendItem(getCoverageColor(0.5), 'Medium Coverage'));
    legend.appendChild(createLegendItem(getCoverageColor(0), 'Poor Coverage'));

    // Add legend to map
    map.controls[google.maps.ControlPosition.RIGHT_BOTTOM].push(legend);
  };

  const handleSegmentClick = (segment: RouteSegment, event: google.maps.MapMouseEvent) => {
    setSelectedSegment(segment);
    setInfoWindowPosition(event.latLng || null);
  };

  return (
    <Box sx={{ p: 2, height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <LoadScript 
        googleMapsApiKey={process.env.REACT_APP_GOOGLE_MAPS_API_KEY || ''}
        libraries={['places']}
        onLoad={handleScriptLoad}
      >
        <StyledPaper>
          <form onSubmit={handleSubmit}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box sx={{ display: 'flex', gap: 2 }}>
                {isScriptLoaded && (
                  <>
                    <Autocomplete
                      onLoad={(autocomplete) => onLoad(autocomplete, startAutocompleteRef)}
                      onPlaceChanged={() => {
                        if (startAutocompleteRef.current) {
                          setStart(startAutocompleteRef.current.getPlace().formatted_address || '');
                        }
                      }}
                    >
                      <StyledTextField
                        fullWidth
                        label="Start Location"
                        value={start}
                        onChange={(e) => setStart(e.target.value)}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <LocationOnIcon color="primary" />
                            </InputAdornment>
                          ),
                        }}
                      />
                    </Autocomplete>

                    <Autocomplete
                      onLoad={(autocomplete) => onLoad(autocomplete, endAutocompleteRef)}
                      onPlaceChanged={() => {
                        if (endAutocompleteRef.current) {
                          setEnd(endAutocompleteRef.current.getPlace().formatted_address || '');
                        }
                      }}
                    >
                      <StyledTextField
                        fullWidth
                        label="End Location"
                        value={end}
                        onChange={(e) => setEnd(e.target.value)}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <LocationOnIcon color="primary" />
                            </InputAdornment>
                          ),
                        }}
                      />
                    </Autocomplete>

                    <StyledButton 
                      type="submit" 
                      variant="contained" 
                      color="primary"
                      disabled={!start || !end || isLoading || !isScriptLoaded}
                      startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : <SearchIcon />}
                    >
                      {isLoading ? 'Loading...' : 'Show Route'}
                    </StyledButton>
                  </>
                )}
              </Box>

              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <FormControl sx={{ minWidth: 200 }}>
                  <InputLabel>Countries</InputLabel>
                  <Select
                    multiple
                    value={filters.countries}
                    onChange={handleFilterChange('countries')}
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {selected.map((value) => (
                          <Chip key={value} label={value} />
                        ))}
                      </Box>
                    )}
                  >
                    {availableFilters.countries.map((country) => (
                      <MenuItem key={country} value={country}>
                        {country}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl sx={{ minWidth: 200 }}>
                  <InputLabel>Phone Types</InputLabel>
                  <Select
                    multiple
                    value={filters.phoneTypes}
                    onChange={handleFilterChange('phoneTypes')}
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {selected.map((value) => (
                          <Chip key={value} label={value} />
                        ))}
                      </Box>
                    )}
                  >
                    {availableFilters.phoneTypes.map((type) => (
                      <MenuItem key={type} value={type}>
                        {type}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl sx={{ minWidth: 200 }}>
                  <InputLabel>Operators</InputLabel>
                  <Select
                    multiple
                    value={filters.operators}
                    onChange={handleFilterChange('operators')}
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {selected.map((value) => (
                          <Chip key={value} label={value} />
                        ))}
                      </Box>
                    )}
                  >
                    {availableFilters.operators.map((operator) => (
                      <MenuItem key={operator} value={operator}>
                        {operator}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl sx={{ minWidth: 200 }}>
                  <InputLabel>Network Status</InputLabel>
                  <Select
                    multiple
                    value={filters.statuses}
                    onChange={handleFilterChange('statuses')}
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {selected.map((value) => (
                          <Chip key={value} label={value} />
                        ))}
                      </Box>
                    )}
                  >
                    {availableFilters.statuses.map((status) => (
                      <MenuItem key={status} value={status}>
                        {status}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            </Box>
          </form>
        </StyledPaper>

        <Box sx={{ flex: 1, position: 'relative', borderRadius: '12px', overflow: 'hidden' }}>
          <GoogleMap
            mapContainerStyle={{ ...mapContainerStyle, borderRadius: '12px' }}
            center={center}
            zoom={6}
            onLoad={onMapLoad}
            options={{
              zoomControl: true,
              mapTypeControl: true,
              scaleControl: true,
              streetViewControl: true,
              rotateControl: true,
              fullscreenControl: true,
              styles: [
                {
                  featureType: "all",
                  elementType: "labels.text.fill",
                  stylers: [{ color: "#7c93a3" }]
                },
                {
                  featureType: "all",
                  elementType: "labels.text.stroke",
                  stylers: [{ visibility: "off" }]
                },
                {
                  featureType: "landscape",
                  elementType: "all",
                  stylers: [{ color: "#f2f2f2" }]
                },
                {
                  featureType: "water",
                  elementType: "all",
                  stylers: [{ color: "#46bcec" }]
                }
              ]
            }}
          >
            {directions && <DirectionsRenderer directions={directions} />}
            {routeSegments.map((segment, index) => (
              <Polyline
                key={index}
                path={segment.path}
                options={{
                  strokeColor: getCoverageColor(segment.coverage),
                  strokeOpacity: 0.6,
                  strokeWeight: 8,
                  geodesic: true,
                  zIndex: 1
                }}
                onClick={(event) => handleSegmentClick(segment, event)}
              />
            ))}

            {selectedSegment && infoWindowPosition && (
              <InfoWindow
                position={infoWindowPosition}
                onCloseClick={() => {
                  setSelectedSegment(null);
                  setInfoWindowPosition(null);
                }}
              >
                <Box sx={{ p: 1, minWidth: '200px' }}>
                  <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
                    Coverage Details
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" sx={{ color: getCoverageColor(1) }}>
                        5G Points:
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                        {selectedSegment.coverageDetails['5G']}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" sx={{ color: getCoverageColor(0.7) }}>
                        4G Points:
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                        {selectedSegment.coverageDetails['4G']}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" sx={{ color: getCoverageColor(0.4) }}>
                        3G Points:
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                        {selectedSegment.coverageDetails['3G']}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" sx={{ color: getCoverageColor(0.1) }}>
                        Other Points:
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                        {selectedSegment.coverageDetails.other}
                      </Typography>
                    </Box>
                    <Box sx={{ mt: 1, pt: 1, borderTop: '1px solid #eee' }}>
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                        Coverage Score: {(selectedSegment.coverage * 100).toFixed(1)}%
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              </InfoWindow>
            )}
          </GoogleMap>
        </Box>
      </LoadScript>

      {coverageStats && (
        <StyledPaper sx={{ mt: 2 }}>
          <Typography variant="h6" gutterBottom>Coverage Validation</Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            <Box sx={{ 
              p: 1.5, 
              borderRadius: '8px', 
              bgcolor: 'rgba(0, 0, 0, 0.03)',
              minWidth: '120px'
            }}>
              <Typography variant="subtitle2" color="text.secondary">
                Total Segments
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                {coverageStats.totalSegments}
              </Typography>
            </Box>
            <Box sx={{ 
              p: 1.5, 
              borderRadius: '8px', 
              bgcolor: 'rgba(0, 0, 0, 0.03)',
              minWidth: '120px'
            }}>
              <Typography variant="subtitle2" color="text.secondary">
                Average Coverage
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                {(coverageStats.averageCoverage * 100).toFixed(1)}%
              </Typography>
            </Box>
          </Box>
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" gutterBottom>Coverage Distribution</Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {coverageStats.coverageDistribution.map((dist, index) => (
                <Box
                  key={index}
                  sx={{
                    width: '20px',
                    height: '20px',
                    bgcolor: dist.color,
                    borderRadius: '4px',
                    border: '1px solid #ccc'
                  }}
                  title={`Coverage: ${(dist.coverage * 100).toFixed(1)}%\nPoints: ${dist.nearbyPoints}`}
                />
              ))}
            </Box>
          </Box>
        </StyledPaper>
      )}
    </Box>
  );
};

export default RouteCoverage; 
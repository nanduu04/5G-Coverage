# 5G Coverage Route Analyzer

This MVP React app visualizes 5G network coverage along custom routes using Google Maps. Users can input start and end locations, view coverage along the route, and filter by country, phone type, operator, and status.

## Features

- **Route Coverage Visualization:** Enter start and end points to see 5G coverage along your route.
- **Interactive Map:** Google Maps integration with color-coded coverage segments.
- **Filtering:** Filter coverage data by country, phone type, operator, and status.
- **Coverage Statistics:** View average coverage and distribution along the route.
- **Responsive UI:** Built with Material-UI for a modern, accessible interface.

## Getting Started

### Prerequisites

- Node.js (v14 or higher recommended)
- npm

### Installation

```bash
npm install
```

### Running the App

```bash
npm start
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### Running Tests

```bash
npm test
```

## Project Structure

- `src/components/`: UI components (RouteCoverage, CoverageMap, etc.)
- `src/services/`: Coverage calculation and data utilities
- `src/types/`: TypeScript types and interfaces

## Data

- The app expects a `public/data.geojson` file with coverage data in GeoJSON format.

## Contributing

Pull requests are welcome! For major changes, please open an issue first to discuss what you would like to change.

---

<!--
## Future Enhancements

- User authentication
- Exporting coverage reports
- Multi-route comparison
- Mobile app version

## API Reference

(To be added)
-->

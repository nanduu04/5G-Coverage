import React from 'react';
import { Container } from '@mui/material';
import RouteCoverage from './components/RouteCoverage';

function App() {
  return (
    <Container maxWidth={false} sx={{ height: '100vh', p: 0 }}>
      <RouteCoverage />
    </Container>
  );
}

export default App; 
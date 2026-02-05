import React, { useState, useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { router } from './router';
import { ChakraProvider, extendTheme, Box } from '@chakra-ui/react';
import SystemLoadingScreen from './components/SystemLoadingScreen';

const theme = extendTheme({
  colors: {
    military: {
      50: '#f5f7f5',
      100: '#e0e5e0',
      200: '#bfcabf',
      300: '#9fae9f',
      400: '#7f937f',
      500: '#5f775f',
      600: '#495d49',
      700: '#334334',
      800: '#1d291d',
      900: '#0a0f0a',
    },
  },
  fonts: {
    heading: 'Roboto, Arial, sans-serif',
    body: 'Roboto, Arial, sans-serif',
  },
  components: {
    Box: {
      baseStyle: {
        borderRadius: 'lg',
        borderWidth: '1px',
        borderColor: 'military.300',
        bg: 'military.50',
        boxShadow: 'md',
      },
    },
  },
});

function App() {
  const [systemReady, setSystemReady] = useState(false);
  const [isProduction, setIsProduction] = useState(false);

  useEffect(() => {
    // Check if running in production mode (served build, not dev server)
    // Production indicators:
    // 1. Not using webpack dev server (port 3000 with npm start creates different behavior)
    // 2. process.env.NODE_ENV === 'production' (set by build)
    // 3. Not running on typical dev server port with hot reload
    
    const isBuiltVersion = process.env.NODE_ENV === 'production';
    
    setIsProduction(isBuiltVersion);
    
    // If not production (dev mode), system is immediately ready
    if (!isBuiltVersion) {
      setSystemReady(true);
    }
  }, []);

  const handleSystemReady = () => {
    setSystemReady(true);
  };

  // Show loading screen only in production and before system is ready
  if (isProduction && !systemReady) {
    return <SystemLoadingScreen onSystemReady={handleSystemReady} />;
  }

  return (
    <AuthProvider>
      <ChakraProvider theme={theme}>
        <Box minH="100vh" bg="military.100" p={0}>
          <RouterProvider router={router} />
        </Box>
      </ChakraProvider>
    </AuthProvider>
  );
}

export default App;

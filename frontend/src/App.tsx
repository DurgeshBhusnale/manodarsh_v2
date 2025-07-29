import React from 'react';
import { RouterProvider } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { router } from './router';
import { ChakraProvider, extendTheme, Box } from '@chakra-ui/react';

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

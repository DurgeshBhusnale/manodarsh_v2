import React, { useState, useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { router } from './router';
import { ChakraProvider, extendTheme, Box, Spinner, Text, VStack } from '@chakra-ui/react';
import SystemLoadingScreen from './components/SystemLoadingScreen';
import SessionConflictModal from './components/SessionConflictModal';
import { useSingleSession } from './hooks/useSingleSession';

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

  // Single session management
  const { isConflict, isLoading, closeThisWindow, takeOverSession } = useSingleSession();

  useEffect(() => {
    // Disable the React loading screen - the tkinter launcher already handles this
    // The launcher ensures backend/frontend are ready before opening browser
    // Having two loading screens causes confusion and the React one can get stuck
    setSystemReady(true);
    setIsProduction(false);
  }, []);

  const handleSystemReady = () => {
    setSystemReady(true);
  };

  // Show loading screen only in production and before system is ready
  if (isProduction && !systemReady) {
    return <SystemLoadingScreen onSystemReady={handleSystemReady} />;
  }

  // Wait for session check to complete
  if (isLoading) {
    return (
      <ChakraProvider theme={theme}>
        <Box minH="100vh" bg="military.100" display="flex" alignItems="center" justifyContent="center">
          <Box textAlign="center" color="gray.600">
            Checking session...
          </Box>
        </Box>
      </ChakraProvider>
    );
  }

  return (
    <ChakraProvider theme={theme}>
      <AuthProvider>
        <AppContent isConflict={isConflict} closeThisWindow={closeThisWindow} takeOverSession={takeOverSession} />
      </AuthProvider>
    </ChakraProvider>
  );
}

// Inner component that can access AuthContext
function AppContent({ isConflict, closeThisWindow, takeOverSession }: {
  isConflict: boolean;
  closeThisWindow: () => void;
  takeOverSession: () => void;
}) {
  const { isValidating } = useAuth();

  // Show loading during session validation
  if (isValidating) {
    return (
      <Box minH="100vh" bg="military.100" display="flex" alignItems="center" justifyContent="center">
        <VStack spacing={4}>
          <Spinner size="xl" color="military.600" thickness="4px" />
          <Text color="gray.600" fontSize="lg">Validating session...</Text>
        </VStack>
      </Box>
    );
  }

  return (
    <>
      {/* Session conflict modal - blocks app until resolved */}
      <SessionConflictModal
        isOpen={isConflict}
        onCloseWindow={closeThisWindow}
        onContinueHere={takeOverSession}
      />
      <Box minH="100vh" bg="military.100" p={0}>
        <RouterProvider router={router} />
      </Box>
    </>
  );
}

export default App;

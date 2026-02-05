import React, { useState } from 'react';
import { Box, Text, Flex, Button, VStack, useToast } from '@chakra-ui/react';
import { authService } from '../services/authService';

interface SessionConflictModalProps {
  isOpen: boolean;
  onCloseWindow: () => void;
  onContinueHere: () => void;
}

const SessionConflictModal: React.FC<SessionConflictModalProps> = ({
  isOpen,
  onCloseWindow,
  onContinueHere,
}) => {
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const toast = useToast();

  if (!isOpen) return null;

  const handleLogoutEverywhere = async () => {
    setIsLoggingOut(true);
    try {
      // Call logout-all endpoint
      await authService.logoutAllSessions();
      
      // Clear all local data
      localStorage.clear();
      sessionStorage.clear();
      
      // Show success message
      toast({
        title: 'Logged out from all sessions',
        description: 'You can now log in again',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      
      // Redirect to login after a brief delay
      setTimeout(() => {
        window.location.href = '/login';
      }, 1000);
    } catch (error) {
      console.error('Logout everywhere error:', error);
      toast({
        title: 'Logout failed',
        description: 'Please try again',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      setIsLoggingOut(false);
    }
  };

  return (
    <Box
      position="fixed"
      top={0}
      left={0}
      w="100vw"
      h="100vh"
      bg="blackAlpha.700"
      zIndex={9999}
      display="flex"
      alignItems="center"
      justifyContent="center"
    >
      <Box
        bg="white"
        maxW="md"
        w="90%"
        borderRadius="xl"
        boxShadow="2xl"
        overflow="hidden"
      >
        {/* Header */}
        <Box bg="orange.500" px={6} py={4}>
          <Flex align="center" gap={3}>
            <Text fontSize="3xl">&#x26A0;</Text>
            <Text fontWeight="bold" fontSize="lg" color="white">
              Session Conflict
            </Text>
          </Flex>
        </Box>

        {/* Content */}
        <VStack px={6} py={6} spacing={4} align="stretch">
          <Text fontSize="md" color="gray.700" textAlign="center" fontWeight="semibold">
            Another session of SATHI is already running.
          </Text>

          <Text fontSize="sm" color="gray.600" textAlign="center">
            Only ONE active session is allowed at a time to prevent data conflicts and ensure security.
          </Text>

          <Text fontSize="sm" color="gray.500" textAlign="center" fontStyle="italic">
            Please choose one of the options below:
          </Text>

          {/* Action Buttons */}
          <VStack spacing={3} pt={4}>
            <Button
              colorScheme="gray"
              variant="outline"
              size="lg"
              width="100%"
              onClick={onCloseWindow}
              leftIcon={<span>&#x2715;</span>}
              _hover={{ bg: 'gray.100' }}
            >
              Close This Window
            </Button>

            <Button
              colorScheme="blue"
              size="lg"
              width="100%"
              onClick={onContinueHere}
              leftIcon={<span>&#x2713;</span>}
              _hover={{ bg: 'blue.600' }}
            >
              Continue Here (Takeover)
            </Button>

            <Button
              colorScheme="red"
              variant="outline"
              size="lg"
              width="100%"
              onClick={handleLogoutEverywhere}
              leftIcon={<span>&#x1F511;</span>}
              isLoading={isLoggingOut}
              loadingText="Logging out..."
              _hover={{ bg: 'red.50' }}
            >
              Logout Everywhere & Start Fresh
            </Button>
          </VStack>

          <VStack spacing={1} pt={2}>
            <Text fontSize="xs" color="gray.400" textAlign="center">
              <strong>Takeover:</strong> Close other session and continue here
            </Text>
            <Text fontSize="xs" color="gray.400" textAlign="center">
              <strong>Logout Everywhere:</strong> Clear all sessions and login again
            </Text>
          </VStack>
        </VStack>
      </Box>
    </Box>
  );
};

export default SessionConflictModal;

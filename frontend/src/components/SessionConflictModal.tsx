import React from 'react';
import { Box, Text, Flex, Button, VStack } from '@chakra-ui/react';

interface SessionConflictModalProps {
  isOpen: boolean;
  onCloseWindow: () => void;
  onLogoutEverywhere: () => void;
}

const SessionConflictModal: React.FC<SessionConflictModalProps> = ({
  isOpen,
  onCloseWindow,
  onLogoutEverywhere,
}) => {
  if (!isOpen) return null;

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
              Close
            </Button>

            <Button
              colorScheme="red"
              size="lg"
              width="100%"
              onClick={onLogoutEverywhere}
              leftIcon={<span>&#x1F511;</span>}
              _hover={{ bg: 'red.600' }}
            >
              Logout and Login Again
            </Button>
          </VStack>

          <Text fontSize="xs" color="gray.400" textAlign="center" pt={2}>
            Choosing &quot;Logout and Login Again&quot; will sign out all sessions.
          </Text>
        </VStack>
      </Box>
    </Box>
  );
};

export default SessionConflictModal;

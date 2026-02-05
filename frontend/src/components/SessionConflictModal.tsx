import React from 'react';
import { Box, Text, Flex, Button, VStack } from '@chakra-ui/react';

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
          <Text fontSize="md" color="gray.700" textAlign="center">
            Another session of SATHI is already running.
          </Text>

          <Text fontSize="sm" color="gray.500" textAlign="center">
            To prevent data conflicts, only one session can be active at a time.
            Please choose an option below.
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
            >
              Close This Window
            </Button>

            <Button
              colorScheme="blue"
              size="lg"
              width="100%"
              onClick={onContinueHere}
              leftIcon={<span>&#x2713;</span>}
            >
              Continue Here (Logout Others)
            </Button>
          </VStack>

          <Text fontSize="xs" color="gray.400" textAlign="center" pt={2}>
            Choosing &quot;Continue Here&quot; will close the other session automatically.
          </Text>
        </VStack>
      </Box>
    </Box>
  );
};

export default SessionConflictModal;

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Input, Stack, Heading, Flex, Alert, Text } from '@chakra-ui/react';
import { WarningIcon } from '@chakra-ui/icons';

const SoldierLoginPage: React.FC = () => {
    const navigate = useNavigate();
    const [soldierId, setSoldierId] = useState('');
    const [soldierPassword, setSoldierPassword] = useState('');
    const [soldierError, setSoldierError] = useState('');
    const [soldierLoading, setSoldierLoading] = useState(false);

    const handleSoldierLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setSoldierError('');
        setSoldierLoading(true);
        try {
            if (!/^\d{9}$/.test(soldierId)) {
                setSoldierError('Force ID must be exactly 9 digits');
                setSoldierLoading(false);
                return;
            }
            if (!soldierPassword) {
                setSoldierError('Please enter your password');
                setSoldierLoading(false);
                return;
            }
            // Pass credentials via navigation state for security
            navigate('/soldier/survey', {
                state: { force_id: soldierId, password: soldierPassword }
            });
        } catch (err: any) {
            setSoldierError('Invalid credentials');
        } finally {
            setSoldierLoading(false);
        }
    };

    return (
      <Flex minH="100vh" align="center" justify="center" bg={'gray.100'}>
        <Box bg={'white'} p={8} rounded="lg" shadow="md" w={{ base: '100%', sm: '400px' }}>
          <Heading as="h1" size="lg" mb={6} textAlign="center">CRPF Soldier Login</Heading>
          <Text mb={4} color="gray.600" fontSize="md" textAlign="center">
            Please enter your Force ID and password to start the survey.
          </Text>
          {soldierError && (
            <Alert status="error" mb={4} rounded="md">
              <WarningIcon boxSize={5} mr={2} color="red.400" />
              <Text>{soldierError}</Text>
            </Alert>
          )}
          <form onSubmit={handleSoldierLogin}>
            <Stack spacing={4}>
              <Box>
                <Text as="label" color={'gray.700'} fontWeight="semibold" mb={1}>Force ID</Text>
                <Input
                  type="text"
                  value={soldierId}
                  onChange={(e) => setSoldierId(e.target.value)}
                  placeholder="Enter 9-digit Force ID"
                  required
                />
              </Box>
              <Box>
                <Text as="label" color={'gray.700'} fontWeight="semibold" mb={1}>Password</Text>
                <Input
                  type="password"
                  value={soldierPassword}
                  onChange={(e) => setSoldierPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                />
              </Box>
              <Button
                type="submit"
                isLoading={soldierLoading}
                colorScheme="teal"
                w="full"
              >
                {soldierLoading ? 'Verifying...' : 'Start Survey'}
              </Button>
            </Stack>
          </form>
          <Button
            mt={6}
            colorScheme="blue"
            variant="outline"
            w="full"
            onClick={() => navigate('/login')}
          >
            For Admin Login, Click Here
          </Button>
          <Box mt={4} textAlign="center">
            <Text>
              <a href="/" style={{ color: '#2563eb', textDecoration: 'underline', fontWeight: 600 }}>
                &larr; Back to Home
              </a>
            </Text>
          </Box>
        </Box>
      </Flex>
    );
};

export default SoldierLoginPage;

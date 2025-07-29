import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../services/api';
import InfoModal from '../components/InfoModal';
import { Box, Button, Input, Stack, Heading, Flex, Alert, AlertTitle, AlertDescription, Text } from '@chakra-ui/react';
import { InfoIcon, WarningIcon } from '@chakra-ui/icons';

export const LoginPage: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { login, isAuthenticated, user } = useAuth();
    const [forceId, setForceId] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Modal states
    const [showInfoModal, setShowInfoModal] = useState(false);
    const [modalTitle, setModalTitle] = useState('');
    const [modalMessage, setModalMessage] = useState('');

    // Redirect if already authenticated
    useEffect(() => {
        if (isAuthenticated && user?.role === 'admin') {
            navigate('/admin/dashboard');
        }
    }, [isAuthenticated, user, navigate]);

    // Handle session expiry messages
    useEffect(() => {
        const expired = searchParams.get('expired');
        if (expired === 'timeout') {
            setModalTitle('Session Expired');
            setModalMessage('Your session expired after 15 minutes of inactivity. Please login again.');
            setShowInfoModal(true);
        } else if (expired === 'away') {
            setModalTitle('Session Expired');
            setModalMessage('Your session expired while you were away. Please login again.');
            setShowInfoModal(true);
        }
    }, [searchParams]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            // Validate force ID format
            if (!/^\d{9}$/.test(forceId)) {
                setError('Force ID must be exactly 9 digits');
                return;
            }

            const response = await apiService.login(forceId, password);
            
            if (response.user) {
                // Only admins can login - this should always be admin now
                if (response.user.role === 'admin') {
                    login(response.user);
                    navigate('/admin/dashboard');
                } else {
                    setError('Access denied. Only administrators can login to this system.');
                }
            }
        } catch (err: any) {
            // Handle the specific 403 error for soldier login attempts
            if (err.response?.status === 403) {
                setError('Access denied. Only administrators can login to this system.');
            } else {
                setError('Invalid credentials');
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
      <Flex minH="100vh" align="center" justify="center" bg={'gray.100'}>
        <Box bg={'white'} p={8} rounded="lg" shadow="md" w={{ base: '100%', sm: '400px' }}>
          <Heading as="h1" size="lg" mb={6} textAlign="center">CRPF Admin Login</Heading>
          <Alert status="info" mb={4} rounded="md">
            <InfoIcon boxSize={5} mr={2} color="blue.400" />
            <Box flex="1">
              <AlertTitle fontSize="md">Note:</AlertTitle>
              <AlertDescription fontSize="sm">
                This system is for administrators only. Soldiers can access questionnaires directly via the survey page.
              </AlertDescription>
            </Box>
          </Alert>
          {error && (
            <Alert status="error" mb={4} rounded="md">
              <WarningIcon boxSize={5} mr={2} color="red.400" />
              <Text>{error}</Text>
            </Alert>
          )}
          <form onSubmit={handleSubmit}>
            <Stack spacing={4}>
              <Box>
                <Text as="label" color={'gray.700'} fontWeight="semibold" mb={1}>Force ID</Text>
                <Input
                  type="text"
                  value={forceId}
                  onChange={(e) => setForceId(e.target.value)}
                  placeholder="Enter 9-digit Force ID"
                  required
                />
              </Box>
              <Box>
                <Text as="label" color={'gray.700'} fontWeight="semibold" mb={1}>Password</Text>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                />
              </Box>
              <Button
                type="submit"
                isLoading={isLoading}
                colorScheme="blue"
                w="full"
              >
                {isLoading ? 'Logging in...' : 'Login'}
              </Button>
            </Stack>
          </form>
        </Box>
        {/* Modal Components */}
        <InfoModal
          isOpen={showInfoModal}
          onClose={() => setShowInfoModal(false)}
          title={modalTitle}
          message={modalMessage}
        />
      </Flex>
    );
};

export default LoginPage;

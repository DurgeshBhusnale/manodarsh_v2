import React, { useState } from 'react';
import Sidebar from '../../components/Sidebar';
import Modal from '../../components/Modal';
import InfoModal from '../../components/InfoModal';
import LoadingModal from '../../components/LoadingModal';
import ErrorModal from '../../components/ErrorModal';
import { apiService } from '../../services/api';
import { Box, Button, Input, Stack, Heading, Text } from '@chakra-ui/react';

const AddSoldier: React.FC = () => {
    const [forceId, setForceId] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isCollecting, setIsCollecting] = useState(false);
    const [isTraining, setIsTraining] = useState(false);
    
    // Modal states
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [showErrorModal, setShowErrorModal] = useState(false);
    const [showInfoModal, setShowInfoModal] = useState(false);
    const [showLoadingModal, setShowLoadingModal] = useState(false);
    const [modalMessage, setModalMessage] = useState('');
    const [modalTitle, setModalTitle] = useState('');

    const handleCollectImages = async () => {
        if (!forceId) {
            setModalTitle('Force ID Required');
            setModalMessage('Please enter a Force ID first');
            setShowErrorModal(true);
            return;
        }

        // Validate force ID format
        if (!/^\d{9}$/.test(forceId)) {
            setModalTitle('Invalid Force ID');
            setModalMessage('Force ID must be 9 digits');
            setShowErrorModal(true);
            return;
        }

        setIsCollecting(true);
        setModalTitle('Image Collection Started');
        setModalMessage(`Starting image collection...

Instructions:
1. A window will open with your camera feed
2. Follow the pose instructions shown on the window
3. Press 'S' key when ready to capture images for each pose
4. Press 'Q' key to quit the process

Please keep the window focused for key controls to work.`);
        setShowInfoModal(true);

        try {
            const response = await apiService.collectImages(forceId);
            if (response.data.folder_path) {
                setModalTitle('Images Collected Successfully');
                setModalMessage('Images collected successfully! You can now proceed with adding the soldier.');
                setShowSuccessModal(true);
            } else {
                setModalTitle('Collection Cancelled');
                setModalMessage('Image collection was cancelled. Please try again.');
                setShowErrorModal(true);
            }
        } catch (error: any) {
            setModalTitle('Collection Error');
            setModalMessage(error.response?.data?.error || 'Failed to collect images. Please try again.');
            setShowErrorModal(true);
        } finally {
            setIsCollecting(false);
        }
    };

    const handleTrainModel = async () => {
        setIsTraining(true);
        try {
            const response = await apiService.trainModel(forceId);
            setModalTitle('Training Complete');
            setModalMessage('Model training completed successfully!');
            setShowSuccessModal(true);
        } catch (error: any) {
            setModalTitle('Training Error');
            setModalMessage(error.response?.data?.error || 'Failed to train model. Please try again.');
            setShowErrorModal(true);
        } finally {
            setIsTraining(false);
        }
    };

    const handleAddSoldier = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const response = await apiService.addSoldier({
                force_id: forceId,
                password: password
            });

            setModalTitle('Soldier Added');
            setModalMessage('Soldier added successfully!');
            setShowSuccessModal(true);

            // Clear form
            setForceId('');
            setPassword('');
        } catch (error: any) {
            setModalTitle('Registration Error');
            setModalMessage(error.response?.data?.error || 'Failed to add soldier. Please try again.');
            setShowErrorModal(true);
        } finally {
            setIsLoading(false);
        }
    };

    return (
    <div style={{ display: 'flex', height: '100vh' }}>
      <Sidebar />
      <Box flex="1" p={8} bg={'gray.100'}>
        <Heading as="h1" size="lg" mb={6}>Add New Soldier</Heading>
        <Stack spacing={6}>
          {/* Add Soldier Form */}
          <Box bg={'white'} p={6} rounded="lg" shadow="md" maxW="md">
            <form onSubmit={handleAddSoldier}>
              <Stack spacing={4}>
                <Box>
                  <Text as="label" color={'gray.700'} fontWeight="semibold" mb={1}>Force ID</Text>
                  <Input
                    type="text"
                    value={forceId}
                    onChange={(e) => setForceId(e.target.value)}
                    required
                    pattern="[0-9]{9}"
                    title="Force ID must be 9 digits"
                    isDisabled={isCollecting}
                  />
                </Box>
                <Box>
                  <Text as="label" color={'gray.700'} fontWeight="semibold" mb={1}>Password</Text>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    isDisabled={isCollecting}
                  />
                </Box>
                <Stack spacing={4}>
                  <Button
                    type="button"
                    onClick={handleCollectImages}
                    isLoading={isCollecting}
                    isDisabled={isCollecting}
                    colorScheme="green"
                    w="full"
                  >
                    {isCollecting ? 'Collecting Images...' : 'Collect Images'}
                  </Button>
                  <Button
                    type="submit"
                    isLoading={isLoading}
                    isDisabled={isLoading || isCollecting}
                    colorScheme="blue"
                    w="full"
                  >
                    {isLoading ? 'Adding...' : 'Add Soldier'}
                  </Button>
                </Stack>
              </Stack>
            </form>
          </Box>
          {/* Train Model Button (Outside Form) */}
          <Box bg={'white'} p={6} rounded="lg" shadow="md" maxW="md">
            <Heading as="h2" size="md" mb={4}>Model Training</Heading>
            <Button
              onClick={handleTrainModel}
              isLoading={isTraining}
              isDisabled={isTraining}
              colorScheme="yellow"
              w="full"
            >
              {isTraining ? 'Training Model...' : 'Train Model'}
            </Button>
          </Box>
        </Stack>
      </Box>
        {/* Modal Components */}
        <Modal
            isOpen={showSuccessModal}
            onClose={() => setShowSuccessModal(false)}
            title={modalTitle}
            type="success"
        >
            <p className="text-gray-600">{modalMessage}</p>
        </Modal>

        <ErrorModal
            isOpen={showErrorModal}
            onClose={() => setShowErrorModal(false)}
            title={modalTitle}
            message={modalMessage}
            onRetry={() => setShowErrorModal(false)}
        />

        <InfoModal
            isOpen={showInfoModal}
            onClose={() => setShowInfoModal(false)}
            title={modalTitle}
            message={modalMessage}
        />

        <LoadingModal
            isOpen={showLoadingModal}
            title={modalTitle}
            message={modalMessage}
        />
    </div>
);
};

export default AddSoldier;

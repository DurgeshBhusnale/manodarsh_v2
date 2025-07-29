import React from 'react';
import Modal from './Modal';
import { Button, Stack, Text } from '@chakra-ui/react';

interface InfoModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    message: string;
    type?: 'success' | 'error' | 'warning' | 'info';
    icon?: string;
    buttonText?: string;
}

const InfoModal: React.FC<InfoModalProps> = ({
    isOpen,
    onClose,
    title,
    message,
    type = 'info',
    icon,
    buttonText = 'OK'
}) => {
    const getDefaultIcon = () => {
        switch (type) {
            case 'success':
                return '✅';
            case 'error':
                return '❌';
            case 'warning':
                return '⚠️';
            default:
                return 'ℹ️';
        }
    };

    const getButtonColor = () => {
        switch (type) {
            case 'success':
                return 'green';
            case 'error':
                return 'red';
            case 'warning':
                return 'yellow';
            default:
                return 'blue';
        }
    };

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            title={title}
            type={type}
            showCloseButton={false}
        >
            <Stack spacing={6} align="center">
                <Text fontSize="6xl" mb={2}>{icon || getDefaultIcon()}</Text>
                <Text color="gray.700" fontSize="lg" textAlign="center">{message}</Text>
                <Button colorScheme={getButtonColor()} px={8} py={2} rounded="lg" onClick={onClose}>
                    {buttonText}
                </Button>
            </Stack>
        </Modal>
    );
};

export default InfoModal;

import React from 'react';
import { Box, Text, Flex, IconButton } from '@chakra-ui/react';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    type?: 'success' | 'error' | 'warning' | 'info';
    showCloseButton?: boolean;
}

const Modal: React.FC<ModalProps> = ({
    isOpen,
    onClose,
    title,
    children,
    type = 'info',
    showCloseButton = true
}) => {
    const getTypeStyles = () => {
        switch (type) {
            case 'success':
                return {
                    color: 'green.600',
                    icon: '✅',
                    bg: 'green.50'
                };
            case 'error':
                return {
                    color: 'red.600',
                    icon: '❌',
                    bg: 'red.50'
                };
            case 'warning':
                return {
                    color: 'yellow.600',
                    icon: '⚠️',
                    bg: 'yellow.50'
                };
            default:
                return {
                    color: 'blue.600',
                    icon: 'ℹ️',
                    bg: 'blue.50'
                };
        }
    };

    const styles = getTypeStyles();

    if (!isOpen) return null;

    return (
        <Box position="fixed" top={0} left={0} w="100vw" h="100vh" bg="blackAlpha.600" zIndex={1400} display="flex" alignItems="center" justifyContent="center">
            <Box bg={styles.bg} maxW="md" w="100%" borderRadius="lg" boxShadow="lg" p={0}>
                <Box px={6} py={4} borderTopRadius="lg" borderBottom="1px" borderColor="gray.200">
                    <Flex align="center" justify="space-between">
                        <Flex align="center" gap={3}>
                            <Text fontSize="2xl" color={styles.color}>{styles.icon}</Text>
                            <Text as="span" fontWeight="semibold" fontSize="lg" color={styles.color}>{title}</Text>
                        </Flex>
                        {showCloseButton && (
                            <IconButton aria-label="Close modal" icon={<span>&times;</span>} size="sm" variant="ghost" color="gray.400" onClick={onClose} />
                        )}
                    </Flex>
                </Box>
                <Box px={6} py={4} color={'gray.700'}>
                    {children}
                </Box>
            </Box>
        </Box>
    );
};

export default Modal;

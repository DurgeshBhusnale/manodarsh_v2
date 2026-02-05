import axios from 'axios';

/**
 * Heartbeat service to keep session alive and detect browser closure
 */
class HeartbeatService {
    private baseUrl = 'http://localhost:5000/api/auth';
    private heartbeatInterval: NodeJS.Timeout | null = null;
    private isActive = false;

    constructor() {
        // Configure axios to include credentials
        axios.defaults.withCredentials = true;
    }

    /**
     * Start sending heartbeats every 10 seconds
     */
    start(): void {
        if (this.isActive) {
            console.log('Heartbeat already running');
            return;
        }

        this.isActive = true;
        console.log('Starting heartbeat service...');

        // Send initial heartbeat
        this.sendHeartbeat();

        // Send heartbeat every 10 seconds
        this.heartbeatInterval = setInterval(() => {
            this.sendHeartbeat();
        }, 10000); // 10 seconds
    }

    /**
     * Stop sending heartbeats
     */
    stop(): void {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
        this.isActive = false;
        console.log('Heartbeat service stopped');
    }

    /**
     * Send a single heartbeat to backend
     */
    private async sendHeartbeat(): Promise<void> {
        try {
            await axios.post(`${this.baseUrl}/heartbeat`, {}, {
                timeout: 5000 // 5 second timeout
            });
            // Heartbeat successful (silent)
        } catch (error: any) {
            // If 401, session expired - stop heartbeat
            if (error.response?.status === 401) {
                console.warn('Heartbeat failed: Session expired');
                this.stop();
                // Trigger logout/redirect
                this.handleSessionLost();
            } else {
                // Network error or other issue - log but continue
                console.error('Heartbeat error:', error.message);
            }
        }
    }

    /**
     * Handle session loss (redirect to login)
     */
    private handleSessionLost(): void {
        localStorage.clear();
        sessionStorage.clear();
        
        // Only redirect if not already on login page
        if (!window.location.pathname.includes('/login')) {
            window.location.href = '/login';
        }
    }

    /**
     * Notify backend that browser is closing
     * Use with navigator.sendBeacon for reliability
     */
    notifyBrowserClosing(): void {
        const url = `${this.baseUrl}/browser-closed`;
        
        // Try sendBeacon first (most reliable)
        if (navigator.sendBeacon) {
            const success = navigator.sendBeacon(url, JSON.stringify({}));
            if (success) {
                console.log('Browser close notification sent via sendBeacon');
                return;
            }
        }
        
        // Fallback: synchronous XHR (will be deprecated but still works)
        try {
            const xhr = new XMLHttpRequest();
            xhr.open('POST', url, false); // synchronous
            xhr.withCredentials = true;
            xhr.setRequestHeader('Content-Type', 'application/json');
            xhr.send(JSON.stringify({}));
            console.log('Browser close notification sent via XHR');
        } catch (error) {
            console.error('Failed to notify browser closing:', error);
        }
    }
}

export const heartbeatService = new HeartbeatService();

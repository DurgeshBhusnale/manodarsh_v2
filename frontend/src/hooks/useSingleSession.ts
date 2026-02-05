import { useState, useEffect, useCallback, useRef } from 'react';

const SESSION_KEY = 'sathi_active_session';
const CHANNEL_NAME = 'sathi_session_channel';

interface SessionState {
  isConflict: boolean;
  isLoading: boolean;
  sessionId: string;
}

interface UseSingleSessionReturn extends SessionState {
  closeThisWindow: () => void;
  takeOverSession: () => void;
}

type MessageType = 'new_session' | 'session_exists' | 'take_over' | 'close_session';

interface SessionMessage {
  type: MessageType;
  sessionId: string;
  timestamp: number;
}

/**
 * Custom hook for single-session management.
 * Uses BroadcastChannel API to detect and manage multiple tabs/windows.
 */
export function useSingleSession(): UseSingleSessionReturn {
  const [state, setState] = useState<SessionState>({
    isConflict: false,
    isLoading: true,
    sessionId: '',
  });

  const channelRef = useRef<BroadcastChannel | null>(null);
  const sessionIdRef = useRef<string>('');
  const isPrimaryRef = useRef<boolean>(false);

  // Generate a unique session ID
  const generateSessionId = useCallback((): string => {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }, []);

  // Close this window/tab
  const closeThisWindow = useCallback(() => {
    // Notify other sessions that we're closing
    if (channelRef.current && sessionIdRef.current) {
      channelRef.current.postMessage({
        type: 'close_session',
        sessionId: sessionIdRef.current,
        timestamp: Date.now(),
      } as SessionMessage);
    }

    // Clear our session from storage if we're primary
    if (isPrimaryRef.current) {
      localStorage.removeItem(SESSION_KEY);
    }

    // Close the window/tab
    window.close();

    // If window.close() doesn't work (some browsers block it),
    // redirect to a blank page
    setTimeout(() => {
      window.location.href = 'about:blank';
    }, 100);
  }, []);

  // Take over the session (become primary, force others to close)
  const takeOverSession = useCallback(() => {
    const sessionId = sessionIdRef.current;

    // Broadcast to all other tabs that we're taking over
    if (channelRef.current) {
      channelRef.current.postMessage({
        type: 'take_over',
        sessionId,
        timestamp: Date.now(),
      } as SessionMessage);
    }

    // Update localStorage to mark us as primary
    localStorage.setItem(SESSION_KEY, sessionId);
    isPrimaryRef.current = true;

    // Clear the conflict state
    setState((prev) => ({
      ...prev,
      isConflict: false,
    }));
  }, []);

  useEffect(() => {
    // Generate session ID for this tab
    const sessionId = generateSessionId();
    sessionIdRef.current = sessionId;

    setState((prev) => ({ ...prev, sessionId }));

    // Create BroadcastChannel for cross-tab communication
    try {
      channelRef.current = new BroadcastChannel(CHANNEL_NAME);
    } catch {
      // BroadcastChannel not supported, fall back to localStorage only
      console.warn('BroadcastChannel not supported, using localStorage fallback');
    }

    // Check if another session already exists
    const existingSession = localStorage.getItem(SESSION_KEY);
    const hasExistingSession = existingSession && existingSession !== sessionId;

    if (hasExistingSession) {
      // Another session exists - show conflict
      setState((prev) => ({
        ...prev,
        isConflict: true,
        isLoading: false,
      }));

      // Notify the existing session that a new tab tried to open
      if (channelRef.current) {
        channelRef.current.postMessage({
          type: 'new_session',
          sessionId,
          timestamp: Date.now(),
        } as SessionMessage);
      }
    } else {
      // No existing session - we become primary
      localStorage.setItem(SESSION_KEY, sessionId);
      isPrimaryRef.current = true;
      setState((prev) => ({
        ...prev,
        isConflict: false,
        isLoading: false,
      }));
    }

    // Handle messages from other tabs
    const handleMessage = (event: MessageEvent<SessionMessage>) => {
      const { type, sessionId: messageSessionId } = event.data;

      switch (type) {
        case 'new_session':
          // Another tab is trying to open - respond that we exist
          if (isPrimaryRef.current && channelRef.current) {
            channelRef.current.postMessage({
              type: 'session_exists',
              sessionId: sessionIdRef.current,
              timestamp: Date.now(),
            } as SessionMessage);
          }
          break;

        case 'session_exists':
          // Another session responded - we have a conflict
          if (messageSessionId !== sessionIdRef.current) {
            setState((prev) => ({
              ...prev,
              isConflict: true,
              isLoading: false,
            }));
          }
          break;

        case 'take_over':
          // Another tab is taking over - we should close
          if (messageSessionId !== sessionIdRef.current && isPrimaryRef.current) {
            isPrimaryRef.current = false;
            // Close this window since another session took over
            closeThisWindow();
          }
          break;

        case 'close_session':
          // Another session closed - if we're in conflict, we can resolve it
          if (messageSessionId !== sessionIdRef.current) {
            const currentPrimary = localStorage.getItem(SESSION_KEY);
            if (currentPrimary === messageSessionId || !currentPrimary) {
              // The primary session closed - we can become primary
              localStorage.setItem(SESSION_KEY, sessionIdRef.current);
              isPrimaryRef.current = true;
              setState((prev) => ({
                ...prev,
                isConflict: false,
              }));
            }
          }
          break;
      }
    };

    if (channelRef.current) {
      channelRef.current.addEventListener('message', handleMessage);
    }

    // Handle storage events for cross-tab sync (fallback)
    const handleStorage = (event: StorageEvent) => {
      if (event.key === SESSION_KEY) {
        const newValue = event.newValue;
        if (newValue && newValue !== sessionIdRef.current) {
          // Another session became primary
          if (isPrimaryRef.current) {
            // We were primary but now another session is - we have a conflict
            isPrimaryRef.current = false;
            setState((prev) => ({
              ...prev,
              isConflict: true,
            }));
          }
        } else if (!newValue && !isPrimaryRef.current) {
          // Session was cleared - we can become primary
          localStorage.setItem(SESSION_KEY, sessionIdRef.current);
          isPrimaryRef.current = true;
          setState((prev) => ({
            ...prev,
            isConflict: false,
          }));
        }
      }
    };

    window.addEventListener('storage', handleStorage);

    // Cleanup on unmount
    return () => {
      if (channelRef.current) {
        channelRef.current.removeEventListener('message', handleMessage);
        channelRef.current.close();
      }
      window.removeEventListener('storage', handleStorage);

      // Clear session if we're primary and the tab is closing
      if (isPrimaryRef.current) {
        localStorage.removeItem(SESSION_KEY);
      }
    };
  }, [generateSessionId, closeThisWindow]);

  // Handle tab/window close - clear session if we're primary
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (isPrimaryRef.current) {
        localStorage.removeItem(SESSION_KEY);

        // Notify other tabs
        if (channelRef.current) {
          channelRef.current.postMessage({
            type: 'close_session',
            sessionId: sessionIdRef.current,
            timestamp: Date.now(),
          } as SessionMessage);
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  return {
    ...state,
    closeThisWindow,
    takeOverSession,
  };
}

export default useSingleSession;

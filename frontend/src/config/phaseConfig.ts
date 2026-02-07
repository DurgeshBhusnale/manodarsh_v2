/**
 * PHASE CONFIGURATION FOR SATHI PORTAL
 * 
 * This file controls feature flags for different deployment phases.
 * Currently in PHASE 1: Manual logout only, no automatic session management.
 */

export const PHASE_CONFIG = {
  CURRENT_PHASE: 1,
  
  PHASE_1: {
    MANUAL_LOGOUT_ONLY: true,
    AUTO_SESSION_TIMEOUT: false,
    SESSION_MONITORING: false,
    HEARTBEAT_SERVICE: false,
    MULTI_TAB_DETECTION: true, // Enable single tab only
    BROWSER_CLOSE_DETECTION: true, // Clear session on browser close
    AUTO_LOGOUT_ON_401: false, // Do NOT auto-logout on 401 errors
    USE_SESSION_STORAGE: true, // Use sessionStorage instead of localStorage
  },
  
  PHASE_2: {
    MANUAL_LOGOUT_ONLY: false,
    AUTO_SESSION_TIMEOUT: true,
    SESSION_MONITORING: true,
    HEARTBEAT_SERVICE: true,
    MULTI_TAB_DETECTION: true,
    BROWSER_CLOSE_DETECTION: true,
    AUTO_LOGOUT_ON_401: true,
    USE_SESSION_STORAGE: false,
  }
};

export const isPhase1 = () => PHASE_CONFIG.CURRENT_PHASE === 1;
export const isPhase2 = () => PHASE_CONFIG.CURRENT_PHASE === 2;

// Get current phase features
export const getPhaseFeatures = () => {
  return PHASE_CONFIG.CURRENT_PHASE === 1 ? PHASE_CONFIG.PHASE_1 : PHASE_CONFIG.PHASE_2;
};

// Log current phase on import (for debugging)
console.log(`🚀 SATHI Portal - Running PHASE ${PHASE_CONFIG.CURRENT_PHASE}`);
console.log('Phase Features:', getPhaseFeatures());

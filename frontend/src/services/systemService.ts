class SystemService {
  private baseUrl = 'http://localhost:5000/api/system';

  async heartbeat(sessionId: string): Promise<void> {
    try {
      await fetch(`${this.baseUrl}/heartbeat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ session_id: sessionId }),
      });
    } catch (error) {
      // Best-effort heartbeat
    }
  }

  shutdown(reason = 'window_closed'): void {
    const payload = JSON.stringify({ reason });
    const url = `${this.baseUrl}/shutdown`;

    if (navigator.sendBeacon) {
      const blob = new Blob([payload], { type: 'application/json' });
      navigator.sendBeacon(url, blob);
      return;
    }

    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      keepalive: true,
      body: payload,
    }).catch(() => {
      // Best-effort shutdown
    });
  }
}

export const systemService = new SystemService();

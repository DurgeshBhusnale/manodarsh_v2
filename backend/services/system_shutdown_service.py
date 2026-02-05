import os
import threading
import time
from pathlib import Path
from typing import Optional
from urllib.parse import urlparse

import psutil

from config.settings import settings


class SystemShutdownService:
    def __init__(self, pid_file: Path, frontend_port: int, backend_port: int, timeout_seconds: int = 15):
        self.pid_file = pid_file
        self.frontend_port = frontend_port
        self.backend_port = backend_port
        self.timeout_seconds = timeout_seconds
        self._last_heartbeat = time.time()
        self._last_session_id: Optional[str] = None
        self._lock = threading.Lock()
        self._shutdown_requested = threading.Event()
        self._watchdog_thread = threading.Thread(target=self._watchdog_loop, daemon=True)
        self._watchdog_thread.start()

    def record_heartbeat(self, session_id: str) -> None:
        with self._lock:
            self._last_heartbeat = time.time()
            self._last_session_id = session_id

    def request_shutdown(self, reason: str = "") -> None:
        if self._shutdown_requested.is_set():
            return
        self._shutdown_requested.set()
        thread = threading.Thread(target=self._shutdown_processes, args=(reason,), daemon=True)
        thread.start()

    def _watchdog_loop(self) -> None:
        while not self._shutdown_requested.is_set():
            time.sleep(2)
            with self._lock:
                elapsed = time.time() - self._last_heartbeat
            if elapsed > self.timeout_seconds:
                self.request_shutdown("heartbeat_timeout")
                return

    def _shutdown_processes(self, reason: str) -> None:
        time.sleep(0.5)
        current_pid = os.getpid()

        # Try PID file first
        if self.pid_file.exists():
            try:
                import json
                with open(self.pid_file, 'r') as f:
                    pids = json.load(f)

                frontend_pid = pids.get('frontend')
                backend_pid = pids.get('backend')

                if frontend_pid:
                    self._terminate_pid(frontend_pid, current_pid)

                if backend_pid and backend_pid != current_pid:
                    self._terminate_pid(backend_pid, current_pid)

            except Exception:
                pass

        # Fallback: kill processes on known ports
        for port in [self.frontend_port, self.backend_port]:
            pid = self._pid_for_port(port)
            if pid and pid != current_pid:
                self._terminate_pid(pid, current_pid)

        # Remove PID file if present
        try:
            if self.pid_file.exists():
                self.pid_file.unlink()
        except Exception:
            pass

        # Exit current backend process last
        os._exit(0)

    def _terminate_pid(self, pid: int, current_pid: int) -> bool:
        if pid == current_pid:
            return False
        try:
            proc = psutil.Process(pid)
            proc.terminate()
            try:
                proc.wait(timeout=3)
            except psutil.TimeoutExpired:
                proc.kill()
            return True
        except Exception:
            return False

    def _pid_for_port(self, port: int) -> Optional[int]:
        try:
            for conn in psutil.net_connections(kind='tcp'):
                if conn.laddr and conn.laddr.port == port and conn.pid:
                    return conn.pid
        except Exception:
            return None
        return None


_service_instance: Optional[SystemShutdownService] = None


def _get_frontend_port() -> int:
    try:
        url = urlparse(settings.FRONTEND_URL)
        if url.port:
            return url.port
    except Exception:
        pass
    return 3000


def get_system_shutdown_service() -> SystemShutdownService:
    global _service_instance
    if _service_instance is None:
        project_root = Path(__file__).resolve().parent.parent.parent
        pid_file = project_root / 'deployment' / 'system.pid'
        _service_instance = SystemShutdownService(
            pid_file=pid_file,
            frontend_port=_get_frontend_port(),
            backend_port=settings.BACKEND_PORT,
            timeout_seconds=15,
        )
    return _service_instance

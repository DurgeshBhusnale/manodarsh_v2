from datetime import datetime, time
import logging
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from services.cctv_monitoring_service import CCTVMonitoringService

class MonitoringScheduler:
    def __init__(self):
        self.scheduler = BackgroundScheduler()
        self.monitoring_service = CCTVMonitoringService()
        self.setup_logging()
        self._configure_schedules()

    def setup_logging(self):
        logging.basicConfig(
            filename="scheduler.log",
            level=logging.DEBUG,
            format='%(asctime)s - %(levelname)s - %(message)s'
        )

    def _configure_schedules(self):
        """Configure daily monitoring schedules"""
        # Start monitoring at 9 AM every day
        self.scheduler.add_job(
            self._start_daily_monitoring,
            CronTrigger(hour=9, minute=0),
            id='start_monitoring'
        )

        # End monitoring at 5 PM every day
        self.scheduler.add_job(
            self._end_daily_monitoring,
            CronTrigger(hour=17, minute=0),
            id='end_monitoring'
        )

    def _start_daily_monitoring(self):
        """Start daily monitoring automatically"""
        try:
            today = datetime.now().date()
            success = self.monitoring_service.start_monitoring(str(today))
            if success:
                logging.info(f"Started daily monitoring for {today}")
            else:
                logging.error(f"Failed to start monitoring for {today}")
        except Exception as e:
            logging.error(f"Error in auto-start monitoring: {e}")

    def _end_daily_monitoring(self):
        """End daily monitoring automatically"""
        try:
            today = datetime.now().date()
            if self.monitoring_service.stop_monitoring():
                if self.monitoring_service.calculate_daily_scores(str(today)):
                    logging.info(f"Ended monitoring and calculated scores for {today}")
                else:
                    logging.error(f"Failed to calculate scores for {today}")
            else:
                logging.error(f"Failed to stop monitoring for {today}")
        except Exception as e:
            logging.error(f"Error in auto-end monitoring: {e}")

    def start(self):
        """Start the scheduler"""
        try:
            self.scheduler.start()
            logging.info("Monitoring scheduler started")
        except Exception as e:
            logging.error(f"Error starting scheduler: {e}")

    def stop(self):
        """Stop the scheduler"""
        try:
            self.scheduler.shutdown()
            logging.info("Monitoring scheduler stopped")
        except Exception as e:
            logging.error(f"Error stopping scheduler: {e}")

    def get_next_run_time(self, job_id: str) -> datetime:
        """Get next scheduled run time for a job"""
        job = self.scheduler.get_job(job_id)
        return job.next_run_time if job else None

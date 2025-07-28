from flask import Blueprint, request, jsonify
from db.connection import get_connection
from config.settings import settings
import logging
from datetime import datetime, timedelta

notification_bp = Blueprint('notifications', __name__)
logger = logging.getLogger(__name__)

class NotificationService:
    """Enhanced notification system for mental health alerts"""
    
    def __init__(self):
        self.alert_thresholds = {
            'CRITICAL': settings.RISK_THRESHOLDS['CRITICAL'],
            'HIGH': settings.RISK_THRESHOLDS['HIGH'],
            'MEDIUM': settings.RISK_THRESHOLDS['MEDIUM'],
            'LOW': settings.RISK_THRESHOLDS['LOW']
        }
    
    def check_risk_escalation(self, soldier_data):
        """Check if a soldier's risk level requires immediate notification"""
        current_score = soldier_data.get('combined_score', 0)
        force_id = soldier_data.get('force_id')
        
        if current_score >= self.alert_thresholds['CRITICAL']:
            self.create_notification(
                force_id=force_id,
                notification_type='CRITICAL_ALERT',
                title='Critical Mental Health Alert',
                message=f'Soldier {force_id} requires immediate intervention (Score: {current_score:.3f})',
                priority='CRITICAL'
            )
        elif current_score >= self.alert_thresholds['HIGH']:
            self.create_notification(
                force_id=force_id,
                notification_type='HIGH_RISK',
                title='High Risk Mental Health Alert',
                message=f'Soldier {force_id} shows high risk indicators (Score: {current_score:.3f})',
                priority='HIGH'
            )
    
    def create_notification(self, force_id, notification_type, title, message, priority='MEDIUM'):
        """Create a new notification in the database"""
        try:
            conn = get_connection()
            cursor = conn.cursor()
            
            cursor.execute("""
                INSERT INTO notifications 
                (force_id, notification_type, title, message, priority, created_at, is_read)
                VALUES (%s, %s, %s, %s, %s, NOW(), FALSE)
            """, (force_id, notification_type, title, message, priority))
            
            conn.commit()
            logger.info(f"Created {priority} notification for soldier {force_id}")
            
        except Exception as e:
            logger.error(f"Error creating notification: {e}")
            if conn:
                conn.rollback()
        finally:
            if conn:
                conn.close()

@notification_bp.route('/notifications', methods=['GET'])
def get_notifications():
    """Get notifications with pagination"""
    try:
        page = int(request.args.get('page', 1))
        per_page = min(int(request.args.get('per_page', settings.DEFAULT_PAGE_SIZE)), settings.MAX_PAGE_SIZE)
        unread_only = request.args.get('unread_only', 'false').lower() == 'true'
        
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        
        # Build query conditions
        where_clause = ""
        params = []
        
        if unread_only:
            where_clause = "WHERE is_read = FALSE"
        
        # Get total count
        count_query = f"SELECT COUNT(*) as total FROM notifications {where_clause}"
        cursor.execute(count_query, params)
        total = cursor.fetchone()['total']
        
        # Get notifications
        offset = (page - 1) * per_page
        query = f"""
            SELECT 
                notification_id,
                force_id,
                notification_type,
                title,
                message,
                priority,
                created_at,
                is_read
            FROM notifications 
            {where_clause}
            ORDER BY created_at DESC 
            LIMIT %s OFFSET %s
        """
        
        cursor.execute(query, params + [per_page, offset])
        notifications = cursor.fetchall()
        
        return jsonify({
            'success': True,
            'notifications': notifications,
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': total,
                'pages': (total + per_page - 1) // per_page
            }
        })
        
    except Exception as e:
        logger.error(f"Error fetching notifications: {e}")
        return jsonify({'error': str(e)}), 500
    finally:
        if conn:
            conn.close()

@notification_bp.route('/notifications/<int:notification_id>/read', methods=['PUT'])
def mark_notification_read(notification_id):
    """Mark a notification as read"""
    try:
        conn = get_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            UPDATE notifications 
            SET is_read = TRUE, read_at = NOW()
            WHERE notification_id = %s
        """, (notification_id,))
        
        conn.commit()
        
        return jsonify({
            'success': True,
            'message': 'Notification marked as read'
        })
        
    except Exception as e:
        logger.error(f"Error marking notification as read: {e}")
        return jsonify({'error': str(e)}), 500
    finally:
        if conn:
            conn.close()

@notification_bp.route('/notifications/mark-all-read', methods=['POST'])
def mark_all_notifications_read():
    """Mark all notifications as read"""
    try:
        conn = get_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            UPDATE notifications 
            SET is_read = TRUE, read_at = NOW()
            WHERE is_read = FALSE
        """)
        
        affected_rows = cursor.rowcount
        conn.commit()
        
        return jsonify({
            'success': True,
            'message': f'Marked {affected_rows} notifications as read'
        })
        
    except Exception as e:
        logger.error(f"Error marking all notifications as read: {e}")
        return jsonify({'error': str(e)}), 500
    finally:
        if conn:
            conn.close()

@notification_bp.route('/notifications/stats', methods=['GET'])
def get_notification_stats():
    """Get notification statistics"""
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        
        # Get unread count by priority
        cursor.execute("""
            SELECT 
                priority,
                COUNT(*) as count
            FROM notifications 
            WHERE is_read = FALSE 
            GROUP BY priority
        """)
        unread_by_priority = cursor.fetchall()
        
        # Get recent activity (last 24 hours)
        cursor.execute("""
            SELECT COUNT(*) as count
            FROM notifications 
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
        """)
        recent_activity = cursor.fetchone()['count']
        
        # Get total unread
        cursor.execute("""
            SELECT COUNT(*) as count
            FROM notifications 
            WHERE is_read = FALSE
        """)
        total_unread = cursor.fetchone()['count']
        
        return jsonify({
            'success': True,
            'stats': {
                'total_unread': total_unread,
                'recent_activity': recent_activity,
                'unread_by_priority': unread_by_priority
            }
        })
        
    except Exception as e:
        logger.error(f"Error fetching notification stats: {e}")
        return jsonify({'error': str(e)}), 500
    finally:
        if conn:
            conn.close()

# Global notification service instance
notification_service = NotificationService()

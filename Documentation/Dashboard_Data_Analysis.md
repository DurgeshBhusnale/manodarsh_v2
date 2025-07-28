# CRPF Mental Health Monitoring System - Dashboard Data Analysis

## Dashboard Data Sources Overview

### Current Data Implementation Status

The dashboard displays a **combination of real database data and fallback mock data**. Here's the detailed breakdown:

## Data Sources Analysis

### 1. **Real Database Data (Primary Source)**

The dashboard **primarily uses real data** from the following database tables:

#### **Database Tables Used:**

- `users` - For total soldier count
- `questionnaires` - For active survey count
- `weekly_sessions` - For mental health scores and completion rates
- `question_responses` - For detailed response analysis

#### **Real Statistics Calculated:**

1. **Total Soldiers Count** ✅ REAL DATA

   - Source: `SELECT COUNT(*) FROM users WHERE user_type = 'soldier'`
   - Shows actual number of soldiers registered in system

2. **Active Surveys Count** ✅ REAL DATA

   - Source: `SELECT COUNT(*) FROM questionnaires WHERE status = 'Active'`
   - Shows actual active questionnaires

3. **High Risk Soldiers** ✅ REAL DATA

   - Calculated from `weekly_sessions.combined_avg_score`
   - Uses configurable risk thresholds from settings
   - Based on latest mental health scores per soldier

4. **Critical Alerts** ✅ REAL DATA

   - Calculated from soldiers with scores above critical threshold
   - Uses dynamic threshold from configuration system

5. **Survey Completion Rate** ✅ REAL DATA

   - Source: `weekly_sessions` table
   - Calculates percentage of completed vs total sessions
   - Filtered by selected timeframe (7d, 30d, 90d)

6. **Average Mental Health Score** ✅ REAL DATA

   - Calculated from all soldiers' latest `combined_avg_score`
   - Only includes soldiers with actual assessment data

7. **Trends Data (Charts)** ✅ REAL DATA
   - 7-day trend analysis from `weekly_sessions`
   - Risk level distribution over time
   - Uses configurable risk thresholds

### 2. **Mock Data (Fallback Only)**

Mock data is **only used as fallback** when:

- API call fails
- Database connection issues
- No real data available yet

#### **Mock Data Values:**

```javascript
{
    totalSoldiers: 150,
    activeSurveys: 12,
    highRiskSoldiers: 8,
    criticalAlerts: 2,
    surveyCompletionRate: 85.5,
    averageMentalHealthScore: 0.35,
    // Mock trends for past 7 days
}
```

## Sample Data in Database

### **Dummy Data Available:**

The system includes dummy data for testing via `insert_dummy_data.py`:

#### **Dummy Users:**

- **Admin:** Force ID `200000001` (password: `admin123`)
- **Soldiers:**
  - `100000001` (password: `soldier123`)
  - `100000002` (password: `soldier234`)
  - `100000003` (password: `soldier345`)

#### **Dummy Sessions:**

- 3 completed weekly sessions with scores
- Mental health scores ranging from 0.5-0.7
- Question responses with sentiment analysis scores
- CCTV monitoring data for past 3 days

### **Production Data:**

In production, the dashboard will show:

- **Real soldier enrollment data**
- **Actual survey responses and mental health assessments**
- **Genuine risk calculations based on NLP and emotion analysis**
- **True completion rates and trends**

## Data Flow Architecture

### **Frontend Dashboard → Backend API → Database**

```
Dashboard Component
    ↓
fetchDashboardStats()
    ↓
apiService.getDashboardStats(timeframe)
    ↓
GET /api/admin/dashboard-stats
    ↓
Real database queries
    ↓
JSON response with real statistics
```

### **Configuration Integration:**

The dashboard uses **dynamic configuration** from the settings system:

- **Risk Thresholds:** Uses `settings.RISK_THRESHOLDS` for calculating risk levels
- **Scoring Weights:** Reflects actual NLP/Emotion weight configuration
- **Timeframe Filtering:** Supports 7d, 30d, 90d periods

## Current Data Status

### **If You See Mock Data:**

This means either:

1. Database is empty (no soldiers/surveys added yet)
2. API endpoint not accessible
3. Database connection issues

### **If You See Real Data:**

The numbers reflect:

1. **Actual soldier registrations** in the system
2. **Real survey submissions** and mental health assessments
3. **Genuine risk calculations** based on current thresholds
4. **True completion rates** and trends

## Adding Real Data

### **To Populate with Real Data:**

1. **Run Dummy Data Script:**

   ```bash
   cd backend
   python insert_dummy_data.py
   ```

2. **Register Real Soldiers:**

   - Use admin interface to add soldiers
   - Each soldier gets real Force ID and credentials

3. **Conduct Real Surveys:**

   - Soldiers complete actual mental health questionnaires
   - NLP analysis processes real text responses
   - Emotion detection (if enabled) provides additional data

4. **View Real Dashboard:**
   - Dashboard automatically shows real statistics
   - All calculations based on actual data
   - Trends reflect genuine mental health patterns

## Data Accuracy

### **Real-time Updates:**

- Dashboard refreshes every 5 minutes automatically
- Manual refresh available
- Statistics update immediately after new survey submissions

### **Risk Level Calculations:**

- Based on configurable thresholds in admin settings
- Uses weighted scoring (NLP + Emotion detection)
- Reflects current mental health assessment methodology

### **Trend Analysis:**

- Shows actual patterns over selected timeframe
- Useful for identifying mental health trends
- Supports operational decision-making

## Summary

**The dashboard is designed to show REAL DATA from your database.**

- ✅ All statistics come from actual database queries
- ✅ Risk calculations use current configuration settings
- ✅ Trends reflect genuine mental health assessment data
- ⚠️ Mock data only appears as fallback during errors
- 📊 With proper data entry, dashboard shows authentic insights

The system is **production-ready** and will display real mental health monitoring statistics once soldiers are registered and surveys are conducted.

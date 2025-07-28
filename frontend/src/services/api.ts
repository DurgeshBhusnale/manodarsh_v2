import axios from 'axios';
import { authService } from './authService';

// Translate Hindi answer to English
export interface TranslateAnswerResponse {
    english_text: string;
}

export const translateAnswer = (data: { answer_text: string }) =>
    api.post<TranslateAnswerResponse>('/admin/translate-answer', data);

// Translate question to Hindi
export interface TranslateQuestionResponse {
    hindi_text: string;
}

export const translateQuestion = (question_text: string) =>
    api.post<TranslateQuestionResponse>('/admin/translate-question', { question_text });

const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
    baseURL: BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

export interface SoldierData {
    force_id: string;
    password: string;
}

export interface QuestionnaireData {
    title: string;
    description: string;
    isActive: boolean;
    numberOfQuestions: number;
}

export interface QuestionData {
    questionnaire_id: number;
    question_text: string;
    question_text_hindi: string;
}

export const apiService = {
    // Authentication
    login: (force_id: string, password: string) => 
        authService.login(force_id, password),

    // Soldier credential verification (for questionnaires)
    verifySoldier: (force_id: string, password: string) =>
        authService.verifySoldier(force_id, password),

    // Soldier endpoints
    startSurvey: () => 
        api.post('/survey/start'),

    // Admin endpoints
    addSoldier: (data: SoldierData) => 
        api.post('/admin/add-soldier', data),
    
    collectImages: (force_id: string) => 
        api.post('/image/capture', { force_id }),
    
    trainModel: (force_id: string) => 
        api.post('/image/train', { force_id }),
    
    
    getSoldiersData: (params?: {
        risk_level?: string;
        days?: string;
        page?: number;
        per_page?: number;
    }) => {
        const queryParams = new URLSearchParams();
        if (params?.risk_level) queryParams.append('risk_level', params.risk_level);
        if (params?.days) queryParams.append('days', params.days);
        if (params?.page) queryParams.append('page', params.page.toString());
        if (params?.per_page) queryParams.append('per_page', params.per_page.toString());
        
        return api.get(`/admin/soldiers-report?${queryParams.toString()}`);
    },
    
    getAdminStats: () => 
        api.get('/admin/stats'),

    // System Settings Management
    getSystemSettings: () =>
        api.get('/admin/system-settings'),
    
    updateSystemSettings: (data: { settings: any }) =>
        api.post('/admin/system-settings', data),
    
    getSettingsCategories: () =>
        api.get('/admin/settings-categories'),
    
    resetSystemSettings: () =>
        api.post('/admin/reset-settings'),
    
    backupSystemSettings: () =>
        api.get('/admin/backup-settings'),
    
    restoreSystemSettings: (data: { backup: any }) =>
        api.post('/admin/restore-settings', data),

    // Enhanced Dashboard Analytics
    getDashboardStats: (timeframe?: string) =>
        api.get(`/admin/dashboard-stats${timeframe ? `?timeframe=${timeframe}` : ''}`),
    
    getRiskTrends: (period?: string) =>
        api.get(`/admin/risk-trends${period ? `?period=${period}` : ''}`),

    // New Questionnaire endpoints
    createQuestionnaire: (data: QuestionnaireData) =>
        api.post('/admin/create-questionnaire', data),

    addQuestion: (data: QuestionData) =>
        api.post('/admin/add-question', data),
    translateQuestion,

    // Daily Emotion Detection endpoints
    startDailyMonitoring: (date: string) =>
        api.post('/image/start-monitoring', { date }),

    endDailyMonitoring: (date: string) =>
        api.post('/image/end-monitoring', { date }),

    // Survey endpoints
    getActiveQuestionnaire: () =>
        api.get('/survey/active-questionnaire'),
    
    submitSurvey: (data: { 
        questionnaire_id: number, 
        responses: { question_id: number, answer_text: string }[], 
        force_id: string,
        password: string 
    }) =>
        api.post('/survey/submit', data),

    // Survey emotion monitoring endpoints
    startSurveyEmotionMonitoring: (force_id: string) =>
        api.post('/image/start-survey-monitoring', { force_id }),

    endSurveyEmotionMonitoring: (force_id: string, session_id?: number) =>
        api.post('/image/end-survey-monitoring', { force_id, session_id }),

    // Advanced search functionality
    searchSoldiers: (searchTerm: string, filters: any) =>
        api.post('/admin/search-soldiers', { searchTerm, filters }),

    translateAnswer
};

export default apiService;

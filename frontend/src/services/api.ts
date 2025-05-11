import axios from 'axios';

const BASE_URL = 'http://localhost:5000/api';

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
}

export interface QuestionData {
    questionnaire_id: number;
    question_text: string;
}

export const apiService = {
    // Authentication
    login: (force_id: string, password: string) => 
        api.post('/auth/login', { force_id, password }),

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
    
    getSoldiersData: () => 
        api.get('/admin/soldiers'),
    
    getAdminStats: () => 
        api.get('/admin/stats'),

    // New Questionnaire endpoints
    createQuestionnaire: (data: QuestionnaireData) =>
        api.post('/admin/create-questionnaire', data),

    addQuestion: (data: QuestionData) =>
        api.post('/admin/add-question', data),

    // Daily Emotion Detection endpoints
    startDailyMonitoring: (date: string) =>
        api.post('/image/start-monitoring', { date }),

    endDailyMonitoring: (date: string) =>
        api.post('/image/end-monitoring', { date })
};

export default apiService;

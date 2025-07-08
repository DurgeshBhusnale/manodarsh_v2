import axios from 'axios';

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
    translateQuestion,

    // Daily Emotion Detection endpoints
    startDailyMonitoring: (date: string) =>
        api.post('/image/start-monitoring', { date }),

    endDailyMonitoring: (date: string) =>
        api.post('/image/end-monitoring', { date }),

    // Survey endpoints
    getActiveQuestionnaire: () =>
        api.get('/survey/active-questionnaire'),
    
    submitSurvey: (data: { questionnaire_id: number, responses: { question_id: number, answer_text: string }[], force_id?: string }) =>
        api.post('/survey/submit', data)
    ,
    translateAnswer
};

export default apiService;

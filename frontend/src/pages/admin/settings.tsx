import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/Sidebar';
import LoadingModal from '../../components/LoadingModal';
import InfoModal from '../../components/InfoModal';
import ErrorModal from '../../components/ErrorModal';
import { apiService } from '../../services/api';

interface Setting {
    value: string;
    description: string;
    category: string;
}

interface Settings {
    [key: string]: Setting;
}

interface Category {
    id: string;
    name: string;
    description: string;
    icon: string;
}

const AdminSettings: React.FC = () => {
    const [settings, setSettings] = useState<Settings>({});
    const [categories, setCategories] = useState<Category[]>([]);
    const [activeCategory, setActiveCategory] = useState<string>('scoring');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [backingUp, setBackingUp] = useState(false);
    
    // Modal states
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [showErrorModal, setShowErrorModal] = useState(false);
    const [modalTitle, setModalTitle] = useState('');
    const [modalMessage, setModalMessage] = useState('');

    const [editedSettings, setEditedSettings] = useState<Settings>({});
    const [hasChanges, setHasChanges] = useState(false);

    useEffect(() => {
        fetchSettingsAndCategories();
    }, []);

    const fetchSettingsAndCategories = async () => {
        try {
            setLoading(true);
            const [settingsResponse, categoriesResponse] = await Promise.all([
                apiService.getSystemSettings(),
                apiService.getSettingsCategories()
            ]);
            
            setSettings(settingsResponse.data.settings);
            setCategories(categoriesResponse.data.categories);
            setEditedSettings(settingsResponse.data.settings);
        } catch (error: any) {
            setModalTitle('Error Loading Settings');
            setModalMessage(error.response?.data?.error || 'Failed to load system settings');
            setShowErrorModal(true);
        } finally {
            setLoading(false);
        }
    };

    const handleSettingChange = (settingKey: string, newValue: string) => {
        const updatedSettings = {
            ...editedSettings,
            [settingKey]: {
                ...editedSettings[settingKey],
                value: newValue
            }
        };
        setEditedSettings(updatedSettings);
        setHasChanges(true);
    };

    const handleSaveSettings = async () => {
        try {
            setSaving(true);
            await apiService.updateSystemSettings({ settings: editedSettings });
            
            setSettings(editedSettings);
            setHasChanges(false);
            setModalTitle('Settings Updated');
            setModalMessage('System settings have been updated successfully');
            setShowSuccessModal(true);
        } catch (error: any) {
            setModalTitle('Error Saving Settings');
            setModalMessage(error.response?.data?.error || 'Failed to save settings');
            setShowErrorModal(true);
        } finally {
            setSaving(false);
        }
    };

    const handleResetSettings = async () => {
        if (!window.confirm('Are you sure you want to reset all settings to default values? This action cannot be undone.')) {
            return;
        }

        try {
            setSaving(true);
            await apiService.resetSystemSettings();
            await fetchSettingsAndCategories();
            setHasChanges(false);
            setModalTitle('Settings Reset');
            setModalMessage('All settings have been reset to default values');
            setShowSuccessModal(true);
        } catch (error: any) {
            setModalTitle('Error Resetting Settings');
            setModalMessage(error.response?.data?.error || 'Failed to reset settings');
            setShowErrorModal(true);
        } finally {
            setSaving(false);
        }
    };

    const handleBackupSettings = async () => {
        try {
            setBackingUp(true);
            const response = await apiService.backupSystemSettings();
            
            // Download backup file
            const dataStr = JSON.stringify(response.data.backup, null, 2);
            const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
            
            const exportFileDefaultName = `settings-backup-${new Date().toISOString().split('T')[0]}.json`;
            
            const linkElement = document.createElement('a');
            linkElement.setAttribute('href', dataUri);
            linkElement.setAttribute('download', exportFileDefaultName);
            linkElement.click();
            
            setModalTitle('Backup Created');
            setModalMessage('Settings backup has been downloaded successfully');
            setShowSuccessModal(true);
        } catch (error: any) {
            setModalTitle('Error Creating Backup');
            setModalMessage(error.response?.data?.error || 'Failed to create backup');
            setShowErrorModal(true);
        } finally {
            setBackingUp(false);
        }
    };

    const handleRestoreSettings = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            setSaving(true);
            const fileContent = await file.text();
            const backupData = JSON.parse(fileContent);
            
            await apiService.restoreSystemSettings({ backup: backupData });
            await fetchSettingsAndCategories();
            setHasChanges(false);
            
            setModalTitle('Settings Restored');
            setModalMessage('Settings have been restored from backup successfully');
            setShowSuccessModal(true);
        } catch (error: any) {
            setModalTitle('Error Restoring Settings');
            setModalMessage(error.response?.data?.error || 'Failed to restore settings');
            setShowErrorModal(true);
        } finally {
            setSaving(false);
        }
    };

    const filteredSettings = Object.entries(editedSettings).filter(
        ([_, setting]) => setting.category === activeCategory
    );

    const getInputType = (settingKey: string, value: string) => {
        if (settingKey.includes('threshold') || settingKey.includes('weight') || settingKey.includes('score')) {
            return 'number';
        }
        if (settingKey.includes('timeout') || settingKey.includes('interval') || settingKey.includes('size') || settingKey.includes('width') || settingKey.includes('height')) {
            return 'number';
        }
        return 'text';
    };

    const getInputProps = (settingKey: string) => {
        const baseProps: any = {};
        
        if (settingKey.includes('threshold') || settingKey.includes('weight')) {
            baseProps.min = 0;
            baseProps.max = 1;
            baseProps.step = 0.01;
        } else if (settingKey.includes('timeout') || settingKey.includes('interval')) {
            baseProps.min = 1;
        } else if (settingKey.includes('width') || settingKey.includes('height')) {
            baseProps.min = 320;
            baseProps.max = 1920;
        }
        
        return baseProps;
    };

    if (loading) {
        return (
            <div className="flex h-screen bg-gradient-to-br from-orange-50 via-green-50 to-blue-50">
                <Sidebar />
                <div className="flex-1 p-8 flex items-center justify-center relative">
                    {/* Animated Background Elements */}
                    <div className="absolute inset-0 overflow-hidden pointer-events-none">
                        <div className="absolute top-10 right-20 w-32 h-32 bg-gradient-to-r from-orange-400 to-red-400 rounded-full opacity-5 animate-pulse"></div>
                        <div className="absolute bottom-40 left-20 w-24 h-24 bg-gradient-to-r from-green-400 to-blue-400 rounded-full opacity-5 animate-bounce"></div>
                        <div className="absolute top-1/2 right-10 w-20 h-20 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full opacity-5 animate-pulse delay-1000"></div>
                    </div>
                    <div className="text-center bg-white/80 backdrop-blur-xl rounded-2xl p-8 shadow-xl border border-white/20 relative z-10">
                        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
                        <p className="text-lg font-semibold text-gray-700">Loading system settings...</p>
                        <p className="text-sm text-gray-500 mt-1">Please wait while we fetch the configuration</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-gradient-to-br from-orange-50 via-green-50 to-blue-50">
            <Sidebar />
            <div className="flex-1 p-8 overflow-y-auto relative">
                {/* Animated Background Elements */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-10 right-20 w-32 h-32 bg-gradient-to-r from-orange-400 to-red-400 rounded-full opacity-5 animate-pulse"></div>
                    <div className="absolute bottom-40 left-20 w-24 h-24 bg-gradient-to-r from-green-400 to-blue-400 rounded-full opacity-5 animate-bounce"></div>
                    <div className="absolute top-1/2 right-10 w-20 h-20 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full opacity-5 animate-pulse delay-1000"></div>
                </div>

                <div className="max-w-6xl mx-auto relative z-10">
                    {/* Header */}
                    <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 shadow-xl border border-white/20 mb-6">
                        <div className="flex items-center">
                            <div className="w-10 h-10 bg-gradient-to-br from-orange-500 via-white to-green-500 rounded-full flex items-center justify-center mr-3 shadow-lg">
                                <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                                    <i className="fas fa-cogs text-white text-xs"></i>
                                </div>
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-black tracking-tight">System Settings</h1>
                                <p className="text-gray-600 text-sm mt-1">Configure system parameters and behavior</p>
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="bg-white/80 backdrop-blur-xl rounded-xl shadow-xl border border-white/20 p-5 mb-6">
                        <div className="flex items-center mb-4">
                            <i className="fas fa-tools text-blue-600 text-lg mr-2"></i>
                            <h2 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Actions</h2>
                        </div>
                        <div className="flex flex-wrap gap-3 justify-between items-center">
                            <div className="flex flex-wrap gap-3">
                                <button
                                    onClick={handleSaveSettings}
                                    disabled={!hasChanges || saving}
                                    className={`px-6 py-2.5 rounded-lg font-semibold transition-all duration-200 transform hover:scale-[1.02] flex items-center shadow-md ${
                                        hasChanges && !saving
                                            ? 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white'
                                            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                    }`}
                                >
                                    <i className={`fas ${saving ? 'fa-spinner fa-spin' : 'fa-save'} mr-2 text-sm`}></i>
                                    {saving ? 'Saving...' : 'Save Changes'}
                                </button>
                                
                                <button
                                    onClick={handleBackupSettings}
                                    disabled={backingUp}
                                    className="px-6 py-2.5 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-lg hover:shadow-md disabled:bg-gray-400 font-semibold transition-all duration-200 transform hover:scale-[1.02] flex items-center shadow-md"
                                >
                                    <i className={`fas ${backingUp ? 'fa-spinner fa-spin' : 'fa-download'} mr-2 text-sm`}></i>
                                    {backingUp ? 'Creating...' : 'Backup Settings'}
                                </button>
                                
                                <label className="px-6 py-2.5 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white rounded-lg hover:shadow-md cursor-pointer font-semibold transition-all duration-200 transform hover:scale-[1.02] flex items-center shadow-md">
                                    <i className="fas fa-upload mr-2 text-sm"></i>
                                    Restore Settings
                                    <input
                                        type="file"
                                        accept=".json"
                                        className="hidden"
                                        onChange={handleRestoreSettings}
                                    />
                                </label>
                            </div>
                            
                            <button
                                onClick={handleResetSettings}
                                disabled={saving}
                                className="px-6 py-2.5 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-lg hover:shadow-md disabled:bg-gray-400 font-semibold transition-all duration-200 transform hover:scale-[1.02] flex items-center shadow-md"
                            >
                                <i className="fas fa-undo mr-2 text-sm"></i>
                                Reset to Defaults
                            </button>
                        </div>
                        
                        {hasChanges && (
                            <div className="mt-4 p-3 bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg shadow-sm">
                                <div className="flex items-center">
                                    <i className="fas fa-exclamation-triangle text-yellow-600 mr-2 text-sm"></i>
                                    <p className="text-yellow-800 font-medium text-sm">
                                        You have unsaved changes. Don't forget to save your settings.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                        {/* Categories Sidebar */}
                        <div className="lg:col-span-1">
                            <div className="bg-white/80 backdrop-blur-xl rounded-xl shadow-xl border border-white/20 p-4">
                                <div className="flex items-center mb-4">
                                    <i className="fas fa-list text-purple-600 text-lg mr-2"></i>
                                    <h3 className="text-lg font-bold bg-gradient-to-r from-purple-600 to-purple-800 bg-clip-text text-transparent">Categories</h3>
                                </div>
                                <div className="space-y-2">
                                    {categories.map((category) => (
                                        <button
                                            key={category.id}
                                            onClick={() => setActiveCategory(category.id)}
                                            className={`w-full text-left p-3 rounded-lg transition-all duration-200 transform hover:scale-[1.01] ${
                                                activeCategory === category.id
                                                    ? 'bg-gradient-to-r from-blue-100 to-purple-100 text-blue-800 border-2 border-blue-200 shadow-md'
                                                    : 'bg-white/60 hover:bg-white/80 border border-white/30 hover:shadow-md'
                                            }`}
                                        >
                                            <div className="flex items-center">
                                                <i className={`fas ${category.icon || 'fa-cog'} mr-2 text-blue-600 text-sm`}></i>
                                                <div>
                                                    <div className="font-semibold text-gray-800 text-sm">{category.name}</div>
                                                    <div className="text-xs text-gray-600 mt-0.5">{category.description}</div>
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Settings Panel */}
                        <div className="lg:col-span-3">
                            <div className="bg-white/80 backdrop-blur-xl rounded-xl shadow-xl border border-white/20 p-6">
                                <div className="mb-6">
                                    <div className="flex items-center mb-3">
                                        <i className="fas fa-sliders-h text-blue-600 text-lg mr-3"></i>
                                        <div>
                                            <h3 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                                                {categories.find(c => c.id === activeCategory)?.name || 'Settings'}
                                            </h3>
                                            <p className="text-gray-600 text-sm mt-1">
                                                {categories.find(c => c.id === activeCategory)?.description}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-5">
                                    {filteredSettings.map(([settingKey, setting]) => (
                                        <div key={settingKey} className="bg-white/60 backdrop-blur-md p-4 rounded-lg border border-white/30 shadow-md hover:shadow-lg transition-all duration-200">
                                            <label className="block text-base font-semibold text-gray-800 mb-2 flex items-center">
                                                <i className="fas fa-cog text-blue-600 mr-2 text-sm"></i>
                                                {settingKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                            </label>
                                            <input
                                                type={getInputType(settingKey, setting.value)}
                                                value={setting.value}
                                                onChange={(e) => handleSettingChange(settingKey, e.target.value)}
                                                className="w-full p-3 border-2 border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white/80 backdrop-blur-sm text-gray-800 font-medium transition-all duration-200"
                                                {...getInputProps(settingKey)}
                                            />
                                            {setting.description && (
                                                <div className="mt-2 p-2 bg-blue-50/80 border border-blue-200 rounded-md">
                                                    <div className="flex items-start">
                                                        <i className="fas fa-info-circle text-blue-600 mr-2 mt-0.5 text-xs"></i>
                                                        <p className="text-blue-800 text-xs font-medium">{setting.description}</p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                {filteredSettings.length === 0 && (
                                    <div className="text-center py-12">
                                        <i className="fas fa-cogs text-gray-400 text-4xl mb-4"></i>
                                        <p className="text-lg font-semibold text-gray-500">No settings available for this category.</p>
                                        <p className="text-gray-400 mt-1 text-sm">Select a different category to view settings.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Enhanced Modals */}
            <LoadingModal
                isOpen={saving && !backingUp}
                title="Saving Settings"
                message="Updating system configuration..."
            />

            <InfoModal
                isOpen={showSuccessModal}
                onClose={() => setShowSuccessModal(false)}
                title={modalTitle}
                message={modalMessage}
                type="success"
            />

            <ErrorModal
                isOpen={showErrorModal}
                onClose={() => setShowErrorModal(false)}
                title={modalTitle}
                message={modalMessage}
                onRetry={() => setShowErrorModal(false)}
            />
        </div>
    );
};

export default AdminSettings;

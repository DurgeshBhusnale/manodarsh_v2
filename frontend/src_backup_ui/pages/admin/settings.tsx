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
            <div className="flex h-screen">
                <Sidebar />
                <div className="flex-1 p-8 bg-gray-100 flex items-center justify-center">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                        <p className="mt-4 text-gray-600">Loading system settings...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen">
            <Sidebar />
            <div className="flex-1 p-8 bg-gray-100 overflow-y-auto">
                <div className="max-w-6xl mx-auto">
                    {/* Header */}
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold text-gray-900">System Settings</h1>
                        <p className="text-gray-600 mt-2">Configure system parameters and behavior</p>
                    </div>

                    {/* Action Buttons */}
                    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                        <div className="flex flex-wrap gap-4 justify-between items-center">
                            <div className="flex flex-wrap gap-3">
                                <button
                                    onClick={handleSaveSettings}
                                    disabled={!hasChanges || saving}
                                    className={`px-6 py-2 rounded-lg font-medium ${
                                        hasChanges && !saving
                                            ? 'bg-blue-600 text-white hover:bg-blue-700'
                                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                    }`}
                                >
                                    {saving ? 'Saving...' : 'Save Changes'}
                                </button>
                                
                                <button
                                    onClick={handleBackupSettings}
                                    disabled={backingUp}
                                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400"
                                >
                                    {backingUp ? 'Creating...' : 'Backup Settings'}
                                </button>
                                
                                <label className="px-6 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 cursor-pointer">
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
                                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400"
                            >
                                Reset to Defaults
                            </button>
                        </div>
                        
                        {hasChanges && (
                            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                <p className="text-yellow-800 text-sm">
                                    ⚠️ You have unsaved changes. Don't forget to save your settings.
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                        {/* Categories Sidebar */}
                        <div className="lg:col-span-1">
                            <div className="bg-white rounded-lg shadow-md p-4">
                                <h3 className="text-lg font-semibold mb-4">Categories</h3>
                                <div className="space-y-2">
                                    {categories.map((category) => (
                                        <button
                                            key={category.id}
                                            onClick={() => setActiveCategory(category.id)}
                                            className={`w-full text-left p-3 rounded-lg transition-colors ${
                                                activeCategory === category.id
                                                    ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                                    : 'hover:bg-gray-100'
                                            }`}
                                        >
                                            <div className="font-medium">{category.name}</div>
                                            <div className="text-sm text-gray-600">{category.description}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Settings Panel */}
                        <div className="lg:col-span-3">
                            <div className="bg-white rounded-lg shadow-md p-6">
                                <div className="mb-6">
                                    <h3 className="text-xl font-semibold">
                                        {categories.find(c => c.id === activeCategory)?.name || 'Settings'}
                                    </h3>
                                    <p className="text-gray-600">
                                        {categories.find(c => c.id === activeCategory)?.description}
                                    </p>
                                </div>

                                <div className="space-y-6">
                                    {filteredSettings.map(([settingKey, setting]) => (
                                        <div key={settingKey} className="border-b border-gray-200 pb-4">
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                {settingKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                            </label>
                                            <input
                                                type={getInputType(settingKey, setting.value)}
                                                value={setting.value}
                                                onChange={(e) => handleSettingChange(settingKey, e.target.value)}
                                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                {...getInputProps(settingKey)}
                                            />
                                            {setting.description && (
                                                <p className="text-sm text-gray-500 mt-1">{setting.description}</p>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                {filteredSettings.length === 0 && (
                                    <div className="text-center py-8 text-gray-500">
                                        No settings available for this category.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modals */}
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

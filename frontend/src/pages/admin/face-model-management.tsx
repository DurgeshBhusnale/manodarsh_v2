import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/Sidebar';

interface SoldierFaceData {
  force_id: string;
  name?: string;
  unit?: string;
  encodings_count: number;
  trained_at?: string;
  model_version?: string;
  in_pkl: boolean;
  in_database: boolean;
  status: 'synced' | 'pkl_only' | 'db_only' | 'missing';
}

interface ModelStats {
  total_encodings: number;
  unique_soldiers: number;
  total_db_soldiers: number; // Add this for database count
  avg_encodings_per_soldier: number;
  model_size_bytes: number;
  last_updated: string;
}

const FaceModelManagement: React.FC = () => {
  const [soldiers, setSoldiers] = useState<SoldierFaceData[]>([]);
  const [modelStats, setModelStats] = useState<ModelStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSoldiers, setSelectedSoldiers] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'synced' | 'pkl_only' | 'db_only' | 'missing'>('all');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteType, setDeleteType] = useState<'single' | 'batch'>('single');
  const [soldierToDelete, setSoldierToDelete] = useState<string>('');

  const API_BASE = 'http://localhost:5000/api';

  const fetchSoldiersData = async () => {
    try {
      setLoading(true);
      
      // PHASE 1: Get soldiers from database only (not from PKL)
      const dbResponse = await fetch(`${API_BASE}/admin/soldiers`);
      const dbData = await dbResponse.json();
      
      // Map database soldiers to our interface
      const soldierMap = new Map<string, SoldierFaceData>();
      
      // Add soldiers from database only
      if (dbData.soldiers) {
        for (const soldier of dbData.soldiers) {
          soldierMap.set(soldier.force_id, {
            force_id: soldier.force_id,
            name: soldier.name,
            unit: soldier.unit,
            encodings_count: 0,
            in_pkl: false, // PHASE 1: Not checking PKL
            in_database: true,
            status: 'db_only' // PHASE 1: All are DB only
          });
        }
      }
      
      setSoldiers(Array.from(soldierMap.values()));
      
      // Set model stats (DB count only)
      setModelStats({
        total_encodings: 0, // PHASE 1: Not using PKL
        unique_soldiers: dbData.total_count || 0, // DB count
        total_db_soldiers: dbData.total_count || 0,
        avg_encodings_per_soldier: 0,
        model_size_bytes: 0,
        last_updated: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Error fetching soldiers data:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteSoldier = async (forceId: string) => {
    try {
      const response = await fetch(`${API_BASE}/image/delete-soldier/${forceId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (response.ok) {
        await fetchSoldiersData(); // Refresh data
        alert(`Soldier ${forceId} deleted successfully`);
      } else {
        const error = await response.json();
        alert(`Failed to delete soldier: ${error.message || 'Unknown error'}`);
      }
    } catch (error) {
      alert(`Error deleting soldier: ${error}`);
    }
  };

  const batchDeleteSoldiers = async () => {
    try {
      const forceIds = Array.from(selectedSoldiers);
      const response = await fetch(`${API_BASE}/image/batch-delete-soldiers`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ force_ids: forceIds })
      });
      
      if (response.ok) {
        await fetchSoldiersData(); // Refresh data
        setSelectedSoldiers(new Set());
        alert(`${forceIds.length} soldiers deleted successfully`);
      } else {
        const error = await response.json();
        alert(`Failed to delete soldiers: ${error.message || 'Unknown error'}`);
      }
    } catch (error) {
      alert(`Error deleting soldiers: ${error}`);
    }
  };

  const exportModelData = async () => {
    try {
      const response = await fetch(`${API_BASE}/image/export-face-model`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `face_model_export_${new Date().toISOString().split('T')[0]}.pkl`;
        a.click();
        window.URL.revokeObjectURL(url);
      } else {
        alert('Failed to export model data');
      }
    } catch (error) {
      alert(`Error exporting model: ${error}`);
    }
  };

  const handleSelectAll = () => {
    const filteredSoldiers = getFilteredSoldiers();
    if (selectedSoldiers.size === filteredSoldiers.length) {
      setSelectedSoldiers(new Set());
    } else {
      setSelectedSoldiers(new Set(filteredSoldiers.map(s => s.force_id)));
    }
  };

  const handleSelectSoldier = (forceId: string) => {
    const newSelected = new Set(selectedSoldiers);
    if (newSelected.has(forceId)) {
      newSelected.delete(forceId);
    } else {
      newSelected.add(forceId);
    }
    setSelectedSoldiers(newSelected);
  };

  const getFilteredSoldiers = () => {
    return soldiers.filter(soldier => {
      const matchesSearch = soldier.force_id.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || soldier.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'synced': return 'text-green-600 bg-green-100';
      case 'pkl_only': return 'text-blue-600 bg-blue-100';
      case 'db_only': return 'text-orange-600 bg-orange-100';
      case 'missing': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'synced': return 'Synced';
      case 'pkl_only': return 'PKL Only';
      case 'db_only': return 'DB Only';
      case 'missing': return 'Missing';
      default: return 'Unknown';
    }
  };

  const handleDelete = () => {
    if (deleteType === 'single') {
      deleteSoldier(soldierToDelete);
    } else {
      batchDeleteSoldiers();
    }
    setShowDeleteModal(false);
  };

  useEffect(() => {
    fetchSoldiersData();
  }, []);

  const filteredSoldiers = getFilteredSoldiers();

  if (loading) {
    return (
      <div className="flex">
        <Sidebar />
        <div className="flex-1 p-8">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-orange-50 via-green-50 to-blue-50">
      <Sidebar />
      <div className="flex-1 p-8 overflow-y-auto">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-10 right-20 w-32 h-32 bg-gradient-to-r from-orange-400 to-red-400 rounded-full opacity-5 animate-pulse"></div>
          <div className="absolute bottom-40 left-20 w-24 h-24 bg-gradient-to-r from-green-400 to-blue-400 rounded-full opacity-5 animate-bounce"></div>
        </div>

        <div className="max-w-7xl mx-auto relative z-10">
          {/* Header */}
          <div className="bg-white/80 backdrop-blur-xl rounded-xl p-5 shadow-lg border border-white/20 mb-5">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-gradient-to-br from-orange-500 via-white to-green-500 rounded-full flex items-center justify-center mr-3">
                <i className="fas fa-users text-blue-600 text-sm"></i>
              </div>
              <div>
                <h1 className="text-xl font-bold text-black">User Management</h1>
                <p className="text-gray-600 text-xs">Manage user accounts and data</p>
              </div>
            </div>
          </div>

          {/* Stats Card - PHASE 1: Showing only total users from database */}
          {modelStats && (
            <div className="bg-white/80 backdrop-blur-xl rounded-xl shadow-lg p-4 border border-white/20 mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-gray-600">Total Users</h3>
                  <p className="text-2xl font-bold text-blue-600">{modelStats.total_db_soldiers}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <i className="fas fa-users text-blue-600 text-xl"></i>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">Total registered users in database</p>
              {/* PHASE 1: Model Size hidden (face recognition disabled) */}
              {/* PHASE 2: Uncomment to show PKL model size */}
            </div>
          )}

          {/* Controls */}
          <div className="bg-white/80 backdrop-blur-xl rounded-xl shadow-lg p-4 border border-white/20 mb-4">
            <div className="flex flex-wrap gap-3 items-center justify-between">
              <div className="flex gap-3 items-center">
                <input
                  type="text"
                  placeholder="Search by User ID"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white/70"
                />
              {/* PHASE 1: Status filter hidden (face recognition disabled) */}
              {/* PHASE 2: Uncomment to show PKL/DB sync status filter */}
              {/* <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Status</option>
                <option value="synced">Synced</option>
                <option value="pkl_only">PKL Only</option>
                <option value="db_only">DB Only</option>
                <option value="missing">Missing</option>
              </select> */}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleSelectAll}
                  className="px-3 py-2 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-all duration-200 font-semibold shadow-md hover:shadow-lg"
                >
                  {selectedSoldiers.size === filteredSoldiers.length ? 'Deselect All' : 'Select All'}
                </button>
                {selectedSoldiers.size > 0 && (
                  <button
                    onClick={() => {
                      setDeleteType('batch');
                      setShowDeleteModal(true);
                    }}
                    className="px-3 py-2 text-sm bg-red-500 hover:bg-red-600 text-white rounded-lg transition-all duration-200 font-semibold shadow-md hover:shadow-lg"
                  >
                    Delete Selected ({selectedSoldiers.size})
                  </button>
                )}
                {/* PHASE 1: Export Model button hidden - functionality preserved for future use */}
                {/* <button
                  onClick={exportModelData}
                  className="px-3 py-2 text-sm bg-green-500 hover:bg-green-600 text-white rounded-lg transition-all duration-200 font-semibold shadow-md hover:shadow-lg"
                >
                  Export Model
                </button> */}
                <button
                  onClick={fetchSoldiersData}
                  className="px-3 py-2 text-sm bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-all duration-200 font-semibold shadow-md hover:shadow-lg"
                >
                  Refresh
                </button>
              </div>
            </div>
          </div>

          {/* Soldiers Table */}
          <div className="bg-white/80 backdrop-blur-xl rounded-xl shadow-lg overflow-hidden border border-white/20">
            <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <input
                      type="checkbox"
                      checked={selectedSoldiers.size === filteredSoldiers.length && filteredSoldiers.length > 0}
                      onChange={handleSelectAll}
                      className="rounded"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User ID
                  </th>
                  {/* PHASE 1: Encodings and Status columns hidden (face recognition disabled) */}
                  {/* PHASE 2: Uncomment to show encodings count and sync status */}
                  {/* <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Encodings
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th> */}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Registered At
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredSoldiers.map((soldier) => (
                  <tr key={soldier.force_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedSoldiers.has(soldier.force_id)}
                        onChange={() => handleSelectSoldier(soldier.force_id)}
                        className="rounded"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {soldier.force_id}
                    </td>
                    {/* PHASE 1: Encodings and Status columns hidden (face recognition disabled) */}
                    {/* PHASE 2: Uncomment to show encodings and sync status */}
                    {/* <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        soldier.encodings_count > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {soldier.encodings_count} encodings
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(soldier.status)}`}>
                        {getStatusText(soldier.status)}
                      </span>
                    </td> */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {soldier.trained_at ? new Date(soldier.trained_at).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button
                        onClick={() => {
                          setSoldierToDelete(soldier.force_id);
                          setDeleteType('single');
                          setShowDeleteModal(true);
                        }}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-96">
              <h3 className="text-lg font-semibold mb-4">Confirm Deletion</h3>
              <p className="text-gray-600 mb-6">
                {deleteType === 'single' 
                  ? `Are you sure you want to delete soldier ${soldierToDelete}? This will remove their face data from both PKL file and database.`
                  : `Are you sure you want to delete ${selectedSoldiers.size} selected soldiers? This will remove their face data from both PKL file and database.`
                }
              </p>
              <div className="flex gap-4 justify-end">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
};

export default FaceModelManagement;

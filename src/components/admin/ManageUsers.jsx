import React, { useState, useEffect } from 'react';
import { Search, Edit, Shield, Trash2, Plus, Eye, EyeOff, Mail, Phone, MapPin, ChevronDown, AlertCircle, CheckCircle, Download, Archive, Send, Eye as EyeIcon, Activity, MessageSquare, Clock } from 'lucide-react';
import Card from '../common/Card';
import Input from '../common/Input';
import Button from '../common/Button';

const ManageUsers = () => {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [selectedUsers, setSelectedUsers] = useState(new Set());
  const [editingUser, setEditingUser] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [sortBy, setSortBy] = useState('newest');
  const [viewMode, setViewMode] = useState('cards'); // 'cards' or 'table'
  const [successMessage, setSuccessMessage] = useState('');
  const [bulkRoleChange, setBulkRoleChange] = useState('');
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [notificationData, setNotificationData] = useState({ role: 'all', message: '' });
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [activityLog, setActivityLog] = useState({});

  const roles = [
    { value: 'all', label: 'All Roles' },
    { value: 'admin', label: 'Admin' },
    { value: 'pastor', label: 'Pastor' },
    { value: 'bishop', label: 'Bishop' },
    { value: 'usher', label: 'Usher' },
    { value: 'worship_team', label: 'Worship Team' },
    { value: 'volunteer', label: 'Volunteer' },
    { value: 'member', label: 'Member' }
  ];

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const token = getAuthToken();
      const response = await fetch('http://localhost:5000/api/users', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      setUsers(data.users || []);
      setFilteredUsers(data.users || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter and sort users
  useEffect(() => {
    let result = [...users];

    if (roleFilter !== 'all') {
      result = result.filter(u => u.role === roleFilter);
    }

    if (statusFilter !== 'all') {
      if (statusFilter === 'active') {
        result = result.filter(u => u.isActive);
      } else if (statusFilter === 'inactive') {
        result = result.filter(u => !u.isActive);
      }
    }

    if (search.trim()) {
      result = result.filter(u =>
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase()) ||
        (u.username && u.username.toLowerCase().includes(search.toLowerCase())) ||
        (u.phone && u.phone.includes(search))
      );
    }

    result.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.createdAt) - new Date(a.createdAt);
        case 'oldest':
          return new Date(a.createdAt) - new Date(b.createdAt);
        case 'name':
          return a.name.localeCompare(b.name);
        case 'role':
          return a.role.localeCompare(b.role);
        default:
          return 0;
      }
    });

    setFilteredUsers(result);
  }, [search, roleFilter, statusFilter, users, sortBy]);

  const getAuthToken = () => {
    const token = localStorage.getItem('authToken');
    if (!token) return '';
    
    // If token is stored as JSON object with 'value' property
    try {
      const parsed = JSON.parse(token);
      return parsed.value || token;
    } catch (e) {
      // Token is stored as plain string
      return token;
    }
  };

  const updateRole = async (userId, newRole) => {
    try {
      const token = getAuthToken();
      if (!token) {
        alert('Authentication required. Please login again.');
        return;
      }

      const response = await fetch(`http://localhost:5000/api/users/${userId}/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ role: newRole })
      });

      if (response.ok) {
        const data = await response.json();
        setUsers(users.map(u => u._id === userId ? data.user : u));
        showSuccess(`User role updated to ${newRole}`);
      } else {
        alert('Error updating role');
      }
    } catch (error) {
      console.error('Error updating role:', error);
    }
  };

  const bulkUpdateRoles = async () => {
    if (!bulkRoleChange || selectedUsers.size === 0) {
      alert('Select users and a role first');
      return;
    }

    try {
      const token = getAuthToken();
      let updatedUsers = [...users];
      for (const userId of selectedUsers) {
        const response = await fetch(`http://localhost:5000/api/users/${userId}/role`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ role: bulkRoleChange })
        });

        if (response.ok) {
          const data = await response.json();
          updatedUsers = updatedUsers.map(u => u._id === userId ? data.user : u);
        }
      }

      setUsers(updatedUsers);
      setSelectedUsers(new Set());
      setBulkRoleChange('');
      setShowBulkActions(false);
      showSuccess(`Updated ${selectedUsers.size} users to ${bulkRoleChange}`);
    } catch (error) {
      console.error('Error bulk updating:', error);
      alert('Error updating users');
    }
  };

  const deactivateUser = async (userId) => {
    try {
      const token = getAuthToken();
      const response = await fetch(`http://localhost:5000/api/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ isActive: false })
      });

      if (response.ok) {
        const data = await response.json();
        setUsers(users.map(u => u._id === userId ? data.user : u));
        showSuccess('User deactivated successfully');
      }
    } catch (error) {
      console.error('Error deactivating user:', error);
    }
  };

  const reactivateUser = async (userId) => {
    try {
      const token = getAuthToken();
      const response = await fetch(`http://localhost:5000/api/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ isActive: true })
      });

      if (response.ok) {
        const data = await response.json();
        setUsers(users.map(u => u._id === userId ? data.user : u));
        showSuccess('User reactivated successfully');
      }
    } catch (error) {
      console.error('Error reactivating user:', error);
    }
  };

  const deleteUser = async (userId) => {
    try {
      const token = getAuthToken();
      const response = await fetch(`http://localhost:5000/api/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        setUsers(users.filter(u => u._id !== userId));
        setShowDeleteConfirm(null);
        showSuccess('User deleted successfully');
      }
    } catch (error) {
      console.error('Error deleting user:', error);
    }
  };

  const startEditing = (user) => {
    setEditingUser(user._id);
    setEditFormData({
      name: user.name,
      email: user.email,
      phone: user.phone || '',
      location: user.location || '',
      bio: user.bio || ''
    });
  };

  const saveEdit = async () => {
    if (!editingUser) return;

    try {
      const token = getAuthToken();
      const response = await fetch(`http://localhost:5000/api/users/${editingUser}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(editFormData)
      });

      if (response.ok) {
        const data = await response.json();
        setUsers(users.map(u => u._id === editingUser ? data.user : u));
        setEditingUser(null);
        showSuccess('User updated successfully');
      }
    } catch (error) {
      console.error('Error updating user:', error);
    }
  };

  const handleSelectUser = (userId) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUsers(newSelected);
  };

  const selectAll = () => {
    if (selectedUsers.size === filteredUsers.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(filteredUsers.map(u => u._id)));
    }
  };

  const exportToCSV = () => {
    const headers = ['Name', 'Email', 'Phone', 'Location', 'Role', 'Status', 'Joined'];
    const rows = filteredUsers.map(u => [
      u.name,
      u.email,
      u.phone || '',
      u.location || '',
      u.role,
      u.isActive ? 'Active' : 'Inactive',
      new Date(u.createdAt).toLocaleDateString()
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `church-members-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    showSuccess('Members exported as CSV');
  };

  const sendBulkNotification = () => {
    if (!notificationData.message.trim()) {
      alert('Please enter a message');
      return;
    }

    // Simulate sending notification
    alert(`Notification sent to ${notificationData.role === 'all' ? 'all users' : notificationData.role + 's'}: "${notificationData.message}"`);
    setNotificationData({ role: 'all', message: '' });
    setShowNotificationModal(false);
    showSuccess('Notification sent successfully');
  };

  const showSuccess = (msg) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const getRoleColor = (role) => {
    const colors = {
      admin: 'bg-purple-100 text-purple-800 border-purple-300',
      pastor: 'bg-red-100 text-red-800 border-red-300',
      bishop: 'bg-blue-100 text-blue-800 border-blue-300',
      usher: 'bg-green-100 text-green-800 border-green-300',
      worship_team: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      volunteer: 'bg-indigo-100 text-indigo-800 border-indigo-300',
      member: 'bg-gray-100 text-gray-800 border-gray-300'
    };
    return colors[role] || 'bg-gray-100 text-gray-800 border-gray-300';
  };

  const getRoleIcon = (role) => {
    if (role === 'admin') return '👑';
    if (role === 'pastor' || role === 'bishop') return '👨‍⛪';
    if (role === 'worship_team') return '🎵';
    if (role === 'usher') return '🤝';
    if (role === 'volunteer') return '❤️';
    return '👤';
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-blue-900 mb-2">Manage Users</h1>
        <p className="text-gray-600">Control member roles, view details, and manage permissions</p>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="mb-6 p-4 bg-green-50 border-l-4 border-green-500 text-green-800 flex items-center gap-3 rounded">
          <CheckCircle size={20} />
          {successMessage}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card className="text-center">
          <p className="text-gray-600 text-sm mb-2">Total Members</p>
          <p className="text-3xl font-bold text-blue-900">{users.length}</p>
        </Card>
        <Card className="text-center">
          <p className="text-gray-600 text-sm mb-2">Active</p>
          <p className="text-3xl font-bold text-green-600">{users.filter(u => u.isActive).length}</p>
        </Card>
        <Card className="text-center">
          <p className="text-gray-600 text-sm mb-2">Leadership</p>
          <p className="text-3xl font-bold text-purple-900">{users.filter(u => ['admin', 'pastor', 'bishop'].includes(u.role)).length}</p>
        </Card>
        <Card className="text-center">
          <p className="text-gray-600 text-sm mb-2">Selected</p>
          <p className="text-3xl font-bold text-blue-600">{selectedUsers.size}</p>
        </Card>
      </div>

      {/* Filters & Controls */}
      <Card className="mb-8 p-6">
        <div className="grid md:grid-cols-5 gap-4 mb-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Search</label>
            <Input
              name="search"
              placeholder="Name, email, phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              icon={Search}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Role</label>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border-2 border-gray-300 focus:border-blue-900 focus:outline-none font-medium"
            >
              {roles.map(role => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border-2 border-gray-300 focus:border-blue-900 focus:outline-none font-medium"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Sort By</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border-2 border-gray-300 focus:border-blue-900 focus:outline-none font-medium"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="name">Name (A-Z)</option>
              <option value="role">Role</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">View Mode</label>
            <div className="flex gap-2">
              <button
                onClick={() => setViewMode('cards')}
                className={`flex-1 px-3 py-2 rounded-lg font-semibold transition ${
                  viewMode === 'cards'
                    ? 'bg-blue-900 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Cards
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`flex-1 px-3 py-2 rounded-lg font-semibold transition ${
                  viewMode === 'table'
                    ? 'bg-blue-900 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Table
              </button>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3">
          <Button onClick={exportToCSV} variant="outline" className="flex items-center gap-2">
            <Download size={18} /> Export CSV
          </Button>
          <Button
            onClick={() => setShowNotificationModal(true)}
            className="bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-2"
          >
            <Send size={18} /> Send Notification
          </Button>
          {selectedUsers.size > 0 && (
            <Button
              onClick={() => setShowBulkActions(!showBulkActions)}
              className="bg-green-600 text-white hover:bg-green-700 flex items-center gap-2"
            >
              <Shield size={18} /> Bulk Actions ({selectedUsers.size})
            </Button>
          )}
        </div>

        {/* Bulk Actions Panel */}
        {showBulkActions && selectedUsers.size > 0 && (
          <div className="mt-4 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
            <p className="font-semibold text-blue-900 mb-3">Update role for {selectedUsers.size} selected users:</p>
            <div className="flex gap-3">
              <select
                value={bulkRoleChange}
                onChange={(e) => setBulkRoleChange(e.target.value)}
                className="flex-1 px-4 py-2 rounded-lg border-2 border-blue-300 focus:border-blue-900 focus:outline-none font-semibold"
              >
                <option value="">Select a role...</option>
                {roles.slice(1).map(role => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
              <Button
                onClick={bulkUpdateRoles}
                className="bg-green-600 text-white hover:bg-green-700"
              >
                Apply
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Results Count */}
      <div className="mb-6 flex justify-between items-center">
        <p className="text-gray-700 font-medium">
          Showing <span className="font-bold text-blue-900">{filteredUsers.length}</span> of <span className="font-bold">{users.length}</span> members
        </p>
        {filteredUsers.length > 0 && (
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={selectedUsers.size === filteredUsers.length && filteredUsers.length > 0}
              onChange={selectAll}
              className="w-4 h-4 rounded"
            />
            <span className="text-sm font-semibold text-gray-700">Select All</span>
          </label>
        )}
      </div>

      {/* Notification Modal */}
      {showNotificationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <h2 className="text-2xl font-bold text-blue-900 mb-4">Send Notification</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Send To</label>
                <select
                  value={notificationData.role}
                  onChange={(e) => setNotificationData({ ...notificationData, role: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border-2 border-gray-300 focus:border-blue-900 focus:outline-none"
                >
                  <option value="all">All Members</option>
                  <option value="admin">Admins</option>
                  <option value="pastor">Pastors</option>
                  <option value="bishop">Bishops</option>
                  <option value="volunteer">Volunteers</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Message</label>
                <textarea
                  value={notificationData.message}
                  onChange={(e) => setNotificationData({ ...notificationData, message: e.target.value })}
                  placeholder="Type your notification message..."
                  className="w-full px-4 py-2 rounded-lg border-2 border-gray-300 focus:border-blue-900 focus:outline-none"
                  rows="4"
                />
              </div>

              <div className="flex gap-3">
                <Button onClick={sendBulkNotification} variant="primary" fullWidth>
                  Send
                </Button>
                <Button
                  onClick={() => setShowNotificationModal(false)}
                  variant="outline"
                  fullWidth
                >
                  Cancel
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Users Display */}
      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-900"></div>
        </div>
      ) : filteredUsers.length === 0 ? (
        <Card className="text-center py-12">
          <AlertCircle size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-600 text-lg">No members found</p>
        </Card>
      ) : viewMode === 'cards' ? (
        <div className="space-y-4">
          {filteredUsers.map((user) => (
            <Card key={user._id} className="hover:shadow-lg transition-shadow">
              {editingUser === user._id ? (
                <div className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Name</label>
                      <input
                        type="text"
                        value={editFormData.name}
                        onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                        className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-900 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Email</label>
                      <input
                        type="email"
                        value={editFormData.email}
                        onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                        className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-900 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Phone</label>
                      <input
                        type="tel"
                        value={editFormData.phone}
                        onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                        className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-900 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Location</label>
                      <input
                        type="text"
                        value={editFormData.location}
                        onChange={(e) => setEditFormData({ ...editFormData, location: e.target.value })}
                        className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-900 focus:outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Bio</label>
                    <textarea
                      value={editFormData.bio}
                      onChange={(e) => setEditFormData({ ...editFormData, bio: e.target.value })}
                      className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-900 focus:outline-none"
                      rows="3"
                    />
                  </div>
                  <div className="flex gap-3 pt-4">
                    <Button onClick={saveEdit} variant="primary" fullWidth>
                      Save Changes
                    </Button>
                    <Button onClick={() => setEditingUser(null)} variant="outline" fullWidth>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex gap-4 mb-4">
                    <input
                      type="checkbox"
                      checked={selectedUsers.has(user._id)}
                      onChange={() => handleSelectUser(user._id)}
                      className="w-5 h-5 rounded mt-1"
                    />
                    <div className="flex items-start gap-4 flex-grow">
                      <div className="w-16 h-16 bg-blue-900 rounded-full flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
                        {getRoleIcon(user.role)} {user.name.charAt(0)}
                      </div>
                      <div className="flex-grow">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-bold text-blue-900">{user.name}</h3>
                          <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold border-2 ${getRoleColor(user.role)}`}>
                            {user.role.replace('_', ' ').toUpperCase()}
                          </span>
                          {user.isActive ? (
                            <span className="inline-block px-2 py-1 rounded text-xs font-bold bg-green-100 text-green-800">Active</span>
                          ) : (
                            <span className="inline-block px-2 py-1 rounded text-xs font-bold bg-gray-200 text-gray-800">Inactive</span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mb-2">@{user.username || user.email.split('@')[0]}</p>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                          <div className="flex items-center gap-2 text-gray-700">
                            <Mail size={16} className="text-blue-900" />
                            <span className="truncate">{user.email}</span>
                          </div>
                          {user.phone && (
                            <div className="flex items-center gap-2 text-gray-700">
                              <Phone size={16} className="text-blue-900" />
                              {user.phone}
                            </div>
                          )}
                          {user.location && (
                            <div className="flex items-center gap-2 text-gray-700">
                              <MapPin size={16} className="text-blue-900" />
                              {user.location}
                            </div>
                          )}
                          <div className="text-gray-600">
                            Joined {formatDate(user.createdAt)}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="ml-4 flex-shrink-0 w-48">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Change Role</label>
                      <select
                        value={user.role}
                        onChange={(e) => updateRole(user._id, e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border-2 border-gray-300 focus:border-blue-900 focus:outline-none font-semibold text-sm"
                      >
                        {roles.slice(1).map(role => (
                          <option key={role.value} value={role.value}>
                            {role.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {user.bio && (
                    <div className="py-3 px-4 bg-gray-50 rounded-lg mb-4">
                      <p className="text-sm text-gray-700">{user.bio}</p>
                    </div>
                  )}

                  <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                    <div className="flex gap-4 text-sm">
                      <span className="text-gray-600">
                        <span className="font-bold text-blue-900">{user.blogsCreated || 0}</span> posts
                      </span>
                      <span className="text-gray-600">
                        <span className="font-bold text-blue-900">{user.testimonyCount || 0}</span> testimonies
                      </span>
                      <span className="text-gray-600">
                        <span className="font-bold text-blue-900">{user.ministries?.length || 0}</span> ministries
                      </span>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => startEditing(user)}
                        className="p-2 text-blue-900 hover:bg-blue-50 rounded-lg transition"
                        title="Edit user"
                      >
                        <Edit size={20} />
                      </button>

                      {user.isActive ? (
                        <button
                          onClick={() => deactivateUser(user._id)}
                          className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition"
                          title="Deactivate user"
                        >
                          <Archive size={20} />
                        </button>
                      ) : (
                        <button
                          onClick={() => reactivateUser(user._id)}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition"
                          title="Reactivate user"
                        >
                          <EyeIcon size={20} />
                        </button>
                      )}

                      <button
                        onClick={() => setShowDeleteConfirm(showDeleteConfirm === user._id ? null : user._id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                        title="Delete user"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                  </div>

                  {showDeleteConfirm === user._id && (
                    <div className="mt-4 p-4 bg-red-50 border-l-4 border-red-500 rounded">
                      <p className="text-red-800 font-semibold mb-3">Permanently delete this user? This cannot be undone.</p>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => deleteUser(user._id)}
                          className="bg-red-600 text-white hover:bg-red-700"
                          fullWidth
                        >
                          Delete Permanently
                        </Button>
                        <Button
                          onClick={() => setShowDeleteConfirm(null)}
                          variant="outline"
                          fullWidth
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </Card>
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-100 border-b-2 border-gray-300">
                <th className="p-4 text-left">
                  <input
                    type="checkbox"
                    checked={selectedUsers.size === filteredUsers.length && filteredUsers.length > 0}
                    onChange={selectAll}
                    className="w-4 h-4 rounded"
                  />
                </th>
                <th className="p-4 text-left text-sm font-bold text-blue-900">Name</th>
                <th className="p-4 text-left text-sm font-bold text-blue-900">Email</th>
                <th className="p-4 text-left text-sm font-bold text-blue-900">Role</th>
                <th className="p-4 text-left text-sm font-bold text-blue-900">Phone</th>
                <th className="p-4 text-left text-sm font-bold text-blue-900">Status</th>
                <th className="p-4 text-left text-sm font-bold text-blue-900">Joined</th>
                <th className="p-4 text-left text-sm font-bold text-blue-900">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user._id} className="border-b border-gray-200 hover:bg-blue-50 transition">
                  <td className="p-4">
                    <input
                      type="checkbox"
                      checked={selectedUsers.has(user._id)}
                      onChange={() => handleSelectUser(user._id)}
                      className="w-4 h-4 rounded"
                    />
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-900 rounded-full flex items-center justify-center text-white text-sm font-bold">
                        {user.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-semibold text-blue-900">{user.name}</p>
                        <p className="text-xs text-gray-500">@{user.username || user.email.split('@')[0]}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-sm text-gray-700">{user.email}</td>
                  <td className="p-4">
                    <select
                      value={user.role}
                      onChange={(e) => updateRole(user._id, e.target.value)}
                      className="px-3 py-1 rounded-lg border-2 border-gray-300 focus:border-blue-900 text-sm font-semibold"
                    >
                      {roles.slice(1).map(role => (
                        <option key={role.value} value={role.value}>
                          {role.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="p-4 text-sm text-gray-700">{user.phone || '-'}</td>
                  <td className="p-4">
                    <span className={`text-xs font-bold px-3 py-1 rounded-full ${user.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-800'}`}>
                      {user.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="p-4 text-sm text-gray-700">{formatDate(user.createdAt)}</td>
                  <td className="p-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => startEditing(user)}
                        className="p-2 text-blue-900 hover:bg-blue-100 rounded-lg transition"
                        title="Edit"
                      >
                        <Edit size={18} />
                      </button>
                      {user.isActive ? (
                        <button
                          onClick={() => deactivateUser(user._id)}
                          className="p-2 text-orange-600 hover:bg-orange-100 rounded-lg transition"
                          title="Deactivate"
                        >
                          <Archive size={18} />
                        </button>
                      ) : (
                        <button
                          onClick={() => reactivateUser(user._id)}
                          className="p-2 text-green-600 hover:bg-green-100 rounded-lg transition"
                          title="Reactivate"
                        >
                          <EyeIcon size={18} />
                        </button>
                      )}
                      <button
                        onClick={() => setShowDeleteConfirm(showDeleteConfirm === user._id ? null : user._id)}
                        className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition"
                        title="Delete"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ManageUsers;
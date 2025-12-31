import React, { useState, useEffect } from 'react';
import { Search, Edit, Shield } from 'lucide-react';
import Card from '../common/Card';
import Input from '../common/Input';

const ManageUsers = () => {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/auth/users', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      const data = await response.json();
      setUsers(data.users || []);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const updateRole = async (userId, newRole) => {
    try {
      await fetch(`http://localhost:5000/api/auth/users/${userId}/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({ role: newRole })
      });
      alert('Role updated!');
      fetchUsers();
    } catch (error) {
      alert('Error updating role');
    }
  };

  const roles = ['member', 'volunteer', 'usher', 'worship_team', 'pastor', 'bishop', 'admin'];

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(search.toLowerCase()) ||
    user.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold text-blue-900 mb-8">Manage Users</h1>

      <div className="mb-6">
        <Input
          name="search"
          placeholder="Search users..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          icon={Search}
        />
      </div>

      <div className="grid gap-4">
        {filteredUsers.map((user) => (
          <Card key={user._id} hover>
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold">{user.name}</h3>
                <p className="text-sm text-gray-600">{user.email}</p>
                <p className="text-xs text-gray-500">Joined: {new Date(user.createdAt).toLocaleDateString()}</p>
              </div>
              <div className="flex items-center gap-4">
                <select
                  value={user.role}
                  onChange={(e) => updateRole(user._id, e.target.value)}
                  className="px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-900"
                >
                  {roles.map(role => (
                    <option key={role} value={role}>
                      {role.replace('_', ' ').toUpperCase()}
                    </option>
                  ))}
                </select>
                <Shield className={user.role === 'admin' ? 'text-yellow-500' : 'text-gray-400'} size={24} />
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default ManageUsers;
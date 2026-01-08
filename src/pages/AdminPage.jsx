// src/pages/AdminPage.jsx
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import AdminDashboard from '../components/admin/AdminDashboard';
import ManageSermons from '../components/admin/ManageSermons';
import ManageEvents from '../components/admin/ManageEvents';
import ManageBlog from '../components/admin/ManageBlog';
import ManageGallery from '../components/admin/ManageGallery';
import ManageLiveStream from '../components/admin/ManageLiveStream';
import ManageUsers from '../components/admin/ManageUsers';
import ManageVolunteers from '../components/admin/ManageVolunteers';
import ManageFeedback from '../components/admin/ManageFeedback';
import AdminDonationDashboard from '../components/admin/AdminDonationDashboard';
import AuditLogsDashboard from '../components/admin/AuditLogsDashboard';

const AdminPage = () => {
  return (
    <div className="pt-20 min-h-screen bg-gray-50">
      <Routes>
        <Route path="/" element={<AdminDashboard />} />
        <Route path="/sermons" element={<ManageSermons />} />
        <Route path="/events" element={<ManageEvents />} />
        <Route path="/blog" element={<ManageBlog />} />
        <Route path="/gallery" element={<ManageGallery />} />
        <Route path="/livestream" element={<ManageLiveStream />} />
        <Route path="/users" element={<ManageUsers />} />
        <Route path="/volunteers" element={<ManageVolunteers />} />
        <Route path="/feedback" element={<ManageFeedback />} />
        <Route path="/audit-logs" element={<AuditLogsDashboard />} />
        
        {/* Donation Routes - supports nested paths */}
        <Route path="/donations/*" element={<AdminDonationDashboard />} />
      </Routes>
    </div>
  );
};

export default AdminPage;
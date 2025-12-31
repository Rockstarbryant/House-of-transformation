// src/App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ChatbotProvider } from './context/ChatbotContext';

// Layout Components
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';

// Pages
import HomePage from './pages/HomePage';
import AboutPage from './pages/AboutPage';
import SermonsPage from './pages/SermonsPage';
import BlogPage from './pages/BlogPage';
import BlogDetailPage from './pages/BlogDetailPage';
import GalleryPage from './pages/GalleryPage';
import KidsZonePage from './pages/KidsZonePage';
import VolunteerPage from './pages/VolunteerPage';
import EventsPage from './pages/EventsPage';
import DonatePage from './pages/DonatePage';
import MinistriesPage from './pages/MinistriesPage';
import UserProfilePage from './pages/UserProfilePage';
import UsersPortalPage from './pages/UsersPortalPage';
import ContactPage from './pages/ContactPage';
import AdminLiveStreamPage from './pages/AdminLiveStreamPage';
import AdminPage from './pages/AdminPage';

// Components
import Chatbot from './components/chatbot/Chatbot';
import ScrollToTop from './components/common/ScrollToTop';
import ProtectedRoute from './components/common/ProtectedRoute';

// Styles
import './App.css';

function App() {
  return (
    <Router>
      <AuthProvider>
        <ChatbotProvider>
          <div className="App min-h-screen flex flex-col">
            <Header />
            
            <main className="flex-grow">
              <ScrollToTop />
              <Routes>
                {/* Public Routes */}
                <Route path="/" element={<HomePage />} />
                <Route path="/about" element={<AboutPage />} />
                <Route path="/sermons" element={<SermonsPage />} />
                <Route path="/blog" element={<BlogPage />} />
                <Route path="/blog/:id" element={<BlogDetailPage />} />
                <Route path="/gallery" element={<GalleryPage />} />
                <Route path="/kids-zone" element={<KidsZonePage />} />
                <Route path="/volunteer" element={<VolunteerPage />} />
                <Route path="/events" element={<EventsPage />} />
                <Route path="/donate" element={<DonatePage />} />
                <Route path="/ministries" element={<MinistriesPage />} />
                <Route path="/users" element={<UsersPortalPage />} />
                <Route path="/profile/:userId" element={<UserProfilePage />} />
                <Route path="/contact" element={<ContactPage />} />

                {/* Protected Admin Route */}
                <Route 
                  path="/admin/*" 
                  element={
                    <ProtectedRoute requiredRole="admin">
                      <AdminPage />
                    </ProtectedRoute>
                  } 
                />

                {/* Protected Admin Route */}
                <Route 
                  path="/admin/live-stream/*" 
                  element={
                    <ProtectedRoute requiredRole="admin">
                      <AdminLiveStreamPage />
                    </ProtectedRoute>
                  } 
                />

                {/* 404 Redirect */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>

            <Footer />
            <Chatbot />
          </div>
        </ChatbotProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
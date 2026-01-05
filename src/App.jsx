// src/App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ChatbotProvider } from './context/ChatbotContext';
import { DonationProvider } from './context/DonationContext';

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
import FeedbackPage from './pages/FeedbackPage';
import TestimonyDetailPage from './pages/TestimonyDetailPage';
import AdminLiveStreamPage from './pages/AdminLiveStreamPage';
import AdminPage from './pages/AdminPage';

// Donation Pages
import DonationPage from './pages/donation/DonationPage';
import PledgePage from './pages/donation/PledgePage';
import DonationDashboard from './pages/donation/DonationDashboard';
import PaymentPage from './pages/donation/PaymentPage';

// ===== NEW: AUTH PAGES =====
import ForgotPasswordForm from './components/auth/ForgotPasswordForm';
import ResetPasswordForm from './components/auth/ResetPasswordForm';
import VerifyEmailForm from './components/auth/VerifyEmailForm';

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
          <DonationProvider>
            <div className="App min-h-screen flex flex-col">
              <Header />
              
              <main className="flex-grow">
                <ScrollToTop />
                <Routes>
                  {/* ===== PUBLIC ROUTES ===== */}
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
                  <Route path="/feedback" element={<FeedbackPage />} />
                  <Route path="/testimony/:id" element={<TestimonyDetailPage />} />
                  
                  {/* ===== NEW: EMAIL AUTHENTICATION ROUTES ===== */}
                  <Route path="/forgot-password" element={<ForgotPasswordForm />} />
                  <Route path="/reset-password/:token" element={<ResetPasswordForm />} />
                  <Route path="/verify-email/:token" element={<VerifyEmailForm />} />
                  
                  {/* ===== DONATION ROUTES ===== */}
                  <Route path="/donations" element={<DonationPage />} />
                  <Route path="/donations/pledge/:campaignId" element={<PledgePage />} />
                  <Route path="/donations/dashboard" element={<DonationDashboard />} />
                  <Route path="/donations/pay/:pledgeId" element={<PaymentPage />} />

                  {/* ===== PROTECTED ADMIN ROUTES ===== */}
                  <Route 
                    path="/admin/*" 
                    element={
                      <ProtectedRoute requiredRole="admin">
                        <AdminPage />
                      </ProtectedRoute>
                    } 
                  />

                  <Route 
                    path="/admin/live-stream/*" 
                    element={
                      <ProtectedRoute requiredRole="admin">
                        <AdminLiveStreamPage />
                      </ProtectedRoute>
                    } 
                  />

                  {/* ===== 404 REDIRECT ===== */}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </main>

              <Footer />
              <Chatbot />
            </div>
          </DonationProvider>
        </ChatbotProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
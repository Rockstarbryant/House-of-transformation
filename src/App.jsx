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
import ServiceAreasPage from './pages/ServiceAreasPage';
import UserProfilePage from './pages/UserProfilePage';
import UsersPortalPage from './pages/UsersPortalPage';
import ContactPage from './pages/ContactPage';
import FeedbackPage from './pages/FeedbackPage';
import TestimonyDetailPage from './pages/TestimonyDetailPage';
import AdminLiveStreamPage from './pages/AdminLiveStreamPage';
import LiveStreamPage from './pages/LiveStreamPage';
import AdminPage from './pages/AdminPage';

// Service Area Detail Pages
import WorshipTeam from './pages/serviceArea/WorshipTeam';
import ChildrensMinistry from './pages/serviceArea/ChildrensMinistry';
import HospitalityTeam from './pages/serviceArea/HospitalityTeam';
import TechnicalSupport from './pages/serviceArea/TechnicalSupport';
import OutreachMissions from './pages/serviceArea/OutreachMissions';
import PrayerMinistry from './pages/serviceArea/PrayerMinistry';
import YouthMinistry from './pages/serviceArea/YouthMinistry';
import CounselingCare from './pages/serviceArea/CounselingCare';
import FinanceAdministration from './pages/serviceArea/FinanceAdministration';

// Donation Pages
import DonationPage from './pages/donation/DonationPage';
import PledgePage from './pages/donation/PledgePage';
import DonationDashboard from './pages/donation/DonationDashboard';
import PaymentPage from './pages/donation/PaymentPage';

// Auth Pages
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
                  
                  {/* Service Areas Routes */}
                  <Route path="/ServiceArea" element={<ServiceAreasPage/>} />
                  <Route path="/service-areas/worship-team" element={<WorshipTeam />} />
                  <Route path="/service-areas/children-s-ministry" element={<ChildrensMinistry />} />
                  <Route path="/service-areas/hospitality-team" element={<HospitalityTeam />} />
                  <Route path="/service-areas/technical-support" element={<TechnicalSupport />} />
                  <Route path="/service-areas/outreach-&-missions" element={<OutreachMissions />} />
                  <Route path="/service-areas/prayer-ministry" element={<PrayerMinistry />} />
                  <Route path="/service-areas/youth-ministry" element={<YouthMinistry />} />
                  <Route path="/service-areas/counseling-&-care" element={<CounselingCare />} />
                  <Route path="/service-areas/finance-&-administration" element={<FinanceAdministration />} />
                  
                  <Route path="/users" element={<UsersPortalPage />} />
                  <Route path="/profile/:userId" element={<UserProfilePage />} />
                  <Route path="/contact" element={<ContactPage />} />
                  <Route path="/feedback" element={<FeedbackPage />} />
                  <Route path="/testimony/:id" element={<TestimonyDetailPage />} />
                  <Route path="/livestream" element={<LiveStreamPage />} />
                  
                  {/* ===== EMAIL AUTHENTICATION ROUTES ===== */}
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
// src/components/layout/Header.jsx
import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, LogIn, LogOut, Settings } from 'lucide-react';
import { useAuthContext } from '../../context/AuthContext';
import { CHURCH_INFO } from '../../utils/constants';
import AuthModal from '../auth/AuthModal';
import MobileMenu from './MobileMenu';

const Header = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  
  const { user, isAdmin, logout } = useAuthContext();
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location]);

  const navLinks = [
    { path: '/', label: 'Home' },
    { path: '/about', label: 'About' },
    { path: '/sermons', label: 'Sermons' },
    { path: '/events', label: 'Events' },
    { path: '/gallery', label: 'Gallery' },
    { path: '/volunteer', label: 'Volunteer' },
    { path: '/users', label: 'Members' },
    { path: '/contact', label: 'Contact' }
  ];

  const isActivePath = (path) => {
    return location.pathname === path;
  };

  const handleAuthClick = () => {
    setShowAuthModal(true);
    setAuthMode('login');
  };

  const handleLogout = async () => {
    await logout();
  };

  return (
    <>
      <nav className={`fixed w-full z-50 transition-all duration-300 ${
        isScrolled 
          ? 'bg-white shadow-md border-b border-slate-200' 
          : 'bg-white/80 backdrop-blur-md border-b border-slate-200/50'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <img 
                src="https://pbs.twimg.com/profile_images/700352011582251008/wrxEHL3q.jpg"
                alt={CHURCH_INFO.name}
                className="w-18 h-15 rounded-full object-cover border-2 border-blue-600"
              />
              <div>
                <h1 className={`font-bold text-lg transition-colors ${isScrolled ? 'text-slate-900' : 'text-slate-900'}`}>
                  {CHURCH_INFO.name}
                </h1>
                <p className="text-blue-600 text-xs font-semibold">{CHURCH_INFO.location}</p>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center gap-8">
              <div className="flex gap-6">
                {navLinks.map((link) => (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={`font-medium transition-colors duration-200 ${
                      isActivePath(link.path) 
                        ? 'text-blue-600 font-semibold' 
                        : 'text-slate-700 hover:text-blue-600'
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>

              {/* Auth Section */}
              {user ? (
                <div className="flex items-center gap-3 border-l border-slate-200 pl-8">
                  <span className="text-sm text-slate-700">
                    <span className="font-semibold text-slate-900">{user.name}</span>
                  </span>
                  {isAdmin && (
                    <Link
                      to="/admin"
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm"
                    >
                      <Settings size={16} /> Admin
                    </Link>
                  )}
                  <button
                    onClick={handleLogout}
                    className="text-slate-700 hover:text-red-600 transition-colors font-medium flex items-center gap-2"
                  >
                    <LogOut size={18} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleAuthClick}
                  className="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <LogIn size={18} /> Sign In
                </button>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden text-slate-900 p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              {isMobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <MobileMenu
          isOpen={isMobileMenuOpen}
          navLinks={navLinks}
          user={user}
          isAdmin={isAdmin}
          onAuthClick={handleAuthClick}
          onLogout={handleLogout}
          onClose={() => setIsMobileMenuOpen(false)}
        />
      </nav>

      {/* Auth Modal */}
      {showAuthModal && (
        <AuthModal
          mode={authMode}
          onClose={() => setShowAuthModal(false)}
          onSwitchMode={(mode) => setAuthMode(mode)}
        />
      )}
    </>
  );
};

export default Header;
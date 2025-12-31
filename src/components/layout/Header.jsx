import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, LogIn, LogOut, Settings, Users } from 'lucide-react';
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
    { path: '/blog', label: 'Blog' },
    { path: '/gallery', label: 'Gallery' },
    { path: '/kids-zone', label: 'Kids Zone' },
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
        isScrolled ? 'bg-blue-900 shadow-lg' : 'bg-blue-900/95'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <Link to="/" className="flex items-center space-x-3 hover:opacity-80 transition-opacity">
              <div className="w-12 h-12 bg-yellow-400 rounded-full flex items-center justify-center text-2xl">
                ✝️
              </div>
              <div>
                <h1 className="text-white font-bold text-xl">{CHURCH_INFO.name}</h1>
                <p className="text-yellow-300 text-xs">{CHURCH_INFO.location}</p>
              </div>
            </Link>

            <div className="hidden lg:flex items-center space-x-6">
              <div className="flex space-x-6 text-white">
                {navLinks.map((link) => (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={`hover:text-yellow-400 transition-colors duration-200 ${
                      isActivePath(link.path) ? 'text-yellow-400 font-semibold' : ''
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>

              {user ? (
                <div className="flex items-center gap-3">
                  <span className="text-white text-sm">Hi, {user.name}</span>
                  {isAdmin && (
                    <Link
                      to="/admin"
                      className="bg-yellow-400 text-blue-900 px-4 py-2 rounded-lg font-semibold hover:bg-yellow-300 transition-colors flex items-center gap-2"
                    >
                      <Settings size={16} /> Admin
                    </Link>
                  )}
                  <button
                    onClick={handleLogout}
                    className="bg-white/20 text-white px-4 py-2 rounded-lg hover:bg-white/30 transition-colors flex items-center gap-2"
                  >
                    <LogOut size={16} /> Logout
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleAuthClick}
                  className="bg-yellow-400 text-blue-900 px-6 py-2 rounded-lg font-semibold hover:bg-yellow-300 transition-colors flex items-center gap-2"
                >
                  <LogIn size={16} /> Sign In
                </button>
              )}
            </div>

            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden text-white p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              {isMobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
            </button>
          </div>
        </div>

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
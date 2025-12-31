// src/components/layout/MobileMenu.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import { Settings } from 'lucide-react';

const MobileMenu = ({ isOpen, navLinks, user, isAdmin, onAuthClick, onLogout, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="lg:hidden bg-blue-800 text-white px-4 pb-4">
      {navLinks.map((link) => (
        <Link
          key={link.path}
          to={link.path}
          onClick={onClose}
          className="block py-3 text-lg hover:text-yellow-400 transition-colors border-b border-blue-700"
        >
          {link.label}
        </Link>
      ))}
      
      <div className="mt-4 pt-4 border-t border-blue-700">
        {user ? (
          <div className="space-y-3">
            <p className="text-sm mb-2">Hi, {user.name}</p>
            {isAdmin && (
              <Link
                to="/admin"
                onClick={onClose}
                className="w-full bg-yellow-400 text-blue-900 py-2 px-4 rounded-lg font-semibold flex items-center justify-center gap-2"
              >
                <Settings size={16} /> Admin Dashboard
              </Link>
            )}
            <button
              onClick={() => {
                onLogout();
                onClose();
              }}
              className="w-full bg-white/20 text-white py-2 rounded-lg"
            >
              Logout
            </button>
          </div>
        ) : (
          <button
            onClick={() => {
              onAuthClick();
              onClose();
            }}
            className="w-full bg-yellow-400 text-blue-900 py-2 rounded-lg font-semibold"
          >
            Sign In
          </button>
        )}
      </div>
    </div>
  );
};

export default MobileMenu;
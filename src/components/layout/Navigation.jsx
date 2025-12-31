// src/components/layout/Navigation.jsx
import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const Navigation = ({ navLinks, className = '' }) => {
  const location = useLocation();

  const isActivePath = (path) => {
    return location.pathname === path;
  };

  return (
    <nav className={className}>
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
    </nav>
  );
};

export default Navigation;
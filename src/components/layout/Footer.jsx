// src/components/layout/Footer.jsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Facebook, Youtube, Instagram, Mail } from 'lucide-react';
import { CHURCH_INFO, SERVICE_TIMES, SOCIAL_LINKS } from '../../utils/constants';

const Footer = () => {
  const [email, setEmail] = useState('');

  const handleSubscribe = (e) => {
    e.preventDefault();
    alert('Thank you for subscribing!');
    setEmail('');
  };

  return (
    <footer className="bg-blue-900 text-white py-12">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          <div>
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-yellow-400 rounded-full flex items-center justify-center text-xl">
                ✝️
              </div>
              <h3 className="font-bold text-lg">{CHURCH_INFO.name}</h3>
            </div>
            <p className="text-gray-300 text-sm mb-4">
              Transforming lives through God's love in {CHURCH_INFO.location}
            </p>
            <div className="flex gap-3">
              <a href={SOCIAL_LINKS.facebook} target="_blank" rel="noopener noreferrer" className="bg-blue-600 p-2 rounded-full hover:bg-blue-700 transition-colors">
                <Facebook size={20} />
              </a>
              <a href={SOCIAL_LINKS.youtube} target="_blank" rel="noopener noreferrer" className="bg-red-600 p-2 rounded-full hover:bg-red-700 transition-colors">
                <Youtube size={20} />
              </a>
              <a href={SOCIAL_LINKS.instagram} target="_blank" rel="noopener noreferrer" className="bg-pink-600 p-2 rounded-full hover:bg-pink-700 transition-colors">
                <Instagram size={20} />
              </a>
            </div>
          </div>

          <div>
            <h4 className="font-bold mb-4">Quick Links</h4>
            <ul className="space-y-2 text-gray-300 text-sm">
              <li><Link to="/about" className="hover:text-yellow-400 transition-colors">About Us</Link></li>
              <li><Link to="/sermons" className="hover:text-yellow-400 transition-colors">Sermons</Link></li>
              <li><Link to="/events" className="hover:text-yellow-400 transition-colors">Events</Link></li>
              <li><Link to="/ministries" className="hover:text-yellow-400 transition-colors">Ministries</Link></li>
              <li><Link to="/blog" className="hover:text-yellow-400 transition-colors">Blog</Link></li>
              <li><Link to="/volunteer" className="hover:text-yellow-400 transition-colors">Volunteer</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold mb-4">Service Times</h4>
            <ul className="space-y-2 text-gray-300 text-sm">
              <li>{SERVICE_TIMES.sunday.day}: {SERVICE_TIMES.sunday.time}</li>
              <li>{SERVICE_TIMES.wednesday.day}: {SERVICE_TIMES.wednesday.time}</li>
              <li>{SERVICE_TIMES.friday.day}: {SERVICE_TIMES.friday.time}</li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold mb-4">Newsletter</h4>
            <p className="text-gray-300 text-sm mb-4">Stay updated with our latest news</p>
            <div className="space-y-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Your email"
                className="w-full px-4 py-2 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-yellow-400"
              />
              <button
                onClick={handleSubscribe}
                className="w-full bg-yellow-400 text-blue-900 py-2 rounded-lg font-bold hover:bg-yellow-300 transition-colors flex items-center justify-center gap-2"
              >
                <Mail size={16} /> Subscribe
              </button>
            </div>
          </div>
        </div>

        <div className="border-t border-blue-800 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center text-sm">
            <p className="text-gray-300 mb-4 md:mb-0">
              &copy; {new Date().getFullYear()} {CHURCH_INFO.name}. All rights reserved.
            </p>
            <div className="flex items-center gap-4 text-gray-300">
              <Link to="/privacy" className="hover:text-yellow-400 transition-colors">Privacy Policy</Link>
              <span>|</span>
              <Link to="/terms" className="hover:text-yellow-400 transition-colors">Terms of Service</Link>
              <span>|</span>
              <span>Built with ❤️ for God's glory</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
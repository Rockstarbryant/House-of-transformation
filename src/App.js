import React, { useState, useEffect } from 'react';
import { Menu, X, ChevronRight, Calendar, MapPin, Heart, BookOpen, Users, Phone, Mail, Facebook, Youtube, Instagram, Play, Clock, Download } from 'lucide-react';

const ChurchWebsite = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('home');
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Sample data - replace with real data from your backend
  const upcomingEvents = [
    { id: 1, title: "Sunday Worship Service", date: "2025-01-05", time: "9:00 AM - 12:00 PM", location: "Main Sanctuary" },
    { id: 2, title: "Youth Fellowship", date: "2025-01-08", time: "5:00 PM - 7:00 PM", location: "Youth Hall" },
    { id: 3, title: "Bible Study", date: "2025-01-10", time: "6:30 PM - 8:00 PM", location: "Conference Room" }
  ];

  const recentSermons = [
    { id: 1, title: "Walking in Faith", pastor: "Pastor James Omondi", date: "Dec 22, 2024", duration: "45 min", thumbnail: "🎥" },
    { id: 2, title: "The Power of Prayer", pastor: "Pastor Sarah Wanjiku", date: "Dec 15, 2024", duration: "38 min", thumbnail: "🎥" },
    { id: 3, title: "Living with Purpose", pastor: "Pastor James Omondi", date: "Dec 8, 2024", duration: "42 min", thumbnail: "🎥" }
  ];

  const ministries = [
    { name: "Children's Ministry", description: "Nurturing young hearts in faith", icon: "👶" },
    { name: "Youth Ministry", description: "Empowering the next generation", icon: "🌟" },
    { name: "Women's Fellowship", description: "Building strong women of God", icon: "👭" },
    { name: "Men's Fellowship", description: "Iron sharpening iron", icon: "🤝" },
    { name: "Worship Team", description: "Leading hearts in worship", icon: "🎵" },
    { name: "Outreach Ministry", description: "Touching lives in the community", icon: "❤️" }
  ];

  const NavLink = ({ href, children, mobile = false }) => (
    <a
      href={href}
      onClick={(e) => {
        e.preventDefault();
        setActiveSection(href.replace('#', ''));
        setIsMenuOpen(false);
        document.getElementById(href.replace('#', ''))?.scrollIntoView({ behavior: 'smooth' });
      }}
      className={`${mobile ? 'block py-2 text-lg' : 'hover:text-yellow-400'} transition-colors duration-200`}
    >
      {children}
    </a>
  );

  return (
    <div className="min-h-screen bg-white font-sans">
      {/* Navigation */}
      <nav className={`fixed w-full z-50 transition-all duration-300 ${isScrolled ? 'bg-blue-900 shadow-lg' : 'bg-blue-900/95'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-yellow-400 rounded-full flex items-center justify-center text-2xl">
                ✝️
              </div>
              <div>
                <h1 className="text-white font-bold text-xl">House of Transformation</h1>
                <p className="text-yellow-300 text-xs">Busia County, Kenya</p>
              </div>
            </div>

            {/* Desktop Menu */}
            <div className="hidden md:flex space-x-8 text-white">
              <NavLink href="#home">Home</NavLink>
              <NavLink href="#about">About</NavLink>
              <NavLink href="#sermons">Sermons</NavLink>
              <NavLink href="#events">Events</NavLink>
              <NavLink href="#ministries">Ministries</NavLink>
              <NavLink href="#contact">Contact</NavLink>
            </div>

            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden text-white p-2"
            >
              {isMenuOpen ? <X size={28} /> : <Menu size={28} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden bg-blue-800 text-white px-4 pb-4">
            <NavLink href="#home" mobile>Home</NavLink>
            <NavLink href="#about" mobile>About</NavLink>
            <NavLink href="#sermons" mobile>Sermons</NavLink>
            <NavLink href="#events" mobile>Events</NavLink>
            <NavLink href="#ministries" mobile>Ministries</NavLink>
            <NavLink href="#contact" mobile>Contact</NavLink>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section id="home" className="relative h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 via-blue-800 to-purple-900 text-white pt-20">
        <div className="absolute inset-0 bg-black/30"></div>
        <div className="relative z-10 text-center px-4 max-w-4xl">
          <h1 className="text-5xl md:text-7xl font-bold mb-6 animate-fade-in">Welcome Home</h1>
          <p className="text-xl md:text-2xl mb-8 text-gray-200">Experience God's transforming love in Busia County</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="bg-yellow-400 text-blue-900 px-8 py-4 rounded-full font-bold hover:bg-yellow-300 transition-all transform hover:scale-105 flex items-center justify-center gap-2">
              <Play size={20} /> Watch Live Now
            </button>
            <button className="bg-white/10 backdrop-blur-sm text-white px-8 py-4 rounded-full font-bold hover:bg-white/20 transition-all border-2 border-white">
              Plan Your Visit
            </button>
          </div>
        </div>
      </section>

      {/* Quick Info Bar */}
      <section className="bg-yellow-400 py-6">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
          <div className="flex items-center justify-center gap-3">
            <Calendar className="text-blue-900" size={32} />
            <div className="text-left">
              <p className="font-bold text-blue-900">Sunday Service</p>
              <p className="text-sm text-blue-800">9:00 AM - 12:00 PM</p>
            </div>
          </div>
          <div className="flex items-center justify-center gap-3">
            <MapPin className="text-blue-900" size={32} />
            <div className="text-left">
              <p className="font-bold text-blue-900">Location</p>
              <p className="text-sm text-blue-800">Busia County, Kenya</p>
            </div>
          </div>
          <div className="flex items-center justify-center gap-3">
            <Heart className="text-blue-900" size={32} />
            <div className="text-left">
              <p className="font-bold text-blue-900">Get Involved</p>
              <p className="text-sm text-blue-800">Join a Ministry Today</p>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-blue-900 mb-4">About Us</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              A community of believers committed to transforming lives through God's love
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="bg-gradient-to-br from-blue-900 to-purple-900 h-96 rounded-2xl flex items-center justify-center text-white text-6xl">
                🏛️
              </div>
            </div>
            <div className="space-y-6">
              <h3 className="text-3xl font-bold text-blue-900">Our Mission</h3>
              <p className="text-gray-700 leading-relaxed">
                At House of Transformation, we believe in the power of God to transform lives. Located in the heart of Busia County, Kenya, we are a vibrant community of believers dedicated to spreading the gospel, nurturing spiritual growth, and serving our community with love and compassion.
              </p>
              <p className="text-gray-700 leading-relaxed">
                Whether you're seeking spiritual guidance, looking for a church family, or want to grow in your faith, you'll find a warm welcome here. We are committed to biblical teaching, authentic worship, and practical discipleship.
              </p>
              <div className="grid grid-cols-3 gap-4 pt-6">
                <div className="text-center">
                  <p className="text-4xl font-bold text-blue-900">500+</p>
                  <p className="text-sm text-gray-600">Members</p>
                </div>
                <div className="text-center">
                  <p className="text-4xl font-bold text-blue-900">15+</p>
                  <p className="text-sm text-gray-600">Ministries</p>
                </div>
                <div className="text-center">
                  <p className="text-4xl font-bold text-blue-900">8</p>
                  <p className="text-sm text-gray-600">Years</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Live Stream Section */}
      <section className="py-20 bg-blue-900 text-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">Join Us Live</h2>
            <p className="text-xl text-gray-300">Watch our services from anywhere in the world</p>
          </div>
          <div className="max-w-4xl mx-auto">
            <div className="bg-black/30 rounded-2xl overflow-hidden aspect-video flex items-center justify-center">
              <div className="text-center space-y-4">
                <div className="w-24 h-24 bg-red-600 rounded-full flex items-center justify-center mx-auto">
                  <Play size={40} fill="white" />
                </div>
                <p className="text-2xl font-bold">Live Stream</p>
                <p className="text-gray-300">Next service: Sunday, 9:00 AM EAT</p>
                <button className="bg-yellow-400 text-blue-900 px-8 py-3 rounded-full font-bold hover:bg-yellow-300 transition-all">
                  Set Reminder
                </button>
              </div>
            </div>
            <p className="text-center mt-6 text-gray-300">
              Note: Replace this placeholder with your actual live stream embed (YouTube Live, Facebook Live, or custom solution)
            </p>
          </div>
        </div>
      </section>

      {/* Sermons Section */}
      <section id="sermons" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-blue-900 mb-4">Recent Sermons</h2>
            <p className="text-xl text-gray-600">Watch and grow in your faith</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {recentSermons.map(sermon => (
              <div key={sermon.id} className="bg-gray-50 rounded-xl overflow-hidden hover:shadow-xl transition-shadow">
                <div className="bg-gradient-to-br from-blue-900 to-purple-900 h-48 flex items-center justify-center text-6xl">
                  {sermon.thumbnail}
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-bold text-blue-900 mb-2">{sermon.title}</h3>
                  <p className="text-gray-600 mb-2">{sermon.pastor}</p>
                  <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                    <span className="flex items-center gap-1">
                      <Calendar size={16} /> {sermon.date}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock size={16} /> {sermon.duration}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button className="flex-1 bg-blue-900 text-white py-2 rounded-lg hover:bg-blue-800 transition-colors flex items-center justify-center gap-2">
                      <Play size={16} /> Watch
                    </button>
                    <button className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors">
                      <Download size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="text-center mt-12">
            <button className="bg-blue-900 text-white px-8 py-3 rounded-full font-bold hover:bg-blue-800 transition-all flex items-center gap-2 mx-auto">
              View All Sermons <ChevronRight size={20} />
            </button>
          </div>
        </div>
      </section>

      {/* Events Section */}
      <section id="events" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-blue-900 mb-4">Upcoming Events</h2>
            <p className="text-xl text-gray-600">Join us for these special gatherings</p>
          </div>
          <div className="space-y-6 max-w-4xl mx-auto">
            {upcomingEvents.map(event => (
              <div key={event.id} className="bg-white rounded-xl p-6 shadow-md hover:shadow-xl transition-shadow flex flex-col md:flex-row gap-6 items-start md:items-center">
                <div className="bg-blue-900 text-white rounded-lg p-4 text-center min-w-[80px]">
                  <p className="text-3xl font-bold">{new Date(event.date).getDate()}</p>
                  <p className="text-sm">{new Date(event.date).toLocaleString('default', { month: 'short' })}</p>
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-blue-900 mb-2">{event.title}</h3>
                  <p className="text-gray-600 mb-1 flex items-center gap-2">
                    <Clock size={16} /> {event.time}
                  </p>
                  <p className="text-gray-600 flex items-center gap-2">
                    <MapPin size={16} /> {event.location}
                  </p>
                </div>
                <button className="bg-yellow-400 text-blue-900 px-6 py-2 rounded-full font-bold hover:bg-yellow-300 transition-all whitespace-nowrap">
                  Learn More
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Ministries Section */}
      <section id="ministries" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-blue-900 mb-4">Our Ministries</h2>
            <p className="text-xl text-gray-600">Find your place to serve and grow</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {ministries.map((ministry, index) => (
              <div key={index} className="bg-gray-50 rounded-xl p-8 text-center hover:shadow-xl transition-all transform hover:-translate-y-2">
                <div className="text-6xl mb-4">{ministry.icon}</div>
                <h3 className="text-xl font-bold text-blue-900 mb-3">{ministry.name}</h3>
                <p className="text-gray-600 mb-4">{ministry.description}</p>
                <button className="text-blue-900 font-semibold hover:text-blue-700 flex items-center gap-1 mx-auto">
                  Learn More <ChevronRight size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Donation Section */}
      <section className="py-20 bg-gradient-to-br from-blue-900 to-purple-900 text-white">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <Heart className="mx-auto mb-6" size={64} />
          <h2 className="text-4xl font-bold mb-6">Support Our Mission</h2>
          <p className="text-xl text-gray-200 mb-8">
            Your generous giving helps us spread God's love, support our community programs, and maintain our church facilities.
          </p>
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
              <p className="text-3xl font-bold mb-2">🏛️</p>
              <p className="font-semibold">Building Fund</p>
              <p className="text-sm text-gray-300 mt-2">Help us expand our facilities</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
              <p className="text-3xl font-bold mb-2">❤️</p>
              <p className="font-semibold">Community Outreach</p>
              <p className="text-sm text-gray-300 mt-2">Supporting those in need</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
              <p className="text-3xl font-bold mb-2">📚</p>
              <p className="font-semibold">Ministry Programs</p>
              <p className="text-sm text-gray-300 mt-2">Equipping disciples</p>
            </div>
          </div>
          <button className="bg-yellow-400 text-blue-900 px-10 py-4 rounded-full font-bold text-lg hover:bg-yellow-300 transition-all transform hover:scale-105">
            Give Now
          </button>
          <p className="text-sm text-gray-300 mt-4">Secure online giving through M-Pesa, Bank Transfer, or Card</p>
        </div>
      </section>

      {/* Contact & Map Section */}
      <section id="contact" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-blue-900 mb-4">Visit Us</h2>
            <p className="text-xl text-gray-600">We'd love to see you this Sunday</p>
          </div>
          <div className="grid md:grid-cols-2 gap-12">
            <div>
              <div className="bg-white rounded-xl p-8 shadow-lg mb-6">
                <h3 className="text-2xl font-bold text-blue-900 mb-6">Get In Touch</h3>
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <MapPin className="text-blue-900 mt-1" size={24} />
                    <div>
                      <p className="font-semibold text-gray-900">Address</p>
                      <p className="text-gray-600">Main Street, Busia Town<br />Busia County, Kenya</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <Phone className="text-blue-900 mt-1" size={24} />
                    <div>
                      <p className="font-semibold text-gray-900">Phone</p>
                      <p className="text-gray-600">+254 700 000 000</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <Mail className="text-blue-900 mt-1" size={24} />
                    <div>
                      <p className="font-semibold text-gray-900">Email</p>
                      <p className="text-gray-600">info@houseoftransformation.or.ke</p>
                    </div>
                  </div>
                </div>
                <div className="mt-8 pt-8 border-t border-gray-200">
                  <p className="font-semibold text-gray-900 mb-4">Follow Us</p>
                  <div className="flex gap-4">
                    <button className="bg-blue-600 text-white p-3 rounded-full hover:bg-blue-700 transition-colors">
                      <Facebook size={24} />
                    </button>
                    <button className="bg-red-600 text-white p-3 rounded-full hover:bg-red-700 transition-colors">
                      <Youtube size={24} />
                    </button>
                    <button className="bg-pink-600 text-white p-3 rounded-full hover:bg-pink-700 transition-colors">
                      <Instagram size={24} />
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-xl p-8 shadow-lg">
                <h3 className="text-2xl font-bold text-blue-900 mb-4">Send Us a Message</h3>
                <div className="space-y-4">
                  <input
                    type="text"
                    placeholder="Your Name"
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-900"
                  />
                  <input
                    type="email"
                    placeholder="Your Email"
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-900"
                  />
                  <textarea
                    placeholder="Your Message"
                    rows="4"
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-900"
                  ></textarea>
                  <button 
                    onClick={(e) => {
                      e.preventDefault();
                      alert('Thank you! Your message has been sent. We will get back to you soon.');
                    }}
                    className="w-full bg-blue-900 text-white py-3 rounded-lg font-bold hover:bg-blue-800 transition-colors"
                  >
                    Send Message
                  </button>
                </div>
              </div>
            </div>

            <div>
              <div className="bg-white rounded-xl overflow-hidden shadow-lg h-full min-h-[600px]">
                <iframe
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d127636.05878906237!2d34.11225!3d0.46012!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x177d8f0f0f0f0f0f%3A0x0!2sBusia%2C%20Kenya!5e0!3m2!1sen!2sus!4v1234567890"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen=""
                  loading="lazy"
                  title="Church Location"
                ></iframe>
              </div>
              <p className="text-center mt-4 text-gray-600 text-sm">
                Note: Update the map coordinates to your exact church location
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-blue-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-yellow-400 rounded-full flex items-center justify-center text-xl">
                  ✝️
                </div>
                <h3 className="font-bold text-lg">House of Transformation</h3>
              </div>
              <p className="text-gray-300 text-sm">
                Transforming lives through God's love in Busia County, Kenya
              </p>
            </div>
            <div>
              <h4 className="font-bold mb-4">Quick Links</h4>
              <ul className="space-y-2 text-gray-300 text-sm">
                <li><a href="#about" className="hover:text-yellow-400">About Us</a></li>
                <li><a href="#sermons" className="hover:text-yellow-400">Sermons</a></li>
                <li><a href="#events" className="hover:text-yellow-400">Events</a></li>
                <li><a href="#ministries" className="hover:text-yellow-400">Ministries</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">Service Times</h4>
              <ul className="space-y-2 text-gray-300 text-sm">
                <li>Sunday: 9:00 AM - 12:00 PM</li>
                <li>Wednesday: 6:30 PM - 8:00 PM</li>
                <li>Friday: 7:00 PM - 9:00 PM</li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">Newsletter</h4>
              <p className="text-gray-300 text-sm mb-4">Stay updated with our latest news</p>
              <input
                type="email"
                placeholder="Your email"
                className="w-full px-4 py-2 rounded-lg text-gray-900 mb-2"
              />
              <button className="w-full bg-yellow-400 text-blue-900 py-2 rounded-lg font-bold hover:bg-yellow-300 transition-colors">
                Subscribe
              </button>
            </div>
          </div>
          <div className="border-t border-blue-800 pt-8 text-center text-gray-300 text-sm">
            <p>&copy; 2025 House of Transformation Church. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default ChurchWebsite;
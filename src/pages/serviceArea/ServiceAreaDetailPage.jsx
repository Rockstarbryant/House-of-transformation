// src/pages/serviceArea/ServiceAreaDetailPage.jsx
import React, { useState } from 'react';
import { ArrowLeft, Users, Clock, Mail, Phone, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import Modal from '../../components/common/Modal';
import ApplicationForm from '../../components/volunteer/ApplicationForm';
import { volunteerService } from '../../services/api/volunteerService';

const ServiceAreaDetailPage = ({ 
  name, 
  description, 
  imageUrl, 
  teamCount, 
  timeCommitment,
  teamLead,
  email,
  phone,
  responsibilities,
  requirements,
  schedule,
  testimonials,
  galleryImages
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState({ type: '', text: '' });

  const handleApply = () => {
    setIsModalOpen(true);
    setSubmitMessage({ type: '', text: '' });
  };

  const handleSubmit = async (formData) => {
    setIsSubmitting(true);
    setSubmitMessage({ type: '', text: '' });

    try {
      const response = await volunteerService.apply(formData);
      
      if (response.success) {
        setSubmitMessage({
          type: 'success',
          text: 'Application submitted successfully! We will review your application and get back to you soon.'
        });
        
        setTimeout(() => {
          setIsModalOpen(false);
          setSubmitMessage({ type: '', text: '' });
        }, 2000);
      }
    } catch (error) {
      console.error('Application error:', error);
      setSubmitMessage({
        type: 'error',
        text: error.response?.data?.message || 'Failed to submit application. Please try again.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseModal = () => {
    if (!isSubmitting) {
      setIsModalOpen(false);
      setSubmitMessage({ type: '', text: '' });
    }
  };

  return (
    <div className="pt-20 pb-20 bg-gray-50 min-h-screen">
      {/* Back Button */}
      <div className="max-w-5xl mx-auto px-4 pt-8">
        <Link to="/ServiceArea" className="flex items-center gap-2 text-blue-600 hover:text-blue-800 font-semibold mb-8">
          <ArrowLeft size={20} /> Back to Service Areas
        </Link>
      </div>

      <div className="max-w-5xl mx-auto px-4">
        {/* Header Section */}
        <div className="mb-12">
          <img 
            src={imageUrl} 
            alt={name}
            className="w-full h-96 object-cover rounded-2xl mb-8 shadow-lg"
          />
          <div className="bg-white rounded-2xl p-8 shadow-lg">
            <h1 className="text-5xl font-bold text-blue-900 mb-4">{name}</h1>
            <p className="text-xl text-gray-600 mb-8">{description}</p>
            
            {/* Quick Stats */}
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <div className="flex items-center gap-3">
                <Users className="text-blue-600" size={28} />
                <div>
                  <p className="text-sm text-gray-600">Team Size</p>
                  <p className="text-2xl font-bold text-blue-900">{teamCount} Members</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="text-blue-600" size={28} />
                <div>
                  <p className="text-sm text-gray-600">Time Commitment</p>
                  <p className="text-2xl font-bold text-blue-900">{timeCommitment}</p>
                </div>
              </div>
              <div className="bg-blue-50 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-2">Team Lead</p>
                <p className="font-bold text-blue-900">{teamLead}</p>
                <p className="text-sm text-gray-600 mt-2">{email}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-8 mb-12">
          {/* Left Column - Info */}
          <div className="lg:col-span-2 space-y-8">
            {/* Responsibilities */}
            <div className="bg-white rounded-2xl p-8 shadow-lg">
              <h2 className="text-3xl font-bold text-blue-900 mb-6">Responsibilities</h2>
              <ul className="space-y-4">
                {responsibilities.map((item, idx) => (
                  <li key={idx} className="flex gap-4">
                    <span className="text-blue-600 text-2xl mt-1">•</span>
                    <span className="text-gray-700">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Requirements */}
            <div className="bg-white rounded-2xl p-8 shadow-lg">
              <h2 className="text-3xl font-bold text-blue-900 mb-6">Requirements</h2>
              <ul className="space-y-4">
                {requirements.map((item, idx) => (
                  <li key={idx} className="flex gap-4">
                    <span className="text-blue-600 text-2xl mt-1">✓</span>
                    <span className="text-gray-700">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Schedule */}
            <div className="bg-white rounded-2xl p-8 shadow-lg">
              <h2 className="text-3xl font-bold text-blue-900 mb-6">Schedule</h2>
              <div className="space-y-3 text-gray-700">
                {schedule.map((item, idx) => (
                  <p key={idx} className="flex items-center gap-2">
                    <Clock size={20} className="text-blue-600" />
                    {item}
                  </p>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column - Contact & CTA */}
          <div className="space-y-8">
            {/* Contact Card */}
            <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl p-8 text-white shadow-lg sticky top-32">
              <h3 className="text-2xl font-bold mb-6">Get In Touch</h3>
              
              <div className="space-y-4 mb-8">
                <div>
                  <p className="text-blue-100 text-sm mb-1">Team Lead</p>
                  <p className="font-semibold">{teamLead}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Mail size={20} />
                  <a href={`mailto:${email}`} className="hover:text-blue-100 transition">
                    {email}
                  </a>
                </div>
                <div className="flex items-center gap-3">
                  <Phone size={20} />
                  <a href={`tel:${phone}`} className="hover:text-blue-100 transition">
                    {phone}
                  </a>
                </div>
              </div>

              <button 
                onClick={handleApply}
                className="w-full bg-white text-blue-600 font-bold py-3 rounded-lg hover:bg-gray-100 transition flex items-center justify-center gap-2"
              >
                <Plus size={20} /> Join This Team
              </button>
            </div>
          </div>
        </div>

        {/* Gallery Section */}
        <div className="bg-white rounded-2xl p-8 shadow-lg mb-12">
          <h2 className="text-3xl font-bold text-blue-900 mb-8">Team in Action</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {galleryImages.map((image, idx) => (
              <img
                key={idx}
                src={image}
                alt={`${name} team`}
                className="w-full h-48 object-cover rounded-xl shadow-md hover:shadow-lg transition"
              />
            ))}
          </div>
        </div>

        {/* Testimonials Section */}
        <div className="bg-white rounded-2xl p-8 shadow-lg mb-12">
          <h2 className="text-3xl font-bold text-blue-900 mb-8">Team Member Testimonials</h2>
          <div className="grid md:grid-cols-2 gap-8">
            {testimonials.map((testimonial, idx) => (
              <div key={idx} className="border-l-4 border-blue-600 pl-6 py-4">
                <p className="text-gray-700 italic mb-4">"{testimonial.quote}"</p>
                <div>
                  <p className="font-bold text-blue-900">{testimonial.name}</p>
                  <p className="text-sm text-gray-600">{testimonial.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-2xl p-12 text-center text-white shadow-lg">
          <h2 className="text-4xl font-bold mb-4">Ready to Join?</h2>
          <p className="text-lg text-blue-100 mb-8 max-w-2xl mx-auto">
            We'd love to have you serve with us! Contact the team lead to learn more.
          </p>
          <button 
            onClick={handleApply}
            className="bg-white text-blue-600 px-8 py-3 font-bold rounded-lg hover:bg-gray-100 transition"
          >
            Get Involved
          </button>
        </div>
      </div>

      {/* Application Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={`Apply for ${name}`}
        size="lg"
      >
        {submitMessage.text && (
          <div
            className={`mb-4 p-4 rounded-lg ${
              submitMessage.type === 'success'
                ? 'bg-green-50 text-green-800 border border-green-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            {submitMessage.text}
          </div>
        )}
        
        {!submitMessage.text && (
          <ApplicationForm
            ministry={name}
            onSubmit={handleSubmit}
            onClose={handleCloseModal}
            isSubmitting={isSubmitting}
          />
        )}
      </Modal>
    </div>
  );
};

export default ServiceAreaDetailPage;
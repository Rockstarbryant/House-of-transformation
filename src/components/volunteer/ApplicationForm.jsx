import React, { useState, useEffect } from 'react';
import Input from '../common/Input';
import Button from '../common/Button';
import { useAuthContext } from '../../context/AuthContext';
import { Loader } from 'lucide-react';

const ApplicationForm = ({ ministry, onSubmit, onClose, isSubmitting }) => {
  const { user } = useAuthContext();
  
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    ministry: ministry || '',
    availability: '',
    motivation: '',
    previousExperience: '',
    skills: ''
  });

  const [errors, setErrors] = useState({});

  // Auto-fill user data if logged in
  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        fullName: user.name || '',
        email: user.email || ''
      }));
    }
    if (ministry) {
      setFormData(prev => ({
        ...prev,
        ministry: ministry
      }));
    }
  }, [user, ministry]);

  // If user is not authenticated, show message
  if (!user) {
    return (
      <div className="text-center py-8">
        <div className="mb-4">
          <svg className="w-16 h-16 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">Authentication Required</h3>
        <p className="text-gray-600 mb-6">
          Please sign in or create an account to apply for volunteer positions.
        </p>
        <button
          onClick={onClose}
          className="px-6 py-3 bg-blue-900 text-white rounded-lg font-semibold hover:bg-blue-800 transition"
        >
          Close
        </button>
      </div>
    );
  }

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^[+]?[\d\s\-()]+$/.test(formData.phone)) {
      newErrors.phone = 'Please enter a valid phone number';
    }

    if (!formData.ministry) {
      newErrors.ministry = 'Please select a ministry';
    }

    if (!formData.availability.trim()) {
      newErrors.availability = 'Please specify your availability';
    }

    if (!formData.motivation.trim()) {
      newErrors.motivation = 'Please tell us why you want to serve';
    } else if (formData.motivation.trim().length < 20) {
      newErrors.motivation = 'Please provide at least 20 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (validateForm()) {
      await onSubmit(formData);
    }
  };

  const ministries = [
    'Worship Team',
    'Children\'s Ministry',
    'Ushering Team',
    'Technical Team',
    'Community Outreach'
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Required Fields Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">
          Personal Information
        </h3>
        
        <div>
          <Input
            name="fullName"
            label="Full Name"
            value={formData.fullName}
            onChange={handleChange}
            required
            placeholder="Enter your full name"
            disabled={isSubmitting}
          />
          {errors.fullName && (
            <p className="text-red-600 text-sm mt-1">{errors.fullName}</p>
          )}
        </div>

        <div>
          <Input
            name="email"
            type="email"
            label="Email Address"
            value={formData.email}
            onChange={handleChange}
            required
            placeholder="your.email@example.com"
            disabled={isSubmitting}
          />
          {errors.email && (
            <p className="text-red-600 text-sm mt-1">{errors.email}</p>
          )}
        </div>

        <div>
          <Input
            name="phone"
            label="Phone Number"
            value={formData.phone}
            onChange={handleChange}
            required
            placeholder="+254 700 000 000"
            disabled={isSubmitting}
          />
          {errors.phone && (
            <p className="text-red-600 text-sm mt-1">{errors.phone}</p>
          )}
        </div>
      </div>

      {/* Ministry Selection */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">
          Ministry Interest
        </h3>
        
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Ministry Interested In <span className="text-red-600">*</span>
          </label>
          <select
            name="ministry"
            value={formData.ministry}
            onChange={handleChange}
            required
            disabled={isSubmitting || !!ministry}
            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-900 disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            <option value="">Select a ministry</option>
            {ministries.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          {errors.ministry && (
            <p className="text-red-600 text-sm mt-1">{errors.ministry}</p>
          )}
        </div>
      </div>

      {/* Availability */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Availability (Days/Times) <span className="text-red-600">*</span>
        </label>
        <textarea
          name="availability"
          value={formData.availability}
          onChange={handleChange}
          rows="3"
          required
          disabled={isSubmitting}
          placeholder="e.g., Sundays 8am-1pm, Wednesdays 6pm-9pm"
          className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-900 disabled:bg-gray-100 disabled:cursor-not-allowed"
        />
        {errors.availability && (
          <p className="text-red-600 text-sm mt-1">{errors.availability}</p>
        )}
      </div>

      {/* Motivation */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Why do you want to serve? <span className="text-red-600">*</span>
        </label>
        <textarea
          name="motivation"
          value={formData.motivation}
          onChange={handleChange}
          rows="4"
          required
          disabled={isSubmitting}
          placeholder="Share your heart for serving in this ministry..."
          className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-900 disabled:bg-gray-100 disabled:cursor-not-allowed"
        />
        <p className="text-sm text-gray-500 mt-1">
          {formData.motivation.length} characters (minimum 20)
        </p>
        {errors.motivation && (
          <p className="text-red-600 text-sm mt-1">{errors.motivation}</p>
        )}
      </div>

      {/* Optional Fields */}
      <div className="space-y-4 pt-4 border-t">
        <h3 className="text-lg font-semibold text-gray-800">
          Additional Information <span className="text-sm text-gray-500 font-normal">(Optional)</span>
        </h3>
        
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Previous Experience
          </label>
          <textarea
            name="previousExperience"
            value={formData.previousExperience}
            onChange={handleChange}
            rows="3"
            disabled={isSubmitting}
            placeholder="Any previous volunteer or ministry experience..."
            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-900 disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Skills
          </label>
          <textarea
            name="skills"
            value={formData.skills}
            onChange={handleChange}
            rows="3"
            disabled={isSubmitting}
            placeholder="e.g., Music, sound engineering, teaching, communication..."
            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-900 disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4">
        <Button
          type="button"
          variant="secondary"
          onClick={onClose}
          disabled={isSubmitting}
          className="flex-1"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="primary"
          disabled={isSubmitting}
          className="flex-1"
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center gap-2">
              <Loader className="animate-spin" size={20} />
              Submitting...
            </span>
          ) : (
            'Submit Application'
          )}
        </Button>
      </div>
    </form>
  );
};

export default ApplicationForm;
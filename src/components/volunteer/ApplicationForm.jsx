import React, { useState } from 'react';
import Input from '../common/Input';
import Button from '../common/Button';
import Card from '../common/Card';

const ApplicationForm = ({ opportunityId, onSubmit }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    experience: '',
    motivation: ''
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Card>
      <h3 className="text-2xl font-bold text-blue-900 mb-6">Volunteer Application</h3>
      <div className="space-y-4">
        <Input name="name" label="Full Name" value={formData.name} onChange={handleChange} required />
        <Input name="email" type="email" label="Email" value={formData.email} onChange={handleChange} required />
        <Input name="phone" label="Phone Number" value={formData.phone} onChange={handleChange} required />
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Previous Experience
          </label>
          <textarea
            name="experience"
            value={formData.experience}
            onChange={handleChange}
            rows="3"
            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-900"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Why do you want to volunteer? *
          </label>
          <textarea
            name="motivation"
            value={formData.motivation}
            onChange={handleChange}
            rows="4"
            required
            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-900"
          />
        </div>
        <Button type="submit" variant="primary" fullWidth onClick={handleSubmit}>
          Submit Application
        </Button>
      </div>
    </Card>
  );
};

export default ApplicationForm;
// ============================================
// FILE 22: pages/PledgePage.jsx
// ============================================
import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertCircle, CheckCircle } from 'lucide-react';
import axios from 'axios';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';

const API_URL = process.env.REACT_APP_DONATION_API_URL || 'http://localhost:5001/api';

const PledgePage = () => {
  const { campaignId } = useParams();
  const navigate = useNavigate();
  const token = localStorage.getItem('authToken');

  const [formData, setFormData] = useState({
    pledgedAmount: '',
    installmentPlan: 'lump-sum',
    memberPhone: '',
    memberEmail: '',
    notes: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await axios.post(
        `${API_URL}/pledges`,
        {
          campaignId,
          ...formData,
          pledgedAmount: parseFloat(formData.pledgedAmount)
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.success) {
        setSuccess(true);
        setTimeout(() => {
          navigate('/donations/dashboard');
        }, 3000);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create pledge');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="pt-20 pb-20 bg-gray-50 min-h-screen flex items-center justify-center px-4">
        <Card className="text-center p-12 max-w-md">
          <CheckCircle className="mx-auto text-green-600 mb-4" size={64} />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Pledge Confirmed!</h2>
          <p className="text-gray-600 mb-6">
            Thank you for your commitment. Your pledge has been recorded and you can start making payments.
          </p>
          <button 
            onClick={() => navigate('/donations/dashboard')}
            className="bg-blue-600 text-white px-8 py-2 rounded-lg font-bold hover:bg-blue-700 transition"
          >
            View Dashboard
          </button>
        </Card>
      </div>
    );
  }

  return (
    <div className="pt-20 pb-20 bg-gray-50 min-h-screen">
      <div className="max-w-2xl mx-auto px-4 py-12">
        
        {/* Back Button */}
        <button
          onClick={() => navigate('/donations')}
          className="inline-flex items-center gap-2 text-blue-900 hover:text-blue-700 font-semibold mb-8 transition"
        >
          <ArrowLeft size={20} />
          Back to Campaigns
        </button>

        {/* Form Card */}
        <Card className="p-8">
          <h1 className="text-3xl font-bold text-blue-900 mb-2">Make Your Pledge</h1>
          <p className="text-gray-600 mb-8">
            Commit to supporting this campaign. You can pay in installments or all at once.
          </p>

          {error && (
            <div className="mb-6 bg-red-50 border-l-4 border-red-500 text-red-800 p-4 rounded flex items-center gap-3">
              <AlertCircle size={20} />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Pledge Amount */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Pledge Amount (KES) *
              </label>
              <input
                type="number"
                name="pledgedAmount"
                value={formData.pledgedAmount}
                onChange={handleChange}
                placeholder="Enter amount in KES"
                required
                min="100"
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
              <p className="text-xs text-gray-500 mt-1">Minimum: KES 100</p>
            </div>

            {/* Phone Number */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                M-Pesa Phone Number *
              </label>
              <input
                type="tel"
                name="memberPhone"
                value={formData.memberPhone}
                onChange={handleChange}
                placeholder="+254712345678"
                pattern="254[0-9]{9}"
                required
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
              <p className="text-xs text-gray-500 mt-1">Format: 254XXXXXXXXX</p>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                name="memberEmail"
                value={formData.memberEmail}
                onChange={handleChange}
                placeholder="your@email.com"
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            {/* Installment Plan */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Payment Plan
              </label>
              <select
                name="installmentPlan"
                value={formData.installmentPlan}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value="lump-sum">One-time Payment</option>
                <option value="weekly">Weekly Installments</option>
                <option value="bi-weekly">Bi-weekly Installments</option>
                <option value="monthly">Monthly Installments</option>
              </select>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Additional Notes
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                placeholder="Any special requests or comments?"
                rows="4"
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            {/* Privacy Notice */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-gray-700">
                ✓ Your personal information is encrypted and secure<br />
                ✓ You have the right to withdraw this pledge anytime<br />
                ✓ You'll receive payment confirmations via SMS and email
              </p>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 rounded-lg font-bold hover:shadow-lg transition-all transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating Pledge...' : 'Confirm Pledge'}
            </button>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default PledgePage;
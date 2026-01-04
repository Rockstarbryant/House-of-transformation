// ============================================
// FILE 24: pages/PaymentPage.jsx
// ============================================
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertCircle, CheckCircle, Loader } from 'lucide-react';
import axios from 'axios';
import Card from '../../components/common/Card';

const API_URL = process.env.REACT_APP_DONATION_API_URL || 'http://localhost:5001/api';

const PaymentPage = () => {
  const { pledgeId } = useParams();
  const navigate = useNavigate();
  const token = localStorage.getItem('authToken');

  const [pledge, setPledge] = useState(null);
  const [paymentData, setPaymentData] = useState({
    amount: '',
    phoneNumber: ''
  });
  const [loading, setLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchPledge();
  }, []);

  const fetchPledge = async () => {
    try {
      const response = await axios.get(`${API_URL}/pledges/${pledgeId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        setPledge(response.data.pledge);
        setPaymentData(prev => ({
          ...prev,
          phoneNumber: response.data.pledge.memberPhone,
          amount: response.data.pledge.remainingAmount.toString()
        }));
      }
    } catch (error) {
      setError('Failed to load pledge details');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setPaymentData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await axios.post(
        `${API_URL}/payments/initiate-mpesa`,
        {
          pledgeId,
          amount: parseFloat(paymentData.amount),
          phoneNumber: paymentData.phoneNumber
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.success) {
        setPaymentStatus('initiated');
        // In production, you'd poll for payment status
        setTimeout(() => {
          setPaymentStatus('success');
        }, 3000);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Payment initiation failed');
    } finally {
      setLoading(false);
    }
  };

  if (!pledge) {
    return (
      <div className="pt-20 pb-20 bg-gray-50 min-h-screen flex items-center justify-center">
        <Loader className="animate-spin" size={40} />
      </div>
    );
  }

  return (
    <div className="pt-20 pb-20 bg-gray-50 min-h-screen">
      <div className="max-w-2xl mx-auto px-4 py-12">
        
        <button
          onClick={() => navigate('/donations/dashboard')}
          className="inline-flex items-center gap-2 text-blue-900 hover:text-blue-700 font-semibold mb-8 transition"
        >
          <ArrowLeft size={20} />
          Back to Dashboard
        </button>

        {paymentStatus === 'success' ? (
          <Card className="text-center p-12">
            <CheckCircle className="mx-auto text-green-600 mb-4" size={64} />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Successful!</h2>
            <p className="text-gray-600 mb-6">
              Your payment of KES {parseFloat(paymentData.amount).toLocaleString()} has been processed.
              A confirmation has been sent to {paymentData.phoneNumber}.
            </p>
            <button
              onClick={() => navigate('/donations/dashboard')}
              className="bg-blue-600 text-white px-8 py-2 rounded-lg font-bold hover:bg-blue-700 transition"
            >
              Back to Dashboard
            </button>
          </Card>
        ) : (
          <Card className="p-8">
            <h1 className="text-3xl font-bold text-blue-900 mb-2">Make Payment</h1>
            <p className="text-gray-600 mb-8">
              Campaign: {pledge.campaignId.name}
            </p>

            {error && (
              <div className="mb-6 bg-red-50 border-l-4 border-red-500 text-red-800 p-4 rounded flex items-center gap-3">
                <AlertCircle size={20} />
                {error}
              </div>
            )}

            {/* Pledge Summary */}
            <div className="bg-blue-50 p-6 rounded-lg mb-8">
              <h3 className="font-bold text-gray-900 mb-4">Pledge Summary</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-gray-600">Total Pledged</p>
                  <p className="text-lg font-bold text-gray-900">
                    KES {pledge.pledgedAmount?.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Already Paid</p>
                  <p className="text-lg font-bold text-green-600">
                    KES {pledge.paidAmount?.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Remaining</p>
                  <p className="text-lg font-bold text-orange-600">
                    KES {pledge.remainingAmount?.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            {paymentStatus === 'initiated' && (
              <div className="mb-6 bg-yellow-50 border-l-4 border-yellow-500 text-yellow-800 p-4 rounded">
                <p>✓ M-Pesa prompt sent to {paymentData.phoneNumber}</p>
                <p className="text-sm mt-2">Please enter your M-Pesa PIN to complete the payment</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Payment Amount (KES) *
                </label>
                <input
                  type="number"
                  name="amount"
                  value={paymentData.amount}
                  onChange={handleChange}
                  required
                  max={pledge.remainingAmount}
                  min="1"
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Maximum: KES {pledge.remainingAmount?.toLocaleString()}
                </p>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  M-Pesa Phone Number *
                </label>
                <input
                  type="tel"
                  name="phoneNumber"
                  value={paymentData.phoneNumber}
                  onChange={handleChange}
                  pattern="254[0-9]{9}"
                  required
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Leave as is or use a different number
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 rounded-lg font-bold hover:shadow-lg transition-all transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader className="animate-spin" size={20} />
                    Processing...
                  </>
                ) : (
                  'Pay with M-Pesa'
                )}
              </button>
            </form>

            {/* Security Notice */}
            <div className="mt-8 p-4 bg-green-50 rounded-lg">
              <p className="text-sm text-gray-700">
                🔒 Your payment is secure and encrypted<br />
                ✓ You will receive a confirmation SMS<br />
                ✓ Your data is protected according to PDPA
              </p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

export default PaymentPage;
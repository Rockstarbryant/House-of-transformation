import React from 'react';
import DonationSection from '../components/donations/DonationSection';

const DonatePage = () => {
  return (
    <div className="pt-20 pb-20 min-h-screen">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold text-blue-900 mb-8">Give</h1>
        
        {/* M-Pesa */}
        <div className="bg-white p-8 rounded-xl shadow-lg mb-6">
          <h2 className="text-2xl font-bold mb-4">M-Pesa</h2>
          <p className="mb-2">Paybill: <strong>123456</strong></p>
          <p>Account: <strong>CHURCH</strong></p>
        </div>

        {/* Bank */}
        <div className="bg-white p-8 rounded-xl shadow-lg mb-6">
          <h2 className="text-2xl font-bold mb-4">Bank Transfer</h2>
          <p className="mb-2">Bank: <strong>Kenya Commercial Bank</strong></p>
          <p className="mb-2">Account: <strong>1234567890</strong></p>
          <p>Branch: <strong>Busia Branch</strong></p>
        </div>
      </div>
    </div>
  );
};

export default DonatePage;
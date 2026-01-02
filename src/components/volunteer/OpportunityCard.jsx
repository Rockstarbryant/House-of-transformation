import React, { useState } from 'react';
import { Award } from 'lucide-react';
import Card from '../common/Card';
import Button from '../common/Button';
import Modal from '../common/Modal';
import ApplicationForm from './ApplicationForm';
import { useAuthContext } from '../../context/AuthContext';
import { volunteerService } from '../../services/api/volunteerService';

const OpportunityCard = ({ opportunity, onApplicationSuccess }) => {
  const { user } = useAuthContext();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState({ type: '', text: '' });

  const handleApply = () => {
    // Simply open the modal - the form will handle auth state
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
        
        // Close modal after 2 seconds
        setTimeout(() => {
          setIsModalOpen(false);
          setSubmitMessage({ type: '', text: '' });
          if (onApplicationSuccess) {
            onApplicationSuccess();
          }
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
    <>
      <Card hover>
        <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
          <div className="text-5xl">{opportunity.icon}</div>
          <div className="flex-1">
            <h3 className="text-2xl font-bold text-blue-900 mb-2">
              {opportunity.title}
            </h3>
            <p className="text-gray-700 mb-3">{opportunity.description}</p>
            <div className="flex flex-wrap gap-4 text-sm">
              <span className="flex items-center gap-1 text-gray-600">
                <Award size={16} /> {opportunity.requirements}
              </span>
              <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full font-semibold">
                {opportunity.spots} spots available
              </span>
            </div>
          </div>
          <Button variant="primary" onClick={handleApply}>
            Apply Now
          </Button>
        </div>
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={`Apply for ${opportunity.title}`}
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
            ministry={opportunity.title}
            onSubmit={handleSubmit}
            onClose={handleCloseModal}
            isSubmitting={isSubmitting}
          />
        )}
      </Modal>
    </>
  );
};

export default OpportunityCard;
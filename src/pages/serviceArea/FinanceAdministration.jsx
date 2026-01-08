// src/pages/serviceArea/FinanceAdministration.jsx
import React from 'react';
import ServiceAreaDetailPage from './ServiceAreaDetailPage';

const FinanceAdministration = () => {
  const financeData = {
    name: 'Finance & Administration',
    description: 'Manage resources and organizational operations to ensure smooth church functioning. We steward God\'s resources wisely to maximize impact.',
    imageUrl: 'https://res.cloudinary.com/dcu8uuzrs/image/upload/v1767445662/copy_of_ot_ibz2xp_6e0397.jpg',
    teamCount: 8,
    timeCommitment: '4-5 hours/week',
    teamLead: 'Mr. Peter Mwangi',
    email: 'peter.mwangi@gmail.com',
    phone: '+254 790 123 456',
    responsibilities: [
      'Manage church finances and budgets',
      'Process donations and maintain records',
      'Prepare financial reports and statements',
      'Administer staff payroll and benefits',
      'Manage church databases and records',
      'Coordinate administrative operations'
    ],
    requirements: [
      'Excellent organizational and math skills',
      'Proficiency with accounting software',
      'Strong integrity and trustworthiness',
      'Attention to detail',
      'Basic knowledge of accounting principles',
      'Commitment to 4-5 hours weekly'
    ],
    schedule: [
      'Regular office hours: Monday - Friday 9:00 AM - 1:00 PM',
      'Monthly accounting: 1st and 15th of month',
      'Quarterly reporting: End of each quarter',
      'Administrative meetings: 2nd Wednesday 3:00 PM'
    ],
    testimonials: [
      {
        name: 'Catherine Kipchoge',
        role: 'Treasurer',
        quote: 'Stewarding church finances is a sacred responsibility. Knowing our resources serve God\'s kingdom gives purpose to this work.'
      },
      {
        name: 'James Kariuki',
        role: 'Database Administrator',
        quote: 'Maintaining accurate records enables the church to function efficiently and serve members better.'
      },
      {
        name: 'Rose Ochieng',
        role: 'Office Manager',
        quote: 'Behind-the-scenes administration work enables ministry to flourish. It\'s humble service with great impact.'
      },
      {
        name: 'Michael Kiplagat',
        role: 'Financial Analyst',
        quote: 'Using my professional skills for God\'s kingdom shows that all work can be ministry when done with the right heart.'
      }
    ],
    galleryImages: [
      'https://res.cloudinary.com/dcu8uuzrs/image/upload/v1767445662/copy_of_ot_ibz2xp_6e0397.jpg',
      'https://pbs.twimg.com/profile_images/700352011582251008/wrxEHL3q.jpg',
      'https://res.cloudinary.com/dcu8uuzrs/image/upload/v1767444965/WhatsApp_Image_2026-01-03_at_15.54.45_mpogon.jpg',
      'https://res.cloudinary.com/dcu8uuzrs/image/upload/v1767445662/copy_of_ot_ibz2xp_6e0397.jpg',
      'https://pbs.twimg.com/profile_images/700352011582251008/wrxEHL3q.jpg',
      'https://res.cloudinary.com/dcu8uuzrs/image/upload/v1767444965/WhatsApp_Image_2026-01-03_at_15.54.45_mpogon.jpg'
    ]
  };

  return <ServiceAreaDetailPage {...financeData} />;
};

export default FinanceAdministration;
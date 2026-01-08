// src/pages/serviceArea/CounselingCare.jsx
import React from 'react';
import ServiceAreaDetailPage from './ServiceAreaDetailPage';

const CounselingCare = () => {
  const counselingData = {
    name: 'Counseling & Care',
    description: 'Provide spiritual guidance, pastoral care, and support to members in times of need. We extend Christ\'s compassion to those facing life\'s greatest challenges.',
    imageUrl: 'https://pbs.twimg.com/profile_images/700352011582251008/wrxEHL3q.jpg',
    teamCount: 10,
    timeCommitment: 'As needed',
    teamLead: 'Pastor Grace Ochieng',
    email: 'grace.ochieng@gmail.com',
    phone: '+254 789 012 345',
    responsibilities: [
      'Provide pastoral counseling and spiritual guidance',
      'Visit the sick and hospitalized members',
      'Support families during grief and loss',
      'Offer prayer and intercession for struggling members',
      'Connect members with appropriate resources',
      'Document care encounters and follow-ups'
    ],
    requirements: [
      'Strong compassion and listening skills',
      'Understanding of basic counseling principles',
      'Confidentiality and integrity',
      'Flexibility to respond to urgent needs',
      'Sound biblical foundation',
      'Ability to work with church leadership'
    ],
    schedule: [
      'Hospital visits: As needed (flexible)',
      'Home visitation: Weekly or as requested',
      'Crisis response: 24/7 emergency availability',
      'Monthly team meetings: 2nd Thursday 4:00 PM'
    ],
    testimonials: [
      {
        name: 'Margaret Kipchoge',
        role: 'Pastoral Care Counselor',
        quote: 'Being present with people in their darkest moments and pointing them to Jesus is sacred privilege I don\'t take lightly.'
      },
      {
        name: 'Pastor John Kariuki',
        role: 'Grief Support Coordinator',
        quote: 'Helping families navigate loss while demonstrating Christ\'s comfort has shown me the power of compassionate ministry.'
      },
      {
        name: 'Elizabeth Mwangi',
        role: 'Hospital Visitor',
        quote: 'A simple visit and prayer can transform someone\'s hospital experience. This ministry is where love becomes tangible.'
      },
      {
        name: 'David Kiplagat',
        role: 'Crisis Response Team',
        quote: 'Being available when families face emergencies shows them that the church truly cares. It\'s a platform for powerful ministry.'
      }
    ],
    galleryImages: [
      'https://pbs.twimg.com/profile_images/700352011582251008/wrxEHL3q.jpg',
      'https://res.cloudinary.com/dcu8uuzrs/image/upload/v1767444965/WhatsApp_Image_2026-01-03_at_15.54.45_mpogon.jpg',
      'https://res.cloudinary.com/dcu8uuzrs/image/upload/v1767445662/copy_of_ot_ibz2xp_6e0397.jpg',
      'https://pbs.twimg.com/profile_images/700352011582251008/wrxEHL3q.jpg',
      'https://res.cloudinary.com/dcu8uuzrs/image/upload/v1767444965/WhatsApp_Image_2026-01-03_at_15.54.45_mpogon.jpg',
      'https://res.cloudinary.com/dcu8uuzrs/image/upload/v1767445662/copy_of_ot_ibz2xp_6e0397.jpg'
    ]
  };

  return <ServiceAreaDetailPage {...counselingData} />;
};

export default CounselingCare;
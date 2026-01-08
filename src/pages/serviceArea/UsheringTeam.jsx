// src/pages/serviceArea/HospitalityTeam.jsx
import React from 'react';
import ServiceAreaDetailPage from './ServiceAreaDetailPage';

const UsheringTeam = () => {
  const usheringData = {
    name: 'Ushering Team',
    description: 'Welcome guests with warmth and create a welcoming atmosphere during services and events. We believe every visitor should feel the love of Christ through our hospitality.',
    imageUrl: 'https://res.cloudinary.com/dcu8uuzrs/image/upload/v1767445662/copy_of_ot_ibz2xp_6e0397.jpg',
    teamCount: 22,
    timeCommitment: '2-3 hours/week',
    teamLead: 'Samuel Otunga',
    email: 'samuel.otunga@gmail.com',
    phone: '+254 734 567 890',
    responsibilities: [
      'Welcome and greet visitors at the entrance',
      'Distribute programs and assist with seating',
      'Offer refreshments before and after services',
      'Assist during special events and conferences',
      'Ensure facilities are clean and welcoming',
      'Build relationships with first-time visitors'
    ],
    requirements: [
      'Warm, welcoming personality',
      'Able to stand for 2-3 hours',
      'Good communication skills',
      'Commitment to attending regular training',
      'Flexible scheduling for events',
      'Heart for making people feel valued'
    ],
    schedule: [
      'Sunday services: 8:30 AM - 11:30 AM',
      'Wednesday evening: 5:30 PM - 7:30 PM',
      'Special events: As scheduled'
    ],
    testimonials: [
      {
        name: 'Martha Ochieng',
        role: 'Welcome Coordinator',
        quote: 'Making people feel at home is our mission. I love seeing visitors leave our church feeling the warmth of God\'s family.'
      },
      {
        name: 'Thomas Kipchoge',
        role: 'Refreshments Manager',
        quote: 'It\'s amazing how a simple cup of tea and a smile can open doors for spiritual conversations. Hospitality is ministry!'
      },
      {
        name: 'Esther Kemboi',
        role: 'Event Assistant',
        quote: 'Serving with the hospitality team has taught me the true meaning of servant leadership. Every guest matters to God.'
      },
      {
        name: 'Paul Kariuki',
        role: 'Facilities Coordinator',
        quote: 'A clean, organized, and welcoming space sets the tone for worship. I take pride in preparing our sanctuary.'
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

  return <ServiceAreaDetailPage {...usheringData} />;
};

export default UsheringTeam;
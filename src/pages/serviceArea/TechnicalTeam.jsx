// src/pages/serviceArea/TechnicalSupport.jsx
import React from 'react';
import ServiceAreaDetailPage from './ServiceAreaDetailPage';

const TechnicalTeam = () => {
  const technicalData = {
    name: 'Technical Team',
    description: 'Manage sound systems, lighting, streaming, and audio-visual equipment during services. We ensure excellent technical execution so nothing distracts from worship.',
    imageUrl: 'https://res.cloudinary.com/dcu8uuzrs/image/upload/v1767444965/WhatsApp_Image_2026-01-03_at_15.54.45_mpogon.jpg',
    teamCount: 12,
    timeCommitment: '4 hours/week',
    teamLead: 'Engineer Charles Mwebi',
    email: 'charles.mwebi@gmail.com',
    phone: '+254 745 678 901',
    responsibilities: [
      'Operate sound and lighting equipment',
      'Manage live streaming and recording',
      'Test and maintain all technical equipment',
      'Troubleshoot technical issues during services',
      'Set up for special events and conferences',
      'Train new team members on equipment'
    ],
    requirements: [
      'Basic technical knowledge or willingness to learn',
      'Attention to detail and problem-solving skills',
      'Reliable and punctual',
      'Ability to remain calm under pressure',
      'Available 4 hours weekly',
      'Able to work before and during services'
    ],
    schedule: [
      'Sunday: Setup 7:30 AM, Service 9:00 AM',
      'Wednesday: Setup 5:30 PM, Service 6:00 PM',
      'Monthly training: 3rd Saturday 10:00 AM'
    ],
    testimonials: [
      {
        name: 'Isaac Koech',
        role: 'Sound Engineer',
        quote: 'Working behind the scenes to create the perfect technical environment for worship is incredibly fulfilling.'
      },
      {
        name: 'Angela Mwangi',
        role: 'Lighting Technician',
        quote: 'The technical team is crucial to the worship experience. I\'m proud to contribute to creating the right atmosphere.'
      },
      {
        name: 'Daniel Kariuki',
        role: 'Streaming Coordinator',
        quote: 'Knowing we reach people online who can\'t physically attend makes this ministry so meaningful.'
      },
      {
        name: 'Rose Kipchoge',
        role: 'Equipment Manager',
        quote: 'Maintaining our technical equipment is like maintaining a tool for ministry. Every detail matters.'
      }
    ],
    galleryImages: [
      'https://res.cloudinary.com/dcu8uuzrs/image/upload/v1767444965/WhatsApp_Image_2026-01-03_at_15.54.45_mpogon.jpg',
      'https://res.cloudinary.com/dcu8uuzrs/image/upload/v1767445662/copy_of_ot_ibz2xp_6e0397.jpg',
      'https://pbs.twimg.com/profile_images/700352011582251008/wrxEHL3q.jpg',
      'https://res.cloudinary.com/dcu8uuzrs/image/upload/v1767444965/WhatsApp_Image_2026-01-03_at_15.54.45_mpogon.jpg',
      'https://res.cloudinary.com/dcu8uuzrs/image/upload/v1767445662/copy_of_ot_ibz2xp_6e0397.jpg',
      'https://pbs.twimg.com/profile_images/700352011582251008/wrxEHL3q.jpg'
    ]
  };

  return <ServiceAreaDetailPage {...technicalData} />;
};

export default TechnicalTeam;
// src/pages/serviceArea/PrayerMinistry.jsx
import React from 'react';
import ServiceAreaDetailPage from './ServiceAreaDetailPage';

const PrayerMinistry = () => {
  const prayerData = {
    name: 'Prayer Ministry',
    description: 'Intercede for our congregation, community, and world through dedicated prayer and spiritual warfare. Prayer is the foundation of everything we do at House of Transformation.',
    imageUrl: 'https://res.cloudinary.com/dcu8uuzrs/image/upload/v1767445662/copy_of_ot_ibz2xp_6e0397.jpg',
    teamCount: 24,
    timeCommitment: 'Flexible',
    teamLead: 'Prophetess Mary Wanjiru',
    email: 'mary.wanjiru@gmail.com',
    phone: '+254 767 890 123',
    responsibilities: [
      'Participate in prayer meetings and vigils',
      'Intercede for church leadership and members',
      'Pray for community and national issues',
      'Support missionaries and outreach efforts',
      'Lead prayer groups and circles',
      'Maintain prayer request lists and follow-ups'
    ],
    requirements: [
      'Deep commitment to prayer and fasting',
      'Understanding of spiritual warfare',
      'Regular Bible study and meditation',
      'Confidentiality and discernment',
      'Flexible schedule for prayer events',
      'Passion for seeing God\'s kingdom come'
    ],
    schedule: [
      'Wednesday prayer meeting: 5:30 PM - 6:30 PM',
      'Saturday prayer vigil: 11:00 PM - 1:00 AM',
      'Monthly prayer breakfast: 1st Sunday 7:00 AM',
      'Daily personal intercession recommended'
    ],
    testimonials: [
      {
        name: 'Ruth Kipchoge',
        role: 'Prayer Intercessor',
        quote: 'Prayer is the most powerful weapon we have. Seeing answered prayers strengthens my faith constantly.'
      },
      {
        name: 'Jonathan Otunga',
        role: 'Prayer Group Leader',
        quote: 'Leading others in prayer is a sacred privilege. The breakthrough we\'ve seen through prayer is miraculous.'
      },
      {
        name: 'Grace Kiplagat',
        role: 'Prayer Coordinator',
        quote: 'God hears and answers prayer. Witnessing His faithfulness through this ministry is humbling.'
      },
      {
        name: 'Samuel Kariuki',
        role: 'Night Prayer Leader',
        quote: 'The atmosphere during night prayer vigils is thick with God\'s presence. It transforms our spiritual lives.'
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

  return <ServiceAreaDetailPage {...prayerData} />;
};

export default PrayerMinistry;
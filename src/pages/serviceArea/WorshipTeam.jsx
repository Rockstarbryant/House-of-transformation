// src/pages/serviceArea/WorshipTeam.jsx
import React from 'react';
import ServiceAreaDetailPage from './ServiceAreaDetailPage';

const WorshipTeam = () => {
  const worshipTeamData = {
    name: 'Worship Team',
    description: 'Lead our congregation in passionate worship through music, dance, and instrumental performances. We believe worship is not just singing but a lifestyle of devotion to God.',
    imageUrl: 'https://res.cloudinary.com/dcu8uuzrs/image/upload/v1767444965/WhatsApp_Image_2026-01-03_at_15.54.45_mpogon.jpg',
    teamCount: 28,
    timeCommitment: '4 hours/week',
    teamLead: 'Grace Mwangi',
    email: 'grace.mwangi@hotmail.com',
    phone: '+254 712 345 678',
    responsibilities: [
      'Lead Sunday and Wednesday services in worship',
      'Prepare and arrange worship songs',
      'Mentor newer team members',
      'Attend weekly rehearsals and planning meetings',
      'Lead special worship events and conferences',
      'Minister through music, dance, and instruments'
    ],
    requirements: [
      'Must be a committed believer with passion for worship',
      'Musical ability or willingness to learn',
      'Available for weekly rehearsals',
      'Able to commit to at least 4 hours weekly',
      'Willing to grow spiritually and technically',
      'Team player with good communication skills'
    ],
    schedule: [
      'Weekly rehearsals: Tuesday & Thursday 7:00 PM - 8:30 PM',
      'Sunday services: 9:00 AM setup',
      'Wednesday evening service: 6:00 PM'
    ],
    testimonials: [
      {
        name: 'David Kipchoge',
        role: 'Lead Guitarist',
        quote: 'Serving in the worship team has deepened my relationship with God. Ministering together as a team is such an incredible experience.'
      },
      {
        name: 'Amara Okeyo',
        role: 'Lead Singer',
        quote: 'This team has become my spiritual family. Every time we worship, I feel God\'s presence so strongly. It\'s a privilege to lead others into His presence.'
      },
      {
        name: 'Joseph Kariuki',
        role: 'Drummer',
        quote: 'The discipline and joy of worship ministry have transformed my Christian walk. I recommend this to anyone with a passion for music.'
      },
      {
        name: 'Naomi Muema',
        role: 'Dancer',
        quote: 'Expressing worship through dance is liberating. Our team is so welcoming and focused on glorifying God through creative expression.'
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

  return <ServiceAreaDetailPage {...worshipTeamData} />;
};

export default WorshipTeam;
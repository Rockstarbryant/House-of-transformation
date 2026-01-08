// src/pages/serviceArea/OutreachMissions.jsx
import React from 'react';
import ServiceAreaDetailPage from './ServiceAreaDetailPage';

const OutreachMissions = () => {
  const outreachData = {
    name: 'Outreach & Missions',
    description: 'Extend God\'s love through community service, evangelism, and local/global mission work. We are committed to transforming our community and world for Christ.',
    imageUrl: 'https://pbs.twimg.com/profile_images/700352011582251008/wrxEHL3q.jpg',
    teamCount: 18,
    timeCommitment: 'Flexible',
    teamLead: 'Pastor David Kipchoge',
    email: 'david.kipchoge@gmail.com',
    phone: '+254 756 789 012',
    responsibilities: [
      'Plan and execute community outreach programs',
      'Visit and minister to the needy and sick',
      'Evangelize and share the Gospel',
      'Support missions and church planting',
      'Organize community service projects',
      'Build relationships with local community leaders'
    ],
    requirements: [
      'Burden for lost souls and community transformation',
      'Willingness to give time and resources',
      'Good communication and people skills',
      'Flexible schedule for various events',
      'Physically able to serve in the community',
      'Commitment to ongoing prayer and intercession'
    ],
    schedule: [
      'Monthly community outreach: 2nd Saturday 9:00 AM',
      'Wednesday evening visits: 6:30 PM',
      'Mission trips: Quarterly as scheduled',
      'Prayer meetings: Monthly'
    ],
    testimonials: [
      {
        name: 'Bishop Joseph Kariuki',
        role: 'Outreach Director',
        quote: 'Seeing lives transformed and communities uplifted through Christ is why we do this work.'
      },
      {
        name: 'Helen Ochieng',
        role: 'Community Care Coordinator',
        quote: 'Ministry to the poor and marginalized reflects the heart of Jesus. This team embodies true servant leadership.'
      },
      {
        name: 'Moses Kiplagat',
        role: 'Evangelism Lead',
        quote: 'Sharing the Good News and seeing people accept Christ is the greatest privilege of my life.'
      },
      {
        name: 'Mercy Mwangi',
        role: 'Missions Coordinator',
        quote: 'Supporting missions globally while serving locally shows us God\'s heart for the entire world.'
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

  return <ServiceAreaDetailPage {...outreachData} />;
};

export default OutreachMissions;
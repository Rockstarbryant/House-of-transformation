// src/pages/serviceArea/YouthMinistry.jsx
import React from 'react';
import ServiceAreaDetailPage from './ServiceAreaDetailPage';

const YouthMinistry = () => {
  const youthData = {
    name: 'Youth Ministry',
    description: 'Guide and mentor young people in their faith journey with relevant, engaging programs. We equip youth to live boldly for Christ in a modern world.',
    imageUrl: 'https://res.cloudinary.com/dcu8uuzrs/image/upload/v1767444965/WhatsApp_Image_2026-01-03_at_15.54.45_mpogon.jpg',
    teamCount: 16,
    timeCommitment: '3-4 hours/week',
    teamLead: 'Pastor Aaron Kipchoge',
    email: 'aaron.kipchoge@gmail.com',
    phone: '+254 778 901 234',
    responsibilities: [
      'Plan and lead youth meetings and activities',
      'Mentor young people in spiritual growth',
      'Organize youth camps and retreats',
      'Lead Bible studies and discipleship programs',
      'Build supportive community among youth',
      'Equip youth for leadership roles'
    ],
    requirements: [
      'Genuine passion for young people',
      'Able to connect with youth culture',
      'Sound biblical foundation',
      'Willing to commit 3-4 hours weekly',
      'Patient, encouraging mentoring style',
      'Available for overnight events and trips'
    ],
    schedule: [
      'Friday youth nights: 7:00 PM - 9:00 PM',
      'Sunday youth service: 11:30 AM - 12:30 PM',
      'Monthly leadership meetings: 1st Tuesday 6:00 PM',
      'Quarterly camps and retreats'
    ],
    testimonials: [
      {
        name: 'Faith Mwangi',
        role: 'Youth Leader',
        quote: 'Mentoring youth through their teens has been the most rewarding experience. Watching them grow in faith is incredible.'
      },
      {
        name: 'Steven Kiplagat',
        role: 'Youth Coordinator',
        quote: 'The youth ministry team creates a safe space where young people can be themselves and encounter Jesus authentically.'
      },
      {
        name: 'Naomi Ochieng',
        role: 'Bible Study Leader',
        quote: 'Young people are hungry for truth. Leading them through God\'s Word has deepened my own faith dramatically.'
      },
      {
        name: 'Benjamin Kariuki',
        role: 'Activities Coordinator',
        quote: 'Fun activities with purpose create opportunities for spiritual conversations. This ministry is life-changing.'
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

  return <ServiceAreaDetailPage {...youthData} />;
};

export default YouthMinistry;
// src/pages/serviceArea/ChildrensMinistry.jsx
import React from 'react';
import ServiceAreaDetailPage from './ServiceAreaDetailPage';

const ChildrensMinistry = () => {
  const childrenMinistryData = {
    name: 'Children\'s Ministry',
    description: 'Nurture and teach the next generation of believers with fun, engaging, and spiritually enriching activities. We create a safe, loving environment where children can encounter Jesus.',
    imageUrl: 'https://pbs.twimg.com/profile_images/700352011582251008/wrxEHL3q.jpg',
    teamCount: 15,
    timeCommitment: '3 hours/week',
    teamLead: 'Sister Priscilla Kiplagat',
    email: 'priscilla.kiplagat@gmail.com',
    phone: '+254 723 456 789',
    responsibilities: [
      'Lead children in worship and prayer',
      'Teach Bible stories and lessons',
      'Organize and facilitate children\'s activities and games',
      'Ensure safe and welcoming environment',
      'Prepare lesson materials and resources',
      'Mentor children in their faith journey'
    ],
    requirements: [
      'Love for children and patience',
      'Basic understanding of Bible stories',
      'Able to commit 3 hours weekly',
      'First Aid/CPR certification preferred',
      'Background check clearance',
      'Creative and enthusiastic about engaging kids'
    ],
    schedule: [
      'Sunday services: 9:00 AM - 11:00 AM',
      'Wednesday evening: 6:00 PM - 7:00 PM',
      'Monthly planning meetings: 2nd Saturday 2:00 PM'
    ],
    testimonials: [
      {
        name: 'Mary Wanjiru',
        role: 'Craft & Activity Coordinator',
        quote: 'Seeing the children\'s faces light up as they learn about Jesus makes every moment worthwhile. It\'s truly a blessing!'
      },
      {
        name: 'Peter Muthui',
        role: 'Children\'s Pastor Assistant',
        quote: 'Investing in children\'s lives is investing in our future. The joy and innocence of these kids remind us why we serve.'
      },
      {
        name: 'Faith Ochieng',
        role: 'Teacher',
        quote: 'This ministry has given me purpose. Planting God\'s Word in young hearts is the most fulfilling work I\'ve ever done.'
      },
      {
        name: 'Ruth Kamau',
        role: 'Music & Worship Leader',
        quote: 'Working with these children to introduce them to worship is magical. Their pure hearts are so receptive to God\'s love.'
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

  return <ServiceAreaDetailPage {...childrenMinistryData} />;
};

export default ChildrensMinistry;
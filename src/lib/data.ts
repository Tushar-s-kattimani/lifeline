import type { Donor } from './types';

// Mock data for donors
export const donors: Donor[] = [
  {
    userId: 'donor-1',
    name: 'Aarav Patel',
    bloodGroup: 'O+',
    location: { latitude: 12.9716, longitude: 77.5946 }, // Bangalore
    lastDonation: '2024-03-15',
    availability: true,
    phone: '9876543210'
  },
  {
    userId: 'donor-2',
    name: 'Priya Singh',
    bloodGroup: 'A+',
    location: { latitude: 12.975, longitude: 77.600 }, // Near Bangalore
    lastDonation: '2024-05-20',
    availability: true,
    phone: '9876543211'
  },
  {
    userId: 'donor-3',
    name: 'Rohan Sharma',
    bloodGroup: 'B-',
    location: { latitude: 12.96, longitude: 77.58 }, // Near Bangalore
    lastDonation: '2023-12-01',
    availability: false,
    phone: '9876543212'
  },
  {
    userId: 'donor-4',
    name: 'Sneha Gupta',
    bloodGroup: 'AB+',
    location: { latitude: 12.98, longitude: 77.59 }, // Near Bangalore
    lastDonation: '2024-06-10',
    availability: true,
    phone: '9876543213'
  },
  {
    userId: 'donor-5',
    name: 'Vikram Kumar',
    bloodGroup: 'O-',
    location: { latitude: 12.97, longitude: 77.61 }, // Near Bangalore
    lastDonation: '2024-01-05',
    availability: true,
    phone: '9876543214'
  },
  {
    userId: 'donor-6',
    name: 'Anjali Mehta',
    bloodGroup: 'A+',
    location: { latitude: 12.978, longitude: 77.595 },
    lastDonation: '2024-04-22',
    availability: true,
    phone: '9876543215'
  },
  {
    userId: 'donor-7',
    name: 'Karan Verma',
    bloodGroup: 'B+',
    location: { latitude: 12.965, longitude: 77.605 },
    lastDonation: '2024-07-01',
    availability: true,
    phone: '9876543216'
  },
  {
    userId: 'donor-8',
    name: 'Sunita Reddy',
    bloodGroup: 'O+',
    location: { latitude: 12.972, longitude: 77.588 },
    lastDonation: '2024-02-18',
    availability: true,
    phone: '9876543217'
  }
];

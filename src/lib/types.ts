
export type UserRole = 'user' | 'bank_admin';

export type UserProfile = {
  id: string;
  name: string;
  email?: string;
  role: UserRole;
  bloodGroup?: string;
  phoneNumber?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  isAvailableForDonation?: boolean;
  lastDonationDate?: string;
  createdAt: string;
  updatedAt: string;
};

export type BloodBank = {
  id: string;
  adminUserId: string;
  name: string;
  latitude: number;
  longitude: number;
  address: string;
  contactPhoneNumber: string;
  createdAt: string;
  updatedAt: string;
};

export type BloodStock = {
  id: string;
  bloodBankId: string;
  adminUserId: string;
  bloodGroup: string;
  quantityUnits: number;
  updatedAt: string;
};

export type BloodRequest = {
  id: string;
  requesterId: string;
  requestedBloodGroup: string;
  hospitalName: string;
  status: 'Pending' | 'Fulfilled' | 'Canceled';
  createdAt: string;
};

export type Donor = {
  userId: string;
  name: string;
  bloodGroup: string;
  location: {
    latitude: number;
    longitude: number;
  };
  address?: string;
  lastDonation: string;
  availability: boolean;
  phone: string;
};

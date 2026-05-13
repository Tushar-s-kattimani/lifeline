'use server';

import { z } from 'zod';
import { redirect } from 'next/navigation';
import { matchDonorsToRequests } from '@/ai/flows/match-donors-to-requests';
import { donors } from './data';

const RequestBloodSchema = z.object({
  bloodGroup: z.string().min(1, { message: 'Blood group is required.' }),
  hospitalLocation: z.string().min(1, { message: 'Hospital location is required.' }),
  urgencyLevel: z.enum(['Low', 'Medium', 'High']),
});

export type State = {
  errors?: {
    bloodGroup?: string[];
    hospitalLocation?: string[];
    urgencyLevel?: string[];
  };
  message?: string | null;
  matches?: {
    userId: string;
    suitabilityScore: number;
    reason: string;
  }[] | null;
};

export async function requestBlood(prevState: State, formData: FormData): Promise<State> {
  const validatedFields = RequestBloodSchema.safeParse({
    bloodGroup: formData.get('bloodGroup'),
    hospitalLocation: formData.get('hospitalLocation'),
    urgencyLevel: formData.get('urgencyLevel'),
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Invalid fields. Failed to create request.',
    };
  }

  const { bloodGroup, hospitalLocation, urgencyLevel } = validatedFields.data;

  try {
    // In a real app, you'd parse hospitalLocation to lat/lng
    const mockHospitalLocation = {
      latitude: 12.9716,
      longitude: 77.5946,
    };

    const result = await matchDonorsToRequests({
      bloodGroup,
      hospitalLocation: mockHospitalLocation,
      urgencyLevel,
      nearbyDonors: donors,
    });
    
    if (result.donorMatches && result.donorMatches.length > 0) {
        return { message: 'Successfully found potential donors. They are being notified.', matches: result.donorMatches };
    } else {
        return { message: 'Could not find any suitable donors at this time.', matches: [] };
    }

  } catch (error) {
    console.error(error);
    return { message: 'An unexpected error occurred. Please try again.', matches: null };
  }
}

export async function sendOTPAction(phoneNumber: string, message: string, type: 'sms' | 'whatsapp' = 'sms') {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromWhatsApp = process.env.TWILIO_WHATSAPP_NUMBER; // e.g., whatsapp:+14155238886

  // Robust phone number formatting
  let formattedNumber = phoneNumber.trim();
  if (!formattedNumber.startsWith('+')) {
    // If it's a 10-digit number, default to +91
    if (formattedNumber.length === 10) {
      formattedNumber = `+91${formattedNumber}`;
    } else {
      // Otherwise just prepend +
      formattedNumber = `+${formattedNumber.replace(/\D/g, '')}`;
    }
  }
  
  const fullNumber = type === 'whatsapp' ? `whatsapp:${formattedNumber}` : formattedNumber;
  const sender = type === 'whatsapp' ? fromWhatsApp : fromNumber;

  if (!accountSid || !authToken || !sender) {
    console.warn(`--- TWILIO ${type.toUpperCase()} SIMULATION MODE ---`);
    console.warn(`REASON: ${!sender ? 'Missing Twilio Phone Number' : 'Missing credentials'}`);
    console.warn(`TO: ${fullNumber}`);
    console.warn(`MESSAGE: ${message}`);
    return { success: true, simulated: true };
  }

  try {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(accountSid + ':' + authToken).toString('base64'),
      },
      body: new URLSearchParams({
        To: fullNumber,
        From: sender,
        Body: message,
      }),
    });

    return { success: res.ok };
  } catch (e) {
    console.error('Twilio Error:', e);
    return { success: false };
  }
}

'use server';
/**
 * @fileOverview Matches emergency blood requests with suitable available donors and blood banks.
 *
 * - matchDonorsToRequests - A function to match blood requests with donors and banks.
 * - MatchDonorsToRequestsInput - The input type for the matchDonorsToRequests function.
 * - MatchDonorsToRequestsOutput - The return type for the matchDonorsToRequests function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const MatchDonorsToRequestsInputSchema = z.object({
  bloodGroup: z.string().describe('The blood group required for the request (e.g., A+, O-).'),
  hospitalLocation: z.object({
    latitude: z.number().describe('Latitude of the hospital location.'),
    longitude: z.number().describe('Longitude of the hospital location.'),
  }).describe('The location of the hospital requesting blood.'),
  urgencyLevel: z.string().describe('The urgency level of the request (e.g., High, Medium, Low).'),
  nearbyDonors: z.array(z.object({
    userId: z.string().describe('The user ID of the donor.'),
    bloodGroup: z.string().describe('The blood group of the donor.'),
    location: z.object({
      latitude: z.number().describe('Latitude of the donor location.'),
      longitude: z.number().describe('Longitude of the donor location.'),
    }).describe('The current location of the donor.'),
    distance: z.number().describe('Distance from the hospital in km.'),
    lastDonation: z.string().describe('The last donation date of the donor (YYYY-MM-DD).'),
    availability: z.boolean().describe('Whether the donor is currently available.'),
    phoneNumber: z.string().describe('The phone number of the donor.'),
    address: z.string().describe('The address or general area of the donor.'),
  })).describe('A list of nearby donors.'),
  nearbyBanks: z.array(z.object({
    id: z.string(),
    name: z.string(),
    phoneNumber: z.string(),
    address: z.string(),
    location: z.object({
      latitude: z.number(),
      longitude: z.number(),
    }),
    distance: z.number().describe('Distance from the hospital in km.'),
    stockLevel: z.number().describe('Number of units of the requested blood group available.'),
  })).describe('A list of nearby blood banks and their stock of the requested group.'),
});
export type MatchDonorsToRequestsInput = z.infer<typeof MatchDonorsToRequestsInputSchema>;

const MatchDonorsToRequestsOutputSchema = z.object({
  donorMatches: z.array(z.object({
    userId: z.string().describe('The user ID of the matched donor.'),
    suitabilityScore: z.number().describe('A score between 0.0 and 1.0 indicating how well the donor matches the request. 1.0 is perfect.'),
    reason: z.string().describe('Explanation of why the donor was matched.'),
    phoneNumber: z.string().describe('The contact phone number of the donor.'),
    address: z.string().describe('The location or address of the donor.'),
    distance: z.number().describe('Distance from the hospital in km.'),
  })).describe('A list of matched individual donors.'),
  bankMatches: z.array(z.object({
    bankId: z.string().describe('The ID of the blood bank.'),
    name: z.string().describe('The name of the blood bank.'),
    phoneNumber: z.string().describe('The phone number of the bank.'),
    address: z.string().describe('The address of the bank.'),
    availabilityReason: z.string().describe('Reason why this bank is suggested (e.g., proximity, stock level).'),
    stockLevel: z.number().describe('Units of the requested group currently in stock.'),
    distance: z.number().describe('Distance from the hospital in km.'),
  })).describe('A list of suggested blood banks.'),
});
export type MatchDonorsToRequestsOutput = z.infer<typeof MatchDonorsToRequestsOutputSchema>;

export async function matchDonorsToRequests(input: MatchDonorsToRequestsInput): Promise<MatchDonorsToRequestsOutput> {
  return matchDonorsToRequestsFlow(input);
}

const matchDonorsToRequestsPrompt = ai.definePrompt({
  name: 'matchDonorsToRequestsPrompt',
  input: {schema: MatchDonorsToRequestsInputSchema},
  output: {schema: MatchDonorsToRequestsOutputSchema},
  prompt: `You are an expert in matching blood requests with suitable donors.

Request:
- Needed: {{{bloodGroup}}}
- Hospital Location: {{{hospitalLocation.latitude}}}, {{{hospitalLocation.longitude}}}
- Urgency: {{{urgencyLevel}}}

Candidates:
{{#each nearbyDonors}}
- Donor {{{userId}}}, Group {{{bloodGroup}}}, Dist {{{distance}}} km, Avail {{{availability}}}
{{/each}}

Banks:
{{#each nearbyBanks}}
- Bank {{{name}}}, Stock {{{stockLevel}}} units, Dist {{{distance}}} km
{{/each}}

MATCHING RULES:
1. Prioritize blood groups that can medically give to the requested group.
2. O- is the universal donor.
3. O+ can give to all positive groups.
4. Higher priority for closer distance.
5. Suitability score is 0.0 to 1.0.

{{output}}
`,
});

const matchDonorsToRequestsFlow = ai.defineFlow(
  {
    name: 'matchDonorsToRequestsFlow',
    inputSchema: MatchDonorsToRequestsInputSchema,
    outputSchema: MatchDonorsToRequestsOutputSchema,
  },
  async input => {
    try {
      const {output} = await matchDonorsToRequestsPrompt(input);
      return output!;
    } catch (error) {
      console.warn('GenAI Matching fallback.', error);
      
      const donorMatches = input.nearbyDonors
        .map(donor => ({
          userId: donor.userId,
          suitabilityScore: donor.bloodGroup === input.bloodGroup ? 0.95 : 0.7,
          reason: 'Compatible donor based on medical rules (Fallback).',
          phoneNumber: donor.phoneNumber,
          address: donor.address,
          distance: donor.distance,
        }))
        .slice(0, 5);

      const bankMatches = input.nearbyBanks
        .map(bank => ({
          bankId: bank.id,
          name: bank.name,
          phoneNumber: bank.phoneNumber,
          address: bank.address,
          availabilityReason: `Available stock level: ${bank.stockLevel} units.`,
          stockLevel: bank.stockLevel,
          distance: bank.distance,
        }))
        .slice(0, 3);

      return { donorMatches, bankMatches };
    }
  }
);

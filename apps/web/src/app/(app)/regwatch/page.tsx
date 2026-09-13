import { RegWatchClient } from './regwatch-client';

export const dynamic = 'force-dynamic';

// Calculate days countdown until full DPDPA statutory enforcement deadline (13 May 2027)
const TARGET_ENFORCEMENT_DATE = new Date('2027-05-13T00:00:00+05:30');
const DAYS_REMAINING_TO_ENFORCEMENT = Math.max(
  0,
  Math.ceil((TARGET_ENFORCEMENT_DATE.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
);

export default async function RegWatchPage() {
  return <RegWatchClient daysRemaining={DAYS_REMAINING_TO_ENFORCEMENT} />;
}

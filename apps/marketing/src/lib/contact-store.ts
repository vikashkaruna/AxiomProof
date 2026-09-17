import { randomUUID } from 'node:crypto';

export interface ContactInquiry {
  id: string;
  name: string;
  email: string;
  company?: string;
  message: string;
  timestamp: string;
  simulated: boolean;
}

// In-memory store across warm container lifetimes
const globalInquiries = globalThis as unknown as {
  __axiom_contact_inquiries?: Map<string, ContactInquiry>;
};

if (!globalInquiries.__axiom_contact_inquiries) {
  globalInquiries.__axiom_contact_inquiries = new Map<string, ContactInquiry>();
}

/**
 * Persists a founder contact inquiry in the in-memory store and logs
 * structured telemetry for GCP Cloud Logging so inquiries are never lost.
 */
export function saveContactInquiry(
  inquiry: Omit<ContactInquiry, 'id' | 'timestamp'>,
): ContactInquiry {
  const id = `inq_${randomUUID()}`;
  const record: ContactInquiry = {
    ...inquiry,
    id,
    timestamp: new Date().toISOString(),
  };

  globalInquiries.__axiom_contact_inquiries!.set(id, record);

  // Structured log for Cloud Run / GCP logging so inquiries are visible and auditable
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✉️  [Founder Contact Inquiry Received]');
  console.log(`   ID:        ${record.id}`);
  console.log(`   From:      ${record.name} <${record.email}>`);
  console.log(`   Company:   ${record.company || 'None specified'}`);
  console.log(`   Time:      ${record.timestamp}`);
  console.log(
    `   Delivery:  ${record.simulated ? 'Captured (simulated/stored)' : 'Delivered via Resend'}`,
  );
  console.log(`   Message:   ${record.message}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  return record;
}

export function getRecentContactInquiries(limit = 20): ContactInquiry[] {
  const all = Array.from(globalInquiries.__axiom_contact_inquiries!.values());
  return all.sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, limit);
}

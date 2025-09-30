import { BillingOversight } from '@/components/admin/billing-oversight';
import { requireAuth, getUserProfile } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function AdminBillingPage() {
  await requireAuth();

  const profile = await getUserProfile();

  if (!profile?.is_super_admin) {
    if (profile?.organization_id) {
      redirect('/dashboard');
    } else {
      redirect('/onboarding');
    }
  }

  return <BillingOversight />;
}
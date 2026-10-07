import type { Metadata } from 'next';
import { ClientApp } from '@/app/client-app';

export const metadata: Metadata = { title: 'Udashboard' };

export default function Page() {
  return <ClientApp route={{ name: 'dashboard' }} />;
}

import type { Metadata } from 'next';
import { ClientApp } from '@/app/client-app';

export const metadata: Metadata = { title: 'Utemplates' };

export default function Page() {
  return <ClientApp route={{ name: 'templates' }} />;
}

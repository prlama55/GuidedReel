import type { Metadata } from 'next';
import { ClientApp } from '@/app/client-app';

export const metadata: Metadata = { title: 'Uassets' };

export default function Page() {
  return <ClientApp route={{ name: 'assets' }} />;
}

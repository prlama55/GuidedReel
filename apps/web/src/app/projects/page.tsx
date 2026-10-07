import type { Metadata } from 'next';
import { ClientApp } from '@/app/client-app';

export const metadata: Metadata = { title: 'Uprojects' };

export default function Page() {
  return <ClientApp route={{ name: 'projects' }} />;
}

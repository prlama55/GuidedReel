import type { Metadata } from 'next';
import { ClientApp } from '@/app/client-app';

export const metadata: Metadata = { title: 'Editor' };

export default async function EditorRoute({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  return <ClientApp route={{ name: 'editor', projectId: decodeURIComponent(projectId) }} />;
}

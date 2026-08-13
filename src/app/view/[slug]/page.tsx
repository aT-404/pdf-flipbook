import type { Metadata } from 'next';
import { fetchDocumentBySlug, getPublicStorageUrl, BUCKET_COVERS } from '@/lib/storage/document-service';
import { FlipbookReaderClient } from '@/components/flipbook/FlipbookReaderClient';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  try {
    const doc = await fetchDocumentBySlug(slug);

    if (!doc || doc.status !== 'published') {
      return {
        title: 'Document Unavailable | Flipbook Platform',
        description: 'The requested document is unavailable or link is invalid.',
      };
    }

    const coverUrl = getPublicStorageUrl(BUCKET_COVERS, doc.cover_image_path);

    return {
      title: `${doc.title} | Flipbook Reader`,
      description: doc.description || `Read "${doc.title}" as an interactive digital flipbook online.`,
      openGraph: {
        title: doc.title,
        description: doc.description || `Read "${doc.title}" online flipbook`,
        type: 'article',
        images: coverUrl ? [{ url: coverUrl, alt: doc.title }] : [],
      },
      twitter: {
        card: 'summary_large_image',
        title: doc.title,
        description: doc.description || `Read "${doc.title}" online flipbook`,
        images: coverUrl ? [coverUrl] : [],
      },
    };
  } catch (e) {
    return {
      title: 'Digital Flipbook Reader',
    };
  }
}

export default async function ViewSlugPage({ params }: Props) {
  const { slug } = await params;
  return <FlipbookReaderClient slug={slug} />;
}

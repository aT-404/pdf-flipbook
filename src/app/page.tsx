'use client';

import { useCallback, useEffect, useState } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { openPdfFile, explainPdfError } from '@/lib/pdf/pdf-utils';
import { UploadScreen } from '@/components/flipbook/UploadScreen';
import { ReaderScreen } from '@/components/flipbook/ReaderScreen';

export default function Home() {
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openFile = useCallback(async (file: File) => {
    setError(null);
    setBusy(true);
    try {
      const doc = await openPdfFile(file);
      setPdf(doc);
      setFile(file);
      setTitle(file.name.replace(/\.pdf$/i, ''));
    } catch (err) {
      console.error(err);
      setError(explainPdfError(err));
    } finally {
      setBusy(false);
    }
  }, []);

  // Free the memory of a PDF once it is no longer shown
  useEffect(() => {
    return () => {
      void pdf?.loadingTask.destroy();
    };
  }, [pdf]);

  if (!pdf || !file) return <UploadScreen busy={busy} error={error} onFile={openFile} />;
  return <ReaderScreen pdf={pdf} file={file} title={title} onClose={() => setPdf(null)} />;
}

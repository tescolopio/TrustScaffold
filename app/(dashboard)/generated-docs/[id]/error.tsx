'use client';

import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function GeneratedDocDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="h-5 w-5" />
          Failed to load document
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-3">
        <p className="w-full text-sm text-muted-foreground">{error.message}</p>
        <Button variant="outline" onClick={reset}>Try again</Button>
        <Button variant="ghost" asChild>
          <Link href="/generated-docs">Back to documents</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

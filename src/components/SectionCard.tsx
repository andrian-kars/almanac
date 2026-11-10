import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { type ReactNode, useId } from 'react';

type SectionCardProps = {
  title: string;
  children?: ReactNode;
  isLoading?: boolean;
  error?: { message: string; onRetry: () => void };
  /** When set, shown instead of the content: the source answered but has nothing. */
  emptyMessage?: string;
};

/**
 * The frame every data source sits in. It owns the shared states, in priority order:
 * loading → error (with Retry) → empty → content. One failing source never blanks the page.
 */
export function SectionCard({ title, children, isLoading, error, emptyMessage }: SectionCardProps) {
  const headingId = useId();

  return (
    <Paper component="section" variant="outlined" aria-labelledby={headingId} sx={{ p: 2 }}>
      <Typography id={headingId} variant="h6" component="h2" sx={{ mb: 1.5 }}>
        {title}
      </Typography>
      <SectionBody title={title} isLoading={isLoading} error={error} emptyMessage={emptyMessage}>
        {children}
      </SectionBody>
    </Paper>
  );
}

function SectionBody({ title, children, isLoading, error, emptyMessage }: SectionCardProps) {
  if (isLoading) {
    return (
      <Stack role="status" aria-label={`Loading ${title}`} spacing={1}>
        <Skeleton variant="rounded" height={32} />
        <Skeleton variant="text" />
        <Skeleton variant="text" />
        <Skeleton variant="text" width="60%" />
      </Stack>
    );
  }

  if (error) {
    return (
      <Alert
        severity="error"
        action={
          <Button color="inherit" size="small" onClick={error.onRetry}>
            Retry
          </Button>
        }
      >
        {error.message}
      </Alert>
    );
  }

  if (emptyMessage) {
    return <Typography color="text.secondary">{emptyMessage}</Typography>;
  }

  return children;
}

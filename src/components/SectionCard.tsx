import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { type ReactNode, useId } from 'react';

type SectionCardProps = {
  title: string;
  /** A line under the title, e.g. the place the data is for. */
  subtitle?: ReactNode;
  /** Controls beside the title, e.g. a unit switch. Shown in every state. */
  action?: ReactNode;
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
export function SectionCard({
  title,
  subtitle,
  action,
  children,
  isLoading,
  error,
  emptyMessage,
}: SectionCardProps) {
  const headingId = useId();

  return (
    <Paper
      component="section"
      variant="outlined"
      aria-labelledby={headingId}
      sx={{
        p: { xs: 2, sm: 3 },
        // A heavy top rule, like a section head in a printed almanac.
        borderTop: '3px solid',
        borderTopColor: 'text.primary',
      }}
    >
      <Stack
        direction="row"
        spacing={2}
        sx={{ alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}
      >
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography id={headingId} variant="h5" component="h2">
            {title}
          </Typography>
          {subtitle && (
            // A div, not a paragraph: the subtitle may hold a control such as a picker.
            <Typography variant="body2" component="div" color="text.secondary" sx={{ mt: 0.5 }}>
              {subtitle}
            </Typography>
          )}
        </Box>
        {action}
      </Stack>
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

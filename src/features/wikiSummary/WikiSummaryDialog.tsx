import CloseIcon from '@mui/icons-material/Close';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import Skeleton from '@mui/material/Skeleton';
import type { Theme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useId, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { DecorativeImage } from '../../components/DecorativeImage';
import { getErrorMessage, HttpError } from '../../lib/http';
import { wikiArticleUrl } from '../../lib/wikipedia';
import { normalizeSlug, type WikiSummary } from './api';
import { ARTICLE_PARAM, wasOpenedInApp } from './articleParam';
import { useWikiSummary } from './useWikiSummary';
import styles from './WikiSummaryDialog.module.css';

const isMissingArticle = (error: unknown) => error instanceof HttpError && error.status === 404;

/**
 * The Wikipedia summary of the article named in the address (`?article=…`), shown over
 * whatever page is open. Rendered once, in the app layout: any page opens it with an
 * ArticleLink. The summary is requested only when a dialog opens.
 */
export function WikiSummaryDialog() {
  const location = useLocation();
  const navigate = useNavigate();
  const titleId = useId();
  const isPhone = useMediaQuery((theme: Theme) => theme.breakpoints.down('sm'), { noSsr: true });

  const slug = normalizeSlug(new URLSearchParams(location.search).get(ARTICLE_PARAM));
  // The last article stays on show while the dialog fades out, instead of blanking first.
  const [shownSlug, setShownSlug] = useState(slug);
  if (slug !== null && slug !== shownSlug) setShownSlug(slug);

  const query = useWikiSummary(shownSlug);

  if (shownSlug === null) return null;

  const close = () => {
    if (slug === null) return;
    if (wasOpenedInApp(location.state)) {
      // Leaves no entry behind, so Back does not reopen the dialog.
      void navigate(-1);
      return;
    }
    const params = new URLSearchParams(location.search);
    params.delete(ARTICLE_PARAM);
    const search = params.toString();
    void navigate(
      { pathname: location.pathname, search: search && `?${search}` },
      { replace: true },
    );
  };

  const isMissing = query.isError && isMissingArticle(query.error);
  // Until the summary arrives the name from the address stands in, so the dialog is never
  // unnamed. Wikipedia's own title replaces it (it can differ after a redirect).
  const title = query.data?.title ?? shownSlug.replaceAll('_', ' ');
  const articleUrl = query.data?.url ?? (isMissing ? undefined : wikiArticleUrl(shownSlug));

  return (
    <Dialog
      open={slug !== null}
      onClose={close}
      fullScreen={isPhone}
      fullWidth
      maxWidth="sm"
      scroll="paper"
      aria-labelledby={titleId}
    >
      <div className={styles.header}>
        <DialogTitle
          id={titleId}
          sx={{
            flex: 1,
            minWidth: 0,
            fontFamily: 'var(--almanac-font-display)',
            fontSize: '1.625rem',
            fontWeight: 600,
            lineHeight: 1.2,
            overflowWrap: 'anywhere',
          }}
        >
          {title}
        </DialogTitle>
        <IconButton aria-label="Close" onClick={close} sx={{ mt: 1.5 }}>
          <CloseIcon />
        </IconButton>
      </div>

      <DialogContent dividers>
        {query.isPending && <LoadingSummary />}
        {query.isError && (
          <Alert
            severity={isMissing ? 'info' : 'error'}
            action={
              // A missing article will not appear on a second try.
              isMissing ? undefined : (
                <Button color="inherit" size="small" onClick={() => void query.refetch()}>
                  Retry
                </Button>
              )
            }
          >
            {isMissing ? 'Wikipedia has no article with this name.' : getErrorMessage(query.error)}
          </Alert>
        )}
        {query.data && <SummaryBody summary={query.data} />}
      </DialogContent>

      {articleUrl && (
        <DialogActions>
          <Button
            href={articleUrl}
            target="_blank"
            rel="noopener noreferrer"
            endIcon={<OpenInNewIcon fontSize="small" />}
          >
            Read on Wikipedia
          </Button>
        </DialogActions>
      )}
    </Dialog>
  );
}

function LoadingSummary() {
  return (
    <div role="status" aria-label="Loading summary">
      <Skeleton width="45%" />
      <Skeleton />
      <Skeleton />
      <Skeleton width="80%" />
    </div>
  );
}

function SummaryBody({ summary }: { summary: WikiSummary }) {
  const hasText = summary.paragraphs.length > 0;

  return (
    <div className={styles.body}>
      {/* Decorative: the dialog is already named after what it shows. */}
      {summary.imageUrl && <DecorativeImage className={styles.image} src={summary.imageUrl} />}
      {summary.description && <p className={styles.description}>{summary.description}</p>}

      {summary.paragraphs.map((paragraph, index) => (
        // The list never changes for a given summary, so the position is a stable key.
        <p key={index} className={styles.paragraph}>
          {paragraph}
        </p>
      ))}
      {summary.isDisambiguation && (
        <p className={styles.paragraph}>
          This name can mean several things. Wikipedia lists the articles it covers.
        </p>
      )}
      {!hasText && !summary.isDisambiguation && (
        <p className={styles.paragraph}>Wikipedia has no summary for this article yet.</p>
      )}

      {hasText && <p className={styles.source}>Text from Wikipedia, CC BY-SA 4.0</p>}
    </div>
  );
}

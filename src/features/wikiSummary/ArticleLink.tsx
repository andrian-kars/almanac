import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router';
import { ARTICLE_PARAM, OPENED_IN_APP } from './articleParam';

type ArticleLinkProps = {
  /** The article's canonical title, e.g. "Ayrton_Senna". */
  slug: string;
  children: ReactNode;
  className?: string;
  'aria-label'?: string;
};

/**
 * A link that opens an article's Wikipedia summary over the current page. Other address
 * parameters (such as the bookmarks filter) are kept.
 */
export function ArticleLink({ slug, children, ...linkProps }: ArticleLinkProps) {
  const { pathname, search } = useLocation();
  const params = new URLSearchParams(search);
  params.set(ARTICLE_PARAM, slug);

  return (
    <Link
      {...linkProps}
      to={{ pathname, search: `?${params.toString()}` }}
      state={OPENED_IN_APP}
      aria-haspopup="dialog"
    >
      {children}
    </Link>
  );
}

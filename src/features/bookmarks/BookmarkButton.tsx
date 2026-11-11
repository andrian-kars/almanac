import BookmarkIcon from '@mui/icons-material/Bookmark';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import { type BookmarkDraft, toggleBookmark, useIsBookmarked } from './store';

type BookmarkButtonProps = {
  /** What to save. Its id decides whether the button shows as saved. */
  bookmark: BookmarkDraft;
  /** Names the item for screen readers, e.g. "Apollo 11, 1969". */
  label: string;
};

/**
 * Saves or removes one discovery. A toggle button: its name stays the same and
 * `aria-pressed` carries the state, as assistive technology expects.
 */
export function BookmarkButton({ bookmark, label }: BookmarkButtonProps) {
  const isSaved = useIsBookmarked(bookmark.id);

  return (
    // describeChild: the tooltip explains the action without replacing the button's name.
    <Tooltip title={isSaved ? 'Remove bookmark' : 'Save bookmark'} describeChild>
      <IconButton
        size="small"
        color={isSaved ? 'primary' : 'default'}
        aria-label={`Bookmark: ${label}`}
        aria-pressed={isSaved}
        onClick={() => toggleBookmark(bookmark)}
      >
        {isSaved ? <BookmarkIcon /> : <BookmarkBorderIcon />}
      </IconButton>
    </Tooltip>
  );
}

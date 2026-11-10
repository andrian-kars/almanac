import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import { useState } from 'react';
import { useDebouncedValue } from '../../lib/useDebouncedValue';
import { MIN_SEARCH_LENGTH, usePlaceSearch } from './geocoding';
import { formatLocation, type Location, PRESET_LOCATIONS } from './locations';

/** Long enough to skip the requests for "P", "Pa", "Par" while someone types "Paris". */
const SEARCH_DELAY_MS = 300;

type LocationPickerProps = { value: Location; onChange: (location: Location) => void };

/**
 * Chooses the place weather is shown for. Opened untouched it offers the suggested places;
 * typing a name searches for any place in the world.
 */
export function LocationPicker({ value, onChange }: LocationPickerProps) {
  const currentLabel = formatLocation(value);
  const [input, setInput] = useState(currentLabel);

  const term = input.trim();
  // The field shows the current place's name until the user types something else.
  const isSearching = term.length >= MIN_SEARCH_LENGTH && term !== currentLabel;
  const debouncedTerm = useDebouncedValue(term, SEARCH_DELAY_MS);
  // Until typing pauses, the debounced value is stale (at first it is still the old place's
  // name), so nothing is searched before it catches up with the field.
  const hasPaused = debouncedTerm === term;
  const search = usePlaceSearch(isSearching && hasPaused ? term : '');
  const isSettled = hasPaused && !search.isFetching;

  const suggestions = PRESET_LOCATIONS.some(({ id }) => id === value.id)
    ? PRESET_LOCATIONS
    : [value, ...PRESET_LOCATIONS];
  const options = isSearching ? (isSettled ? (search.data ?? []) : []) : suggestions;

  return (
    <Autocomplete
      size="small"
      disableClearable
      autoHighlight
      value={value}
      onChange={(_event, location) => onChange(location)}
      inputValue={input}
      onInputChange={(_event, text) => setInput(text)}
      options={options}
      // Results come already matched from the search; the suggestions are always shown whole.
      filterOptions={(all) => all}
      getOptionLabel={formatLocation}
      getOptionKey={(location) => location.id}
      isOptionEqualToValue={(option, selected) => option.id === selected.id}
      loading={isSearching && !isSettled}
      loadingText="Searching…"
      noOptionsText={search.isError ? 'Search failed. Try again.' : 'No places found'}
      renderInput={(params) => (
        <TextField {...params} variant="standard" label="Location" placeholder="Search a place" />
      )}
      sx={{ mt: 1, maxWidth: '22rem' }}
    />
  );
}

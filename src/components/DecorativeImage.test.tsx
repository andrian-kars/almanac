import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DecorativeImage } from './DecorativeImage';

const getImage = (container: HTMLElement) => {
  const image = container.querySelector('img');
  if (!image) throw new Error('No image rendered');
  return image;
};

describe('DecorativeImage', () => {
  it('keeps the class it is given alongside its own', () => {
    const { container } = render(<DecorativeImage src="https://example.org/a.png" className="x" />);

    expect(getImage(container)).toHaveClass('x');
  });

  // Many Wikipedia pictures are dark drawings on a transparent background. In the dark
  // scheme they get a light backing, but only once loaded: an empty light box would flash.
  it('is marked as loaded only once the picture has arrived', () => {
    const { container } = render(<DecorativeImage src="https://example.org/a.png" />);
    const image = getImage(container);
    expect(image).not.toHaveAttribute('data-loaded');

    fireEvent.load(image);

    expect(image).toHaveAttribute('data-loaded');
  });

  it('is not marked as loaded for a new picture until that one arrives', () => {
    const { container, rerender } = render(<DecorativeImage src="https://example.org/a.png" />);
    fireEvent.load(getImage(container));

    rerender(<DecorativeImage src="https://example.org/b.png" />);

    expect(getImage(container)).not.toHaveAttribute('data-loaded');
  });
});

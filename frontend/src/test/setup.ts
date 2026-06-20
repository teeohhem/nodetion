import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock document.createRange
document.createRange = () => {
  const range = new Range();
  range.selectNodeContents = vi.fn();
  range.collapse = vi.fn();
  return range;
};

// Mock window.getSelection
window.getSelection = () => {
  return {
    removeAllRanges: vi.fn(),
    addRange: vi.fn(),
  } as unknown as Selection;
};

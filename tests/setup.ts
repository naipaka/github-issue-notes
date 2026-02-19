import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// Mock browser API globally
vi.stubGlobal('browser', {
  runtime: {
    openOptionsPage: vi.fn(),
    onInstalled: {
      addListener: vi.fn(),
    },
  },
});

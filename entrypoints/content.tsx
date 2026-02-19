import ReactDOM from 'react-dom/client';
import NoteArea from '@/components/NoteArea';
import { extractNoteKey } from '@/utils/noteKey';
import '@/assets/styles.css';

const CONTAINER_ID = 'github-issue-notes-container';

export default defineContentScript({
  matches: ['https://github.com/*/*/issues/*', 'https://github.com/*/*/pull/*'],

  async main(ctx) {
    let currentRoot: ReactDOM.Root | null = null;
    let watchIntervalId: ReturnType<typeof setInterval> | null = null;

    const cleanup = () => {
      if (currentRoot) {
        currentRoot.unmount();
        currentRoot = null;
      }
      const container = document.querySelector(`#${CONTAINER_ID}`);
      if (container) {
        container.remove();
      }
    };

    const inject = (): boolean => {
      const noteKey = extractNoteKey(window.location.pathname);
      if (!noteKey) return false;

      const notificationsSection = findNotificationsSection();
      if (!notificationsSection) return false;

      // Check if already correctly positioned
      const existingContainer = document.querySelector(`#${CONTAINER_ID}`);
      if (existingContainer) {
        const currentKey = existingContainer.getAttribute('data-note-key');
        if (currentKey === noteKey &&
            existingContainer.previousElementSibling === notificationsSection) {
          return true;
        }
        cleanup();
      }

      // Create container
      const container = document.createElement('div');
      container.id = CONTAINER_ID;
      container.setAttribute('data-note-key', noteKey);
      container.style.marginTop = '16px';

      notificationsSection.insertAdjacentElement('afterend', container);

      currentRoot = ReactDOM.createRoot(container);
      currentRoot.render(<NoteArea noteKey={noteKey} />);

      return true;
    };

    const startWatching = () => {
      if (watchIntervalId) clearInterval(watchIntervalId);

      let attempts = 0;
      watchIntervalId = setInterval(() => {
        attempts++;
        if (attempts > 30) {
          if (watchIntervalId) clearInterval(watchIntervalId);
          return;
        }

        const noteKey = extractNoteKey(window.location.pathname);
        if (!noteKey) {
          cleanup();
          return;
        }

        const container = document.querySelector(`#${CONTAINER_ID}`);
        const notificationsSection = findNotificationsSection();

        // Inject if not exists or wrong position
        if (notificationsSection && (!container || container.previousElementSibling !== notificationsSection)) {
          cleanup();
          inject();
        }
      }, 500);
    };

    startWatching();

    const handleNavigation = () => {
      cleanup();
      startWatching();
    };

    document.addEventListener('turbo:load', handleNavigation);
    document.addEventListener('turbo:render', handleNavigation);
    window.addEventListener('popstate', handleNavigation);

    ctx.onInvalidated(() => {
      if (watchIntervalId) clearInterval(watchIntervalId);
      cleanup();
    });
  },
});

/**
 * Find the Notifications section by looking for Subscribe/Unsubscribe button
 */
function findNotificationsSection(): Element | null {
  // Method 1: Find by #issue-viewer-subscription-description (most reliable for own repos)
  const subscriptionDesc = document.querySelector('#issue-viewer-subscription-description');
  if (subscriptionDesc) {
    const section = subscriptionDesc.closest('[data-testid="sidebar-section"]');
    if (section) return section;
  }

  // Method 2: Find Subscribe or Unsubscribe button that has "Notifications" nearby
  const buttons = document.querySelectorAll('button');
  for (const button of buttons) {
    const text = button.textContent?.trim();
    if (text === 'Subscribe' || text === 'Unsubscribe') {
      // First try: find data-testid="sidebar-section"
      const section = button.closest('[data-testid="sidebar-section"]');
      if (section) return section;

      // Second try: walk up to find a container that has "Notifications" text nearby
      const ancestors = getAncestors(button);
      for (const ancestor of ancestors) {
        if (hasNotificationsLabel(ancestor)) {
          // Make sure this ancestor has siblings (indicating it's a section)
          if (ancestor.parentElement && ancestor.parentElement.children.length > 1) {
            return ancestor;
          }
        }
      }
    }
  }

  return null;
}

/**
 * Get all ancestor elements
 */
function getAncestors(element: Element): Element[] {
  const ancestors: Element[] = [];
  let current = element.parentElement;
  while (current) {
    ancestors.push(current);
    current = current.parentElement;
  }
  return ancestors;
}

/**
 * Check if element contains "Notifications" label (not in deep content)
 */
function hasNotificationsLabel(element: Element): boolean {
  // Check direct children for "Notifications" text
  for (const child of element.children) {
    // Skip our own container
    if (child.id === 'github-issue-notes-container') continue;

    const text = child.textContent?.trim();
    // Look for elements that are likely headers/labels
    if (text === 'Notifications' || text?.startsWith('Notifications\n')) {
      return true;
    }
  }
  return false;
}

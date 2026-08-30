/**
 * 🌟 Centralized Modal & Popup Lifecycle Manager for Android & Web 🌟
 * 
 * Features:
 * 1. Hardware / Android Gesture Back Button Interception (via History API popstate).
 * 2. Multi-modal Stack Tracking (top-most modal closes first, no duplicate instances).
 * 3. Reference-Counted Scroll Lock (safely restores body scroll with zero layout shift).
 * 4. Android Soft Keyboard Auto-Dismissal (clears focus before unmounting).
 * 5. Safe Event Handlers & Outside-Click Isolation.
 */

type ModalCloseHandler = () => void;

interface ModalEntry {
  id: string;
  onClose: ModalCloseHandler;
  preventCloseOnLoading?: boolean;
  historyPushed: boolean;
}

class ModalManager {
  private stack: ModalEntry[] = [];
  private scrollLockCount = 0;
  private originalBodyOverflow = '';
  private originalBodyPaddingRight = '';
  private isHandlingPopstate = false;
  private pendingPopstateIgnores = 0;
  private isInitialized = false;

  constructor() {
    this.init();
  }

  private init() {
    if (typeof window === 'undefined' || this.isInitialized) return;
    this.isInitialized = true;

    // Handle Android / Browser Back Button
    window.addEventListener('popstate', this.handlePopstate);

    // Handle Hardware Escape Key
    window.addEventListener('keydown', this.handleKeyDown, { capture: true });
  }

  private handlePopstate = (e: PopStateEvent) => {
    // If popstate was triggered programmatically by closeModal(), ignore it to prevent closing subsequent modals
    if (this.pendingPopstateIgnores > 0) {
      this.pendingPopstateIgnores--;
      return;
    }

    if (this.stack.length === 0) return;

    this.isHandlingPopstate = true;
    const top = this.stack[this.stack.length - 1];

    if (top) {
      this.dismissKeyboard();
      top.onClose();
    }
    this.isHandlingPopstate = false;
  };

  private handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && this.stack.length > 0) {
      const top = this.stack[this.stack.length - 1];
      if (top) {
        e.preventDefault();
        e.stopPropagation();
        this.dismissKeyboard();
        top.onClose();
      }
    }
  };

  /**
   * Safely dismisses the virtual keyboard on Android/iOS
   */
  public dismissKeyboard() {
    if (typeof document === 'undefined') return;
    const active = document.activeElement as HTMLElement | null;
    if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable || active.tagName === 'SELECT')) {
      try {
        active.blur();
      } catch (err) {
        // ignore
      }
    }
  }

  /**
   * Registers a modal when it opens
   */
  public openModal(id: string, onClose: ModalCloseHandler, options?: { preventCloseOnLoading?: boolean; isSubmitting?: boolean }) {
    if (typeof window === 'undefined') return;

    // Prevent duplicate entries of the same modal
    const existingIndex = this.stack.findIndex(m => m.id === id);
    if (existingIndex !== -1) {
      this.stack[existingIndex].onClose = onClose;
      return;
    }

    let historyPushed = false;
    try {
      // Push history state to capture Android hardware back button
      const stateObj = { isModalOpen: true, modalId: id, timestamp: Date.now() };
      window.history.pushState(stateObj, document.title);
      historyPushed = true;
    } catch (e) {
      // ignore security / iframe state push limits if any
    }

    this.stack.push({
      id,
      onClose,
      preventCloseOnLoading: options?.preventCloseOnLoading,
      historyPushed
    });

    this.lockScroll();
  }

  /**
   * Unregisters a modal when it closes
   */
  public closeModal(id: string) {
    if (typeof window === 'undefined') return;

    const index = this.stack.findIndex(m => m.id === id);
    if (index === -1) return;

    const entry = this.stack[index];
    this.stack.splice(index, 1);

    this.unlockScroll();
    this.dismissKeyboard();

    // If modal was closed via UI (not via hardware back button) and pushed history, unwind history safely
    if (entry.historyPushed && !this.isHandlingPopstate) {
      try {
        if (window.history.state && window.history.state.modalId === id) {
          this.pendingPopstateIgnores++;
          window.history.back();
          // Reset safety counter after timeout in case popstate didn't fire
          setTimeout(() => {
            if (this.pendingPopstateIgnores > 0) {
              this.pendingPopstateIgnores = 0;
            }
          }, 300);
        }
      } catch (e) {
        // ignore
      }
    }
  }

  public isTopModal(id: string): boolean {
    if (this.stack.length === 0) return false;
    return this.stack[this.stack.length - 1].id === id;
  }

  public getStackSize(): number {
    return this.stack.length;
  }

  /**
   * Reference-counted body scroll locking
   */
  private lockScroll() {
    if (typeof document === 'undefined') return;
    this.scrollLockCount++;

    if (this.scrollLockCount === 1) {
      const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth;
      this.originalBodyOverflow = document.body.style.overflow;
      this.originalBodyPaddingRight = document.body.style.paddingRight;

      document.body.style.overflow = 'hidden';
      if (scrollBarWidth > 0) {
        document.body.style.paddingRight = `${scrollBarWidth}px`;
      }
      document.body.setAttribute('data-modal-open', 'true');
    }
  }

  private unlockScroll() {
    if (typeof document === 'undefined') return;
    this.scrollLockCount = Math.max(0, this.scrollLockCount - 1);

    if (this.scrollLockCount === 0) {
      document.body.style.overflow = this.originalBodyOverflow || '';
      document.body.style.paddingRight = this.originalBodyPaddingRight || '';
      document.body.removeAttribute('data-modal-open');
    }
  }

  /**
   * Emergency reset if any dirty state lingers
   */
  public forceReset() {
    this.stack = [];
    this.scrollLockCount = 0;
    if (typeof document !== 'undefined') {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
      document.body.removeAttribute('data-modal-open');
    }
  }
}

export const modalManager = new ModalManager();

import { useEffect, useId, useRef, useCallback, MouseEvent } from 'react';
import { modalManager } from '../lib/modalManager';

interface UseModalLifecycleOptions {
  isOpen: boolean;
  onClose: () => void;
  id?: string;
  isSubmitting?: boolean;
  preventCloseOnLoading?: boolean;
}

export function useModalLifecycle({
  isOpen,
  onClose,
  id: explicitId,
  isSubmitting = false,
  preventCloseOnLoading = false,
}: UseModalLifecycleOptions) {
  const generatedId = useId();
  const modalId = explicitId || generatedId;
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const handleSafeClose = useCallback(() => {
    if (preventCloseOnLoading && isSubmitting) {
      return;
    }
    modalManager.dismissKeyboard();
    onCloseRef.current();
  }, [preventCloseOnLoading, isSubmitting]);

  useEffect(() => {
    if (!isOpen) return;

    modalManager.openModal(modalId, handleSafeClose, {
      preventCloseOnLoading,
      isSubmitting
    });

    return () => {
      modalManager.closeModal(modalId);
    };
  }, [isOpen, modalId, handleSafeClose, preventCloseOnLoading, isSubmitting]);

  const handleBackdropClick = useCallback((e: MouseEvent<HTMLElement>) => {
    if (e.target === e.currentTarget) {
      e.preventDefault();
      e.stopPropagation();
      handleSafeClose();
    }
  }, [handleSafeClose]);

  return {
    modalId,
    handleSafeClose,
    handleBackdropClick,
    dismissKeyboard: modalManager.dismissKeyboard,
  };
}

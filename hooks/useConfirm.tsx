import React, { useState, useCallback, useRef } from 'react';
import ConfirmDialog, { ConfirmVariant } from '../components/ConfirmDialog';

interface ConfirmState {
  title: string;
  message: string;
  variant: ConfirmVariant;
  confirmText?: string;
}

/**
 * Hook that replaces window.confirm with a styled modal.
 * Usage:
 *   const { confirm, confirmDialog } = useConfirm();
 *   if (!await confirm('Title', 'Message', 'danger')) return;
 *   // ... user confirmed
 *   // Render {confirmDialog} at the end of your JSX.
 */
export function useConfirm() {
  const [state, setState] = useState<ConfirmState | null>(null);
  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback((
    title: string,
    message: string,
    variant: ConfirmVariant = 'default',
    confirmText?: string,
  ): Promise<boolean> => {
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setState({ title, message, variant, confirmText });
    });
  }, []);

  const handleConfirm = useCallback(() => {
    resolveRef.current?.(true);
    resolveRef.current = null;
    setState(null);
  }, []);

  const handleCancel = useCallback(() => {
    resolveRef.current?.(false);
    resolveRef.current = null;
    setState(null);
  }, []);

  const confirmDialog = state ? (
    <ConfirmDialog
      open
      title={state.title}
      message={state.message}
      variant={state.variant}
      confirmText={state.confirmText}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
    />
  ) : null;

  return { confirm, confirmDialog };
}

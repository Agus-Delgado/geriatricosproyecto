/**
 * Utility function to show confirmation dialogs
 * In a real app, you might want to use a proper modal library
 */
export const confirmAction = (
  message: string,
  onConfirm: () => void,
  onCancel?: () => void
) => {
  if (window.confirm(message)) {
    onConfirm();
  } else {
    onCancel?.();
  }
};

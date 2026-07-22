export const notify = (message, type = 'info') => {
  window.dispatchEvent(new CustomEvent('app:toast', { detail: { message, type } }));
};

export const notifySuccess = (message) => notify(message, 'success');
export const notifyError = (message) => notify(message, 'error');
export const notifyInfo = (message) => notify(message, 'info');

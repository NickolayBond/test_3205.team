export const getMessageError = (error: unknown) =>
  error instanceof Error ? error.message : 'Unknown error';

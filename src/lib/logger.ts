function logError(message: string, error?: unknown): void {
  const timestamp = new Date().toISOString();
  const formattedMessage = `[ERROR] ${timestamp}: ${message}`;

  if (error instanceof Error) {
    console.error(formattedMessage, {
      message: error.message,
      stack: error.stack,
    });
  } else {
    console.error(formattedMessage, error || "");
  }
}

export const logger = {
  error: (message: string, error?: unknown) => logError(message, error),
};

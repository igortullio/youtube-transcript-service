export const logger = {
  info: (message: string, meta?: any) => {
    console.log(
      JSON.stringify({
        level: 'INFO',
        timestamp: new Date().toISOString(),
        message,
        ...meta,
      }),
    )
  },
  error: (message: string, error?: any, meta?: any) => {
    console.error(
      JSON.stringify({
        level: 'ERROR',
        timestamp: new Date().toISOString(),
        message,
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
        ...meta,
      }),
    )
  },
  warn: (message: string, meta?: any) => {
    console.warn(
      JSON.stringify({
        level: 'WARN',
        timestamp: new Date().toISOString(),
        message,
        ...meta,
      }),
    )
  },
}

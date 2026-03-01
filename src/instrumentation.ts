export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { default: tracer } = await import('dd-trace');
    tracer.init({
      service: process.env.DD_SERVICE ?? 'acme-issue-tracker',
      env: process.env.DD_ENV ?? process.env.NODE_ENV ?? 'development',
      hostname: process.env.DD_AGENT_HOST ?? 'localhost',
      logInjection: true,
    });
  }
}

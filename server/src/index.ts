import app, { scheduled, type Bindings } from './app';

export default {
  fetch: app.fetch,
  scheduled(_controller: ScheduledController, env: Bindings, ctx: ExecutionContext) {
    ctx.waitUntil(scheduled(env));
  },
} satisfies ExportedHandler<Bindings>;

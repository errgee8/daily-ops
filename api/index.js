// Vercel serverless entrypoint for the existing Express API.
// Express apps are already compatible with Vercel's Node request handler.
// Wrapping this app with serverless-http caused requests to wait until the
// function timeout instead of sending Express's response.
import serverModule from '../dist/server.cjs';

const app = serverModule.app || serverModule.default?.app || serverModule;

export default function handler(req, res) {
  return app(req, res);
}

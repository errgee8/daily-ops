// Vercel serverless entrypoint for the existing Express API.
import serverless from 'serverless-http';
import serverModule from '../dist/server.cjs';

const app = serverModule.app || serverModule.default?.app || serverModule;
export default serverless(app);

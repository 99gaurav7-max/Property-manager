import serverless from 'serverless-http';
import { createApp } from '../server';

let _handler: any;

export async function handler(event: any, context: any) {
  if (!_handler) {
    const app = await createApp();
    _handler = serverless(app);
  }
  return _handler(event, context);
}

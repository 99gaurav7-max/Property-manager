import serverless from 'serverless-http';
import { createApp } from '../server';

let _handler: any;

export async function handler(event: any, context: any) {
  if (!_handler) {
    try {
      const app = await createApp();
      _handler = serverless(app);
    } catch (err: any) {
      console.error('Init error:', err);
      return {
        statusCode: 500,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ error: err?.message || String(err), stack: err?.stack }),
      };
    }
  }
  try {
    return await _handler(event, context);
  } catch (err: any) {
    console.error('Handler error:', err);
    return {
      statusCode: 500,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ error: err?.message || String(err), stack: err?.stack }),
    };
  }
}

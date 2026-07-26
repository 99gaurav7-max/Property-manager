import { createApp } from '../server';

let _app: any;

export default async function handler(req: any, res: any) {
  if (!_app) _app = await createApp();
  _app(req, res);
}

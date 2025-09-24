import { VercelRequest, VercelResponse } from '@vercel/node';
import { DemoResponse } from '../shared/api';

export default function handler(req: VercelRequest, res: VercelResponse) {
  const response: DemoResponse & {
    status: string;
    env: string;
  } = {
    status: 'online',
    message: 'Pixel Realm API is running',
    env: process.env.NODE_ENV || 'development'
  };
  
  // Set CORS headers to allow frontend to access this API
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );
  
  // Handle OPTIONS request for CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  return res.status(200).json(response);
}
import { VercelRequest, VercelResponse } from '@vercel/node';
// Remove the relative import and define the type inline
// import { DemoResponse } from '../shared/api';

export default function handler(req: VercelRequest, res: VercelResponse) {
  // Define response type inline
  const response = {
    status: 'online',
    message: 'Pixel Realm API is running',
    env: process.env.NODE_ENV || 'development'
  };
  
  // CORS headers remain the same
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  return res.status(200).json(response);
}
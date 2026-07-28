export const GMAIL_CONFIG = {
  redirectUri: '/api/gmail/callback',
  scopes: ['https://www.googleapis.com/auth/gmail.compose'],
  retryLimit: 3,
  timeout: 15000, // 15 seconds
};
export default GMAIL_CONFIG;

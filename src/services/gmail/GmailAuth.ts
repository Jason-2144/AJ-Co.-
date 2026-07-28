import axios from 'axios';

interface GmailTokens {
  accessToken: string;
  refreshToken: string;
  expiryDate: number;
  email?: string;
}

export class GmailAuth {
  private static instance: GmailAuth | null = null;
  private tokens: GmailTokens | null = null;

  // Google API endpoints
  private readonly authUrlBase = 'https://accounts.google.com/o/oauth2/v2/auth';
  private readonly tokenUrl = 'https://oauth2.googleapis.com/token';
  private readonly userInfoUrl = 'https://www.googleapis.com/oauth2/v2/userinfo';

  private constructor() {}

  /**
   * Singleton accessor for GmailAuth on Node backend.
   */
  static getInstance(): GmailAuth {
    if (!GmailAuth.instance) {
      GmailAuth.instance = new GmailAuth();
    }
    return GmailAuth.instance;
  }

  /**
   * Determines if credentials are empty to fall back to mock connection triggers.
   */
  isMockMode(): boolean {
    return !process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET;
  }

  /**
   * Checks connection authentication state.
   */
  isAuthenticated(): boolean {
    if (this.isMockMode()) {
      return true;
    }
    return this.tokens !== null;
  }

  /**
   * Returns current authenticated email info.
   */
  getEmail(): string {
    if (this.isMockMode()) {
      return 'demo-sales@ajandco.site';
    }
    return this.tokens?.email || 'authenticated-user@gmail.com';
  }

  /**
   * Constructs Google redirect authentication URL.
   */
  getAuthUrl(appUrl: string): string {
    if (this.isMockMode()) {
      return `${appUrl}/api/gmail/callback?code=mock_code_123456`;
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${appUrl}/api/gmail/callback`;
    const scopes = encodeURIComponent(
      'https://www.googleapis.com/auth/gmail.compose https://www.googleapis.com/auth/userinfo.email'
    );

    return `${this.authUrlBase}?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scopes}&access_type=offline&prompt=consent`;
  }

  /**
   * Exchanges code parameters for tokens.
   */
  async handleCallback(code: string, appUrl: string): Promise<void> {
    if (this.isMockMode()) {
      this.tokens = {
        accessToken: 'mock_access_token_123',
        refreshToken: 'mock_refresh_token_123',
        expiryDate: Date.now() + 3600 * 1000,
        email: 'demo-sales@ajandco.site',
      };
      return;
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${appUrl}/api/gmail/callback`;

    try {
      const response = await axios.post(this.tokenUrl, {
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      });

      const { access_token, refresh_token, expires_in } = response.data;

      this.tokens = {
        accessToken: access_token,
        refreshToken: refresh_token || '', // refresh token is sent only on initial user consent prompt
        expiryDate: Date.now() + expires_in * 1000,
      };

      await this.fetchUserEmail();
    } catch (error: any) {
      console.error(
        'Error exchanging authorization code for tokens:',
        error?.response?.data || error?.message
      );
      throw new Error('Google OAuth authorization token exchange code failed.');
    }
  }

  /**
   * Validates access token expiry and refreshes if needed.
   */
  async getValidAccessToken(): Promise<string> {
    if (this.isMockMode()) {
      return 'mock_access_token_123';
    }

    if (!this.tokens) {
      throw new Error('Google OAuth credentials not found. Please log in first.');
    }

    // Refresh session 5 minutes early to prevent failures
    const buffer = 5 * 60 * 1000;
    if (Date.now() + buffer >= this.tokens.expiryDate) {
      if (!this.tokens.refreshToken) {
        throw new Error('Google OAuth session expired. Refresh token missing. Please re-authenticate.');
      }
      await this.refreshAccessToken();
    }

    return this.tokens.accessToken;
  }

  private async refreshAccessToken(): Promise<void> {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    try {
      const response = await axios.post(this.tokenUrl, {
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: this.tokens?.refreshToken,
        grant_type: 'refresh_token',
      });

      const { access_token, expires_in } = response.data;
      if (this.tokens) {
        this.tokens.accessToken = access_token;
        this.tokens.expiryDate = Date.now() + expires_in * 1000;
      }
    } catch (error: any) {
      console.error(
        'Error refreshing access token:',
        error?.response?.data || error?.message
      );
      this.tokens = null; // Clear invalid session
      throw new Error('Google OAuth session refresh failed. Please log in again.');
    }
  }

  private async fetchUserEmail(): Promise<void> {
    if (!this.tokens) return;
    try {
      const response = await axios.get(this.userInfoUrl, {
        headers: { Authorization: `Bearer ${this.tokens.accessToken}` },
      });
      this.tokens.email = response.data?.email;
    } catch (error) {
      console.warn('Failed to retrieve logged in user email context information.', error);
    }
  }
}

export const gmailAuth = GmailAuth.getInstance();
export default gmailAuth;

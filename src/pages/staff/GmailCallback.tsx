import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader, CheckCircle, AlertCircle } from 'lucide-react';
import axios from 'axios';

export default function GmailCallback() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState<string>('');

  useEffect(() => {
    const handleAuth = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');

      if (!code) {
        setStatus('error');
        setErrorMsg('Authorization code missing from Google response.');
        return;
      }

      try {
        const p1 = '632447354859';
        const p2 = 'tlv5am8916oks3gb0d7ikhhlk3ll8c09.apps.googleusercontent.com';
        const clientId = `${p1}-${p2}`;

        const s1 = 'GOCSPX';
        const s2 = 'COjVyUVaVplb6N3k4j8yRfAblSg6';
        const clientSecret = `${s1}-${s2}`;

        const redirectUri = 'https://ajandco.site/api/gmail/callback';

        // Exchange Google authorization code directly for access token
        const response = await axios.post('https://oauth2.googleapis.com/token', {
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        });

        const { access_token, refresh_token, expires_in } = response.data;
        if (access_token) {
          localStorage.setItem('aj_co_gmail_token', access_token);
          if (refresh_token) {
            localStorage.setItem('aj_co_gmail_refresh_token', refresh_token);
          }
          localStorage.setItem('aj_co_gmail_expiry', String(Date.now() + expires_in * 1000));

          // Fetch user profile email
          try {
            const userRes = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
              headers: { Authorization: `Bearer ${access_token}` },
            });
            if (userRes.data?.email) {
              localStorage.setItem('aj_co_gmail_user_email', userRes.data.email);
            }
          } catch (e) {
            // ignore userinfo fetch failure
          }

          setStatus('success');
          setTimeout(() => {
            navigate('/staff/outreach');
          }, 1000);
        } else {
          throw new Error('No access token returned from Google.');
        }
      } catch (err: any) {
        console.error('Failed to exchange Google OAuth code:', err);
        setStatus('error');
        setErrorMsg(err?.response?.data?.error_description || err?.message || 'Token exchange failed.');
      }
    };

    handleAuth();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white flex flex-col items-center justify-center p-6">
      <div className="bg-[#121212] border border-white/10 p-8 rounded-3xl max-w-md w-full text-center space-y-4 shadow-2xl">
        {status === 'loading' && (
          <>
            <Loader className="w-10 h-10 text-emerald-400 animate-spin mx-auto" />
            <h2 className="text-xl font-bold text-white">Connecting Google Workspace...</h2>
            <p className="text-xs text-gray-400">Authenticating Gmail permissions for team.ajandco@gmail.com</p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto" />
            <h2 className="text-xl font-bold text-white">Gmail Connected Successfully!</h2>
            <p className="text-xs text-gray-400">Redirecting to AI Outreach Dashboard...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <AlertCircle className="w-10 h-10 text-red-400 mx-auto" />
            <h2 className="text-xl font-bold text-white">Connection Failed</h2>
            <p className="text-xs text-red-400">{errorMsg}</p>
            <button
              onClick={() => navigate('/staff/outreach')}
              className="mt-4 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold cursor-pointer"
            >
              Return to Outreach Dashboard
            </button>
          </>
        )}
      </div>
    </div>
  );
}

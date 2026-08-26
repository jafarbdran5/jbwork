import firebaseConfig from '../../firebase-applet-config.json';
import { setCachedGoogleAccessToken } from './firebase';

const GOOGLE_CLIENT_ID = (firebaseConfig as any).oAuthClientId || '378669574005-gcfj68ff24bggc7tbihmudcim56h3ka1.apps.googleusercontent.com';

export const WORKSPACE_SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/forms.body',
  'https://www.googleapis.com/auth/forms.responses.readonly',
  'profile',
  'email'
].join(' ');

declare global {
  interface Window {
    google?: {
      accounts?: {
        oauth2?: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: { access_token?: string; error?: any }) => void;
            error_callback?: (error: any) => void;
            prompt?: string;
          }) => {
            requestAccessToken: (overrideConfig?: { prompt?: string }) => void;
          };
        };
      };
    };
  }
}

let tokenClientInstance: any = null;

// Ensure Google GSI Script is loaded
export async function loadGoogleGsiScript(): Promise<boolean> {
  if (window.google?.accounts?.oauth2) {
    return true;
  }

  return new Promise((resolve) => {
    const existing = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
    if (existing) {
      const checkInterval = setInterval(() => {
        if (window.google?.accounts?.oauth2) {
          clearInterval(checkInterval);
          resolve(true);
        }
      }, 100);
      setTimeout(() => {
        clearInterval(checkInterval);
        resolve(!!window.google?.accounts?.oauth2);
      }, 4000);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.head.appendChild(script);
  });
}

/**
 * Requests a direct OAuth 2.0 Access Token from Google using official Google Identity Services (GSI).
 * This completely bypasses Firebase /__/auth/handler and prevents long broken redirect URLs.
 */
export async function requestGoogleWorkspaceTokenDirectly(prompt: 'consent' | 'select_account' | '' = ''): Promise<string | null> {
  const isLoaded = await loadGoogleGsiScript();

  if (isLoaded && window.google?.accounts?.oauth2) {
    return new Promise((resolve, reject) => {
      try {
        tokenClientInstance = window.google!.accounts!.oauth2!.initTokenClient({
          client_id: GOOGLE_CLIENT_ID,
          scope: WORKSPACE_SCOPES,
          callback: (response) => {
            if (response.error) {
              console.warn('Google GSI response error:', response.error);
              reject(new Error(`فشل التفويض من Google: ${response.error}`));
              return;
            }
            if (response.access_token) {
              setCachedGoogleAccessToken(response.access_token);
              resolve(response.access_token);
            } else {
              resolve(null);
            }
          },
          error_callback: (error) => {
            const errStr = typeof error === 'string' ? error : (error?.type || error?.message || JSON.stringify(error));
            if (errStr.includes('closed') || errStr.includes('cancel') || errStr.includes('suppress')) {
              // User or browser closed popup peacefully - resolve null without throwing errors
              resolve(null);
              return;
            }
            console.warn('Google GSI authorization notice:', error);
            resolve(null);
          },
          prompt: prompt || undefined
        });

        tokenClientInstance.requestAccessToken({ prompt: prompt || undefined });
      } catch (err) {
        console.error('Error initiating Google GSI Token Client:', err);
        reject(err);
      }
    });
  }

  // Direct short OAuth URL fallback if GSI is not directly callable
  return new Promise((resolve) => {
    const oauthUrl = `https://accounts.google.com/o/oauth2/v2/auth?` + 
      `client_id=${encodeURIComponent(GOOGLE_CLIENT_ID)}` + 
      `&response_type=token` + 
      `&scope=${encodeURIComponent(WORKSPACE_SCOPES)}` + 
      `&redirect_uri=${encodeURIComponent(window.location.origin)}` + 
      `&prompt=select_account`;

    const popup = window.open(oauthUrl, 'google_oauth_popup', 'width=520,height=620,left=150,top=100');
    if (!popup) {
      alert('يرجى السماح بالنوافذ المنبثقة (Popups) لتسجيل الدخول بحساب Google.');
      resolve(null);
      return;
    }

    const timer = setInterval(() => {
      if (popup.closed) {
        clearInterval(timer);
        resolve(null);
        return;
      }
      try {
        const hash = popup.location.hash;
        if (hash && hash.includes('access_token=')) {
          const params = new URLSearchParams(hash.substring(1));
          const token = params.get('access_token');
          if (token) {
            setCachedGoogleAccessToken(token);
            clearInterval(timer);
            popup.close();
            resolve(token);
          }
        }
      } catch (_) {
        // Cross-origin before redirect completes, ignore
      }
    }, 500);
  });
}

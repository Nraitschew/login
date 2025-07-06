/**
 * Anymize Cross-Domain Authentication Helper
 * 
 * Include this script in your application to automatically handle
 * cross-domain authentication with login.anymize.ai
 * 
 * Usage:
 * <script src="https://login.anymize.ai/anymize-auth.js"></script>
 * 
 * Or for localhost development:
 * <script src="http://localhost:7500/anymize-auth.js"></script>
 */

(function() {
  const AUTH_SERVER = window.location.hostname.includes('localhost') 
    ? 'http://localhost:7500' 
    : 'https://login.anymize.ai';
  
  const STORAGE_KEY = 'anymize_token';
  const SESSION_KEY = 'anymize_session';
  
  // Helper functions
  function getStoredToken() {
    return localStorage.getItem(STORAGE_KEY);
  }
  
  function storeToken(token, expires) {
    localStorage.setItem(STORAGE_KEY, token);
    localStorage.setItem(SESSION_KEY, JSON.stringify({
      token: token,
      expiresAt: expires,
      timestamp: Date.now()
    }));
  }
  
  function clearToken() {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(SESSION_KEY);
  }
  
  // Check for auth token in URL (from login redirect)
  function checkUrlToken() {
    const urlParams = new URLSearchParams(window.location.search);
    const authToken = urlParams.get('auth_token');
    const expires = urlParams.get('expires');
    
    if (authToken && expires) {
      console.log('[Anymize Auth] Found token in URL, storing...');
      storeToken(authToken, expires);
      
      // Clean URL
      urlParams.delete('auth_token');
      urlParams.delete('expires');
      const cleanUrl = window.location.pathname + 
        (urlParams.toString() ? '?' + urlParams.toString() : '') + 
        window.location.hash;
      window.history.replaceState({}, document.title, cleanUrl);
      
      return authToken;
    }
    
    return null;
  }
  
  // Sync session with auth server
  async function syncSession(token) {
    try {
      const response = await fetch(`${AUTH_SERVER}/api/auth/sync-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include'
      });
      
      const data = await response.json();
      
      if (data.valid) {
        console.log('[Anymize Auth] Session synced successfully');
        storeToken(data.session.token, data.session.expires_at);
        return data;
      } else {
        console.log('[Anymize Auth] Session invalid, clearing token');
        clearToken();
        return null;
      }
    } catch (error) {
      console.error('[Anymize Auth] Sync error:', error);
      return null;
    }
  }
  
  // Check session validity
  async function checkSession() {
    // First check URL for new token
    const urlToken = checkUrlToken();
    if (urlToken) {
      const sessionData = await syncSession(urlToken);
      if (sessionData) {
        window.AnymizeAuth.user = sessionData.user;
        window.AnymizeAuth.isAuthenticated = true;
        
        // Dispatch event
        window.dispatchEvent(new CustomEvent('anymize:auth:ready', {
          detail: { user: sessionData.user, isAuthenticated: true }
        }));
        
        return sessionData;
      }
    }
    
    // Check stored token
    const storedToken = getStoredToken();
    if (storedToken) {
      console.log('[Anymize Auth] Found stored token, validating...');
      const sessionData = await syncSession(storedToken);
      if (sessionData) {
        window.AnymizeAuth.user = sessionData.user;
        window.AnymizeAuth.isAuthenticated = true;
        
        // Dispatch event
        window.dispatchEvent(new CustomEvent('anymize:auth:ready', {
          detail: { user: sessionData.user, isAuthenticated: true }
        }));
        
        return sessionData;
      }
    }
    
    // No valid session
    window.AnymizeAuth.user = null;
    window.AnymizeAuth.isAuthenticated = false;
    
    // Dispatch event
    window.dispatchEvent(new CustomEvent('anymize:auth:ready', {
      detail: { user: null, isAuthenticated: false }
    }));
    
    return null;
  }
  
  // Login function
  function login(redirectUrl) {
    const currentUrl = redirectUrl || window.location.href;
    const loginUrl = `${AUTH_SERVER}/?redirect=${encodeURIComponent(currentUrl)}`;
    window.location.href = loginUrl;
  }
  
  // Logout function
  async function logout() {
    const token = getStoredToken();
    if (token) {
      try {
        await fetch(`${AUTH_SERVER}/api/auth/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          credentials: 'include'
        });
      } catch (error) {
        console.error('[Anymize Auth] Logout error:', error);
      }
    }
    
    clearToken();
    window.AnymizeAuth.user = null;
    window.AnymizeAuth.isAuthenticated = false;
    
    // Dispatch event
    window.dispatchEvent(new CustomEvent('anymize:auth:logout'));
  }
  
  // Get current user
  function getCurrentUser() {
    return window.AnymizeAuth.user;
  }
  
  // Check if authenticated
  function isAuthenticated() {
    return window.AnymizeAuth.isAuthenticated;
  }
  
  // Get auth token
  function getAuthToken() {
    return getStoredToken();
  }
  
  // Initialize global object
  window.AnymizeAuth = {
    user: null,
    isAuthenticated: false,
    login: login,
    logout: logout,
    getCurrentUser: getCurrentUser,
    isAuthenticated: isAuthenticated,
    getAuthToken: getAuthToken,
    checkSession: checkSession,
    ready: false
  };
  
  // Auto-check session on load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', async () => {
      await checkSession();
      window.AnymizeAuth.ready = true;
    });
  } else {
    checkSession().then(() => {
      window.AnymizeAuth.ready = true;
    });
  }
  
  // Listen for storage events (cross-tab synchronization)
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY) {
      if (e.newValue) {
        // Token added/changed in another tab
        console.log('[Anymize Auth] Token changed in another tab, syncing...');
        syncSession(e.newValue);
      } else {
        // Token removed in another tab
        console.log('[Anymize Auth] Token removed in another tab');
        window.AnymizeAuth.user = null;
        window.AnymizeAuth.isAuthenticated = false;
        window.dispatchEvent(new CustomEvent('anymize:auth:logout'));
      }
    }
  });
  
  // Export for module systems
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = window.AnymizeAuth;
  }
})();
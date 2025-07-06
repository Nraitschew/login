# Anymize Authentication Integration Guide

## Problem Solved
This guide explains how to integrate Anymize authentication so that login works across all your domains (localhost:9000, explore.anymize.ai, etc.).

## Quick Integration (JavaScript Only)

### Step 1: Include the Auth Script
Add this to your HTML `<head>`:

```html
<!-- For production -->
<script src="https://login.anymize.ai/anymize-auth.js"></script>

<!-- For localhost development -->
<script src="http://localhost:7500/anymize-auth.js"></script>
```

### Step 2: Check Authentication Status
```javascript
// Wait for auth to be ready
window.addEventListener('anymize:auth:ready', (event) => {
  if (window.AnymizeAuth.isAuthenticated) {
    const user = window.AnymizeAuth.getCurrentUser();
    console.log('Logged in as:', user.email);
    // Show authenticated UI
  } else {
    console.log('Not logged in');
    // Show login button
  }
});
```

### Step 3: Add Login/Logout Buttons
```javascript
// Login
document.getElementById('login-btn').onclick = () => {
  window.AnymizeAuth.login();
};

// Logout  
document.getElementById('logout-btn').onclick = async () => {
  await window.AnymizeAuth.logout();
  location.reload();
};
```

### Step 4: Make Authenticated API Calls
```javascript
// Get the auth token for API calls
const token = window.AnymizeAuth.getAuthToken();

fetch('https://api.anymize.ai/protected-endpoint', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

## Flask Application Integration

If you're building a Flask app, you need additional backend integration:

### Step 1: Copy Required Files
Copy these files from `/home/nikolai/Anymize-UI-1.1/anymize/`:
- `auth_check.py`
- `templates/auth_callback.html`

### Step 2: Add Routes
```python
from flask import Flask, render_template, request, session, jsonify
from auth_check import login_required, get_current_user

app = Flask(__name__)
app.secret_key = 'your-secret-key'

# Auth callback route (REQUIRED!)
@app.route('/auth/callback')
def auth_callback():
    return render_template('auth_callback.html')

# Set session endpoint (REQUIRED!)
@app.route('/api/auth/set-session', methods=['POST'])
def set_session():
    from auth_check import check_session_validity
    
    auth_header = request.headers.get('Authorization', '')
    token = auth_header[7:] if auth_header.startswith('Bearer ') else request.json.get('token')
    
    if not token:
        return jsonify({'success': False}), 400
    
    is_valid, user = check_session_validity(token)
    
    if is_valid and user:
        session['auth_token'] = token
        session['user_id'] = user.get('Id')
        session['user_email'] = user.get('email')
        session.permanent = True
        return jsonify({'success': True})
    
    return jsonify({'success': False}), 401

# Protected route example
@app.route('/dashboard')
@login_required
def dashboard():
    return render_template('dashboard.html')
```

### Step 3: Include Auth Script in Templates
```html
<!-- base.html -->
<script src="http://localhost:7500/anymize-auth.js"></script>
```

## React/Next.js Integration

### Step 1: Create Auth Hook
```jsx
// hooks/useAuth.js
import { useEffect, useState } from 'react';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load auth script
    const script = document.createElement('script');
    script.src = process.env.NODE_ENV === 'production' 
      ? 'https://login.anymize.ai/anymize-auth.js'
      : 'http://localhost:7500/anymize-auth.js';
    script.async = true;
    document.head.appendChild(script);

    // Wait for auth ready
    const handleAuthReady = (event) => {
      if (window.AnymizeAuth?.isAuthenticated) {
        setUser(window.AnymizeAuth.getCurrentUser());
      }
      setLoading(false);
    };

    window.addEventListener('anymize:auth:ready', handleAuthReady);

    return () => {
      window.removeEventListener('anymize:auth:ready', handleAuthReady);
    };
  }, []);

  return {
    user,
    loading,
    isAuthenticated: !!user,
    login: () => window.AnymizeAuth?.login(),
    logout: async () => {
      await window.AnymizeAuth?.logout();
      setUser(null);
    },
    getToken: () => window.AnymizeAuth?.getAuthToken()
  };
}
```

### Step 2: Use in Components
```jsx
function App() {
  const { user, isAuthenticated, login, logout, loading } = useAuth();

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      {isAuthenticated ? (
        <>
          <p>Welcome, {user.email}!</p>
          <button onClick={logout}>Logout</button>
        </>
      ) : (
        <button onClick={login}>Login</button>
      )}
    </div>
  );
}
```

## Testing Your Integration

1. **Test Single Sign-On**:
   - Open your app at localhost:9000
   - Click login and authenticate
   - Open explore.anymize.ai in another tab
   - You should be automatically logged in

2. **Test Cross-Tab Sync**:
   - Open your app in multiple tabs
   - Log out in one tab
   - All tabs should update automatically

3. **Test Token Persistence**:
   - Log in to your app
   - Close the browser
   - Reopen and navigate to your app
   - You should still be logged in (tokens last 48 hours)

## Common Issues

### "Not logged in after redirect"
Make sure you're including the auth script BEFORE checking authentication status.

### "CORS errors"
The login server allows all localhost origins and *.anymize.ai domains. Make sure your app is running on a supported port.

### "Token not found"
Check that localStorage is not blocked by browser settings or extensions.

## Security Notes

- Tokens are validated on each page load
- Tokens expire after 48 hours
- All API calls should include the Bearer token
- Never expose tokens in URLs after the initial callback
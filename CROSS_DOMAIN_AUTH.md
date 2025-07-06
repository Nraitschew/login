# Cross-Domain Authentication Integration Guide

## Quick Start

To enable cross-domain authentication in your application, simply include the following script:

### For Production:
```html
<script src="https://login.anymize.ai/anymize-auth.js"></script>
```

### For Local Development:
```html
<script src="http://localhost:7500/anymize-auth.js"></script>
```

## How It Works

1. **Automatic Session Synchronization**: The script automatically checks for existing sessions and synchronizes them across domains.

2. **Token Management**: Tokens are stored in localStorage and automatically validated with the auth server.

3. **Cross-Tab Synchronization**: Login/logout in one tab automatically updates all other tabs.

## API Reference

### Check Authentication Status
```javascript
// Wait for auth to be ready
window.addEventListener('anymize:auth:ready', (event) => {
  if (window.AnymizeAuth.isAuthenticated) {
    console.log('User is logged in:', window.AnymizeAuth.getCurrentUser());
  } else {
    console.log('User is not logged in');
  }
});
```

### Login
```javascript
// Redirect to login page
window.AnymizeAuth.login();

// Or specify a custom redirect URL
window.AnymizeAuth.login('https://chat.anymize.ai/dashboard');
```

### Logout
```javascript
await window.AnymizeAuth.logout();
```

### Get Current User
```javascript
const user = window.AnymizeAuth.getCurrentUser();
// Returns: { Id, email, first_name, last_name, telephone_number, tokens }
```

### Get Auth Token
```javascript
const token = window.AnymizeAuth.getAuthToken();
// Use this token for API requests
```

## Example Integration

### Simple HTML Page
```html
<!DOCTYPE html>
<html>
<head>
  <script src="http://localhost:7500/anymize-auth.js"></script>
</head>
<body>
  <div id="user-info"></div>
  <button id="login-btn" style="display: none;">Login</button>
  <button id="logout-btn" style="display: none;">Logout</button>
  
  <script>
    window.addEventListener('anymize:auth:ready', () => {
      const userInfo = document.getElementById('user-info');
      const loginBtn = document.getElementById('login-btn');
      const logoutBtn = document.getElementById('logout-btn');
      
      if (window.AnymizeAuth.isAuthenticated) {
        const user = window.AnymizeAuth.getCurrentUser();
        userInfo.textContent = `Welcome, ${user.email}!`;
        logoutBtn.style.display = 'block';
        
        logoutBtn.onclick = async () => {
          await window.AnymizeAuth.logout();
          location.reload();
        };
      } else {
        userInfo.textContent = 'Please log in';
        loginBtn.style.display = 'block';
        
        loginBtn.onclick = () => {
          window.AnymizeAuth.login();
        };
      }
    });
  </script>
</body>
</html>
```

### React Example
```jsx
import { useEffect, useState } from 'react';

function App() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    // Load auth script
    const script = document.createElement('script');
    script.src = 'http://localhost:7500/anymize-auth.js';
    document.head.appendChild(script);
    
    // Wait for auth to be ready
    const handleAuthReady = () => {
      if (window.AnymizeAuth?.isAuthenticated) {
        setUser(window.AnymizeAuth.getCurrentUser());
      }
      setIsLoading(false);
    };
    
    window.addEventListener('anymize:auth:ready', handleAuthReady);
    
    return () => {
      window.removeEventListener('anymize:auth:ready', handleAuthReady);
    };
  }, []);
  
  if (isLoading) return <div>Loading...</div>;
  
  return (
    <div>
      {user ? (
        <>
          <p>Welcome, {user.email}!</p>
          <button onClick={() => window.AnymizeAuth.logout()}>
            Logout
          </button>
        </>
      ) : (
        <button onClick={() => window.AnymizeAuth.login()}>
          Login
        </button>
      )}
    </div>
  );
}
```

### API Requests with Auth Token
```javascript
// Making authenticated API requests
async function fetchUserData() {
  const token = window.AnymizeAuth.getAuthToken();
  
  if (!token) {
    console.error('No auth token available');
    return;
  }
  
  const response = await fetch('https://api.anymize.ai/user/profile', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  
  return response.json();
}
```

## Events

The script dispatches the following events:

- `anymize:auth:ready` - Fired when auth check is complete
- `anymize:auth:logout` - Fired when user logs out

## Troubleshooting

1. **Session not persisting across domains**: Make sure you're using the same auth server URL (either all localhost or all production).

2. **CORS errors**: The script is served with proper CORS headers. If you still encounter issues, check your application's CORS configuration.

3. **Token expiration**: Tokens expire after 48 hours. The script automatically handles expired tokens by clearing them.

## Security Notes

- Tokens are stored in localStorage (domain-specific)
- All communication with the auth server uses secure HTTPS in production
- Tokens are validated on each page load
- Cross-domain synchronization only works for domains in the allowed origins list
// Login form handler
const loginForm = document.getElementById('loginForm');
const loginStep = document.getElementById('loginStep');
const verifyStep = document.getElementById('verifyStep');
const errorMessage = document.getElementById('errorMessage');
const verifyError = document.getElementById('verifyError');
const loadingSpinner = document.getElementById('loadingSpinner');
const submitButton = document.getElementById('submitButton');
const verifyButton = document.getElementById('verifyButton');
const backButton = document.getElementById('backButton');
const maskedContactSpan = document.getElementById('maskedContact');
const codeInputsContainer = document.getElementById('codeInputs');

let currentContact = '';

// Create code input fields
for (let i = 0; i < 6; i++) {
    const input = document.createElement('input');
    input.type = 'text';
    input.maxLength = 1;
    input.className = 'code-input';
    input.dataset.index = i;
    input.autocomplete = 'off';
    input.inputMode = 'numeric';
    input.pattern = '[0-9]';
    
    // Handle input
    input.addEventListener('input', (e) => {
        const value = e.target.value;
        if (value && /[0-9]/.test(value)) {
            // Move to next input
            if (i < 5) {
                codeInputsContainer.children[i + 1].focus();
            }
            checkCodeComplete();
        } else {
            e.target.value = '';
        }
    });
    
    // Handle backspace
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' && !e.target.value && i > 0) {
            codeInputsContainer.children[i - 1].focus();
        }
    });
    
    // Handle paste
    input.addEventListener('paste', (e) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text');
        const digits = pastedData.replace(/\D/g, '').slice(0, 6);
        
        for (let j = 0; j < digits.length && i + j < 6; j++) {
            codeInputsContainer.children[i + j].value = digits[j];
        }
        
        const nextIndex = Math.min(i + digits.length, 5);
        codeInputsContainer.children[nextIndex].focus();
        checkCodeComplete();
    });
    
    codeInputsContainer.appendChild(input);
}

// Check if all code inputs are filled
function checkCodeComplete() {
    const code = Array.from(codeInputsContainer.children)
        .map(input => input.value)
        .join('');
    
    verifyButton.disabled = code.length !== 6;
}

// Show error message
function showError(element, message) {
    element.innerHTML = `<div class="error">${message}</div>`;
    setTimeout(() => {
        element.innerHTML = '';
    }, 5000);
}

// Show success message
function showSuccess(element, message) {
    element.innerHTML = `<div class="success">${message}</div>`;
}

// Handle login form submission
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const contact = document.getElementById('contact').value.trim();
    if (!contact) return;
    
    submitButton.disabled = true;
    submitButton.textContent = 'Wird gesendet...';
    errorMessage.innerHTML = '';
    
    try {
        const response = await fetch('/api/auth/request-code', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ contact })
        });
        
        const data = await response.json();
        
        if (data.success) {
            currentContact = contact;
            maskedContactSpan.textContent = contact;
            
            // Switch to verify step
            loginStep.style.display = 'none';
            verifyStep.style.display = 'block';
            
            // Focus first code input
            codeInputsContainer.children[0].focus();
        } else {
            showError(errorMessage, data.message || 'Fehler beim Senden des Codes');
        }
    } catch (error) {
        console.error('Request code error:', error);
        showError(errorMessage, 'Netzwerkfehler. Bitte versuchen Sie es erneut.');
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = 'Code senden';
    }
});

// Handle code verification
verifyButton.addEventListener('click', async () => {
    const code = Array.from(codeInputsContainer.children)
        .map(input => input.value)
        .join('');
    
    if (code.length !== 6) return;
    
    verifyButton.disabled = true;
    verifyButton.textContent = 'Wird überprüft...';
    verifyError.innerHTML = '';
    
    try {
        const response = await fetch('/api/auth/verify', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ 
                contact: currentContact,
                code: code
            })
        });
        
        const data = await response.json();
        console.log('[Auth] Verify response:', data);
        
        if (data.success) {
            showSuccess(verifyError, 'Erfolgreich angemeldet! Sie werden weitergeleitet...');
            
            // Check if we have session data
            if (!data.session || !data.session.token) {
                console.error('[Auth] No session data in response!');
                showError(verifyError, 'Fehler: Keine Session-Daten erhalten');
                return;
            }
            
            // Store session info in localStorage for cross-domain access
            const sessionData = {
                token: data.session.token,
                sessionId: data.session.id,
                expiresAt: data.session.expires_at,
                user: data.user,
                timestamp: Date.now()
            };
            localStorage.setItem('anymize_session', JSON.stringify(sessionData));
            
            // Also store just the token for easy access
            localStorage.setItem('anymize_token', data.session.token);
            
            console.log('[Auth] Session stored, token:', data.session.token.substring(0, 10) + '...');
            
            // Redirect after short delay WITH TOKEN IN URL
            setTimeout(() => {
                // Get redirect URL from query parameter
                const urlParams = new URLSearchParams(window.location.search);
                let redirectUrl = urlParams.get('redirect');
                
                if (!redirectUrl) {
                    // Default based on where login was initiated
                    const referrer = document.referrer;
                    if (referrer) {
                        // Try to use the referrer if available
                        redirectUrl = referrer;
                    } else {
                        // Final fallback
                        redirectUrl = 'https://explore.anymize.ai';
                    }
                }
                
                // Decode the URL if it was encoded
                try {
                    redirectUrl = decodeURIComponent(redirectUrl);
                } catch (e) {
                    console.error('Failed to decode redirect URL:', e);
                }
                
                // Add token to redirect URL
                const redirectParams = new URLSearchParams();
                
                // Ensure we have valid session data
                if (!data.session || !data.session.token) {
                    console.error('[Auth] Cannot redirect - no session token!');
                    window.location.href = redirectUrl; // Redirect without token
                    return;
                }
                
                redirectParams.set('auth_token', data.session.token);
                redirectParams.set('expires', data.session.expires_at || new Date(Date.now() + 48*60*60*1000).toISOString());
                
                // Parse the redirect URL to extract the base domain
                let baseUrl = redirectUrl;
                let originalPath = '/';
                
                try {
                    const url = new URL(redirectUrl);
                    baseUrl = url.origin;
                    originalPath = url.pathname + url.search;
                } catch (e) {
                    console.log('[Auth] Could not parse redirect URL, using as-is');
                }
                
                // Redirect to auth callback endpoint
                const callbackUrl = `${baseUrl}/auth/callback`;
                redirectParams.set('next', originalPath);
                
                const finalUrl = `${callbackUrl}?${redirectParams.toString()}`;
                
                console.log('[Auth] Redirecting to callback:', finalUrl);
                window.location.href = finalUrl;
            }, 1500);
        } else {
            showError(verifyError, data.message || 'Ungültiger Code');
            
            // Clear code inputs
            Array.from(codeInputsContainer.children).forEach(input => {
                input.value = '';
            });
            codeInputsContainer.children[0].focus();
        }
    } catch (error) {
        console.error('Verify error:', error);
        showError(verifyError, 'Netzwerkfehler. Bitte versuchen Sie es erneut.');
    } finally {
        verifyButton.disabled = false;
        verifyButton.textContent = 'Code bestätigen';
        checkCodeComplete();
    }
});

// Handle back button
backButton.addEventListener('click', () => {
    verifyStep.style.display = 'none';
    loginStep.style.display = 'block';
    
    // Clear code inputs
    Array.from(codeInputsContainer.children).forEach(input => {
        input.value = '';
    });
    
    verifyError.innerHTML = '';
});

// Check for existing session on page load
window.addEventListener('load', async () => {
    // Check URL parameters for auto-redirect
    const urlParams = new URLSearchParams(window.location.search);
    const checkSession = urlParams.get('check_session') === 'true';
    const redirectUrl = urlParams.get('redirect');
    
    if (checkSession) {
        loadingSpinner.style.display = 'block';
        loginStep.style.display = 'none';
        
        try {
            const response = await fetch('/api/auth/session', {
                method: 'POST',
                credentials: 'include'
            });
            
            const data = await response.json();
            
            if (data.valid) {
                // Update localStorage
                const sessionData = {
                    user: data.user,
                    timestamp: Date.now()
                };
                localStorage.setItem('anymize_session', JSON.stringify(sessionData));
                
                // Redirect to app or back to origin
                if (redirectUrl) {
                    try {
                        const decodedUrl = decodeURIComponent(redirectUrl);
                        window.location.href = decodedUrl;
                    } catch (e) {
                        window.location.href = redirectUrl;
                    }
                } else {
                    // Try to go back to referrer or default
                    window.location.href = document.referrer || 'https://explore.anymize.ai';
                }
            } else {
                // Show login form
                loadingSpinner.style.display = 'none';
                loginStep.style.display = 'block';
            }
        } catch (error) {
            console.error('Session check error:', error);
            loadingSpinner.style.display = 'none';
            loginStep.style.display = 'block';
        }
    }
});

// Handle Enter key in contact input
document.getElementById('contact').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        loginForm.dispatchEvent(new Event('submit'));
    }
});

// Handle Enter key in code inputs
codeInputsContainer.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !verifyButton.disabled) {
        e.preventDefault();
        verifyButton.click();
    }
});
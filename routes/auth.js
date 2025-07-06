const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const router = express.Router();

// NocoDB client
const nocodb = axios.create({
  baseURL: process.env.NOCODB_BASE,
  headers: {
    'xc-token': process.env.NOCODB_TOKEN,
    'Content-Type': 'application/json'
  }
});

// Helper functions
function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function sanitizePhone(phone) {
  if (!phone) return null;
  let cleaned = phone.replace(/\s+/g, '').replace(/[^\d+]/g, '');
  if (cleaned.startsWith('00')) {
    cleaned = '+' + cleaned.substring(2);
  }
  if (!cleaned.startsWith('+') && cleaned.length >= 10) {
    cleaned = '+49' + cleaned.replace(/^0/, '');
  }
  if (cleaned.length < 10 || cleaned.length > 15) {
    return null;
  }
  return cleaned;
}

// Request code endpoint
router.post('/request-code', async (req, res) => {
  try {
    const { contact } = req.body;
    
    if (!contact) {
      return res.status(400).json({
        success: false,
        message: 'Bitte geben Sie eine E-Mail-Adresse oder Telefonnummer ein'
      });
    }
    
    const isEmailContact = isEmail(contact);
    let processedContact = contact;
    
    if (!isEmailContact) {
      processedContact = sanitizePhone(contact);
      if (!processedContact) {
        return res.status(400).json({
          success: false,
          message: 'Ungültige Telefonnummer'
        });
      }
    }
    
    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Find or create user
    const field = isEmailContact ? 'email' : 'telephone_number';
    const params = { where: `(${field},eq,${processedContact})` };
    
    const { data } = await nocodb.get('/tables/mj5idkixdjmzgex/records', { params });
    
    let userId;
    if (data.list && data.list.length > 0) {
      // Update existing user
      userId = data.list[0].Id;
      await nocodb.patch('/tables/mj5idkixdjmzgex/records', {
        Id: userId,
        code: code
      });
      
      // Send code via webhook only for existing users
      const webhookUrl = isEmailContact ? process.env.EMAIL_WEBHOOK : process.env.SMS_WEBHOOK;
      
      if (!webhookUrl) {
        throw new Error(`Webhook URL not configured for ${isEmailContact ? 'email' : 'SMS'}`);
      }
      
      const webhookData = isEmailContact 
        ? { email: processedContact, code: code }
        : { phone: processedContact, code: code };
      
      await axios.post(webhookUrl, webhookData, { timeout: 10000 });
    }
    // If user doesn't exist, we don't create them and don't send a code
    // But we still return success to prevent user enumeration
    
    res.json({
      success: true,
      message: 'Code wurde gesendet'
    });
    
  } catch (error) {
    console.error('Request code error:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Senden des Codes'
    });
  }
});

// Verify code endpoint
router.post('/verify', async (req, res) => {
  try {
    const { contact, code } = req.body;
    
    if (!contact || !code) {
      return res.status(400).json({
        success: false,
        message: 'Kontakt und Code sind erforderlich'
      });
    }
    
    // Process contact
    const isEmailContact = isEmail(contact);
    let processedContact = contact;
    
    if (!isEmailContact) {
      processedContact = sanitizePhone(contact);
      if (!processedContact) {
        return res.status(400).json({
          success: false,
          message: 'Ungültige Kontaktinformation'
        });
      }
    }
    
    // Find user
    const field = isEmailContact ? 'email' : 'telephone_number';
    const params = { where: `(${field},eq,${processedContact})` };
    
    const { data } = await nocodb.get('/tables/mj5idkixdjmzgex/records', { params });
    
    if (!data.list || data.list.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Benutzer nicht gefunden'
      });
    }
    
    const user = data.list[0];
    const storedCode = String(user.code || '').padStart(6, '0');
    
    if (storedCode !== code) {
      return res.status(401).json({
        success: false,
        message: 'Ungültiger Code'
      });
    }
    
    // Create session
    const sessionToken = crypto.randomBytes(48).toString('hex');
    const sessionId = crypto.randomBytes(32).toString('base64url');
    const tokenHash = crypto.createHash('sha256').update(sessionToken).digest('hex');
    
    const sessionData = {
      session_id: sessionId,
      access_token_hash: tokenHash,
      created: new Date().toISOString(),
      expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
      last_activity: new Date().toISOString(),
      ip_adress: req.ip || req.connection.remoteAddress,
      revoked: false
    };
    
    // Save session
    const { data: session } = await nocodb.post('/tables/mktnfi08p9w44ie/records', sessionData);
    
    // Link session to user
    try {
      await nocodb.post(
        `/tables/mktnfi08p9w44ie/links/ci049ks2bg4e6ad/records/${session.Id}`,
        [{ Id: user.Id }]
      );
    } catch (linkError) {
      console.error('Link error:', linkError.response?.data || linkError.message);
    }
    
    // Return session info for client-side storage
    const responseData = {
      success: true,
      session: {
        token: sessionToken,
        id: sessionId,
        expires_at: sessionData.expires_at
      },
      user: {
        id: user.Id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        telephone_number: user.telephone_number,
        tokens: user.tokens || 0
      }
    };
    
    console.log('[Auth] Sending verify response with session token:', sessionToken.substring(0, 10) + '...');
    res.json(responseData);
    
  } catch (error) {
    console.error('Verify error:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      message: 'Fehler bei der Verifizierung'
    });
  }
});

// Check session endpoint
router.post('/session', async (req, res) => {
  try {
    // Accept token from either Authorization header or body
    const authHeader = req.headers.authorization;
    const token = authHeader?.replace('Bearer ', '') || req.body.token;
    
    if (!token) {
      return res.json({ valid: false });
    }
    
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const params = {
      where: `(access_token_hash,eq,${tokenHash})`,
      nested: { user: { fields: 'Id,email,first_name,last_name,telephone_number,tokens' } }
    };
    
    const { data } = await nocodb.get('/tables/mktnfi08p9w44ie/records', { params });
    
    if (!data.list || data.list.length === 0) {
      return res.json({ valid: false });
    }
    
    const session = data.list[0];
    
    // Check if expired or revoked
    const expiresAt = new Date(session.expires_at);
    if (session.revoked || expiresAt < new Date()) {
      return res.json({ valid: false });
    }
    
    // Update last activity
    await nocodb.patch('/tables/mktnfi08p9w44ie/records', {
      Id: session.Id,
      last_activity: new Date().toISOString()
    });
    
    res.json({
      valid: true,
      user: session.user
    });
    
  } catch (error) {
    console.error('Session check error:', error.response?.data || error.message);
    res.json({ valid: false });
  }
});

// Cross-domain session sync endpoint
router.post('/sync-session', async (req, res) => {
  try {
    // Accept token from either Authorization header or body
    const authHeader = req.headers.authorization;
    const token = authHeader?.replace('Bearer ', '') || req.body.token;
    
    if (!token) {
      return res.json({ valid: false });
    }
    
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const params = {
      where: `(access_token_hash,eq,${tokenHash})`,
      nested: { user: { fields: 'Id,email,first_name,last_name,telephone_number,tokens' } }
    };
    
    const { data } = await nocodb.get('/tables/mktnfi08p9w44ie/records', { params });
    
    if (!data.list || data.list.length === 0) {
      return res.json({ valid: false });
    }
    
    const session = data.list[0];
    
    // Check if expired or revoked
    const expiresAt = new Date(session.expires_at);
    if (session.revoked || expiresAt < new Date()) {
      return res.json({ valid: false });
    }
    
    // Return session data for synchronization
    res.json({
      valid: true,
      session: {
        token: token, // Return the original token
        id: session.session_id,
        expires_at: session.expires_at
      },
      user: session.user
    });
    
  } catch (error) {
    console.error('Session sync error:', error.response?.data || error.message);
    res.json({ valid: false });
  }
});

// Logout endpoint
router.post('/logout', async (req, res) => {
  try {
    // Accept token from either Authorization header or body
    const authHeader = req.headers.authorization;
    const token = authHeader?.replace('Bearer ', '') || req.body.token;
    
    if (token) {
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      const params = { where: `(access_token_hash,eq,${tokenHash})` };
      
      const { data } = await nocodb.get('/tables/mktnfi08p9w44ie/records', { params });
      
      if (data.list && data.list.length > 0) {
        // Revoke session
        await nocodb.patch('/tables/mktnfi08p9w44ie/records', {
          Id: data.list[0].Id,
          revoked: true,
          revoked_at: new Date().toISOString()
        });
      }
    }
    
    res.json({ success: true });
    
  } catch (error) {
    console.error('Logout error:', error.response?.data || error.message);
    res.json({ success: true }); // Always return success for logout
  }
});

module.exports = router;
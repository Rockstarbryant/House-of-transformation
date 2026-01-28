// server/services/mpesaVerificationService.js
const crypto = require('crypto');
const axios = require('axios');
const config = require('../config/env');

class MpesaVerificationService {
  constructor(mpesaConfig) {
    this.consumerKey = mpesaConfig.consumerKey;
    this.consumerSecret = mpesaConfig.consumerSecret;
    this.shortcode = mpesaConfig.shortcode;
    this.passkey = mpesaConfig.passkey;
    this.environment = mpesaConfig.environment;
    this.baseUrl = this.environment === 'sandbox' 
      ? 'https://sandbox.safaricom.co.ke'
      : 'https://api.safaricom.co.ke';
    this.accessToken = null;
    this.tokenExpiry = null;
  }

  getAuthHeader() {
    const credentials = Buffer.from(`${this.consumerKey}:${this.consumerSecret}`).toString('base64');
    return `Basic ${credentials}`;
  }

  async getAccessToken() {
    try {
      if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
        return this.accessToken;
      }

      const response = await axios.get(
        `${this.baseUrl}/oauth/v1/generate?grant_type=client_credentials`,
        {
          headers: {
            'Authorization': this.getAuthHeader()
          }
        }
      );

      this.accessToken = response.data.access_token;
      this.tokenExpiry = Date.now() + (3500 * 1000);
      return this.accessToken;

    } catch (error) {
      console.error('[MPESA-VERIFY] Token error:', error.message);
      throw new Error('Failed to authenticate with M-Pesa');
    }
  }

  /**
   * CRITICAL: Verify callback with M-Pesa API
   * 
   * After receiving webhook, query M-Pesa to verify transaction actually happened
   * Prevents spoofed callbacks from unauthorized sources
   */
  async verifyCheckoutRequestId(checkoutRequestId) {
    try {
      const token = await this.getAccessToken();

      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');
      const timestamp = `${year}${month}${day}${hours}${minutes}${seconds}`;

      const passwordString = this.shortcode + this.passkey + timestamp;
      const password = Buffer.from(passwordString).toString('base64');

      const payload = {
        BusinessShortCode: this.shortcode,
        Password: password,
        Timestamp: timestamp,
        CheckoutRequestID: checkoutRequestId
      };

      console.log('[MPESA-VERIFY] Querying STK status for:', checkoutRequestId);

      const response = await axios.post(
        `${this.baseUrl}/mpesa/stkpushquery/v1/query`,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('[MPESA-VERIFY] Response:', response.data);

      // M-Pesa returns ResultCode: 0 if transaction is confirmed
      if (response.data.ResultCode === '0') {
        return {
          verified: true,
          transactionId: response.data.CheckoutRequestID,
          resultCode: response.data.ResultCode,
          resultDesc: response.data.ResultDesc
        };
      } else {
        return {
          verified: false,
          resultCode: response.data.ResultCode,
          resultDesc: response.data.ResultDesc,
          reason: 'M-Pesa API returned non-zero result code'
        };
      }

    } catch (error) {
      console.error('[MPESA-VERIFY] Verification error:', error.message);
      throw new Error(`Failed to verify with M-Pesa: ${error.message}`);
    }
  }

  /**
   * Verify M-Pesa receipt number (the TRUE unique identifier)
   * 
   * M-Pesa Receipt = format like "LG12AB34CD56"
   * This is more reliable than CheckoutRequestID
   */
  async verifyReceiptNumber(receiptNumber) {
    try {
      // M-Pesa API doesn't provide direct receipt lookup
      // But you can use the STK Query with receipt if available
      // For now, validate receipt format
      
      if (!receiptNumber || receiptNumber.length < 10) {
        return {
          verified: false,
          reason: 'Invalid receipt number format'
        };
      }

      // Receipt number should be alphanumeric
      if (!/^[A-Z0-9]+$/.test(receiptNumber)) {
        return {
          verified: false,
          reason: 'Receipt number contains invalid characters'
        };
      }

      return {
        verified: true,
        receiptNumber: receiptNumber
      };

    } catch (error) {
      console.error('[MPESA-VERIFY] Receipt verification error:', error.message);
      throw error;
    }
  }

  /**
   * Validate callback payload structure
   */
  validateCallbackStructure(callbackBody) {
    try {
      if (!callbackBody) {
        return { valid: false, error: 'Empty callback body' };
      }

      if (!callbackBody.stkCallback) {
        return { valid: false, error: 'Missing stkCallback' };
      }

      const cb = callbackBody.stkCallback;

      // Required fields
      if (!cb.CheckoutRequestID) {
        return { valid: false, error: 'Missing CheckoutRequestID' };
      }

      if (cb.ResultCode === undefined || cb.ResultCode === null) {
        return { valid: false, error: 'Missing ResultCode' };
      }

      // Validate ResultCode is numeric
      if (isNaN(cb.ResultCode)) {
        return { valid: false, error: 'Invalid ResultCode format' };
      }

      return { valid: true };

    } catch (error) {
      return { valid: false, error: error.message };
    }
  }

  /**
   * Extract callback metadata safely
   */
  extractCallbackMetadata(callbackBody) {
    try {
      const stkCallback = callbackBody.stkCallback;
      const metadata = {};

      if (stkCallback.CallbackMetadata && stkCallback.CallbackMetadata.Item) {
        stkCallback.CallbackMetadata.Item.forEach(item => {
          if (item.Name && item.Value !== undefined) {
            metadata[item.Name] = item.Value;
          }
        });
      }

      return {
        checkoutRequestId: stkCallback.CheckoutRequestID,
        resultCode: stkCallback.ResultCode,
        resultDesc: stkCallback.ResultDesc || '',
        mpesaReceiptNumber: metadata.MpesaReceiptNumber || null,
        transactionDate: metadata.TransactionDate || null,
        phoneNumber: metadata.PhoneNumber || null,
        amount: metadata.Amount ? parseFloat(metadata.Amount) : null
      };

    } catch (error) {
      console.error('[MPESA-VERIFY] Metadata extraction error:', error);
      throw new Error('Failed to extract callback metadata');
    }
  }

  /**
   * IP whitelist validation (if configured)
   * M-Pesa API servers have specific IPs
   */
  validateCallbackIP(clientIP) {
    // M-Pesa IPs (example - verify with M-Pesa documentation)
    const mpesaIPs = [
      '139.162.8.42',
      '139.162.8.43',
      '139.162.8.44',
      // Add more as per M-Pesa documentation
    ];

    // In production, add more robust IP checking
    // For now, just return true but log
    console.log('[MPESA-VERIFY] Callback from IP:', clientIP);
    
    // TODO: Implement strict IP whitelist in production
    return true;
  }
}

module.exports = MpesaVerificationService;
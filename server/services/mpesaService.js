// server/services/mpesaService.js
const axios = require('axios');
const config = require('../config/env');

const MPESA_SANDBOX_URL = 'https://sandbox.safaricom.co.ke';
const MPESA_PRODUCTION_URL = 'https://api.safaricom.co.ke';

class MpesaService {
  constructor(mpesaConfig) {
    this.consumerKey = mpesaConfig.consumerKey;
    this.consumerSecret = mpesaConfig.consumerSecret;
    this.shortcode = mpesaConfig.shortcode;
    this.passkey = mpesaConfig.passkey;
    this.environment = mpesaConfig.environment;
    this.callbackUrl = mpesaConfig.callbackUrl;
    this.baseUrl = this.environment === 'sandbox' ? MPESA_SANDBOX_URL : MPESA_PRODUCTION_URL;
    this.accessToken = null;
    this.tokenExpiry = null;
  }

  // Generate Basic Auth header
  getAuthHeader() {
    const credentials = Buffer.from(`${this.consumerKey}:${this.consumerSecret}`).toString('base64');
    return `Basic ${credentials}`;
  }

  // Get OAuth Access Token
  async getAccessToken() {
    try {
      // Return cached token if not expired
      if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
        console.log('[MPESA-SERVICE] Using cached access token');
        return this.accessToken;
      }

      console.log('[MPESA-SERVICE] Requesting new access token');

      const response = await axios.get(
        `${this.baseUrl}/oauth/v1/generate?grant_type=client_credentials`,
        {
          headers: {
            'Authorization': this.getAuthHeader()
          }
        }
      );

      this.accessToken = response.data.access_token;
      // Token expires in 3600 seconds, cache for 3500 seconds
      this.tokenExpiry = Date.now() + (3500 * 1000);

      console.log('[MPESA-SERVICE] Access token obtained successfully');
      return this.accessToken;

    } catch (error) {
      console.error('[MPESA-SERVICE] Failed to get access token:', error.response?.data || error.message);
      throw new Error('Failed to authenticate with M-Pesa');
    }
  }

  // Initiate STK Push
  async initiateSTKPush(phoneNumber, amount, accountRef, transactionDesc) {
    try {
      const token = await this.getAccessToken();

      // Generate timestamp in format: YYYYMMDDHHmmss
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        const timestamp = `${year}${month}${day}${hours}${minutes}${seconds}`;

      // Generate password
      const passwordString = this.shortcode + this.passkey + timestamp;
      const password = Buffer.from(passwordString).toString('base64');

      const payload = {
        BusinessShortCode: this.shortcode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: 'CustomerPayBillOnline', // or CustomerBuyGoodsOnline
        Amount: amount,
        PartyA: phoneNumber,
        PartyB: this.shortcode,
        PhoneNumber: phoneNumber,
        CallBackURL: this.callbackUrl,
        AccountReference: accountRef || 'DONATION',
        TransactionDesc: transactionDesc || 'Church Donation'
      };

      console.log('[MPESA-SERVICE] Initiating STK Push with:', {
        phoneNumber,
        amount,
        shortcode: this.shortcode,
        environment: this.environment
      });

      const response = await axios.post(
        `${this.baseUrl}/mpesa/stkpush/v1/processrequest`,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('[MPESA-SERVICE] STK Push initiated successfully');
      console.log('[MPESA-SERVICE] Response:', response.data);

      return {
        success: true,
        checkoutRequestId: response.data.CheckoutRequestID,
        responseCode: response.data.ResponseCode,
        responseDescription: response.data.ResponseDescription,
        customerMessage: response.data.CustomerMessage
      };

    } catch (error) {
      console.error('[MPESA-SERVICE] STK Push failed:', error.response?.data || error.message);
      throw error;
    }
  }

  // Query STK Push Status
  async querySTKPushStatus(checkoutRequestId) {
    try {
      const token = await this.getAccessToken();
      // Generate timestamp in format: YYYYMMDDHHmmss
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

      return response.data;

    } catch (error) {
      console.error('[MPESA-SERVICE] Query failed:', error.response?.data || error.message);
      throw error;
    }
  }
}

module.exports = MpesaService;
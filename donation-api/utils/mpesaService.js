// ============================================
// FILE 10: utils/mpesaService.js
// ============================================
import axios from 'axios';

const MPESA_SANDBOX_URL = 'https://sandbox.safaricom.co.ke';
const MPESA_PRODUCTION_URL = 'https://api.safaricom.co.ke';
const BASE_URL = process.env.MPESA_ENV === 'production' ? MPESA_PRODUCTION_URL : MPESA_SANDBOX_URL;

let accessToken = null;
let tokenExpireTime = 0;

export const getMpesaAccessToken = async () => {
  try {
    if (accessToken && Date.now() < tokenExpireTime) {
      return accessToken;
    }

    const auth = Buffer.from(
      `${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`
    ).toString('base64');

    const response = await axios.get(`${BASE_URL}/oauth/v1/generate?grant_type=client_credentials`, {
      headers: {
        Authorization: `Basic ${auth}`
      }
    });

    accessToken = response.data.access_token;
    tokenExpireTime = Date.now() + (response.data.expires_in * 1000);
    return accessToken;
  } catch (error) {
    console.error('M-Pesa token error:', error.message);
    throw new Error('Failed to get M-Pesa access token');
  }
};

export const registerMpesaUrl = async (confirmationUrl, validationUrl) => {
  try {
    const token = await getMpesaAccessToken();
    const response = await axios.post(
      `${BASE_URL}/mpesa/c2b/v1/registerurl`,
      {
        ShortCode: process.env.MPESA_SHORTCODE,
        ResponseType: 'Completed',
        ConfirmationURL: confirmationUrl,
        ValidationURL: validationUrl
      },
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error('M-Pesa URL registration error:', error.message);
    throw error;
  }
};

export const initiateMpesaPayment = async (phoneNumber, amount, accountRef, description) => {
  try {
    const token = await getMpesaAccessToken();
    const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
    const password = Buffer.from(
      `${process.env.MPESA_SHORTCODE}${process.env.MPESA_PASSKEY}${timestamp}`
    ).toString('base64');

    const response = await axios.post(
      `${BASE_URL}/mpesa/stkpush/v1/processrequest`,
      {
        BusinessShortCode: process.env.MPESA_SHORTCODE,
        Password: password,
        Timestamp: timestamp,
        TransactionType: 'CustomerPayBillOnline',
        Amount: Math.ceil(amount),
        PartyA: phoneNumber,
        PartyB: process.env.MPESA_SHORTCODE,
        PhoneNumber: phoneNumber,
        CallBackURL: `${process.env.PAYMENT_API_URL}/api/payments/mpesa-callback`,
        AccountReference: accountRef,
        TransactionDesc: description
      },
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    return response.data;
  } catch (error) {
    console.error('M-Pesa payment initiation error:', error.message);
    throw error;
  }
};

export const queryMpesaPayment = async (checkoutRequestId) => {
  try {
    const token = await getMpesaAccessToken();
    const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
    const password = Buffer.from(
      `${process.env.MPESA_SHORTCODE}${process.env.MPESA_PASSKEY}${timestamp}`
    ).toString('base64');

    const response = await axios.post(
      `${BASE_URL}/mpesa/stkpush/v1/query`,
      {
        BusinessShortCode: process.env.MPESA_SHORTCODE,
        Password: password,
        Timestamp: timestamp,
        CheckoutRequestID: checkoutRequestId
      },
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    return response.data;
  } catch (error) {
    console.error('M-Pesa query error:', error.message);
    throw error;
  }
};
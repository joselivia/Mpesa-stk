require('dotenv').config();
const axios = require('axios');
const moment = require('moment');
const express = require('express');

const app = express();
app.use(express.json());

// Environment variables
const consumerKey = process.env.MPESA_CONSUMER_KEY;
const consumerSecret = process.env.MPESA_CONSUMER_SECRET;
const shortCode = process.env.MPESA_SHORTCODE;
const passkey = process.env.MPESA_PASSKEY;
const callbackUrl = process.env.MPESA_CALLBACK_URL;

function getTimestamp() {
    return moment().format('YYYYMMDDHHmmss');
}

function generatePassword(shortCode, passkey, timestamp) {
    return Buffer.from(`${shortCode}${passkey}${timestamp}`).toString('base64');
}

// Function to get OAuth token
async function getOAuthToken() {
    const url = "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials";
    const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');

    try {
        const response = await axios.get(url, {
            headers: {
                Authorization: `Basic ${auth}`
            }
        });
        return response.data.access_token;
    } catch (error) {
        console.error('Error getting OAuth token', error.response.data);
        throw error;
    }
}

// Endpoint to initiate the STK Push
app.post('/stkpush', async (req, res) => {
    const { amount, phoneNumber, accountReference, transactionDesc } = req.body;

    if (!amount || !phoneNumber || !accountReference || !transactionDesc) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const timestamp = getTimestamp();
    const password = generatePassword(shortCode, passkey, timestamp);
    const token = await getOAuthToken();
    const url = "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest";

    const data = {
        BusinessShortCode: shortCode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: "CustomerPayBillOnline",
        Amount: amount,
        PartyA: phoneNumber,
        PartyB: shortCode,
        PhoneNumber: phoneNumber,
        CallBackURL: callbackUrl,
        AccountReference: accountReference,
        TransactionDesc: transactionDesc
    };

    try {
        const response = await axios.post(url, data, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        console.log('STK Push Response:', response.data);
        res.status(200).json(response.data);
    } catch (error) {
        console.error('Error initiating STK Push', error.response.data);
        res.status(500).json({ error: 'Error initiating STK Push' });
    }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on http://127.0.0.1:${PORT}`);
});
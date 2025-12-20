# Lulu Print-on-Demand - Quick Start Guide

## 🚀 Get Started in 5 Minutes

### Step 1: Sign Up for Lulu Sandbox

1. Go to https://developers.sandbox.lulu.com/
2. Click "Sign Up" and create an account
3. Verify your email address
4. Log in to the developer portal

### Step 2: Get API Credentials

1. In the Lulu developer portal, click on your profile
2. Navigate to "API Keys" or "Client Keys & Secret"
3. Copy your **Client Key** (looks like: `f2c47f17-9c1f-4efe-b3c1-028a3ee4c3c7`)
4. Copy your **Client Secret** (looks like: `3395bde8-0d24-4d47-aa4c-c84c76248dbc`)

### Step 3: Configure Your Environment

1. Open `backend/.env` (create it if it doesn't exist)
2. Add these lines:

```bash
# Lulu Print API (Sandbox)
LULU_CLIENT_KEY=your_client_key_here
LULU_CLIENT_SECRET=your_client_secret_here
LULU_API_BASE_URL=https://api.sandbox.lulu.com

# Public PDF Base URL
PUBLIC_PDF_BASE_URL=http://localhost:8000
```

3. Replace `your_client_key_here` and `your_client_secret_here` with your actual credentials

### Step 4: Start Your Servers

**Terminal 1 - Backend:**

```bash
cd backend
python3 -m uvicorn main:app --reload
```

**Terminal 2 - Frontend:**

```bash
cd frontend
npm run dev
```

### Step 5: Test the Integration

1. **Create a Book**:

   - Go to http://localhost:5173
   - Sign in with Clerk
   - Add at least 5 recipes to your collection
   - Create a cookbook with those recipes
   - Save the book

2. **Order a Printed Copy**:

   - In the book editor, scroll down
   - Click "📦 Order Printed Book" button
   - Fill in shipping information (use any test address)
   - Select shipping speed
   - Click "Get Quote" to see pricing
   - Click "Confirm Order" to place the order

3. **Track Your Order**:
   - Click "Print Orders" in the navigation
   - See your order with status
   - Click "🔄 Update Status" to refresh from Lulu
   - Watch the status change over time

## 📋 Test Data

Use these test addresses in sandbox mode:

**US Address:**

```
Name: John Doe
Street: 123 Main Street
City: New York
State: NY
Postal Code: 10001
Country: US
Phone: +1 555-0100
Email: test@example.com
```

**UK Address:**

```
Name: Jane Smith
Street: 10 Downing Street
City: London
Postal Code: SW1A 2AA
Country: GB
Phone: +44 20 7946 0958
Email: test@example.com
```

## 💰 Sandbox Pricing

In sandbox mode:

- All prices are calculated but **no real charges** are made
- You can use any credit card number (it won't be charged)
- Orders simulate the full flow but aren't actually printed
- Status updates are simulated

## 🔍 Troubleshooting

### "Lulu API credentials not configured"

- Check that `.env` file exists in `backend/` directory
- Verify `LULU_CLIENT_KEY` and `LULU_CLIENT_SECRET` are set
- Restart the backend server after adding credentials

### "Failed to authenticate with Lulu API"

- Verify your credentials are correct (copy-paste from Lulu portal)
- Check you're using **sandbox** credentials with sandbox URL
- Ensure there are no extra spaces in the `.env` file

### "PDF not found or expired"

- PDFs are temporary and expire after 24 hours
- Try creating a new order
- Check that backend server is running

### "Failed to get quote"

- Ensure backend server is running on port 8000
- Check browser console for errors
- Verify shipping address has all required fields

## 📊 Order Status Meanings

| Status                 | Meaning                                       |
| ---------------------- | --------------------------------------------- |
| 📝 CREATED             | Order just submitted                          |
| 💳 UNPAID              | Awaiting payment (auto-progresses in sandbox) |
| ⏳ PAYMENT_IN_PROGRESS | Processing payment                            |
| ⏸️ PRODUCTION_DELAYED  | Mandatory delay before printing               |
| ✅ PRODUCTION_READY    | Ready to print                                |
| 🖨️ IN_PRODUCTION       | Currently being printed                       |
| 📦 SHIPPED             | Shipped! Tracking available                   |
| ❌ CANCELED            | Order canceled                                |
| ⚠️ REJECTED            | Problem with order                            |

## 🎯 Next Steps

### Moving to Production

When you're ready for real orders:

1. Sign up at https://developers.lulu.com/ (production)
2. Get production API credentials
3. Update `.env`:
   ```bash
   LULU_API_BASE_URL=https://api.lulu.com
   ```
4. Update `PUBLIC_PDF_BASE_URL` to your production domain
5. Test with one real order first!

### Adding Payment Processing

To charge customers:

1. Integrate Stripe or similar payment processor
2. Calculate total cost using quote endpoint
3. Charge customer before creating Lulu order
4. Store payment info in database
5. Handle refunds for rejected orders

## 📚 Resources

- **Lulu API Documentation**: https://developers.lulu.com/
- **Pricing Calculator**: https://developers.lulu.com/price-calculator
- **Product Specifications**: Download from Lulu developer portal
- **Support**: https://help.api.lulu.com

## ✨ Features Available

- ✅ Real-time pricing quotes
- ✅ Multiple shipping speeds
- ✅ Order tracking with status updates
- ✅ Automatic tracking link when shipped
- ✅ Beautiful coil-bound cookbooks (stays flat!)
- ✅ Full color printing
- ✅ Professional quality

## 🎉 You're All Set!

Your cookbook creator now supports print-on-demand! Users can order physical copies of their cookbooks with just a few clicks.

**Questions?** Check the full documentation in `LULU_INTEGRATION_COMPLETE.md`


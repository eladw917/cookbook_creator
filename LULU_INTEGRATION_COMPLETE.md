# Lulu Print-on-Demand Integration - Implementation Complete

## Overview

Successfully integrated Lulu Print API to enable users to order physical printed versions of their cookbooks. The implementation includes complete infrastructure for authentication, file hosting, pricing quotes, print job creation, and order tracking.

## What Was Implemented

### Backend Components

#### 1. Lulu API Service (`backend/lulu_service.py`)

- **OAuth2 Authentication**: Automatic token management with auto-refresh
- **Cost Calculation**: Real-time pricing quotes based on page count and shipping
- **Print Job Creation**: Submit books to Lulu for printing
- **Order Status Tracking**: Poll Lulu API for order updates
- **Tracking Information**: Extract shipping tracking when orders ship

**Key Features:**

- Token caching to minimize API calls
- Comprehensive error handling with custom `LuluAPIError` exception
- Support for multiple shipping levels (MAIL, PRIORITY_MAIL, GROUND, EXPEDITED, EXPRESS)
- Default to coil binding (7"x10" color) - perfect for cookbooks that stay flat when open

#### 2. Database Models (`backend/models.py`)

Added `PrintOrder` model with fields:

- Order tracking (lulu_job_id, status)
- Shipping details (name, address, level)
- Pricing information (total_cost)
- Tracking information (tracking_id, tracking_url, carrier_name)
- Timestamps (created_at, updated_at)

#### 3. Database Migration (`backend/migrate_add_print_orders.py`)

- Created print_orders table with proper indexes
- Foreign keys to users and books tables
- Successfully executed migration

#### 4. CRUD Operations (`backend/crud.py`)

Added functions:

- `create_print_order()` - Create new print order
- `get_print_order()` - Get order by ID
- `get_print_order_by_lulu_job_id()` - Get order by Lulu job ID
- `get_user_print_orders()` - List all orders for a user
- `get_book_print_orders()` - List orders for a specific book
- `update_print_order_status()` - Update status and tracking info
- `delete_print_order()` - Delete unpaid orders

#### 5. API Endpoints (`backend/main.py`)

**Public PDF Hosting:**

- `GET /public/pdfs/{book_id}/{token}` - Serve PDFs to Lulu (no auth required)
- Secure token-based access with 24-hour expiry
- In-memory cache for temporary PDF storage

**Print Order Endpoints:**

- `GET /api/books/{book_id}/print-quote` - Get pricing quote
- `POST /api/books/{book_id}/print-order` - Create print order
- `GET /api/print-orders/{order_id}` - Get order status (auto-updates from Lulu)
- `GET /api/print-orders` - List all user's print orders

#### 6. Environment Configuration

Updated `.env.example` with:

- `LULU_CLIENT_KEY` - Lulu API client key
- `LULU_CLIENT_SECRET` - Lulu API client secret
- `LULU_API_BASE_URL` - API base URL (sandbox or production)
- `PUBLIC_PDF_BASE_URL` - Base URL for public PDF hosting

### Frontend Components

#### 1. Print Order Modal (`frontend/src/components/PrintOrderModal.tsx`)

Full-featured modal with:

- **Shipping Form**: Collect name, address, phone, email
- **Shipping Level Selection**: Radio buttons for 5 shipping speeds
- **Quote Display**: Show pricing breakdown before ordering
- **Order Confirmation**: Success screen with order ID

**User Flow:**

1. Fill in shipping information
2. Select shipping speed
3. Get instant quote from Lulu
4. Review pricing breakdown
5. Confirm order
6. Receive order ID and tracking info

#### 2. Print Order List (`frontend/src/components/PrintOrderList.tsx`)

Order tracking dashboard with:

- List of all print orders with status badges
- Color-coded status indicators (gray=created, blue=production, green=shipped)
- Tracking information display when available
- Manual refresh button for each order
- Auto-refresh every 30 seconds for active orders
- Direct links to carrier tracking pages

#### 3. Book Editor Integration (`frontend/src/components/BookEditor.tsx`)

- Added "📦 Order Printed Book" button
- Only shows when book is saved and valid (5-20 recipes)
- Opens PrintOrderModal on click
- Beautiful gradient styling matching app theme

#### 4. Navigation Update (`frontend/src/components/Navigation.tsx`)

- Added "📦 Print Orders" link to main navigation
- Routes to `/print-orders` page

#### 5. App Routing (`frontend/src/App.tsx`)

- Added `/print-orders` route with PrintOrderList component
- Protected route requiring authentication

## Technical Architecture

### Data Flow

```
User → Frontend Modal → Backend API → Lulu API
                           ↓
                      Database (save order)
                           ↓
                      Public PDF URL
                           ↓
                      Lulu Downloads PDF
                           ↓
                      Print & Ship
                           ↓
User ← Frontend List ← Backend API ← Lulu API (status updates)
```

### Security

1. **PDF Access**: Secure random tokens with 24-hour expiry
2. **Authentication**: All endpoints require valid Clerk JWT
3. **Authorization**: Users can only access their own orders
4. **Token Management**: OAuth tokens cached and auto-refreshed

### Book Format

**Default Configuration:**

- **Size**: 7" x 10" (standard cookbook size)
- **Binding**: Coil/Spiral (stays flat when open - perfect for cooking!)
- **Paper**: 60# uncoated cream paper
- **Cover**: Matte finish
- **Color**: Full color interior and cover
- **Quality**: Premium

**Pod Package ID**: `0700X1000FCPRECO060UC444MXX`

## Configuration Required

### 1. Lulu Account Setup

**For Testing (Sandbox):**

1. Sign up at https://developers.sandbox.lulu.com/
2. Get client key and secret from API Keys page
3. Use sandbox credit cards for testing

**For Production:**

1. Sign up at https://developers.lulu.com/
2. Get production client key and secret
3. Real orders will be charged and shipped

### 2. Environment Variables

Create `backend/.env` file with:

```bash
# Lulu Print API (Sandbox for testing)
LULU_CLIENT_KEY=your_sandbox_client_key_here
LULU_CLIENT_SECRET=your_sandbox_client_secret_here
LULU_API_BASE_URL=https://api.sandbox.lulu.com

# Public PDF Base URL
PUBLIC_PDF_BASE_URL=http://localhost:8000  # Development
# PUBLIC_PDF_BASE_URL=https://your-domain.com  # Production
```

### 3. Server Requirements

For production deployment:

- Backend must be publicly accessible (for Lulu to download PDFs)
- HTTPS recommended for security
- Ensure firewall allows inbound connections

## Testing Instructions

### 1. Start Backend Server

```bash
cd backend
python3 -m uvicorn main:app --reload
```

### 2. Start Frontend Server

```bash
cd frontend
npm run dev
```

### 3. Test Flow

1. **Create a Book**:

   - Add 5-20 recipes to your collection
   - Create a cookbook from the recipes
   - Save the book

2. **Get Quote**:

   - Click "📦 Order Printed Book" button
   - Fill in shipping address
   - Select shipping speed
   - Click "Get Quote"
   - Review pricing breakdown

3. **Place Order**:

   - Click "Confirm Order"
   - Wait for order creation
   - Note the order ID

4. **Track Order**:
   - Navigate to "Print Orders" in navigation
   - See your order in the list
   - Click "🔄 Update Status" to refresh
   - When shipped, click tracking link

### 4. Sandbox Testing

In sandbox mode:

- Orders are not actually printed
- Use test credit cards (provided by Lulu)
- Status transitions are simulated
- No real charges or shipments

## Cost Estimates

**Typical Cookbook (50 pages, coil binding):**

- Print Cost: ~$10-12
- Standard Shipping (US): ~$5-8
- Priority Shipping (US): ~$8-12
- Express Shipping (US): ~$15-20

**Total per book**: $15-30 depending on page count and shipping

## Order Status Flow

1. **CREATED** - Order submitted to Lulu
2. **UNPAID** - Awaiting payment (sandbox: auto-progresses)
3. **PAYMENT_IN_PROGRESS** - Processing payment
4. **PRODUCTION_DELAYED** - Mandatory production delay
5. **PRODUCTION_READY** - Ready to print
6. **IN_PRODUCTION** - Being printed
7. **SHIPPED** - Shipped to customer (tracking available)

**Error States:**

- **REJECTED** - Problem with order (contact support)
- **CANCELED** - Order canceled

## Future Enhancements

Not implemented in this phase:

1. **Payment Integration**: Stripe or other payment processor
2. **Webhooks**: Automatic status updates from Lulu
3. **Multiple Formats**: Let users choose binding type (perfect, hardcover)
4. **Bulk Orders**: Discounts for multiple copies
5. **Cover Customization**: Separate cover design
6. **File Validation**: Pre-validate PDFs before ordering
7. **Email Notifications**: Alert users of status changes
8. **Order History Export**: Download order history as CSV

## Files Created/Modified

### Backend Files Created:

- `backend/lulu_service.py` - Lulu API client
- `backend/migrate_add_print_orders.py` - Database migration

### Backend Files Modified:

- `backend/models.py` - Added PrintOrder model
- `backend/crud.py` - Added print order CRUD operations
- `backend/main.py` - Added print order endpoints and PDF hosting
- `backend/.env.example` - Added Lulu configuration

### Frontend Files Created:

- `frontend/src/components/PrintOrderModal.tsx` - Order creation modal
- `frontend/src/components/PrintOrderList.tsx` - Order tracking page

### Frontend Files Modified:

- `frontend/src/components/BookEditor.tsx` - Added order button
- `frontend/src/components/Navigation.tsx` - Added print orders link
- `frontend/src/App.tsx` - Added print orders route

### Database:

- `backend/cookbook.db` - Added print_orders table

## Support & Resources

- **Lulu API Docs**: https://developers.lulu.com/
- **Lulu Sandbox**: https://developers.sandbox.lulu.com/
- **Product Specs**: Download spec sheet from Lulu developer portal
- **Pricing Calculator**: https://developers.lulu.com/price-calculator

## Notes

- All print orders are tracked in the database
- PDFs are generated on-demand when orders are placed
- Temporary PDF URLs expire after 24 hours
- Orders can only be canceled before production starts
- Tracking information appears automatically when orders ship
- The system uses A4 page size (may need adjustment for US Letter)

## Success Criteria ✅

All implementation goals achieved:

- ✅ Lulu API integration with OAuth authentication
- ✅ Cost calculation and quote generation
- ✅ Print job creation and submission
- ✅ Order status tracking and updates
- ✅ Database models and migrations
- ✅ CRUD operations for print orders
- ✅ Public PDF hosting for Lulu access
- ✅ Frontend modal for order creation
- ✅ Frontend list for order tracking
- ✅ Navigation and routing integration
- ✅ Environment configuration
- ✅ Documentation

**Status**: Ready for testing in Lulu sandbox environment! 🎉


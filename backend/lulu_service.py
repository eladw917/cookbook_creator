"""
Lulu Print API Service
Handles authentication, cost calculation, print job creation, and order tracking
"""

import os
import time
from typing import Dict, Optional, List
import requests
from dotenv import load_dotenv

load_dotenv()

# Lulu API Configuration
LULU_API_BASE_URL = os.getenv("LULU_API_BASE_URL", "https://api.sandbox.lulu.com")
LULU_CLIENT_KEY = os.getenv("LULU_CLIENT_KEY")
LULU_CLIENT_SECRET = os.getenv("LULU_CLIENT_SECRET")
LULU_AUTH_URL = f"{LULU_API_BASE_URL}/auth/realms/glasstree/protocol/openid-connect/token"

# Cookbook-optimized pod_package_id 
# Using 6x9 perfect binding (most common, guaranteed to work in sandbox)
# For coil binding, use: 0700X1000FCPRECO060UC444MXX (verify in Lulu portal first)
DEFAULT_POD_PACKAGE_ID = "0600X0900BWSTDPB060UW444MXX"  # 6x9 B&W perfect binding

# Token cache
_token_cache: Optional[Dict] = None


class LuluAPIError(Exception):
    """Custom exception for Lulu API errors"""
    pass


def _get_auth_token() -> str:
    """
    Get OAuth2 access token using client credentials flow.
    Caches token and auto-refreshes when expired.
    """
    global _token_cache
    
    # Check if we have a valid cached token
    if _token_cache and _token_cache.get("expires_at", 0) > time.time() + 60:
        return _token_cache["access_token"]
    
    # Request new token
    if not LULU_CLIENT_KEY or not LULU_CLIENT_SECRET:
        raise LuluAPIError("Lulu API credentials not configured. Set LULU_CLIENT_KEY and LULU_CLIENT_SECRET in .env")
    
    print(f"DEBUG: Requesting new Lulu API token from {LULU_AUTH_URL}")
    
    try:
        response = requests.post(
            LULU_AUTH_URL,
            data={
                "grant_type": "client_credentials"
            },
            headers={
                "Content-Type": "application/x-www-form-urlencoded"
            },
            auth=(LULU_CLIENT_KEY, LULU_CLIENT_SECRET),
            timeout=30
        )
        response.raise_for_status()
        
        token_data = response.json()
        
        # Cache token with expiry time
        _token_cache = {
            "access_token": token_data["access_token"],
            "expires_at": time.time() + token_data.get("expires_in", 3600)
        }
        
        print(f"DEBUG: Successfully obtained Lulu API token (expires in {token_data.get('expires_in', 3600)}s)")
        return _token_cache["access_token"]
        
    except requests.exceptions.RequestException as e:
        raise LuluAPIError(f"Failed to authenticate with Lulu API: {str(e)}")


def _make_api_request(method: str, endpoint: str, data: Optional[Dict] = None) -> Dict:
    """
    Make authenticated request to Lulu API.
    
    Args:
        method: HTTP method (GET, POST, etc.)
        endpoint: API endpoint (e.g., "/print-jobs/")
        data: Request payload (for POST requests)
    
    Returns:
        Response JSON as dict
    """
    token = _get_auth_token()
    url = f"{LULU_API_BASE_URL}{endpoint}"
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "Cache-Control": "no-cache"
    }
    
    try:
        if method.upper() == "GET":
            response = requests.get(url, headers=headers, timeout=30)
        elif method.upper() == "POST":
            response = requests.post(url, headers=headers, json=data, timeout=30)
        else:
            raise ValueError(f"Unsupported HTTP method: {method}")
        
        response.raise_for_status()
        return response.json()
        
    except requests.exceptions.HTTPError as e:
        error_detail = ""
        try:
            error_detail = e.response.json()
        except:
            error_detail = e.response.text
        raise LuluAPIError(f"Lulu API request failed: {e}. Details: {error_detail}")
    except requests.exceptions.RequestException as e:
        raise LuluAPIError(f"Lulu API request failed: {str(e)}")


def get_cost_calculation(
    page_count: int,
    pod_package_id: str,
    shipping_address: Dict,
    shipping_option: str = "MAIL",
    quantity: int = 1
) -> Dict:
    """
    Calculate cost for printing a book.
    
    Args:
        page_count: Number of pages in the book
        pod_package_id: Lulu product SKU (e.g., "0700X1000FCPRECO060UC444MXX")
        shipping_address: Dict with city, country_code, postcode, state_code, street1, phone_number
        shipping_option: MAIL, PRIORITY_MAIL, GROUND, EXPEDITED, or EXPRESS
        quantity: Number of books to print
    
    Returns:
        Dict with cost breakdown:
        {
            "total_cost_excl_tax": "15.50",
            "total_tax": "1.24",
            "total_cost_incl_tax": "16.74",
            "shipping_cost": {
                "total_cost_excl_tax": "5.00",
                "total_cost_incl_tax": "5.00"
            },
            "line_item_costs": [...]
        }
    """
    print(f"DEBUG: Calculating cost for {quantity}x {page_count}-page book (SKU: {pod_package_id})")
    
    payload = {
        "line_items": [
            {
                "page_count": page_count,
                "pod_package_id": pod_package_id,
                "quantity": quantity
            }
        ],
        "shipping_address": shipping_address,
        "shipping_option": shipping_option
    }
    
    result = _make_api_request("POST", "/print-job-cost-calculations/", payload)
    print(f"DEBUG: Cost calculation result: {result}")
    return result


def create_print_job(
    interior_url: str,
    cover_url: str,
    page_count: int,
    shipping_address: Dict,
    contact_email: str,
    shipping_level: str = "MAIL",
    pod_package_id: str = DEFAULT_POD_PACKAGE_ID,
    quantity: int = 1,
    title: str = "Cookbook",
    external_id: Optional[str] = None
) -> Dict:
    """
    Create a print job with Lulu.
    
    Args:
        interior_url: Public URL to interior PDF
        cover_url: Public URL to cover PDF (can be same as interior)
        page_count: Number of pages in the book
        shipping_address: Dict with name, street1, city, state_code, postcode, country_code, phone_number
        contact_email: Email for order notifications
        shipping_level: MAIL, PRIORITY_MAIL, GROUND, EXPEDITED, or EXPRESS
        pod_package_id: Lulu product SKU
        quantity: Number of books to print
        title: Book title
        external_id: Optional reference ID for tracking
    
    Returns:
        Dict with print job details including id, status, etc.
    """
    print(f"DEBUG: Creating print job for '{title}' ({page_count} pages)")
    print(f"DEBUG: Interior URL: {interior_url}")
    print(f"DEBUG: Cover URL: {cover_url}")
    
    payload = {
        "contact_email": contact_email,
        "line_items": [
            {
                "title": title,
                "quantity": quantity,
                "printable_normalization": {
                    "interior": {
                        "source_url": interior_url
                    },
                    "cover": {
                        "source_url": cover_url
                    },
                    "pod_package_id": pod_package_id
                }
            }
        ],
        "shipping_address": shipping_address,
        "shipping_level": shipping_level
    }
    
    if external_id:
        payload["external_id"] = external_id
    
    result = _make_api_request("POST", "/print-jobs/", payload)
    print(f"DEBUG: Print job created successfully. Job ID: {result.get('id')}")
    return result


def get_print_job_status(job_id: int) -> Dict:
    """
    Get current status of a print job.
    
    Args:
        job_id: Lulu print job ID
    
    Returns:
        Dict with job details including:
        {
            "id": 12345,
            "status": {"name": "CREATED", "message": "..."},
            "line_items": [...],
            "shipping_address": {...},
            ...
        }
    """
    print(f"DEBUG: Fetching status for print job {job_id}")
    result = _make_api_request("GET", f"/print-jobs/{job_id}/")
    
    status_name = result.get("status", {}).get("name", "UNKNOWN")
    print(f"DEBUG: Print job {job_id} status: {status_name}")
    
    return result


def get_print_job_tracking(job_id: int) -> Optional[Dict]:
    """
    Extract tracking information from a print job.
    
    Args:
        job_id: Lulu print job ID
    
    Returns:
        Dict with tracking info if available:
        {
            "tracking_id": "...",
            "tracking_urls": ["..."],
            "carrier_name": "..."
        }
        Or None if not yet shipped
    """
    job = get_print_job_status(job_id)
    
    status = job.get("status", {})
    if status.get("name") != "SHIPPED":
        return None
    
    # Extract tracking from line item statuses
    line_item_statuses = status.get("line_item_statuses", [])
    if not line_item_statuses:
        return None
    
    # Get tracking from first line item (assuming single item orders)
    first_item = line_item_statuses[0]
    messages = first_item.get("messages", {})
    
    if not messages:
        return None
    
    return {
        "tracking_id": messages.get("tracking_id"),
        "tracking_urls": messages.get("tracking_urls", []),
        "carrier_name": messages.get("carrier_name")
    }


def list_print_jobs(page: int = 1, page_size: int = 20) -> Dict:
    """
    List all print jobs for the authenticated account.
    
    Args:
        page: Page number (1-indexed)
        page_size: Number of results per page
    
    Returns:
        Dict with results array and pagination info
    """
    endpoint = f"/print-jobs/?page={page}&page_size={page_size}"
    return _make_api_request("GET", endpoint)


# Utility functions

def validate_shipping_address(address: Dict) -> bool:
    """
    Validate that shipping address has all required fields.
    
    Required fields:
    - name
    - street1
    - city
    - postcode
    - country_code
    - phone_number
    """
    required_fields = ["name", "street1", "city", "postcode", "country_code", "phone_number"]
    
    for field in required_fields:
        if not address.get(field):
            raise ValueError(f"Missing required shipping address field: {field}")
    
    return True


def get_pod_package_id_for_format(binding: str = "coil") -> str:
    """
    Get appropriate pod_package_id for different book formats.
    
    Args:
        binding: "coil", "perfect", or "hardcover"
    
    Returns:
        pod_package_id string
    """
    formats = {
        "coil": "0700X1000FCPRECO060UC444MXX",  # 7x10 color coil
        "perfect": "0700X1000FCSTDPB060UW444MXX",  # 7x10 color perfect binding
        "hardcover": "0700X1000FCSTDHC060UW444MXX"  # 7x10 color hardcover
    }
    
    return formats.get(binding.lower(), formats["coil"])


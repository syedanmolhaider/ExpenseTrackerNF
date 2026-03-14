#!/usr/bin/env python3
"""
Test script for ExpenseTrackerNF API endpoints
Tests login, categories, expenses, budget, and income endpoints
"""

import requests
import json
import sys

BASE_URL = "https://expensetrackernf.netlify.app"

# Test credentials
EMAIL = "zsfoodvlogs@gmail.com"
PASSWORD = "ZainiBhai@007"

# Session to maintain cookies
session = requests.Session()

def test_endpoint(name, method, url, **kwargs):
    """Test an endpoint and print results"""
    print(f"\n{'='*60}")
    print(f"Testing: {name}")
    print(f"URL: {method} {url}")
    print(f"{'='*60}")
    
    try:
        if method == "GET":
            resp = session.get(url, **kwargs)
        elif method == "POST":
            resp = session.post(url, **kwargs)
        elif method == "PUT":
            resp = session.put(url, **kwargs)
        elif method == "DELETE":
            resp = session.delete(url, **kwargs)
        
        print(f"Status: {resp.status_code}")
        print(f"Headers: {dict(resp.headers)}")
        
        try:
            data = resp.json()
            print(f"Response: {json.dumps(data, indent=2)[:1000]}")
        except:
            print(f"Response (text): {resp.text[:500]}")
        
        return resp
        
    except Exception as e:
        print(f"ERROR: {e}")
        return None

def main():
    print("="*60)
    print("ExpenseTrackerNF API Test Suite")
    print("="*60)
    
    # 1. Test login
    print("\n\n### STEP 1: LOGIN ###")
    resp = test_endpoint(
        "Login",
        "POST",
        f"{BASE_URL}/api/login",
        json={"email": EMAIL, "password": PASSWORD},
        headers={"Content-Type": "application/json"}
    )
    
    if resp and resp.status_code == 200:
        print("\n✅ Login successful!")
        print(f"Cookies: {session.cookies.get_dict()}")
    else:
        print("\n❌ Login failed!")
        # Try signup instead
        print("\n### Trying signup instead ###")
        resp = test_endpoint(
            "Signup",
            "POST",
            f"{BASE_URL}/api/signup",
            json={"name": "Test User", "email": EMAIL, "password": PASSWORD},
            headers={"Content-Type": "application/json"}
        )
        if resp and resp.status_code in [200, 201]:
            print("\n✅ Signup successful!")
        else:
            print("\n❌ Signup also failed!")
            return
    
    # 2. Test /api/me
    print("\n\n### STEP 2: GET CURRENT USER ###")
    test_endpoint("Get Current User", "GET", f"{BASE_URL}/api/me")
    
    # 3. Test /api/categories (the problematic endpoint)
    print("\n\n### STEP 3: GET CATEGORIES ###")
    resp = test_endpoint("Get Categories", "GET", f"{BASE_URL}/api/categories")
    
    if resp and resp.status_code == 200:
        print("\n✅ Categories endpoint working!")
    else:
        print("\n❌ Categories endpoint failed!")
    
    # 4. Test /api/expenses
    print("\n\n### STEP 4: GET EXPENSES ###")
    test_endpoint("Get Expenses", "GET", f"{BASE_URL}/api/expenses?from=2026-01-01&to=2026-12-31")
    
    # 5. Test /api/budget
    print("\n\n### STEP 5: GET BUDGET ###")
    test_endpoint("Get Budget", "GET", f"{BASE_URL}/api/budget?month=2026-03")
    
    # 6. Test /api/income
    print("\n\n### STEP 6: GET INCOME ###")
    test_endpoint("Get Income", "GET", f"{BASE_URL}/api/income?from=2026-01-01&to=2026-12-31")
    
    # 7. Test /api/settings
    print("\n\n### STEP 7: GET SETTINGS ###")
    test_endpoint("Get Settings", "GET", f"{BASE_URL}/api/settings")
    
    # 8. Test /api/tags
    print("\n\n### STEP 8: GET TAGS ###")
    test_endpoint("Get Tags", "GET", f"{BASE_URL}/api/tags")
    
    print("\n\n" + "="*60)
    print("Test Suite Complete!")
    print("="*60)

if __name__ == "__main__":
    main()

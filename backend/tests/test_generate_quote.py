import os, requests, pytest
BASE = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://sticky-delight-app.preview.emergentagent.com').rstrip('/')
URL = f"{BASE}/api/generate-quote"

def test_validation_short_key():
    r = requests.post(URL, json={"customer_name":"Rahul","order_number":1,"kitchen_name":"K","gemini_api_key":"short"})
    assert r.status_code == 422

def test_validation_missing_customer():
    r = requests.post(URL, json={"order_number":1,"kitchen_name":"K","gemini_api_key":"x"*15})
    assert r.status_code == 422

def test_validation_order_zero():
    r = requests.post(URL, json={"customer_name":"R","order_number":0,"kitchen_name":"K","gemini_api_key":"x"*15})
    assert r.status_code == 422

def test_invalid_gemini_key_returns_400():
    r = requests.post(URL, json={"customer_name":"Rahul","order_number":1,"kitchen_name":"Spice Hub","gemini_api_key":"AIzaSyINVALID_KEY_FOR_TEST_1234567890"})
    assert r.status_code == 400
    assert "Gemini error" in r.json().get("detail","")

def test_root():
    assert requests.get(f"{BASE}/api/").status_code == 200

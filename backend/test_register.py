import requests

url = "http://127.0.0.1:8000/api/auth/register"
payload = {
    "full_name": "Test User",
    "username": "testuser",
    "email": "test@example.com",
    "password": "password123"
}

try:
    response = requests.post(url, json=payload)
    print("Status Code:", response.status_code)
    print("Response JSON:", response.json())
except Exception as e:
    print("Error connecting:", e)

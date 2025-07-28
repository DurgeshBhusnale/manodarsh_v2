#!/usr/bin/env python3

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import app
import json

def test_questionnaires_api():
    with app.test_client() as client:
        # Test the /admin/questionnaires endpoint
        response = client.get('/api/admin/questionnaires')
        
        print(f"Status Code: {response.status_code}")
        print(f"Response Headers: {dict(response.headers)}")
        print(f"Response Data: {response.get_data(as_text=True)}")
        
        if response.status_code == 200:
            data = response.get_json()
            print(f"Questionnaires found: {len(data.get('questionnaires', []))}")
            for q in data.get('questionnaires', []):
                print(f"  - ID: {q['id']}, Title: {q['title']}, Status: {q['status']}")
        else:
            print("API call failed!")

if __name__ == "__main__":
    test_questionnaires_api()

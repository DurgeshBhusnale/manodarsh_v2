#!/usr/bin/env python3
"""
Test the questionnaires API endpoint directly
"""

from flask import Flask
from api.admin.routes import admin_bp
from flask_cors import CORS
import json

def test_api_endpoint():
    """Test the questionnaires API endpoint"""
    try:
        print("🚀 Testing questionnaires API endpoint...")
        
        # Create a test Flask app
        app = Flask(__name__)
        CORS(app)
        
        # Register the admin blueprint
        app.register_blueprint(admin_bp, url_prefix='/api/admin')
        
        # Test the endpoint
        with app.test_client() as client:
            print("📡 Making GET request to /api/admin/questionnaires...")
            
            response = client.get('/api/admin/questionnaires')
            
            print(f"📊 Response status: {response.status_code}")
            print(f"📋 Response headers: {dict(response.headers)}")
            
            if response.status_code == 200:
                try:
                    data = response.get_json()
                    print(f"✅ Response JSON: {json.dumps(data, indent=2)}")
                    
                    if 'questionnaires' in data:
                        count = len(data['questionnaires'])
                        print(f"🎯 Found {count} questionnaires in API response")
                    else:
                        print("⚠️  No 'questionnaires' key in response")
                        
                except Exception as e:
                    print(f"❌ Error parsing JSON response: {e}")
                    print(f"📄 Raw response: {response.get_data(as_text=True)}")
            else:
                print(f"❌ API endpoint returned error: {response.status_code}")
                print(f"📄 Response body: {response.get_data(as_text=True)}")
                
    except Exception as e:
        print(f"❌ Error testing API endpoint: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_api_endpoint()

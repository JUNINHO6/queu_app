#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime
import time

class QueueAPITester:
    def __init__(self, base_url="https://lineupr.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.token = None
        self.establishment_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_result(self, test_name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {test_name} - PASSED")
        else:
            print(f"❌ {test_name} - FAILED: {details}")
        
        self.test_results.append({
            "test": test_name,
            "success": success,
            "details": details,
            "timestamp": datetime.now().isoformat()
        })

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        
        if headers:
            test_headers.update(headers)

        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers, timeout=10)

            success = response.status_code == expected_status
            
            if success:
                self.log_result(name, True)
                try:
                    return True, response.json()
                except:
                    return True, response.text
            else:
                error_msg = f"Expected {expected_status}, got {response.status_code}"
                try:
                    error_detail = response.json()
                    error_msg += f" - {error_detail}"
                except:
                    error_msg += f" - {response.text[:200]}"
                
                self.log_result(name, False, error_msg)
                return False, {}

        except Exception as e:
            self.log_result(name, False, f"Exception: {str(e)}")
            return False, {}

    def test_root_endpoint(self):
        """Test root API endpoint"""
        return self.run_test("Root API", "GET", "", 200)

    def test_register(self):
        """Test establishment registration"""
        timestamp = datetime.now().strftime('%H%M%S')
        test_data = {
            "name": f"Test Restaurant {timestamp}",
            "email": f"test{timestamp}@example.com",
            "password": "testpass123"
        }
        
        success, response = self.run_test("Register Establishment", "POST", "auth/register", 200, test_data)
        
        if success and 'token' in response:
            self.token = response['token']
            self.establishment_id = response['establishment']['id']
            print(f"   Token obtained: {self.token[:20]}...")
            return True
        return False

    def test_login(self):
        """Test establishment login with existing credentials"""
        if not self.token:
            return False
            
        # Get establishment data to test login
        success, me_data = self.run_test("Get Current User", "GET", "auth/me", 200)
        if not success:
            return False
            
        login_data = {
            "email": me_data['email'],
            "password": "testpass123"  # We know this from registration
        }
        
        # Clear token to test login
        old_token = self.token
        self.token = None
        
        success, response = self.run_test("Login Establishment", "POST", "auth/login", 200, login_data)
        
        if success and 'token' in response:
            self.token = response['token']
            return True
        else:
            self.token = old_token  # Restore token if login failed
            return False

    def test_get_me(self):
        """Test get current user endpoint"""
        success, response = self.run_test("Get Current User", "GET", "auth/me", 200)
        return success

    def test_create_queue(self):
        """Test queue creation"""
        queue_data = {
            "name": f"Test Queue {datetime.now().strftime('%H%M%S')}",
            "notification_threshold": 3
        }
        
        success, response = self.run_test("Create Queue", "POST", "queues", 200, queue_data)
        
        if success and 'id' in response:
            self.queue_id = response['id']
            print(f"   Queue created with ID: {self.queue_id}")
            return True
        return False

    def test_get_queues(self):
        """Test get queues endpoint"""
        success, response = self.run_test("Get Queues", "GET", "queues", 200)
        
        if success and isinstance(response, list) and len(response) > 0:
            print(f"   Found {len(response)} queues")
            return True
        return success

    def test_get_queue_by_id(self):
        """Test get specific queue"""
        if not hasattr(self, 'queue_id'):
            return False
            
        success, response = self.run_test("Get Queue by ID", "GET", f"queues/{self.queue_id}", 200)
        return success

    def test_queue_qr_code(self):
        """Test QR code generation"""
        if not hasattr(self, 'queue_id'):
            return False
            
        success, response = self.run_test("Get QR Code", "GET", f"queues/{self.queue_id}/qr-code", 200)
        
        if success and 'qr_code' in response and 'url' in response:
            print(f"   QR Code URL: {response['url']}")
            return True
        return False

    def test_create_ticket(self):
        """Test ticket creation (client taking a number)"""
        if not hasattr(self, 'queue_id'):
            return False
            
        ticket_data = {
            "email": "client@example.com"
        }
        
        # Don't use auth token for client endpoints
        old_token = self.token
        self.token = None
        
        success, response = self.run_test("Create Ticket", "POST", f"queues/{self.queue_id}/tickets", 200, ticket_data)
        
        self.token = old_token  # Restore token
        
        if success and 'id' in response:
            self.ticket_id = response['id']
            self.ticket_number = response['ticket_number']
            print(f"   Ticket created: #{self.ticket_number} (ID: {self.ticket_id})")
            return True
        return False

    def test_get_ticket(self):
        """Test get ticket endpoint"""
        if not hasattr(self, 'ticket_id'):
            return False
            
        # Don't use auth token for client endpoints
        old_token = self.token
        self.token = None
        
        success, response = self.run_test("Get Ticket", "GET", f"tickets/{self.ticket_id}", 200)
        
        self.token = old_token  # Restore token
        return success

    def test_get_ticket_position(self):
        """Test get ticket position"""
        if not hasattr(self, 'ticket_id'):
            return False
            
        # Don't use auth token for client endpoints
        old_token = self.token
        self.token = None
        
        success, response = self.run_test("Get Ticket Position", "GET", f"tickets/{self.ticket_id}/position", 200)
        
        self.token = old_token  # Restore token
        
        if success and 'position' in response:
            print(f"   Ticket position: {response['position']}")
            return True
        return False

    def test_call_next(self):
        """Test calling next ticket"""
        if not hasattr(self, 'queue_id'):
            return False
            
        success, response = self.run_test("Call Next Ticket", "POST", f"queues/{self.queue_id}/call-next", 200, {})
        
        if success and 'ticket_number' in response:
            print(f"   Called ticket number: {response['ticket_number']}")
            return True
        return False

    def test_queue_stats(self):
        """Test queue statistics"""
        if not hasattr(self, 'queue_id'):
            return False
            
        success, response = self.run_test("Get Queue Stats", "GET", f"queues/{self.queue_id}/stats", 200)
        
        if success and 'total_tickets' in response:
            print(f"   Stats - Total: {response['total_tickets']}, Waiting: {response['waiting']}, Served: {response['served']}")
            return True
        return False

    def test_queue_status_change(self):
        """Test changing queue status"""
        if not hasattr(self, 'queue_id'):
            return False
            
        # Test pause
        success1, _ = self.run_test("Pause Queue", "PUT", f"queues/{self.queue_id}/status", 200, {"status": "paused"})
        
        # Test activate
        success2, _ = self.run_test("Activate Queue", "PUT", f"queues/{self.queue_id}/status", 200, {"status": "active"})
        
        return success1 and success2

    def test_reset_queue(self):
        """Test queue reset"""
        if not hasattr(self, 'queue_id'):
            return False
            
        success, response = self.run_test("Reset Queue", "POST", f"queues/{self.queue_id}/reset", 200, {})
        return success

    def test_websocket_connection(self):
        """Test WebSocket connection (basic connectivity)"""
        if not hasattr(self, 'queue_id'):
            return False
            
        try:
            import websocket
            
            ws_url = f"wss://lineupr.preview.emergentagent.com/ws/{self.queue_id}"
            print(f"\n🔍 Testing WebSocket Connection...")
            print(f"   URL: {ws_url}")
            
            def on_open(ws):
                print("   WebSocket connected successfully")
                ws.close()
            
            def on_error(ws, error):
                print(f"   WebSocket error: {error}")
            
            ws = websocket.WebSocketApp(ws_url, on_open=on_open, on_error=on_error)
            ws.run_forever(timeout=5)
            
            self.log_result("WebSocket Connection", True)
            return True
            
        except ImportError:
            print("   WebSocket library not available, skipping test")
            self.log_result("WebSocket Connection", False, "websocket library not installed")
            return False
        except Exception as e:
            self.log_result("WebSocket Connection", False, str(e))
            return False

    def run_all_tests(self):
        """Run all backend tests"""
        print("🚀 Starting Queue Management API Tests")
        print(f"   Base URL: {self.base_url}")
        print("=" * 60)

        # Test sequence
        tests = [
            self.test_root_endpoint,
            self.test_register,
            self.test_get_me,
            self.test_login,
            self.test_create_queue,
            self.test_get_queues,
            self.test_get_queue_by_id,
            self.test_queue_qr_code,
            self.test_create_ticket,
            self.test_get_ticket,
            self.test_get_ticket_position,
            self.test_call_next,
            self.test_queue_stats,
            self.test_queue_status_change,
            self.test_reset_queue,
            self.test_websocket_connection
        ]

        for test in tests:
            try:
                test()
                time.sleep(0.5)  # Small delay between tests
            except Exception as e:
                print(f"❌ Test {test.__name__} failed with exception: {e}")
                self.log_result(test.__name__, False, f"Exception: {str(e)}")

        # Print summary
        print("\n" + "=" * 60)
        print(f"📊 Test Summary: {self.tests_passed}/{self.tests_run} tests passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return 0
        else:
            print(f"⚠️  {self.tests_run - self.tests_passed} tests failed")
            return 1

def main():
    tester = QueueAPITester()
    return tester.run_all_tests()

if __name__ == "__main__":
    sys.exit(main())
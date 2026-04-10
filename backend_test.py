#!/usr/bin/env python3
"""
EdgeBet API Backend Testing Suite
Tests all critical endpoints for the refactored modular backend
"""

import requests
import json
from typing import Dict, Any, List
import sys

# Backend URL from frontend .env
BACKEND_URL = "https://sharp-edge-6.preview.emergentagent.com/api"

class EdgeBetAPITester:
    def __init__(self):
        self.results = []
        self.failed_tests = []
        
    def log_result(self, endpoint: str, status: str, details: str = "", response_data: Any = None):
        """Log test result"""
        result = {
            "endpoint": endpoint,
            "status": status,
            "details": details,
            "response_data": response_data
        }
        self.results.append(result)
        
        if status == "FAIL":
            self.failed_tests.append(result)
            
        print(f"[{status}] {endpoint}: {details}")
        
    def test_endpoint(self, method: str, endpoint: str, expected_fields: List[str] = None, 
                     expected_values: Dict[str, Any] = None, payload: Dict = None) -> Dict:
        """Generic endpoint tester"""
        url = f"{BACKEND_URL}{endpoint}"
        
        try:
            if method.upper() == "GET":
                response = requests.get(url, timeout=10)
            elif method.upper() == "POST":
                response = requests.post(url, json=payload, timeout=10)
            else:
                raise ValueError(f"Unsupported method: {method}")
                
            # Check status code
            if response.status_code != 200:
                self.log_result(endpoint, "FAIL", f"Status code: {response.status_code}")
                return {"success": False, "status_code": response.status_code}
                
            # Parse JSON
            try:
                data = response.json()
            except json.JSONDecodeError:
                self.log_result(endpoint, "FAIL", "Invalid JSON response")
                return {"success": False, "error": "Invalid JSON"}
                
            # Check expected fields
            if expected_fields:
                missing_fields = []
                for field in expected_fields:
                    if field not in data:
                        missing_fields.append(field)
                        
                if missing_fields:
                    self.log_result(endpoint, "FAIL", f"Missing fields: {missing_fields}", data)
                    return {"success": False, "missing_fields": missing_fields}
                    
            # Check expected values
            if expected_values:
                for key, expected_value in expected_values.items():
                    if key in data and data[key] != expected_value:
                        self.log_result(endpoint, "FAIL", f"Expected {key}={expected_value}, got {data[key]}", data)
                        return {"success": False, "value_mismatch": {key: {"expected": expected_value, "actual": data[key]}}}
                        
            self.log_result(endpoint, "PASS", f"Status: {response.status_code}", data)
            return {"success": True, "data": data, "status_code": response.status_code}
            
        except requests.exceptions.RequestException as e:
            self.log_result(endpoint, "FAIL", f"Request error: {str(e)}")
            return {"success": False, "error": str(e)}
            
    def test_root_endpoint(self):
        """Test 1: Root endpoint"""
        print("\n=== Testing Root Endpoint ===")
        result = self.test_endpoint("GET", "/", expected_values={"version": "2.1.0"})
        return result["success"]
        
    def test_public_stats(self):
        """Test 2: Public Stats"""
        print("\n=== Testing Public Stats ===")
        result = self.test_endpoint("GET", "/public/stats", 
                                  expected_fields=["roi_7d", "win_rate", "active_users"])
        return result["success"]
        
    def test_public_preview_schedine(self):
        """Test 3: Public Preview Schedine"""
        print("\n=== Testing Public Preview Schedine ===")
        result = self.test_endpoint("GET", "/public/preview-schedine")
        
        if result["success"]:
            data = result["data"]
            if not isinstance(data, list):
                self.log_result("/public/preview-schedine", "FAIL", "Response should be an array")
                return False
                
        return result["success"]
        
    def test_schedine(self):
        """Test 4: Schedine"""
        print("\n=== Testing Schedine ===")
        result = self.test_endpoint("GET", "/schedine")
        
        if result["success"]:
            data = result["data"]
            if not isinstance(data, list):
                self.log_result("/schedine", "FAIL", "Response should be an array")
                return False
                
        return result["success"]
        
    def test_matches(self):
        """Test 5: Matches"""
        print("\n=== Testing Matches ===")
        result = self.test_endpoint("GET", "/matches")
        
        if result["success"]:
            data = result["data"]
            if not isinstance(data, list):
                self.log_result("/matches", "FAIL", "Response should be an array")
                return False
                
            # Check first match has required fields
            if data and len(data) > 0:
                match = data[0]
                required_fields = ["match_id", "sport", "league"]
                missing = [f for f in required_fields if f not in match]
                if missing:
                    self.log_result("/matches", "FAIL", f"Match missing fields: {missing}")
                    return False
                    
        return result["success"]
        
    def test_predictions(self):
        """Test 6: Predictions"""
        print("\n=== Testing Predictions ===")
        result = self.test_endpoint("GET", "/predictions")
        
        if result["success"]:
            data = result["data"]
            if not isinstance(data, list):
                self.log_result("/predictions", "FAIL", "Response should be an array")
                return False
                
        return result["success"]
        
    def test_opportunities(self):
        """Test 7: Opportunities"""
        print("\n=== Testing Opportunities ===")
        result = self.test_endpoint("GET", "/opportunities")
        
        if result["success"]:
            data = result["data"]
            required_fields = ["date", "total", "opportunities"]
            missing = [f for f in required_fields if f not in data]
            if missing:
                self.log_result("/opportunities", "FAIL", f"Missing fields: {missing}")
                return False
                
            # Check opportunities array has edge_percentage
            if "opportunities" in data and isinstance(data["opportunities"], list) and data["opportunities"]:
                opp = data["opportunities"][0]
                if "edge_percentage" not in opp:
                    self.log_result("/opportunities", "FAIL", "Opportunity missing edge_percentage")
                    return False
                    
        return result["success"]
        
    def test_live_matches(self):
        """Test 8: Live Matches"""
        print("\n=== Testing Live Matches ===")
        result = self.test_endpoint("GET", "/live")
        
        if result["success"]:
            data = result["data"]
            if not isinstance(data, list):
                self.log_result("/live", "FAIL", "Response should be an array")
                return False
                
        return result["success"]
        
    def test_social_activity(self):
        """Test 9: Social Activity"""
        print("\n=== Testing Social Activity ===")
        result = self.test_endpoint("GET", "/social/activity", 
                                  expected_fields=["activities", "viewing_now"])
        return result["success"]
        
    def test_leaderboard(self):
        """Test 10: Leaderboard"""
        print("\n=== Testing Leaderboard ===")
        result = self.test_endpoint("GET", "/leaderboard")
        
        if result["success"]:
            data = result["data"]
            if "leaderboard" not in data:
                self.log_result("/leaderboard", "FAIL", "Missing 'leaderboard' field")
                return False
                
            leaderboard = data["leaderboard"]
            if not isinstance(leaderboard, list):
                self.log_result("/leaderboard", "FAIL", "Leaderboard should be an array")
                return False
                
            # Check first entry has required fields
            if leaderboard and len(leaderboard) > 0:
                entry = leaderboard[0]
                required_fields = ["rank", "name", "roi"]
                missing = [f for f in required_fields if f not in entry]
                if missing:
                    self.log_result("/leaderboard", "FAIL", f"Leaderboard entry missing fields: {missing}")
                    return False
                    
        return result["success"]
        
    def test_badge_definitions(self):
        """Test 11: Badge Definitions"""
        print("\n=== Testing Badge Definitions ===")
        result = self.test_endpoint("GET", "/badges/definitions")
        
        if result["success"]:
            data = result["data"]
            if "badges" not in data:
                self.log_result("/badges/definitions", "FAIL", "Missing 'badges' field")
                return False
                
            badges = data["badges"]
            if not isinstance(badges, list):
                self.log_result("/badges/definitions", "FAIL", "Badges should be an array")
                return False
                
            # Check for specific badges
            badge_ids = [badge.get("badge_id") for badge in badges]
            required_badges = ["first_win", "streak_5"]
            missing_badges = [b for b in required_badges if b not in badge_ids]
            if missing_badges:
                self.log_result("/badges/definitions", "FAIL", f"Missing required badges: {missing_badges}")
                return False
                
            # Check badge structure
            if badges:
                badge = badges[0]
                required_fields = ["badge_id", "name", "points"]
                missing = [f for f in required_fields if f not in badge]
                if missing:
                    self.log_result("/badges/definitions", "FAIL", f"Badge missing fields: {missing}")
                    return False
                    
            # Check for prize info
            if "total_badges" not in data:
                self.log_result("/badges/definitions", "FAIL", "Missing total_badges field")
                return False
                
            # Check if there are 10 badge definitions
            if len(badges) != 10:
                self.log_result("/badges/definitions", "FAIL", f"Expected 10 badges, got {len(badges)}")
                return False
                
        return result["success"]
        
    def test_notification_types(self):
        """Test 12: Notification Types"""
        print("\n=== Testing Notification Types ===")
        result = self.test_endpoint("GET", "/notifications/types")
        
        if result["success"]:
            data = result["data"]
            if "types" not in data:
                self.log_result("/notifications/types", "FAIL", "Missing 'types' field")
                return False
                
        return result["success"]
        
    def test_user_notifications(self):
        """Test 13: User Notifications (Guest Demo)"""
        print("\n=== Testing User Notifications ===")
        result = self.test_endpoint("GET", "/notifications/guest_demo")
        
        if result["success"]:
            data = result["data"]
            required_fields = ["notifications", "unread_count"]
            missing = [f for f in required_fields if f not in data]
            if missing:
                self.log_result("/notifications/guest_demo", "FAIL", f"Missing fields: {missing}")
                return False
                
            if not isinstance(data["notifications"], list):
                self.log_result("/notifications/guest_demo", "FAIL", "Notifications should be an array")
                return False
                
        return result["success"]
        
    def test_subscription_plans(self):
        """Test 14: Subscription Plans"""
        print("\n=== Testing Subscription Plans ===")
        result = self.test_endpoint("GET", "/subscription/plans")
        
        if result["success"]:
            data = result["data"]
            if "plans" not in data:
                self.log_result("/subscription/plans", "FAIL", "Missing 'plans' field")
                return False
                
            plans = data["plans"]
            if not isinstance(plans, list):
                self.log_result("/subscription/plans", "FAIL", "Plans should be an array")
                return False
                
            # Check for Pro (€9.99) and Elite (€29.99)
            plan_names = [plan.get("name", "").lower() for plan in plans]
            if "pro" not in plan_names:
                self.log_result("/subscription/plans", "FAIL", "Missing Pro plan")
                return False
                
            if "elite" not in plan_names:
                self.log_result("/subscription/plans", "FAIL", "Missing Elite plan")
                return False
                
            # Check pricing (accepting both numeric and string formats)
            for plan in plans:
                if plan.get("name", "").lower() == "pro":
                    price = plan.get("price")
                    if price != 9.99 and price != "€9.99":
                        self.log_result("/subscription/plans", "FAIL", f"Pro plan price should be 9.99 or €9.99, got {price}")
                        return False
                elif plan.get("name", "").lower() == "elite":
                    price = plan.get("price")
                    if price != 29.99 and price != "€29.99":
                        self.log_result("/subscription/plans", "FAIL", f"Elite plan price should be 29.99 or €29.99, got {price}")
                        return False
                        
        return result["success"]
        
    def test_email_templates(self):
        """Test 15: Email Templates"""
        print("\n=== Testing Email Templates ===")
        result = self.test_endpoint("GET", "/emails/templates")
        
        if result["success"]:
            data = result["data"]
            if "templates" not in data:
                self.log_result("/emails/templates", "FAIL", "Missing 'templates' field")
                return False
                
            if not isinstance(data["templates"], list):
                self.log_result("/emails/templates", "FAIL", "Templates should be an array")
                return False
                
        return result["success"]
        
    def run_all_tests(self):
        """Run all tests"""
        print("🚀 Starting EdgeBet API Backend Testing Suite")
        print(f"Backend URL: {BACKEND_URL}")
        print("=" * 60)
        
        tests = [
            ("Root Endpoint", self.test_root_endpoint),
            ("Public Stats", self.test_public_stats),
            ("Public Preview Schedine", self.test_public_preview_schedine),
            ("Schedine", self.test_schedine),
            ("Matches", self.test_matches),
            ("Predictions", self.test_predictions),
            ("Opportunities", self.test_opportunities),
            ("Live Matches", self.test_live_matches),
            ("Social Activity", self.test_social_activity),
            ("Leaderboard", self.test_leaderboard),
            ("Badge Definitions", self.test_badge_definitions),
            ("Notification Types", self.test_notification_types),
            ("User Notifications", self.test_user_notifications),
            ("Subscription Plans", self.test_subscription_plans),
            ("Email Templates", self.test_email_templates),
        ]
        
        passed = 0
        total = len(tests)
        
        for test_name, test_func in tests:
            try:
                if test_func():
                    passed += 1
            except Exception as e:
                self.log_result(test_name, "ERROR", f"Test execution error: {str(e)}")
                
        print("\n" + "=" * 60)
        print(f"🏁 Testing Complete: {passed}/{total} tests passed")
        
        if self.failed_tests:
            print(f"\n❌ Failed Tests ({len(self.failed_tests)}):")
            for failed in self.failed_tests:
                print(f"  - {failed['endpoint']}: {failed['details']}")
                
        return passed == total

if __name__ == "__main__":
    tester = EdgeBetAPITester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)
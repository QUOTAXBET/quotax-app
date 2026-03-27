#!/usr/bin/env python3
"""
EdgeBet Backend API Testing Suite
Tests all public API endpoints for the sports betting app
"""

import requests
import json
import sys
from typing import Dict, Any, Optional
import time

# Backend URL from environment
BACKEND_URL = "https://sharp-edge-6.preview.emergentagent.com/api"

class EdgeBetAPITester:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'User-Agent': 'EdgeBet-Test-Client/1.0'
        })
        self.test_results = []
        self.match_id = None  # Will store a match ID for bet simulation
        
    def log_test(self, endpoint: str, method: str, status: str, details: str = ""):
        """Log test result"""
        result = {
            'endpoint': endpoint,
            'method': method,
            'status': status,
            'details': details,
            'timestamp': time.strftime('%Y-%m-%d %H:%M:%S')
        }
        self.test_results.append(result)
        
        status_icon = "✅" if status == "PASS" else "❌" if status == "FAIL" else "⚠️"
        print(f"{status_icon} {method} {endpoint} - {status}")
        if details:
            print(f"   Details: {details}")
    
    def test_endpoint(self, endpoint: str, method: str = "GET", data: Optional[Dict] = None, 
                     expected_status: int = 200, required_fields: Optional[list] = None) -> Optional[Dict]:
        """Generic endpoint tester"""
        url = f"{BACKEND_URL}{endpoint}"
        
        try:
            if method == "GET":
                response = self.session.get(url, timeout=10)
            elif method == "POST":
                response = self.session.post(url, json=data, timeout=10)
            else:
                self.log_test(endpoint, method, "FAIL", f"Unsupported method: {method}")
                return None
            
            # Check status code
            if response.status_code != expected_status:
                self.log_test(endpoint, method, "FAIL", 
                            f"Expected {expected_status}, got {response.status_code}: {response.text[:200]}")
                return None
            
            # Parse JSON response
            try:
                json_data = response.json()
            except json.JSONDecodeError:
                self.log_test(endpoint, method, "FAIL", "Invalid JSON response")
                return None
            
            # Check required fields
            if required_fields:
                missing_fields = []
                for field in required_fields:
                    if field not in json_data:
                        missing_fields.append(field)
                
                if missing_fields:
                    self.log_test(endpoint, method, "FAIL", f"Missing fields: {missing_fields}")
                    return None
            
            self.log_test(endpoint, method, "PASS", f"Response: {len(str(json_data))} chars")
            return json_data
            
        except requests.exceptions.RequestException as e:
            self.log_test(endpoint, method, "FAIL", f"Request error: {str(e)}")
            return None
        except Exception as e:
            self.log_test(endpoint, method, "FAIL", f"Unexpected error: {str(e)}")
            return None
    
    def test_root_endpoint(self):
        """Test GET /api/ - Root endpoint"""
        print("\n🔍 Testing Root Endpoint...")
        result = self.test_endpoint("/", required_fields=["message", "version"])
        
        if result:
            if result.get("message") == "EdgeBet API" and result.get("version") == "2.0.0":
                self.log_test("/", "GET", "PASS", "Correct API info returned")
            else:
                self.log_test("/", "GET", "WARN", f"Unexpected content: {result}")
    
    def test_matches_endpoints(self):
        """Test matches endpoints"""
        print("\n🏈 Testing Matches Endpoints...")
        
        # Test all matches
        matches = self.test_endpoint("/matches", required_fields=[])
        if matches and isinstance(matches, list) and len(matches) > 0:
            # Store first match ID for bet simulation
            self.match_id = matches[0].get("match_id")
            
            # Validate match structure
            match = matches[0]
            required_match_fields = ["match_id", "sport", "league", "home_team", "away_team", 
                                   "odds_home", "odds_away", "match_date"]
            missing = [f for f in required_match_fields if f not in match]
            if missing:
                self.log_test("/matches", "GET", "FAIL", f"Match missing fields: {missing}")
            else:
                self.log_test("/matches", "GET", "PASS", f"Found {len(matches)} matches with correct structure")
        
        # Test sport-specific endpoints
        for sport in ["soccer", "nba", "ufc"]:
            sport_matches = self.test_endpoint(f"/matches/{sport}")
            if sport_matches and isinstance(sport_matches, list):
                # Verify all matches are of correct sport
                wrong_sport = [m for m in sport_matches if m.get("sport") != sport]
                if wrong_sport:
                    self.log_test(f"/matches/{sport}", "GET", "FAIL", 
                                f"Found {len(wrong_sport)} matches with wrong sport")
                else:
                    self.log_test(f"/matches/{sport}", "GET", "PASS", 
                                f"Found {len(sport_matches)} {sport} matches")
    
    def test_predictions_endpoints(self):
        """Test predictions endpoints"""
        print("\n🤖 Testing Predictions Endpoints...")
        
        # Test all predictions
        predictions = self.test_endpoint("/predictions")
        if predictions and isinstance(predictions, list) and len(predictions) > 0:
            # Validate prediction structure
            pred = predictions[0]
            required_pred_fields = ["prediction_id", "match_id", "predicted_outcome", 
                                  "confidence", "risk_level", "odds"]
            missing = [f for f in required_pred_fields if f not in pred]
            if missing:
                self.log_test("/predictions", "GET", "FAIL", f"Prediction missing fields: {missing}")
            else:
                self.log_test("/predictions", "GET", "PASS", 
                            f"Found {len(predictions)} predictions with correct structure")
        
        # Test sport-specific predictions
        for sport in ["soccer", "nba", "ufc"]:
            sport_preds = self.test_endpoint(f"/predictions/{sport}")
            if sport_preds and isinstance(sport_preds, list):
                # Verify all predictions are of correct sport
                wrong_sport = [p for p in sport_preds if p.get("sport") != sport]
                if wrong_sport:
                    self.log_test(f"/predictions/{sport}", "GET", "FAIL", 
                                f"Found {len(wrong_sport)} predictions with wrong sport")
                else:
                    self.log_test(f"/predictions/{sport}", "GET", "PASS", 
                                f"Found {len(sport_preds)} {sport} predictions")
    
    def test_bet_simulation(self):
        """Test bet simulation endpoint"""
        print("\n💰 Testing Bet Simulation...")
        
        # Get fresh matches for simulation test
        fresh_matches = self.test_endpoint("/matches")
        if not fresh_matches or len(fresh_matches) == 0:
            self.log_test("/bets/simulate", "POST", "SKIP", "No matches available for simulation")
            return
        
        # Use the first available match
        match_id = fresh_matches[0].get("match_id")
        if not match_id:
            self.log_test("/bets/simulate", "POST", "SKIP", "No valid match_id found")
            return
        
        # Test valid simulation
        sim_data = {
            "match_id": match_id,
            "bet_type": "home",
            "stake": 50
        }
        
        result = self.test_endpoint("/bets/simulate", method="POST", data=sim_data,
                                  required_fields=["potential_payout", "win_probability", "expected_value"])
        
        if result:
            # Validate calculation logic
            stake = result.get("stake", 0)
            odds = result.get("odds", 0)
            payout = result.get("potential_payout", 0)
            
            expected_payout = stake * odds
            if abs(payout - expected_payout) > 0.01:  # Allow small floating point differences
                self.log_test("/bets/simulate", "POST", "FAIL", 
                            f"Payout calculation error: expected {expected_payout}, got {payout}")
            else:
                self.log_test("/bets/simulate", "POST", "PASS", "Bet simulation calculations correct")
        
        # Test invalid data
        invalid_data = {"match_id": "invalid", "bet_type": "home", "stake": 50}
        self.test_endpoint("/bets/simulate", method="POST", data=invalid_data, expected_status=404)
    
    def test_schedine_endpoint(self):
        """Test schedine endpoint"""
        print("\n📋 Testing Schedine Endpoint...")
        
        schedine = self.test_endpoint("/schedine")
        if schedine and isinstance(schedine, list):
            if len(schedine) > 0:
                # Check schedine structure
                sch = schedine[0]
                required_fields = ["schedina_id", "matches", "total_odds", "stake", 
                                 "potential_win", "status"]
                missing = [f for f in required_fields if f not in sch]
                if missing:
                    self.log_test("/schedine", "GET", "FAIL", f"Schedine missing fields: {missing}")
                else:
                    self.log_test("/schedine", "GET", "PASS", 
                                f"Found {len(schedine)} schedine with correct structure")
            else:
                self.log_test("/schedine", "GET", "WARN", "Empty schedine array")
    
    def test_live_endpoint(self):
        """Test live matches endpoint"""
        print("\n🔴 Testing Live Matches...")
        
        live_matches = self.test_endpoint("/live")
        if live_matches and isinstance(live_matches, list):
            if len(live_matches) > 0:
                match = live_matches[0]
                required_fields = ["match_id", "sport", "league", "home", "away", "score"]
                missing = [f for f in required_fields if f not in match]
                if missing:
                    self.log_test("/live", "GET", "FAIL", f"Live match missing fields: {missing}")
                else:
                    self.log_test("/live", "GET", "PASS", 
                                f"Found {len(live_matches)} live matches with correct structure")
            else:
                self.log_test("/live", "GET", "WARN", "No live matches available")
    
    def test_social_activity(self):
        """Test social activity endpoint"""
        print("\n👥 Testing Social Activity...")
        
        activity = self.test_endpoint("/social/activity", 
                                    required_fields=["viewing_now", "subscribed_today", "activities"])
        
        if activity:
            activities = activity.get("activities", [])
            if isinstance(activities, list) and len(activities) > 0:
                # Check activity structure
                act = activities[0]
                if "type" in act and "user" in act and "time" in act:
                    self.log_test("/social/activity", "GET", "PASS", 
                                f"Found {len(activities)} activities with correct structure")
                else:
                    self.log_test("/social/activity", "GET", "FAIL", "Activity missing required fields")
    
    def test_public_stats(self):
        """Test public stats endpoint"""
        print("\n📊 Testing Public Stats...")
        
        stats = self.test_endpoint("/public/stats", 
                                 required_fields=["roi_7d", "win_rate", "streak"])
        
        if stats:
            # Validate stat values are reasonable
            roi = stats.get("roi_7d", 0)
            win_rate = stats.get("win_rate", 0)
            
            if not (0 <= win_rate <= 100):
                self.log_test("/public/stats", "GET", "FAIL", f"Invalid win_rate: {win_rate}")
            elif not (-100 <= roi <= 1000):  # Reasonable ROI range
                self.log_test("/public/stats", "GET", "FAIL", f"Invalid ROI: {roi}")
            else:
                self.log_test("/public/stats", "GET", "PASS", "Stats values are reasonable")
    
    def test_preview_schedine(self):
        """Test preview schedine for guests"""
        print("\n👁️ Testing Preview Schedine...")
        
        preview = self.test_endpoint("/public/preview-schedine")
        if preview and isinstance(preview, list):
            if len(preview) > 0:
                self.log_test("/public/preview-schedine", "GET", "PASS", 
                            f"Found {len(preview)} preview schedine")
            else:
                self.log_test("/public/preview-schedine", "GET", "WARN", "Empty preview schedine")
    
    def test_subscription_plans(self):
        """Test subscription plans endpoint"""
        print("\n💳 Testing Subscription Plans...")
        
        plans = self.test_endpoint("/subscription/plans", required_fields=["plans"])
        
        if plans:
            plan_list = plans.get("plans", [])
            if len(plan_list) == 3:  # Should have 3 plans
                plan_ids = [p.get("id") for p in plan_list]
                expected_ids = ["base", "pro", "premium"]
                if set(plan_ids) == set(expected_ids):
                    self.log_test("/subscription/plans", "GET", "PASS", "Found all 3 expected plans")
                else:
                    self.log_test("/subscription/plans", "GET", "FAIL", 
                                f"Expected plans {expected_ids}, got {plan_ids}")
            else:
                self.log_test("/subscription/plans", "GET", "FAIL", 
                            f"Expected 3 plans, got {len(plan_list)}")
    
    def test_ai_predictions(self):
        """Test AI predictions endpoint (should be locked for guests)"""
        print("\n🧠 Testing AI Predictions...")
        
        ai_preds = self.test_endpoint("/ai/predictions")
        if ai_preds:
            # For guests, should be locked
            if ai_preds.get("locked") is True:
                self.log_test("/ai/predictions", "GET", "PASS", "Correctly locked for guests")
            else:
                self.log_test("/ai/predictions", "GET", "WARN", "AI predictions not locked for guests")
    
    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting EdgeBet Backend API Tests...")
        print(f"Testing against: {BACKEND_URL}")
        print("=" * 60)
        
        # Run all tests
        self.test_root_endpoint()
        self.test_matches_endpoints()
        self.test_predictions_endpoints()
        self.test_bet_simulation()
        self.test_schedine_endpoint()
        self.test_live_endpoint()
        self.test_social_activity()
        self.test_public_stats()
        self.test_preview_schedine()
        self.test_subscription_plans()
        self.test_ai_predictions()
        
        # Summary
        print("\n" + "=" * 60)
        print("📋 TEST SUMMARY")
        print("=" * 60)
        
        passed = len([r for r in self.test_results if r['status'] == 'PASS'])
        failed = len([r for r in self.test_results if r['status'] == 'FAIL'])
        warnings = len([r for r in self.test_results if r['status'] == 'WARN'])
        skipped = len([r for r in self.test_results if r['status'] == 'SKIP'])
        
        print(f"✅ PASSED: {passed}")
        print(f"❌ FAILED: {failed}")
        print(f"⚠️  WARNINGS: {warnings}")
        print(f"⏭️  SKIPPED: {skipped}")
        print(f"📊 TOTAL: {len(self.test_results)}")
        
        if failed > 0:
            print("\n❌ FAILED TESTS:")
            for result in self.test_results:
                if result['status'] == 'FAIL':
                    print(f"   {result['method']} {result['endpoint']}: {result['details']}")
        
        if warnings > 0:
            print("\n⚠️  WARNINGS:")
            for result in self.test_results:
                if result['status'] == 'WARN':
                    print(f"   {result['method']} {result['endpoint']}: {result['details']}")
        
        print("\n🏁 Testing completed!")
        return failed == 0

if __name__ == "__main__":
    tester = EdgeBetAPITester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)
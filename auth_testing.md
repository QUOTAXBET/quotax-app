# Auth-Gated App Testing Playbook

## Step 1: Create Test User & Session
```bash
mongosh --eval "
use('test_database');
var userId = 'test-user-' + Date.now();
var sessionToken = 'test_session_' + Date.now();
db.users.insertOne({
  user_id: userId,
  email: 'test.user.' + Date.now() + '@example.com',
  name: 'Test User',
  picture: 'https://via.placeholder.com/150',
  wallet_balance: 1000.0,
  total_bets: 0,
  total_wins: 0,
  total_profit: 0.0,
  created_at: new Date()
});
db.user_sessions.insertOne({
  user_id: userId,
  session_token: sessionToken,
  expires_at: new Date(Date.now() + 7*24*60*60*1000),
  created_at: new Date()
});
print('Session token: ' + sessionToken);
print('User ID: ' + userId);
"
```

## Step 2: Test Backend API
```bash
# Test auth endpoint
curl -X GET "https://sharp-edge-6.preview.emergentagent.com/api/auth/me" \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN"

# Test protected endpoints
curl -X GET "https://sharp-edge-6.preview.emergentagent.com/api/user/wallet" \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN"

curl -X POST "https://sharp-edge-6.preview.emergentagent.com/api/bets" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN" \
  -d '{"match_id": "match_7e9abaa82467", "bet_type": "home", "stake": 25}'
```

## Step 3: Browser Testing
```javascript
await page.context.add_cookies([{
    "name": "session_token",
    "value": "YOUR_SESSION_TOKEN",
    "domain": "sharp-edge-6.preview.emergentagent.com",
    "path": "/",
    "httpOnly": true,
    "secure": true,
    "sameSite": "None"
}]);
await page.goto("https://sharp-edge-6.preview.emergentagent.com");
```

## Success Indicators
- /api/auth/me returns user data
- Dashboard loads without redirect
- CRUD operations work (place bets, reset wallet)

## Failure Indicators
- "User not found" errors
- 401 Unauthorized responses
- Redirect to login page

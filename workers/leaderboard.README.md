Deploy this Worker with a KV binding named LEADERBOARD_KV.
Suggested route: dev.leo-varela.com/api/leaderboard
It provides:
- GET  -> { scores: [{name, score}, ...] }
- POST -> body { name, score }

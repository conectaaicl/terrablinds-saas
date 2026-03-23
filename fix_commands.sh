#!/bin/bash
# Run these commands on the VPS to fix corrupted password hashes
# Password being set: Admin2025

# 1. Copy the fix script into the backend container
docker cp /tmp/fix_pw.py working-backend-1:/app/fix_pw.py

# 2. Check what env vars the container has (to verify DB connection)
docker exec working-backend-1 env | grep -E "DATABASE|POSTGRES"

# 3. Run the fix script
docker exec working-backend-1 python3 /app/fix_pw.py

# 4. Verify directly in DB
docker exec working-db-1 psql -U workshopos_app -d workshopos -c "SELECT id, email, password_hash FROM usuarios;"

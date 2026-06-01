#!/bin/bash
set -e
cd /var/www/working
echo Building frontend...
npm install --silent 2>/dev/null || true
npm run build
echo Done. Nginx serves /var/www/working/dist/ — no restart needed.

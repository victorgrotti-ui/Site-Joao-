#!/bin/sh
cd "$(dirname "$0")/.." || exit 1
echo "Starting CMH Cleaning. Leave this window open."
echo "Company records: prisma/production.db"
echo "On this computer: http://127.0.0.1:3001"
echo "On a phone, use the http://192.168... address printed below."
echo "Do not forward port 3001 to the internet."
exec npm start

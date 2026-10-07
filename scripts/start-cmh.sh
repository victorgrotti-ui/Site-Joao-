#!/bin/sh
cd "$(dirname "$0")/.." || exit 1
echo "Starting CMH Cleaning. Leave this window open."
echo "Open http://cmh-cleaning.local:3001"
echo "Do not forward port 3001 to the internet."
exec npm start

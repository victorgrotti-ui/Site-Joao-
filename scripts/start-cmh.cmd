@echo off
cd /d "%~dp0\.."
echo Starting CMH Cleaning. Leave this window open.
echo Open http://cmh-cleaning.local:3001
echo Do not forward port 3001 to the internet.
npm start

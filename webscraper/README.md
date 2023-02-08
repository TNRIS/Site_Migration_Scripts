# TNRIS.ORG WEB SCRAPER
This scrapes the tnris.org website and outputs a text file for each page in the metadata folder.

# Requirements
node v16.17.0 (Note to future users. It might work in newer node but I tested in v16.17.0)
puppeteer must be installed on your PC.

# Instructions
Clone locally, run npm install. I included a launch.json file for debugging. (Otherwise just run node scrape.js)

# Useful tip
set SKIP_NON_HOME_FOR_TEST if debugging, so it will just scrape the homepage. This is much less resource intensive.
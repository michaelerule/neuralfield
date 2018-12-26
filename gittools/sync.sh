#!/usr/bin/env bash


# It seems to be a litte tricky to get the Sphinx automatic documentation
# to host as a web page on git pages.
#
# What we will do intead is manually synchronize the documentation
# builds with the branches of these projects used for the web pages
#
# Run this script from it's local directory
#


#rmbak
#rmtex

echo "Generating static file browsing links"
# Generate github pages browsing links
# (stopgap until official documentation is prepared)
./gittools/maketree.py

# Clean up editor and temp files from the local directory (even if not 
# tracked by git)
#echo "Deleting editor temporary files"
#find . -name "*.pyc" -exec rm -rf {} \; 2>/dev/null
#find . -name "*~" -exec rm -rf {} \;  2>/dev/null


# Clean up editor and temp files from the local directory (even if not 
# tracked by git)
echo "Deleting editor temporary files"
find . -name "*.pyc" -exec rm -rf {} \; 2>/dev/null
find . -name "*~" -exec rm -rf {} \;  2>/dev/null

# Add any new files, add all updates to all files

echo "Adding all changes"
git add --all . 
git add -u :/

# Commit using the message specified as first argument to this script

echo "Git commit"
git commit -m "$1"

# Synchronize with master on github
echo "git pull"
git pull

echo "git push"
git push origin master

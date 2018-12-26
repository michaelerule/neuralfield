#!/usr/bin/env bash


# It seems to be a litte tricky to get the Sphinx automatic documentation
# to host as a web page on git pages.
#
# What we will do intead is manually synchronize the documentation
# builds with the branches of these projects used for the web pages
#
# Run this script from it's local directory
#


rmbak
rmtex

echo "Generating static file browsing links"
# Generate github pages browsing links
# (stopgap until official documentation is prepared)
./gittools/maketree.py

# Clean up editor and temp files from the local directory (even if not 
# tracked by git)
echo "Deleting editor temporary files"
find . -name "*.pyc" -exec rm -rf {} \; 2>/dev/null
find . -name "*~" -exec rm -rf {} \;  2>/dev/null

shopt -s extglob
./go
git add *
git rm -r !(.*)
git add -u :/
git commit -m "$1"
git push -f origin master

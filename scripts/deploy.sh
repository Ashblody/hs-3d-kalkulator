#!/bin/sh
# objavi dist/ na vejo gh-pages
set -e
URL=$(git remote get-url origin)
cd dist
touch .nojekyll
rm -rf .git
git init -q -b gh-pages
git add -A
git -c user.name=Ashblody -c user.email=Ashblody@users.noreply.github.com commit -qm "deploy $(date -u +%FT%TZ)"
git push -f "$URL" gh-pages
rm -rf .git

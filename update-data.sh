#/bin/bash

source .secrets
npm run derive

git add .
git commit -m "Update data"

git checkout master
git merge dev

npm run build-only
git add .
git commit -m "build"

git push origin master

git checkout dev


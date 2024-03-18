#!/bin/bash

cd ldata-gentxt/
echo "pulling ldata-gentxt/"
rm -rf ./*
git checkout .
git checkout main
git pull
cd ..
pwd

cd ldata-irrpy/
echo "pulling ldata-irrpy/"
rm -rf ./*
git checkout .
git checkout main
git pull
cd ..
pwd

cd ldata-irweb/
echo "pulling ldata-irweb/"
rm -rf ./*
git checkout .
git checkout main
git pull
cd ..
pwd

cd ldata-rsltsts/
echo "pulling ldata-rsltsts/"
rm -rf ./*
git checkout .
git checkout main
git pull
cd ..
pwd

cd ldata-usrcfg/
echo "pulling ldata-usrcfg/"
rm -rf ./*
git checkout .
git checkout main
git pull
cd ..
pwd


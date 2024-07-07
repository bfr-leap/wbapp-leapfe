#!/bin/bash

base_dir=$(dirname $0)
cd $base_dir
PROJECT_HOME="$(pwd)"

mkdir lplibtmp
cd lplibtmp

git clone https://github.com/bfr-leap/ir-endpoint-types.git
cd ir-endpoint-types
rm -rfv .git
rm -v .git*
rm -v package*
cd $PROJECT_HOME
mkdir -p lplib/endpoint-types

cp lplibtmp/ir-endpoint-types/* lplib/endpoint-types/





cd $PROJECT_HOME
rm -rf lplibtmp
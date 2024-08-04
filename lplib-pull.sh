#!/bin/bash

# Script to clone specified repositories, clean up unnecessary files, 
# and copy the necessary contents to designated directories within the project.
#
# Usage:
#   ./script_name.sh
#
# The script performs the following steps:
#   1. Navigate to the script's directory.
#   2. Create a temporary directory for cloning repositories.
#   3. Clone repositories, clean up unnecessary files, and copy necessary contents.
#   4. Clean up the temporary directory.
#

base_dir=$(dirname $0)
cd $base_dir
PROJECT_HOME="$(pwd)"

cleanup_repo() {
    local repo_dir=$1
    rm -rfv $repo_dir/.git
    rm -v $repo_dir/.git*
    rm -v $repo_dir/package*
}

clone_and_prepare_repo() {
    local repo_url=$1
    local dest_dir=$2
    local sub_dir=$3

    cd $PROJECT_HOME
    cd lplibtmp
    git clone $repo_url
    repo_name=$(basename $repo_url .git)
    cd $repo_name
    cleanup_repo .
    cd $PROJECT_HOME
    mkdir -p $dest_dir
    rm -rf $dest_dir/*
    cp -r lplibtmp/$repo_name/$sub_dir/* $dest_dir/
}

mkdir lplibtmp

clone_and_prepare_repo "https://github.com/bfr-leap/ir-endpoint-types.git" "lplib/endpoint-types" "."
clone_and_prepare_repo "https://github.com/bfr-leap/lplib-dtbrkr.git" "lplib/dtbrkr" "src"

cd $PROJECT_HOME
rm -rf lplibtmp
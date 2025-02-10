#!/bin/bash

# Get the directory containing this script
script_dir="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# set the repo root:
repo_dir="$(dirname "$script_dir")"

git clean --dry-run -dX -e "!.env"

echo
read -p "Continue (y/N)? " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]
then
  git clean -fdX -e "!.env"
fi

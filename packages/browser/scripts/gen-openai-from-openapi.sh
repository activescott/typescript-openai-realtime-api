#!/usr/bin/env bash
this_dir=$(cd $(dirname "$0"); pwd) # this script's directory

parent_dir=$(cd "${this_dir}/.."; pwd)

# https://openapi-ts.dev/introduction
# https://github.com/openapi-ts/openapi-typescript

# https://github.com/openai/openai-openapi
# https://raw.githubusercontent.com/openai/openai-openapi/25be47865ea2df1179a46be045c2f6b65f38e982/openapi.yaml
# https://raw.githubusercontent.com/openai/openai-openapi/acea67a5045a6873c6eb2573a6be0e0a7b092ec6/openapi.yaml
npx openapi-typescript "https://raw.githubusercontent.com/openai/openai-openapi/acea67a5045a6873c6eb2573a6be0e0a7b092ec6/openapi.yaml" -o "${parent_dir}/src/openai/openapi.ts"

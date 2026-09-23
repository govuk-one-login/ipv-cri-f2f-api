ROOT_DIR := $(abspath $(CURDIR)/../..)
ESBUILD := $(ROOT_DIR)/node_modules/.bin/esbuild
ESBUILD_FLAGS := --bundle --platform=node --minify --target=es2022 --format=esm --out-extension:.js=.mjs --banner:js="import { createRequire } from 'module'; const require = createRequire(import.meta.url);"

build-MockGovNotifyFunction:
	NODE_PATH=$(ROOT_DIR)/node_modules $(ESBUILD) MockGovNotifyHandler.ts $(ESBUILD_FLAGS) --outdir=$(ARTIFACTS_DIR)

ROOT_DIR := $(abspath $(CURDIR)/../..)
DEPENDENCY_DIR := $(ROOT_DIR)/src
ESBUILD := $(DEPENDENCY_DIR)/node_modules/.bin/esbuild
ESBUILD_FLAGS := --bundle --platform=node --minify --target=es2022 --format=esm --out-extension:.js=.mjs --banner:js="import { createRequire } from 'module'; const require = createRequire(import.meta.url);"

build-MockPostOfficeFunction:
	NODE_PATH=$(DEPENDENCY_DIR)/node_modules $(ESBUILD) MockPostOfficeHandler.ts $(ESBUILD_FLAGS) --outdir=$(ARTIFACTS_DIR)

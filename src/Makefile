DEPENDENCY_DIR := $(CURDIR)
ESBUILD := $(DEPENDENCY_DIR)/node_modules/.bin/esbuild
ESBUILD_FLAGS := --bundle --platform=node --minify --target=es2022 --format=esm --out-extension:.js=.mjs --banner:js="import { createRequire } from 'module'; const require = createRequire(import.meta.url);"

ENTRY_DeleteBucketFunction := DeleteBucketHandler.ts
ENTRY_SessionFunction := SessionHandler.ts
ENTRY_SessionConfigFunction := SessionConfigHandler.ts
ENTRY_TokenFunction := AccessTokenHandler.ts
ENTRY_AuthorizationFunction := AuthorizationCodeHandler.ts
ENTRY_DocumentSelectionFunction := DocumentSelectionHandler.ts
ENTRY_AbortFunction := AbortHandler.ts
ENTRY_PersonInfoFunction := PersonInfoHandler.ts
ENTRY_PersonInfoKeyFunction := PersonInfoKeyHandler.ts
ENTRY_AddressLocationsFunction := AddressLocationsHandler.ts
ENTRY_JsonWebKeysFunction := JwksHandler.ts
ENTRY_GovNotifyFunction := GovNotifyHandler.ts
ENTRY_UserInfoFunction := UserInfoHandler.ts
ENTRY_ReminderEmailFunction := ReminderEmailHandler.ts
ENTRY_ExpiredSessionsFunction := ExpiredSessionsHandler.ts
ENTRY_TriggerYotiCallbackStateMachine := TriggerYotiCallbackStateMachineHandler.ts
ENTRY_YotiCallbackFunction := YotiSessionCompletionHandler.ts
ENTRY_PostOfficeVisitFunction := PostOfficeVisitHandler.ts
ENTRY_GenerateYotiLetterFunction := GenerateYotiLetterHandler.ts
ENTRY_GeneratePrintedLetterFunction := GeneratePrintedLetterHandler.ts
ENTRY_SendToGovNotifyFunction := SendToGovNotifyHandler.ts

EXTRA_JsonWebKeysFunction := --sourcemap
EXTRA_GeneratePrintedLetterFunction := --loader:.ttf=file --loader:.png=file

build-%:
	NODE_PATH=$(DEPENDENCY_DIR)/node_modules $(ESBUILD) $(ENTRY_$*) $(ESBUILD_FLAGS) $(EXTRA_$*) --outdir=$(ARTIFACTS_DIR)

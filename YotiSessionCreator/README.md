# POC to integrate with Yoti 

Starts the application in development using `nodemon` and `ts-node`.

Before you begin you will need to create a `.env` file with the following parameters

```bash
YOTI_PEM_LOCATION = <YOTI_TEST_APP_PRIVATE_KEY_PEM_FILE_PATH>
YOTI_SDK_ID = <YOTI_TEST_APP_SDK_ID>
PDF_LOCATION = <A_LOCATION_ON_THE_FILESYSTEM_TO_SAVE_PDF> # Swap this out for S3 before putting it in the cloud
YOTI_PEM_BASE64 = <BASE64ENCODED_PRIVATE_KEY_PEM> #Because I was having an issue with encodings when reading file - dont keep me
```

#### `npm run start`

Starts the app by first building the project with `npm run build`, and then executing the compiled JavaScript at `build/index.js`.

#### `npm run build`

Builds the app at `build`, cleaning the folder first.

#### `npm run test`

Runs the `jest` tests once.

#### `npm run test:dev`

Run the `jest` tests in watch mode, waiting for file changes.

#### `npm run prettier-format`

Format your code.

#### `npm run prettier-watch`

Format your code in watch mode, waiting for file changes.

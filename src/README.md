# Face-To-Face Service 

Face-To-Face Service

## How to run build

From `src` folder run `sam build` 

## How to run tests

To run all unit tests, run `npm run test:unit`. This will compile and run all the unit tests in the `/tests` directory.

To run the infra tests, run `npm run test:infra`.

### How to perform lint checks an individual test file

To check if there are any linting issues, run `npm lint`. If there are any critical errors, this command 
will fail prompting developer to fix those issues. The report will be present under `reports` folder as an
html file. Once those critical errors are fixed, re running `npm lint` should not return any errors.
In order to fix some simple formatting issues, one can run `npm lint:fix` which should fix most of those automatically.

#!/bin/bash

# Define your constants in the bash script if necessary
export LOCAL_HOST="localhost"
export LOCAL_APP_PORT="3000"

# Run Node.js code directly from the bash script
node <<EOF
const axios = require('axios');

// Access environment variables
const opts = {
  provider: process.env.PACT_PROVIDER_NAME,
  providerBaseUrl: \`\${process.env.LOCAL_HOST}:\${process.env.LOCAL_APP_PORT}\`,
  pactBrokerUrl: process.env.PACT_BROKER_URL,
  pactBrokerUsername: process.env.PACT_BROKER_USER,
  pactBrokerPassword: process.env.PACT_BROKER_PASSWORD,
  consumerVersionSelectors: [
    { mainBranch: true },
    { deployedOrReleased: true }
  ],
  publishVerificationResult: true,
  providerVersion: process.env.PACT_PROVIDER_VERSION,
  logLevel: "debug"
};

const auth = Buffer.from(\`\${opts.pactBrokerUsername}:\${opts.pactBrokerPassword}\`).toString("base64");
const pact_url = opts.pactBrokerUrl || "";

axios.get(pact_url, {
  headers: {
    "Authorization": \`Basic \${auth}\`
  }
})
.then(function (response) {
  if (response.status === 200) {
    console.log("PACT BROKER AUTHORIZED SUCCESSFULLY VIA PROVIDER");
    return response.status;
  } else {
    console.log("Response code:", response.status);
  }
})
.catch(function (error) {
  if (error.response) {
    console.log("ERROR AUTHORIZING PACT BROKER:", error.response.status);
    throw error.response;
  } else if (error.request) {
    console.log("ERROR WITH REQUEST MADE TO PACT BROKER");
    throw error.request;
  } else {
    console.log("ERROR SETTING UP REQUEST TO PACT BROKER:", error.message);
    throw error;
  }
});
EOF


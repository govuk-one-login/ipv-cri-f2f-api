const startDefault = {
  resource: "/",
  path: "/start",
  httpMethod: "POST",
  requestContext: {
    resourcePath: "/",
    httpMethod: "POST",
    path: "/start",
  },
  headers: {
    accept: "application/json;charset=UTF-8",
    "Content-Type": "application/json;charset=UTF-8",
    Host: "tests.gov.uk",
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.132 Safari/537.36",
    "X-Amzn-Trace-Id": "Root=1-5e66d96f-7491f09xmpl79d18acf3d050",
  },
  queryStringParameters: {},
  multiValueHeaders: {},
  multiValueQueryStringParameters: null,
  pathParameters: null,
  stageVariables: null,
  body: null,
  isBase64Encoded: false,
};

const startCustom = {
  resource: "/",
  path: "/start",
  httpMethod: "POST",
  requestContext: {
    resourcePath: "/",
    httpMethod: "POST",
    path: "/start",
  },
  headers: {
    accept: "application/json;charset=UTF-8",
    "Content-Type": "application/json;charset=UTF-8",
    Host: "tests.gov.uk",
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.132 Safari/537.36",
    "X-Amzn-Trace-Id": "Root=1-5e66d96f-7491f09xmpl79d18acf3d050",
  },
  queryStringParameters: {},
  multiValueHeaders: {},
  multiValueQueryStringParameters: null,
  pathParameters: null,
  stageVariables: null,
  body: '{"target":"test.com","shared_claims":{"name":[{"nameParts":[{"value":"Jenny","type":"GivenName"},{"value":"Jane","type":"GivenName"},{"value":"Jonah","type":"FamilyName"}]}],"email":"jjj@testemail.com"}}',
  isBase64Encoded: false,
};

const startCustomInvalidSigningKey = {
  resource: "/",
  path: "/start",
  httpMethod: "POST",
  requestContext: {
    resourcePath: "/",
    httpMethod: "POST",
    path: "/start",
  },
  headers: {
    accept: "application/json;charset=UTF-8",
    "Content-Type": "application/json;charset=UTF-8",
    Host: "tests.gov.uk",
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.132 Safari/537.36",
    "X-Amzn-Trace-Id": "Root=1-5e66d96f-7491f09xmpl79d18acf3d050",
  },
  queryStringParameters: {},
  multiValueHeaders: {},
  multiValueQueryStringParameters: null,
  pathParameters: null,
  stageVariables: null,
  body: '{"invalidSigningKid":"true"}',
  isBase64Encoded: false,
};

const startCustomMissingSigningKey = {
  resource: "/",
  path: "/start",
  httpMethod: "POST",
  requestContext: {
    resourcePath: "/",
    httpMethod: "POST",
    path: "/start",
  },
  headers: {
    accept: "application/json;charset=UTF-8",
    "Content-Type": "application/json;charset=UTF-8",
    Host: "tests.gov.uk",
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.132 Safari/537.36",
    "X-Amzn-Trace-Id": "Root=1-5e66d96f-7491f09xmpl79d18acf3d050",
  },
  queryStringParameters: {},
  multiValueHeaders: {},
  multiValueQueryStringParameters: null,
  pathParameters: null,
  stageVariables: null,
  body: '{"missingSigningKid":"true"}',
  isBase64Encoded: false,
};

module.exports = {
  startDefault,
  startCustom,
  startCustomInvalidSigningKey,
  startCustomMissingSigningKey,
};

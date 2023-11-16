process.env.SESSION_TABLE = "SESSIONTABLE";
process.env.KMS_KEY_ARN = "MYKMSKEY";
process.env.ISSUER = "https://XXX-c.env.account.gov.uk";
process.env.TXMA_QUEUE_URL = "MYQUEUE";
process.env.CLIENT_CONFIG =
  '[{"jwksEndpoint":"https://api.identity.account.gov.uk/.well-known/jwks.json","clientId":"ipv-core-stub","redirectUri":"http://localhost:8085/callback"}]';
process.env.ENCRYPTION_KEY_IDS = "EncryptionKeyArn";
process.env.AUTH_SESSION_TTL_SECS = "950400";
process.env.REGION = "eu-west-2";
process.env.GOVUKNOTIFY_PDF_TEMPLATE_ID =
  "bea2a584-4dca-4970-a90d-93977e752fdf";
process.env.GOVUKNOTIFY_REMINDER_TEMPLATE_ID =
  "1490de9b-d986-4404-b260-ece7f1837115";
process.env.GOVUKNOTIFY_DYNAMIC_REMINDER_TEMPLATE_ID =
  "1490de9b-d986-4404-b260-ece7f1837116";
process.env.YOTISDK = "1f9edc97-c60c-40d7-becb-c1c6a2ec4963";
process.env.YOTIBASEURL = "https://XXX-proxy.review-o.dev.account.gov.uk/yoti";
process.env.YOTI_KEY_SSM_PATH = "/dev/YOTI/PRIVATEKEY";
process.env.GOVUKNOTIFY_API_KEY_SSM_PATH = "/dev/f2f-gov-notify/lsdkgl";
process.env.PERSON_IDENTITY_TABLE_NAME = "PERSONIDENTITYTABLE";
process.env.YOTICALLBACKURL = "www.test.com/callback";
process.env.GOVUKNOTIFY_BACKOFF_PERIOD_MS = "10";
process.env.GOVUKNOTIFY_API = "https://test-govnotify-stub";

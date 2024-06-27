process.env.SESSION_TABLE = 'SESSIONTABLE'
process.env.KMS_KEY_ARN = 'MYKMSKEY'
process.env.DNSSUFFIX = "DNSSUFFIX"
process.env.ISSUER = 'https://XXX-c.env.account.gov.uk'
process.env.TXMA_QUEUE_URL = "MYQUEUE"
process.env.CLIENT_CONFIG = '[{"jwksEndpoint":"https://api.identity.account.gov.uk/.well-known/jwks.json","clientId":"ipv-core-stub","redirectUri":"http://localhost:8085/callback","YotiBaseUrl": "https://XXX-proxy.review-o.dev.account.gov.uk/yoti","GovNotifyApi": "https://test-govnotify-stub"}]'
process.env.ENCRYPTION_KEY_IDS = 'EncryptionKeyArn'
process.env.AUTH_SESSION_TTL_SECS = '1382400'
process.env.REGION = 'eu-west-2'
process.env.GOVUKNOTIFY_PDF_TEMPLATE_ID = "bea2a584-4dca-4970-a90d-93977e752fdf"
process.env.GOVUKNOTIFY_REMINDER_TEMPLATE_ID = "1490de9b-d986-4404-b260-ece7f1837115"
process.env.GOVUKNOTIFY_DYNAMIC_REMINDER_TEMPLATE_ID = "1490de9b-d986-4404-b260-ece7f1837116"
process.env.YOTISDK = "1f9edc97-c60c-40d7-becb-c1c6a2ec4963"
process.env.YOTI_KEY_SSM_PATH = "/dev/YOTI/PRIVATEKEY"
process.env.GOVUKNOTIFY_API_KEY_SSM_PATH = "/dev/f2f-gov-notify/lsdkgl"
process.env.PERSON_IDENTITY_TABLE_NAME = "PERSONIDENTITYTABLE"
process.env.YOTICALLBACKURL = "www.test.com/callback";
process.env.GOVUKNOTIFY_BACKOFF_PERIOD_MS = "10";
process.env.REMINDER_EMAIL_GOVUKNOTIFY_API = "https://test-govnotify-stub";
process.env.USE_MOCKED = "true";
process.env.YOTI_SESSION_TTL_DAYS = "10";
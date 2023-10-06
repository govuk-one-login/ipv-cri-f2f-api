import { ISessionItem, IF2fSession } from '../../../models/ISessionItem';

describe('ISessionItem', () => {
  it('should create an instance of ISessionItem with the provided values', () => {
    const sessionId = 'testSessionId';
    const clientId = 'testClientId';
    const clientSessionId = 'testClientSessionId';
    const redirectUri = 'testRedirectUri';
    const expiryDate = 1234567890;
    const createdDate = 123456789;
    const state = 'testState';
    const subject = 'testSubject';
    const persistentSessionId = 'testPersistentSessionId';
    const clientIpAddress = 'testClientIpAddress';
    const attemptCount = 1;
    const authSessionState = 'testAuthSessionState';

    const sessionItem: ISessionItem = {
      sessionId,
      clientId,
      clientSessionId,
      redirectUri,
      expiryDate,
      createdDate,
      state,
      subject,
      persistentSessionId,
      clientIpAddress,
      attemptCount,
      authSessionState,
    };

    expect(sessionItem).toEqual({
      sessionId,
      clientId,
      clientSessionId,
      redirectUri,
      expiryDate,
      createdDate,
      state,
      subject,
      persistentSessionId,
      clientIpAddress,
      attemptCount,
      authSessionState,
    });
  });

  it('should create an instance of ISessionItem with optional fields', () => {
    const sessionId = 'testSessionId';
    const clientId = 'testClientId';
    const clientSessionId = 'testClientSessionId';
    const redirectUri = 'testRedirectUri';
    const expiryDate = 1234567890;
    const createdDate = 123456789;
    const state = 'testState';
    const subject = 'testSubject';
    const persistentSessionId = 'testPersistentSessionId';
    const clientIpAddress = 'testClientIpAddress';
    const attemptCount = 1;
    const authSessionState = 'testAuthSessionState';

    const sessionItem: ISessionItem = {
      sessionId,
      clientId,
      clientSessionId,
      redirectUri,
      expiryDate,
      createdDate,
      state,
      subject,
      persistentSessionId,
      clientIpAddress,
      attemptCount,
      authSessionState,
      given_names: ['John'],
      family_names: ['Doe'],
      date_of_birth: '1990-01-01',
      document_selected: 'Passport',
      date_of_expiry: '2025-12-31',
    };

    expect(sessionItem).toEqual({
      sessionId,
      clientId,
      clientSessionId,
      redirectUri,
      expiryDate,
      createdDate,
      state,
      subject,
      persistentSessionId,
      clientIpAddress,
      attemptCount,
      authSessionState,
      given_names: ['John'],
      family_names: ['Doe'],
      date_of_birth: '1990-01-01',
      document_selected: 'Passport',
      date_of_expiry: '2025-12-31',
    });
  });
});

describe('IF2fSession', () => {
  it('should create an instance of IF2fSession with optional fields', () => {
    const f2fSession: IF2fSession = {
      given_names: ['John'],
      family_names: ['Doe'],
      date_of_birth: '1990-01-01',
      document_selected: 'Passport',
      date_of_expiry: '2025-12-31',
    };

    expect(f2fSession).toEqual({
      given_names: ['John'],
      family_names: ['Doe'],
      date_of_birth: '1990-01-01',
      document_selected: 'Passport',
      date_of_expiry: '2025-12-31',
    });
  });
});

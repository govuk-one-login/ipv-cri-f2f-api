import {
  PersonIdentityNamePart,
  PersonIdentityName,
  PersonIdentityAddress,
  PersonIdentityDateOfBirth,
  PersonEmailAddress,
  PersonIdentityItem,
  SharedClaimsPersonIdentity,
} from '../../../models/PersonIdentityItem'

describe('PersonIdentityNamePart', () => {
  it('should create an instance of PersonIdentityNamePart with the provided values', () => {
    const type = 'testType';
    const value = 'testValue';

    const namePart: PersonIdentityNamePart = {
      type,
      value,
    };

    expect(namePart).toEqual({
      type,
      value,
    });
  });
});

describe('PersonIdentityName', () => {
  it('should create an instance of PersonIdentityName with the provided values', () => {
    const nameParts: PersonIdentityNamePart[] = [
      { type: 'first_name', value: 'John' },
      { type: 'last_name', value: 'Doe' },
    ];

    const name: PersonIdentityName = {
      nameParts,
    };

    expect(name).toEqual({
      nameParts,
    });
  });
});

describe('PersonIdentityAddress', () => {
  it('should create an instance of PersonIdentityAddress with the provided values', () => {
    const address: PersonIdentityAddress = {
      uprn: 12345,
      buildingNumber: '123',
      buildingName: 'Test Building',
      streetName: 'Test Street',
      addressLocality: 'Test City',
      postalCode: '12345',
      addressCountry: 'Test Country',
    };

    expect(address).toEqual({
      uprn: 12345,
      buildingNumber: '123',
      buildingName: 'Test Building',
      streetName: 'Test Street',
      addressLocality: 'Test City',
      postalCode: '12345',
      addressCountry: 'Test Country',
    });
  });
});

describe('PersonIdentityDateOfBirth', () => {
  it('should create an instance of PersonIdentityDateOfBirth with the provided value', () => {
    const value = '1990-01-01';

    const dateOfBirth: PersonIdentityDateOfBirth = {
      value,
    };

    expect(dateOfBirth).toEqual({
      value,
    });
  });
});

describe('PersonEmailAddress', () => {
  it('should create an instance of PersonEmailAddress with the provided value', () => {
    const value = 'test@example.com';

    const emailAddress: PersonEmailAddress = {
      value,
    };

    expect(emailAddress).toEqual({
      value,
    });
  });
});

describe('PersonIdentityItem', () => {
  it('should create an instance of PersonIdentityItem with the provided values', () => {
    const sessionId = 'testSessionId';
    const addresses: PersonIdentityAddress[] = [];
    const name: PersonIdentityName[] = [];
    const birthDate: PersonIdentityDateOfBirth[] = [];
    const emailAddress = 'test@example.com';
    const expiryDate = 1234567890;
    const createdDate = 123456789;

    const identityItem: PersonIdentityItem = {
      sessionId,
      addresses,
      name,
      birthDate,
      emailAddress,
      expiryDate,
      createdDate,
    };

    expect(identityItem).toEqual({
      sessionId,
      addresses,
      name,
      birthDate,
      emailAddress,
      expiryDate,
      createdDate,
    });
  });
});

describe('SharedClaimsPersonIdentity', () => {
  it('should create an instance of SharedClaimsPersonIdentity with the provided values', () => {
    const sessionId = 'testSessionId';
    const address: PersonIdentityAddress[] = [];
    const name: PersonIdentityName[] = [];
    const birthDate: PersonIdentityDateOfBirth[] = [];
    const emailAddress = 'test@example.com';

    const sharedClaimsIdentity: SharedClaimsPersonIdentity = {
      sessionId,
      address,
      name,
      birthDate,
      emailAddress,
    };

    expect(sharedClaimsIdentity).toEqual({
      sessionId,
      address,
      name,
      birthDate,
      emailAddress,
    });
  });
});

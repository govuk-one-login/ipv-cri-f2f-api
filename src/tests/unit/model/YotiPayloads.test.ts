import {
  StructuredPostalAddress,
  ApplicantProfile,
  PostOfficeInfo,
  CreateSessionPayload,
  YotiSessionInfo,
  YotiCompletedSession,
  YotiCheckRecommendation,
  YotiDocumentFields,
  YotiDocumentFieldsAddressInfo,
} from '../../../models/YotiPayloads';

describe('StructuredPostalAddress', () => {
  it('should create an instance of StructuredPostalAddress with the provided values', () => {
    const address_format = 1;
    const building_number = '123';
    const address_line1 = 'Test Address';
    const town_city = 'Test City';
    const postal_code = '12345';
    const country_iso = 'US';
    const country = 'United States';

    const postalAddress: StructuredPostalAddress = {
      address_format,
      building_number,
      address_line1,
      town_city,
      postal_code,
      country_iso,
      country,
    };

    expect(postalAddress).toEqual({
      address_format,
      building_number,
      address_line1,
      town_city,
      postal_code,
      country_iso,
      country,
    });
  });
});

describe('ApplicantProfile', () => {
  it('should create an instance of ApplicantProfile with the provided values', () => {
    const full_name = 'John Doe';
    const date_of_birth = '1990-01-01';
    const structured_postal_address: StructuredPostalAddress = {
      address_format: 1,
      building_number: '123',
      address_line1: 'Test Address',
      town_city: 'Test City',
      postal_code: '12345',
      country_iso: 'US',
      country: 'United States',
    };

    const applicantProfile: ApplicantProfile = {
      full_name,
      date_of_birth,
      structured_postal_address,
    };

    expect(applicantProfile).toEqual({
      full_name,
      date_of_birth,
      structured_postal_address,
    });
  });
});

describe('PostOfficeInfo', () => {
  it('should create an instance of PostOfficeInfo with the provided values', () => {
    const name = 'Test Post Office';
    const address = '123 Main Street';
    const post_code = '12345';
    const location = {
      latitude: 40.7128,
      longitude: -74.0060,
    };

    const postOfficeInfo: PostOfficeInfo = {
      name,
      address,
      post_code,
      location,
    };

    expect(postOfficeInfo).toEqual({
      name,
      address,
      post_code,
      location,
    });
  });

  it('should create an instance of PostOfficeInfo without name', () => {
    const address = '123 Main Street';
    const post_code = '12345';
    const location = {
      latitude: 40.7128,
      longitude: -74.0060,
    };

    const postOfficeInfo: PostOfficeInfo = {
      address,
      post_code,
      location,
    };

    expect(postOfficeInfo).toEqual({
      address,
      post_code,
      location,
    });
  });
});

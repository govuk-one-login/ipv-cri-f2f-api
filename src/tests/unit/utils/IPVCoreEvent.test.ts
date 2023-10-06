import { buildCoreEventFields, IPVCoreEvent } from '../../../utils/IPVCoreEvent';

describe('buildCoreEventFields', () => {
  it('should build a core event with the provided values', () => {
    const sub = 'testSub';
    const state = 'testState';
    const jwt = 'testJWT';

    const result: IPVCoreEvent = buildCoreEventFields(sub, state, jwt);

    expect(result).toEqual({
      sub,
      state,
      'https://vocab.account.gov.uk/v1/credentialJWT': [jwt],
    });
  });
});

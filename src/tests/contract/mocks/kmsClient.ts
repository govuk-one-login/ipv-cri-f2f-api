const dummySignArr = [48, 69, 2, 32, 40, 41, 115, 198, 65, 212, 223, 151, 36, 229, 103, 36, 238, 49, 2, 206, 221, 63, 76, 9, 34, 203, 136, 151, 70, 181, 32, 253, 167, 237, 14, 13, 2, 33, 10, 174, 82, 146, 206, 11, 64, 103, 111, 238, 251, 151, 36, 229, 133, 36, 238, 162, 209, 16, 110, 160, 117, 97, 154, 149, 221, 127, 210, 162, 209, 16, 110];

//const randomIntArrayInRange  =  Array.from( { length: 71 }, () => Math.floor(Math.random() * (238 - 2 + 1)) + 2 );


export const mockKmsClient = {
	send: () => "Success",
	sign: () => { return { Signature: new Uint8Array(dummySignArr) }; },	
	verify: () => { return { SignatureValid: true }; },
	verifyWithJwks: () => (console.log("Inside verifyWithJwks"), { DummyJWTBody: "DummyJWTBody" })
};


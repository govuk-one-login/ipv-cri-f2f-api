export const VALID_PUT_INSTRUCTIONS_RESPONSE = {
    "contact_profile": {
    "first_name": "John",
        "last_name": "Doe",
        "email": "john.doe@gmail.com"
},
    "documents": [
    {
        "requirement_id": "someIdDocumentRequirementId",
        "document": {
            "type": "ID_DOCUMENT",
            "country_code": "GBR",
            "document_type": "PASSPORT"
        }
    },
    {
        "requirement_id": "someSupplementaryDocumentRequirementId",
        "document": {
            "type": "SUPPLEMENTARY_DOCUMENT",
            "country_code": "USA",
            "document_type": "UTILITY_BILL"
        }
    }
],
    "branch": {
    "type": "UK_POST_OFFICE",
        "fad_code": 1234567,
        "name": "UK Post Office Branch",
        "address": "123 Post Office Road, London",
        "post_code": "ABC 123",
        "location": {
        "latitude": 0.34322,
            "longitude": -42.48372
    }
}
}

export enum DocumentMapping {
	UK_DL = "00",
	UK_PASSPORT = "01",
	NON_UK_PASSPORT = "02",
	EU_DL = "04",
	EEA_ID = "05",
}

export const UK_DL_MEDIA_ID: string = '0000'

export const UK_DL_WRONG_NON_SPACE_CHARS: string = '0002'

export const UK_PASSPORT_MEDIA_ID: string = '0100'

export const UK_PASSPORT_MEDIA_ID_JOYCE: string = '0129'

export const UK_PASSPORT_MEDIA_ID_PAUL: string = '0130'

export const UK_PASSPORT_MEDIA_ID_ANTHONY: string = '0131'

export const UK_PASSPORT_MEDIA_ID_SUZIE: string = '0132'

export const UK_PASSPORT_ONLY_FULLNAME_MEDIA_ID: string = '0150'

export const UK_PASSPORT_GIVEN_NAME_MEDIA_ID: string = '0151'

export const UK_PASSPORT_FAMILY_NAME_MEDIA_ID: string = '0152'

export const UK_PASSPORT_GIVEN_NAME_WRONG_SPLIT: string = '0153'

export const NON_UK_PASSPORT_MEDIA_ID: string = '0200'

export const NON_UK_PASSPORT_WRONG_SPLIT_SURNAME: string = '0206'

export const EU_DL_MEDIA_ID: string = "0400"

export const EU_DL_INCORRECT_NAME_SEQUENCE: string = '0402'

export const EEA_ID_MEDIA_ID: string = "0500"

export const UK_DL_MISSING_FORMATTED_ADDRESS_MEDIA_ID = "0003"

export const SUPPORTED_DOCUMENTS: string[] = [DocumentMapping.UK_DL, DocumentMapping.UK_PASSPORT, DocumentMapping.NON_UK_PASSPORT,
                                              DocumentMapping.EU_DL, DocumentMapping.EEA_ID] // <-- Update this Array when introducing new document types

export const IPV_INTEG_FULL_NAME_HAPPY = "Kenneth Decerqueira"
export const IPV_INTEG_FULL_NAME_JOYCE = "JOYCE BASU"
export const IPV_INTEG_FULL_NAME_PAUL = "PAUL HIRONS"
export const IPV_INTEG_FULL_NAME_ANTHONY = "ANTHONY ACHEAPONG"
export const IPV_INTEG_FULL_NAME_SUZIE = "SUZIE SHREEVE"

export const IPV_INTEG_FULL_NAME_UNHAPPY = "Linda Duff"

export const IPV_INTEG_FULL_NAME_PAUL_BUTTIVANT_UNHAPPY = "Paul BUTTIVANT"

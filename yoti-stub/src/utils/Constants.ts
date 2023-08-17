export enum DocumentMapping {
	UK_DL = "00",
	UK_PASSPORT = "01",
	NON_UK_PASSPORT = "02",
	BRP = "03",
	EU_DL = "04",
	EEA_ID = "05",
}

export const UK_DL_MEDIA_ID: string = '0000'

export const UK_PASSPORT_MEDIA_ID: string = '0100'

export const UK_PASSPORT_MEDIA_ID_JOYCE: string = '0129'

export const UK_PASSPORT_MEDIA_ID_PAUL: string = '0130'

export const UK_PASSPORT_MEDIA_ID_ANTHONY: string = '0131'

export const NON_UK_PASSPORT_MEDIA_ID: string = '0200'

export const BRP_MEDIA_ID: string = "0300"

export const EU_DL_MEDIA_ID: string = "0400"

export const EEA_ID_MEDIA_ID: string = "0500"

export const SUPPORTED_DOCUMENTS: string[] = [DocumentMapping.UK_DL, DocumentMapping.UK_PASSPORT, DocumentMapping.NON_UK_PASSPORT,
                                              DocumentMapping.BRP, DocumentMapping.EU_DL, DocumentMapping.EEA_ID] // <-- Update this Array when introducing new doucment types

export const IPV_INTEG_FULL_NAME_HAPPY = "Kenneth Decerqueira"
export const IPV_INTEG_FULL_NAME_JOYCE = "JOYCE BASU"
export const IPV_INTEG_FULL_NAME_PAUL = "PAUL HIRONS"
export const IPV_INTEG_FULL_NAME_ANTHONY = "ANTHONY ACHEAPONG"

export const IPV_INTEG_FULL_NAME_UNHAPPY = "Linda Duff"

export const IPV_INTEG_FULL_NAME_PAUL_BUTTIVANT_UNHAPPY = "Paul BUTTIVANT"

export enum DocumentMapping {
	UK_DL = "00",
	UK_PASSOPORT = "01",
	NON_UK_PASSPORT = "02",
}

export const UK_DL_MEDIA_ID: string = '0000'

export const UK_PASSPORT_MEDIA_ID: string = '0100'

export const NON_UK_PASSPORT_MEDIA_ID: string = '0200'

export const SUPPORTED_DOCUMENTS: string[] = [DocumentMapping.UK_DL, DocumentMapping.UK_PASSOPORT, DocumentMapping.NON_UK_PASSPORT] // <-- Update this Array when introducing new doucment types
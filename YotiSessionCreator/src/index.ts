import { YotiService } from './services/YotiService';

const yotiService = new YotiService(process.env);

const createYotiSession = async () => {
   const id = await yotiService.createSession();
   const info = await yotiService.fetchSessionInfo(id);
   const requirements = info
      .parsedResponse
      .capture
      .required_resources
      .filter((x: any) => x.type.includes('DOCUMENT'))
      .map((resource: any) => {
         if (resource.type === 'ID_DOCUMENT') {
            return {
               requirement_id: resource.id,
               document: {
                  type: resource.type,
                  country_code: resource.supported_countries[0].code,
                  document_type: resource.supported_countries[0].supported_documents[0].type
               }
            }
         } else if (resource.type === 'SUPPLEMENTARY_DOCUMENT') {
            return {
               requirement_id: resource.id,
               document: {
                  type: resource.type,
                  country_code: resource.country_codes[0],
                  document_type: resource.document_types[0]
               }
            }
         }

      });
   await yotiService.generateInstructions(id, requirements);
   await yotiService.fetchInstructionsPdf(id);
};

createYotiSession();
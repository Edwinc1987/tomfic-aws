export type CompanyStage="prospecto"|"demo"|"prueba"|"activo"|"en_riesgo"|"suspendido"|"retirado";

export type Company={
  id:string;
  name:string;
  tenantId:string;
  taxId:string;
  stage:CompanyStage;
  plan:string;
  ownerId?:string;
  nextActionAt?:string;
};

const transitions:Record<CompanyStage,CompanyStage[]>={
  prospecto:["demo","retirado"],
  demo:["prueba","activo","en_riesgo","retirado"],
  prueba:["activo","en_riesgo","retirado"],
  activo:["en_riesgo","suspendido","retirado"],
  en_riesgo:["activo","suspendido","retirado"],
  suspendido:["activo","retirado"],
  retirado:[],
};

export const canChangeCompanyStage=(from:CompanyStage,to:CompanyStage)=>from===to||transitions[from].includes(to);

export const changeCompanyStage=(company:Company,to:CompanyStage):Company=>{
  if(!canChangeCompanyStage(company.stage,to))throw new Error(`Transición inválida: ${company.stage} → ${to}`);
  return {...company,stage:to};
};

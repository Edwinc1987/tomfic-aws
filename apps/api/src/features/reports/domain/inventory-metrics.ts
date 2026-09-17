export type InventoryLine={
  theoretical:number;
  physical:number;
  unitCost:number;
  adjusted?:boolean;
};

export type InventoryMetrics={
  referencesReviewed:number;
  theoreticalUnits:number;
  physicalUnits:number;
  unitDifference:number;
  theoreticalValue:number;
  physicalValue:number;
  monetaryDifference:number;
  accuracyPercentage:number;
  variationPercentage:number|null;
  adjustmentCount:number;
  shrinkagePercentage:number|null;
};

export const calculateInventoryMetrics=(lines:InventoryLine[]):InventoryMetrics=>{
  const referencesReviewed=lines.length;
  const theoreticalUnits=lines.reduce((total,line)=>total+line.theoretical,0);
  const physicalUnits=lines.reduce((total,line)=>total+line.physical,0);
  const unitDifference=physicalUnits-theoreticalUnits;
  const theoreticalValue=lines.reduce((total,line)=>total+line.theoretical*line.unitCost,0);
  const physicalValue=lines.reduce((total,line)=>total+line.physical*line.unitCost,0);
  const monetaryDifference=physicalValue-theoreticalValue;
  const correctLines=lines.filter(line=>line.theoretical===line.physical).length;
  const accuracyPercentage=referencesReviewed?correctLines/referencesReviewed*100:0;
  const variationPercentage=theoreticalUnits?Math.abs(unitDifference)/theoreticalUnits*100:null;
  const shrinkageValue=Math.max(0,-monetaryDifference);
  const shrinkagePercentage=theoreticalValue?shrinkageValue/theoreticalValue*100:null;
  return{referencesReviewed,theoreticalUnits,physicalUnits,unitDifference,theoreticalValue,physicalValue,monetaryDifference,accuracyPercentage,variationPercentage,adjustmentCount:lines.filter(line=>line.adjusted).length,shrinkagePercentage};
};

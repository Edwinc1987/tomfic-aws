import { describe, expect, it } from "vitest";
import { calculateInventoryMetrics } from "./inventory-metrics";

describe("inventory metrics",()=>{
  it("calculates units, values and accuracy",()=>{
    const result=calculateInventoryMetrics([
      {theoretical:10,physical:10,unitCost:5},
      {theoretical:10,physical:8,unitCost:10,adjusted:true},
    ]);
    expect(result.referencesReviewed).toBe(2);
    expect(result.theoreticalUnits).toBe(20);
    expect(result.physicalUnits).toBe(18);
    expect(result.monetaryDifference).toBe(-20);
    expect(result.accuracyPercentage).toBe(50);
    expect(result.adjustmentCount).toBe(1);
    expect(result.shrinkagePercentage).toBeCloseTo(13.3333,3);
  });

  it("returns null percentages when there is no theoretical base",()=>{
    const result=calculateInventoryMetrics([]);
    expect(result.accuracyPercentage).toBe(0);
    expect(result.variationPercentage).toBeNull();
    expect(result.shrinkagePercentage).toBeNull();
  });
});

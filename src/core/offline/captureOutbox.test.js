import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { offlineDb } from "./outbox";
import { flushCaptureOutbox, queueCapture } from "./captureOutbox";

beforeEach(async()=>{
  await offlineDb.outbox.clear();
  vi.restoreAllMocks();
});

describe("capture outbox",()=>{
  it("keeps an operation pending after a network failure",async()=>{
    await queueCapture({operationId:"op-1",tenantId:"tenant-a",productId:"p-1",roundId:"r-1",quantity:2});
    vi.stubGlobal("fetch",vi.fn().mockRejectedValue(new Error("offline")));
    const result=await flushCaptureOutbox({tenantId:"tenant-a",apiUrl:"http://api.local"});
    expect(result.failed).toBe(1);
    expect((await offlineDb.outbox.get("op-1"))?.status).toBe("RETRY");
  });

  it("marks an operation done after the API acknowledges it",async()=>{
    await queueCapture({operationId:"op-2",tenantId:"tenant-a",productId:"p-1",roundId:"r-1",quantity:3});
    vi.stubGlobal("fetch",vi.fn().mockResolvedValue({ok:true,text:async()=>""}));
    const result=await flushCaptureOutbox({tenantId:"tenant-a",apiUrl:"http://api.local"});
    expect(result.done).toBe(1);
    expect((await offlineDb.outbox.get("op-2"))?.status).toBe("DONE");
  });
});

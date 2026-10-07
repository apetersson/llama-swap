import { afterEach, describe, expect, it, vi } from "vitest";
import { predictLaya, type LayaResponse } from "./layaApi";

const answer: LayaResponse = {
  model: "laya-fluiduse",
  answers: {},
  timings: { model_ms: 12, total_ms: 13, queue_ms: 0 },
};

function stubFetch(response: Response) {
  const fetchMock = vi.fn().mockResolvedValue(response);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("predictLaya", () => {
  it("posts to the selected model's upstream predict route", async () => {
    const fetchMock = stubFetch(new Response(JSON.stringify(answer), { status: 200 }));

    await predictLaya("laya-fluiduse", { state: "x", questions: {} });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe("/upstream/laya-fluiduse/predict");
  });

  it("keeps the plain laya route working", async () => {
    const fetchMock = stubFetch(new Response(JSON.stringify(answer), { status: 200 }));

    await predictLaya("laya", { state: "x", questions: {} });

    expect(fetchMock.mock.calls[0][0]).toBe("/upstream/laya/predict");
  });

  it("escapes model ids that are not path safe", async () => {
    const fetchMock = stubFetch(new Response(JSON.stringify(answer), { status: 200 }));

    await predictLaya("owner/laya v2", { state: "x", questions: {} });

    expect(fetchMock.mock.calls[0][0]).toBe("/upstream/owner%2Flaya%20v2/predict");
  });

  it("sends the request body and reports client wall-clock time", async () => {
    const fetchMock = stubFetch(new Response(JSON.stringify(answer), { status: 200 }));

    const result = await predictLaya("laya", { state: "x", questions: {} });

    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(JSON.parse(init.body as string)).toEqual({ state: "x", questions: {} });
    expect(init.method).toBe("POST");
    expect(result.timings?.client_ms).toBeGreaterThanOrEqual(0);
    expect(result.timings?.model_ms).toBe(12);
  });

  it("surfaces a failed request with its status and detail", async () => {
    stubFetch(new Response("empty questions", { status: 422 }));

    await expect(predictLaya("laya", { state: "x", questions: {} })).rejects.toThrow(
      "Laya API error: 422 - empty questions",
    );
  });
});

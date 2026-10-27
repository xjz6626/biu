import { describe, expect, it } from "vitest";

import { createWbiSignature } from "../src/services/api/wbi-signature";

describe("createWbiSignature", () => {
  it("sorts parameters and removes forbidden characters before hashing", () => {
    expect(
      createWbiSignature(
        { page: 2, keyword: "a!b", ignored: undefined },
        "abcdefghijklmnopqrstuvwxyz123456",
        1_700_000_000,
      ),
    ).toEqual({
      page: 2,
      keyword: "a!b",
      ignored: undefined,
      wts: 1_700_000_000,
      w_rid: "de071b84d1a079677e07a7b4a4ad0bdd",
    });
  });
});

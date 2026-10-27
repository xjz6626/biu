import { describe, expect, it } from "vitest";

import { parseRankReply } from "../src/services/api/rank-parser";

describe("parseRankReply", () => {
  it("parses rank, SH, OP and ED entries into sections", () => {
    const sections = parseRankReply({
      content: {
        message: [
          "榜单说明",
          "【Super Hit】",
          "SH BV1SH1234567",
          "【主榜】",
          "1 BV1RANK12345",
          "【OP/ED】",
          "OP: BV1OPEN12345",
          "ED：BV1ENDING123",
        ].join("\n"),
        jump_url: { BV1RANK12345: { title: "第一名歌曲" } },
      },
    });

    expect(sections.map(section => [section.title, section.tracks.length])).toEqual([
      ["Super Hit", 1],
      ["主榜", 1],
      ["OP/ED", 2],
    ]);
    expect(sections[1].tracks[0]).toMatchObject({ bvid: "BV1RANK12345", title: "第一名歌曲" });
  });
});

import { describe, it, expect } from "vitest";
import { filterCannedResponses, renderCannedResponse } from "@/lib/canned";

const responses = [
  { id: "1", shortcut: "refund", title: "Refund policy", body: "Our refund policy…" },
  { id: "2", shortcut: "greet", title: "Greeting", body: "Hi {{contact_name}}!" },
  { id: "3", shortcut: "ship", title: "Shipping refund times", body: "Shipping takes…" },
];

describe("filterCannedResponses", () => {
  it("returns everything for an empty query, sorted by shortcut", () => {
    expect(filterCannedResponses(responses, "").map((r) => r.id)).toEqual(["2", "1", "3"]);
  });

  it("strips a leading slash from the query", () => {
    expect(filterCannedResponses(responses, "/gre").map((r) => r.id)).toEqual(["2"]);
  });

  it("ranks shortcut-prefix matches before title matches", () => {
    // "ship" matches shortcut of #3 and the title word "Shipping…" — but "refund" appears in the
    // title of #3 too; querying "refund" must put the shortcut match (#1) first.
    expect(filterCannedResponses(responses, "refund").map((r) => r.id)).toEqual(["1", "3"]);
  });

  it("matches case-insensitively", () => {
    expect(filterCannedResponses(responses, "GRE").map((r) => r.id)).toEqual(["2"]);
  });

  it("returns an empty array when nothing matches", () => {
    expect(filterCannedResponses(responses, "zzz")).toEqual([]);
  });
});

describe("renderCannedResponse", () => {
  it("substitutes known variables", () => {
    expect(
      renderCannedResponse("Hi {{contact_name}}, {{agent_name}} here from {{workspace_name}}.", {
        contact_name: "Jane",
        agent_name: "Sam",
        workspace_name: "Acme",
      }),
    ).toBe("Hi Jane, Sam here from Acme.");
  });

  it("uses the inline fallback when the variable value is missing", () => {
    expect(renderCannedResponse("Hi {{contact_name|there}}!", {})).toBe("Hi there!");
  });

  it("substitutes an empty string for a missing variable with no fallback", () => {
    expect(renderCannedResponse("Hi {{contact_name}}!", {})).toBe("Hi !");
  });

  it("leaves unknown placeholder syntax untouched outside {{…}}", () => {
    expect(renderCannedResponse("Use {brackets} normally.", {})).toBe("Use {brackets} normally.");
  });

  it("tolerates whitespace inside the braces", () => {
    expect(renderCannedResponse("Hi {{ contact_name }}!", { contact_name: "Jane" })).toBe(
      "Hi Jane!",
    );
  });
});

import { describe, expect, it } from "vitest";
import { uz } from "../lib/i18n/uz";
import { ru } from "../lib/i18n/ru";
import { en } from "../lib/i18n/en";
import type { Dict } from "../lib/i18n/types";

/**
 * The `Dict` interface already makes a *missing* key a type error, so this
 * covers what the type system cannot see: empty values, and interpolation
 * tokens dropped in translation.
 *
 * The second one matters most. `t()` replaces `{{name}}` placeholders; a
 * translation that omits one renders the literal text with a hole in it, and
 * nothing fails loudly.
 */

type Leaf = [path: string, value: string];

function leaves(dict: Dict): Leaf[] {
  const out: Leaf[] = [];
  function walk(node: unknown, path: string) {
    if (typeof node === "string") {
      out.push([path, node]);
      return;
    }
    if (node && typeof node === "object") {
      for (const [key, value] of Object.entries(node)) {
        walk(value, path ? `${path}.${key}` : key);
      }
    }
  }
  walk(dict, "");
  return out;
}

function tokens(value: string): string[] {
  return [...value.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]).sort();
}

const dictionaries: [string, Dict][] = [
  ["uz", uz],
  ["ru", ru],
  ["en", en],
];

describe.each(dictionaries)("%s dictionary", (name, dict) => {
  it("has no empty strings", () => {
    const empty = leaves(dict)
      .filter(([, value]) => value.trim() === "")
      .map(([path]) => path);
    expect(empty, `empty values in ${name}`).toEqual([]);
  });
});

describe("interpolation tokens match the Uzbek source", () => {
  const uzLeaves = new Map(leaves(uz));

  it.each([
    ["ru", ru],
    ["en", en],
  ] as [string, Dict][])("%s keeps every {{token}}", (name, dict) => {
    const mismatched: string[] = [];

    for (const [path, value] of leaves(dict)) {
      const expected = tokens(uzLeaves.get(path) ?? "");
      const actual = tokens(value);
      if (expected.join(",") !== actual.join(",")) {
        mismatched.push(
          `${path}: expected [${expected}] got [${actual}]`
        );
      }
    }

    expect(mismatched, `token drift in ${name}`).toEqual([]);
  });
});

describe("every dictionary declares its own locale", () => {
  it.each(dictionaries)("%s", (name, dict) => {
    expect(dict.locale).toBe(name);
  });
});

import assert from "node:assert/strict";
import { test } from "node:test";
import { sourceLoader } from "./loadSource.mjs";
import { savedSchedule, section } from "./fixtures.mjs";

const {
  encodeSharedSchedule,
  decodeSharedSchedule,
  createShareUrl,
  sharedCopyName,
} = sourceLoader()("lib/sharedSchedules.ts");

test("share links round-trip Unicode and course identity without IDs or stale sections", () => {
  const plan = savedSchedule(
    section({ subject: "PWAD", title: "Peace & société 🌍" }),
    { name: "Kévin’s plan 📚" },
  );
  const url = new URL(
    createShareUrl(plan, "https://scheduler.example/app?old=value#previous"),
  );
  assert.equal(url.pathname, "/app");
  assert.equal(url.search, "");
  assert.match(url.hash, /^#share=[A-Za-z0-9_-]+$/);
  const { id, ...expected } = plan;
  assert.deepEqual(decodeSharedSchedule(url.hash.slice(7)), expected);
  assert(!url.href.includes(id));
  plan.selectedClassNumbers.push(102);
  assert.deepEqual(
    decodeSharedSchedule(url.hash.slice(7)).selectedClassNumbers,
    [101],
  );
});

test("share decoder rejects malformed, unsupported, unsafe, and oversized payloads", () => {
  const raw = (value) =>
    Buffer.from(JSON.stringify(value)).toString("base64url");
  for (const token of [
    "",
    "%%%",
    "a".repeat(32769),
    raw({}),
    raw([2, "Plan", "2272", [], []]),
    raw([1, "Plan", "../other", [], []]),
    raw([1, "Plan", "2272", [["id", "COMP"]], []]),
    raw([1, "Plan", "2272", [[null, "COMP", "110", "Intro"]], []]),
    raw([1, "Plan", "2272", [], ["101"]]),
    raw([1, "Plan", "2272", [], [Number.MAX_SAFE_INTEGER + 1]]),
    raw([1, " ", "2272", [], []]),
  ])
    assert.throws(() => decodeSharedSchedule(token), token.slice(0, 50));
});

test("share encoding excludes alternative sections and rejects mixed semesters", () => {
  const plan = savedSchedule();
  plan.selectedCourses[0].sections = [section()];
  const restored = decodeSharedSchedule(encodeSharedSchedule(plan));
  assert.equal(restored.selectedCourses[0].sections, undefined);
  plan.selectedCourses[0].term = "2269";
  assert.throws(() => encodeSharedSchedule(plan));
});

test("import names avoid case-insensitive collisions without overwriting existing plans", () => {
  const plans = [
    savedSchedule(),
    savedSchedule(undefined, { name: "Morning classes (copy)" }),
  ];
  assert.equal(
    sharedCopyName("MORNING CLASSES", plans),
    "MORNING CLASSES (copy 2)",
  );
  assert.equal(sharedCopyName("New plan", plans), "New plan");
});

import assert from "node:assert/strict";
import { test } from "node:test";
import { sourceLoader } from "./loadSource.mjs";
import { section, course } from "./fixtures.mjs";

const { generateSchedules, scheduleMetrics, sortSchedules } = sourceLoader()(
  "lib/generateSchedules.ts",
);

function meeting(start, end, days = ["Mo"]) {
  return { ...section().meetings[0], start_time: start, end_time: end, days };
}
function withSections(...sections) {
  return { ...course(sections[0]), sections };
}
function ranked(...schedules) {
  return schedules.map((sections) => ({ sections, metrics: scheduleMetrics(sections) }));
}
function numbers(schedules) {
  return schedules.map((schedule) => schedule.map((item) => item.class_number).sort((a, b) => a - b));
}

test("backtracking returns independent, conflict-free combinations without mutating inputs", async () => {
  const a = section({ meetings: [meeting("09:00", "10:00")] });
  const b = section({ class_number: 102, meetings: [meeting("11:00", "12:00")] });
  const c = section({ course_id: "002", class_number: 201, meetings: [meeting("09:30", "10:30")] });
  const d = section({ course_id: "002", class_number: 202, meetings: [meeting("10:00", "11:00")] });
  const courses = [withSections(a, b), withSections(c, d)];
  const before = structuredClone(courses);
  const result = await generateSchedules(courses);
  assert.deepEqual(numbers(result.schedules), [[101, 202], [102, 201], [102, 202]]);
  assert.equal(result.limited, false);
  assert.deepEqual(courses, before);
  assert.notEqual(result.schedules[0], result.schedules[1]);
});

test("chooses one lecture, recitation, and lab while checking every meeting", async () => {
  const lecture = section({ meetings: [meeting("09:00", "10:00"), meeting("14:00", "15:00", ["We"])] });
  const conflicting = section({ class_number: 103, component: "REC", meetings: [meeting("14:30", "15:30", ["We"])] });
  const recitation = section({ class_number: 104, component: "REC", meetings: [meeting("15:00", "16:00", ["We"])] });
  const lab = section({ class_number: 105, component: "LAB", meetings: [meeting("09:00", "10:00", ["Tu"])] });
  const result = await generateSchedules([withSections(lecture, conflicting, recitation, lab)]);
  assert.deepEqual(numbers(result.schedules), [[101, 104, 105]]);
});

test("preserves subject listing and avoids duplicate cross-listed courses and sections", async () => {
  const aaad = section({ subject: "AAAD", course_number: "200" });
  const wgst = section({ subject: "WGST", course_number: "200", class_number: 102 });
  const result = await generateSchedules([withSections(aaad, aaad, wgst), withSections(wgst)]);
  assert.deepEqual(numbers(result.schedules), [[101]]);
  assert.equal(result.schedules[0][0].subject, "AAAD");
});

test("empty choices and impossible combinations terminate with no options", async () => {
  const a = section();
  const b = section({ course_id: "002", class_number: 201 });
  assert.deepEqual((await generateSchedules([])).schedules, [[]]);
  assert.deepEqual((await generateSchedules([{ ...course(a), sections: [] }])).schedules, []);
  assert.deepEqual(await generateSchedules([withSections(a), withSections(b)]), { schedules: [], limited: false });
});

test("earliest end compares the final meeting across the entire week", () => {
  const morningWithLateFriday = [section({ meetings: [meeting("08:00", "09:00"), meeting("16:00", "17:00", ["Fr"])] })];
  const midday = [section({ class_number: 102, meetings: [meeting("11:00", "12:00")] })];
  const schedules = ranked(morningWithLateFriday, midday);
  const sorted = sortSchedules(schedules, "earliest-end");
  assert.equal(sorted[0].sections, midday);
  assert.equal(schedules[0].sections, morningWithLateFriday);
});

test("latest start compares the first meeting, including other days and components", () => {
  const afternoonWithEarlyRecitation = [
    section({ meetings: [meeting("15:00", "16:00")] }),
    section({ class_number: 103, component: "REC", meetings: [meeting("08:00", "09:00", ["Tu"])] }),
  ];
  const midday = [section({ class_number: 102, meetings: [meeting("11:00", "12:00")] })];
  assert.equal(sortSchedules(ranked(afternoonWithEarlyRecitation, midday), "latest-start")[0].sections, midday);
});

test("compactness sums only same-day gaps for every meeting day including weekends", () => {
  const sections = [section({ meetings: [
    meeting("09:00", "10:00", ["Mo", "We"]),
    meeting("11:00", "12:00", ["Mo", "We"]),
    meeting("12:00", "13:00", ["Mo"]),
    meeting("10:00", "11:00", ["Sa"]),
    meeting("11:30", "12:00", ["Sa"]),
  ] })];
  assert.deepEqual(scheduleMetrics(sections), {
    earliestStart: 540, latestEnd: 780, gapMinutes: 150,
    daysWithClasses: 3, untimedSections: 0,
  });
  const compact = [section({ class_number: 102, meetings: [meeting("14:00", "15:00"), meeting("15:00", "16:00"), meeting("08:00", "09:00", ["Tu"])] })];
  assert.equal(sortSchedules(ranked(sections, compact), "most-compact")[0].sections, compact);
});

test("overlapping or duplicate meeting intervals never inflate gaps", () => {
  const metrics = scheduleMetrics([section({ meetings: [
    meeting("09:00", "12:00"), meeting("10:00", "11:00"),
    meeting("13:00", "14:00"), meeting("13:00", "14:00"),
  ] })]);
  assert.equal(metrics.gapMinutes, 60);
});

test("unknown and invalid times rank last for every criterion without NaN metrics", () => {
  const known = [section({ meetings: [meeting("10:00", "11:00"), meeting("13:00", "14:00")] })];
  const tba = [section({ meetings: [] })];
  const partial = [section({ meetings: [meeting("11:00", "12:00"), meeting(null, null, ["We"])] })];
  const invalid = [section({ meetings: [meeting("25:00", "26:00"), meeting("12:00", "11:00"), meeting("09:00", "10:00", [])] })];
  for (const sort of ["earliest-end", "latest-start", "most-compact"]) {
    assert.equal(sortSchedules(ranked(tba, partial, invalid, known), sort)[0].sections, known);
  }
  assert.deepEqual(scheduleMetrics(invalid), {
    earliestStart: null, latestEnd: null, gapMinutes: 0,
    daysWithClasses: 0, untimedSections: 1,
  });
  assert.equal(scheduleMetrics(partial).untimedSections, 1);
});

test("search limits accurately report partial results and allow cancellation", async () => {
  const choices = withSections(section(), section({ class_number: 102 }));
  assert.deepEqual(await generateSchedules([choices], { maxSchedules: 1 }), {
    schedules: [[choices.sections[0]]], limited: true,
  });
  assert.equal((await generateSchedules([choices], { maxSchedules: 2 })).limited, false);
  assert.equal((await generateSchedules([choices], { maxAttempts: 1 })).limited, true);
  const controller = new AbortController();
  const many = withSections(...Array.from({ length: 1_000 }, (_, i) => section({ class_number: i })));
  const search = generateSchedules([many], { signal: controller.signal });
  setTimeout(() => controller.abort(), 0);
  await assert.rejects(search, { name: "AbortError" });
});

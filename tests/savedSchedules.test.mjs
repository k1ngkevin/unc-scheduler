import assert from "node:assert/strict";
import test from "node:test";
import { sourceLoader } from "./loadSource.mjs";
import { section, course, savedSchedule } from "./fixtures.mjs";

const {
  createScheduleSelection,
  parseSavedSchedules,
  parseScheduleDraft,
  restoreSchedule,
  schedulesMatch,
} = sourceLoader()("lib/savedSchedules.ts");

test("saved plans contain only course metadata and selected class numbers", () => {
  const lecture = section();
  const recitation = section({ class_number: 102, component: "REC" });
  const oldTerm = section({ term: "2269", class_number: 103 });
  const selection = createScheduleSelection(
    "2272",
    [{ ...course(lecture), sections: [lecture, recitation] }, course(oldTerm)],
    [lecture, recitation, oldTerm],
  );
  assert.deepEqual(selection, {
    term: "2272",
    selectedCourses: [course(lecture)],
    selectedClassNumbers: [101, 102],
  });
  assert(!JSON.stringify(selection).includes("available_seats"));
});

test("restoring refreshes meeting and seat data while respecting semester and cross-listed subject", () => {
  const lecture = section({ subject: "HIST" });
  const updated = section({
    subject: "HIST",
    available_seats: 1,
    meetings: [{ ...lecture.meetings[0], start_time: "11:00" }],
  });
  const recitation = section({
    subject: "HIST",
    component: "REC",
    class_number: 102,
  });
  const restored = restoreSchedule(
    savedSchedule(lecture, { selectedClassNumbers: [101, 102] }),
    [
      section({ term: "2269" }),
      section({ subject: "PWAD" }),
      updated,
      recitation,
    ],
  );
  assert.deepEqual(restored.sections, [updated, recitation]);
  assert.deepEqual(restored.courses[0].sections, [updated, recitation]);
  assert.equal(restored.sections[0].available_seats, 1);
});

test("missing sections are reported and a course without selected sections survives", () => {
  const first = section();
  const second = section({
    course_id: "002",
    course_number: "210",
    class_number: 201,
  });
  const plan = savedSchedule(first, {
    selectedCourses: [course(first), course(second)],
    selectedClassNumbers: [999],
  });
  const before = JSON.stringify(plan);
  const restored = restoreSchedule(plan, [second]);
  assert.deepEqual(restored.sections, []);
  assert.deepEqual(restored.missingClassNumbers, [999]);
  assert.equal(restored.missingCourses[0].course_id, first.course_id);
  assert.equal(restored.courses.length, 2);
  assert.equal(JSON.stringify(plan), before);
});

test("legacy full-object drafts migrate with their original term and expanded course", () => {
  const lecture = section({ term: "2269" });
  const draft = parseScheduleDraft(
    JSON.stringify({
      selectedCourses: [{ ...course(lecture), sections: [lecture] }],
      selectedSections: [lecture],
      expandedCourseIds: [lecture.course_id],
    }),
    "2272",
  );
  assert.equal(draft.term, "2269");
  assert.deepEqual(draft.selectedCourses, [course(lecture)]);
  assert.deepEqual(draft.selectedClassNumbers, [101]);
  assert.deepEqual(draft.expandedCourseIds, ["2269:001:COMP"]);
  assert.equal(draft.activeScheduleId, null);
});

test("compact drafts retain active schedule and selected IDs", () => {
  const draft = {
    ...savedSchedule(),
    activeScheduleId: "plan-1",
    expandedCourseIds: ["2272:001:COMP"],
  };
  assert.equal(
    parseScheduleDraft(JSON.stringify(draft), "2269").activeScheduleId,
    "plan-1",
  );
  assert.deepEqual(parseSavedSchedules(JSON.stringify([savedSchedule()])), [
    savedSchedule(),
  ]);
});

test("invalid saved lists are rejected rather than silently overwritten", () => {
  for (const invalid of [
    "{}",
    "not json",
    JSON.stringify([savedSchedule(), savedSchedule()]),
    JSON.stringify([
      savedSchedule(undefined, { selectedClassNumbers: ["101"] }),
    ]),
    JSON.stringify([savedSchedule(undefined, { term: "2269" })]),
  ]) {
    assert.throws(() => parseSavedSchedules(invalid));
  }
  assert.deepEqual(parseSavedSchedules(null), []);
});

test("dirty checking ignores catalog metadata and selection order", () => {
  const a = savedSchedule(undefined, { selectedClassNumbers: [101, 102] });
  const b = {
    ...a,
    selectedCourses: [{ ...a.selectedCourses[0], title: "Updated title" }],
    selectedClassNumbers: [102, 101],
  };
  assert(schedulesMatch(a, b));
  assert(!schedulesMatch(a, { ...b, selectedClassNumbers: [101] }));
  assert(!schedulesMatch(a, { ...b, term: "2269" }));
});

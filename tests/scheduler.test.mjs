import assert from "node:assert/strict";
import { beforeEach, afterEach, test } from "node:test";
import { JSDOM } from "jsdom";
import React, { act } from "react";
import { sourceLoader } from "./loadSource.mjs";
import { section, savedSchedule } from "./fixtures.mjs";

const dom = new JSDOM("<!doctype html><html><body></body></html>", {
  url: "http://localhost/",
  pretendToBeVisual: true,
});
for (const key of [
  "window",
  "document",
  "HTMLElement",
  "Element",
  "Node",
  "localStorage",
  "navigator",
]) {
  Object.defineProperty(globalThis, key, {
    value: key === "window" ? dom.window : dom.window[key],
    configurable: true,
  });
}
globalThis.getComputedStyle = dom.window.getComputedStyle.bind(dom.window);
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
globalThis.requestAnimationFrame = dom.window.requestAnimationFrame.bind(
  dom.window,
);
// jsdom does not implement native dialogs; emulate opening for DOM integration tests.
dom.window.HTMLDialogElement.prototype.showModal = function () {
  this.open = true;
};
dom.window.HTMLDialogElement.prototype.close = function () {
  this.open = false;
};
const { createRoot } = await import("react-dom/client");
const notices = [];
const toast = Object.fromEntries(
  ["success", "error", "warning"].map((kind) => [
    kind,
    (...args) => notices.push({ kind, args }),
  ]),
);
const load = sourceLoader({
  sonner: { Toaster: () => null, toast },
  "next/dynamic": { default: () => () => null, __esModule: true },
});
const Scheduler = load("components/Scheduler.tsx").default;
const { createShareUrl, decodeSharedSchedule } = load("lib/sharedSchedules.ts");
const spring = section();
const alternate = section({ class_number: 102, section: "002" });
const fall = section({
  class_number: 201,
  term: "2269",
  course_id: "002",
  subject: "MATH",
  course_number: "231",
});
const springPlan = savedSchedule(spring);
const fallPlan = savedSchedule(fall, { id: "plan-2", name: "Fall plan" });
let container;
let root;
let fetchHandler;
let originalSetItem;

function response(classes) {
  return {
    ok: true,
    json: async () => ({ classes, scraped_date: new Date().toISOString() }),
  };
}
function defaultFetch(url) {
  if (url.includes("building_code_coords"))
    return Promise.resolve({ ok: true, json: async () => ({}) });
  return Promise.resolve(
    response(url.includes("2269.json") ? [fall] : [spring, alternate]),
  );
}
function seed(schedules = [], activeScheduleId = null) {
  localStorage.setItem("savedSchedules", JSON.stringify(schedules));
  localStorage.setItem(
    "schedule",
    JSON.stringify({
      ...springPlan,
      activeScheduleId,
      expandedCourseIds: ["2272:001:COMP"],
    }),
  );
}
async function mount() {
  root = createRoot(container);
  await act(async () => root.render(React.createElement(Scheduler)));
}
function button(label) {
  const scope = container.querySelector("dialog[open]") ?? container;
  const found = [...scope.querySelectorAll("button")]
    .filter((node) => !node.hidden)
    .find(
      (node) =>
        node.getAttribute("aria-label") === label ||
        node.textContent.trim() === label,
    );
  assert(found, `Missing button: ${label}`);
  return found;
}
async function click(node) {
  assert(!node.disabled, "Cannot click a disabled control");
  await act(async () =>
    node.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true })),
  );
}
async function openSchedules() {
  if (!container.querySelector("dialog[open]"))
    await click(button("Saved schedules"));
}
async function loadPlan(name) {
  await openSchedules();
  await click(button(`Load ${name}`));
}
async function fillName(value) {
  await openSchedules();
  if (!container.querySelector("#schedule-name"))
    await click(button("Save as new"));
  const input = container.querySelector("#schedule-name");
  await act(async () => {
    Object.getOwnPropertyDescriptor(
      dom.window.HTMLInputElement.prototype,
      "value",
    ).set.call(input, value);
    input.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
  });
}
function plans() {
  return JSON.parse(localStorage.getItem("savedSchedules"));
}
function draft() {
  return JSON.parse(localStorage.getItem("schedule"));
}

beforeEach(() => {
  notices.length = 0;
  document.body.style.overflow = "";
  localStorage.clear();
  window.history.replaceState(null, "", "/");
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: undefined,
  });
  dom.window.confirm = () => true;
  fetchHandler = defaultFetch;
  globalThis.fetch = (...args) => fetchHandler(...args);
  container = document.createElement("div");
  document.body.appendChild(container);
  originalSetItem = dom.window.Storage.prototype.setItem;
});

afterEach(async () => {
  dom.window.Storage.prototype.setItem = originalSetItem;
  if (root) await act(async () => root.unmount());
  root = null;
  container.remove();
});

test("newly named schedules autosave edits and restore them on reload", async () => {
  seed();
  await mount();
  await fillName("My spring plan");
  await click(button("Save as new"));
  assert.equal(plans().length, 1);
  assert.equal(plans()[0].name, "My spring plan");
  assert.deepEqual(plans()[0].selectedClassNumbers, [101]);
  assert(!("sections" in plans()[0].selectedCourses[0]));
  const alternativeButton = [...container.querySelectorAll("button")].find(
    (node) => node.textContent.startsWith("Section 002"),
  );
  await click(alternativeButton);
  assert.deepEqual(draft().selectedClassNumbers, [102]);
  assert.deepEqual(plans()[0].selectedClassNumbers, [102]);
  assert(container.querySelector("nav").textContent.includes("My spring plan"));
  assert.equal(container.querySelector('[aria-label="Save changes"]'), null);
  await act(async () => root.unmount());
  await mount();
  assert.deepEqual(draft().selectedClassNumbers, [102]);
  assert.deepEqual(plans()[0].selectedClassNumbers, [102]);
});

test("duplicate names do not overwrite plans, and save-as creates a second entry", async () => {
  seed([springPlan], springPlan.id);
  await mount();
  await fillName("morning CLASSES");
  await click(button("Save as new"));
  assert.equal(plans().length, 1);
  assert(notices.some((notice) => notice.args[0].includes("already exists")));
  assert(
    container
      .querySelector("dialog [role=alert]")
      .textContent.includes("already exists"),
  );
  await fillName("Backup plan");
  await click(button("Save as new"));
  assert.equal(plans().length, 2);
  assert.notEqual(plans()[0].id, plans()[1].id);
});

test("loading waits for the target term, then survives a reload with its active ID", async () => {
  seed([springPlan, fallPlan], springPlan.id);
  await mount();
  let resolveFall;
  fetchHandler = (url) =>
    url.includes("2269.json")
      ? new Promise((resolve) => {
          resolveFall = resolve;
        })
      : defaultFetch(url);
  await loadPlan("Fall plan");
  assert(button("Save as new").disabled);
  assert.equal(draft().term, "2272");
  assert(container.textContent.includes("COMP 110"));
  await act(async () => resolveFall(response([fall])));
  assert.equal(draft().term, "2269");
  assert.equal(draft().activeScheduleId, fallPlan.id);
  assert.deepEqual(draft().selectedClassNumbers, [201]);
  assert(container.textContent.includes("MATH 231"));
  fetchHandler = defaultFetch;
  await act(async () => root.unmount());
  await mount();
  assert.equal(
    container.querySelector('[aria-label="Semester"]').value,
    "2269",
  );
  assert(container.querySelector("nav").textContent.includes("Fall plan"));
  assert.deepEqual(plans(), [springPlan, fallPlan]);
});

test("failed course loads keep the current draft and retry successfully", async () => {
  seed([springPlan, fallPlan], springPlan.id);
  await mount();
  fetchHandler = (url) =>
    url.includes("2269.json")
      ? Promise.resolve({ ok: false, status: 503 })
      : defaultFetch(url);
  await loadPlan("Fall plan");
  assert.equal(draft().term, "2272");
  assert.equal(draft().activeScheduleId, springPlan.id);
  assert.deepEqual(plans(), [springPlan, fallPlan]);
  fetchHandler = defaultFetch;
  assert(
    container
      .querySelector("dialog [role=alert]")
      .textContent.includes("Couldn't load"),
  );
  await click(button("Retry loading courses"));
  assert.equal(draft().term, "2269");
});

test("canceling replacement retains unsaved edits; starting a new draft preserves the named list", async () => {
  seed([springPlan, fallPlan]);
  await mount();
  await click(
    [...container.querySelectorAll("button")].find((node) =>
      node.textContent.startsWith("Section 002"),
    ),
  );
  dom.window.confirm = () => false;
  await loadPlan("Fall plan");
  assert.deepEqual(draft().selectedClassNumbers, [102]);
  dom.window.confirm = () => true;
  await click(button("New draft"));
  assert.deepEqual(draft().selectedCourses, []);
  assert.equal(draft().activeScheduleId, null);
  assert.deepEqual(plans(), [springPlan, fallPlan]);
});

test("deleting the active named plan leaves its current draft intact", async () => {
  seed([springPlan], springPlan.id);
  await mount();
  await openSchedules();
  const deleteButton = button("Delete Morning classes");
  assert(deleteButton.querySelector("svg"));
  assert.equal(deleteButton.textContent.trim(), "");
  assert(!button("Load Morning classes").contains(deleteButton));
  await click(deleteButton);
  assert.deepEqual(plans(), []);
  assert.deepEqual(draft().selectedClassNumbers, [101]);
  assert.equal(draft().activeScheduleId, null);
  assert(container.querySelector("dialog").open);
});

test("failed named writes report an error without changing the list or active ID", async () => {
  seed([springPlan], springPlan.id);
  await mount();
  dom.window.Storage.prototype.setItem = function (key, value) {
    if (key === "savedSchedules")
      throw new dom.window.DOMException("Full", "QuotaExceededError");
    originalSetItem.call(this, key, value);
  };
  await fillName("Backup plan");
  await click(button("Save as new"));
  assert.deepEqual(plans(), [springPlan]);
  assert.equal(draft().activeScheduleId, springPlan.id);
  assert(
    container
      .querySelector("dialog [role=alert]")
      .textContent.includes("Couldn't save"),
  );
  assert(
    notices.some(
      (notice) => notice.args[0] === "Couldn't save schedules in this browser",
    ),
  );
});

test("missing sections warn without rewriting the saved snapshot", async () => {
  seed([springPlan], springPlan.id);
  fetchHandler = (url) =>
    url.includes("2272.json")
      ? Promise.resolve(response([alternate]))
      : defaultFetch(url);
  await mount();
  assert.deepEqual(draft().selectedClassNumbers, []);
  assert.deepEqual(plans(), [springPlan]);
  assert(
    notices.some(
      (notice) =>
        notice.kind === "warning" && notice.args[1].description.includes("101"),
    ),
  );
});

test("corrupt saved lists are retained and saving is disabled", async () => {
  seed();
  localStorage.setItem("savedSchedules", "not valid json");
  await mount();
  assert.equal(localStorage.getItem("savedSchedules"), "not valid json");
  await openSchedules();
  assert(button("Save as new").disabled);
  assert(
    notices.some(
      (notice) => notice.args[0] === "Couldn't read saved schedules",
    ),
  );
});

test("unmounting during a load aborts the request and preserves the last draft", async () => {
  seed([springPlan, fallPlan], springPlan.id);
  await mount();
  let requestSignal;
  let resolveFall;
  fetchHandler = (url, options) =>
    url.includes("2269.json")
      ? new Promise((resolve) => {
          requestSignal = options.signal;
          resolveFall = resolve;
        })
      : defaultFetch(url);
  await loadPlan("Fall plan");
  await act(async () => root.unmount());
  root = null;
  assert(requestSignal.aborted);
  await act(async () => resolveFall(response([fall])));
  assert.equal(draft().term, "2272");
});

test("retry asks before replacing edits made after a failed load", async () => {
  seed([springPlan, fallPlan]);
  await mount();
  fetchHandler = (url) =>
    url.includes("2269.json")
      ? Promise.resolve({ ok: false, status: 503 })
      : defaultFetch(url);
  await loadPlan("Fall plan");
  await click(button("Close saved schedules"));
  await click(
    [...container.querySelectorAll("button")].find((node) =>
      node.textContent.startsWith("Section 002"),
    ),
  );
  fetchHandler = defaultFetch;
  dom.window.confirm = () => false;
  await click(button("Retry loading courses"));
  assert.deepEqual(draft().selectedClassNumbers, [102]);
  assert.equal(draft().term, "2272");
});

test("changing semesters starts a separate draft instead of mixing courses", async () => {
  seed([springPlan], springPlan.id);
  await mount();
  const semester = container.querySelector('[aria-label="Semester"]');
  await act(async () => {
    semester.value = "2269";
    semester.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
  });
  assert.equal(draft().term, "2269");
  assert.deepEqual(draft().selectedCourses, []);
  assert.deepEqual(draft().selectedClassNumbers, []);
  assert.equal(draft().activeScheduleId, null);
  assert.deepEqual(plans(), [springPlan]);
});

test("top-bar modal frees the sidebar and restores focus and scrolling after Escape", async () => {
  seed([springPlan], springPlan.id);
  await mount();
  assert.equal(container.querySelector("dialog"), null);
  assert(
    !container.querySelector("aside").textContent.includes("Saved schedules"),
  );
  const opener = button("Saved schedules");
  assert(opener.closest("nav"));
  opener.focus();
  document.body.style.overflow = "auto";
  await click(opener);
  const dialog = container.querySelector("dialog");
  assert(dialog.open);
  assert.equal(
    dialog.getAttribute("aria-labelledby"),
    "saved-schedules-heading",
  );
  assert.equal(document.activeElement.id, "saved-schedules-heading");
  assert.equal(document.body.style.overflow, "hidden");
  assert.equal(dialog.querySelector("#schedule-name"), null);
  await click(dialog.querySelector("h2"));
  assert(dialog.isConnected, "Clicking dialog content must not dismiss it");
  const escape = new dom.window.Event("cancel", { cancelable: true });
  await act(async () => dialog.dispatchEvent(escape));
  assert.equal(container.querySelector("dialog"), null);
  assert.equal(document.activeElement, opener);
  assert.equal(document.body.style.overflow, "auto");
});

test("backdrop and close button dismiss the modal, and naming can be canceled", async () => {
  seed();
  await mount();
  await openSchedules();
  await click(button("Save as new"));
  assert.equal(document.activeElement.id, "schedule-name");
  await click(button("Cancel"));
  await act(
    async () => new Promise((resolve) => requestAnimationFrame(resolve)),
  );
  assert.equal(container.querySelector("#schedule-name"), null);
  assert.equal(document.activeElement, button("Save as new"));
  await click(container.querySelector("dialog"));
  assert.equal(container.querySelector("dialog"), null);
  await openSchedules();
  await click(button("Close saved schedules"));
  assert.equal(container.querySelector("dialog"), null);
  assert.equal(document.body.style.overflow, "");
});

test("Save on an unnamed draft opens the name form and closes on success", async () => {
  seed();
  await mount();
  const opener = button("Save schedule");
  opener.focus();
  await click(opener);
  assert.equal(document.activeElement.id, "schedule-name");
  await fillName("New plan");
  await click(button("Save as new"));
  assert.equal(container.querySelector("dialog"), null);
  assert.equal(plans()[0].name, "New plan");
  assert(container.querySelector("nav").textContent.includes("New plan"));
  assert.equal(document.activeElement, button("Saved schedules"));
});

test("saved schedules remain accessible in Map view and close after loading", async () => {
  seed([springPlan, fallPlan], springPlan.id);
  await mount();
  await click(button("Map"));
  await openSchedules();
  assert(container.querySelector("dialog").open);
  const scheduleCard = button("Load Fall plan");
  assert(scheduleCard.textContent.includes("Fall plan"));
  assert(!scheduleCard.textContent.includes("Load"));
  await click(scheduleCard.querySelector("span"));
  assert.equal(container.querySelector("dialog"), null);
  assert.equal(button("Calendar").getAttribute("aria-pressed"), "true");
  assert.equal(draft().term, "2269");
});

test("course and section additions and removals autosave only the active plan", async () => {
  seed([springPlan, fallPlan], springPlan.id);
  await mount();
  const firstSection = () =>
    [...container.querySelectorAll("button")].find((node) =>
      node.textContent.startsWith("Section 001"),
    );
  await click(firstSection());
  assert.deepEqual(plans()[0].selectedClassNumbers, []);
  await click(firstSection());
  assert.deepEqual(plans()[0].selectedClassNumbers, [101]);
  await click(button("Remove COMP 110"));
  assert.deepEqual(plans()[0].selectedCourses, []);
  assert.deepEqual(plans()[0].selectedClassNumbers, []);
  const input = container.querySelector("#course-search");
  await act(async () => {
    Object.getOwnPropertyDescriptor(
      dom.window.HTMLInputElement.prototype,
      "value",
    ).set.call(input, "COMP 110");
    input.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
  });
  await click(button("Add COMP 110: Introduction to Programming"));
  assert.equal(plans()[0].selectedCourses.length, 1);
  assert.deepEqual(plans()[0].selectedClassNumbers, []);
  assert.deepEqual(plans()[1], fallPlan);
});

test("autosaved edits survive immediately switching to another plan without a prompt", async () => {
  seed([springPlan, fallPlan], springPlan.id);
  await mount();
  dom.window.confirm = () => {
    throw new Error("An autosaved plan must not require a discard prompt");
  };
  await click(
    [...container.querySelectorAll("button")].find((node) =>
      node.textContent.startsWith("Section 002"),
    ),
  );
  await loadPlan("Fall plan");
  assert.equal(draft().activeScheduleId, fallPlan.id);
  assert.deepEqual(plans()[0].selectedClassNumbers, [102]);
  assert.deepEqual(plans()[1], fallPlan);
  await loadPlan("Morning classes");
  assert.deepEqual(draft().selectedClassNumbers, [102]);
});

test("failed autosaves retain the previous plan and current edits, with a working retry", async () => {
  seed([springPlan], springPlan.id);
  await mount();
  dom.window.Storage.prototype.setItem = function (key, value) {
    if (key === "savedSchedules")
      throw new dom.window.DOMException("Full", "QuotaExceededError");
    originalSetItem.call(this, key, value);
  };
  await click(
    [...container.querySelectorAll("button")].find((node) =>
      node.textContent.startsWith("Section 002"),
    ),
  );
  assert.deepEqual(plans(), [springPlan]);
  assert.deepEqual(draft().selectedClassNumbers, [102]);
  assert(container.querySelector('[aria-label="Save changes"]'));
  assert(
    notices.some(
      (notice) => notice.args[0] === "Couldn't save schedules in this browser",
    ),
  );
  dom.window.Storage.prototype.setItem = originalSetItem;
  await click(button("Save changes"));
  assert.deepEqual(plans()[0].selectedClassNumbers, [102]);
  assert.equal(container.querySelector('[aria-label="Save changes"]'), null);
});

test("hovering a section previews it without autosaving", async () => {
  seed([springPlan], springPlan.id);
  await mount();
  const before = localStorage.getItem("savedSchedules");
  const alternative = [...container.querySelectorAll("button")].find((node) =>
    node.textContent.startsWith("Section 002"),
  );
  const hover = new dom.window.MouseEvent("pointerover", { bubbles: true });
  Object.defineProperty(hover, "pointerType", { value: "mouse" });
  await act(async () => alternative.dispatchEvent(hover));
  assert(container.textContent.includes("Preview"));
  assert.equal(localStorage.getItem("savedSchedules"), before);
  assert.deepEqual(draft().selectedClassNumbers, [101]);
});

test("sharing copies a fixed snapshot and supports manual copy when clipboard is unavailable", async () => {
  seed([springPlan], springPlan.id);
  await mount();
  const before = draft();
  const beforePlans = plans();
  const shareButton = button("Share schedule");
  shareButton.focus();
  await click(shareButton);
  const input = container.querySelector("#schedule-share-link");
  const link = input.value;
  assert.deepEqual(
    decodeSharedSchedule(new URL(link).hash.slice(7)).selectedClassNumbers,
    [101],
  );
  let copied;
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: {
      writeText: async (value) => {
        copied = value;
      },
    },
  });
  await click(button("Copy link"));
  assert.equal(copied, link);
  assert(
    container.querySelector("dialog").textContent.includes("Link copied!"),
  );
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: {
      writeText: async () => {
        throw new Error("Denied");
      },
    },
  });
  await click(button("Copy link"));
  assert.equal(document.activeElement, input);
  assert.equal(input.selectionEnd, link.length);
  assert(
    container
      .querySelector("dialog")
      .textContent.includes("Copy the selected link"),
  );
  await click(button("Close share dialog"));
  assert.equal(document.activeElement, shareButton);
  assert.deepEqual(draft(), before);
  assert.deepEqual(plans(), beforePlans);
  await click(
    [...container.querySelectorAll("button")].find((node) =>
      node.textContent.startsWith("Section 002"),
    ),
  );
  assert.deepEqual(
    decodeSharedSchedule(new URL(link).hash.slice(7)).selectedClassNumbers,
    [101],
  );
  await click(button("Share schedule"));
  assert.deepEqual(
    decodeSharedSchedule(
      new URL(container.querySelector("#schedule-share-link").value).hash.slice(
        7,
      ),
    ).selectedClassNumbers,
    [102],
  );
});

test("shared previews load their own semester and save a separate copy without replacing the draft", async () => {
  seed([springPlan, fallPlan], springPlan.id);
  const before = draft();
  window.history.replaceState(
    null,
    "",
    createShareUrl(fallPlan, window.location.href),
  );
  await mount();
  const dialog = container.querySelector("dialog[open]");
  assert(dialog.textContent.includes("Fall 2026"));
  assert(dialog.textContent.includes("MATH 231"));
  assert.equal(document.body.style.overflow, "hidden");
  assert.deepEqual(draft(), before);
  assert.equal(plans().length, 2);
  await click(button("Save a copy"));
  assert.equal(container.querySelector("dialog"), null);
  assert.equal(window.location.hash, "");
  assert.equal(document.body.style.overflow, "");
  assert.equal(plans().length, 3);
  const copy = plans()[2];
  assert.notEqual(copy.id, fallPlan.id);
  assert.equal(copy.name, "Fall plan (copy)");
  assert.deepEqual(copy.selectedClassNumbers, [201]);
  assert.equal(draft().activeScheduleId, springPlan.id);
  assert.deepEqual(draft().selectedClassNumbers, before.selectedClassNumbers);
  await loadPlan(copy.name);
  assert.equal(draft().activeScheduleId, copy.id);
  assert.equal(draft().term, "2269");
});

test("invalid share links show an error and never modify saved schedules", async () => {
  seed([springPlan], springPlan.id);
  const before = plans();
  window.history.replaceState(null, "", "/#share=broken-link");
  await mount();
  assert(
    container
      .querySelector("dialog [role=alert]")
      .textContent.includes("invalid or unsupported"),
  );
  assert.deepEqual(plans(), before);
  assert.equal(container.querySelector("dialog button").textContent.trim(), "");
  await act(async () =>
    container
      .querySelector("dialog")
      .dispatchEvent(new dom.window.Event("cancel", { cancelable: true })),
  );
  assert.equal(container.querySelector("dialog"), null);
  assert.equal(window.location.hash, "");
});

test("shared course fetch failures can be retried without changing the current semester", async () => {
  seed([springPlan], springPlan.id);
  window.history.replaceState(
    null,
    "",
    createShareUrl(fallPlan, window.location.href),
  );
  fetchHandler = (url) =>
    url.includes("2269.json")
      ? Promise.resolve({ ok: false })
      : defaultFetch(url);
  await mount();
  assert(
    container
      .querySelector("dialog [role=alert]")
      .textContent.includes("Couldn't load"),
  );
  assert(button("Save a copy").disabled);
  assert.equal(draft().term, "2272");
  fetchHandler = defaultFetch;
  await click(button("Retry preview"));
  assert.equal(container.querySelector("dialog [role=alert]"), null);
  assert(!button("Save a copy").disabled);
  assert(container.querySelector("dialog").textContent.includes("MATH 231"));
  assert.equal(draft().term, "2272");
});

test("shared preview preserves missing sections and reports storage failures inside the dialog", async () => {
  seed([springPlan], springPlan.id);
  const shared = { ...fallPlan, selectedClassNumbers: [201, 999] };
  window.history.replaceState(
    null,
    "",
    createShareUrl(shared, window.location.href),
  );
  await mount();
  assert(
    container
      .querySelector("dialog")
      .textContent.includes("Missing class numbers: 999"),
  );
  dom.window.Storage.prototype.setItem = function (key, value) {
    if (key === "savedSchedules") throw new Error("Storage full");
    return originalSetItem.call(this, key, value);
  };
  await click(button("Save a copy"));
  assert(
    container
      .querySelector("dialog")
      .textContent.includes("Couldn't save this copy"),
  );
  assert.equal(plans().length, 1);
  assert.equal(draft().activeScheduleId, springPlan.id);
  dom.window.Storage.prototype.setItem = originalSetItem;
  await click(button("Save a copy"));
  assert.deepEqual(plans()[1].selectedClassNumbers, [201, 999]);
});

test("a new share hash opens a preview and dismissing it aborts its pending request", async () => {
  seed([springPlan], springPlan.id);
  await mount();
  const before = draft();
  let previewSignal;
  fetchHandler = (url, options) => {
    if (url.includes("2269.json")) {
      previewSignal = options.signal;
      return new Promise(() => {});
    }
    return defaultFetch(url);
  };
  await act(async () => {
    window.history.replaceState(
      null,
      "",
      createShareUrl(fallPlan, window.location.href),
    );
    window.dispatchEvent(new dom.window.Event("hashchange"));
  });
  assert(
    container
      .querySelector("dialog")
      .textContent.includes("Loading shared schedule"),
  );
  await click(button("Close share dialog"));
  assert(previewSignal.aborted);
  assert.deepEqual(draft(), before);
});

test("shared previews work with unavailable saved storage and list untimed sections", async () => {
  localStorage.setItem("savedSchedules", "broken JSON");
  window.history.replaceState(
    null,
    "",
    createShareUrl(fallPlan, window.location.href),
  );
  fetchHandler = (url) =>
    url.includes("2269.json")
      ? Promise.resolve(response([{ ...fall, meetings: [] }]))
      : defaultFetch(url);
  await mount();
  assert(
    container
      .querySelector("dialog")
      .textContent.includes("No meeting time listed"),
  );
  assert(button("Save a copy").disabled);
  assert.equal(localStorage.getItem("savedSchedules"), "broken JSON");
});

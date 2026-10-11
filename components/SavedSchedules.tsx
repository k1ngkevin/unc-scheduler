"use client";

import { useEffect, useRef, useState } from "react";
import { TrashIcon, XMarkIcon } from "@heroicons/react/24/outline";
import type { SavedSchedule } from "@/lib/types";

type SavedSchedulesProps = {
  schedules: SavedSchedule[];
  activeScheduleId: string | null;
  hasChanges: boolean;
  disabled: boolean;
  canSave: boolean;
  initialMode: "list" | "save";
  loadingMessage?: string;
  errorMessage?: string;
  onRetryLoad?: () => void;
  semesterLabel: (term: string) => string;
  onSaveNew: (name: string) => boolean;
  onSaveChanges: () => void;
  onLoad: (schedule: SavedSchedule) => void;
  onDelete: (schedule: SavedSchedule) => void;
  onNew: () => void;
  onClose: () => void;
};

const buttonClass =
  "rounded-sm border border-line px-3 py-2 text-xs font-medium transition-colors hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-carolina-strong disabled:cursor-not-allowed disabled:opacity-40";

export default function SavedSchedules({
  schedules,
  activeScheduleId,
  hasChanges,
  disabled,
  canSave,
  initialMode,
  loadingMessage,
  errorMessage,
  onRetryLoad,
  semesterLabel,
  onSaveNew,
  onSaveChanges,
  onLoad,
  onDelete,
  onNew,
  onClose,
}: SavedSchedulesProps) {
  const [name, setName] = useState("");
  const [showSaveForm, setShowSaveForm] = useState(initialMode === "save");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const saveNewButtonRef = useRef<HTMLButtonElement>(null);
  const activeSchedule = schedules.find(
    (schedule) => schedule.id === activeScheduleId,
  );

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const opener = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.showModal();
    headingRef.current?.focus();
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
      if (
        opener instanceof HTMLElement &&
        opener.isConnected &&
        !opener.matches(":disabled")
      )
        opener.focus();
      else document.getElementById("saved-schedules-button")?.focus();
    };
  }, []);

  useEffect(() => {
    if (showSaveForm) nameRef.current?.focus();
  }, [showSaveForm]);

  return (
    <dialog
      id="saved-schedules-dialog"
      ref={dialogRef}
      aria-labelledby="saved-schedules-heading"
      aria-describedby="saved-schedules-help"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      className="m-auto max-h-[calc(100dvh_-_2rem)] w-[calc(100%_-_2rem)] max-w-xl overflow-y-auto rounded-lg border border-line bg-surface p-0 text-ink shadow-2xl backdrop:bg-black/60"
    >
      <div>
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-line bg-surface p-4 sm:px-6">
          <div>
            <h2
              id="saved-schedules-heading"
              ref={headingRef}
              tabIndex={-1}
              className="text-lg font-semibold outline-none"
            >
              Saved schedules
            </h2>
            <p id="saved-schedules-help" className="mt-1 text-xs text-muted">
              Keep a few plans and switch between them.
            </p>
          </div>
          <button
            type="button"
            aria-label="Close saved schedules"
            onClick={onClose}
            className="rounded-sm p-1.5 text-muted hover:bg-surface-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-carolina-strong"
          >
            <XMarkIcon aria-hidden="true" className="size-5" />
          </button>
        </div>

        <div className="space-y-5 p-4 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-sm border border-line bg-surface-muted p-3">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] text-muted">Currently editing</p>
              <p className="break-words text-sm font-medium">
                {activeSchedule?.name ?? "Untitled draft"}
              </p>
              {activeSchedule && (
                <p className="mt-1 text-xs text-muted">
                  {hasChanges
                    ? "Unsaved changes"
                    : "Changes save automatically"}
                </p>
              )}
            </div>
            {activeSchedule && hasChanges && (
              <button
                type="button"
                className={buttonClass}
                disabled={disabled || !canSave || !hasChanges}
                onClick={onSaveChanges}
              >
                Save changes
              </button>
            )}
          </div>

          {loadingMessage && (
            <p role="status" className="text-sm text-muted">
              {loadingMessage}
            </p>
          )}
          {errorMessage && (
            <div
              role="alert"
              className="rounded-sm border border-line p-3 text-sm"
            >
              <p>{errorMessage}</p>
              {onRetryLoad && (
                <button
                  type="button"
                  className={`${buttonClass} mt-2`}
                  disabled={disabled}
                  onClick={onRetryLoad}
                >
                  Retry loading courses
                </button>
              )}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={buttonClass}
              disabled={disabled}
              onClick={onNew}
            >
              New draft
            </button>
            <button
              type="button"
              ref={saveNewButtonRef}
              className={buttonClass}
              disabled={disabled || !canSave}
              aria-expanded={showSaveForm}
              aria-controls="save-schedule-form"
              onClick={() => setShowSaveForm(true)}
              hidden={showSaveForm}
            >
              Save as new
            </button>
          </div>

          {showSaveForm && (
            <form
              id="save-schedule-form"
              className="rounded-sm border border-carolina bg-carolina-light p-4"
              onSubmit={(event) => {
                event.preventDefault();
                if (name.trim()) onSaveNew(name.trim());
              }}
            >
              <label
                htmlFor="schedule-name"
                className="mb-2 block text-sm font-medium"
              >
                Schedule name
              </label>
              <input
                id="schedule-name"
                ref={nameRef}
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. Morning classes"
                maxLength={80}
                required
                disabled={disabled || !canSave}
                className="w-full min-w-0 rounded-sm border border-line bg-surface px-3 py-2 text-sm outline-none placeholder:text-muted focus:border-carolina focus:ring-2 focus:ring-carolina/20 disabled:opacity-40"
              />
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="submit"
                  disabled={disabled || !canSave || !name.trim()}
                  className={`${buttonClass} border-carolina bg-carolina text-on-carolina hover:bg-carolina-strong`}
                >
                  Save as new
                </button>
                <button
                  type="button"
                  className={buttonClass}
                  onClick={() => {
                    setShowSaveForm(false);
                    setName("");
                    // Restore focus once the save button is visible again.
                    requestAnimationFrame(() =>
                      saveNewButtonRef.current?.focus(),
                    );
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {schedules.length > 0 ? (
            <ul className="space-y-3" aria-label="Saved schedules">
              {schedules.map((schedule) => (
                <li
                  key={schedule.id}
                  className={`relative rounded-sm border ${schedule.id === activeScheduleId ? "border-carolina bg-carolina-light" : "border-line"}`}
                >
                  <button
                    type="button"
                    className="block w-full rounded-sm p-3 pr-14 text-left transition-colors hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-carolina-strong disabled:cursor-not-allowed disabled:opacity-40"
                    disabled={disabled}
                    aria-label={`Load ${schedule.name}`}
                    onClick={() => onLoad(schedule)}
                  >
                    <span className="block break-words text-sm font-medium">
                      {schedule.name}
                    </span>
                    <span className="mt-1 block text-xs text-muted">
                      {semesterLabel(schedule.term)} ·{" "}
                      {schedule.selectedCourses.length} courses ·{" "}
                      {schedule.selectedClassNumbers.length} sections
                    </span>
                  </button>
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-sm p-2.5 text-muted transition-colors hover:bg-surface-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-carolina-strong disabled:cursor-not-allowed disabled:opacity-40"
                    disabled={disabled}
                    aria-label={`Delete ${schedule.name}`}
                    title={`Delete ${schedule.name}`}
                    onClick={() => onDelete(schedule)}
                  >
                    <TrashIcon aria-hidden="true" className="size-5" />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-5 text-center text-sm text-muted">
              No saved schedules yet. Save your current draft to start a
              collection.
            </p>
          )}
          <p className="text-xs leading-relaxed text-muted">
            Your draft and edits to the active named schedule save automatically
            in this browser. Use Save as new to keep a separate copy.
          </p>
        </div>
      </div>
    </dialog>
  );
}

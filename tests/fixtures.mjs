export function section(overrides = {}) {
  return {
    class_number: 101,
    course_id: "001",
    term: "2272",
    subject: "COMP",
    course_number: "110",
    section: "001",
    title: "Introduction to Programming",
    component: "LEC",
    section_type: "LEC",
    instruction_mode: "In Person",
    status: "Open",
    capacity: 20,
    enrolled: 10,
    available_seats: 10,
    min_credits: 3,
    max_credits: 3,
    instructors: [],
    meetings: [
      {
        days: ["Mo", "We"],
        start_time: "10:00",
        end_time: "10:50",
        building: "Test Hall",
        room: "100",
        building_code: null,
        facility_id: null,
      },
    ],
    ...overrides,
  };
}

export function course(item) {
  const { course_id, term, subject, course_number, title } = item;
  return { course_id, term, subject, course_number, title };
}

export function savedSchedule(item = section(), overrides = {}) {
  return {
    id: "plan-1",
    name: "Morning classes",
    term: item.term,
    selectedCourses: [course(item)],
    selectedClassNumbers: [item.class_number],
    ...overrides,
  };
}

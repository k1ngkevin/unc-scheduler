export type Instructor = {
  name: string;
  email: string;
};

export type Meeting = {
  days: string[];
  start_time: string | null;
  end_time: string | null;
  building_code: string | null;
  building: string | null;
  room: string | null;
  facility_id: string | null;
};

export type Section = {
  class_number: number;
  course_id: string;
  term: string;
  subject: string;
  course_number: string;
  section: string;
  title: string;
  component: string | null;
  section_type: string | null;
  instruction_mode: string | null;
  status: string;
  capacity: number;
  enrolled: number;
  available_seats: number;
  instructors: Instructor[];
  meetings: Meeting[];
};

export type Course = {
  course_id: string;
  term: string;
  subject: string;
  course_number: string;
  title: string;
};

export type CourseWithSections = Course & {
  section_toggle: boolean;
  sections: Section[];
};

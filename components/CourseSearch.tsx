"use client";
import { useState } from "react";
import CourseCard from "./CourseCard";

type Course = {
  id: number;
  subject: string;
  course_number: string;
  title: string;
};

export default function CourseSearch() {
  const [search, setSearch] = useState("");
  const [courses, setCourses] = useState<Course[]>([]);

  async function handleSearch() {
    const input = search.trim().toLocaleUpperCase();

    if (!input) {
      return;
    }

    const search_parts = input.split(/\s+/);
    const subject = search_parts[0];
    const number = search_parts[1];

    const params = new URLSearchParams({
      term: "2269",
      subject: subject,
    });

    if (number) {
      params.set("number", number);
    }

    const response = await fetch(`/course?${params.toString()}`);

    if (!response) {
      console.error("failed to fetch course");
      return;
    }

    const data = await response.json();
    setCourses(data);
  }

  return (
    <div>
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="COMP or COMP 110"
      ></input>

      <button onClick={handleSearch}> Search </button>
      <div>
        {courses.map((course) => (
          <CourseCard
            key={course.id}
            subject={course.subject}
            number={course.course_number}
            title={course.title}
          />
        ))}
      </div>
    </div>
  );
}

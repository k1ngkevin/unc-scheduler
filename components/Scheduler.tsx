"use client";

import { useState, useEffect } from "react";
import CourseSearch from "./CourseSearch";

export default function Scheduler() {
  const [courses, setCourses] = useState([]);

  useEffect(() => {
    async function fetchCourseData() {
      const file_name = "2269.json";
      const supabase_id = process.env.NEXT_PUBLIC_SUPABASE_PROJECT_ID;
      const api_url = `https://${supabase_id}.supabase.co/storage/v1/object/public/course-data/scraped_data/${file_name}`;
      try {
        const response = await fetch(api_url);
        if (!response.ok) {
          throw new Error(`response status: ${response.status}`);
        }

        const result = await response.json();
        setCourses(result);
      } catch (error) {
        console.error(error);
      }
    }
    fetchCourseData();
  });

  return (
    <main>
      <CourseSearch courses={courses} />
    </main>
  );
}

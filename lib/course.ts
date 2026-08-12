import {supabase} from "@/lib/supabase"

export async function fetchCourse(
  term: string,
  subject: string,
  number?: string | null,
) {
  let query = supabase
  .from("courses")
  .select(`
    *,
    sections (
      *,
      meetings (*)
      )
    `)
    .eq("term", term)
    .eq("subject", subject)
  
  if (number) {
    query = query.eq("course_number", number)
  }

  const {data, error} = await query

  if (error) {
    throw error
  }

  return data
}




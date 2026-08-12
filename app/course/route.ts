import { NextRequest } from "next/server"
import { fetchCourse } from "@/lib/course"

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams

  const term = params.get("term")
  const subject = params.get("subject")
  const number = params.get("number")

  if (!term || !subject) {
    return Response.json(
      { error: "term and subject are required parameters" },
      { status: 400 }
    )
  }

  try {
    const course = await fetchCourse(term, subject, number)
    return Response.json(course)
  } catch (error) {
    return Response.json(
      { error: "failed to get data from database" },
      { status: 500 }
    )
  }
}
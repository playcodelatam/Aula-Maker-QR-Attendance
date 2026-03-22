interface Env {
  DB: D1Database;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { DB } = context.env;
  const { results } = await DB.prepare("SELECT * FROM students ORDER BY name ASC").all();
  return new Response(JSON.stringify(results), {
    headers: { "Content-Type": "application/json" },
  });
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { DB } = context.env;
  const student = await context.request.json() as any;
  
  try {
    await DB.prepare(
      "INSERT INTO students (id, name, studentId, group_name, createdAt) VALUES (?, ?, ?, ?, ?)"
    )
    .bind(student.id, student.name, student.studentId, student.group || null, student.createdAt)
    .run();
    
    return new Response(JSON.stringify({ success: true }), { status: 201 });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 400 });
  }
};

export const onRequestDelete: PagesFunction<Env> = async (context) => {
  const { DB } = context.env;
  const url = new URL(context.request.url);
  const id = url.searchParams.get("id");
  
  if (!id) return new Response("Missing ID", { status: 400 });
  
  await DB.prepare("DELETE FROM students WHERE id = ?").bind(id).run();
  return new Response(null, { status: 204 });
};

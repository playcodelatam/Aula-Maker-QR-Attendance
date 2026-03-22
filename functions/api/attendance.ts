interface Env {
  DB: D1Database;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { DB } = context.env;
  const { results } = await DB.prepare("SELECT * FROM attendance ORDER BY timestamp DESC").all();
  return new Response(JSON.stringify(results), {
    headers: { "Content-Type": "application/json" },
  });
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { DB } = context.env;
  const record = await context.request.json() as any;
  
  try {
    await DB.prepare(
      "INSERT INTO attendance (id, studentId, timestamp, type) VALUES (?, ?, ?, ?)"
    )
    .bind(record.id, record.studentId, record.timestamp, record.type)
    .run();
    
    return new Response(JSON.stringify({ success: true }), { status: 201 });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 400 });
  }
};

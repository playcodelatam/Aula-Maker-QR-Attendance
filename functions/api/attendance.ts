interface Env {
  DB: D1Database;
  RESEND_API_KEY: string;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { DB } = context.env;
  const { results } = await DB.prepare("SELECT * FROM attendance ORDER BY timestamp DESC").all();
  return new Response(JSON.stringify(results), {
    headers: { "Content-Type": "application/json" },
  });
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { DB, RESEND_API_KEY } = context.env;
  const record = await context.request.json() as any;
  
  try {
    // 1. Save attendance record
    await DB.prepare(
      "INSERT INTO attendance (id, studentId, timestamp, type) VALUES (?, ?, ?, ?)"
    )
    .bind(record.id, record.studentId, record.timestamp, record.type)
    .run();
    
    // 2. Fetch student info for email
    const student = await DB.prepare("SELECT name, email FROM students WHERE studentId = ?")
      .bind(record.studentId)
      .first() as { name: string, email: string } | null;

    // 3. Send email if student has email registered
    if (student && student.email && RESEND_API_KEY) {
      const typeLabel = record.type === 'entry' ? 'Ingreso' : 'Salida';
      const dateStr = new Date(record.timestamp).toLocaleString('es-ES', { 
        timeZone: 'UTC',
        dateStyle: 'long',
        timeStyle: 'short'
      });

      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: 'Play Code <onboarding@resend.dev>',
          to: student.email,
          subject: `Registro de ${typeLabel} - ${student.name}`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; rounded: 16px;">
              <h2 style="color: #4f46e5;">Notificación de Asistencia</h2>
              <p>Hola <strong>${student.name}</strong>,</p>
              <p>Se ha registrado tu <strong>${typeLabel.toLowerCase()}</strong> correctamente.</p>
              <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0; color: #64748b; font-size: 14px;">Detalles del registro:</p>
                <p style="margin: 5px 0 0 0; font-size: 18px; font-weight: bold;">${dateStr}</p>
              </div>
              <p style="color: #94a3b8; font-size: 12px;">Este es un mensaje automático de Play Code Control de Asistencias.</p>
            </div>
          `
        })
      });
    }
    
    return new Response(JSON.stringify({ success: true }), { status: 201 });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 400 });
  }
};

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
          from: 'Secretaría Play Code <secretaria@playcode.com.ar>',
          to: student.email,
          subject: `🔔 ${typeLabel} Registrado: ${student.name}`,
          html: `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 500px; margin: 0 auto; padding: 30px; border: 1px solid #f1f5f9; border-radius: 20px; background-color: #ffffff; color: #1e293b;">
              <div style="text-align: center; margin-bottom: 20px;">
                <span style="font-size: 40px;">🚀</span>
              </div>
              <h2 style="text-align: center; color: #4f46e5; margin-bottom: 10px; font-size: 24px;">¡Hola, ${student.name}!</h2>
              <p style="text-align: center; font-size: 16px; line-height: 1.6; color: #475569;">
                Te informamos que se ha registrado tu <strong>${typeLabel.toLowerCase()}</strong> en el aula.
              </p>
              
              <div style="background-color: #f8fafc; padding: 20px; border-radius: 12px; margin: 25px 0; border-left: 4px solid #4f46e5; text-align: center;">
                <p style="margin: 0; color: #64748b; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em;">Fecha y Hora</p>
                <p style="margin: 8px 0 0 0; font-size: 18px; font-weight: bold; color: #1e293b;">${dateStr}</p>
              </div>
              
              <p style="text-align: center; color: #94a3b8; font-size: 12px; margin-top: 30px; border-top: 1px solid #f1f5f9; padding-top: 20px;">
                Este es un mensaje automático de <strong>Play Code Control</strong>.<br>
                No es necesario responder a este correo.
              </p>
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

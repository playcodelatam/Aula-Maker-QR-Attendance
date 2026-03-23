-- Tabla de Alumnos
CREATE TABLE IF NOT EXISTS students (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT,
    parentName TEXT,
    studentId TEXT UNIQUE NOT NULL,
    group_name TEXT,
    createdAt INTEGER NOT NULL
);

-- Tabla de Asistencia
CREATE TABLE IF NOT EXISTS attendance (
    id TEXT PRIMARY KEY,
    studentId TEXT NOT NULL,
    timestamp INTEGER NOT NULL,
    type TEXT NOT NULL,
    FOREIGN KEY (studentId) REFERENCES students(studentId)
);

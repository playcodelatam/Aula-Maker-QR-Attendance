import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { 
  Users, 
  Scan, 
  History, 
  LayoutDashboard, 
  Plus, 
  Search, 
  Bell,
  CheckCircle2,
  AlertCircle,
  X,
  UserPlus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Student, AttendanceRecord, Notification } from './types';
import { QRScanner } from './components/QRScanner';
import { StudentQR } from './components/StudentQR';
import { cn } from './utils/cn';

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'students' | 'scan' | 'history'>('dashboard');
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isAddingStudent, setIsAddingStudent] = useState(false);
  const [newStudent, setNewStudent] = useState({ name: '', studentId: '', group: '' });
  const [searchTerm, setSearchTerm] = useState('');

  // Cooldown for scanning to prevent loops
  const lastScanRef = useRef<{ code: string; time: number }>({ code: '', time: 0 });

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [studentsRes, attendanceRes] = await Promise.all([
          fetch('/api/students'),
          fetch('/api/attendance')
        ]);
        
        if (studentsRes.ok && attendanceRes.ok) {
          const studentsData = await studentsRes.json();
          const attendanceData = await attendanceRes.json();
          // Map group_name back to group for the UI
          setStudents(studentsData.map((s: any) => ({ ...s, group: s.group_name })));
          setAttendance(attendanceData);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        addNotification('Error al conectar con el servidor', 'warning');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  // Stats
  const stats = useMemo(() => {
    const today = new Date().setHours(0, 0, 0, 0);
    const todayAttendance = attendance.filter(a => a.timestamp >= today);
    const uniqueToday = new Set(todayAttendance.map(a => a.studentId)).size;
    
    return {
      totalStudents: students.length,
      todayAttendance: uniqueToday,
      lastScan: attendance.length > 0 ? attendance[attendance.length - 1] : null
    };
  }, [students, attendance]);

  const addNotification = (message: string, type: Notification['type'] = 'info') => {
    const newNotif = {
      id: Math.random().toString(36).substr(2, 9),
      message,
      timestamp: Date.now(),
      type
    };
    setNotifications(prev => [newNotif, ...prev].slice(0, 5));
    
    // Auto remove after 5s
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== newNotif.id));
    }, 5000);
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudent.name || !newStudent.studentId) return;

    if (students.find(s => s.studentId === newStudent.studentId)) {
      addNotification('El ID de alumno ya existe', 'warning');
      return;
    }

    const student: Student = {
      id: Math.random().toString(36).substr(2, 9),
      ...newStudent,
      createdAt: Date.now()
    };

    try {
      const res = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(student)
      });

      if (res.ok) {
        setStudents([...students, student]);
        setNewStudent({ name: '', studentId: '', group: '' });
        setIsAddingStudent(false);
        addNotification(`Alumno ${student.name} registrado con éxito`, 'success');
      } else {
        throw new Error('Failed to save');
      }
    } catch (error) {
      addNotification('Error al guardar el alumno', 'warning');
    }
  };

  const handleScan = useCallback(async (decodedText: string) => {
    const now = Date.now();
    // Ignore if same code scanned within 5 seconds
    if (decodedText === lastScanRef.current.code && now - lastScanRef.current.time < 5000) {
      return;
    }

    const student = students.find(s => s.studentId === decodedText);
    
    if (!student) {
      lastScanRef.current = { code: decodedText, time: now };
      addNotification('Código QR no reconocido', 'warning');
      return;
    }

    lastScanRef.current = { code: decodedText, time: now };

    const lastRecord = [...attendance].reverse().find(a => a.studentId === decodedText);
    const type: 'entry' | 'exit' = lastRecord?.type === 'entry' ? 'exit' : 'entry';

    const record: AttendanceRecord = {
      id: Math.random().toString(36).substr(2, 9),
      studentId: decodedText,
      timestamp: now,
      type
    };

    try {
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record)
      });

      if (res.ok) {
        setAttendance(prev => [...prev, record]);
        addNotification(
          `${type === 'entry' ? 'Entrada' : 'Salida'} registrada: ${student.name}`, 
          'success'
        );
        setTimeout(() => setActiveTab('dashboard'), 2000);
      }
    } catch (error) {
      addNotification('Error al registrar asistencia', 'warning');
    }
  }, [students, attendance]);

  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.studentId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 pb-20 md:pb-0 md:pl-64">
      {/* Sidebar - Desktop */}
      <aside className="fixed left-0 top-0 hidden h-full w-64 border-r border-slate-200 bg-white p-6 md:block">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white">
            <Users size={24} />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 leading-tight">Play Code<br/><span className="text-sm font-medium text-slate-500">Control de Asistencias</span></h1>
        </div>

        <nav className="space-y-2">
          <NavItem 
            active={activeTab === 'dashboard'} 
            onClick={() => setActiveTab('dashboard')}
            icon={<LayoutDashboard size={20} />}
            label="Dashboard"
          />
          <NavItem 
            active={activeTab === 'students'} 
            onClick={() => setActiveTab('students')}
            icon={<Users size={20} />}
            label="Alumnos"
          />
          <NavItem 
            active={activeTab === 'scan'} 
            onClick={() => setActiveTab('scan')}
            icon={<Scan size={20} />}
            label="Escanear QR"
          />
          <NavItem 
            active={activeTab === 'history'} 
            onClick={() => setActiveTab('history')}
            icon={<History size={20} />}
            label="Historial"
          />
        </nav>
      </aside>

      {/* Mobile Nav */}
      <nav className="fixed bottom-0 left-0 z-50 flex w-full border-t border-slate-200 bg-white p-2 md:hidden">
        <MobileNavItem 
          active={activeTab === 'dashboard'} 
          onClick={() => setActiveTab('dashboard')}
          icon={<LayoutDashboard size={20} />}
        />
        <MobileNavItem 
          active={activeTab === 'students'} 
          onClick={() => setActiveTab('students')}
          icon={<Users size={20} />}
        />
        <MobileNavItem 
          active={activeTab === 'scan'} 
          onClick={() => setActiveTab('scan')}
          icon={<Scan size={20} />}
        />
        <MobileNavItem 
          active={activeTab === 'history'} 
          onClick={() => setActiveTab('history')}
          icon={<History size={20} />}
        />
      </nav>

      {/* Header */}
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/80 px-6 backdrop-blur-md">
        <h2 className="text-lg font-semibold text-slate-900 capitalize">
          {activeTab === 'dashboard' ? 'Panel de Control' : 
           activeTab === 'students' ? 'Gestión de Alumnos' : 
           activeTab === 'scan' ? 'Escáner de Asistencia' : 'Historial de Registros'}
        </h2>
        
        <div className="relative">
          <Bell size={20} className="text-slate-500 cursor-pointer hover:text-slate-900 transition-colors" />
          {notifications.length > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
              {notifications.length}
            </span>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6">
        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                <StatCard 
                  title="Total Alumnos" 
                  value={stats.totalStudents} 
                  icon={<Users className="text-indigo-600" />} 
                />
                <StatCard 
                  title="Asistencia Hoy" 
                  value={stats.todayAttendance} 
                  icon={<CheckCircle2 className="text-emerald-600" />} 
                />
                <StatCard 
                  title="Último Registro" 
                  value={stats.lastScan ? format(stats.lastScan.timestamp, 'HH:mm') : '--:--'} 
                  icon={<History className="text-amber-600" />} 
                />
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="mb-4 text-lg font-semibold text-slate-900">Actividad Reciente</h3>
                <div className="space-y-4">
                  {attendance.slice(-5).reverse().map((record) => {
                    const student = students.find(s => s.studentId === record.studentId);
                    return (
                      <div key={record.id} className="flex items-center justify-between border-b border-slate-50 pb-4 last:border-0 last:pb-0">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "flex h-10 w-10 items-center justify-center rounded-full",
                            record.type === 'entry' ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-600"
                          )}>
                            {record.type === 'entry' ? <Plus size={18} /> : <X size={18} />}
                          </div>
                          <div>
                            <p className="font-medium text-slate-900">{student?.name || 'Alumno Desconocido'}</p>
                            <p className="text-xs text-slate-500">{record.type === 'entry' ? 'Entrada' : 'Salida'}</p>
                          </div>
                        </div>
                        <p className="text-sm font-medium text-slate-400">
                          {format(record.timestamp, "HH:mm 'hs'")}
                        </p>
                      </div>
                    );
                  })}
                  {attendance.length === 0 && (
                    <p className="text-center text-slate-400 py-8">No hay actividad registrada hoy.</p>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'students' && (
            <motion.div
              key="students"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type="text" 
                    placeholder="Buscar alumno..." 
                    className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-10 pr-4 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <button 
                  onClick={() => setIsAddingStudent(true)}
                  className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700 transition-colors"
                >
                  <UserPlus size={18} />
                  Nuevo Alumno
                </button>
              </div>

              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filteredStudents.map((student) => (
                  <div key={student.id} className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:shadow-md">
                    <div className="mb-4 flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                        <Users size={24} />
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-900">{student.name}</h4>
                        <p className="text-xs text-slate-500">{student.group || 'Sin grupo'}</p>
                      </div>
                    </div>
                    <div className="flex justify-center p-2 bg-slate-50 rounded-xl mb-4">
                      <StudentQR studentId={student.studentId} studentName={student.name} />
                    </div>
                    <button 
                      onClick={async () => {
                        if(confirm('¿Eliminar alumno?')) {
                          try {
                            await fetch(`/api/students?id=${student.id}`, { method: 'DELETE' });
                            setStudents(students.filter(s => s.id !== student.id));
                            addNotification('Alumno eliminado', 'info');
                          } catch (error) {
                            addNotification('Error al eliminar', 'warning');
                          }
                        }
                      }}
                      className="w-full py-2 text-xs font-medium text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      Eliminar Registro
                    </button>
                  </div>
                ))}
                {filteredStudents.length === 0 && (
                  <div className="col-span-full flex flex-col items-center justify-center py-20 text-slate-400">
                    <Users size={48} className="mb-4 opacity-20" />
                    <p>No se encontraron alumnos.</p>
                    <button 
                      onClick={() => setIsAddingStudent(true)}
                      className="mt-4 text-indigo-600 font-medium hover:underline"
                    >
                      Registrar el primero
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'scan' && (
            <motion.div
              key="scan"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex flex-col items-center justify-center space-y-8 py-12"
            >
              <div className="text-center">
                <h3 className="text-2xl font-bold text-slate-900">Escáner de Asistencia</h3>
                <p className="text-slate-500">Coloca el código QR frente a la cámara</p>
              </div>
              
              <QRScanner onScan={handleScan} />
              
              <div className="flex items-center gap-4 text-sm text-slate-400">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  Listo para escanear
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'history' && (
            <motion.div
              key="history"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden"
            >
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Alumno</th>
                      <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">ID</th>
                      <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Tipo</th>
                      <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Fecha y Hora</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {[...attendance].reverse().map((record) => {
                      const student = students.find(s => s.studentId === record.studentId);
                      return (
                        <tr key={record.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4">
                            <p className="font-medium text-slate-900">{student?.name || 'Desconocido'}</p>
                            <p className="text-xs text-slate-500">{student?.group}</p>
                          </td>
                          <td className="px-6 py-4 text-sm font-mono text-slate-500">{record.studentId}</td>
                          <td className="px-6 py-4">
                            <span className={cn(
                              "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                              record.type === 'entry' ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                            )}>
                              {record.type === 'entry' ? 'Entrada' : 'Salida'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-500">
                            {format(record.timestamp, "d MMM, HH:mm", { locale: es })}
                          </td>
                        </tr>
                      );
                    })}
                    {attendance.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-6 py-12 text-center text-slate-400">
                          No hay registros de asistencia todavía.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Notifications Overlay */}
      <div className="fixed right-6 top-20 z-50 flex flex-col gap-3 w-80">
        <AnimatePresence>
          {notifications.map((notif) => (
            <motion.div
              key={notif.id}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 50 }}
              className={cn(
                "flex items-start gap-3 rounded-xl p-4 shadow-lg border backdrop-blur-sm",
                notif.type === 'success' ? "bg-emerald-50 border-emerald-200 text-emerald-800" :
                notif.type === 'warning' ? "bg-amber-50 border-amber-200 text-amber-800" :
                "bg-indigo-50 border-indigo-200 text-indigo-800"
              )}
            >
              {notif.type === 'success' ? <CheckCircle2 size={18} /> : 
               notif.type === 'warning' ? <AlertCircle size={18} /> : 
               <Bell size={18} />}
              <p className="text-sm font-medium">{notif.message}</p>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Add Student Modal */}
      <AnimatePresence>
        {isAddingStudent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
            >
              <div className="mb-6 flex items-center justify-between">
                <h3 className="text-xl font-bold text-slate-900">Registrar Alumno</h3>
                <button onClick={() => setIsAddingStudent(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleAddStudent} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nombre Completo</label>
                  <input 
                    required
                    type="text" 
                    className="w-full rounded-xl border border-slate-200 p-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                    placeholder="Ej. Juan Pérez"
                    value={newStudent.name}
                    onChange={(e) => setNewStudent({...newStudent, name: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">ID / Matrícula</label>
                  <input 
                    required
                    type="text" 
                    className="w-full rounded-xl border border-slate-200 p-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                    placeholder="ID único para el QR"
                    value={newStudent.studentId}
                    onChange={(e) => setNewStudent({...newStudent, studentId: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Grupo / Clase</label>
                  <input 
                    type="text" 
                    className="w-full rounded-xl border border-slate-200 p-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                    placeholder="Ej. 3º A"
                    value={newStudent.group}
                    onChange={(e) => setNewStudent({...newStudent, group: e.target.value})}
                  />
                </div>
                <button 
                  type="submit"
                  className="w-full rounded-xl bg-indigo-600 py-3 font-bold text-white hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
                >
                  Registrar Alumno
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function NavItem({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all",
        active ? "bg-indigo-50 text-indigo-600" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function MobileNavItem({ active, onClick, icon }: { active: boolean, onClick: () => void, icon: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-1 items-center justify-center rounded-xl py-3 transition-all",
        active ? "bg-indigo-50 text-indigo-600" : "text-slate-400"
      )}
    >
      {icon}
    </button>
  );
}

function StatCard({ title, value, icon }: { title: string, value: string | number, icon: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50">
        {icon}
      </div>
      <p className="text-sm font-medium text-slate-500">{title}</p>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}

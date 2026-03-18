import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import React, { useEffect, useState } from 'react';
import { 
  User, 
  Department, 
  TimetableEntry, 
  AttendanceRecord, 
  Student,
  Classroom,
  Block,
  Course,
  Faculty,
  Announcement
} from '../types';
import { 
  Users, 
  Building2, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  MapPin, 
  Plus,
  Search,
  MoreVertical,
  ArrowUpRight,
  ArrowDownRight,
  GraduationCap,
  Edit2,
  X,
  Trash2,
  Camera,
  ChevronRight,
  BookOpen,
  Info,
  Bell,
  Image as ImageIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import { format } from 'date-fns';
import L from 'leaflet';

// Fix for default marker icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const PERIOD_TIMINGS = [
  { start: '08:00', end: '08:50' },
  { start: '08:50', end: '09:40' },
  { start: '09:40', end: '10:30' },
  { start: '10:45', end: '11:40' },
  { start: '11:40', end: '12:40' },
  { start: '13:15', end: '13:55' },
  { start: '13:55', end: '14:35' },
  { start: '14:35', end: '15:15' },
];

interface DashboardProps {
  user: User;
  activeTab: string;
  onUserUpdate?: (user: User) => void;
}

export default function Dashboard({ user, activeTab, onUserUpdate }: DashboardProps) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [timetable, setTimetable] = useState<TimetableEntry[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [faculty, setFaculty] = useState<Faculty[]>([]);
  const [attendanceStats, setAttendanceStats] = useState({ avgAttendance: 0, weeklyData: [] as { name: string, value: number }[] });
  const [loading, setLoading] = useState(true);
  const [selectedInfrastructureDept, setSelectedInfrastructureDept] = useState<number | null>(null);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [isAddingStudent, setIsAddingStudent] = useState(false);
  const [newStudent, setNewStudent] = useState({
    name: '',
    email: '',
    password: '',
    department_id: user.department_id || 1,
    year: 1,
    section: 'A'
  });
  const [isAddingDept, setIsAddingDept] = useState(false);
  const [newDept, setNewDept] = useState({ name: '', location: '', image_url: '' });
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [isAddingClassroom, setIsAddingClassroom] = useState(false);
  const [newClassroom, setNewClassroom] = useState({ name: '', capacity: 30, block_id: 1, department_id: undefined as number | undefined });
  const [isUpdating, setIsUpdating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [settingsData, setSettingsData] = useState({ name: user.name, email: user.email });
  const [editingClassroom, setEditingClassroom] = useState<Classroom | null>(null);
  const [viewingRoomStudents, setViewingRoomStudents] = useState<{ room: Classroom, students: Student[] } | null>(null);
  const [isUploadingTimetable, setIsUploadingTimetable] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState({
    department_id: user.department_id || 1,
    year: 1,
    section: 'A'
  });
  const [isCreatingTimetable, setIsCreatingTimetable] = useState(false);
  const [isAddingCourse, setIsAddingCourse] = useState(false);
  const [newCourse, setNewCourse] = useState({ code: '', name: '', department_id: user.department_id || 1, credits: 3 });
  const [selectedStudentProgress, setSelectedStudentProgress] = useState<{ student: Student, progress: any } | null>(null);
  const [facultySuggestions, setFacultySuggestions] = useState<Faculty[]>([]);
  const [classroomSuggestions, setClassroomSuggestions] = useState<Classroom[]>([]);
  const [studentFilter, setStudentFilter] = useState({
    department_id: 0, // 0 means all
    year: 0, // 0 means all
    section: 'All'
  });
  const [studentSearch, setStudentSearch] = useState('');
  const [timetableSearch, setTimetableSearch] = useState('');
  const [timetableForm, setTimetableForm] = useState({
    department_id: user.department_id || 1,
    year: 1,
    section: 'A',
    periods: 5,
    faculty_type: 'All',
    entries: [] as any[]
  });
  const [attendanceMarks, setAttendanceMarks] = useState<Record<number, 'present' | 'absent'>>({});
  const [selectedAttendanceClass, setSelectedAttendanceClass] = useState<number | null>(null);
  const [attendanceDate, setAttendanceDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isAddingAnnouncement, setIsAddingAnnouncement] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [announcementForm, setAnnouncementForm] = useState({ title: '', content: '' });

  useEffect(() => {
    if (isCreatingTimetable) {
      const fetchTimetableSuggestions = async () => {
        try {
          const [facRes, classRes] = await Promise.all([
            fetch(`/api/faculty?department_id=${timetableForm.department_id}`),
            fetch(`/api/classrooms?department_id=${timetableForm.department_id}`)
          ]);
          setFacultySuggestions(await facRes.json());
          setClassroomSuggestions(await classRes.json());
        } catch (err) {
          console.error('Failed to fetch suggestions', err);
        }
      };
      fetchTimetableSuggestions();
    }
  }, [isCreatingTimetable, timetableForm.department_id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        year: selectedFilter.year.toString(),
        section: selectedFilter.section,
        department_id: selectedFilter.department_id.toString()
      });

      const [deptsRes, timetableRes, studentsRes, classroomsRes, blocksRes, attendanceRes, coursesRes, facultyRes, announcementsRes] = await Promise.all([
        fetch('/api/departments'),
        fetch(`/api/timetable/${user.role}/${user.id}?${queryParams}`),
        fetch(`/api/students?${queryParams}`),
        fetch('/api/classrooms'),
        fetch('/api/blocks'),
        fetch(`/api/stats/attendance?role=${user.role}${user.role === 'student' ? `&studentId=${user.id}` : ''}`),
        fetch(`/api/courses?department_id=${user.department_id}`),
        fetch(`/api/faculty?department_id=${user.department_id}`),
        fetch('/api/announcements')
      ]);

      setDepartments(await deptsRes.json());
      setTimetable(await timetableRes.json());
      setStudents(await studentsRes.json());
      setClassrooms(await classroomsRes.json());
      setBlocks(await blocksRes.json());
      setAttendanceStats(await attendanceRes.json());
      setCourses(await coursesRes.json());
      setFaculty(await facultyRes.json());
      setAnnouncements(await announcementsRes.json());
    } catch (err) {
      console.error('Failed to fetch dashboard data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user, selectedFilter]);

  useEffect(() => {
    setSettingsData({ name: user.name, email: user.email });
  }, [user.name, user.email]);

  const handleUpdateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;

    setIsUpdating(true);
    try {
      const response = await fetch(`/api/students/${editingStudent.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editingStudent.name,
          email: editingStudent.email,
          year: editingStudent.year,
          section: editingStudent.section,
          department_id: editingStudent.department_id
        }),
      });

      if (response.ok) {
        setEditingStudent(null);
        await fetchData();
      } else {
        alert('Failed to update student profile');
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred while updating');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    try {
      const response = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newStudent),
      });

      const data = await response.json();
      if (data.success) {
        setIsAddingStudent(false);
        setNewStudent({
          name: '',
          email: '',
          password: '',
          department_id: user.department_id || 1,
          year: 1,
          section: 'A'
        });
        await fetchData();
      } else {
        alert(data.message || 'Failed to add student');
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred while adding student');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteStudent = async (studentId: number) => {
    console.log('Attempting to delete student with ID:', studentId);
    setIsUpdating(true);
    try {
      const response = await fetch(`/api/students/${studentId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchData();
      } else {
        const data = await response.json();
        alert(data.message || 'Failed to delete student profile');
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred while deleting student');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAddDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    try {
      const response = await fetch('/api/departments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newDept),
      });

      if (response.ok) {
        setIsAddingDept(false);
        setNewDept({ name: '', location: '', image_url: '' });
        await fetchData();
      } else {
        alert('Failed to add department');
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdateDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDept) return;
    setIsUpdating(true);
    try {
      const response = await fetch(`/api/departments/${editingDept.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editingDept.name,
          location: editingDept.location
        }),
      });

      if (response.ok) {
        setEditingDept(null);
        await fetchData();
      } else {
        alert('Failed to update department');
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteDepartment = async (deptId: number) => {
    if (!confirm('Are you sure you want to delete this department? This will also remove all associated data.')) return;
    
    setIsUpdating(true);
    try {
      const response = await fetch(`/api/departments/${deptId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setEditingDept(null);
        await fetchData();
      } else {
        alert('Failed to delete department');
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdateClassroom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClassroom) return;
    setIsUpdating(true);
    try {
      const response = await fetch(`/api/classrooms/${editingClassroom.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editingClassroom.name,
          capacity: editingClassroom.capacity,
          department_id: editingClassroom.department_id
        }),
      });

      if (response.ok) {
        setEditingClassroom(null);
        await fetchData();
      } else {
        alert('Failed to update classroom');
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAddClassroom = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    try {
      const response = await fetch('/api/classrooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newClassroom),
      });

      if (response.ok) {
        setIsAddingClassroom(false);
        setNewClassroom({ name: '', capacity: 30, block_id: 1, department_id: undefined });
        await fetchData();
      } else {
        alert('Failed to add classroom');
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleViewRoomStudents = async (room: Classroom) => {
    try {
      const response = await fetch(`/api/classrooms/${room.id}/students`);
      const data = await response.json();
      setViewingRoomStudents({ room, students: data });
    } catch (err) {
      console.error(err);
      alert('Failed to fetch students');
    }
  };

  const handleDeleteTimetableEntry = async (id: number) => {
    if (!confirm('Are you sure you want to delete this entry?')) return;
    try {
      const response = await fetch(`/api/timetable/${id}`, { method: 'DELETE' });
      if (response.ok) {
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleTimetableUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        const entries = JSON.parse(content);
        
        setIsUpdating(true);
        const response = await fetch('/api/timetable/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ entries }),
        });

        if (response.ok) {
          alert('Timetable updated successfully');
          await fetchData();
        } else {
          const data = await response.json();
          alert('Upload failed: ' + (data.message || 'Unknown error'));
        }
      } catch (err) {
        console.error(err);
        alert('Invalid JSON format or upload error');
      } finally {
        setIsUpdating(false);
        setIsUploadingTimetable(false);
      }
    };
    reader.readAsText(file);
  };

  const handleCreateTimetable = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    try {
      const response = await fetch('/api/timetable/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          entries: timetableForm.entries,
          clear: true 
        }),
      });

      if (response.ok) {
        setIsCreatingTimetable(false);
        await fetchData();
      } else {
        alert('Failed to create timetable');
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleClearTimetable = async () => {
    if (!confirm('Are you sure you want to clear all existing entries for this timetable? This will permanently delete them from the database and empty the current form.')) return;

    setIsUpdating(true);
    try {
      const queryParams = new URLSearchParams({
        department_id: timetableForm.department_id.toString(),
        year: timetableForm.year.toString(),
        section: timetableForm.section
      });

      const response = await fetch(`/api/timetable/clear?${queryParams}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setTimetableForm({ ...timetableForm, entries: [] });
        alert('Timetable cleared successfully');
        await fetchData();
      } else {
        alert('Failed to clear timetable');
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred while clearing timetable');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('image', file);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (data.success) {
        setNewDept({ ...newDept, image_url: data.imageUrl });
      } else {
        alert('Upload failed: ' + data.message);
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred during upload');
    } finally {
      setUploading(false);
    }
  };

  const handleDepartmentImageUpload = async (deptId: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('image', file);

    try {
      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const uploadData = await uploadRes.json();
      if (uploadData.success) {
        const updateRes = await fetch(`/api/departments/${deptId}/image`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image_url: uploadData.imageUrl }),
        });

        if (updateRes.ok) {
          await fetchData();
        } else {
          alert('Failed to update department image');
        }
      } else {
        alert('Upload failed: ' + uploadData.message);
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred during upload');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDepartmentImage = async (deptId: number) => {
    if (!confirm('Are you sure you want to delete this department image?')) return;
    
    setIsUpdating(true);
    try {
      const response = await fetch(`/api/departments/${deptId}/image`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_url: null }),
      });

      if (response.ok) {
        await fetchData();
      } else {
        alert('Failed to delete department image');
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleBlockImageUpload = async (blockId: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('image', file);

    try {
      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const uploadData = await uploadRes.json();
      if (uploadData.success) {
        const updateRes = await fetch(`/api/blocks/${blockId}/image`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image_url: uploadData.imageUrl }),
        });

        if (updateRes.ok) {
          await fetchData();
        } else {
          alert('Failed to update block image');
        }
      } else {
        alert('Upload failed: ' + uploadData.message);
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred during upload');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteBlockImage = async (blockId: number) => {
    if (!confirm('Are you sure you want to delete this block image?')) return;
    
    setIsUpdating(true);
    try {
      const response = await fetch(`/api/blocks/${blockId}/image`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_url: null }),
      });

      if (response.ok) {
        await fetchData();
      } else {
        alert('Failed to delete block image');
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    try {
      const response = await fetch(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settingsData),
      });

      if (response.ok) {
        if (onUserUpdate) {
          onUserUpdate({ ...user, ...settingsData });
        }
        alert('Profile updated successfully');
      } else {
        alert('Failed to update profile');
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    try {
      const response = await fetch('/api/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...announcementForm,
          author_id: user.id,
          author_name: user.name,
          author_role: user.role
        })
      });
      if (response.ok) {
        setIsAddingAnnouncement(false);
        setAnnouncementForm({ title: '', content: '' });
        fetchData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAnnouncement) return;
    setIsUpdating(true);
    try {
      const response = await fetch(`/api/announcements/${editingAnnouncement.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(announcementForm)
      });
      if (response.ok) {
        setEditingAnnouncement(null);
        setAnnouncementForm({ title: '', content: '' });
        fetchData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteAnnouncement = async (id: number) => {
    if (!confirm('Are you sure you want to delete this announcement?')) return;
    setIsUpdating(true);
    try {
      const response = await fetch(`/api/announcements/${id}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        fetchData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const renderDashboard = () => {
    const stats = user.role === 'faculty' ? [
      { label: 'Total Students', value: students.length, icon: Users, color: 'bg-blue-500' },
      { label: 'Departments', value: departments.length, icon: Building2, color: 'bg-indigo-500' },
      { label: 'Classes Today', value: timetable.length, icon: Calendar, color: 'bg-emerald-500' },
      { label: 'Avg Attendance', value: `${attendanceStats.avgAttendance}%`, icon: CheckCircle2, color: 'bg-amber-500' },
    ] : [
      { label: 'My Attendance', value: `${attendanceStats.avgAttendance}%`, icon: CheckCircle2, color: 'bg-emerald-500' },
      { label: 'Classes Today', value: timetable.length, icon: Calendar, color: 'bg-indigo-500' },
      { label: 'Current Year', value: user.year ? `${user.year}${user.year === 1 ? 'st' : user.year === 2 ? 'nd' : user.year === 3 ? 'rd' : 'th'} Year` : 'N/A', icon: GraduationCap, iconColor: 'text-blue-600' },
      { label: 'Department', value: user.department_name || 'N/A', icon: Building2, color: 'bg-amber-500' },
    ];

    const attendanceData = attendanceStats.weeklyData.length > 0 ? attendanceStats.weeklyData : [
      { name: 'Mon', value: 0 },
      { name: 'Tue', value: 0 },
      { name: 'Wed', value: 0 },
      { name: 'Thu', value: 0 },
      { name: 'Fri', value: 0 },
    ];

    return (
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Welcome back, {user.name}</h1>
            <p className="text-slate-500">Here's what's happening on campus today.</p>
          </div>
          <div className="flex items-center">
            <span className="text-sm font-medium text-slate-500 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm">
              {format(new Date(), 'EEEE, MMMM do')}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, i) => (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              key={stat.label}
              className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 ${stat.color} rounded-xl flex items-center justify-center text-white shadow-lg`}>
                  <stat.icon className="w-6 h-6" />
                </div>
                <div className="flex items-center gap-1 text-emerald-600 text-xs font-bold bg-emerald-50 px-2 py-1 rounded-full">
                  <ArrowUpRight className="w-3 h-3" />
                  +4%
                </div>
              </div>
              <p className="text-slate-500 text-sm font-medium">{stat.label}</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{stat.value}</p>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <h3 className="font-bold text-slate-900">Weekly Attendance Overview</h3>
              <select className="text-sm border-none bg-slate-50 rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-indigo-500">
                <option>This Week</option>
                <option>Last Week</option>
              </select>
            </div>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={attendanceData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#64748b', fontSize: 12 }}
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#64748b', fontSize: 12 }}
                  />
                  <Tooltip 
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={40}>
                    {attendanceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === 2 ? '#4f46e5' : '#e2e8f0'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-slate-900">Upcoming Classes</h3>
              <button className="text-indigo-600 text-xs font-bold hover:underline">View All</button>
            </div>
            <div className="space-y-4">
              {timetable.map((entry, i) => (
                <div key={entry.id} className="flex items-start gap-4 p-3 rounded-xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                  <div className="w-12 h-12 bg-slate-100 rounded-xl flex flex-col items-center justify-center shrink-0">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">{entry.day.slice(0, 3)}</span>
                    <Clock className="w-4 h-4 text-slate-900" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-900 truncate">{entry.subject}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {entry.start_time} - {entry.end_time}
                      </span>
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {entry.classroom_name}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
              {timetable.length === 0 && (
                <div className="text-center py-8">
                  <Calendar className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                  <p className="text-slate-400 text-sm">No classes scheduled for today.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderTimetable = () => (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-900">Weekly Timetable</h1>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {(user.role === 'faculty' || user.role === 'dept_admin') && (
            <>
              <label className="cursor-pointer">
                <div className="bg-white border border-slate-200 text-slate-600 px-4 py-2 rounded-xl flex items-center justify-center gap-2 text-sm font-bold shadow-sm hover:bg-slate-50 transition-all">
                  <Calendar className="w-4 h-4" /> Upload JSON
                </div>
                <input 
                  type="file" 
                  className="hidden" 
                  accept=".json"
                  onChange={handleTimetableUpload}
                />
              </label>
              <button 
                onClick={() => {
                  setTimetableForm({
                    department_id: selectedFilter.department_id,
                    year: selectedFilter.year,
                    section: selectedFilter.section,
                    periods: 8,
                    entries: timetable.map(t => ({
                      ...t,
                      department_id: t.department_id,
                      year: t.year,
                      section: t.section,
                      faculty_name: t.faculty_name
                    }))
                  });
                  setIsCreatingTimetable(true);
                }}
                className="bg-indigo-600 text-white px-4 py-2 rounded-xl flex items-center justify-center gap-2 text-sm font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all"
              >
                <Plus className="w-4 h-4" /> Manage Timetable
              </button>
            </>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="grid grid-cols-1 sm:flex sm:items-center gap-4 w-full sm:w-auto">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase shrink-0">Dept:</span>
            <select 
              value={selectedFilter.department_id}
              onChange={(e) => setSelectedFilter({ ...selectedFilter, department_id: parseInt(e.target.value) || 0 })}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase shrink-0">Year:</span>
            <select 
              value={selectedFilter.year}
              onChange={(e) => setSelectedFilter({ ...selectedFilter, year: parseInt(e.target.value) || 0 })}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {[1, 2, 3, 4].map(y => <option key={y} value={y}>Year {y}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase shrink-0">Sec:</span>
            <select 
              value={selectedFilter.section}
              onChange={(e) => setSelectedFilter({ ...selectedFilter, section: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K'].map(s => <option key={s} value={s}>Section {s}</option>)}
            </select>
          </div>
        </div>
        <div className="flex-1 relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search subject, faculty or room..." 
            value={timetableSearch}
            onChange={(e) => setTimetableSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden overflow-x-auto">
        <div className="min-w-[800px]">
          <div className="grid grid-cols-6 border-b border-slate-100 bg-slate-50/50">
            {['Time', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map(day => (
              <div key={day} className="p-4 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">
                {day}
              </div>
            ))}
          </div>
          <div className="divide-y divide-slate-100">
            {PERIOD_TIMINGS.map(slot => (
              <div key={slot.start} className="grid grid-cols-6 min-h-[100px]">
                <div className="p-4 text-center border-r border-slate-100 bg-slate-50/30 flex flex-col items-center justify-center">
                  <span className="text-xs font-bold text-slate-600">{slot.start}</span>
                  <span className="text-[10px] text-slate-400">{slot.end}</span>
                </div>
                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map(day => {
                  const entry = timetable.find(t => {
                    const matchesDayAndTime = t.day === day && t.start_time === slot.start;
                    if (!matchesDayAndTime) return false;
                    
                    if (!timetableSearch) return true;
                    const search = timetableSearch.toLowerCase();
                    return (
                      t.subject.toLowerCase().includes(search) ||
                      (t.faculty_name || '').toLowerCase().includes(search) ||
                      (t.classroom_name || '').toLowerCase().includes(search)
                    );
                  });
                  return (
                    <div key={day} className="p-2 border-r border-slate-100 last:border-r-0 relative group">
                      {entry ? (
                        <div className="h-full bg-indigo-50 border border-indigo-100 rounded-xl p-3 shadow-sm group-hover:shadow-md transition-all relative">
                          <p className="text-xs font-bold text-indigo-700">{entry.subject}</p>
                          <p className="text-[10px] text-indigo-500 mt-1 font-medium">{entry.classroom_name}</p>
                          <p className="text-[10px] text-slate-500 mt-1 italic">{entry.faculty_name}</p>
                          {(user.role === 'faculty' || user.role === 'dept_admin') && (
                            <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button 
                                onClick={() => {
                                  setTimetableForm({
                                    department_id: entry.department_id,
                                    year: entry.year,
                                    section: entry.section,
                                    periods: 8,
                                    entries: [entry]
                                  });
                                  setIsCreatingTimetable(true);
                                }}
                                className="p-1 text-indigo-400 hover:text-indigo-600 hover:bg-white rounded-md transition-all"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                              <button 
                                onClick={() => handleDeleteTimetableEntry(entry.id)}
                                className="p-1 text-red-400 hover:text-red-600 hover:bg-white rounded-md transition-all"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="h-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Plus 
                            onClick={() => {
                              if (user.role === 'faculty' || user.role === 'dept_admin') {
                                setTimetableForm({
                                  department_id: selectedFilter.department_id,
                                  year: selectedFilter.year,
                                  section: selectedFilter.section,
                                  periods: 8,
                                  entries: [
                                    ...timetable.map(t => ({
                                      ...t,
                                      department_id: t.department_id,
                                      year: t.year,
                                      section: t.section
                                    })),
                                    {
                                      day,
                                      start_time: slot.start,
                                      end_time: slot.end,
                                      subject: '',
                                      department_id: selectedFilter.department_id,
                                      year: selectedFilter.year,
                                      section: selectedFilter.section,
                                      faculty_id: facultySuggestions[0]?.id || user.id,
                                      classroom_id: classroomSuggestions[0]?.id || 1
                                    }
                                  ]
                                });
                                setIsCreatingTimetable(true);
                              }
                            }}
                            className="w-4 h-4 text-slate-300 cursor-pointer hover:text-indigo-500" 
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderStudents = () => {
    if (user.role !== 'faculty') {
      return (
        <div className="flex flex-col items-center justify-center h-[60vh] text-center">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4">
            <X className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Access Denied</h2>
          <p className="text-slate-500 mt-2">Only faculty members can access the student directory.</p>
        </div>
      );
    }

    const filteredStudents = students.filter(student => {
      const deptMatch = studentFilter.department_id === 0 || departments.find(d => d.name === student.department_name)?.id === studentFilter.department_id;
      const yearMatch = studentFilter.year === 0 || student.year === studentFilter.year;
      const sectionMatch = studentFilter.section === 'All' || student.section === studentFilter.section;
      const searchMatch = studentSearch === '' || 
        student.name.toLowerCase().includes(studentSearch.toLowerCase()) || 
        student.email.toLowerCase().includes(studentSearch.toLowerCase());
      return deptMatch && yearMatch && sectionMatch && searchMatch;
    });

    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-2xl font-bold text-slate-900">Student Directory</h1>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search students..." 
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none w-full sm:w-64"
              />
            </div>
            <button 
              onClick={() => setIsAddingStudent(true)}
              className="bg-indigo-600 text-white px-4 py-2 rounded-xl flex items-center justify-center gap-2 text-sm font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all"
            >
              <Plus className="w-4 h-4" /> Add Student
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase">Department:</span>
            <select 
              value={studentFilter.department_id}
              onChange={(e) => setStudentFilter({ ...studentFilter, department_id: parseInt(e.target.value) || 0 })}
              className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value={0}>All Departments</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase">Year:</span>
            <select 
              value={studentFilter.year}
              onChange={(e) => setStudentFilter({ ...studentFilter, year: parseInt(e.target.value) || 0 })}
              className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value={0}>All Years</option>
              {[1, 2, 3, 4].map(y => <option key={y} value={y}>Year {y}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase">Section:</span>
            <select 
              value={studentFilter.section}
              onChange={(e) => setStudentFilter({ ...studentFilter, section: e.target.value })}
              className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="All">All Sections</option>
              {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K'].map(s => <option key={s} value={s}>Section {s}</option>)}
            </select>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Name</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Department</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Year</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Section</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Attendance</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudents.map(student => (
                <tr key={student.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 font-bold">
                        {student.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">{student.name}</p>
                        <p className="text-xs text-slate-500">{student.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="text-sm text-slate-600 font-medium">{student.department_name}</span>
                  </td>
                  <td className="p-4">
                    <span className="text-xs font-bold bg-indigo-50 text-indigo-600 px-2 py-1 rounded-lg">
                      Year {student.year}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className="text-xs font-bold bg-slate-100 text-slate-600 px-2 py-1 rounded-lg">
                      {student.section}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: '85%' }}></div>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-600 mt-1 block">85% Present</span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => setEditingStudent(student)}
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                        title="Edit Profile"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDeleteStudent(student.id)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                        title="Delete Profile"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const handleMarkAttendance = (studentId: number, status: 'present' | 'absent') => {
    setAttendanceMarks(prev => ({ ...prev, [studentId]: status }));
  };

  const handleSubmitAttendance = async () => {
    if (!selectedAttendanceClass) {
      alert('Please select a class first');
      return;
    }

    const marks = Object.entries(attendanceMarks);
    if (marks.length === 0) {
      alert('Please mark attendance for at least one student');
      return;
    }

    setIsUpdating(true);
    try {
      await Promise.all(marks.map(([studentId, status]) => 
        fetch('/api/attendance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            student_id: parseInt(studentId),
            timetable_id: selectedAttendanceClass,
            date: attendanceDate,
            status
          })
        })
      ));
      alert('Attendance submitted successfully');
      setAttendanceMarks({});
      fetchData();
    } catch (err) {
      console.error('Failed to submit attendance', err);
      alert('Failed to submit attendance');
    } finally {
      setIsUpdating(false);
    }
  };

  const renderAttendance = () => {
    const todayTimetable = timetable.filter(t => {
      const dayName = format(new Date(attendanceDate), 'EEEE');
      return t.day === dayName;
    });

    const presentCount = Object.values(attendanceMarks).filter(s => s === 'present').length;
    const absentCount = Object.values(attendanceMarks).filter(s => s === 'absent').length;

    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-2xl font-bold text-slate-900">Attendance Tracking</h1>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400 uppercase shrink-0">Class:</span>
              <select 
                value={selectedAttendanceClass || ''}
                onChange={(e) => setSelectedAttendanceClass(parseInt(e.target.value) || null)}
                className="w-full sm:w-auto bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Select a class...</option>
                {todayTimetable.map(t => (
                  <option key={t.id} value={t.id}>{t.subject} ({t.start_time} - {t.end_time})</option>
                ))}
              </select>
            </div>
            <input 
              type="date" 
              className="w-full sm:w-auto bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500" 
              value={attendanceDate}
              onChange={(e) => setAttendanceDate(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-slate-900">Mark Attendance</h3>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => {
                    const allMarks: Record<number, 'present' | 'absent'> = {};
                    students.forEach(s => allMarks[s.id] = 'present');
                    setAttendanceMarks(allMarks);
                  }}
                  className="text-xs font-bold text-indigo-600 hover:underline"
                >
                  Mark All Present
                </button>
              </div>
            </div>
            <div className="space-y-4">
              {students.length > 0 ? students.map(student => (
                <div key={student.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center font-bold text-slate-500">
                      {student.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">{student.name}</p>
                      <p className="text-xs text-slate-500">Year {student.year} • Section {student.section}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => handleMarkAttendance(student.id, 'present')}
                      className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold border transition-all ${
                        attendanceMarks[student.id] === 'present' 
                          ? 'bg-emerald-500 text-white border-emerald-500' 
                          : 'bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100'
                      }`}
                    >
                      Present
                    </button>
                    <button 
                      onClick={() => handleMarkAttendance(student.id, 'absent')}
                      className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold border transition-all ${
                        attendanceMarks[student.id] === 'absent' 
                          ? 'bg-red-500 text-white border-red-500' 
                          : 'bg-red-50 text-red-600 border-red-100 hover:bg-red-100'
                      }`}
                    >
                      Absent
                    </button>
                  </div>
                </div>
              )) : (
                <div className="text-center py-12">
                  <Users className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                  <p className="text-slate-500 font-medium">No students found for this department/year/section.</p>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <h3 className="font-bold text-slate-900 mb-4">Summary</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500">Total Students</span>
                  <span className="text-sm font-bold text-slate-900">{students.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500">Present</span>
                  <span className="text-sm font-bold text-emerald-600">{presentCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500">Absent</span>
                  <span className="text-sm font-bold text-red-600">{absentCount}</span>
                </div>
                <div className="pt-4 border-t border-slate-100">
                  <button 
                    onClick={handleSubmitAttendance}
                    disabled={isUpdating || !selectedAttendanceClass}
                    className="w-full bg-indigo-600 text-white py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isUpdating ? 'Submitting...' : 'Submit Attendance'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderCampus = () => {
    const filteredClassrooms = selectedInfrastructureDept 
      ? classrooms.filter(room => room.department_id === selectedInfrastructureDept)
      : [];

    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-2xl font-bold text-slate-900">Campus Infrastructure</h1>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {selectedInfrastructureDept && (
              <button 
                onClick={() => setSelectedInfrastructureDept(null)}
                className="text-sm font-bold text-indigo-600 hover:text-indigo-700 flex items-center justify-center gap-1"
              >
                <X className="w-4 h-4" /> Back to Overview
              </button>
            )}
            {user.role === 'faculty' && (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <button 
                  onClick={() => setIsAddingClassroom(true)}
                  className="bg-emerald-600 text-white px-4 py-2 rounded-xl flex items-center justify-center gap-2 text-sm font-bold shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all"
                >
                  <Plus className="w-4 h-4" /> Add Classroom
                </button>
                <button 
                  onClick={() => setIsAddingDept(true)}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-xl flex items-center justify-center gap-2 text-sm font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all"
                >
                  <Plus className="w-4 h-4" /> Add Department
                </button>
              </div>
            )}
          </div>
        </div>

        {!selectedInfrastructureDept ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-indigo-600" /> Departments
              </h3>
              <div className="grid grid-cols-1 gap-4">
                {departments.map(dept => (
                  <div key={dept.id} className="relative group">
                    <button 
                      onClick={() => setSelectedInfrastructureDept(dept.id)}
                      className="w-full p-4 rounded-xl bg-slate-50 border border-slate-100 flex gap-4 hover:border-indigo-200 hover:bg-indigo-50/50 transition-all text-left"
                    >
                      {dept.image_url ? (
                        <img 
                          src={dept.image_url} 
                          alt={dept.name} 
                          className="w-16 h-16 rounded-lg object-cover bg-slate-200 shrink-0"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-lg bg-slate-200 flex items-center justify-center shrink-0">
                          <Building2 className="w-6 h-6 text-slate-400" />
                        </div>
                      )}
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{dept.name}</p>
                          <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-400 transition-all" />
                        </div>
                        <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> {dept.location}
                        </p>
                        <p className="text-[10px] font-bold text-indigo-600 mt-2 uppercase tracking-wider">
                          {classrooms.filter(r => r.department_id === dept.id).length} Classrooms
                        </p>
                      </div>
                    </button>
                    {user.role === 'faculty' && (
                      <div className="absolute bottom-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingDept(dept);
                          }}
                          className="p-1.5 bg-white rounded-lg border border-slate-200 shadow-sm hover:bg-slate-50 transition-colors"
                          title="Edit Department"
                        >
                          <Edit2 className="w-3 h-3 text-slate-500" />
                        </button>
                        <label className="p-1.5 bg-white rounded-lg border border-slate-200 shadow-sm cursor-pointer hover:bg-slate-50 transition-colors" title="Change Image">
                          <Camera className="w-3 h-3 text-slate-500" />
                          <input 
                            type="file" 
                            className="hidden" 
                            accept="image/*"
                            onChange={(e) => handleDepartmentImageUpload(dept.id, e)}
                          />
                        </label>
                        {dept.image_url && (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteDepartmentImage(dept.id);
                            }}
                            className="p-1.5 bg-white rounded-lg border border-slate-200 shadow-sm hover:bg-red-50 hover:border-red-200 transition-colors"
                            title="Delete Image"
                          >
                            <Trash2 className="w-3 h-3 text-red-500" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-indigo-600" /> Blocks
              </h3>
              <div className="grid grid-cols-1 gap-4">
                {blocks.map(block => (
                  <div key={block.id} className="p-4 rounded-xl border border-slate-100 flex items-center justify-between group relative">
                    <div className="flex items-center gap-3">
                      {block.image_url ? (
                        <img 
                          src={block.image_url} 
                          alt={block.name} 
                          className="w-10 h-10 rounded-lg object-cover bg-slate-100 shrink-0"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                          <Building2 className="w-5 h-5 text-slate-400" />
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-bold text-slate-900">{block.name}</p>
                        <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">{block.type}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-slate-900">{classrooms.filter(r => r.block_id === block.id).length} Rooms</p>
                    </div>
                    {user.role === 'faculty' && (
                      <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <label className="p-1.5 bg-white rounded-lg border border-slate-200 shadow-sm cursor-pointer hover:bg-slate-50 transition-colors" title="Change Image">
                          <Camera className="w-3 h-3 text-slate-500" />
                          <input 
                            type="file" 
                            className="hidden" 
                            accept="image/*"
                            onChange={(e) => handleBlockImageUpload(block.id, e)}
                          />
                        </label>
                        {block.image_url && (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteBlockImage(block.id);
                            }}
                            className="p-1.5 bg-white rounded-lg border border-slate-200 shadow-sm hover:bg-red-50 hover:border-red-200 transition-colors"
                            title="Delete Image"
                          >
                            <Trash2 className="w-3 h-3 text-red-500" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
                <Building2 className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <h3 className="font-bold text-xl text-slate-900">
                  {departments.find(d => d.id === selectedInfrastructureDept)?.name} Classrooms
                </h3>
                <p className="text-xs text-slate-500">
                  {departments.find(d => d.id === selectedInfrastructureDept)?.location}
                </p>
              </div>
            </div>

            {filteredClassrooms.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredClassrooms.map(room => (
                  <div key={room.id} className="p-4 rounded-xl border border-slate-100 hover:border-indigo-200 transition-all group">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-bold text-slate-900">{room.name}</p>
                        <p className="text-[10px] text-slate-400 uppercase font-bold mt-1">{room.block_name}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => handleViewRoomStudents(room)}
                          className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                          title="View Students"
                        >
                          <Users className="w-4 h-4" />
                        </button>
                        {user.role === 'faculty' && (
                          <button 
                            onClick={() => setEditingClassroom(room)}
                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                            title="Edit Classroom"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-xs text-slate-500">Capacity</span>
                      <span className="text-xs font-bold text-slate-900">{room.capacity}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                  <Building2 className="w-8 h-8 text-slate-300" />
                </div>
                <p className="text-slate-500 text-sm">No classrooms assigned to this department yet.</p>
                {user.role === 'faculty' && (
                  <p className="text-xs text-slate-400 mt-1">Edit a classroom to assign it to this department.</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderCampusMap = () => {
    return (
      <div className="space-y-6 h-full flex flex-col pb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Campus Map & Information</h1>
            <p className="text-slate-500 text-sm">Explore Panimalar Engineering College</p>
          </div>
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500 bg-white px-3 py-1.5 rounded-full border border-slate-100">
            <MapPin className="w-4 h-4 text-indigo-600" />
            <span>Chennai, Tamil Nadu</span>
          </div>
        </div>
        
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden relative z-0" style={{ height: "500px", width: "100%" }}>
              <MapContainer
                center={[13.052616, 80.075133]}
                zoom={17}
                style={{ height: "100%", width: "100%" }}
              >
                <TileLayer
                  attribution="&copy; OpenStreetMap contributors"
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                <Marker position={[13.052616, 80.075133]}>
                  <Popup>
                    Panimalar Engineering College
                  </Popup>
                </Marker>
              </MapContainer>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {departments.slice(0, 3).map(dept => (
                <div key={dept.id} className="p-4 bg-white rounded-xl border border-slate-100 shadow-sm flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center shrink-0">
                    <Building2 className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900 truncate">{dept.name}</p>
                    <p className="text-[10px] text-slate-500 truncate">{dept.location}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col h-[600px] xl:h-[700px]">
            <div className="p-5 border-b border-slate-100 bg-slate-50/50 rounded-t-2xl">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <Info className="w-5 h-5 text-indigo-600" />
                College Overview
              </h3>
            </div>
            <div className="p-6 overflow-y-auto custom-scrollbar space-y-6 text-sm">
              <section>
                <h4 className="font-bold text-indigo-600 mb-2">1. College Overview</h4>
                <div className="space-y-2 text-slate-600">
                  <p><span className="font-semibold text-slate-900">Name:</span> Panimalar Engineering College (PEC)</p>
                  <p><span className="font-semibold text-slate-900">Location:</span> Varadarajapuram, Poonamallee, Chennai, Tamil Nadu, India.</p>
                  <p><span className="font-semibold text-slate-900">Establishment Year:</span> 2000</p>
                  <p><span className="font-semibold text-slate-900">Management:</span> Private, run by the Panimalar Educational Trust.</p>
                  <p><span className="font-semibold text-slate-900">Affiliation:</span> Affiliated with Anna University, Chennai.</p>
                  <div className="mt-2 p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <p className="font-semibold text-slate-900 mb-1">Accreditation:</p>
                    <ul className="list-disc list-inside space-y-1 text-xs">
                      <li>Accredited by National Board of Accreditation (NBA).</li>
                      <li>Accredited by NAAC with a ‘A’ Grade.</li>
                    </ul>
                  </div>
                </div>
              </section>

              <section>
                <h4 className="font-bold text-indigo-600 mb-2">2. Academic Programs</h4>
                <div className="space-y-3">
                  <div>
                    <p className="font-semibold text-slate-900 text-xs uppercase tracking-wider mb-1">Undergraduate (B.E/B.Tech):</p>
                    <ul className="grid grid-cols-1 gap-1 text-xs text-slate-600">
                      <li>• Computer Science Engineering (CSE)</li>
                      <li>• Electrical and Electronics Engineering (EEE)</li>
                      <li>• Electronics and Communication Engineering (ECE)</li>
                      <li>• Mechanical Engineering (ME)</li>
                      <li>• Civil Engineering (CE)</li>
                      <li>• Information Technology (IT)</li>
                      <li>• Biotechnology (BT)</li>
                    </ul>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 text-xs uppercase tracking-wider mb-1">Postgraduate (M.E/M.Tech):</p>
                    <ul className="grid grid-cols-1 gap-1 text-xs text-slate-600">
                      <li>• Power Systems Engineering</li>
                      <li>• VLSI Design</li>
                      <li>• Structural Engineering</li>
                      <li>• Software Engineering</li>
                    </ul>
                  </div>
                  <p className="text-xs text-slate-500 italic mt-2">Courses are designed to provide a solid theoretical foundation combined with practical skills.</p>
                </div>
              </section>

              <section>
                <h4 className="font-bold text-indigo-600 mb-2">3. Campus and Facilities</h4>
                <div className="space-y-4 text-xs text-slate-600">
                  <div>
                    <p className="font-semibold text-slate-900">Infrastructure:</p>
                    <p>Sprawling campus with modern facilities, state-of-the-art classrooms, and well-equipped laboratories.</p>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">Libraries:</p>
                    <p>Central library with 50,000+ books, journals, and a Digital Library with e-resources.</p>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">Hostels:</p>
                    <p>Separate hostels for men and women with Wi-Fi, recreational facilities, and mess services.</p>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">Sports & Cafeteria:</p>
                    <p>Playgrounds for cricket, football, basketball, etc. Large cafeteria serving a variety of food.</p>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">Transportation:</p>
                    <p>Services covering different parts of Chennai and neighboring regions.</p>
                  </div>
                </div>
              </section>

              <section>
                <h4 className="font-bold text-indigo-600 mb-2">4. Faculty</h4>
                <p className="text-xs text-slate-600">Qualified and experienced faculty with strong academic backgrounds. Many hold doctoral degrees and are active in research and innovation.</p>
              </section>

              <section>
                <h4 className="font-bold text-indigo-600 mb-2">5. Industry & Placement</h4>
                <div className="space-y-2 text-xs text-slate-600">
                  <p><span className="font-semibold text-slate-900">Training:</span> Strong ties with industries for internships, industrial visits, and workshops.</p>
                  <p><span className="font-semibold text-slate-900">Placement Record:</span> Excellent track record with top firms like TCS, Infosys, Wipro, Cognizant, and Tech Mahindra.</p>
                  <p><span className="font-semibold text-slate-900">Placement Cell:</span> Provides training in soft skills, interview preparation, and career counseling.</p>
                </div>
              </section>

              <section>
                <h4 className="font-bold text-indigo-600 mb-2">6. Research & Development (R&D)</h4>
                <p className="text-xs text-slate-600">Focus on Embedded Systems, Power Systems, VLSI, AI, and Renewable Energy. Active publication in national and international journals.</p>
              </section>

              <section>
                <h4 className="font-bold text-indigo-600 mb-2">7. Student Activities & Clubs</h4>
                <div className="space-y-2 text-xs text-slate-600">
                  <p>Literary, Cultural, Technical, and Sports clubs for all-around development.</p>
                  <p>Annual festivals like Tech Fest and Cultural Fest foster creativity and teamwork.</p>
                </div>
              </section>

              <section>
                <h4 className="font-bold text-indigo-600 mb-2">8. Fee Structure</h4>
                <p className="text-xs text-slate-600">Varies for different programs and categories (general, management, etc.). Details can be obtained from the college website or admission office.</p>
              </section>

              <section className="p-4 bg-indigo-50 rounded-xl border border-indigo-100">
                <h4 className="font-bold text-indigo-900 mb-2">9. Admissions</h4>
                <div className="space-y-3 text-xs text-indigo-800">
                  <div>
                    <p className="font-bold">Undergraduate (B.E/B.Tech):</p>
                    <p>Based on TNEA (Class 12th marks in Physics, Chemistry, and Mathematics). Management quota available.</p>
                  </div>
                  <div>
                    <p className="font-bold">Postgraduate (M.E/M.Tech):</p>
                    <p>Based on TANCET performance followed by counseling. Management quota available.</p>
                  </div>
                </div>
              </section>

              <section>
                <h4 className="font-bold text-indigo-600 mb-2">10. Location</h4>
                <p className="text-xs text-slate-600">Located in Varadarajapuram, Poonamallee, Chennai (15-20 km from city center). Well-connected by road and public transportation.</p>
              </section>

              <section>
                <h4 className="font-bold text-indigo-600 mb-2">11. Notable Alumni</h4>
                <p className="text-xs text-slate-600">Successful alumni working with top MNCs and as entrepreneurs. Many pursue higher education in renowned institutions in India and abroad.</p>
              </section>

              <div className="pt-6 border-t border-slate-100">
                <h4 className="font-bold text-slate-900 mb-2">Conclusion</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Panimalar Engineering College is known for its strong emphasis on academics, practical exposure, and overall student development. With its infrastructure, faculty, placement support, and focus on research, PEC remains one of the popular choices for engineering aspirants in Tamil Nadu.
                </p>
                <p className="text-xs text-indigo-600 font-bold mt-4">
                  Contact the college directly for more information about admissions, courses, and scholarships.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderSettings = () => (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Account Settings</h1>
      <div className="max-w-2xl bg-white rounded-2xl border border-slate-100 shadow-sm p-8">
        <h3 className="font-bold text-slate-900 mb-6">Profile Information</h3>
        <form onSubmit={handleUpdateProfile} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Full Name</label>
              <input
                type="text"
                required
                value={settingsData.name}
                onChange={(e) => setSettingsData({ ...settingsData, name: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Email Address</label>
              <input
                type="email"
                required
                value={settingsData.email}
                onChange={(e) => setSettingsData({ ...settingsData, email: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm transition-all"
              />
            </div>
          </div>

          <div className="pt-6 border-t border-slate-100">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h4 className="text-sm font-bold text-slate-900">Email Notifications</h4>
                <p className="text-xs text-slate-500 mt-1">Receive updates about campus events and announcements.</p>
              </div>
              <div className="w-12 h-6 bg-indigo-600 rounded-full relative cursor-pointer">
                <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm"></div>
              </div>
            </div>
          </div>

          <div className="pt-6">
            <button
              type="submit"
              disabled={isUpdating}
              className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold text-sm shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all disabled:opacity-50"
            >
              {isUpdating ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  const handleAddCourse = async () => {
    setIsUpdating(true);
    try {
      const response = await fetch('/api/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCourse)
      });
      if (response.ok) {
        setIsAddingCourse(false);
        fetchData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleViewProgress = async (student: Student) => {
    try {
      const response = await fetch(`/api/student-progress/${student.id}`);
      const progress = await response.json();
      setSelectedStudentProgress({ student, progress });
    } catch (err) {
      console.error(err);
    }
  };

  const renderAnnouncements = () => (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Campus Announcements</h1>
          <p className="text-slate-500">Stay updated with the latest news and events.</p>
        </div>
        {(user.role === 'dept_admin' || user.role === 'faculty') && (
          <button 
            onClick={() => {
              setAnnouncementForm({ title: '', content: '' });
              setIsAddingAnnouncement(true);
            }}
            className="bg-indigo-600 text-white px-4 py-2 rounded-xl flex items-center justify-center gap-2 text-sm font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all"
          >
            <Plus className="w-4 h-4" /> New Announcement
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6">
        {announcements.map(announcement => (
          <div key={announcement.id} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center shrink-0">
                  <Bell className="w-6 h-6 text-indigo-600" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-lg">{announcement.title}</h3>
                  <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                    <span className="font-semibold text-indigo-600">{announcement.author_name}</span>
                    <span>•</span>
                    <span className="capitalize">{announcement.author_role}</span>
                    <span>•</span>
                    <span>{format(new Date(announcement.created_at), 'MMM d, yyyy • h:mm a')}</span>
                  </div>
                </div>
              </div>
              {(user.role === 'dept_admin' || (user.role === 'faculty' && announcement.author_id === user.id)) && (
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => {
                      setAnnouncementForm({ title: announcement.title, content: announcement.content });
                      setEditingAnnouncement(announcement);
                    }}
                    className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleDeleteAnnouncement(announcement.id)}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
            <div className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">
              {announcement.content}
            </div>
          </div>
        ))}
        {announcements.length === 0 && (
          <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-200">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Bell className="w-8 h-8 text-slate-300" />
            </div>
            <p className="text-slate-400 font-medium">No announcements yet.</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderAdminTools = () => (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Department Administration</h1>
          <p className="text-slate-500">Oversee courses, faculty, and student progress.</p>
        </div>
        <button 
          onClick={() => setIsAddingCourse(true)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-xl flex items-center justify-center gap-2 text-sm font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all"
        >
          <Plus className="w-4 h-4" /> Add New Course
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Course Management */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-indigo-500" />
              Course Catalog
            </h3>
          </div>
          <div className="space-y-4">
            {courses.map(course => (
              <div key={course.id} className="p-4 rounded-xl border border-slate-100 hover:border-indigo-100 transition-all">
                <div className="flex items-center justify-between mb-1">
                  <p className="font-bold text-slate-900">{course.name}</p>
                  <span className="text-[10px] font-bold bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full uppercase">
                    {course.code}
                  </span>
                </div>
                <p className="text-xs text-slate-500">{course.credits} Credits • {user.department_name}</p>
              </div>
            ))}
            {courses.length === 0 && (
              <div className="text-center py-8 text-slate-400 text-sm">No courses registered yet.</div>
            )}
          </div>
        </div>

        {/* Faculty Oversight */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-500" />
              Faculty Directory
            </h3>
          </div>
          <div className="space-y-4">
            {faculty.map(f => (
              <div key={f.id} className="flex items-center gap-4 p-3 rounded-xl hover:bg-slate-50 transition-all border border-transparent hover:border-slate-100">
                <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600 font-bold">
                  {f.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-slate-900 truncate">{f.name}</p>
                    {f.type && (
                      <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                        {f.type}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 truncate">{f.email}</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Location</span>
                  <span className="text-xs font-medium text-slate-700">{f.block_name || 'N/A'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Student Progress Reports */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-bold text-slate-900 flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-amber-500" />
            Student Progress Reports
          </h3>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search students..." 
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left border-b border-slate-100">
                <th className="pb-4 font-bold text-slate-400 text-xs uppercase tracking-wider">Student</th>
                <th className="pb-4 font-bold text-slate-400 text-xs uppercase tracking-wider">Year/Section</th>
                <th className="pb-4 font-bold text-slate-400 text-xs uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {students.map(student => (
                <tr key={student.id} className="group hover:bg-slate-50/50 transition-all">
                  <td className="py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-slate-600 font-bold text-xs">
                        {student.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">{student.name}</p>
                        <p className="text-[10px] text-slate-500">{student.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4">
                    <span className="text-sm text-slate-600 font-medium">{student.year} Year • Section {student.section}</span>
                  </td>
                  <td className="py-4">
                    <button 
                      onClick={() => handleViewProgress(student)}
                      className="text-indigo-600 text-xs font-bold hover:underline"
                    >
                      View Report
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const content = () => {
    switch (activeTab) {
      case 'dashboard': return renderDashboard();
      case 'timetable': return renderTimetable();
      case 'students': return renderStudents();
      case 'attendance': return renderAttendance();
      case 'campus': return renderCampusMap();
      case 'departments': return renderCampus();
      case 'settings': return renderSettings();
      case 'admin': return renderAdminTools();
      case 'announcements': return renderAnnouncements();
      default: return renderDashboard();
    }
  };

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto">
      {content()}

      {/* Announcement Modals */}
      <AnimatePresence>
        {(isAddingAnnouncement || editingAnnouncement) && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-bold text-slate-900">
                  {editingAnnouncement ? 'Edit Announcement' : 'New Announcement'}
                </h3>
                <button 
                  onClick={() => {
                    setIsAddingAnnouncement(false);
                    setEditingAnnouncement(null);
                  }} 
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={editingAnnouncement ? handleUpdateAnnouncement : handleCreateAnnouncement} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Title</label>
                  <input 
                    type="text" 
                    required
                    value={announcementForm.title}
                    onChange={e => setAnnouncementForm({...announcementForm, title: e.target.value})}
                    placeholder="e.g. Upcoming Technical Symposium"
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Content</label>
                  <textarea 
                    required
                    rows={6}
                    value={announcementForm.content}
                    onChange={e => setAnnouncementForm({...announcementForm, content: e.target.value})}
                    placeholder="Write your announcement message here..."
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  />
                </div>
                <div className="pt-4 flex gap-3">
                  <button 
                    type="button"
                    onClick={() => {
                      setIsAddingAnnouncement(false);
                      setEditingAnnouncement(null);
                    }}
                    className="flex-1 px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-50 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={isUpdating}
                    className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 disabled:opacity-50"
                  >
                    {isUpdating ? 'Saving...' : editingAnnouncement ? 'Update Announcement' : 'Post Announcement'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Admin Modals */}
      <AnimatePresence>
        {isAddingCourse && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-bold text-slate-900">Add New Course</h3>
                <button onClick={() => setIsAddingCourse(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Course Code</label>
                  <input 
                    type="text" 
                    value={newCourse.code}
                    onChange={e => setNewCourse({...newCourse, code: e.target.value})}
                    placeholder="e.g. CS101"
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Course Name</label>
                  <input 
                    type="text" 
                    value={newCourse.name}
                    onChange={e => setNewCourse({...newCourse, name: e.target.value})}
                    placeholder="e.g. Introduction to Programming"
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Credits</label>
                  <input 
                    type="number" 
                    value={newCourse.credits}
                    onChange={e => setNewCourse({...newCourse, credits: parseInt(e.target.value) || 0})}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex gap-3">
                <button onClick={() => setIsAddingCourse(false)} className="flex-1 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all">Cancel</button>
                <button onClick={handleAddCourse} disabled={isUpdating} className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all disabled:opacity-50">
                  {isUpdating ? 'Adding...' : 'Add Course'}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {selectedStudentProgress && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-100"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900">Progress Report: {selectedStudentProgress.student.name}</h3>
                  <p className="text-xs text-slate-500">{selectedStudentProgress.student.email}</p>
                </div>
                <button onClick={() => setSelectedStudentProgress(null)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 max-h-[60vh] overflow-y-auto space-y-8">
                {/* Attendance Summary */}
                <div>
                  <h4 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    Attendance Breakdown
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedStudentProgress.progress.attendance.map((att: any) => (
                      <div key={att.subject} className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-xs font-bold text-slate-700">{att.subject}</span>
                          <div className="text-right">
                            <span className="text-xs font-bold text-indigo-600 block">{Math.round((att.present / att.total) * 100)}%</span>
                            {att.dept_avg !== null && (
                              <span className="text-[10px] text-slate-400">Dept Avg: {att.dept_avg}%</span>
                            )}
                          </div>
                        </div>
                        <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                            style={{ width: `${(att.present / att.total) * 100}%` }}
                          />
                        </div>
                        <p className="text-[10px] text-slate-500 mt-2">{att.present} present out of {att.total} classes</p>
                      </div>
                    ))}
                    {selectedStudentProgress.progress.attendance.length === 0 && (
                      <div className="col-span-2 text-center py-4 text-slate-400 text-xs italic">No attendance records found.</div>
                    )}
                  </div>
                </div>

                {/* Academic Progress */}
                <div>
                  <h4 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-indigo-500" />
                    Academic Records
                  </h4>
                  <div className="space-y-3">
                    {selectedStudentProgress.progress.courses.map((course: any) => (
                      <div key={course.code} className="flex items-center justify-between p-3 rounded-xl border border-slate-100">
                        <div>
                          <p className="text-sm font-bold text-slate-900">{course.name}</p>
                          <p className="text-[10px] text-slate-500 uppercase">{course.code} • {course.semester} {course.year}</p>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-bold text-slate-900 bg-slate-100 px-2 py-1 rounded-lg">
                            Grade: {course.grade || 'Pending'}
                          </span>
                        </div>
                      </div>
                    ))}
                    {selectedStudentProgress.progress.courses.length === 0 && (
                      <div className="text-center py-4 text-slate-400 text-xs italic">No course enrollments found.</div>
                    )}
                  </div>
                </div>
              </div>
              <div className="p-6 border-t border-slate-100 bg-slate-50/50">
                <button onClick={() => setSelectedStudentProgress(null)} className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all">Close Report</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Student Modal */}
      <AnimatePresence>
        {editingStudent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h3 className="font-bold text-slate-900">Edit Student Profile</h3>
                <button 
                  onClick={() => setEditingStudent(null)}
                  className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>
              <form onSubmit={handleUpdateStudent} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={editingStudent.name}
                    onChange={(e) => setEditingStudent({ ...editingStudent, name: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    value={editingStudent.email}
                    onChange={(e) => setEditingStudent({ ...editingStudent, email: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Department</label>
                  <select 
                    value={editingStudent.department_id}
                    onChange={(e) => setEditingStudent({ ...editingStudent, department_id: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                  >
                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Year</label>
                    <input
                      type="number"
                      required
                      min="1"
                      max="4"
                      value={editingStudent.year}
                      onChange={(e) => setEditingStudent({ ...editingStudent, year: parseInt(e.target.value) || 0 })}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Section</label>
                    <input
                      type="text"
                      required
                      value={editingStudent.section}
                      onChange={(e) => setEditingStudent({ ...editingStudent, section: e.target.value })}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                    />
                  </div>
                </div>
                <div className="pt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setEditingStudent(null)}
                    className="flex-1 px-4 py-2 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isUpdating}
                    className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all disabled:opacity-50"
                  >
                    {isUpdating ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Student Modal */}
      <AnimatePresence>
        {isAddingStudent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h3 className="font-bold text-slate-900">Add New Student</h3>
                <button 
                  onClick={() => setIsAddingStudent(false)}
                  className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>
              <form onSubmit={handleAddStudent} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={newStudent.name}
                    onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                    placeholder="e.g. John Doe"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    value={newStudent.email}
                    onChange={(e) => setNewStudent({ ...newStudent, email: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                    placeholder="john@example.com"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Password</label>
                  <input
                    type="password"
                    value={newStudent.password}
                    onChange={(e) => setNewStudent({ ...newStudent, password: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                    placeholder="Default: password123"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Department</label>
                  <select 
                    value={newStudent.department_id}
                    onChange={(e) => setNewStudent({ ...newStudent, department_id: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                  >
                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Year</label>
                    <input
                      type="number"
                      required
                      min="1"
                      max="4"
                      value={newStudent.year}
                      onChange={(e) => setNewStudent({ ...newStudent, year: parseInt(e.target.value) || 0 })}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Section</label>
                    <select 
                      value={newStudent.section}
                      onChange={(e) => setNewStudent({ ...newStudent, section: e.target.value })}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                    >
                      {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K'].map(s => <option key={s} value={s}>Section {s}</option>)}
                    </select>
                  </div>
                </div>
                <div className="pt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsAddingStudent(false)}
                    className="flex-1 px-4 py-2 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isUpdating}
                    className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all disabled:opacity-50"
                  >
                    {isUpdating ? 'Adding...' : 'Add Student'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Department Modal */}
      <AnimatePresence>
        {isAddingDept && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h3 className="font-bold text-slate-900">Add New Department</h3>
                <button 
                  onClick={() => setIsAddingDept(false)}
                  className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>
              <form onSubmit={handleAddDepartment} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Department Name</label>
                  <input
                    type="text"
                    required
                    value={newDept.name}
                    onChange={(e) => setNewDept({ ...newDept, name: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                    placeholder="e.g. Electrical Engineering"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Location</label>
                  <input
                    type="text"
                    required
                    value={newDept.location}
                    onChange={(e) => setNewDept({ ...newDept, location: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                    placeholder="e.g. Block C, 3rd Floor"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Department Photo</label>
                  <div className="space-y-3">
                    {newDept.image_url && (
                      <div className="relative w-full h-32 rounded-xl overflow-hidden border border-slate-200">
                        <img 
                          src={newDept.image_url} 
                          alt="Preview" 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                        <button 
                          type="button"
                          onClick={() => setNewDept({ ...newDept, image_url: '' })}
                          className="absolute top-2 right-2 p-1 bg-white/80 backdrop-blur-sm rounded-full shadow-sm hover:bg-white transition-colors"
                        >
                          <X className="w-4 h-4 text-slate-600" />
                        </button>
                      </div>
                    )}
                    
                    <div className="flex gap-3">
                      <label className="w-full cursor-pointer">
                        <div className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-50 border border-dashed border-slate-300 rounded-xl hover:bg-slate-100 transition-all text-sm text-slate-600 font-medium">
                          {uploading ? (
                            <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                          ) : (
                            <Camera className="w-4 h-4" />
                          )}
                          {uploading ? 'Uploading...' : 'Upload Local Image'}
                        </div>
                        <input 
                          type="file" 
                          className="hidden" 
                          accept="image/*"
                          onChange={handleFileUpload}
                          disabled={uploading}
                        />
                      </label>
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1 italic">Please upload a local image for the department.</p>
                </div>
                <div className="pt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsAddingDept(false)}
                    className="flex-1 px-4 py-2 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isUpdating}
                    className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all disabled:opacity-50"
                  >
                    {isUpdating ? 'Adding...' : 'Add Department'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Department Modal */}
      <AnimatePresence>
        {editingDept && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h3 className="font-bold text-slate-900">Edit Department</h3>
                <button 
                  onClick={() => setEditingDept(null)}
                  className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>
              <form onSubmit={handleUpdateDepartment} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Department Name</label>
                  <input
                    type="text"
                    required
                    value={editingDept.name}
                    onChange={(e) => setEditingDept({ ...editingDept, name: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Location</label>
                  <input
                    type="text"
                    required
                    value={editingDept.location}
                    onChange={(e) => setEditingDept({ ...editingDept, location: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                  />
                </div>
                <div className="pt-4 flex flex-col gap-3">
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setEditingDept(null)}
                      className="flex-1 px-4 py-2 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isUpdating}
                      className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all disabled:opacity-50"
                    >
                      {isUpdating ? 'Updating...' : 'Save Changes'}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteDepartment(editingDept.id)}
                    className="w-full px-4 py-2 border border-red-100 text-red-600 rounded-xl text-sm font-bold hover:bg-red-50 transition-all flex items-center justify-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" /> Delete Department
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Classroom Modal */}
      <AnimatePresence>
        {isAddingClassroom && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h3 className="font-bold text-slate-900">Add New Classroom</h3>
                <button 
                  onClick={() => setIsAddingClassroom(false)}
                  className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>
              <form onSubmit={handleAddClassroom} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Room Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Room 101"
                    value={newClassroom.name}
                    onChange={(e) => setNewClassroom({ ...newClassroom, name: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Capacity</label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={newClassroom.capacity}
                      onChange={(e) => setNewClassroom({ ...newClassroom, capacity: parseInt(e.target.value) || 0 })}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Block</label>
                    <select
                      value={newClassroom.block_id}
                      onChange={(e) => setNewClassroom({ ...newClassroom, block_id: parseInt(e.target.value) || 0 })}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                    >
                      {blocks.map(block => (
                        <option key={block.id} value={block.id}>{block.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Department (Optional)</label>
                  <select
                    value={newClassroom.department_id || ''}
                    onChange={(e) => setNewClassroom({ ...newClassroom, department_id: e.target.value ? parseInt(e.target.value) : undefined })}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                  >
                    <option value="">Unassigned</option>
                    {departments.map(dept => (
                      <option key={dept.id} value={dept.id}>{dept.name}</option>
                    ))}
                  </select>
                </div>
                <div className="pt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsAddingClassroom(false)}
                    className="flex-1 px-4 py-2 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isUpdating}
                    className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all disabled:opacity-50"
                  >
                    {isUpdating ? 'Adding...' : 'Add Classroom'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Classroom Modal */}
      <AnimatePresence>
        {editingClassroom && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h3 className="font-bold text-slate-900">Edit Classroom</h3>
                <button 
                  onClick={() => setEditingClassroom(null)}
                  className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>
              <form onSubmit={handleUpdateClassroom} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Room Name</label>
                  <input
                    type="text"
                    required
                    value={editingClassroom.name}
                    onChange={(e) => setEditingClassroom({ ...editingClassroom, name: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Capacity</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={editingClassroom.capacity}
                    onChange={(e) => setEditingClassroom({ ...editingClassroom, capacity: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Department</label>
                  <select
                    value={editingClassroom.department_id || ''}
                    onChange={(e) => setEditingClassroom({ ...editingClassroom, department_id: e.target.value ? parseInt(e.target.value) : undefined })}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                  >
                    <option value="">Unassigned</option>
                    {departments.map(dept => (
                      <option key={dept.id} value={dept.id}>{dept.name}</option>
                    ))}
                  </select>
                </div>
                <div className="pt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setEditingClassroom(null)}
                    className="flex-1 px-4 py-2 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isUpdating}
                    className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all disabled:opacity-50"
                  >
                    {isUpdating ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* View Room Students Modal */}
      <AnimatePresence>
        {viewingRoomStudents && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-100"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div>
                  <h3 className="font-bold text-slate-900">Students in {viewingRoomStudents.room.name}</h3>
                  <p className="text-xs text-slate-500 mt-1">Total: {viewingRoomStudents.students.length} students</p>
                </div>
                <button 
                  onClick={() => setViewingRoomStudents(null)}
                  className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>
              <div className="p-6 max-h-[60vh] overflow-y-auto">
                {viewingRoomStudents.students.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {viewingRoomStudents.students.map(student => (
                      <div key={student.id} className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                        <p className="font-bold text-slate-900 text-sm">{student.name}</p>
                        <p className="text-xs text-slate-500">{student.email}</p>
                        <div className="mt-2 flex items-center gap-2">
                          <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded text-[10px] font-bold uppercase">
                            Year {student.year}
                          </span>
                          <span className="px-2 py-0.5 bg-slate-200 text-slate-600 rounded text-[10px] font-bold uppercase">
                            Sec {student.section}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Users className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                    <p className="text-slate-500 font-medium">No students found for this classroom.</p>
                  </div>
                )}
              </div>
              <div className="p-6 border-t border-slate-100 bg-slate-50/50">
                <button
                  onClick={() => setViewingRoomStudents(null)}
                  className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Create Timetable Modal */}
      <AnimatePresence>
        {isCreatingTimetable && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h3 className="font-bold text-slate-900">Create New Timetable</h3>
                <button 
                  onClick={() => setIsCreatingTimetable(false)}
                  className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>
              <div className="p-6 overflow-y-auto flex-1 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Department</label>
                    <select 
                      value={timetableForm.department_id}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 0;
                        setTimetableForm({ 
                          ...timetableForm, 
                          department_id: val,
                          entries: timetableForm.entries.map(ent => ({ ...ent, department_id: val }))
                        });
                      }}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                    >
                      {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Year</label>
                    <select 
                      value={timetableForm.year}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 0;
                        setTimetableForm({ 
                          ...timetableForm, 
                          year: val,
                          entries: timetableForm.entries.map(ent => ({ ...ent, year: val }))
                        });
                      }}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                    >
                      {[1, 2, 3, 4].map(y => <option key={y} value={y}>Year {y}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Section</label>
                    <select 
                      value={timetableForm.section}
                      onChange={(e) => {
                        const val = e.target.value;
                        setTimetableForm({ 
                          ...timetableForm, 
                          section: val,
                          entries: timetableForm.entries.map(ent => ({ ...ent, section: val }))
                        });
                      }}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                    >
                      {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K'].map(s => <option key={s} value={s}>Section {s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Faculty Type</label>
                    <select 
                      value={timetableForm.faculty_type}
                      onChange={(e) => {
                        setTimetableForm({ ...timetableForm, faculty_type: e.target.value });
                      }}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                    >
                      <option value="All">All Types</option>
                      <option value="Professor">Professor</option>
                      <option value="Assistant Professor">Assistant Professor</option>
                      <option value="Associate Professor">Associate Professor</option>
                      <option value="Lecturer">Lecturer</option>
                      <option value="Lab Assistant">Lab Assistant</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Periods/Day</label>
                    <input 
                      type="number"
                      min="1"
                      max="8"
                      value={timetableForm.periods}
                      onChange={(e) => {
                        const p = parseInt(e.target.value) || 0;
                        setTimetableForm({ ...timetableForm, periods: p });
                      }}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map(day => (
                    <div key={day} className="space-y-2">
                      <h4 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-1">{day}</h4>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                        {PERIOD_TIMINGS.slice(0, timetableForm.periods).map((slot, i) => {
                          const existingEntry = timetableForm.entries.find(e => e.day === day && e.start_time === slot.start);
                          const filteredFaculty = facultySuggestions.filter(f => 
                            timetableForm.faculty_type === 'All' || f.type === timetableForm.faculty_type
                          );
                          
                          return (
                            <div key={i} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                              <p className="text-[10px] font-bold text-slate-400">{slot.start} - {slot.end}</p>
                              <input 
                                type="text"
                                placeholder="Subject"
                                value={existingEntry?.subject || ''}
                                onChange={(e) => {
                                  const newEntries = [...timetableForm.entries];
                                  const idx = newEntries.findIndex(ent => ent.day === day && ent.start_time === slot.start);
                                  if (idx >= 0) {
                                    newEntries[idx].subject = e.target.value;
                                  } else {
                                    newEntries.push({
                                      day,
                                      start_time: slot.start,
                                      end_time: slot.end,
                                      subject: e.target.value,
                                      department_id: timetableForm.department_id,
                                      year: timetableForm.year,
                                      section: timetableForm.section,
                                      faculty_id: filteredFaculty[0]?.id || facultySuggestions[0]?.id || user.id,
                                      faculty_name: filteredFaculty[0]?.name || facultySuggestions[0]?.name || user.name,
                                      classroom_id: classroomSuggestions[0]?.id || 1,
                                      classroom_name: classroomSuggestions[0]?.name || ''
                                    });
                                  }
                                  setTimetableForm({ ...timetableForm, entries: newEntries });
                                }}
                                className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs outline-none focus:ring-1 focus:ring-indigo-500"
                              />
                              <div className="grid grid-cols-2 gap-2">
                                <input 
                                  type="text"
                                  list={`faculty-list-${day}-${slot.start}`}
                                  placeholder="Faculty Name"
                                  value={existingEntry?.faculty_name || (facultySuggestions.find(f => f.id === existingEntry?.faculty_id)?.name) || ''}
                                  onChange={(e) => {
                                    const name = e.target.value;
                                    const matchedFaculty = facultySuggestions.find(f => f.name === name);
                                    const newEntries = [...timetableForm.entries];
                                    const idx = newEntries.findIndex(ent => ent.day === day && ent.start_time === slot.start);
                                    
                                    const entryData = {
                                      day,
                                      start_time: slot.start,
                                      end_time: slot.end,
                                      subject: existingEntry?.subject || '',
                                      department_id: timetableForm.department_id,
                                      year: timetableForm.year,
                                      section: timetableForm.section,
                                      faculty_id: matchedFaculty ? matchedFaculty.id : null,
                                      faculty_name: name,
                                      classroom_id: existingEntry?.classroom_id || classroomSuggestions[0]?.id || 1
                                    };

                                    if (idx >= 0) {
                                      newEntries[idx] = { ...newEntries[idx], ...entryData };
                                    } else {
                                      newEntries.push(entryData);
                                    }
                                    setTimetableForm({ ...timetableForm, entries: newEntries });
                                  }}
                                  className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-[10px] outline-none focus:ring-1 focus:ring-indigo-500"
                                />
                                <datalist id={`faculty-list-${day}-${slot.start}`}>
                                  {filteredFaculty.map(f => (
                                    <option key={f.id} value={f.name}>
                                      {f.type ? `(${f.type})` : ''}
                                    </option>
                                  ))}
                                </datalist>
                                <input 
                                  type="text"
                                  list={`room-list-${day}-${slot.start}`}
                                  placeholder="Room"
                                  value={existingEntry?.classroom_name || (classroomSuggestions.find(c => c.id === existingEntry?.classroom_id)?.name) || ''}
                                  onChange={(e) => {
                                    const name = e.target.value;
                                    const matchedRoom = classroomSuggestions.find(c => c.name === name);
                                    const newEntries = [...timetableForm.entries];
                                    const idx = newEntries.findIndex(ent => ent.day === day && ent.start_time === slot.start);
                                    
                                    const entryData = {
                                      day,
                                      start_time: slot.start,
                                      end_time: slot.end,
                                      subject: existingEntry?.subject || '',
                                      department_id: timetableForm.department_id,
                                      year: timetableForm.year,
                                      section: timetableForm.section,
                                      faculty_id: existingEntry?.faculty_id || filteredFaculty[0]?.id || facultySuggestions[0]?.id || user.id,
                                      faculty_name: existingEntry?.faculty_name || filteredFaculty[0]?.name || facultySuggestions[0]?.name || user.name,
                                      classroom_id: matchedRoom ? matchedRoom.id : null,
                                      classroom_name: name
                                    };

                                    if (idx >= 0) {
                                      newEntries[idx] = { ...newEntries[idx], ...entryData };
                                    } else {
                                      newEntries.push(entryData);
                                    }
                                    setTimetableForm({ ...timetableForm, entries: newEntries });
                                  }}
                                  className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-[10px] outline-none focus:ring-1 focus:ring-indigo-500"
                                />
                                <datalist id={`room-list-${day}-${slot.start}`}>
                                  {classroomSuggestions.map(c => (
                                    <option key={c.id} value={c.name} />
                                  ))}
                                </datalist>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex gap-3">
                <button
                  onClick={() => setIsCreatingTimetable(false)}
                  className="flex-1 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleClearTimetable}
                  disabled={isUpdating}
                  className="flex-1 px-4 py-2 bg-red-50 border border-red-100 rounded-xl text-sm font-bold text-red-600 hover:bg-red-100 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" /> Clear Timetable
                </button>
                <button
                  onClick={handleCreateTimetable}
                  disabled={isUpdating}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all disabled:opacity-50"
                >
                  {isUpdating ? 'Saving...' : 'Create Timetable'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

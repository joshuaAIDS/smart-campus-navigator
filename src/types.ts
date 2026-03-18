export type UserRole = 'student' | 'faculty' | 'dept_admin' | 'visitor';

export interface User {
  id: number;
  email: string;
  role: UserRole;
  name: string;
  department_id: number;
  department_name?: string;
  year?: number;
  section?: string;
}

export interface Department {
  id: number;
  name: string;
  location: string;
  image_url?: string;
}

export interface Block {
  id: number;
  name: string;
  type: string;
  image_url?: string;
}

export interface Classroom {
  id: number;
  block_id: number;
  name: string;
  capacity: number;
  block_name?: string;
}

export interface TimetableEntry {
  id: number;
  department_id: number;
  faculty_id: number;
  classroom_id: number;
  day: string;
  start_time: string;
  end_time: string;
  subject: string;
  year: number;
  section: string;
  classroom_name?: string;
  faculty_name?: string;
}

export interface AttendanceRecord {
  id: number;
  student_id: number;
  timetable_id: number;
  date: string;
  status: 'present' | 'absent';
  subject?: string;
}

export interface Student {
  id: number;
  name: string;
  email: string;
  department_name: string;
  department_id?: number;
  year: number;
  section: string;
}

export interface Course {
  id: number;
  code: string;
  name: string;
  department_id: number;
  credits: number;
}

export interface Faculty {
  id: number;
  name: string;
  email: string;
  department_name: string;
  block_name?: string;
  type?: string;
}

export interface Announcement {
  id: number;
  title: string;
  content: string;
  author_id: number;
  author_name: string;
  author_role: UserRole;
  created_at: string;
  updated_at: string;
}

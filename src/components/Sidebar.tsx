import React from 'react';
import { 
  LayoutDashboard, 
  Calendar, 
  Users, 
  Building2, 
  BookOpen, 
  LogOut, 
  GraduationCap,
  MapPin,
  CheckCircle2,
  Settings,
  Sparkles,
  Bell
} from 'lucide-react';
import { User } from '../types';
import { cn } from '../lib/utils';

interface SidebarProps {
  user: User;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
  isOpen: boolean;
}

export default function Sidebar({ user, activeTab, setActiveTab, onLogout, isOpen }: SidebarProps) {
  const menuItems = [
    ...(user.role === 'dept_admin' ? [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'announcements', label: 'Announcements', icon: Bell },
      { id: 'timetable', label: 'Timetable', icon: Calendar },
      { id: 'attendance', label: 'Attendance', icon: CheckCircle2 },
      { id: 'admin', label: 'Admin Tools', icon: Settings },
      { id: 'students', label: 'Students', icon: Users },
      { id: 'departments', label: 'Infrastructure', icon: Building2 },
      { id: 'campus', label: 'Campus Map', icon: MapPin },
    ] : user.role === 'faculty' ? [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'announcements', label: 'Announcements', icon: Bell },
      { id: 'timetable', label: 'Timetable', icon: Calendar },
      { id: 'attendance', label: 'Attendance', icon: CheckCircle2 },
      { id: 'students', label: 'Students', icon: Users },
      { id: 'departments', label: 'Infrastructure', icon: Building2 },
      { id: 'campus', label: 'Campus Map', icon: MapPin },
    ] : user.role === 'visitor' ? [
      { id: 'announcements', label: 'Announcements', icon: Bell },
      { id: 'campus', label: 'Campus Map', icon: MapPin },
      { id: 'ai', label: 'Smart Campus AI', icon: Sparkles },
    ] : [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'announcements', label: 'Announcements', icon: Bell },
      { id: 'timetable', label: 'Timetable', icon: Calendar },
      { id: 'attendance', label: 'Attendance', icon: CheckCircle2 },
      { id: 'profile', label: 'My Profile', icon: GraduationCap },
      { id: 'campus', label: 'Campus Map', icon: MapPin },
    ]),
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className={cn(
      "fixed lg:sticky top-0 left-0 z-40 w-64 bg-white border-r border-slate-200 flex flex-col h-screen transition-transform duration-300 ease-in-out lg:translate-x-0",
      isOpen ? "translate-x-0" : "-translate-x-full"
    )}>
      <div className="p-6 flex items-center gap-3 border-b border-slate-100">
        <img 
          src="/logo.png" 
          alt="Smart Campus Navigator" 
          className="h-10 w-auto object-contain"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
            e.currentTarget.nextElementSibling?.classList.remove('hidden');
          }}
        />
        <div className="hidden flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-100">
            <GraduationCap className="w-6 h-6 text-white" />
          </div>
          <span className="font-bold text-xl text-slate-900 tracking-tight leading-tight">Smart Campus<br/><span className="text-indigo-600">Navigator</span></span>
        </div>
      </div>

      <div className="flex-1 py-6 px-4 space-y-1 overflow-y-auto">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => {
              if (item.id === 'ai') {
                window.open('https://smartcampusllm.netlify.app', '_blank');
              } else {
                setActiveTab(item.id);
              }
            }}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group text-sm font-medium",
              activeTab === item.id 
                ? "bg-indigo-50 text-indigo-600 shadow-sm" 
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
            )}
          >
            <item.icon className={cn(
              "w-5 h-5 transition-colors",
              activeTab === item.id ? "text-indigo-600" : "text-slate-400 group-hover:text-slate-600"
            )} />
            {item.label}
          </button>
        ))}
      </div>

      <div className="p-4 border-t border-slate-100">
        <div className="bg-slate-50 rounded-2xl p-4 mb-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Signed in as</p>
          <p className="text-sm font-bold text-slate-900 truncate">{user.name}</p>
          <p className="text-[10px] font-medium text-indigo-600 uppercase mt-0.5">{user.role}</p>
        </div>
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-500 hover:bg-red-50 hover:text-red-600 transition-all duration-200 text-sm font-medium"
        >
          <LogOut className="w-5 h-5" />
          Sign Out
        </button>
      </div>
    </div>
  );
}

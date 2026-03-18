import React, { useState } from 'react';
import { User } from '../types';
import { auth, db } from '../lib/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { GraduationCap, Lock, Mail, Loader2, Eye, EyeOff } from 'lucide-react';
import { motion } from 'motion/react';

interface LoginProps {
  onLogin: (user: User) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // 1. Sign in with Firebase Auth 
      // Note: Firebase usually requires a password. If your Firebase users 
      // have no password, ensure your Firebase settings allow it or use 
      // a placeholder 'password' if the field is empty.
      const loginPassword = password || 'password'; 
      
      const userCredential = await signInWithEmailAndPassword(auth, email, loginPassword);
      const fbUser = userCredential.user;

      // 2. Fetch the specific User Role from Firestore
      const userDocSnap = await getDoc(doc(db, 'users', fbUser.uid));

      if (userDocSnap.exists()) {
        const userData = userDocSnap.data();
        
        onLogin({
          id: fbUser.uid as any,
          email: fbUser.email || '',
          name: userData.name || fbUser.displayName || email.split('@')[0],
          role: userData.role || 'student', 
          department_id: userData.department_id || 1,
          department_name: userData.department_name || 'General'
        });
      } else {
        setError("User profile not found in database.");
      }

    } catch (err: any) {
      setError('Login failed. Please check your email.');
    } finally {
      setLoading(false);
    }
  };

  const handleVisitorLogin = () => {
    onLogin({
      id: 999,
      name: 'Guest Visitor',
      email: 'visitor@campus.edu',
      role: 'visitor',
      department_id: 1,
      department_name: 'General'
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-slate-100"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mb-4">
            <GraduationCap className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 text-center">Smart Campus Navigator</h1>
          <p className="text-slate-500 text-sm mt-1">Sign in with Email Only</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                placeholder="user@college.edu"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Password (Optional)</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                placeholder="Leave empty for default"
              />
            </div>
          </div>

          {error && <p className="text-red-500 text-sm text-center font-medium">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Sign In'}
          </button>
          
          <button
            type="button"
            onClick={handleVisitorLogin}
            className="w-full mt-4 bg-white border-2 border-slate-200 text-slate-700 font-semibold py-3 rounded-xl"
          >
            Guest Visitor
          </button>
        </form>
      </motion.div>
    </div>
  );
}
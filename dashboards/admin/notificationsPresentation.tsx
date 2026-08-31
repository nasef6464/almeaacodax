import React from 'react';
import { Bell, CheckCircle2, Clock, Mail, MessageSquare, RefreshCcw, XCircle } from 'lucide-react';
import { Role } from '../../types';

export type Channel = 'in_app' | 'email' | 'whatsapp';

export type TemplateItem = {
  key: string;
  name?: string;
  channel: Channel;
  title: string;
  body: string;
  isActive?: boolean;
};

export type DeliveryItem = {
  id: string;
  channel: Channel;
  status: 'pending' | 'sent' | 'failed' | 'retrying';
  title?: string;
  body?: string;
  createdAt?: string;
  recipientUserId?: string;
  readAt?: number;
};

export const ROLE_OPTIONS: Array<{ id: Role; label: string; color: string }> = [
  { id: Role.STUDENT, label: 'طلاب', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { id: Role.PARENT, label: 'أولياء أمور', color: 'bg-purple-100 text-purple-700 border-purple-200' },
  { id: Role.TEACHER, label: 'معلمون', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  { id: Role.SUPERVISOR, label: 'مشرفون', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  { id: Role.ADMIN, label: 'مديرون', color: 'bg-rose-100 text-rose-700 border-rose-200' },
];

export const CHANNEL_META: Record<Channel, { label: string; icon: React.ReactNode; active: string; inactive: string }> = {
  in_app: { label: 'داخل التطبيق', icon: <Bell size={14} />, active: 'bg-indigo-600 text-white border-indigo-600', inactive: 'bg-white text-gray-600 border-gray-200' },
  email: { label: 'بريد إلكتروني', icon: <Mail size={14} />, active: 'bg-sky-600 text-white border-sky-600', inactive: 'bg-white text-gray-600 border-gray-200' },
  whatsapp: { label: 'واتساب', icon: <MessageSquare size={14} />, active: 'bg-green-600 text-white border-green-600', inactive: 'bg-white text-gray-600 border-gray-200' },
};

export const STATUS_STYLE: Record<string, string> = {
  sent: 'bg-emerald-50 text-emerald-700 border-emerald-100', pending: 'bg-amber-50 text-amber-700 border-amber-100', failed: 'bg-rose-50 text-rose-700 border-rose-100', retrying: 'bg-orange-50 text-orange-700 border-orange-100',
};

export const STATUS_LABEL: Record<string, string> = {
  sent: 'مُرسَل', pending: 'معلق', failed: 'فاشل', retrying: 'إعادة محاولة',
};

export const StatusIcon: React.FC<{ status: string }> = ({ status }) => {
  if (status === 'sent') return <CheckCircle2 size={13} className="text-emerald-600" />;
  if (status === 'failed') return <XCircle size={13} className="text-rose-600" />;
  if (status === 'pending') return <Clock size={13} className="text-amber-600" />;
  return <RefreshCcw size={13} className="text-orange-500" />;
};

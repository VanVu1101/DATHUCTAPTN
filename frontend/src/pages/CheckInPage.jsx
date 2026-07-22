import '../App.css';
import { useEffect, useMemo, useState } from 'react';
import {
  submitCheckIn,
  submitCheckOut,
  getMyCheckIns,
  getCachedCheckIns,
  getAdminCheckInSummary,
  getAdminCheckInDetail,
} from '../services/checkInService';
import { getSchedules, createSchedule, updateSchedule, deleteSchedule } from '../services/scheduleService';
import { getMeetings, createMeeting, updateMeeting, deleteMeeting } from '../services/meetingService';
import { getMyProfile, getStoredProfile } from '../services/studentService';
import { getAllPeriods } from '../services/periodService';

const initialAdminForm = {
  title: '',
  type: 'WORK',
  audience: 'ALL_STUDENTS',
  startDate: '',
  endDate: '',
  startTime: '',
  endTime: '',
  location: '',
  description: '',
  meetingDate: '',
  meetingTime: '',
  meetingEndTime: '',
  agenda: '',
  periodId: null,
};

const WEEKDAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

const pad = (value) => String(value).padStart(2, '0');

const minutesToHHMM = (mins) => `${pad(Math.floor(mins/60))}:${pad(mins%60)}`;

const toISODateLocal = (date) => {
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  return `${year}-${month}-${day}`;
};

const parseISODateLocal = (value) => {
  if (!value) return null;
  const [year, month, day] = String(value).split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
};

const formatLongDate = (value) => {
  const date = typeof value === 'string' ? parseISODateLocal(value) : value;
  if (!date || Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('vi-VN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
};

const formatMonthLabel = (value) => {
  const date = parseISODateLocal(value);
  if (!date || Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('vi-VN', { month: 'long', year: 'numeric' }).format(date);
};

const formatDayShort = (value) => {
  const date = parseISODateLocal(value);
  if (!date || Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('vi-VN', { day: 'numeric', month: 'numeric' }).format(date);
};

// Normalize a date string to local YYYY-MM-DD regardless of incoming format
const toLocalDateOnly = (dateStr) => {
  if (!dateStr) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatClock = (value) => {
  if (!value) return '--:--';
  const parts = String(value).split(':');
  if (parts.length < 2) return String(value);
  return `${pad(parts[0])}:${pad(parts[1])}`;
};

const parseTimeValue = (value) => {
  if (!value) return null;
  const text = String(value).trim();

  // Standard 24h format: 15:50
  const colonMatch = /^([0-2]?\d)\s*:\s*([0-5]?\d)$/.exec(text);
  if (colonMatch) {
    const hour = Number(colonMatch[1]);
    const minute = Number(colonMatch[2]);
    if (hour >= 0 && hour < 24 && minute >= 0 && minute < 60) {
      return hour * 60 + minute;
    }
  }

  // Vietnamese format: 15 giờ 50 phút, 15 giờ, 15h50, 15h
  const vietnameseMatch = /^([0-2]?\d)\s*(?:giờ|h)(?:\s*([0-5]?\d)\s*(?:phút|p)?)?$/i.exec(text);
  if (vietnameseMatch) {
    const hour = Number(vietnameseMatch[1]);
    const minute = vietnameseMatch[2] ? Number(vietnameseMatch[2]) : 0;
    if (hour >= 0 && hour < 24 && minute >= 0 && minute < 60) {
      return hour * 60 + minute;
    }
  }

  // Fallback numeric formats like 1550 or 750
  const numericMatch = /^([0-2]?\d)([0-5]?\d)$/.exec(text);
  if (numericMatch) {
    const hour = Number(numericMatch[1]);
    const minute = Number(numericMatch[2]);
    if (hour >= 0 && hour < 24 && minute >= 0 && minute < 60) {
      return hour * 60 + minute;
    }
  }

  return null;
};

const parseClockToMinutes = (value) => {
  if (!value) return null;
  const text = String(value).trim();
  const match = /^(\d{1,2}):(\d{1,2})(?::\d{1,2})?$/.exec(text);
  if (match) {
    const hour = Number(match[1]);
    const minute = Number(match[2]);
    if (hour >= 0 && hour < 24 && minute >= 0 && minute < 60) {
      return hour * 60 + minute;
    }
  }
  return parseTimeValue(text);
};

const getWeekStart = (date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day + 6) % 7;
  d.setDate(d.getDate() - diff);
  return d;
};

const getPrimaryEvent = (scheduleEvents, meetingEvents) => {
  const events = [ ...(scheduleEvents || []).map(e => ({...e, kind:'work'})), ...(meetingEvents || []).map(e => ({...e, kind:'meeting'})) ];
  const withMinutes = events
    .map((ev) => ({ ev, mins: parseTimeValue(ev.rawTime) }))
    .filter(x => x.mins != null)
    .sort((a,b) => a.mins - b.mins);
  return withMinutes.length ? withMinutes[0].ev : null;
};

const getExpectedCheckInStatus = (scheduleEvents, meetingEvents, now = new Date()) => {
  const primary = getPrimaryEvent(scheduleEvents, meetingEvents);
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  if (!primary) {
    // fallback to old behaviour
    return currentMinutes <= 9 * 60 ? 'PRESENT' : (currentMinutes <= 9 * 60 + 30 ? 'LATE' : 'ABSENT');
  }
  const start = parseTimeValue(primary.rawTime);
  if (start == null) return currentMinutes <= 9 * 60 ? 'PRESENT' : (currentMinutes <= 9 * 60 + 30 ? 'LATE' : 'ABSENT');
  const open = Math.max(0, start - 30); // check-in opens 30min before
  const onTimeCutoff = start; // on-time if <= start
  const lateCutoff = start + 30; // late until 30min after
  if (currentMinutes <= onTimeCutoff) return 'PRESENT';
  if (currentMinutes <= lateCutoff) return 'LATE';
  return 'ABSENT';
};

const buildCalendarCells = (monthValue) => {
  const monthDate = parseISODateLocal(monthValue);
  if (!monthDate || Number.isNaN(monthDate.getTime())) return [];

  const year = monthDate.getFullYear();
  const monthIndex = monthDate.getMonth();
  const firstDay = new Date(year, monthIndex, 1);
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const offset = (firstDay.getDay() + 6) % 7;
  const totalCells = Math.ceil((offset + daysInMonth) / 7) * 7;

  return Array.from({ length: totalCells }, (_, index) => {
    const dayNumber = index - offset + 1;
    if (dayNumber < 1 || dayNumber > daysInMonth) return null;
    return toISODateLocal(new Date(year, monthIndex, dayNumber));
  });
};

function CheckInPage() {
  const today = toISODateLocal(new Date());
  const [monthCursor, setMonthCursor] = useState(`${today.slice(0, 7)}-01`);
  const [selectedDate, setSelectedDate] = useState(today);
  const [checkIns, setCheckIns] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [statusMessage, setStatusMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [adminForm, setAdminForm] = useState(initialAdminForm);
  const [periods, setPeriods] = useState([]);
  const [editingScheduleId, setEditingScheduleId] = useState(null);
  const [editingMeetingId, setEditingMeetingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [dayModalOpen, setDayModalOpen] = useState(false);
  const [checkInNote, setCheckInNote] = useState('');
  const [adminAttendance, setAdminAttendance] = useState([]);
  const [attendanceDetail, setAttendanceDetail] = useState(null);
  // Admin paginated schedules
  const [adminPage, setAdminPage] = useState(1);
  const [adminLimit, setAdminLimit] = useState(20);
  const [adminSchedules, setAdminSchedules] = useState([]);
  const [adminTotal, setAdminTotal] = useState(0);
  const [adminFilterPeriodId, setAdminFilterPeriodId] = useState(null);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch (error) {
        setUser(null);
      }
    }
  }, []);

  const loadCheckIns = async () => {
    const cachedCheckIns = getCachedCheckIns();
    if (Array.isArray(cachedCheckIns) && cachedCheckIns.length > 0) {
      setCheckIns(cachedCheckIns);
    }

    setLoading(true);
    try {
      const [profileRes, periodsRes] = await Promise.allSettled([getMyProfile(), getAllPeriods()]);

      let periodId = getStoredProfile()?.periodId || null;
      let loadedPeriods = [];
      if (profileRes.status === 'fulfilled' && profileRes.value?.success) {
        const nextProfile = profileRes.value.data || null;
        setUser((current) => ({ ...(current || {}), ...nextProfile }));
        localStorage.setItem('user', JSON.stringify({ ...(JSON.parse(localStorage.getItem('user') || '{}')), ...nextProfile }));
        periodId = nextProfile?.periodId || periodId;
      }

      if (periodsRes.status === 'fulfilled' && periodsRes.value?.success) {
        loadedPeriods = periodsRes.value.data || [];
        setPeriods(loadedPeriods);
      }

      if (!periodId && loadedPeriods.length > 0) {
        const activePeriod = loadedPeriods.find((period) => period.status === 'ONGOING')
          || loadedPeriods.find((period) => {
            const start = new Date(period.startDate).getTime();
            const end = new Date(period.endDate).getTime();
            const now = Date.now();
            return !Number.isNaN(start) && !Number.isNaN(end) && start <= now && now <= end;
          })
          || loadedPeriods[0];
        periodId = activePeriod?.id || null;
      }
      // set admin filter default
      setAdminFilterPeriodId(periodId);

      const storedRole = (() => {
        try { return JSON.parse(localStorage.getItem('user') || '{}').role; } catch { return null; }
      })();
      const [checkInResult, scheduleResult, meetingResult, adminSummaryResult] = await Promise.allSettled([
        storedRole === 'STUDENT' ? getMyCheckIns() : Promise.resolve({ success: true, data: [] }),
        getSchedules(periodId),
        getMeetings(periodId),
        storedRole === 'ADMIN' ? getAdminCheckInSummary() : Promise.resolve([]),
      ]);

      if (checkInResult.status === 'fulfilled' && checkInResult.value?.success) setCheckIns(checkInResult.value.data || []);
      if (scheduleResult.status === 'fulfilled' && scheduleResult.value?.success) {
        console.log('📅 Schedules received:', scheduleResult.value.data);
        setSchedules(scheduleResult.value.data || []);
      }
      // If admin, also fetch paginated list for management view
      if (storedRole === 'ADMIN') {
        try {
          const adminRes = await getSchedules(periodId, adminPage, adminLimit);
          if (adminRes && adminRes.success && adminRes.data) {
            const payload = adminRes.data;
            // payload may be { rows, count, page, limit }
            setAdminSchedules(payload.rows || []);
            setAdminTotal(payload.count || 0);
          }
        } catch (e) {
          console.warn('Không lấy được danh sách admin paginated', e);
        }
      }
      if (meetingResult.status === 'fulfilled' && meetingResult.value?.success) setMeetings(meetingResult.value.data || []);
      if (adminSummaryResult.status === 'fulfilled') setAdminAttendance(adminSummaryResult.value || []);
    } catch (error) {
      setStatusMessage(error.response?.data?.message || 'Không tải được danh sách check-in.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCheckIns();
  }, []);

  const isAdmin = user?.role === 'ADMIN';
  const isStudent = user?.role === 'STUDENT';

  // Refresh admin paginated list when paging/filter changes
  useEffect(() => {
    if (!isAdmin) return;
    (async () => {
      try {
        const res = await getSchedules(adminFilterPeriodId, adminPage, adminLimit);
        if (res && res.success && res.data) {
          setAdminSchedules(res.data.rows || []);
          setAdminTotal(res.data.count || 0);
        }
      } catch (e) {
        console.warn('Không tải được admin schedules', e);
      }
    })();
  }, [adminPage, adminLimit, adminFilterPeriodId, isAdmin]);
  const calendarCells = useMemo(() => buildCalendarCells(monthCursor), [monthCursor]);
  const currentMonthLabel = useMemo(() => formatMonthLabel(monthCursor), [monthCursor]);

  const monthCheckIns = useMemo(() => {
    const monthPrefix = monthCursor.slice(0, 7);
    return checkIns.filter((item) => String(item.date || '').startsWith(monthPrefix));
  }, [checkIns, monthCursor]);

  const monthlyStats = useMemo(() => {
    const present = monthCheckIns.filter((item) => item.status === 'PRESENT').length;
    const late = monthCheckIns.filter((item) => item.status === 'LATE').length;
    const absent = monthCheckIns.filter((item) => item.status === 'ABSENT').length;

    return {
      present,
      late,
      absent,
      total: monthCheckIns.length,
    };
  }, [monthCheckIns]);

  const todayItem = useMemo(() => checkIns.find((item) => item.date === today), [checkIns, today]);
  const selectedDayCheckIn = useMemo(() => checkIns.find((item) => item.date === selectedDate), [checkIns, selectedDate]);

  const selectedDaySchedules = useMemo(() => {
    return schedules.filter((schedule) => {
      if (!schedule.startDate || !schedule.endDate) return false;
      const startDate = toLocalDateOnly(schedule.startDate);
      const endDate = toLocalDateOnly(schedule.endDate);
      return startDate && endDate && startDate <= selectedDate && selectedDate <= endDate;
    });
  }, [schedules, selectedDate]);

  const selectedDayMeetings = useMemo(() => {
    return meetings.filter((meeting) => {
      if (!meeting.meetingDate) return false;
      const d = new Date(meeting.meetingDate);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const meetingDate = `${year}-${month}-${day}`;
      return meetingDate === selectedDate;
    });
  }, [meetings, selectedDate]);

  const selectedDayExpectedStatus = useMemo(() => {
    if (selectedDayCheckIn) return selectedDayCheckIn.status;
    if (selectedDate !== today) return null;
    return getExpectedCheckInStatus(selectedDaySchedules, selectedDayMeetings, new Date());
  }, [selectedDayCheckIn, selectedDate, today, selectedDaySchedules, selectedDayMeetings]);

  const selectedDayCheckInLabel = useMemo(() => {
    if (todayItem) return 'Đã check-in';
    if (selectedDate !== today) return 'Chỉ check-in hôm nay';
    return 'Check-in ngay';
  }, [selectedDate, today, todayItem]);

  const canCheckInNow = useMemo(() => {
    if (selectedDate !== today) return false;
    return !todayItem;
  }, [selectedDate, today, todayItem]);

  const canCheckOutNow = useMemo(() => {
    if (selectedDate !== today || !todayItem || todayItem.checkOutTime) return false;
    return true;
  }, [selectedDate, today, todayItem]);

  const checkOutDisabledReason = useMemo(() => {
    if (selectedDate !== today) return 'Chỉ có thể check-out cho ngày hôm nay.';
    if (!todayItem) return 'Bạn cần check-in trước khi check-out.';
    if (todayItem.checkOutTime) return 'Bạn đã check-out cho ngày hôm nay rồi.';
    return null;
  }, [selectedDate, today, todayItem]);

  const checkInDisabledReason = useMemo(() => {
    if (selectedDate !== today) return 'Chỉ có thể check-in cho ngày hôm nay.';
    if (todayItem) return 'Bạn đã check-in hôm nay rồi.';
    return null;
  }, [selectedDate, today, todayItem]);

  const getEventsForDate = (date) => {
    // Use centralized local date normalizer

    const scheduleEvents = schedules
      .filter((schedule) => {
        if (!schedule.startDate || !schedule.endDate) return false;
        const startDate = toLocalDateOnly(schedule.startDate);
        const endDate = toLocalDateOnly(schedule.endDate);
        return startDate && endDate && startDate <= date && date <= endDate;
      })
      .map((schedule) => ({
        kind: 'work',
        title: schedule.title,
        time: `${formatClock(schedule.startTime)} • ${formatClock(schedule.endTime)}`,
        location: schedule.location || 'Chưa có địa điểm',
        note: schedule.description || 'Chưa có ghi chú',
        status: schedule.type || 'WORK',
        rawTime: schedule.startTime,
        rawEndTime: schedule.endTime,
        id: schedule.id,
        record: schedule,
      }));

    const meetingEvents = meetings
      .filter((meeting) => {
        if (!meeting.meetingDate) return false;
        const meetingDate = toLocalDateOnly(meeting.meetingDate);
        return meetingDate && meetingDate === date;
      })
      .map((meeting) => ({
        kind: 'meeting',
        title: meeting.title,
        time: `${formatClock(meeting.meetingTime)}${meeting.duration ? ` • ${meeting.duration}` : ''}`,
        location: meeting.location || 'Chưa có địa điểm',
        note: meeting.agenda || 'Chưa có ghi chú',
        status: meeting.status || 'Sắp diễn ra',
        rawTime: meeting.meetingTime,
        rawEndTime: meeting.endTime,
        id: meeting.id,
        record: meeting,
      }));

    return [...scheduleEvents, ...meetingEvents];
  };

  const upcomingEvents = useMemo(() => {
    const items = [
      ...schedules.map((schedule) => ({
        id: `schedule-${schedule.id}`,
        title: schedule.title || 'Lịch công việc',
        detail: `${schedule.startDate || ''}${schedule.endDate && schedule.startDate !== schedule.endDate ? ` → ${schedule.endDate}` : ''}${schedule.startTime || schedule.endTime ? ` · ${schedule.startTime || schedule.endTime}` : ''}`,
        badge: 'Công việc',
        sortKey: `${schedule.endDate || schedule.startDate || '9999-12-31'}T${schedule.endTime || schedule.startTime || '23:59'}`,
      })),
      ...meetings.map((meeting) => ({
        id: `meeting-${meeting.id}`,
        title: meeting.title || 'Lịch họp',
        detail: `${meeting.meetingDate || ''}${meeting.meetingTime ? ` · ${meeting.meetingTime}` : ''}`,
        badge: 'Họp',
        sortKey: `${meeting.meetingDate || '9999-12-31'}T${meeting.meetingTime || '23:59'}`,
      })),
    ].sort((a, b) => a.sortKey.localeCompare(b.sortKey)).slice(0, 4);

    return items;
  }, [schedules, meetings]);

  const selectedDayEvents = useMemo(() => getEventsForDate(selectedDate), [schedules, meetings, selectedDate]);

  const weekStart = useMemo(() => getWeekStart(new Date(today)), [today]);
  const weekEnd = useMemo(() => {
    const end = new Date(weekStart);
    end.setDate(end.getDate() + 6);
    return end;
  }, [weekStart]);

  const weeklyCheckIns = useMemo(() => {
    return checkIns.filter((item) => {
      if (!item?.date) return false;
      const date = parseISODateLocal(item.date);
      return date && date >= weekStart && date <= weekEnd;
    });
  }, [checkIns, weekStart, weekEnd]);

  const weeklySummary = useMemo(
    () => ({
      present: weeklyCheckIns.filter((item) => item.status === 'PRESENT').length,
      late: weeklyCheckIns.filter((item) => item.status === 'LATE').length,
      absent: weeklyCheckIns.filter((item) => item.status === 'ABSENT').length,
      total: weeklyCheckIns.length,
    }),
    [weeklyCheckIns]
  );

  const todayStatus = useMemo(() => {
    if (!todayItem) {
      return { label: 'Chưa check-in', className: 'status-pending' };
    }
    if (todayItem.checkOutTime) {
      return { label: 'Đã kết thúc', className: 'status-done' };
    }
    return { label: 'Đang làm việc', className: 'status-warning' };
  }, [todayItem]);

  const todayWorkingHours = useMemo(() => {
    if (!todayItem?.time) return null;
    const start = parseClockToMinutes(todayItem.time);
    const end = parseClockToMinutes(todayItem.checkOutTime);
    if (start == null || end == null) return null;
    const diff = Math.max(0, end - start) / 60;
    return Number.isFinite(diff) ? `${diff.toFixed(1)} giờ` : null;
  }, [todayItem]);

  const weekCheckinDays = useMemo(() => {
    const uniqueDates = new Set(
      weeklyCheckIns.filter((item) => item?.time).map((item) => item.date)
    );
    return uniqueDates.size;
  }, [weeklyCheckIns]);

  const upcomingEvent = useMemo(() => {
    const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();
    const futureEvents = selectedDayEvents
      .map((event) => ({
        ...event,
        minutes: parseTimeValue(event.rawTime),
      }))
      .filter((event) => event.minutes != null && event.minutes >= nowMinutes)
      .sort((a, b) => a.minutes - b.minutes);
    return futureEvents[0] || null;
  }, [selectedDayEvents]);

  const dayStatusHeadline = useMemo(() => {
    if (upcomingEvent) return `Sắp có ${upcomingEvent.kind === 'meeting' ? 'cuộc họp' : 'công việc'} lúc ${formatClock(upcomingEvent.rawTime)}`;
    if (
      selectedDayEvents.length > 0 &&
      selectedDayEvents.every((event) => {
        const minutes = parseTimeValue(event.rawTime);
        return minutes != null && minutes < new Date().getHours() * 60 + new Date().getMinutes();
      })
    ) {
      return 'Đã hoàn thành nhiệm vụ trong ngày';
    }
    return 'Không có sự kiện thêm';
  }, [selectedDayEvents, upcomingEvent]);

  const handleDayClick = (dateKey) => {
    setSelectedDate(dateKey);
    // always open modal so user can see check-in status and any events for the date
    setDayModalOpen(true);
  };

  const openAttendanceDetail = async (row, status) => {
    try {
      const data = await getAdminCheckInDetail({
        studentId: row.studentId,
        status,
        periodId: undefined,
      });
      setAttendanceDetail(data);
    } catch (error) {
      setStatusMessage(error.response?.data?.message || 'Không tải được chi tiết điểm danh.');
    }
  };

  const selectedCheckInStatus = useMemo(() => {
    if (selectedDayCheckIn) return selectedDayCheckIn.status;
    if (selectedDate !== today) return null;
    return selectedDayExpectedStatus;
  }, [selectedDayCheckIn, selectedDate, today, selectedDayExpectedStatus]);

  const selectedStatusLabel = selectedDayCheckIn
    ? selectedDayCheckIn.checkOutTime
      ? 'Đã check-out'
      : selectedDayCheckIn.status === 'PRESENT'
        ? 'Đúng giờ'
        : selectedDayCheckIn.status === 'LATE'
          ? 'Đi muộn'
          : 'Vắng'
    : selectedDate === today
      ? 'Chưa check-in'
      : 'Chưa có dữ liệu';

  const selectedStatusClass = selectedDayCheckIn
    ? selectedDayCheckIn.status === 'PRESENT'
      ? 'status-done'
      : selectedDayCheckIn.status === 'LATE'
        ? 'status-warning'
        : 'status-pending'
    : 'status-pending';

  const handleCheckIn = async (eventContext = null) => {
    // eventContext is optional; if provided we compute status relative to that event's start time
    if (!isStudent) {
      setStatusMessage('Chỉ sinh viên được phép check-in.');
      return;
    }

    if (selectedDate !== today) {
      setStatusMessage('Chỉ có thể check-in cho ngày hôm nay.');
      return;
    }

    if (todayItem) {
      setStatusMessage('Bạn đã check-in hôm nay rồi.');
      return;
    }

    if (!canCheckInNow) {
      setStatusMessage(checkInDisabledReason || 'Chưa tới giờ check-in.');
      return;
    }

    try {
      const now = new Date();
      let status;
      if (eventContext) {
        const start = parseTimeValue(eventContext.rawTime);
        if (start == null) {
          status = getExpectedCheckInStatus(selectedDaySchedules, selectedDayMeetings, now);
        } else {
          const currentMinutes = now.getHours() * 60 + now.getMinutes();
          if (currentMinutes <= start) status = 'PRESENT';
          else if (currentMinutes <= start + 30) status = 'LATE';
          else status = 'ABSENT';
        }
      } else {
        status = getExpectedCheckInStatus(selectedDaySchedules, selectedDayMeetings, now);
      }

      const payload = {
        date: selectedDate,
        time: now.toTimeString().split(' ')[0],
        status,
        note: checkInNote || undefined,
      };
      const res = await submitCheckIn(payload);
      if (res && res.success) {
        setStatusMessage('Đã check-in thành công!');
        loadCheckIns();
      } else {
        setStatusMessage(res?.message || 'Không thể check-in.');
      }
    } catch (error) {
      setStatusMessage(error.response?.data?.message || 'Lỗi khi gửi check-in.');
    }
  };

  const handleCheckOut = async () => {
    if (!isStudent) {
      setStatusMessage('Chỉ sinh viên được phép check-out.');
      return;
    }

    if (selectedDate !== today) {
      setStatusMessage('Chỉ có thể check-out cho ngày hôm nay.');
      return;
    }

    if (!todayItem) {
      setStatusMessage('Bạn cần check-in trước khi check-out.');
      return;
    }

    if (todayItem.checkOutTime) {
      setStatusMessage('Bạn đã check-out cho ngày hôm nay rồi.');
      return;
    }
    if (!canCheckOutNow) {
      setStatusMessage('Checkout chỉ mở từ 16:30 đến 17:00.');
      return;
    }

    try {
      const now = new Date();
      const payload = {
        date: selectedDate,
        checkOutTime: now.toTimeString().split(' ')[0],
      };
      const res = await submitCheckOut(payload);
      if (res && res.success) {
        setStatusMessage('Đã check-out thành công!');
        loadCheckIns();
      } else {
        setStatusMessage(res?.message || 'Không thể check-out.');
      }
    } catch (error) {
      setStatusMessage(error.response?.data?.message || 'Lỗi khi gửi check-out.');
    }
  };

  const handleMonthChange = (offset) => {
    const current = parseISODateLocal(monthCursor) || new Date();
    const next = new Date(current.getFullYear(), current.getMonth() + offset, 1);
    const nextMonth = toISODateLocal(next);
    setMonthCursor(nextMonth);
    setSelectedDate(nextMonth);
  };

  const handleAdminSave = async (kind) => {
    try {
      const minDate = toISODateLocal(new Date());
      // basic required field: title
      if (!adminForm.title || !String(adminForm.title).trim()) {
        setStatusMessage('Vui lòng nhập tiêu đề lịch.');
        return;
      }
      if (adminForm.audience === 'SPECIFIC_PERIOD' && !adminForm.periodId) {
        setStatusMessage('Vui lòng chọn kỳ thực tập khi chọn lịch theo kỳ.');
        return;
      }

      if (saving) return;
      setSaving(true);
      if (kind === 'schedule') {
        // check title
        if (!adminForm.title || !String(adminForm.title).trim()) {
          setStatusMessage('Vui lòng nhập tiêu đề lịch.');
          setSaving(false);
          return;
        }
        if (!adminForm.startDate || !adminForm.endDate || adminForm.startDate < minDate || adminForm.endDate < minDate) {
          setStatusMessage('Ngày bắt đầu/kết thúc không được nhỏ hơn hôm nay.');
          setSaving(false);
          return;
        }
        if (!adminForm.startTime || !adminForm.endTime || adminForm.startTime >= adminForm.endTime) {
          setStatusMessage('Giờ bắt đầu phải nhỏ hơn giờ kết thúc.');
          setSaving(false);
          return;
        }
        // client-side overlap check to give faster feedback
        const hasOverlap = schedules.some((s) => {
          if (!s.startDate || !s.endDate) return false;
          if (s.audience !== adminForm.audience) return false;
          if (adminForm.audience === 'SPECIFIC_PERIOD' && (s.periodId || null) !== (adminForm.periodId || null)) return false;
          // overlap if not (existing end < new start || existing start > new end)
          return !(s.endDate < adminForm.startDate || s.startDate > adminForm.endDate);
        });
        if (hasOverlap) {
          setStatusMessage('Đã có lịch trùng ngày cho khung này. Vui lòng chọn ngày khác hoặc xóa lịch hiện có.');
          setSaving(false);
          return;
        }
        const payload = {
          title: adminForm.title,
          type: adminForm.type,
          audience: adminForm.audience,
          startDate: adminForm.startDate,
          endDate: adminForm.endDate,
          startTime: adminForm.startTime,
          endTime: adminForm.endTime,
          location: adminForm.location,
          description: adminForm.description,
          periodId: adminForm.audience === 'SPECIFIC_PERIOD' ? adminForm.periodId || null : undefined,
        };
        if (editingScheduleId) {
          await updateSchedule(editingScheduleId, payload);
        } else {
          await createSchedule(payload);
        }
      } else {
        // meeting branch: check title
        if (!adminForm.title || !String(adminForm.title).trim()) {
          setStatusMessage('Vui lòng nhập tiêu đề cuộc họp.');
          return;
        }
        if (adminForm.audience === 'SPECIFIC_PERIOD' && !adminForm.periodId) {
          setStatusMessage('Vui lòng chọn kỳ thực tập khi tạo cuộc họp theo kỳ.');
          return;
        }
        if (!adminForm.meetingDate || adminForm.meetingDate < minDate) {
          setStatusMessage('Ngày họp không được nhỏ hơn hôm nay.');
          return;
        }
        if (!adminForm.meetingTime || !adminForm.meetingEndTime || adminForm.meetingTime >= adminForm.meetingEndTime) {
          setStatusMessage('Giờ bắt đầu phải nhỏ hơn giờ kết thúc.');
          return;
        }
        // client-side check: don't allow multiple meetings on same date for same audience/period
        const meetingExists = meetings.some((m) => {
          if (!m.meetingDate) return false;
          const md = toLocalDateOnly(m.meetingDate);
          if (md !== adminForm.meetingDate) return false;
          if (m.audience !== adminForm.audience) return false;
          if (adminForm.audience === 'SPECIFIC_PERIOD' && (m.periodId || null) !== (adminForm.periodId || null)) return false;
          return true;
        });
        if (meetingExists) {
          setStatusMessage('Đã có cuộc họp cho ngày này. Vui lòng chọn ngày khác.');
          setSaving(false);
          return;
        }
        const payload = {
          title: adminForm.title,
          audience: adminForm.audience,
          meetingDate: adminForm.meetingDate,
          meetingTime: adminForm.meetingTime,
          endTime: adminForm.meetingEndTime,
          location: adminForm.location,
          agenda: adminForm.agenda,
          periodId: adminForm.audience === 'SPECIFIC_PERIOD' ? adminForm.periodId || null : undefined,
        };
        if (editingMeetingId) {
          await updateMeeting(editingMeetingId, payload);
        } else {
          await createMeeting(payload);
        }
      }

      setStatusMessage('Đã lưu lịch thành công.');
      setEditingScheduleId(null);
      setEditingMeetingId(null);
      setAdminForm(initialAdminForm);
      await loadCheckIns();
    } catch (error) {
      setStatusMessage(error.response?.data?.message || 'Không lưu được lịch.');
    } finally {
      setSaving(false);
    }
  };

  const handleEditSchedule = (schedule) => {
    setEditingMeetingId(null);
    setEditingScheduleId(schedule.id);
    setAdminForm({
      ...adminForm,
      title: schedule.title || '',
      type: schedule.type || 'WORK',
      audience: schedule.audience || 'ALL_STUDENTS',
      startDate: schedule.startDate || '',
      endDate: schedule.endDate || '',
      startTime: schedule.startTime || '',
      endTime: schedule.endTime || '',
      location: schedule.location || '',
      description: schedule.description || '',
      periodId: schedule.periodId || null,
    });
  };

  const handleEditMeeting = (meeting) => {
    setEditingScheduleId(null);
    setEditingMeetingId(meeting.id);
    setAdminForm({
      ...adminForm,
      title: meeting.title || '',
      audience: meeting.audience || 'ALL_STUDENTS',
      meetingDate: meeting.meetingDate || '',
      meetingTime: meeting.meetingTime || '',
      meetingEndTime: meeting.endTime || '',
      location: meeting.location || '',
      agenda: meeting.agenda || '',
      periodId: meeting.periodId || null,
    });
  };

  const handleDeleteSchedule = async (id) => {
    try {
      await deleteSchedule(id);
      setStatusMessage('Đã xóa lịch làm việc.');
      setSchedules((current) => current.filter((item) => item.id !== id));
      setAdminSchedules((current) => current.filter((item) => item.id !== id));
      await loadCheckIns();
    } catch (error) {
      setStatusMessage(error.response?.data?.message || 'Không xóa được lịch.');
    }
  };

  const handleDeleteMeeting = async (id) => {
    try {
      await deleteMeeting(id);
      setStatusMessage('Đã xóa cuộc họp.');
      setMeetings((current) => current.filter((item) => item.id !== id));
      setAdminSchedules((current) => current.filter((item) => item.id !== id));
      await loadCheckIns();
    } catch (error) {
      setStatusMessage(error.response?.data?.message || 'Không xóa được cuộc họp.');
    }
  };

  return (
    <div className="page-shell checkin-page">
      <section className="checkin-hero card">
        <div>
          <p className="subtle-text">Hôm nay • {formatLongDate(today)}</p>
          <h1>Check-in & Lịch làm việc</h1>
          <p className="hero-text">Điểm danh hàng ngày, rồi bấm vào từng ngày trên lịch để xem chi tiết check-in và lịch liên quan.</p>
        </div>
        <div className="checkin-hero-actions">
          {isStudent && (
            <button
              type="button"
              className="btn"
              onClick={handleCheckIn}
              disabled={selectedDate !== today || Boolean(todayItem) || !canCheckInNow}
              title={checkInDisabledReason || ''}
            >
              {selectedDayCheckInLabel}
            </button>
          )}
          <button type="button" className="btn outline" onClick={() => setSelectedDate(today)}>
            Về ngày hôm nay
          </button>
        </div>
      </section>

      {statusMessage && <div className="info-card"><p>{statusMessage}</p></div>}

      {isStudent && <div className="checkin-summary-grid">
        <div className="checkin-summary-card highlight">
          <p className="subtle-text">1. Check-in / Check-out</p>
          <h2>{formatLongDate(selectedDate)}</h2>
          <div className={`status-chip ${todayStatus.className}`}>{todayStatus.label}</div>
          <div className="checkin-summary-values">
            <div>
              <span>Check-in</span>
              <strong>{todayItem?.time || '--:--'}</strong>
            </div>
            <div>
              <span>Check-out</span>
              <strong>{todayItem?.checkOutTime || '--:--'}</strong>
            </div>
          </div>
          <div className="demo-actions">
            <button type="button" className="btn" onClick={handleCheckIn} disabled={selectedDate !== today || Boolean(todayItem) || !canCheckInNow} title={checkInDisabledReason || ''}>
              {selectedDayCheckInLabel}
            </button>
            <button type="button" className="btn outline" onClick={handleCheckOut} disabled={Boolean(checkOutDisabledReason)} title={checkOutDisabledReason || ''}>
              {todayItem?.checkOutTime ? 'Đã check-out' : 'Check-out'}
            </button>
          </div>
        </div>

        <div className="checkin-summary-card stats-card">
          <p className="subtle-text">2. Trạng thái hôm nay</p>
          <div className="stats-list">
            <div className="stats-item green">
              <span>Check-in</span>
              <strong>{todayItem?.time ? todayItem.time : 'Chưa có'}</strong>
            </div>
            <div className="stats-item yellow">
              <span>Check-out</span>
              <strong>{todayItem?.checkOutTime || 'Chưa có'}</strong>
            </div>
            <div className="stats-item gray">
              <span>Thời gian làm việc</span>
              <strong>{todayWorkingHours || 'Đang chờ'}</strong>
            </div>
          </div>
        </div>

        <div className="checkin-summary-card quick-card">
          <p className="subtle-text">3. Tổng thời gian & tuần</p>
          <h2>{todayWorkingHours || '0.0 giờ'}</h2>
          <div className="mini-stats-row">
            <span>Ngày check-in tuần: {weekCheckinDays}/7</span>
            <span>Hôm nay: {todayItem ? 'Đã ghi nhận' : 'Chưa check-in'}</span>
          </div>
          <div className="box-meta">{dayStatusHeadline}</div>
        </div>
      </div>}

      <div className="checkin-main-grid">
        <section className="card">
          <div className="card-header">
            <h3>Sự kiện sắp tới</h3>
            <span className="badge">Lịch họp và công việc</span>
          </div>
          {upcomingEvents.length === 0 ? (
            <div className="empty-state-card">Chưa có sự kiện nào sắp diễn ra.</div>
          ) : (
            <ul className="timeline-list">
              {upcomingEvents.map((event) => (
                <li key={event.id} className="timeline-item upcoming">
                  <div>
                    <div className="timeline-label">{event.badge}</div>
                    <div className="timeline-title">{event.title}</div>
                    <div className="timeline-date">{event.detail}</div>
                  </div>
                  <span className="badge">{event.badge}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card calendar-card">
          <div className="card-header">
            <div>
              <h3>{currentMonthLabel}</h3>
              <p>Bấm vào một ngày để xem chi tiết check-in của ngày đó.</p>
            </div>
            <div className="calendar-nav">
              <button className="btn outline" type="button" onClick={() => handleMonthChange(-1)}>{'←'}</button>
              <button className="btn outline" type="button" onClick={() => handleMonthChange(1)}>{'→'}</button>
            </div>
          </div>

          <div className="calendar-legend">
            <span><span className="legend-dot on-time" /> Đúng giờ</span>
            <span><span className="legend-dot late" /> Đi muộn</span>
            <span><span className="legend-dot absent" /> Vắng</span>
            <span><span className="legend-dot none" /> Chưa có dữ liệu</span>
          </div>

          <div className="calendar-weekdays">
            {WEEKDAYS.map((day) => <div key={day}>{day}</div>)}
          </div>

          <div className="checkin-calendar-grid">
            {calendarCells.map((dateKey, index) => {
              if (!dateKey) {
                return <div key={`empty-${index}`} className="calendar-cell empty" />;
              }

              const dayCheckIn = checkIns.find((item) => item.date === dateKey);
              const isToday = dateKey === today;
              const isSelected = dateKey === selectedDate;
              
              // Convert to local date string for comparison
              const toLocalDateString = (dateStr) => {
                // Nếu đã là YYYY-MM-DD, trả về ngay
                if (dateStr.length === 10 && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
                  return dateStr;
                }
                // Nếu là ISO format, parse và convert sang local
                const d = new Date(dateStr);
                const year = d.getFullYear();
                const month = String(d.getMonth() + 1).padStart(2, '0');
                const day = String(d.getDate()).padStart(2, '0');
                return `${year}-${month}-${day}`;
              };
              
              const hasSchedule = schedules.some((schedule) => {
                if (!schedule.startDate || !schedule.endDate) return false;
                const startDate = toLocalDateOnly(schedule.startDate);
                const endDate = toLocalDateOnly(schedule.endDate);
                return startDate && endDate && startDate <= dateKey && dateKey <= endDate;
              });
              const hasMeeting = meetings.some((meeting) => {
                if (!meeting.meetingDate) return false;
                const meetingDate = toLocalDateOnly(meeting.meetingDate);
                return meetingDate && meetingDate === dateKey;
              });

              const dayClass = dayCheckIn
                ? dayCheckIn.status === 'PRESENT'
                  ? 'on-time'
                  : dayCheckIn.status === 'LATE'
                    ? 'late'
                    : 'absent'
                : 'none';

              return (
                <button
                  key={dateKey}
                  type="button"
                  className={`calendar-cell ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''}`}
                  onClick={() => handleDayClick(dateKey)}
                >
                  <span className="calendar-day-number">{parseISODateLocal(dateKey)?.getDate()}</span>
                  <span className={`day-dot ${dayClass}`} />
                  <span className="calendar-day-note">
                    {dayCheckIn
                      ? dayCheckIn.status === 'PRESENT'
                        ? 'Đã check-in'
                        : dayCheckIn.status === 'LATE'
                          ? 'Đi muộn'
                          : 'Vắng'
                      : hasMeeting
                        ? 'Có họp'
                        : hasSchedule
                          ? 'Có việc'
                          : 'Trống'}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="card selected-day-card">
          <div className="card-header">
            <div>
              <h3>{formatLongDate(selectedDate)}</h3>
              <p>{selectedDate === today ? 'Thông tin check-in của hôm nay.' : 'Thông tin chi tiết theo ngày đã chọn.'}</p>
            </div>
            <span className={`status-chip ${selectedStatusClass}`}>{selectedStatusLabel}</span>
          </div>

          <div className="two-box-row">
            <div className="box-light">
              <p className="box-label">Check-in</p>
              <h3>{selectedDayCheckIn?.time || 'Chưa có'}</h3>
              <p className="box-meta">{selectedDayCheckIn ? 'Đã ghi nhận' : selectedDate === today ? 'Sẵn sàng check-in' : 'Chưa có dữ liệu'}</p>
            </div>
            <div className="box-light">
              <p className="box-label">Check-out</p>
              <h3>{selectedDayCheckIn?.checkOutTime || '--:--'}</h3>
              <p className="box-meta">
                {selectedDayCheckIn?.checkOutTime
                  ? 'Đã ghi nhận'
                  : selectedDate === today
                    ? 'Dự kiến'
                    : 'Không áp dụng'}
              </p>
            </div>
          </div>

          <div className="selected-day-events">
            <div className="card-subhead">Lịch trong ngày</div>
            {selectedDayEvents.length === 0 ? (
              <p className="empty-text">Không có lịch họp hoặc công việc cho ngày này.</p>
            ) : (
              <div className="timeline-list compact-list">
                {selectedDayEvents.map((event, index) => (
                  <div key={`${event.kind}-${index}`} className="timeline-item">
                    <div className={`timeline-marker ${event.kind}`} />
                    <div className="timeline-content">
                      <div className="timeline-row">
                        <div>
                          <p className="meeting-date">{event.status}</p>
                          <h4>{event.title} {(!parseTimeValue(event.rawTime) || !event.note) && isAdmin ? <span className="badge warning" style={{ marginLeft: 8 }}>Dữ liệu lỗi</span> : null}</h4>
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          {isAdmin && (
                            <>
                              <button className="btn small" onClick={() => event.kind === 'meeting' ? handleEditMeeting(event.record) : handleEditSchedule(event.record)}>Sửa</button>
                              <button className="btn small outline" onClick={() => event.kind === 'meeting' ? handleDeleteMeeting(event.id) : handleDeleteSchedule(event.id)}>Xóa</button>
                            </>
                          )}
                          {isStudent && selectedDate === today && !todayItem && canCheckInNow && (
                            <button className="btn small" onClick={() => handleCheckIn(event)}>Check-in</button>
                          )}
                        </div>
                      </div>
                      <div className="meeting-meta">
                        <span>{event.time}</span>
                        <span>{event.location}</span>
                      </div>
                      <p className="meeting-note">{event.note}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="checkin-actions">
            {!isAdmin && (
              <>
                <button
                  type="button"
                  className="btn"
                  onClick={handleCheckIn}
                  disabled={!isStudent || selectedDate !== today || Boolean(todayItem) || !canCheckInNow}
                  title={checkInDisabledReason || ''}
                >
                  {selectedDayCheckInLabel}
                </button>
                <button type="button" className="btn" onClick={handleCheckOut} disabled={Boolean(checkOutDisabledReason)} title={checkOutDisabledReason || ''}>
                  {todayItem?.checkOutTime ? 'Đã check-out' : 'Check-out hôm nay'}
                </button>
              </>
            )}
            <button className="btn outline" type="button" onClick={() => setSelectedDate(today)}>
              Chuyển về hôm nay
            </button>
          </div>
        </section>
      </div>

      {dayModalOpen && (
        <div className="modal-backdrop" onClick={() => setDayModalOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3>Chi tiết ngày {formatDayShort(selectedDate)}</h3>
                <p>{selectedDayEvents.length > 0 ? 'Danh sách lịch họp và công việc' : 'Không có sự kiện nào cho ngày này.'}</p>
              </div>
              <button className="modal-close" onClick={() => setDayModalOpen(false)}>×</button>
            </div>

            <div className="form-stack">
              {isStudent && <div className="box-light">
                <p className="box-label">Trạng thái check-in</p>
                <h3>{selectedStatusLabel}</h3>
                {selectedDate === today && !selectedDayCheckIn && selectedCheckInStatus === 'LATE' ? (
                  <p className="modal-note">Bạn đã trễ hơn 10 phút so với giờ dự kiến.</p>
                ) : null}
              </div>}

              {selectedDayEvents.length > 0 ? (
                selectedDayEvents.map((event, idx) => (
                  <div key={`${event.kind}-${idx}`} className="box-light event-box">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div className="event-pill">{event.kind === 'work' ? 'Công việc' : 'Họp'}</div>
                        <h4>{event.title}</h4>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        {isAdmin && (
                          <>
                            <button className="btn small" onClick={() => event.kind === 'meeting' ? handleEditMeeting(event.record) : handleEditSchedule(event.record)}>Sửa</button>
                            <button className="btn small outline" onClick={() => event.kind === 'meeting' ? handleDeleteMeeting(event.id) : handleDeleteSchedule(event.id)}>Xóa</button>
                          </>
                        )}
                        {isStudent && selectedDate === today && !todayItem && canCheckInNow && (
                          <button className="btn small" onClick={handleCheckIn}>Check-in</button>
                        )}
                      </div>
                    </div>
                    <p className="meeting-meta">{event.time} • {event.location}</p>
                    <p className="meeting-note">{event.note}</p>
                  </div>
                ))
              ) : (
                <p className="empty-text">Không có lịch hôm nay.</p>
              )}

              {isStudent && <div style={{ marginTop: 8 }}>
                <label style={{ display: 'block', marginBottom: 6, fontWeight: 700 }}>Ghi chú khi check-in (tùy chọn)</label>
                <textarea
                  value={checkInNote}
                  onChange={(e) => setCheckInNote(e.target.value)}
                  placeholder="Ghi chú ngắn (ví dụ: Đã tham gia buổi học, vắng học phần...)"
                  style={{ width: '100%', minHeight: 64, padding: 8, borderRadius: 8, border: '1px solid #e6e9ee' }}
                />
              </div>}

              <div className="checkin-actions modal-actions">
                {!isAdmin && (
                  <>
                    <button type="button" className="btn" onClick={handleCheckIn} disabled={!isStudent || selectedDate !== today || Boolean(todayItem) || !canCheckInNow} title={checkInDisabledReason || ''}>
                      {selectedDayCheckInLabel}
                    </button>
                    <button type="button" className="btn outline" onClick={handleCheckOut} disabled={Boolean(checkOutDisabledReason)} title={checkOutDisabledReason || ''}>
                      {todayItem?.checkOutTime ? 'Đã check-out' : 'Check-out hôm nay'}
                    </button>
                  </>
                )}
                <button className="btn outline" type="button" onClick={() => setDayModalOpen(false)}>
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <div>
            <h3>Lịch họp và lịch làm việc</h3>
            <p>Lịch được tạo từ backend sẽ hiển thị bên dưới để bạn đối chiếu nhanh.</p>
          </div>
          <div className="calendar-legend">
            <span><span className="legend-dot on-time" /> Công việc</span>
            <span><span className="legend-dot late" /> Họp</span>
          </div>
        </div>

        {loading ? (
          <div className="loading-grid">
            <div className="skeleton" style={{ height: 84, borderRadius: 18 }} />
            <div className="skeleton" style={{ height: 84, borderRadius: 18 }} />
          </div>
        ) : selectedDaySchedules.length === 0 && selectedDayMeetings.length === 0 ? (
          <p className="empty-text">Chưa có lịch nào được tạo.</p>
        ) : (
          <div className="timeline-list">
            {selectedDaySchedules.map((schedule) => (
              <div key={`schedule-${schedule.id}`} className="timeline-item">
                <div className="timeline-marker work" />
                <div className="timeline-content">
                  <div className="timeline-row">
                    <div>
                      <p className="meeting-date">{formatDayShort(schedule.startDate)} - {formatDayShort(schedule.endDate)}</p>
                      <h4>{schedule.title}</h4>
                    </div>
                    <span className="status-chip status-pending">{schedule.type}</span>
                  </div>
                  <div className="meeting-meta">
                    <span>{formatClock(schedule.startTime)} - {formatClock(schedule.endTime)}</span>
                    <span>{schedule.location || 'Chưa có địa điểm'}</span>
                    <span>{schedule.audience === 'ALL_STUDENTS' ? 'Tất cả sinh viên' : 'Theo kỳ thực tập'}</span>
                  </div>
                  <p className="meeting-note">{schedule.description}</p>
                  {isAdmin && (
                    <div className="button-row">
                      <button className="btn outline" type="button" onClick={() => handleEditSchedule(schedule)}>Sửa</button>
                      <button className="btn outline" type="button" onClick={() => handleDeleteSchedule(schedule.id)}>Xóa</button>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {selectedDayMeetings.map((meeting) => (
              <div key={`meeting-${meeting.id}`} className="timeline-item">
                <div className="timeline-marker meeting" />
                <div className="timeline-content">
                  <div className="timeline-row">
                    <div>
                      <p className="meeting-date">{formatDayShort(meeting.meetingDate)}</p>
                      <h4>{meeting.title}</h4>
                    </div>
                    <span className={`status-chip ${meeting.status === 'DONE' ? 'status-done' : 'status-pending'}`}>
                      {meeting.status || 'Sắp diễn ra'}
                    </span>
                  </div>
                  <div className="meeting-meta">
                    <span>{formatClock(meeting.meetingTime)}{meeting.endTime ? ` - ${formatClock(meeting.endTime)}` : ''}</span>
                    <span>{meeting.location || 'Chưa có địa điểm'}</span>
                    <span>{meeting.audience === 'ALL_STUDENTS' ? 'Tất cả sinh viên' : 'Theo kỳ thực tập'}</span>
                  </div>
                  <p className="meeting-note">{meeting.agenda}</p>
                  {isAdmin && (
                    <div className="button-row">
                      <button className="btn outline" type="button" onClick={() => handleEditMeeting(meeting)}>Sửa</button>
                      <button className="btn outline" type="button" onClick={() => handleDeleteMeeting(meeting.id)}>Xóa</button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {isAdmin && (
        <div className="card">
          <div className="card-header">
            <div>
              <h3>Tổng hợp điểm danh sinh viên</h3>
              <p>Chọn vào số buổi để xem thời gian check-in/check-out chi tiết.</p>
            </div>
          </div>
          <div className="table-wrapper">
            <table className="simple-table">
              <thead>
                <tr>
                  <th>Mã SV</th>
                  <th>Họ tên</th>
                  <th>Lớp</th>
                  <th>Chuyên ngành</th>
                  <th>Đúng giờ</th>
                  <th>Đi trễ</th>
                  <th>Vắng</th>
                  <th>Tổng buổi</th>
                </tr>
              </thead>
              <tbody>
                {adminAttendance.length === 0 ? (
                  <tr><td colSpan="8">Chưa có dữ liệu điểm danh.</td></tr>
                ) : adminAttendance.map((row) => (
                  <tr key={row.studentId}>
                    <td>{row.studentCode || '—'}</td>
                    <td>{row.fullName || '—'}</td>
                    <td>{row.className || '—'}</td>
                    <td>{row.majorName || '—'}</td>
                    <td><button type="button" className="btn outline small" onClick={() => openAttendanceDetail(row, 'PRESENT')}>{row.onTime}</button></td>
                    <td><button type="button" className="btn outline small" onClick={() => openAttendanceDetail(row, 'LATE')}>{row.late}</button></td>
                    <td><button type="button" className="btn outline small" onClick={() => openAttendanceDetail(row, 'ABSENT')}>{row.absent}</button></td>
                    <td><button type="button" className="btn small" onClick={() => openAttendanceDetail(row, null)}>{row.total}</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {isAdmin && (
        <div className="card">
          <h3>Danh sách toàn bộ lịch</h3>
          <p>Danh sách tất cả lịch hiện có. Dùng để nhanh chóng Sửa / Xóa.</p>
          {schedules.length === 0 && meetings.length === 0 ? (
            <p className="empty-text">Chưa có lịch nào.</p>
          ) : (
            <div className="timeline-list">
              {schedules.map((schedule) => (
                <div key={`admin-schedule-${schedule.id}`} className="timeline-item">
                  <div className="timeline-marker work" />
                  <div className="timeline-content">
                    <div className="timeline-row">
                      <div>
                        <p className="meeting-date">{formatDayShort(schedule.startDate)} - {formatDayShort(schedule.endDate)}</p>
                        <h4>{schedule.title}</h4>
                      </div>
                      <span className="status-chip status-pending">{schedule.type}</span>
                    </div>
                    <div className="meeting-meta">
                      <span>{formatClock(schedule.startTime)} - {formatClock(schedule.endTime)}</span>
                      <span>{schedule.location || 'Chưa có địa điểm'}</span>
                      <span>{schedule.audience === 'ALL_STUDENTS' ? 'Tất cả sinh viên' : 'Theo kỳ'}</span>
                    </div>
                    <p className="meeting-note">{schedule.description}</p>
                    <div className="button-row">
                      <button className="btn outline" type="button" onClick={() => handleEditSchedule(schedule)}>Sửa</button>
                      <button className="btn outline" type="button" onClick={() => handleDeleteSchedule(schedule.id)}>Xóa</button>
                    </div>
                  </div>
                </div>
              ))}

              {meetings.map((meeting) => (
                <div key={`admin-meeting-${meeting.id}`} className="timeline-item">
                  <div className="timeline-marker meeting" />
                  <div className="timeline-content">
                    <div className="timeline-row">
                      <div>
                        <p className="meeting-date">{formatDayShort(meeting.meetingDate)}</p>
                        <h4>{meeting.title}</h4>
                      </div>
                      <span className={`status-chip ${meeting.status === 'DONE' ? 'status-done' : 'status-pending'}`}>{meeting.status || 'Sắp diễn ra'}</span>
                    </div>
                    <div className="meeting-meta">
                      <span>{formatClock(meeting.meetingTime)}{meeting.endTime ? ` - ${formatClock(meeting.endTime)}` : ''}</span>
                      <span>{meeting.location || 'Chưa có địa điểm'}</span>
                      <span>{meeting.audience === 'ALL_STUDENTS' ? 'Tất cả sinh viên' : 'Theo kỳ'}</span>
                    </div>
                    <p className="meeting-note">{meeting.agenda}</p>
                    <div className="button-row">
                      <button className="btn outline" type="button" onClick={() => handleEditMeeting(meeting)}>Sửa</button>
                      <button className="btn outline" type="button" onClick={() => handleDeleteMeeting(meeting.id)}>Xóa</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="form-stack">
            <input placeholder="Tiêu đề" value={adminForm.title} onChange={(e) => setAdminForm({ ...adminForm, title: e.target.value })} />
            <div className="two-box-row">
              <select value={adminForm.type} onChange={(e) => setAdminForm({ ...adminForm, type: e.target.value })}>
                <option value="WORK">Công việc</option>
                <option value="MEETING">Họp</option>
                <option value="DEADLINE">Deadline</option>
                <option value="OTHER">Khác</option>
              </select>
              <select value={adminForm.audience} onChange={(e) => setAdminForm({ ...adminForm, audience: e.target.value })}>
                <option value="ALL_STUDENTS">Tất cả sinh viên</option>
                <option value="SPECIFIC_PERIOD">Theo kỳ thực tập</option>
              </select>
            </div>
            {adminForm.audience === 'SPECIFIC_PERIOD' && (
              <div className="two-box-row">
                <select value={adminForm.periodId || ''} onChange={(e) => setAdminForm({ ...adminForm, periodId: e.target.value || null })}>
                  <option value="">-- Chọn kỳ thực tập --</option>
                  {periods.map((p) => (
                    <option key={p.id} value={p.id}>{p.name || (`Kỳ ${p.id} (${p.startDate || ''} - ${p.endDate || ''})`)}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="two-box-row">
              <input type="date" min={today} value={adminForm.startDate} onChange={(e) => setAdminForm({ ...adminForm, startDate: e.target.value })} />
              <input type="date" min={adminForm.startDate || today} value={adminForm.endDate} onChange={(e) => setAdminForm({ ...adminForm, endDate: e.target.value })} />
            </div>
            <div className="two-box-row">
              <input type="time" aria-label="Giờ bắt đầu" value={adminForm.startTime} onChange={(e) => setAdminForm({ ...adminForm, startTime: e.target.value })} />
              <input type="time" aria-label="Giờ kết thúc" value={adminForm.endTime} onChange={(e) => setAdminForm({ ...adminForm, endTime: e.target.value })} />
            </div>
            <input placeholder="Địa điểm" value={adminForm.location} onChange={(e) => setAdminForm({ ...adminForm, location: e.target.value })} />
            <textarea rows="3" placeholder="Mô tả" value={adminForm.description} onChange={(e) => setAdminForm({ ...adminForm, description: e.target.value })} />
            <div className="button-row">
              <button className="btn" type="button" onClick={() => handleAdminSave('schedule')}>Lưu lịch làm việc</button>
              <button className="btn outline" type="button" onClick={() => setAdminForm(initialAdminForm)}>Xóa form</button>
            </div>
          </div>
        </div>
      )}

      {isAdmin && (
        <div className="card">
          <h3>Quản lý họp</h3>
          <div className="form-stack">
            <input placeholder="Tiêu đề cuộc họp" value={adminForm.title} onChange={(e) => setAdminForm({ ...adminForm, title: e.target.value })} />
            <div className="two-box-row">
              <select value={adminForm.audience} onChange={(e) => setAdminForm({ ...adminForm, audience: e.target.value, periodId: e.target.value === 'SPECIFIC_PERIOD' ? adminForm.periodId : null })}>
                <option value="ALL_STUDENTS">Tất cả sinh viên</option>
                <option value="SPECIFIC_PERIOD">Theo kỳ thực tập</option>
              </select>
              {adminForm.audience === 'SPECIFIC_PERIOD' && (
                <select value={adminForm.periodId || ''} onChange={(e) => setAdminForm({ ...adminForm, periodId: e.target.value || null })}>
                  <option value="">-- Chọn kỳ thực tập --</option>
                  {periods.map((p) => (
                    <option key={p.id} value={p.id}>{p.name || (`Kỳ ${p.id} (${p.startDate || ''} - ${p.endDate || ''})`)}</option>
                  ))}
                </select>
              )}
            </div>
            <div className="two-box-row">
              <input type="date" min={today} value={adminForm.meetingDate} onChange={(e) => setAdminForm({ ...adminForm, meetingDate: e.target.value })} />
              <input type="time" aria-label="Giờ bắt đầu họp" value={adminForm.meetingTime} onChange={(e) => setAdminForm({ ...adminForm, meetingTime: e.target.value })} />
              <input type="time" aria-label="Giờ kết thúc họp" value={adminForm.meetingEndTime} onChange={(e) => setAdminForm({ ...adminForm, meetingEndTime: e.target.value })} />
            </div>
            <input placeholder="Địa điểm" value={adminForm.location} onChange={(e) => setAdminForm({ ...adminForm, location: e.target.value })} />
            <textarea rows="3" placeholder="Agenda" value={adminForm.agenda} onChange={(e) => setAdminForm({ ...adminForm, agenda: e.target.value })} />
            <div className="button-row">
              <button className="btn" type="button" onClick={() => handleAdminSave('meeting')} disabled={saving}>{saving ? 'Đang lưu...' : 'Lưu cuộc họp'}</button>
              <button className="btn outline" type="button" onClick={() => setAdminForm(initialAdminForm)}>Xóa form</button>
            </div>
          </div>
        </div>
      )}

      {attendanceDetail && (
        <div className="modal-backdrop" onClick={() => setAttendanceDetail(null)}>
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h3>Chi tiết điểm danh — {attendanceDetail.student?.fullName}</h3>
              <button type="button" className="modal-close" onClick={() => setAttendanceDetail(null)}>×</button>
            </div>
            <div className="table-wrapper">
              <table className="simple-table">
                <thead>
                  <tr><th>Ngày</th><th>Trạng thái</th><th>Check-in</th><th>Check-out</th></tr>
                </thead>
                <tbody>
                  {attendanceDetail.records?.length ? attendanceDetail.records.map((record) => (
                    <tr key={record.id}>
                      <td>{record.date}</td>
                      <td>{record.status === 'PRESENT' ? 'Đúng giờ' : record.status === 'LATE' ? 'Đi trễ' : 'Vắng'}</td>
                      <td>{record.time || '—'}</td>
                      <td>{record.checkOutTime || '—'}</td>
                    </tr>
                  )) : <tr><td colSpan="4">Không có buổi phù hợp.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CheckInPage;
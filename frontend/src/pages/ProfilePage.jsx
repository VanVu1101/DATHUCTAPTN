import { useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getMyProfile,
  updateMyProfile,
  persistProfile,
  uploadProfileDocument,
  getMyProfileDocuments,
  deleteProfileDocument,
  uploadProfileImage,
} from '../services/studentService';
import { getAllPeriods } from '../services/periodService';
import { changePassword, forgotPassword } from '../services/authService';
import { getMajors } from '../services/majorService';

const universityOptions = [
  'Đại học Bách Khoa Hà Nội',
  'Đại học Công nghệ Thành phố Hồ Chí Minh - HUTECH',
  'Đại học Kinh tế TP.HCM',
  'Đại học FPT',
  'Đại học Khoa học Tự nhiên TP.HCM',
  'Khác',
];

const initialForm = {
  fullName: '',
  email: '',
  phoneNumber: '',
  studentCode: '',
  roleHeadline: '',
  linkedin: '',
  university: universityOptions[0],
  groupName: '',
  birthDate: '',
  className: '',
  majorName: '',
  enterpriseName: '',
  mentorName: '',
  address: '',
  bio: '',
  emergencyContact: '',
  emergencyPhone: '',
  periodId: '',
};

const profileTabs = [
  { key: 'overview', label: 'Tổng quan' },
  { key: 'skills', label: 'Kỹ năng' },
  { key: 'documents', label: 'Hồ sơ' },
];

function InfoRow({ icon, label, value, hint }) {
  return (
    <div className="profile-info-row">
      <div className="info-icon">{icon}</div>
      <div>
        <p className="info-label">{label}</p>
        <p className="info-value">{value || 'Chưa cập nhật'}</p>
        {hint && <p className="info-hint">{hint}</p>}
      </div>
    </div>
  );
}

function ProfilePage() {
  const [profile, setProfile] = useState(null);
  const [editing, setEditing] = useState(false);
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarLoadError, setAvatarLoadError] = useState(false);
  const avatarInputRef = useRef(null);
  const [periods, setPeriods] = useState([]);
  const [majors, setMajors] = useState([]);
  const [message, setMessage] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');
  const [accountMode, setAccountMode] = useState('change');
  const [passwordForm, setPasswordForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
  const [resetForm, setResetForm] = useState({ email: '', newPassword: '', confirmPassword: '' });
  const [activeTab, setActiveTab] = useState('overview');
  const [currentSkills, setCurrentSkills] = useState({
    technicalSkills: '',
    softSkills: '',
    languages: '',
  });
  const [uploadDocs, setUploadDocs] = useState({
    cv: null,
    internshipDoc: null,
  });
  const [uploadMessage, setUploadMessage] = useState('');
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadedDocuments, setUploadedDocuments] = useState([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);

  const reportStatusInfo = useMemo(() => {
    const status = profile?.lastReportStatus;
    if (!status) return { label: 'Chưa có', color: 'badge-gray' };
    if (status === 'APPROVED') return { label: 'Đã duyệt', color: 'badge-green' };
    if (status === 'SUBMITTED') return { label: 'Chờ duyệt', color: 'badge-yellow' };
    if (status === 'REJECTED') return { label: 'Từ chối', color: 'badge-red' };
    return { label: status, color: 'badge-gray' };
  }, [profile?.lastReportStatus]);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        setDocumentsLoading(true);
        const [profileRes, periodsRes, documentsRes, majorsRes] = await Promise.all([
          getMyProfile(),
          getAllPeriods(),
          getMyProfileDocuments(),
          getMajors()
        ]);

        const data = profileRes.success ? profileRes.data || {} : {};
        if (profileRes.success) {
          setProfile(data);
          persistProfile(data);
          setCurrentSkills({
            technicalSkills: Array.isArray(data.technicalSkills) ? data.technicalSkills.join(', ') : data.technicalSkills || '',
            softSkills: Array.isArray(data.softSkills) ? data.softSkills.join(', ') : data.softSkills || '',
            languages: Array.isArray(data.languages) ? data.languages.join(', ') : data.languages || '',
          });
        }

        if (documentsRes?.success) {
          setUploadedDocuments(documentsRes.data || []);
        }

        setForm((current) => ({
          ...current,
          fullName: data.fullName || current.fullName || '',
          email: data.email || current.email || '',
          phoneNumber: data.phoneNumber || current.phoneNumber || '',
          studentCode: data.studentCode || current.studentCode || '',
          roleHeadline: data.headline || current.roleHeadline || '',
          linkedin: data.linkedin || current.linkedin || '',
          university: data.university || current.university || universityOptions[0],
          groupName: data.groupName || current.groupName || '',
          birthDate: data.birthDate || current.birthDate || '',
          className: data.className || current.className || '',
          majorName: data.majorName || current.majorName || '',
          enterpriseName: data.enterpriseName || current.enterpriseName || '',
          mentorName: data.mentorName || current.mentorName || '',
          address: data.address || current.address || '',
          bio: data.bio || current.bio || '',
          emergencyContact: data.emergencyContact || current.emergencyContact || '',
          emergencyPhone: data.emergencyPhone || current.emergencyPhone || '',
          periodId: data.periodId != null ? String(data.periodId) : current.periodId || '',
        }));
        setResetForm((current) => ({ ...current, email: data.email || '' }));

        if (periodsRes.success) {
          setPeriods(periodsRes.data || []);
        }

        if (majorsRes?.success) {
          setMajors(majorsRes.data || []);
        }
      } catch (error) {
        setMessage('Không thể tải hồ sơ');
      } finally {
        setDocumentsLoading(false);
      }
    };

    loadProfile();
  }, []);

  const isEnterprise = profile?.role === 'ENTERPRISE';

  const reportProgress = useMemo(() => {
    if (!profile) return 0;
    if (profile.reportProgress != null) return profile.reportProgress;
    if (profile.lastReportStatus === 'APPROVED') return 100;
    if (profile.lastReportStatus === 'SUBMITTED') return 72;
    if (profile.lastReportStatus === 'REJECTED') return 55;
    return 38;
  }, [profile]);

  const reportSteps = [
    { title: 'Khảo sát', completed: reportProgress >= 25 },
    { title: 'Đề cương', completed: reportProgress >= 50 },
    { title: 'Viết báo cáo', completed: reportProgress >= 75 },
    { title: 'Nộp báo cáo', completed: reportProgress >= 100 },
  ];

  const displayInitials = useMemo(() => {
    if (!profile?.fullName) return 'AN';
    return profile.fullName
      .split(' ')
      .filter(Boolean)
      .slice(-2)
      .map((part) => part[0])
      .join('')
      .toUpperCase();
  }, [profile?.fullName]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'technicalSkills' || name === 'softSkills' || name === 'languages') {
      setCurrentSkills((current) => ({ ...current, [name]: value }));
    }
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleFileChange = (e) => {
    const { name, files } = e.target;
    if (!files?.length) return;
    setUploadDocs((current) => ({ ...current, [name]: files[0] }));
  };

  const handleAvatarClick = () => {
    if (avatarInputRef.current) avatarInputRef.current.click();
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarUploading(true);
    try {
      setAvatarLoadError(false);
      const formData = new FormData();
      formData.append('file', file);
      const res = await uploadProfileImage(formData);
      console.log('uploadProfileImage response', res);
      if (res?.success) {
        const next = res.data || null;
        const normalizedProfile = {
          ...(profile || {}),
          ...(next || {}),
          profileImageUrl: next?.profileImageUrl || next?.avatar || profile?.profileImageUrl || profile?.avatar || '',
          avatar: next?.profileImageUrl || next?.avatar || profile?.profileImageUrl || profile?.avatar || '',
          periodName: next?.periodName || profile?.periodName || '',
          internshipDuration: next?.internshipDuration || profile?.internshipDuration || '',
          enterpriseName: next?.enterpriseName || profile?.enterpriseName || '',
          mentorName: next?.mentorName || profile?.mentorName || '',
          className: next?.className || profile?.className || '',
          majorName: next?.majorName || profile?.majorName || '',
          headline: next?.headline || profile?.headline || '',
          fullName: next?.fullName || profile?.fullName || '',
        };
        setProfile(normalizedProfile);
        persistProfile(normalizedProfile);
        if (normalizedProfile) {
          setForm((current) => ({
            ...current,
            roleHeadline: normalizedProfile.headline || current.roleHeadline || '',
            majorName: normalizedProfile.majorName || current.majorName || '',
            periodId: normalizedProfile.periodId != null ? String(normalizedProfile.periodId) : current.periodId || '',
          }));
        }
      } else {
        console.error('uploadProfileImage failed response', res);
        setMessage(res?.message || 'Upload ảnh thất bại');
      }
    } catch (err) {
      console.error('uploadProfileImage error', err);
      setMessage(err.response?.data?.message || err.message || 'Upload ảnh thất bại');
    } finally {
      setAvatarUploading(false);
      // reset input so same file can be reselected
      if (avatarInputRef.current) avatarInputRef.current.value = '';
    }
  };

  const handleSkillsSubmit = async (e) => {
    e.preventDefault();
    setMessage('');

    try {
      const payload = {
        technicalSkills: currentSkills.technicalSkills
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean),
        softSkills: currentSkills.softSkills
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean),
        languages: currentSkills.languages
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean),
      };

      const res = await updateMyProfile(payload);
      if (res.success) {
        setProfile(res.data);
        persistProfile(res.data);
        setMessage('Cập nhật kỹ năng thành công');
      }
    } catch (error) {
      setMessage(error.response?.data?.message || 'Cập nhật kỹ năng thất bại');
    }
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!uploadDocs.cv && !uploadDocs.internshipDoc) {
      setUploadMessage('Vui lòng chọn ít nhất một file để tải lên.');
      return;
    }

    setUploadMessage('Đang tải tài liệu...');

    try {
      const uploads = [];
      setUploadLoading(true);
      if (uploadDocs.cv) {
        const formData = new FormData();
        formData.append('file', uploadDocs.cv);
        formData.append('title', 'CV');
        formData.append('category', 'CV');
        uploads.push(uploadProfileDocument(formData));
      }
      if (uploadDocs.internshipDoc) {
        const formData = new FormData();
        formData.append('file', uploadDocs.internshipDoc);
        formData.append('title', 'Hồ sơ thực tập');
        formData.append('category', 'HỒ SƠ');
        uploads.push(uploadProfileDocument(formData));
      }

      const results = await Promise.allSettled(uploads);
      const successCount = results.filter((item) => item.status === 'fulfilled' && item.value?.success).length;
      const failedCount = results.filter((item) => item.status === 'rejected').length;

      if (successCount > 0) {
        const profileRes = await getMyProfile();
        const documentsRes = await getMyProfileDocuments();
        if (profileRes.success) {
          setProfile(profileRes.data);
          setCurrentSkills({
            technicalSkills: Array.isArray(profileRes.data.technicalSkills)
              ? profileRes.data.technicalSkills.join(', ')
              : profileRes.data.technicalSkills || '',
            softSkills: Array.isArray(profileRes.data.softSkills)
              ? profileRes.data.softSkills.join(', ')
              : profileRes.data.softSkills || '',
            languages: Array.isArray(profileRes.data.languages)
              ? profileRes.data.languages.join(', ')
              : profileRes.data.languages || '',
          });
        }
        if (documentsRes?.success) {
          setUploadedDocuments(documentsRes.data || []);
        }
        const failedMessage = failedCount > 0 ? `, ${failedCount} tài liệu không tải được` : '';
        setUploadMessage(`${successCount} tài liệu đã tải lên thành công${failedMessage}.`);
        setUploadDocs({ cv: null, internshipDoc: null });
      } else {
        setUploadMessage('Không có tài liệu nào được tải lên.');
      }
    } catch (error) {
      setUploadMessage(error.response?.data?.message || 'Tải tài liệu thất bại');
    } finally {
      setUploadLoading(false);
    }
  };

  const handleDeleteDocument = async (documentId) => {
    if (!window.confirm('Bạn có chắc muốn xóa tài liệu này?')) {
      return;
    }

    try {
      const res = await deleteProfileDocument(documentId);
      if (res.success) {
        setUploadedDocuments((current) => current.filter((doc) => doc.id !== documentId));
        setUploadMessage('Đã xóa tài liệu thành công');
      }
    } catch (error) {
      setUploadMessage(error.response?.data?.message || 'Xóa tài liệu thất bại');
    }
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordForm((current) => ({ ...current, [name]: value }));
  };

  const handleResetChange = (e) => {
    const { name, value } = e.target;
    setResetForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');

    try {
      const payload = {
        fullName: form.fullName || profile?.fullName || '',
        phoneNumber: form.phoneNumber,
        headline: form.roleHeadline || profile?.headline || '',
        linkedin: form.linkedin || profile?.linkedin || '',
        university: form.university || profile?.university || '',
        groupName: form.groupName || profile?.groupName || '',
        birthDate: form.birthDate || profile?.birthDate || '',
        className: form.className || profile?.className || '',
        majorName: form.majorName || profile?.majorName || '',
        enterpriseName: form.enterpriseName || profile?.enterpriseName || '',
        mentorName: form.mentorName || profile?.mentorName || '',
        address: form.address || profile?.address || '',
        bio: form.bio || profile?.bio || '',
        emergencyContact: form.emergencyContact,
        emergencyPhone: form.emergencyPhone,
        periodId: form.periodId || profile?.periodId || null,
      };

      const res = await updateMyProfile(payload);

      if (res.success) {
        const nextProfile = res.data || null;
        setProfile(nextProfile);
        persistProfile(nextProfile);
        setMessage('Cập nhật hồ sơ thành công');
        setEditing(false);
      }
    } catch (error) {
      setMessage(error.response?.data?.message || 'Cập nhật thất bại');
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordMessage('');

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordMessage('Mật khẩu mới không khớp');
      return;
    }

    try {
      const res = await changePassword({
        oldPassword: passwordForm.oldPassword,
        newPassword: passwordForm.newPassword,
      });
      setPasswordMessage(res.message || 'Đổi mật khẩu thành công');
      setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      setPasswordMessage(error.response?.data?.message || 'Đổi mật khẩu thất bại');
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setPasswordMessage('');

    if (resetForm.newPassword !== resetForm.confirmPassword) {
      setPasswordMessage('Mật khẩu mới không khớp');
      return;
    }

    try {
      const res = await forgotPassword({
        email: resetForm.email,
        newPassword: resetForm.newPassword,
      });
      setPasswordMessage(res.message || 'Đặt lại mật khẩu thành công');
      setResetForm((current) => ({ ...current, newPassword: '', confirmPassword: '' }));
    } catch (error) {
      setPasswordMessage(error.response?.data?.message || 'Đặt lại mật khẩu thất bại');
    }
  };

  return (
    <div className="page-shell profile-page">
      <section className="profile-hero card">
        <div className="profile-banner" />
        <div className="profile-header">
          <div className="avatar-column">
            <div className="profile-avatar-wrapper">
              <div className="avatar profile-avatar" onClick={handleAvatarClick} style={{ cursor: 'pointer' }}>
                {profile?.profileImageUrl && !avatarLoadError ? (
                  // eslint-disable-next-line jsx-a11y/img-redundant-alt
                  <img
                    src={profile.profileImageUrl}
                    alt="avatar"
                    style={{ width: '100%', height: '100%', borderRadius: '12px', objectFit: 'cover' }}
                    onError={() => {
                      console.warn('Avatar image failed to load:', profile.profileImageUrl);
                      setAvatarLoadError(true);
                    }}
                  />
                ) : (
                  displayInitials
                )}
              </div>
            </div>
            <div className="avatar-action">
              <button className="btn outline small avatar-change-btn" type="button" onClick={handleAvatarClick} disabled={avatarUploading}>
                {avatarUploading ? 'Đang tải...' : 'Đổi ảnh'}
              </button>
              <input ref={avatarInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />
            </div>
          </div>
          <div className="profile-meta">
            <h1 className="profile-name">{profile?.fullName || 'Người dùng'}</h1>
            <div className="profile-sub">
              {profile?.studentCode || '---'} · {profile?.className || '---'} · {profile?.majorName || '---'}
            </div>
            <div className="profile-headline">{profile?.headline || profile?.role || 'Thực tập sinh'}</div>
            <div className="profile-hero-chips">
              <span className="hero-chip">{profile?.internshipStatus || 'Đang thực tập'}</span>
              <span className="hero-chip">Kỳ thực tập: {profile?.periodName || 'Chưa chọn'}</span>
            </div>
          </div>
          <div className="profile-actions">
            <button className="btn outline small" type="button" onClick={() => navigate('/profile/history')}>
              Lịch sử đăng nhập
            </button>
            <button className="btn ghost" type="button" onClick={() => setEditing((current) => !current)}>
              {editing ? 'Hủy' : 'Chỉnh sửa hồ sơ'}
            </button>
          </div>
        </div>
      </section>

      <div className="profile-summary-grid">
        <div className="summary-card summary-card-large">
          <p className="summary-card-label">Thông tin kỳ thực tập</p>
          <h3>{profile?.periodName || 'Chưa chọn kỳ'}</h3>
          <p>{profile?.className || 'Không rõ'} · {profile?.majorName || 'Không rõ ngành'}</p>
          <div className="summary-card-lines">
            <span>Doanh nghiệp: {profile?.enterpriseName || 'Chưa có'}</span>
            <span>Người hướng dẫn: {profile?.mentorName || 'Chưa có'}</span>
            <span>Đợt thực tập: {profile?.periodName || 'Chưa có'}</span>
            <span>Thời gian: {profile?.internshipDuration || 'Chưa có'}</span>
          </div>
        </div>
        <div className="summary-card summary-card-status">
          <p className="summary-card-label">Trạng thái báo cáo</p>
          <h3>{profile?.lastReportStatus ? (profile.lastReportStatus === 'APPROVED' ? 'Đã duyệt' : profile.lastReportStatus === 'SUBMITTED' ? 'Chờ duyệt' : profile.lastReportStatus === 'REJECTED' ? 'Từ chối' : 'Chưa có') : 'Chưa có dữ liệu'}</h3>
          <span className={`status-badge ${reportStatusInfo.color}`}>{reportStatusInfo.label}</span>
          <p>{profile?.lastReportTitle || 'Xem báo cáo để cập nhật tiến độ mới nhất.'}</p>
        </div>
      </div>

      <div className="profile-tab-row">
        {profileTabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`profile-tab ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="profile-layout">
        <div className="profile-main-column">
          {activeTab === 'overview' ? (
            <>
              <section className="card profile-section">
                <div className="card-header">
                  <div>
                    <h3>Thông tin cá nhân</h3>
                    <p>Họ tên, email, trường, lớp, chuyên ngành và thông tin hồ sơ.</p>
                  </div>
                </div>

                {!editing ? (
                  <div className="profile-info-grid">
                    <InfoRow icon="👤" label="Họ tên*" value={profile?.fullName || ''} />
                    <InfoRow icon="✉️" label="Email*" value={profile?.email || ''} hint="Email không thể thay đổi" />
                    <InfoRow icon="📞" label="Số điện thoại" value={profile?.phoneNumber || ''} />
                    <InfoRow icon="🪪" label="Mã sinh viên" value={profile?.studentCode || ''} />
                    <InfoRow icon="🏷️" label="Vai trò / Tiêu đề" value={profile?.headline || profile?.role || ''} />
                    <InfoRow icon="🔗" label="LinkedIn" value={profile?.linkedin || ''} />
                    <InfoRow icon="🏫" label="Trường" value={profile?.university || ''} />
                    <InfoRow icon="👥" label="Nhóm" value={profile?.groupName || ''} />
                    <InfoRow icon="🎂" label="Ngày sinh" value={profile?.birthDate || ''} />
                    <InfoRow icon="📚" label="Lớp / Ngành" value={`${profile?.className || ''}${profile?.majorName ? ` · ${profile.majorName}` : ''}`} />
                    <InfoRow icon="📅" label="Kỳ thực tập" value={profile?.periodName || 'Chưa chọn'} />
                  </div>
                ) : (
                  <form className="form-stack profile-form-onecol" onSubmit={handleSubmit}>
                    <label className="profile-field">
                      <span>Họ tên*</span>
                      <input name="fullName" value={form.fullName} onChange={handleChange} />
                    </label>
                    <label className="profile-field">
                      <span>Email*</span>
                      <input value={form.email} readOnly />
                      <small>Email không thể thay đổi</small>
                    </label>
                    <label className="profile-field">
                      <span>Số điện thoại</span>
                      <input
                        name="phoneNumber"
                        inputMode="numeric"
                        pattern="[0-9]{8,15}"
                        value={form.phoneNumber}
                        onChange={(e) => setForm((current) => ({ ...current, phoneNumber: e.target.value.replace(/\D/g, '') }))}
                      />
                    </label>
                    <label className="profile-field">
                      <span>Mã sinh viên</span>
                      <input name="studentCode" value={form.studentCode} readOnly disabled />
                      <small>Mã sinh viên được hệ thống tạo tự động</small>
                    </label>
                    <label className="profile-field">
                      <span>Vai trò / Tiêu đề</span>
                      <input name="roleHeadline" value={form.roleHeadline} onChange={handleChange} placeholder="@ VanVuAws" />
                    </label>
                    <label className="profile-field">
                      <span>LinkedIn</span>
                      <input name="linkedin" value={form.linkedin} onChange={handleChange} placeholder="https://linkedin.com/in/..." />
                    </label>
                    <label className="profile-field">
                      <span>Trường</span>
                      <select name="university" value={form.university} onChange={handleChange}>
                        {universityOptions.map((option) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    </label>
                    <label className="profile-field">
                      <span>Nhóm</span>
                      <input name="groupName" value={form.groupName} onChange={handleChange} />
                    </label>
                    <label className="profile-field">
                      <span>Ngày sinh</span>
                      <input type="date" name="birthDate" value={form.birthDate || ''} onChange={handleChange} />
                    </label>
                    <label className="profile-field">
                      <span>Lớp</span>
                      <input name="className" value={form.className} onChange={handleChange} />
                    </label>
                    <label className="profile-field">
                      <span>Ngành</span>
                      <select name="majorName" value={form.majorName} onChange={handleChange}>
                        <option value="">Chọn ngành</option>
                        {majors.map((major) => (
                          <option key={major.id} value={major.name}>{major.name}</option>
                        ))}
                      </select>
                    </label>
                    <label className="profile-field">
                      <span>Kỳ thực tập</span>
                      <select name="periodId" value={form.periodId} onChange={handleChange}>
                        <option value="">Chọn kỳ thực tập</option>
                        {periods.map((period) => (
                          <option key={period.id} value={period.id}>{period.name}</option>
                        ))}
                      </select>
                    </label>
                    <label className="profile-field">
                      <span>Giới thiệu</span>
                      <textarea name="bio" value={form.bio} onChange={handleChange} rows="4" />
                    </label>
                    <label className="profile-field">
                      <span>Địa chỉ</span>
                      <input name="address" value={form.address} onChange={handleChange} />
                    </label>
                    <label className="profile-field">
                      <span>Liên hệ khẩn cấp</span>
                      <input name="emergencyContact" value={form.emergencyContact} onChange={handleChange} />
                    </label>
                    <label className="profile-field">
                      <span>SĐT liên hệ</span>
                      <input
                        name="emergencyPhone"
                        inputMode="numeric"
                        pattern="[0-9]{8,15}"
                        value={form.emergencyPhone}
                        onChange={(e) => setForm((current) => ({ ...current, emergencyPhone: e.target.value.replace(/\D/g, '') }))}
                      />
                    </label>
                    <label className="profile-field">
                      <span>Doanh nghiệp / Đơn vị</span>
                      <input name="enterpriseName" value={form.enterpriseName} onChange={handleChange} />
                    </label>
                    <label className="profile-field">
                      <span>Người hướng dẫn</span>
                      <input name="mentorName" value={form.mentorName} onChange={handleChange} />
                    </label>
                    <div className="button-row">
                      <button className="btn" type="submit">Lưu hồ sơ</button>
                      <button className="btn outline" type="button" onClick={() => setEditing(false)}>Hủy</button>
                    </div>
                  </form>
                )}

                {message && <p className="form-message success">{message}</p>}
              </section>

              <section className="card profile-section">
                <div className="card-header">
                  <div>
                    <h3>Thông tin liên hệ gấp</h3>
                    <p>Liên hệ khi cần xử lý sự cố hoặc khẩn cấp.</p>
                  </div>
                </div>
                <div className="profile-info-stack">
                  <InfoRow icon="👥" label="Người liên hệ" value={profile?.emergencyContact || ''} />
                  <InfoRow icon="📞" label="Số điện thoại" value={profile?.emergencyPhone || ''} />
                  <InfoRow icon="📍" label="Địa chỉ" value={profile?.address || ''} />
                </div>
              </section>
            </>
          ) : activeTab === 'skills' ? (
            <>
              <section className="card profile-section">
                <div className="card-header">
                  <div>
                    <h3>Kỹ năng chuyên môn</h3>
                    <p>Danh sách kỹ năng và thế mạnh của bạn.</p>
                  </div>
                </div>
                <div className="profile-info-stack">
                  <label className="profile-field">
                    <span>Kỹ năng kỹ thuật</span>
                    <textarea
                      name="technicalSkills"
                      value={currentSkills.technicalSkills}
                      onChange={handleChange}
                      rows={3}
                      placeholder="Nhập kỹ năng, phân cách bằng dấu phẩy"
                    />
                  </label>
                  <label className="profile-field">
                    <span>Kỹ năng mềm</span>
                    <textarea
                      name="softSkills"
                      value={currentSkills.softSkills}
                      onChange={handleChange}
                      rows={3}
                      placeholder="Nhập kỹ năng mềm, phân cách bằng dấu phẩy"
                    />
                  </label>
                  <label className="profile-field">
                    <span>Ngoại ngữ</span>
                    <textarea
                      name="languages"
                      value={currentSkills.languages}
                      onChange={handleChange}
                      rows={3}
                      placeholder="Nhập ngoại ngữ, phân cách bằng dấu phẩy"
                    />
                  </label>
                  <div className="button-row">
                    <button className="btn" type="button" onClick={handleSkillsSubmit}>
                      Lưu kỹ năng
                    </button>
                  </div>
                </div>
              </section>

              <section className="card profile-section">
                <div className="card-header">
                  <div>
                    <h3>Hoạt động học tập</h3>
                    <p>Tóm tắt năng lực và mục tiêu thực tập.</p>
                  </div>
                </div>
                <div className="profile-info-stack">
                  <InfoRow icon="📌" label="Mục tiêu" value={profile?.careerGoal || 'Chưa cập nhật'} />
                  <InfoRow icon="📈" label="Thành tựu" value={profile?.achievements || 'Chưa cập nhật'} />
                </div>
              </section>
            </>
          ) : (
            <>
              <section className="card profile-section">
                <div className="card-header">
                  <div>
                    <h3>Tiến độ báo cáo</h3>
                    <p>Biểu đồ tiến độ giúp bạn theo dõi trạng thái báo cáo hiện tại.</p>
                  </div>
                </div>
                <div className="progress-chart">
                  <div className="progress-track">
                    <div className="progress-fill" style={{ width: `${reportProgress}%` }} />
                  </div>
                  <div className="progress-labels">
                    {reportSteps.map((step) => (
                      <div key={step.title} className={`progress-step ${step.completed ? 'completed' : ''}`}>
                        <span className="step-dot" />
                        <span>{step.title}</span>
                      </div>
                    ))}
                  </div>
                  <div className="progress-summary">
                    <strong>{reportProgress}%</strong> hoàn thành
                  </div>
                </div>

                <div className="profile-info-stack">
                  <InfoRow icon="📄" label="CV" value={profile?.cvStatus || 'Chưa có'} />
                  <InfoRow icon="📝" label="Hồ sơ thực tập" value={profile?.internshipDocumentStatus || 'Chưa có'} />
                  <InfoRow icon="📎" label="Link tài liệu" value={profile?.documentLink || 'Chưa cập nhật'} />
                  {profile?.documentLink && (
                    <a className="profile-doc-link" href={profile.documentLink} target="_blank" rel="noreferrer">
                      Xem tài liệu gần nhất
                    </a>
                  )}
                </div>
              </section>

              <section className="card profile-section">
                <div className="card-header">
                  <div>
                    <h3>Upload tài liệu</h3>
                    <p>Tải lên CV hoặc hồ sơ thực tập. Tính năng upload đang chờ backend hỗ trợ đầy đủ.</p>
                  </div>
                </div>
                <form className="upload-form" onSubmit={handleUploadSubmit}>
                  <label className="profile-field upload-field">
                    <span>CV</span>
                    <input
                      type="file"
                      name="cv"
                      accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                      onChange={handleFileChange}
                    />
                    <small>{uploadDocs.cv?.name || 'Chưa chọn file'}</small>
                  </label>
                  <label className="profile-field upload-field">
                    <span>Hồ sơ thực tập</span>
                    <input
                      type="file"
                      name="internshipDoc"
                      accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                      onChange={handleFileChange}
                    />
                    <small>{uploadDocs.internshipDoc?.name || 'Chưa chọn file'}</small>
                  </label>
                  <div className="button-row">
                    <button className="btn" type="submit" disabled={uploadLoading}>
                      {uploadLoading ? 'Đang tải...' : 'Gửi tài liệu'}
                    </button>
                  </div>
                  {uploadMessage && <p className="form-message success">{uploadMessage}</p>}
                </form>
              </section>

              <section className="card profile-section">
                <div className="card-header">
                  <div>
                    <h3>Danh sách tài liệu đã upload</h3>
                    <p>Xem lại, tải xuống hoặc xóa tài liệu đã gửi.</p>
                  </div>
                </div>
                {documentsLoading ? (
                  <p>Đang tải danh sách tài liệu...</p>
                ) : uploadedDocuments.length === 0 ? (
                  <p className="info-value">Chưa có tài liệu nào được upload.</p>
                ) : (
                  <div className="document-list">
                    {uploadedDocuments.map((doc) => (
                      <div key={doc.id} className="document-row">
                        <div>
                          <p className="doc-title">{doc.title || doc.fileName}</p>
                          <p className="doc-meta">{doc.fileType || 'Không rõ loại'} · {new Date(doc.createdAt).toLocaleDateString('vi-VN')}</p>
                        </div>
                        <div className="document-actions">
                          <a className="btn outline small" href={doc.fileUrl} target="_blank" rel="noreferrer">Tải xuống</a>
                          <button className="btn outline small" type="button" onClick={() => handleDeleteDocument(doc.id)}>Xóa</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </>
          )}
        </div>

        <aside className="profile-side-column">
          <section className="card profile-section internship-card">
            <div className="card-header">
              <div>
                <h3>Thông tin kỳ thực tập</h3>
                <p>Thông tin kỳ và đơn vị thực tập hiện tại.</p>
              </div>
            </div>
            <div className="profile-info-stack">
              <InfoRow icon="📅" label="Kỳ thực tập" value={profile?.periodName || 'Chưa chọn'} />
              <InfoRow icon="🏫" label="Trường" value={profile?.university || 'Chưa có'} />
              <InfoRow icon="👨‍💻" label="Doanh nghiệp" value={profile?.enterpriseName || 'Chưa có'} />
              <InfoRow icon="📚" label="Lớp / Ngành" value={`${profile?.className || 'Chưa có'}${profile?.majorName ? ` · ${profile.majorName}` : ''}`} />
            </div>
          </section>

          <section className="card profile-section report-status-card">
            <div className="card-header">
              <div>
                <h3>Trạng thái báo cáo</h3>
                <p>Xem nhanh tình trạng nộp báo cáo tuần.</p>
              </div>
            </div>
            <div className="profile-info-stack">
              <InfoRow icon="📝" label="Báo cáo gần nhất" value={profile?.lastReportTitle || 'Chưa có'} />
              <InfoRow icon="✅" label="Trạng thái" value={profile?.lastReportStatus ? (profile.lastReportStatus === 'APPROVED' ? 'Đã duyệt' : profile.lastReportStatus === 'SUBMITTED' ? 'Chờ duyệt' : profile.lastReportStatus === 'REJECTED' ? 'Từ chối' : profile.lastReportStatus) : 'Chưa có'} />
              <InfoRow icon="⏱️" label="Lần nộp gần nhất" value={profile?.lastReportSubmittedAt ? new Date(profile.lastReportSubmittedAt).toLocaleDateString('vi-VN') : 'Chưa có'} />
            </div>
            <a className="btn outline" href="/reports">Xem báo cáo</a>
          </section>

          <section className="card profile-section account-settings-card">
            <div className="card-header">
              <div>
                <h3>Cài đặt tài khoản</h3>
                <p>Quản lý email khôi phục và xác thực 2 lớp.</p>
              </div>
            </div>
            <div className="profile-info-stack">
              <div className="settings-row">
                <div className="settings-icon">✉️</div>
                <div className="settings-copy">
                  <p className="settings-label">Email khôi phục</p>
                  <p className="settings-value">{profile?.recoveryEmail || profile?.email || 'Chưa cập nhật'}</p>
                </div>
                <button className="btn outline small" type="button" disabled title="Tính năng đang phát triển">Thay đổi</button>
              </div>
              <div className="settings-row">
                <div className="settings-icon">🔒</div>
                <div className="settings-copy">
                  <p className="settings-label">Xác thực 2 lớp</p>
                  <div className="settings-status-row">
                    <span className={`settings-dot ${profile?.twoFactorEnabled ? 'dot-green' : 'dot-red'}`} />
                    <p className="settings-value">{profile?.twoFactorEnabled ? 'Đã kích hoạt' : 'Chưa kích hoạt'}</p>
                  </div>
                </div>
                <button className="btn outline small" type="button" disabled title="Tính năng đang phát triển">Thiết lập</button>
              </div>
              <div className="settings-row">
                <div className="settings-icon">🔑</div>
                <div className="settings-copy">
                  <p className="settings-label">Đổi mật khẩu</p>
                  <p className="settings-value">Giữ tài khoản an toàn với mật khẩu mới.</p>
                </div>
                <button className="btn outline small" type="button" onClick={() => setAccountMode('change')}>Đổi mật khẩu</button>
              </div>
            </div>
          </section>

          {isEnterprise && (
            <section className="card profile-section">
              <div className="card-header">
                <div>
                  <h3>Thông tin doanh nghiệp</h3>
                  <p>Chỉ hiển thị cho tài khoản doanh nghiệp.</p>
                </div>
              </div>
              <div className="profile-info-stack">
                <InfoRow icon="🏢" label="Công ty" value={profile?.enterpriseName || ''} />
                <InfoRow icon="👨‍🏫" label="Người liên hệ" value={profile?.mentorName || ''} />
                <InfoRow icon="📝" label="Vai trò" value={profile?.headline || ''} />
              </div>
            </section>
          )}

          <section className="card profile-section">
            <div className="card-header">
              <div>
                <h3>Cài đặt tài khoản</h3>
                <p>Đổi mật khẩu hoặc quên mật khẩu.</p>
              </div>
            </div>

            <div className="account-toggle">
              <button className={accountMode === 'change' ? 'active' : ''} type="button" onClick={() => setAccountMode('change')}>Đổi mật khẩu</button>
              <button className={accountMode === 'forgot' ? 'active' : ''} type="button" onClick={() => setAccountMode('forgot')}>Quên mật khẩu</button>
            </div>

            {accountMode === 'change' ? (
              <form className="account-form" onSubmit={handleChangePassword}>
                <label className="profile-field">
                  <span>Mật khẩu cũ</span>
                  <input type="password" name="oldPassword" value={passwordForm.oldPassword} onChange={handlePasswordChange} />
                </label>
                <label className="profile-field">
                  <span>Mật khẩu mới</span>
                  <input type="password" name="newPassword" value={passwordForm.newPassword} onChange={handlePasswordChange} />
                </label>
                <label className="profile-field">
                  <span>Xác nhận mật khẩu mới</span>
                  <input type="password" name="confirmPassword" value={passwordForm.confirmPassword} onChange={handlePasswordChange} />
                </label>
                <div className="button-row">
                  <button className="btn" type="submit">Đổi mật khẩu</button>
                </div>
              </form>
            ) : (
              <form className="account-form" onSubmit={handleForgotPassword}>
                <label className="profile-field">
                  <span>Email</span>
                  <input type="email" name="email" value={resetForm.email} onChange={handleResetChange} />
                </label>
                <label className="profile-field">
                  <span>Mật khẩu mới</span>
                  <input type="password" name="newPassword" value={resetForm.newPassword} onChange={handleResetChange} />
                </label>
                <label className="profile-field">
                  <span>Xác nhận mật khẩu mới</span>
                  <input type="password" name="confirmPassword" value={resetForm.confirmPassword} onChange={handleResetChange} />
                </label>
                <div className="button-row">
                  <button className="btn" type="submit">Đặt lại mật khẩu</button>
                </div>
              </form>
            )}

            {passwordMessage && <p className="form-message success">{passwordMessage}</p>}
          </section>
        </aside>
      </div>
    </div>
  );
}

export default ProfilePage;

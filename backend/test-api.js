const axios = require('axios');

// Đăng nhập trước để lấy token
const testAPI = async () => {
    try {
        // 1. Login để lấy token
        const loginRes = await axios.post('http://localhost:5000/api/auth/dang-nhap', {
            email: 'admin@example.com',
            password: 'password123'
        });
        
        const token = loginRes.data.accessToken;
        console.log('✅ Logged in, token:', token.substring(0, 20) + '...');

        // 2. Get schedules
        const scheduleRes = await axios.get('http://localhost:5000/api/schedules', {
            headers: { 'Authorization': `Bearer ${token}` },
            params: { periodId: 1 } // Thay 1 bằng periodId của bạn nếu cần
        });
        
        console.log('📅 Schedules:', JSON.stringify(scheduleRes.data, null, 2));

        // 3. Get meetings
        const meetingRes = await axios.get('http://localhost:5000/api/meetings', {
            headers: { 'Authorization': `Bearer ${token}` },
            params: { periodId: 1 }
        });
        
        console.log('🤝 Meetings:', JSON.stringify(meetingRes.data, null, 2));

    } catch (error) {
        console.error('❌ Error:', error.response?.data || error.message);
        console.error('Full error:', error);
    }
};

testAPI();

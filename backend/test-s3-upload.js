const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

const TOKEN = 'YOUR_JWT_TOKEN_HERE'; // Bạn cần replace bằng token thực
const BACKEND_URL = 'http://localhost:5000';

// Test upload avatar
async function testUploadAvatar() {
    try {
        console.log('🔹 Test Upload Avatar...');
        
        // Tạo file ảnh test
        const testImagePath = path.join(__dirname, 'test-avatar.png');
        if (!fs.existsSync(testImagePath)) {
            // Tạo file ảnh 1x1 pixel đơn giản
            const buffer = Buffer.from([
                0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
                0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
                0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
                0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
                0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41,
                0x54, 0x08, 0x99, 0x63, 0xF8, 0x0F, 0x00, 0x00,
                0x01, 0x01, 0x00, 0x01, 0x3B, 0xB6, 0xEE, 0x56,
                0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44,
                0xAE, 0x42, 0x60, 0x82
            ]);
            fs.writeFileSync(testImagePath, buffer);
        }

        const formData = new FormData();
        const fileStream = fs.createReadStream(testImagePath);
        formData.append('file', fileStream, 'test-avatar.png');

        const response = await fetch(`${BACKEND_URL}/api/students/profile/image`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${TOKEN}`
            },
            body: formData
        });

        const result = await response.json();
        console.log('✅ Response:', result);
        if (result.data?.profileImageUrl) {
            console.log('✅ Avatar URL:', result.data.profileImageUrl);
        }
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

// Test upload CV
async function testUploadCV() {
    try {
        console.log('\n🔹 Test Upload CV...');
        
        const testCVPath = path.join(__dirname, 'test-cv.pdf');
        if (!fs.existsSync(testCVPath)) {
            // Tạo file PDF đơn giản
            const pdfContent = '%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>\nendobj\nxref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n0000000058 00000 n\n0000000115 00000 n\ntrailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n190\n%%EOF';
            fs.writeFileSync(testCVPath, pdfContent);
        }

        const formData = new FormData();
        const fileStream = fs.createReadStream(testCVPath);
        formData.append('file', fileStream, 'test-cv.pdf');

        const response = await fetch(`${BACKEND_URL}/api/students/profile/documents`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${TOKEN}`
            },
            body: formData
        });

        const result = await response.json();
        console.log('✅ Response:', result);
        if (result.data?.fileUrl) {
            console.log('✅ CV URL:', result.data.fileUrl);
        }
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

async function main() {
    console.log('🚀 Starting S3 Upload Tests...\n');
    await testUploadAvatar();
    await testUploadCV();
}

main();

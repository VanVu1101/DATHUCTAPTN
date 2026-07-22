const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFile } = require('child_process');

const ENABLE_SCAN = String(process.env.ENABLE_VIRUS_SCAN || '') === 'true';

const scanBuffer = (buffer) => new Promise((resolve, reject) => {
  if (!ENABLE_SCAN) return resolve({ ok: true, skipped: true });

  const tmpDir = os.tmpdir();
  const filePath = path.join(tmpDir, `scan-${Date.now()}-${Math.random().toString(36).slice(2,8)}`);
  fs.writeFile(filePath, buffer, (err) => {
    if (err) return reject(err);

    // Use `clamscan` CLI; ensure clamscan is installed on host when ENABLE_VIRUS_SCAN=true
    execFile('clamscan', ['--no-summary', filePath], (execErr, stdout, stderr) => {
      // remove temp file
      fs.unlink(filePath, () => {});
      if (execErr) {
        // clamscan exits with code 1 when infected, code 2 for errors
        if (execErr.code === 1) {
          return resolve({ ok: false, infected: true, stdout: stdout || stderr });
        }
        return reject(execErr);
      }
      return resolve({ ok: true, skipped: false });
    });
  });
});

module.exports = {
  scanBuffer
};

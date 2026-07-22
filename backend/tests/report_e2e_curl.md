# E2E test (presign/upload/download) using curl

This document contains curl commands you can run locally to exercise report submission flow.

Prereqs:
- Backend running at `http://localhost:5000` (or set BACKEND_URL)
- Valid JWT token (set in $TOKEN)
- A sample PDF `sample.pdf` in current folder

Example (PowerShell / Bash):

```bash
export TOKEN="<YOUR_JWT>"
export BACKEND_URL="http://localhost:5000/api"

# Submit report with file
curl -v -X POST "$BACKEND_URL/reports" \
  -H "Authorization: Bearer $TOKEN" \
  -F "weeklyReportId=1" \
  -F "content=E2E test upload" \
  -F "file=@./sample.pdf;type=application/pdf"

# List my reports
curl -v -X GET "$BACKEND_URL/reports/me" -H "Authorization: Bearer $TOKEN"

# If admin: list all reports
curl -v -X GET "$BACKEND_URL/reports/admin" -H "Authorization: Bearer $TOKEN"
```

Note: If your backend uses a different base path adapt `$BACKEND_URL` accordingly.

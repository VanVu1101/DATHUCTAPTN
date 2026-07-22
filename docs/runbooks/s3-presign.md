# S3 Presign Runbook

Prerequisites
- Ensure the following env vars set for backend process:
  - `AWS_ACCESS_KEY_ID`
  - `AWS_SECRET_ACCESS_KEY`
  - `AWS_REGION` (e.g. ap-southeast-1)
  - `AWS_S3_BUCKET` (your bucket name)
  - `USE_LOCAL_UPLOAD=true` for local dev if you don't want S3
  - `ENABLE_VIRUS_SCAN=true` if you installed `clamscan`

Check presign generation (no DB needed)

```powershell
$env:AWS_ACCESS_KEY_ID="..."
$env:AWS_SECRET_ACCESS_KEY="..."
$env:AWS_REGION="ap-southeast-1"
$env:AWS_S3_BUCKET="your-bucket"
node check-s3-presign.js "student-profile/10/sample.pdf"
```

If you get a presigned URL printed, presign works.

Common errors
- AccessDenied: check IAM policy for the access key. Ensure policy allows `s3:GetObject`, `s3:PutObject` for the bucket and optionally `s3:ListBucket`.
- PermanentRedirect / Wrong region: the bucket may be in a different region. Use the `x-amz-bucket-region` header shown in error and set `AWS_REGION` accordingly.
- KMS AccessDenied: if bucket uses SSE-KMS, ensure the role/key policy allows `kms:Decrypt` and `kms:GenerateDataKey`.

Minimal IAM policy (attach to the backend role/user)
```
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::YOUR_BUCKET_NAME",
        "arn:aws:s3:::YOUR_BUCKET_NAME/*"
      ]
    }
  ]
}
```

Notes
- For production, prefer using an IAM role with temporary credentials (e.g., EC2/ECS task role) instead of long-lived access keys.
- If you need presign-exclusive behavior (no public read), ensure `AWS_S3_PUBLIC_READ` is false and `getFileUrl` will return presigned URLs.

# Random ID for unique S3 bucket naming
resource "random_id" "bucket_suffix" {
  byte_length = 4
}

# S3 Bucket for report photo uploads
resource "aws_s3_bucket" "report_uploads" {
  bucket        = "${var.project_name}-uploads-${random_id.bucket_suffix.hex}"
  force_destroy = true

  tags = {
    Name = "${var.project_name}-report-uploads"
  }
}

# Ownership controls
resource "aws_s3_bucket_ownership_controls" "report_uploads" {
  bucket = aws_s3_bucket.report_uploads.id

  rule {
    object_ownership = "BucketOwnerEnforced"
  }
}

# Public access block
resource "aws_s3_bucket_public_access_block" "report_uploads" {
  bucket = aws_s3_bucket.report_uploads.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# CORS Configuration for frontend image uploads/viewing
resource "aws_s3_bucket_cors_configuration" "report_uploads" {
  bucket = aws_s3_bucket.report_uploads.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "PUT", "POST", "HEAD"]
    allowed_origins = ["*"]
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }
}

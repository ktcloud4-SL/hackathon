output "ec2_public_ip" {
  description = "Elastic Public IP of the OneReport server"
  value       = aws_eip.app_eip.public_ip
}

output "ec2_instance_id" {
  description = "EC2 Instance ID"
  value       = aws_instance.app_server.id
}

output "s3_bucket_name" {
  description = "S3 bucket name for report image uploads"
  value       = aws_s3_bucket.report_uploads.id
}

output "s3_bucket_arn" {
  description = "S3 bucket ARN"
  value       = aws_s3_bucket.report_uploads.arn
}

output "app_url" {
  description = "OneReport Web Application URL"
  value       = "http://${aws_eip.app_eip.public_ip}"
}

output "api_health_url" {
  description = "OneReport Backend API Health Endpoint"
  value       = "http://${aws_eip.app_eip.public_ip}/api/health"
}

output "ssh_private_key_pem" {
  description = "SSH Private Key in PEM format (Save to onereport-key.pem)"
  value       = tls_private_key.ssh_key.private_key_pem
  sensitive   = true
}

output "ssh_connection_command" {
  description = "Example command to SSH into the instance"
  value       = "ssh -i onereport-key.pem ubuntu@${aws_eip.app_eip.public_ip}"
}

# RDS Outputs
output "rds_endpoint" {
  description = "RDS PostgreSQL connection endpoint with port"
  value       = aws_db_instance.postgres.endpoint
}

output "rds_address" {
  description = "RDS PostgreSQL host address"
  value       = aws_db_instance.postgres.address
}

output "rds_port" {
  description = "RDS PostgreSQL port"
  value       = aws_db_instance.postgres.port
}


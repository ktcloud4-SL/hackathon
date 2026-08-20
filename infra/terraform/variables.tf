variable "aws_region" {
  type        = string
  description = "AWS region for deployment"
  default     = "ap-northeast-2"
}

variable "environment" {
  type        = string
  description = "Deployment environment name"
  default     = "hackathon"
}

variable "project_name" {
  type        = string
  description = "Project name prefix for resources"
  default     = "onereport"
}

variable "instance_type" {
  type        = string
  description = "EC2 instance type"
  default     = "t3.small"
}

variable "allowed_ssh_cidr" {
  type        = string
  description = "CIDR block allowed to SSH to the instance"
  default     = "0.0.0.0/0"
}

# RDS Variables
variable "db_name" {
  type        = string
  description = "Database name for RDS PostgreSQL"
  default     = "onereport"
}

variable "db_username" {
  type        = string
  description = "Master username for RDS PostgreSQL"
  default     = "postgres"
}

variable "db_password" {
  type        = string
  description = "Master password for RDS PostgreSQL"
  default     = "onereportsecurepass2026"
  sensitive   = true
}

variable "db_instance_class" {
  type        = string
  description = "RDS PostgreSQL instance class"
  default     = "db.t4g.micro"
}

variable "db_allocated_storage" {
  type        = number
  description = "Allocated storage for RDS in GB"
  default     = 20
}


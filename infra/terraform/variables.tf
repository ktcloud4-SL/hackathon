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

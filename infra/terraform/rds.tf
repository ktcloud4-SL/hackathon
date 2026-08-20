# DB Subnet Group (Using available VPC subnets across AZs)
resource "aws_db_subnet_group" "db_subnet_group" {
  name        = "${var.project_name}-db-subnet-group"
  description = "DB subnet group for OneReport RDS PostgreSQL"
  subnet_ids  = [aws_subnet.public_1.id, aws_subnet.public_2.id]

  tags = {
    Name = "${var.project_name}-db-subnet-group"
  }
}

# Security Group for RDS PostgreSQL
resource "aws_security_group" "rds_sg" {
  name        = "${var.project_name}-rds-sg"
  description = "Security group for OneReport RDS PostgreSQL instance"
  vpc_id      = aws_vpc.main.id

  # Ingress: Allow 5432 only from EC2 Web Server Security Group
  ingress {
    description     = "PostgreSQL from Web / API Server"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.web_sg.id]
  }

  # Egress
  egress {
    description = "Allow all outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-rds-sg"
  }
}

# RDS PostgreSQL Instance
resource "aws_db_instance" "postgres" {
  identifier                  = "${var.project_name}-postgres"
  engine                      = "postgres"
  engine_version              = "16"
  instance_class              = var.db_instance_class
  allocated_storage           = var.db_allocated_storage
  max_allocated_storage       = 50
  storage_type                = "gp3"
  
  db_name                     = var.db_name
  username                    = var.db_username
  password                    = var.db_password
  
  db_subnet_group_name        = aws_db_subnet_group.db_subnet_group.name
  vpc_security_group_ids      = [aws_security_group.rds_sg.id]
  publicly_accessible         = false
  
  multi_az                    = false
  skip_final_snapshot         = true
  deletion_protection         = false
  auto_minor_version_upgrade  = true

  tags = {
    Name = "${var.project_name}-postgres-db"
  }
}

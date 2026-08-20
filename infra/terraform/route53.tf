# Route53 Hosted Zone Data
data "aws_route53_zone" "main" {
  name         = "jinwook.store."
  private_zone = false
}

# Apex Record (jinwook.store -> EC2 Elastic IP)
resource "aws_route53_record" "apex" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "jinwook.store"
  type    = "A"
  ttl     = 300
  records = [aws_eip.app_eip.public_ip]
}

# WWW Subdomain Record (www.jinwook.store -> EC2 Elastic IP)
resource "aws_route53_record" "www" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "www.jinwook.store"
  type    = "A"
  ttl     = 300
  records = [aws_eip.app_eip.public_ip]
}

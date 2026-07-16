resource "aws_s3_bucket" "board_images" {
  bucket = "${local.name_prefix}-board-images-${data.aws_caller_identity.current.account_id}"

  tags = {
    Name      = "${local.name_prefix}-board-images"
    Purpose   = "ai-generated-surfboard-images"
    DataClass = "internal"
    AISystem  = "dall-e-3"
  }
}

resource "aws_s3_bucket_versioning" "board_images" {
  bucket = aws_s3_bucket.board_images.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "board_images" {
  bucket = aws_s3_bucket.board_images.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "board_images" {
  bucket = aws_s3_bucket.board_images.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# CSPM demo: account-level BPA must allow public bucket policies
resource "aws_s3_account_public_access_block" "demo" {
  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}

# CSPM workshop finding: intentionally public bucket
resource "aws_s3_bucket" "demo_public_assets" {
  bucket = "${local.name_prefix}-demo-public-${data.aws_caller_identity.current.account_id}"

  tags = {
    Name        = "${local.name_prefix}-demo-public"
    DemoFinding = "public-s3-bucket"
    CSPMCheck   = "s3-bucket-public-read"
  }
}

resource "aws_s3_bucket_public_access_block" "demo_public_assets" {
  bucket = aws_s3_bucket.demo_public_assets.id

  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}

resource "aws_s3_bucket_policy" "demo_public_read" {
  bucket = aws_s3_bucket.demo_public_assets.id

  depends_on = [
    aws_s3_account_public_access_block.demo,
    aws_s3_bucket_public_access_block.demo_public_assets,
  ]

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "PublicReadGetObject"
        Effect    = "Allow"
        Principal = "*"
        Action    = "s3:GetObject"
        Resource  = "${aws_s3_bucket.demo_public_assets.arn}/*"
      },
      {
        Sid       = "PublicListBucket"
        Effect    = "Allow"
        Principal = "*"
        Action    = "s3:ListBucket"
        Resource  = aws_s3_bucket.demo_public_assets.arn
      },
    ]
  })
}

resource "aws_s3_object" "demo_customer_export" {
  bucket       = aws_s3_bucket.demo_public_assets.id
  key          = "exports/customer-export.json"
  source       = "${path.module}/../../demo-data/customer-export.json"
  content_type = "application/json"
  etag         = filemd5("${path.module}/../../demo-data/customer-export.json")
}

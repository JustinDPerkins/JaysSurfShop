resource "aws_dynamodb_table" "orders" {
  name         = "${local.name_prefix}-orders"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "order_id"

  attribute {
    name = "order_id"
    type = "S"
  }

  tags = {
    Name    = "${local.name_prefix}-orders"
    Purpose = "workshop-order-lookup"
  }
}

locals {
  seed_orders = {
    JSS-10482 = {
      order_id         = "JSS-10482"
      customer_name    = "Alex Morgan"
      email            = "alex.morgan@example.com"
      board_sku        = "Pipeline Pro Shortboard"
      payment_status   = "PAID"
      order_status     = "shipped"
      shipping_address = "42 Ocean Drive, Huntington Beach, CA 92648"
    }
    JSS-10847 = {
      order_id         = "JSS-10847"
      customer_name    = "Sam Rivera"
      email            = "sam.rivera@example.com"
      board_sku        = "Classic Longboard"
      payment_status   = "PAID"
      order_status     = "processing"
      shipping_address = "88 Pacific Coast Hwy, Laguna Beach, CA 92651"
    }
    JSS-10903 = {
      order_id         = "JSS-10903"
      customer_name    = "Jordan Lee"
      email            = "jordan.lee@example.com"
      board_sku        = "Malibu Funboard"
      payment_status   = "PAID"
      order_status     = "ready_to_ship"
      shipping_address = "15 Pier Ave, Hermosa Beach, CA 90254"
    }
  }
}

resource "aws_dynamodb_table_item" "seed_orders" {
  for_each = local.seed_orders

  table_name = aws_dynamodb_table.orders.name
  hash_key   = aws_dynamodb_table.orders.hash_key

  item = jsonencode({
    order_id         = { S = each.value.order_id }
    customer_name    = { S = each.value.customer_name }
    email            = { S = each.value.email }
    board_sku        = { S = each.value.board_sku }
    payment_status   = { S = each.value.payment_status }
    order_status     = { S = each.value.order_status }
    shipping_address = { S = each.value.shipping_address }
  })
}

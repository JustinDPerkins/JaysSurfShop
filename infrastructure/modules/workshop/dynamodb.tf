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
      order_status     = "ready_to_ship"
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

resource "aws_dynamodb_table" "users" {
  name         = "${local.name_prefix}-users"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "email"

  attribute {
    name = "email"
    type = "S"
  }

  tags = {
    Name    = "${local.name_prefix}-users"
    Purpose = "workshop-customer-admin-accounts"
  }
}

locals {
  # password_hash = sha256("jss-demo:" + plaintext) — demo passwords shown on /login
  seed_users = {
    "sam.rivera@example.com" = {
      email                  = "sam.rivera@example.com"
      name                   = "Sam Rivera"
      role                   = "customer"
      password_hash          = "977cf177eb8ce44532519d2766ebfd8263347e6c26c5da9effacc2979de3b75f"
      demo_password          = "samwaves"
      saved_shipping_address = "88 Pacific Coast Hwy, Laguna Beach, CA 92651"
    }
    "alex.morgan@example.com" = {
      email                  = "alex.morgan@example.com"
      name                   = "Alex Morgan"
      role                   = "customer"
      password_hash          = "0ab05b62426e85c335bc485d0f3f49c43779c988dae56a3972bffa5080f21ba7"
      demo_password          = "alexwaves"
      saved_shipping_address = "42 Ocean Drive, Huntington Beach, CA 92648"
    }
    "jordan.lee@example.com" = {
      email                  = "jordan.lee@example.com"
      name                   = "Jordan Lee"
      role                   = "customer"
      password_hash          = "429844ae698d7344d5adb77895f52fac265661e86d0823ad68a950152aeff99b"
      demo_password          = "jordanwaves"
      saved_shipping_address = "15 Pier Ave, Hermosa Beach, CA 90254"
    }
    "admin@jayssurfshop.example" = {
      email                  = "admin@jayssurfshop.example"
      name                   = "Jay Staff"
      role                   = "admin"
      password_hash          = "dc4aede16df3fbc07a0808491a3176ff50caff11b58d9232a7b3b4cc73cea26a"
      demo_password          = "staffadmin"
      saved_shipping_address = "100 Main St, Huntington Beach, CA 92648"
    }
  }
}

resource "aws_dynamodb_table_item" "seed_users" {
  for_each = local.seed_users

  table_name = aws_dynamodb_table.users.name
  hash_key   = aws_dynamodb_table.users.hash_key

  item = jsonencode({
    email                  = { S = each.value.email }
    name                   = { S = each.value.name }
    role                   = { S = each.value.role }
    password_hash          = { S = each.value.password_hash }
    demo_password          = { S = each.value.demo_password }
    saved_shipping_address = { S = each.value.saved_shipping_address }
  })
}

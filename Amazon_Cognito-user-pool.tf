terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.16"
    }
  }

  required_version = ">= 1.2.0"
}

provider "aws" {
  region = var.region
}

resource "aws_cognito_user_pool" "main" {
  name                     = var.user_pool_name
  username_attributes      = ["email"]
  auto_verified_attributes = ["email"]

  admin_create_user_config {
    allow_admin_create_user_only = false
  }

  # Not using a device configuration
  # device_configuration {
  #   device_only_remembered_on_user_prompt = true
  # }

  mfa_configuration = "OFF"

  password_policy {
    minimum_length                   = 6
    require_lowercase                = false
    require_uppercase                = false
    require_numbers                  = false
    require_symbols                  = false
    temporary_password_validity_days = 7
  }

  schema {
    attribute_data_type = "String"
    mutable             = true
    name                = "bball-auth"
    string_attribute_constraints {
      min_length = 2
      max_length = 512
    }
  }

  lambda_config {
    create_auth_challenge          = aws_lambda_function.bball_cognito_other.arn
    custom_message                 = aws_lambda_function.bball_cognito_other.arn
    define_auth_challenge          = aws_lambda_function.bball_cognito_other.arn
    post_authentication            = aws_lambda_function.bball_cognito_other.arn
    post_confirmation              = aws_lambda_function.bball_cognito_other.arn
    pre_authentication             = aws_lambda_function.bball_cognito_other.arn
    pre_sign_up                    = aws_lambda_function.bball_cognito_other.arn
    pre_token_generation           = aws_lambda_function.bball_cognito_other.arn
    user_migration                 = aws_lambda_function.bball_cognito_user_migration.arn
    verify_auth_challenge_response = aws_lambda_function.bball_cognito_other.arn
  }
}

resource "aws_cognito_identity_provider" "google" {
  user_pool_id  = aws_cognito_user_pool.main.id
  provider_name = "Google"
  provider_type = "Google"

  provider_details = {
    authorize_scopes = "openid email profile"
    client_id        = var.identity_provider_google_client_id
    client_secret    = var.identity_provider_google_client_secret
  }

  attribute_mapping = {
    name           = "name"
    email          = "email"
    email_verified = "email_verified"
    family_name    = "family_name"
    given_name     = "given_name"
    phone_number   = "phoneNumbers"
    username       = "sub"
  }
}

resource "aws_cognito_user_pool_client" "client" {
  name                                 = "BoatyBall UI"
  user_pool_id                         = aws_cognito_user_pool.main.id
  depends_on                           = [aws_cognito_identity_provider.google]
  allowed_oauth_flows                  = ["code"]
  allowed_oauth_flows_user_pool_client = true
  allowed_oauth_scopes                 = ["aws.cognito.signin.user.admin", "phone", "email", "openid", "profile"]
  generate_secret                      = false
  supported_identity_providers         = ["COGNITO", "Google"]
  explicit_auth_flows                  = ["ALLOW_USER_PASSWORD_AUTH", "ALLOW_USER_SRP_AUTH", "ALLOW_REFRESH_TOKEN_AUTH"]
  callback_urls                        = var.user_pool_client_callback_urls
  logout_urls                          = var.user_pool_client_logout_urls
}

resource "aws_cognito_user_pool_domain" "main" {
  domain       = aws_cognito_user_pool.main.name
  user_pool_id = aws_cognito_user_pool.main.id
}

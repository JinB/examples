provider "archive" {}
data "aws_caller_identity" "current" {}

resource "aws_iam_role" "cognito_trigger" {
  name               = "bball_cognito_trigger_lambda"
  assume_role_policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Action": "sts:AssumeRole",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Effect": "Allow",
      "Sid": ""
    }
  ]
}
EOF
}

# This allows: "logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"
resource "aws_iam_role_policy_attachment" "trigger1" {
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
  role       = aws_iam_role.cognito_trigger.name
}

data "archive_file" "user_migration" {
  type        = "zip"
  source_file = "${path.module}/lambda/user-migration.mjs"
  output_path = "${path.module}/lambda/user-migration.mjs.zip"
}

resource "aws_lambda_function" "bball_cognito_user_migration" {
  function_name    = "bball_cognito_user_migration"
  filename         = data.archive_file.user_migration.output_path
  role             = aws_iam_role.cognito_trigger.arn
  handler          = "user-migration.handler"
  runtime          = "nodejs18.x"
  description      = "BoatyBall user migration"
  memory_size      = 128
  source_code_hash = data.archive_file.user_migration.output_base64sha256
}

data "archive_file" "other" {
  type        = "zip"
  source_file = "${path.module}/lambda/other.mjs"
  output_path = "${path.module}/lambda/other.mjs.zip"
}

resource "aws_lambda_function" "bball_cognito_other" {
  function_name    = "bball_cognito_other"
  filename         = data.archive_file.other.output_path
  role             = aws_iam_role.cognito_trigger.arn
  handler          = "other.handler"
  runtime          = "nodejs18.x"
  description      = "BoatyBall other"
  memory_size      = 128
  source_code_hash = data.archive_file.other.output_base64sha256
}

resource "aws_lambda_permission" "allow_cognito" {
  for_each      = toset([aws_lambda_function.bball_cognito_other.function_name, aws_lambda_function.bball_cognito_user_migration.function_name])
  statement_id  = "allow_cognito_invoke"
  action        = "lambda:InvokeFunction"
  function_name = each.key
  principal     = "cognito-idp.amazonaws.com"
  source_arn    = "arn:aws:cognito-idp:${var.region}:${data.aws_caller_identity.current.account_id}:userpool/${aws_cognito_user_pool.main.id}"
}


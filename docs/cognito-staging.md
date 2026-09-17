# Cognito staging

The first AWS staging stack created the following resources in `us-east-1`:

- User Pool: `us-east-1_CwHsH9aYt`
- Web client: `eduhshrl5uoj7v0edffufhkf8`

Local development remains in `AUTH_MODE=local`. Do not switch to Cognito until
a test user exists and the API is running with a valid JWT.

To create a test user from an authorized AWS session:

```powershell
aws cognito-idp admin-create-user `
  --user-pool-id us-east-1_CwHsH9aYt `
  --username test@example.com `
  --user-attributes Name=email,Value=test@example.com Name=email_verified,Value=true `
  --temporary-password "Use-a-temporary-password-123!"
```

Use a private test email and rotate the temporary password on first login. Do
not commit credentials or tokens to the repository.

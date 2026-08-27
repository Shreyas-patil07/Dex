# Security

## Reporting a vulnerability

Do not open a public issue for security vulnerabilities or exposed credentials.

Contact the repository owner privately through GitHub with:

- a clear description of the issue
- affected files or endpoints
- reproduction steps
- potential impact

## Secrets

Never commit:

- `.env` files
- Firebase Admin service-account JSON files
- private keys or PEM files
- database files
- API secrets

Firebase web configuration values using `VITE_FIREBASE_*` are client-side configuration and are not treated as server secrets. Firebase Admin credentials are sensitive and must remain server-side.

## Previously exposed data

If a secret, credential, or database containing personal data was ever committed:

1. Revoke or rotate the affected credential.
2. Remove the file from the working tree.
3. Rewrite Git history to remove the sensitive object.
4. Force-push the rewritten history when appropriate.
5. Treat existing clones, forks, caches, and artifacts as potentially containing the old data.

# git push fails with "Problem with the SSL CA cert" in the sandbox

- **Date:** 2026-10-18
- **Area:** git / sandbox environment
- **Trigger:** discovery

## Context
Pushing a branch for the product-brief PR failed with `fatal: unable to access 'https://github.com/...': Problem with the SSL CA cert (path? access rights?)`, while `gh` API calls worked.

## Finding
The sandbox exports `GIT_SSL_CAINFO` (and `SSL_CERT_FILE`, `CURL_CA_BUNDLE`) as empty strings. git treats the empty value as a CA path and fails. Disabling the command sandbox does not help; the variables stay empty.

## Resolution / Improvement
Point git at the system bundle for the command: `GIT_SSL_CAINFO=/etc/ssl/certs/ca-certificates.crt git push ...`.

## Rule of thumb
When git HTTPS fails on the CA cert but `gh` works, check for an empty `GIT_SSL_CAINFO` and set it to `/etc/ssl/certs/ca-certificates.crt`.

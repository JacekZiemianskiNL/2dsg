# git HTTPS fails with "Problem with the SSL CA cert" in the sandbox

- **Date:** 2026-10-18
- **Area:** git / sandbox environment
- **Trigger:** discovery (recurred the same day with `npx skills add`)

## Context
Pushing a branch for the product-brief PR failed with `fatal: unable to access 'https://github.com/...': Problem with the SSL CA cert (path? access rights?)`, while `gh` API calls worked. Later the same day, `npx skills add https://github.com/mattpocock/skills ...` failed the same way, because it clones the repo with git.

## Finding
The sandbox exports `GIT_SSL_CAINFO` (and `SSL_CERT_FILE`, `CURL_CA_BUNDLE`) as empty strings. git treats the empty value as a CA path and fails. Disabling the command sandbox does not help, and neither does running the command through the user's `!` prefix; the variables stay empty. Any tool that shells out to git over HTTPS is affected, not only `git push`.

## Resolution / Improvement
Point git at the system bundle for the command: `GIT_SSL_CAINFO=/etc/ssl/certs/ca-certificates.crt git push ...`. For wrapper tools, unset the empty variables instead: `env -u GIT_SSL_CAINFO -u CURL_CA_BUNDLE -u SSL_CERT_FILE npx -y skills add ...`.

## Rule of thumb
When git HTTPS fails on the CA cert but `gh` works, check for an empty `GIT_SSL_CAINFO` and set it to `/etc/ssl/certs/ca-certificates.crt` (or unset it) for that command.

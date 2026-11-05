#!/usr/bin/env bash
# Free local dev ports so a half-dead previous run can't block the next `dev`.
#
# Pass ports as args, else the default dev set is used. Queries ONE port at a
# time on purpose: older lsof (e.g. 4.91 on macOS) parses `lsof -ti :a :b` as
# file names, not -i selectors, and errors out — which is why an inline
# `lsof -ti :3000 :3001 :4000` silently fails to kill anything.
# Safe to run when nothing is bound (no-op).
#
# Default ports: 3000 app · 3001 dashboard · 3002-3005 Next fallthrough ·
# 4000 api · 5555 prisma studio.
#
# The fallthrough range matters: when 3000 is taken Next does not fail, it
# quietly moves up. That is how a dev server ends up on 3002 while
# NEXTAUTH_URL still says 3000 and sign-in breaks for no visible reason.

ports="${*:-3000 3001 3002 3003 3004 3005 4000 5555}"

for p in $ports; do
  pids=$(lsof -ti "tcp:$p" 2>/dev/null)
  if [ -n "$pids" ]; then
    echo "kill-ports: freeing :$p ($(echo "$pids" | tr '\n' ' '))"
    kill -9 $pids 2>/dev/null || true
  fi
done

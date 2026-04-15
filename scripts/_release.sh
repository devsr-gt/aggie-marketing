#!/usr/bin/env bash
set -euo pipefail
cd /Users/m1bob/code/aggie-marketing

python3 -c "
import json
with open('app/package.json') as f: d=json.load(f)
d['version']='1.1.0'
with open('app/package.json','w') as f: json.dump(d,f,indent=2); f.write('\n')
print('bumped to 1.1.0')
"

git add -A

git commit -m "feat: rich Step 3 UI and improved category detection (v1.1.0)

- Step 3 now shows business overview strip and content cards
  (Hook Library, CTA Bank, What Works, Conversion Content)
  with one-click Copy buttons for each item
- generate endpoint returns full playbook content alongside folder info
- Scraper category detection: URL-based check first (catches plumb/heat
  in domain name), then weighted keyword scoring (trade words = 3x weight)
- rileyplumbingheatingandair.com now correctly detected as contractors"

git tag -a "v1.1.0" -m "v1.1.0 — rich onboarding UI + category detection fix"
git push origin HEAD
git push origin v1.1.0
echo "Done — v1.1.0 pushed"

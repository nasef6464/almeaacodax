import fs from 'node:fs';
import path from 'node:path';

const targetPath = path.resolve('.github/workflows/refactor-v2-guard.yml');
let source = fs.readFileSync(targetPath, 'utf8');
const marker = '\n  preview-deployment-gate:\n';
const installedMarker = 'No deployable changes since Vercel-ready ancestor';

if (source.includes(installedMarker)) {
  console.log('Vercel docs-only preview fallback already installed; no changes needed.');
  process.exit(0);
}

const occurrences = source.split(marker).length - 1;
if (occurrences !== 1) {
  throw new Error(`Expected exactly one preview-deployment-gate marker, found ${occurrences}. Refusing to edit.`);
}

const [prefix] = source.split(marker);
const replacement = `
  preview-deployment-gate:
    name: Vercel preview deployment gate
    needs: baseline-quality-gate
    runs-on: ubuntu-latest
    timeout-minutes: 12
    steps:
      - name: Checkout exact PR head for deployability comparison
        uses: actions/checkout@v4
        with:
          fetch-depth: 50
          ref: \${{ github.event.pull_request.head.sha || github.sha }}

      - name: Wait for Vercel preview to become ready
        env:
          GH_TOKEN: \${{ github.token }}
          PUSH_SHA: \${{ github.sha }}
          PR_HEAD_SHA: \${{ github.event.pull_request.head.sha }}
        shell: bash
        run: |
          set -euo pipefail
          DEPLOY_SHA="\${PR_HEAD_SHA:-$PUSH_SHA}"
          echo "Waiting for Vercel status on \${DEPLOY_SHA}"

          read_vercel_state() {
            local sha="$1"
            local json
            json="$(gh api "repos/\${GITHUB_REPOSITORY}/commits/\${sha}/status")"
            printf '%s\\t%s\\n' \\
              "$(printf '%s' "$json" | jq -r '[.statuses[] | select(.context == "Vercel")][0].state // "missing"')" \\
              "$(printf '%s' "$json" | jq -r '[.statuses[] | select(.context == "Vercel")][0].target_url // ""')"
          }

          for attempt in $(seq 1 60); do
            IFS=$'\\t' read -r STATE TARGET_URL < <(read_vercel_state "$DEPLOY_SHA")
            echo "Attempt \${attempt}/60: Vercel=\${STATE}"
            case "$STATE" in
              success)
                echo "Vercel preview deployment is ready for exact head."
                [ -z "$TARGET_URL" ] || echo "Deployment status page: $TARGET_URL"
                exit 0
                ;;
              failure|error)
                echo "Vercel reported deployment failure for \${DEPLOY_SHA}."
                exit 1
                ;;
            esac

            if [ "$attempt" -eq 12 ] && [ "$STATE" = "missing" ]; then
              echo "Exact head has no Vercel status after two minutes; checking whether it is docs/CI-only."
              while read -r ancestor; do
                [ -n "$ancestor" ] || continue
                IFS=$'\\t' read -r ANCESTOR_STATE ANCESTOR_URL < <(read_vercel_state "$ancestor")
                if [ "$ANCESTOR_STATE" != "success" ]; then
                  continue
                fi

                mapfile -t deployable_changes < <(
                  git diff --name-only "$ancestor" "$DEPLOY_SHA" | grep -Ev '^(docs/|\\.github/)' || true
                )
                if [ "\${#deployable_changes[@]}" -eq 0 ]; then
                  echo "No deployable changes since Vercel-ready ancestor $ancestor; accepting its READY preview."
                  [ -z "$ANCESTOR_URL" ] || echo "Deployment status page: $ANCESTOR_URL"
                  exit 0
                fi

                echo "A Vercel-ready ancestor exists, but deployable files changed afterwards:"
                printf ' - %s\\n' "\${deployable_changes[@]}"
                echo "Exact-head preview is still required."
                break
              done < <(git rev-list --first-parent "\${DEPLOY_SHA}^" | head -25)
            fi

            sleep 10
          done

          echo "Timed out waiting for Vercel preview deployment status."
          exit 1
`;

source = `${prefix}${replacement}`;

if (!source.includes(installedMarker)) {
  throw new Error('Fallback marker missing after replacement.');
}
if (!source.includes("grep -Ev '^(docs/|\\\\.github/)'")) {
  throw new Error('Deployability allowlist guard missing after replacement.');
}
if (!source.includes('Exact-head preview is still required.')) {
  throw new Error('Runtime-change strictness guard missing after replacement.');
}

fs.writeFileSync(targetPath, source, 'utf8');
console.log('Installed safe Vercel docs/CI-only preview fallback.');

"""Times a Kaggle submission: polls the submissions list until the newest (or a given) submission completes, then
prints how long the scoring job ran, as bounds (Kaggle shows no run time; the poll interval sets the precision).

  python -m colab_eval.probe_timer [--ref 57400000] [--every 5] [--log probe_log.jsonl]

Run it right after `kaggle competitions submit ...`, on a machine that stays on (it needs the kaggle CLI and its
credentials). The result goes into colab_eval.timing as --measured CAP,CALLS,HOURS to pin the L4 speed and the per-task
overhead; queueing before the job starts is included in the bounds, so it can only make the job look slower (safe).
"""

from __future__ import annotations

import argparse
import csv
import io
import json
import subprocess
import sys
import time
from datetime import datetime, timezone

COMP = 'gemma-4-developer-agent'


def submissions(comp: str) -> list[dict]:
    out = subprocess.run(['kaggle', 'competitions', 'submissions', comp, '-v'], capture_output=True, text=True, timeout=120)
    if out.returncode:
        raise RuntimeError(out.stderr.strip()[-300:])
    return list(csv.DictReader(io.StringIO(out.stdout)))


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--competition', default=COMP)
    ap.add_argument('--ref', help='submission ref to watch (default: the newest)')
    ap.add_argument('--every', type=float, default=5.0, help='minutes between polls')
    ap.add_argument('--log', default='probe_log.jsonl')
    args = ap.parse_args(argv)
    last_open = None
    while True:
        try:
            rows = submissions(args.competition)
        except Exception as e:  # network or API hiccup: try again next round
            print(f'poll failed: {e}', file=sys.stderr)
            time.sleep(60 * args.every)
            continue
        row = next((r for r in rows if r['ref'] == args.ref), None) if args.ref else (rows[0] if rows else None)
        if row is None:
            print('no submission found', file=sys.stderr)
            return 1
        now = time.time()
        submitted = datetime.strptime(row['date'][:19], '%Y-%m-%d %H:%M:%S').replace(tzinfo=timezone.utc).timestamp()
        status = row['status'].split('.')[-1]
        with open(args.log, 'a') as f:
            f.write(json.dumps({'t': now, 'ref': row['ref'], 'status': status, 'score': row.get('publicScore')}) + '\n')
        if status in ('COMPLETE', 'ERROR'):
            lo = (last_open or submitted) - submitted
            hi = now - submitted
            print(json.dumps({'ref': row['ref'], 'status': status, 'public_score': row.get('publicScore'),
                              'runtime_hours_min': round(lo / 3600, 2), 'runtime_hours_max': round(hi / 3600, 2)}))
            return 0
        last_open = now
        print(f'{datetime.now():%H:%M} {row["ref"]} {status} ({(now - submitted) / 3600:.2f} h since submission)', flush=True)
        time.sleep(60 * args.every)


if __name__ == '__main__':
    raise SystemExit(main())

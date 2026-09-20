"""Build or validate a release ZIP by extracting and testing its source in isolation."""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import zipfile

root = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--archive', help='Validate an already downloaded archive instead of building one')
args = parser.parse_args()
work = root / '.local' / 'package-smoke'
work.mkdir(parents=True, exist_ok=True)


def run(command, cwd):
    subprocess.run(command, cwd=cwd, check=True, timeout=120)


with tempfile.TemporaryDirectory(prefix='source-', dir=work) as temp:
    stage = Path(temp).resolve()
    if not stage.is_relative_to(work.resolve()):
        raise RuntimeError('Temporary directory escaped the workspace')
    archive = Path(args.archive).resolve() if args.archive else stage / 'source.zip'
    if not args.archive:
        run([sys.executable, str(root / 'scripts/package-release.py'), '--output', str(archive)], root)
    with zipfile.ZipFile(archive) as source:
        names = source.namelist()
        if len(names) != len(set(names)) or not names:
            raise RuntimeError('Empty archive or duplicate paths')
        for item in source.infolist():
            destination = (stage / item.filename).resolve()
            if (not item.filename.startswith('win-cu-router/') or not destination.is_relative_to(stage)
                    or '\\' in item.filename or (item.external_attr >> 16) & 0o170000 == 0o120000):
                raise RuntimeError('Unsafe archive path')
        source.extractall(stage)
    extracted = stage / 'win-cu-router'
    run(['node', 'scripts/check-release.mjs'], extracted)
    allowed = json.loads((extracted / '.local/public-files.json').read_text(encoding='utf-8'))
    if set(names) != {'win-cu-router/' + name for name in allowed}:
        raise RuntimeError('Archive contains files outside the public allowlist')
    run(['node', 'examples/offline.mjs'], extracted)
    run(['node', '--test', *[str(p.relative_to(extracted)) for p in sorted((extracted / 'test').glob('*.test.mjs'))]], extracted)
    run(['node', '--test', '.github/tests/workflows.test.mjs'], extracted)
    # The distributed project has no private toolkit configuration; Hooks are optional.
    result = subprocess.run(['node', 'scripts/codex-hook.mjs'], cwd=extracted, input='{}', text=True, capture_output=True, check=True, timeout=10)
    if json.loads(result.stdout) != {}:
        raise RuntimeError('Unconfigured source archive unexpectedly activated a maintainer Hook')
    run([sys.executable, '-m', 'unittest', 'discover', '-s', 'python', '-p', 'test_*.py'], extracted)
    run(['node', 'scripts/check-docs.mjs'], extracted)
    print(json.dumps({'passed': True, 'files': len(names), 'sha256': hashlib.sha256(archive.read_bytes()).hexdigest()}))

"""Create a source-only archive from the checked public-file allowlist."""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess
import zipfile

root=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--output',required=True)
args=parser.parse_args()
subprocess.run(['node',str(root/'scripts/check-release.mjs')],cwd=root,check=True)
files=json.loads((root/'.local/public-files.json').read_text(encoding='utf8'))
output=Path(args.output).resolve()
output.parent.mkdir(parents=True,exist_ok=True)
with zipfile.ZipFile(output,'w',zipfile.ZIP_DEFLATED) as archive:
    for name in files:
        source=(root/name).resolve()
        if not source.is_relative_to(root) or source.is_symlink():raise RuntimeError('Invalid release path')
        archive.write(source,'win-cu-router/'+Path(name).as_posix())
print(json.dumps({'archive':str(output),'files':len(files),'sha256':hashlib.sha256(output.read_bytes()).hexdigest()}))

"""Run from this directory after adding crosswords/YYYY-MM-DD.json."""
from pathlib import Path
import json,hashlib,datetime,re
root=Path(__file__).resolve().parent
entries=[]
for f in sorted((root/'crosswords').glob('*.json')):
    if not re.fullmatch(r'\d{4}-\d{2}-\d{2}',f.stem):
        raise ValueError(f'Invalid filename: {f.name}')
    date=datetime.date.fromisoformat(f.stem)
    if not 2000<=date.year<=2100: raise ValueError(f'Invalid year: {f.name}')
    data=json.loads(f.read_text(encoding='utf-8-sig'))
    if data.get('id')!=f.stem or data.get('schemaVersion')!=1 or data.get('type')!='murli-crossword':
        raise ValueError(f'Invalid ID/schema: {f.name}')
    if not isinstance(data.get('rows'),list) or not isinstance(data.get('clues'),list):
        raise ValueError(f'Missing rows/clues: {f.name}')
    if f.stat().st_size>512*1024: raise ValueError(f'File too large: {f.name}')
    entries.append(dict(id=f.stem,file='crosswords/'+f.name,sha256=hashlib.sha256(f.read_bytes()).hexdigest()))
if len(entries)>1000: raise ValueError('Catalogue exceeds 1000 entries')
text=json.dumps(dict(schemaVersion=1,crosswords=entries),ensure_ascii=False,indent=2)+'\n'
(root/'catalogue.json').write_text(text,encoding='utf-8')
print(f'Catalogue: {len(entries)} crosswords. The app fully validates each grid before saving.')

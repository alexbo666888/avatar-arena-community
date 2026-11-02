"""仅按人工审核的白名单打包公开源码，不遍历复制整个工作目录。"""
from pathlib import Path, PurePosixPath
import hashlib
import zipfile

ROOT=Path(__file__).resolve().parent
NAME='avatar-arena-community-v0.1.0'

def main():
    entries=[line.strip() for line in (ROOT/'PUBLIC_FILES.txt').read_text(encoding='utf-8').splitlines() if line.strip() and not line.startswith('#')]
    if len(entries)!=len(set(entries)):
        raise ValueError('发布白名单有重复项')
    banned={'.venv','.git','.rankings','exports','__pycache__','.output-test','ws-samples','dist'}
    sources=[]
    for name in entries:
        rel=PurePosixPath(name)
        if rel.is_absolute() or '..' in rel.parts or any(p in banned or p.endswith('-profile') for p in rel.parts):
            raise ValueError('不允许公开的路径: '+name)
        if (any(p.startswith('.') for p in rel.parts) and name!='.gitignore') or rel.suffix in ('.log','.zip','.pyc') or rel.name in ('avatar-cache.json','.bridge-room'):
            raise ValueError('拒绝运行数据: '+name)
        source=(ROOT/name).resolve()
        if not source.is_relative_to(ROOT) or not source.is_file():
            raise ValueError('缺少公开文件或路径越界: '+name)
        sources.append((name,source))
    output=ROOT/'dist';output.mkdir(exist_ok=True)
    archive=output/(NAME+'.zip')
    with zipfile.ZipFile(archive,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=9) as z:
        for name,source in sources:
            z.write(source,'avatar-arena-community/'+name)
    with zipfile.ZipFile(archive) as z:
        if z.testzip() is not None:
            raise RuntimeError('压缩包校验失败')
    digest=hashlib.sha256(archive.read_bytes()).hexdigest()
    (output/(NAME+'.sha256')).write_text(digest+'  '+archive.name+'\n',encoding='utf-8')
    print(f'已打包 {len(sources)} 个公开文件: {archive}')
    print('SHA256: '+digest)

if __name__=='__main__':
    main()

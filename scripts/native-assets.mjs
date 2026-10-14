import {cp, mkdir, readdir, rm} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const target=process.argv[2];
if(!['windows','android'].includes(target))throw Error('Expected windows or android');
if(target==='android') { const assets=path.join(root,'native/android/app/src/main/assets');await rm(assets,{recursive:true,force:true});await mkdir(assets,{recursive:true});for(const name of await readdir(path.join(root,'dist'))) await cp(path.join(root,'dist',name),path.join(assets,name),{recursive:true}); }
else execFileSync(process.env.PYTHON || 'python3',['-c','import zipfile,pathlib; r=pathlib.Path("dist"); z=zipfile.ZipFile("native/windows/web.zip","w",zipfile.ZIP_DEFLATED); [z.write(p,p.relative_to(r)) for p in sorted(r.rglob("*")) if p.is_file()]; z.close()'],{cwd:root,stdio:'inherit'});

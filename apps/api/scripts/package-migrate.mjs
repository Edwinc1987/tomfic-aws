import { writeFileSync, mkdirSync, cpSync, existsSync } from "fs";
import { execSync } from "child_process";
import { join } from "path";

// Empaqueta la migrate-lambda: node_modules/prisma (CLI) + prisma/schema + migrations.
const root=join(import.meta.dirname,"..");
const out=join(root,"dist-migrate");
try{execSync("npx rimraf "+out,{cwd:root,stdio:"inherit"})}catch{}
mkdirSync(out,{recursive:true});
mkdirSync(join(out,"node_modules","@prisma"),{recursive:true});
mkdirSync(join(out,"prisma"),{recursive:true});
// CLI prisma (no engines included → downloads at runtime)
const cliDirs=[join(root,"node_modules","prisma"),join(root,"..","node_modules","prisma")];
const cliDir=cliDirs.find(d=>existsSync(d));
if(!cliDir) throw new Error("prisma CLI no encontrado");
cpSync(join(cliDir),join(out,"node_modules","prisma"),{recursive:true});
// engines-version pkg (metadata del commit)
const evDirs=[join(root,"node_modules","@prisma","engines-version"),join(root,"..","node_modules","@prisma","engines-version")];
const evDir=evDirs.find(d=>existsSync(d));
if(evDir) cpSync(evDir,join(out,"node_modules","@prisma","engines-version"),{recursive:true});
// schema+config+migrations
cpSync(join(root,"prisma"),join(out,"prisma"),{recursive:true});
// ejecutable del handler (transpiled by the main build) copy from dist
for(const f of ["migrate-lambda.js","core"]){
  const src=join(root,"dist",f), dst=join(out,f);
  if(existsSync(src)) cpSync(src,dst,{recursive:true});
}
// prisma.config.ts compiled? it is at root (prisma.config.ts) - copy source; CLI reads ts.
const cfg=join(root,"prisma.config.ts");
if(existsSync(cfg)) cpSync(cfg,join(out,"prisma.config.ts"));
const willPkg={name:"tomfic-migrate",private:true,dependencies:{"prisma":"6.19.3"}};
writeFileSync(join(out,"package.json"),JSON.stringify(willPkg,null,2));
execSync("npm install --omit=dev --ignore-scripts",{cwd:out,stdio:"inherit"});
// Descargar el schema-engine para Lambda (no se distribuye con npm en linux
// cuando se instala en Windows; `npm install --ignore-scripts` lo omite).
const enginePath=join(out,"node_modules","@prisma","engines","schema-engine-rhel-openssl-3.0.x");
if(!existsSync(enginePath)){
  const sha="c2990dca591cba766e3b7ef5d9e8a84796e47ab7"; // prisma 6.19.3 engines commit
  execSync(`curl -sL "https://binaries.prisma.sh/all_commits/${sha}/rhel-openssl-3.0.x/schema-engine.gz" -o "${enginePath}.gz" && gzip -dc "${enginePath}.gz" > "${enginePath}"`,{stdio:"inherit"});
}
console.log("migrate bundle listo en",out);

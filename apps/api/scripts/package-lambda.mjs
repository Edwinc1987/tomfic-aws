import { writeFileSync, mkdirSync, cpSync, readFileSync, existsSync } from "fs";
import { execSync } from "child_process";
import { join } from "path";

const root=join(import.meta.dirname,"..");
const dist=join(root,"dist");

console.log("[1/4] Generando cliente Prisma...");
// En CI el job de infraestructura llama este script directamente (no pasa por
// `npm run build`), así que el hook prebuild de Prisma no corre. Sin esto el
// cliente sale sin los modelos y `npx tsc` falla con TS2305.
execSync("npx prisma generate",{cwd:root,stdio:"inherit"});

console.log("[2/4] Compilando TypeScript...");
execSync("npx tsc",{cwd:root,stdio:"inherit"});

console.log("[3/4] Copiando Prisma...");
mkdirSync(join(dist,"prisma"),{recursive:true});
cpSync(join(root,"prisma"),join(dist,"prisma"),{recursive:true});

console.log("[4/4] Instalando dependencias de produccion...");
const pkg=JSON.parse(readFileSync(join(root,"package.json"),"utf8"));
const prodPkg={name:"tomfic-api",private:true,version:"1.0.0",dependencies:pkg.dependencies||{}};
writeFileSync(join(dist,"package.json"),JSON.stringify(prodPkg,null,2));
execSync("npm install --omit=dev --ignore-scripts",{cwd:dist,stdio:"inherit"});
// El cliente Prisma se genera en el node_modules más cercano con @prisma/client:
// local (Windows) queda en apps/api/node_modules, en CI (npm workspaces con hoisting) queda en el raíz.
mkdirSync(join(dist,"node_modules",".prisma"),{recursive:true});
const prismaCandidates=[join(root,"node_modules",".prisma"),join(root,"..","node_modules",".prisma")];
const prismaDir=prismaCandidates.find(c=>existsSync(c));
if(!prismaDir){
  throw new Error("No se encontró node_modules/.prisma (ni en apps/api ni en el raíz). ¿Corrió 'prisma generate'?");
}
cpSync(prismaDir,join(dist,"node_modules",".prisma"),{recursive:true});
// Copiar también @prisma/client si está hoisted (necesario para el runtime de Lambda).
const prismaClientCandidates=[join(root,"node_modules","@prisma","client"),join(root,"..","node_modules","@prisma","client")];
const prismaClientDir=prismaClientCandidates.find(c=>existsSync(c));
if(prismaClientDir){
  mkdirSync(join(dist,"node_modules","@prisma"),{recursive:true});
  cpSync(prismaClientDir,join(dist,"node_modules","@prisma","client"),{recursive:true});
}

console.log("Empaquetado completado en",dist);

import { writeFileSync, mkdirSync, cpSync, readFileSync } from "fs";
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
mkdirSync(join(dist,"node_modules",".prisma"),{recursive:true});
cpSync(join(root,"node_modules",".prisma"),join(dist,"node_modules",".prisma"),{recursive:true});

console.log("Empaquetado completado en",dist);

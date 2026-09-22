import { cognitoAuth } from "./cognitoAuth";

export const authService={
  getUser:()=>cognitoAuth.getUser(),
  getSession:()=>cognitoAuth.getSession(),
  getToken:()=>cognitoAuth.getToken(),
  onAuthStateChange:(handler)=>{
    setTimeout(()=>handler("INITIAL_SESSION"),0);
    return {subscription:{unsubscribe:()=>{}}};
  },
  signIn:(email,password)=>cognitoAuth.signIn(email,password),
  signOut:()=>cognitoAuth.signOut(),
  updatePassword:()=>Promise.resolve({data:{},error:new Error("Usa Cognito para cambiar contraseña")}),
  resetPassword:()=>Promise.resolve({data:{},error:new Error("Recuperación no disponible aún")}),
};

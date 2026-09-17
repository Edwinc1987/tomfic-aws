import { createContext, useContext, useState, useEffect } from "react";
import { cognitoAuth } from "./cognitoAuth";

const AuthContext=createContext({user:null,token:null,loading:true,signIn:()=>{},signOut:()=>{},isAwsPreview:false});

export function AuthProvider({children,isAwsPreview=false}){
  const [user,setUser]=useState(null);
  const [token,setToken]=useState(null);
  const [loading,setLoading]=useState(true);

  useEffect(()=>{
    (async()=>{
      try{
        const {data:{session}}=await cognitoAuth.getSession();
        if(session){
          const {data:{user:attrs}}=await cognitoAuth.getUser();
          setUser(attrs);
          const t=await cognitoAuth.getToken();
          setToken(t);
        }
      }catch(e){console.warn("Error cargando sesion:",e);}
      setLoading(false);
    })();
  },[]);

  const signIn=async(email,password)=>{
    const {data,error}=await cognitoAuth.signIn(email,password);
    if(error)throw error;
    const {data:{user:attrs}}=await cognitoAuth.getUser();
    setUser(attrs);
    const t=await cognitoAuth.getToken();
    setToken(t);
    return attrs;
  };

  const signOut=async()=>{
    await cognitoAuth.signOut();
    setUser(null);
    setToken(null);
  };

  return <AuthContext.Provider value={{user,token,loading,signIn,signOut,isAwsPreview}}>{children}</AuthContext.Provider>;
}

export const useAuth=()=>useContext(AuthContext);

import { CognitoUserPool, CognitoUser, AuthenticationDetails } from "amazon-cognito-identity-js";

const poolData={
  UserPoolId:import.meta.env.VITE_COGNITO_USER_POOL_ID||"",
  ClientId:import.meta.env.VITE_COGNITO_CLIENT_ID||"",
};
const userPool=poolData.UserPoolId&&poolData.ClientId?new CognitoUserPool(poolData):null;

let currentUser=null;

export const cognitoAuth={
  isAuthenticated:()=>!!currentUser,

  getSession:()=>new Promise((resolve)=>{
    if(!userPool)return resolve({data:{session:null},error:new Error("Cognito no configurado")});
    const user=userPool.getCurrentUser();
    if(!user)return resolve({data:{session:null},error:null});
    user.getSession((err,session)=>{
      if(err||!session||!session.isValid())return resolve({data:{session:null},error:err||new Error("Sesion invalida")});
      currentUser=user;
      resolve({data:{session},error:null});
    });
  }),

  signIn:(email,password)=>new Promise((resolve)=>{
    if(!userPool)return resolve({error:new Error("Cognito no configurado")});
    const authDetails=new AuthenticationDetails({Username:email,Password:password});
    const user=new CognitoUser({Username:email,Pool:userPool});
    user.authenticateUser(authDetails,{
      onSuccess:(session)=>{
        currentUser=user;
        resolve({data:{session},error:null});
      },
      onFailure:(err)=>{
        resolve({data:null,error:err});
      },
      newPasswordRequired:()=>{
        resolve({data:null,error:new Error("Se requiere cambio de contraseña")});
      },
    });
  }),

  signOut:()=>new Promise((resolve)=>{
    if(currentUser){currentUser.signOut();}
    currentUser=null;
    resolve({data:{},error:null});
  }),

  getToken:()=>new Promise((resolve)=>{
    if(!currentUser)return resolve(null);
    currentUser.getSession((err,session)=>{
      if(err||!session||!session.isValid())return resolve(null);
       resolve(session.getAccessToken().getJwtToken());
    });
  }),

  getUser:()=>new Promise((resolve)=>{
    if(!userPool)return resolve({data:{user:null},error:null});
    const user=userPool.getCurrentUser();
    if(!user)return resolve({data:{user:null},error:null});
    user.getSession((err)=>{
      if(err)return resolve({data:{user:null},error:err});
      user.getUserAttributes((attrErr,attrs)=>{
        if(attrErr)return resolve({data:{user:null},error:attrErr});
        const map={};attrs.forEach(a=>{map[a.Name]=a.Value;});
        resolve({data:{user:map},error:null});
      });
    });
  }),

  onAuthStateChange:(_callback)=>({subscription:{unsubscribe:()=>{}}}),
};

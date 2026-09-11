import { supabase } from "@/lib/data";

// Adaptador de autenticación para mantener el proveedor fuera de la UI.
export const authService={
  getUser:()=>supabase.auth.getUser(),
  getSession:()=>supabase.auth.getSession(),
  onAuthStateChange:(handler)=>supabase.auth.onAuthStateChange(handler),
  signIn:(email,password)=>supabase.auth.signInWithPassword({email,password}),
  signOut:()=>supabase.auth.signOut(),
  updatePassword:(password)=>supabase.auth.updateUser({password}),
  resetPassword:(email,redirectTo)=>supabase.auth.resetPasswordForEmail(email,{redirectTo}),
};

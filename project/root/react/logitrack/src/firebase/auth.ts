import { auth } from "./firebase";

// Sign Up
export const doCreateUserWithEmailAndPassword = (
  email: string,
  password: string
) => auth.createUserWithEmailAndPassword(email, password);

// Sign In
export const doSignInWithEmailAndPassword = (email: string, password: string) =>
  auth.signInWithEmailAndPassword(email, password);

// Sign out
export const doSignOut = () => auth.signOut();

// Password Reset
export const doPasswordReset = (email: string) =>
  auth.sendPasswordResetEmail(email);

// Password Change
export const doPasswordUpdate: (password: string) => Promise<{ok:boolean,error:Error|undefined}> = async (password: string) => {
  if (auth.currentUser) {
    try {
      await auth.currentUser.updatePassword(password);
      return {ok:true, error: undefined};
    } catch (e) {
      return {ok:false,error:e};
    }
  }
  throw Error("No auth.currentUser!");
};

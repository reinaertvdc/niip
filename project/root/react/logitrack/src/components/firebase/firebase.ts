import { app, auth, initializeApp } from 'firebase';
import { firebaseConfig } from './firebaseConfig'

export enum LoginState {
    LOGGED_OUT,
    LOGGED_IN,
}

export class Firebase {
    public app: app.App;
    public auth: auth.Auth;
    private _state: LoginState = LoginState.LOGGED_OUT;

    public constructor() {
        this.app = initializeApp(firebaseConfig);
        this.auth = this.app.auth();
    }

    public get state(): LoginState {
        return this._state;
    }

    public async loginEmailPassword(email: string, password: string): Promise<null|auth.UserCredential> {
        try {
            let tmp = await this.auth.signInWithEmailAndPassword(email, password);
            this._state = LoginState.LOGGED_IN;
            return tmp;
        } catch (e) {
            this._state = LoginState.LOGGED_OUT;
            return null;
        }
    }
}
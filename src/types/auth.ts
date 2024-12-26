export interface UserCredentials {
    email: string;
    password: string;
}
export interface AuthUser {
    id: string;
    email: string | null;
    name: string | null;
}

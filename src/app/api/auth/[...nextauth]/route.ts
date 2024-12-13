import NextAuth from "next-auth"
import GoogleProvider from "next-auth/providers/google";
import NaverProvider from "next-auth/providers/naver";
import KakaoProvider from "next-auth/providers/kakao";
import { CredentialsProvider } from "next-auth/providers/credentials";
import { compare } from "bcryptjs";


export default NextAuth({
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                Password: {label: "Password", type: "password"}
            },
            async authrize(credentials) {
                try {
                    const user = await getUserByEmail(credentials.email)

                    if (user && await compare(credentials.password, user.password)) {
                        return {
                            id: user.id,
                            email: user.email,
                            name: user.name
                        }
                    }
                    return null
                } catch (error) {
                    throw new Error("인증 오류가 발생했습니다.")
                }
            }
        }),
        GoogleProvider({
            clientId:
        })
]})
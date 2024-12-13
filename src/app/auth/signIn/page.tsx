// 'use client';

// import { useBoardStore } from '@/commons/store/useBoardStore';
// import styles from './styles.module.css';
// import { useSignInPage } from './hook';
// import { ChangeEvent } from 'react';
// import { userStore } from '@/commons/store/userStore';

// export default function SignInUI() {
//     const { inputs, error } = useBoardStore();
//     const { userLoggedInStatus } = userStore();
//     const { handleInputChange, handleSignIn } = useSignInPage();

//     const handleSubmit = (event: ChangeEvent<HTMLFormElement>) => {
//         event.preventDefault();
//         handleSignIn(); // 로그인 처리 로직 호출
//     };
//     return (
//         <div className={styles.signInPage}>
//             <div className={styles.signBox}>
//                 <h1 className={styles.h1}>로그인</h1>
//                 {userLoggedInStatus ? (
//                     <img src="/images/userIcon.png" alt="로그인 성공 이미지" />
//                 ) : (
//                     <form
//                         onSubmit={handleSubmit}
//                         className={styles.loginInputWrapper}
//                     >
//                         <input
//                             className={styles.loginInput}
//                             type="email"
//                             id="email"
//                             value={inputs.email}
//                             onChange={handleInputChange}
//                             placeholder="이메일"
//                         />
//                         <input
//                             className={styles.loginInput}
//                             type="password"
//                             id="password"
//                             value={inputs.password}
//                             onChange={handleInputChange}
//                             placeholder="비밀번호"
//                             autoComplete="password"
//                         />
//                         <button onClick={handleSignIn}>로그인</button>
//                     </form>
//                 )}
//                 <div className={styles.loginButtonWrapper}>
//                     {error && <p style={{ color: 'red' }}>{error}</p>}
//                 </div>
//             </div>
//         </div>
//     );
// }

"use client";
import { Login} from '../../../components/auths/Login';
import { Register } from '@/components/auths/Register';
import { useState } from 'react';

export default function Page() {
  const [isLogin, setIsLogin] = useState(true);

  return (
    <>
      {isLogin ? (
        <Login onRegisterClick={() => setIsLogin(false)} />
      ) : (
        <Register onLoginClick={() => setIsLogin(true)} />
      )}
    </>
  );
}
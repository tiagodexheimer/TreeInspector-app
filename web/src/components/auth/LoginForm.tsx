'use client';

import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      await login(email, password);
    } catch (error) {
      console.error('Login error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="card max-w-md mx-auto">
      <div className="card-header">
        <h2 className="text-2xl font-bold text-center text-gray-900">
          Entrar no TreeInspector
        </h2>
      </div>
      
      <div className="card-body">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="form-group">
            <label htmlFor="email" className="form-label">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
              placeholder="seu@email.com"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password" className="form-label">
              Senha
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="btn-primary w-full"
          >
            {isLoading ? (
              <div className="flex items-center justify-center">
                <div className="spinner mr-2" />
                Entrando...
              </div>
            ) : (
              'Entrar'
            )}
          </button>
        </form>
      </div>
      
      <div className="card-footer text-center text-sm text-gray-600">
        <p>
          Esqueceu sua senha?{' '}
          <a href="#" className="text-primary-600 hover:text-primary-700">
            Recuperar senha
          </a>
        </p>
      </div>
    </div>
  );
}
import { useState, type FormEvent } from 'react';
import { login, register } from '../services/authService';
import { toast } from 'react-hot-toast';
import type { LoginProps } from '../types/ui';

export default function Login({ setSessionUser }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isRegistering) {
        const data = await register(email, password);
        if (data.user && !data.session) {
          // Usuário criado mas precisa confirmar email
          toast.success('Conta criada! Verifique seu email para confirmar o cadastro.');
        } else if (data.user && data.session) {
          toast.success('Conta criada com sucesso!');
          setSessionUser(data.user);
        }
      } else {
        const data = await login(email, password);
        toast.success('Login efetuado com sucesso!');
        setSessionUser(data.user);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao autenticar';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', padding: '1rem' }}>
      <div className="glass-card" style={{ width: '100%', maxWidth: '400px', textAlign: 'center' }}>
        <h2 style={{ color: '#fff', marginBottom: '1.5rem', fontSize: '1.5rem' }}>
          My Mercado
        </h2>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <input
            type="email"
            placeholder="Seu email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="search-input"
            style={{ width: '100%' }}
          />
          <input
            type="password"
            placeholder="Sua senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="search-input"
            style={{ width: '100%' }}
          />
          <button
            type="submit"
            disabled={loading}
            className="btn btn-success"
            style={{ width: '100%', padding: '0.75rem', marginTop: '0.5rem' }}
          >
            {loading ? 'Aguarde...' : isRegistering ? 'Criar Conta' : 'Entrar'}
          </button>
        </form>

        <p style={{ marginTop: '1.5rem', color: '#94a3b8', fontSize: '0.85rem' }}>
          {isRegistering ? 'Já tem uma conta?' : 'Ainda não tem conta?'}
          <button
            type="button"
            onClick={() => setIsRegistering(!isRegistering)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--primary)',
              marginLeft: '0.5rem',
              cursor: 'pointer',
              fontWeight: 500,
              textDecoration: 'underline'
            }}
          >
            {isRegistering ? 'Fazer login' : 'Criar uma'}
          </button>
        </p>
      </div>
    </div>
  );
}

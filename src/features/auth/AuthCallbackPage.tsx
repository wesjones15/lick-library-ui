import { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../core/auth/AuthContext';

export default function AuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const token = searchParams.get('token');
    const error = searchParams.get('error');
    if (token) {
      login(token);
      navigate('/', { replace: true });
    } else if (error) {
      navigate('/?authError=true', { replace: true });
    } else {
      navigate('/', { replace: true });
    }
  }, []);

  return null;
}

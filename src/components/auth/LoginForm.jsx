import React, { useState } from 'react';
import { Mail, Lock } from 'lucide-react';
import Input from '../common/Input';
import Button from '../common/Button';
import { useAuthContext } from '../../context/AuthContext';

const LoginForm = ({ onSuccess, onSwitchToSignup }) => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const { login, isLoading } = useAuthContext();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const result = await login(formData.email, formData.password);
    if (result.success) {
      onSuccess();
    } else {
      setError(result.error);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-blue-900 mb-6">Welcome Back</h2>
      {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4">{error}</div>}
      <div className="space-y-4">
        <Input name="email" type="email" placeholder="Email" icon={Mail} value={formData.email} onChange={handleChange} required />
        <Input name="password" type="password" placeholder="Password" icon={Lock} value={formData.password} onChange={handleChange} required />
        <Button type="submit" variant="primary" fullWidth onClick={handleSubmit} disabled={isLoading}>
          {isLoading ? 'Signing in...' : 'Sign In'}
        </Button>
        <p className="text-center text-sm text-gray-600">
          Don't have an account?{' '}
          <button onClick={onSwitchToSignup} className="text-blue-900 font-semibold hover:underline">
            Sign Up
          </button>
        </p>
        <p className="text-xs text-gray-500 text-center">
          Demo: admin@church.com / admin
        </p>
      </div>
    </div>
  );
};

export default LoginForm;
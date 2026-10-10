import { useState } from 'react';
import { Eye, EyeOff, Lock } from 'lucide-react';
import Logo from './Logo';

/** Centered card on paper background used by all auth pages */
export const AuthShell = ({ title, subtitle, children }) => (
  <div className="px-4 py-8 md:py-14">
    <div className="max-w-md mx-auto">
      <div className="flex justify-center mb-5"><Logo size="text-[26px]" /></div>
      <div className="text-center mb-6">
        <h1 className="page-title !text-[28px] !leading-[34px]">{title}</h1>
        {subtitle && <p className="mt-1 text-ink-soft">{subtitle}</p>}
      </div>
      <div className="panel !p-5 sm:!p-8">{children}</div>
      <p className="mt-6 flex items-center justify-center gap-2 text-sm text-ink-soft">
        <Lock className="w-4 h-4" aria-hidden="true" /> Your information is secure with us
      </p>
    </div>
  </div>
);

/** Password field with a 44px show/hide toggle */
export const PasswordInput = ({ id, label, name, value, onChange, autoComplete, required = true, minLength, placeholder, help }) => {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label htmlFor={id} className="field-label">{label}</label>
      <div className="relative">
        <input
          id={id}
          type={show ? 'text' : 'password'}
          name={name}
          value={value}
          onChange={onChange}
          required={required}
          minLength={minLength}
          autoComplete={autoComplete}
          placeholder={placeholder}
          className="input-field pr-12"
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          aria-label={show ? 'Hide password' : 'Show password'}
          aria-pressed={show}
          className="absolute right-0 top-0 w-12 h-12 inline-flex items-center justify-center text-ink-soft hover:text-ink"
        >
          {show ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
        </button>
      </div>
      {help && <p className="field-help">{help}</p>}
    </div>
  );
};

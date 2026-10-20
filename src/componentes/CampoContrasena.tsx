/**
 * Campo de contraseña con botón de ojo para verla mientras se escribe.
 *
 * En el teléfono es fácil equivocarse con una tecla y no darse cuenta: ver lo
 * escrito evita el "contraseña incorrecta" sin saber por qué.
 */
import { useState, type InputHTMLAttributes } from 'react'

export const MIN_CONTRASENA = 8

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>

export function CampoContrasena({ className = '', ...resto }: Props) {
  const [visible, setVisible] = useState(false)
  return (
    <div className="relative">
      <input
        {...resto}
        type={visible ? 'text' : 'password'}
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        className={`campo pr-14 ${className}`}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute inset-y-0 right-0 flex w-14 items-center justify-center text-texto-2 active:opacity-50"
        aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        aria-pressed={visible}
        aria-controls={resto.id}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" aria-hidden="true">
          <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
          <circle cx="12" cy="12" r="3" />
          {!visible && <path d="M4 4l16 16" />}
        </svg>
      </button>
    </div>
  )
}

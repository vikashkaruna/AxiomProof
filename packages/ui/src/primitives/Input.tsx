import { type InputHTMLAttributes, type TextareaHTMLAttributes, forwardRef } from 'react';
import { cn } from '../utils.js';

const inputClasses =
  'flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:border-teal-500 disabled:cursor-not-allowed disabled:opacity-50';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, invalid, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        inputClasses,
        invalid && 'border-ember-500 focus-visible:ring-ember-500',
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = 'Input';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, invalid, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        inputClasses,
        'h-auto min-h-[80px] py-2',
        invalid && 'border-ember-500 focus-visible:ring-ember-500',
        className,
      )}
      {...props}
    />
  ),
);
Textarea.displayName = 'Textarea';

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
}

export const Label = forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, required, children, ...props }, ref) => (
    <label
      ref={ref}
      className={cn('text-sm font-medium text-slate-700', className)}
      {...props}
    >
      {children}
      {required && <span className="ml-0.5 text-ember-500">*</span>}
    </label>
  ),
);
Label.displayName = 'Label';

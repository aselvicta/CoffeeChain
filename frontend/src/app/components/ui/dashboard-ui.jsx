const TONES = {
  amber: {
    card: 'bg-amber-50 hover:bg-amber-100',
    iconWrap: 'bg-amber-100',
    icon: 'text-amber-700',
    outline: 'border-amber-200 text-amber-800 hover:bg-amber-50',
  },
  green: {
    card: 'bg-green-50 hover:bg-green-100',
    iconWrap: 'bg-green-100',
    icon: 'text-green-700',
    outline: 'border-green-200 text-green-800 hover:bg-green-50',
  },
  blue: {
    card: 'bg-blue-50 hover:bg-blue-100',
    iconWrap: 'bg-blue-100',
    icon: 'text-blue-700',
    outline: 'border-blue-200 text-blue-800 hover:bg-blue-50',
  },
  emerald: {
    card: 'bg-emerald-50 hover:bg-emerald-100',
    iconWrap: 'bg-emerald-100',
    icon: 'text-emerald-700',
    outline: 'border-emerald-200 text-emerald-800 hover:bg-emerald-50',
  },
  slate: {
    card: 'bg-gray-50 hover:bg-gray-100',
    iconWrap: 'bg-gray-100',
    icon: 'text-gray-700',
    outline: 'border-gray-200 text-gray-800 hover:bg-gray-50',
  },
};

export function QuickActionCard({
  icon: Icon,
  title,
  description,
  onClick,
  tone = 'green',
  className = '',
  type = 'button',
}) {
  const palette = TONES[tone] || TONES.green;
  const Component = type === 'button' ? 'button' : 'div';

  return (
    <Component
      type={type === 'button' ? 'button' : undefined}
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-xl p-4 text-left transition-colors ${palette.card} ${className}`}
    >
      {Icon && (
        <div className={`rounded-lg p-2.5 ${palette.iconWrap}`}>
          <Icon className={`h-5 w-5 ${palette.icon}`} />
        </div>
      )}
      <div>
        <p className="font-semibold text-gray-900">{title}</p>
        {description && <p className="text-sm text-gray-600">{description}</p>}
      </div>
    </Component>
  );
}

export function ContentListRow({
  icon: Icon,
  tone = 'amber',
  highlighted = false,
  children,
  action,
  className = '',
}) {
  const palette = TONES[tone] || TONES.amber;

  return (
    <div
      className={`flex flex-col gap-4 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between ${
        highlighted
          ? 'border-emerald-200 bg-emerald-50'
          : 'border-gray-200 bg-white'
      } ${className}`}
    >
      <div className="flex items-start gap-4">
        {Icon && (
          <div className={`rounded-lg p-2.5 ${palette.iconWrap}`}>
            <Icon className={`h-5 w-5 ${palette.icon}`} />
          </div>
        )}
        <div className="min-w-0 flex-1">{children}</div>
      </div>
      {action}
    </div>
  );
}

export function PanelPrimaryButton({ icon: Icon, children, className = '', type = 'button', ...props }) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-2 rounded-lg border border-green-600 bg-green-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      {...props}
    >
      {Icon && <Icon className="h-4 w-4" />}
      {children}
    </button>
  );
}

export function PanelOutlineButton({ icon: Icon, children, tone = 'green', className = '', type = 'button', ...props }) {
  const palette = TONES[tone] || TONES.green;
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-2 rounded-lg border bg-white px-4 py-2.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${palette.outline} ${className}`}
      {...props}
    >
      {Icon && <Icon className="h-4 w-4" />}
      {children}
    </button>
  );
}

export function ContentPanel({ title, description, children, className = '' }) {
  return (
    <div className={`rounded-xl border border-gray-200 bg-white p-6 shadow-sm ${className}`}>
      {title && <h2 className="text-xl font-bold text-gray-900">{title}</h2>}
      {description && <p className="mt-1 text-sm text-gray-600">{description}</p>}
      {children}
    </div>
  );
}

export function Logo({ size = 'md', showText = true, variant = 'full', theme = 'dark' }) {
  const sizes = {
    // `logo` uses w-auto so rectangular logo.png scales naturally
    sm: { logo: 'h-14 w-auto', text: 'text-lg' },
    md: { logo: 'h-20 w-auto', text: 'text-xl' },
    lg: { logo: 'h-28 w-auto', text: 'text-3xl' },
    xl: { logo: 'h-36 w-auto', text: 'text-4xl' },
  };

  const currentSize = sizes[size];
  const logoSrc = new URL('../../assets/logo.png', import.meta.url).href;

  // Color variants based on theme
  const colors = theme === 'light' ? {
    textMain: 'text-white',
    textAccent: 'text-green-200',
    tagline: 'text-green-100',
  } : {
    textMain: 'text-green-900',
    textAccent: 'text-green-600',
    tagline: 'text-green-700',
  };

  return (
    <div className="flex items-center gap-3">
      <img
        src={logoSrc}
        alt="CoffeeChain logo"
        className={`${currentSize.logo} object-contain drop-shadow-xl`}
        loading="eager"
      />
      
      {/* Logo Text */}
      {showText && (
        <div className="flex flex-col">
          <span className={`${currentSize.text} font-bold ${colors.textMain} leading-tight tracking-tight`}>
            Coffee<span className={colors.textAccent}>Chain</span>
          </span>
          {variant === 'full' && size !== 'sm' && (
            <span className={`text-xs ${colors.tagline} font-medium`}>
              Trust & Security Platform
            </span>
          )}
        </div>
      )}
    </div>
  );
}
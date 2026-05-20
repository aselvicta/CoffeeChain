import { ChevronRight, Home } from 'lucide-react';

export function GlobalBreadcrumb({ userProfile }) {
  const getBreadcrumbPath = () => {
    const path = [];
    
    // Always show National level
    path.push({
      label: 'National (TCB)',
      level: 'national',
      active: userProfile?.role === 'national'
    });

    // Add Regional level if applicable
    if (userProfile?.role === 'regional' || userProfile?.role === 'cooperative') {
      path.push({
        label: userProfile?.region || 'Region',
        level: 'regional',
        active: userProfile?.role === 'regional'
      });
    }

    // Add AMCOS level if applicable
    if (userProfile?.role === 'cooperative') {
      path.push({
        label: userProfile?.organization || 'AMCOS',
        level: 'cooperative',
        active: userProfile?.role === 'cooperative'
      });
    }

    return path;
  };

  const breadcrumbPath = getBreadcrumbPath();

  return (
    <div className="bg-white border-b border-gray-200 px-6 py-3">
      <div className="flex items-center gap-2 text-sm">
        <Home className="h-4 w-4 text-gray-400" />
        <ChevronRight className="h-4 w-4 text-gray-400" />
        {breadcrumbPath.map((item, index) => (
          <div key={item.level} className="flex items-center gap-2">
            <span
              className={`font-medium ${
                item.active
                  ? 'text-gray-900'
                  : 'text-gray-500'
              }`}
            >
              {item.label}
            </span>
            {index < breadcrumbPath.length - 1 && (
              <ChevronRight className="h-4 w-4 text-gray-400" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

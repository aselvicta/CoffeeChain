import { useEffect, useState } from 'react';
import { DEFAULT_FERTILIZER_TYPES, fetchFertilizerTypes } from '../api/client';

function toOption(value) {
  return { value, label: value };
}

export function useFertilizerTypes() {
  const [fertilizerTypes, setFertilizerTypes] = useState(DEFAULT_FERTILIZER_TYPES.map(toOption));

  useEffect(() => {
    let isActive = true;

    fetchFertilizerTypes()
      .then((items) => {
        if (!isActive || !Array.isArray(items) || items.length === 0) return;
        setFertilizerTypes(
          items
            .map((item) => {
              if (typeof item === 'string') {
                return toOption(item);
              }
              const value = String(item?.value || item?.label || '').trim();
              if (!value) return null;
              return { value, label: String(item?.label || value) };
            })
            .filter(Boolean)
        );
      })
      .catch(() => {
        // Keep the fallback list if the API is unavailable.
      });

    return () => {
      isActive = false;
    };
  }, []);

  return { fertilizerTypes };
}
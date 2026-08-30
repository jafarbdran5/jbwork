import { useState, useEffect } from 'react';
import { getAppLabel, getAppLabelEn, getSavedLabels, DynamicLabelItem } from './dynamicLabelsStore';

/**
 * React hook that returns the resolved dynamic Arabic label for a given internal ID.
 * Automatically re-renders whenever a label is updated anywhere in the system.
 */
export function useAppLabel(id: string, fallback?: string): string {
  const [label, setLabel] = useState<string>(() => getAppLabel(id, fallback));

  useEffect(() => {
    const handleUpdate = () => {
      setLabel(getAppLabel(id, fallback));
    };

    window.addEventListener('jb_labels_changed', handleUpdate);
    window.addEventListener('jb_customization_changed', handleUpdate);
    window.addEventListener('jb_data_changed', handleUpdate);

    return () => {
      window.removeEventListener('jb_labels_changed', handleUpdate);
      window.removeEventListener('jb_customization_changed', handleUpdate);
      window.removeEventListener('jb_data_changed', handleUpdate);
    };
  }, [id, fallback]);

  return label;
}

/**
 * React hook that returns the entire dynamic labels list with live updates.
 */
export function useAllDynamicLabels(): DynamicLabelItem[] {
  const [labels, setLabels] = useState<DynamicLabelItem[]>(() => getSavedLabels());

  useEffect(() => {
    const handleUpdate = () => {
      setLabels(getSavedLabels());
    };

    window.addEventListener('jb_labels_changed', handleUpdate);
    window.addEventListener('jb_customization_changed', handleUpdate);
    window.addEventListener('jb_data_changed', handleUpdate);

    return () => {
      window.removeEventListener('jb_labels_changed', handleUpdate);
      window.removeEventListener('jb_customization_changed', handleUpdate);
      window.removeEventListener('jb_data_changed', handleUpdate);
    };
  }, []);

  return labels;
}

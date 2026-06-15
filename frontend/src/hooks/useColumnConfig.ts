import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import type { ColumnConfig, ConfigurableEntity } from '../types';

export function useColumnConfig(entity: ConfigurableEntity) {
  return useQuery<ColumnConfig[]>({
    queryKey: ['column-config', entity],
    queryFn: () => api.get('/column-config', { params: { entity } }).then((r) => r.data),
  });
}

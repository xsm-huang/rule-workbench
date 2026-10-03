import { isForbiddenError } from '@/api/error'
import { useQuery } from '@tanstack/vue-query'
import { getWorkbenchBootstrap } from '@/api/workbench'

export const WORKBENCH_BOOTSTRAP_QUERY_KEY = ['workbench', 'bootstrap'] as const

export function useWorkbenchBootstrap() {
  return useQuery({
    queryKey: WORKBENCH_BOOTSTRAP_QUERY_KEY,
    queryFn: getWorkbenchBootstrap,
    staleTime: 60000,
    retry: (failureCount, error) => !isForbiddenError(error) && failureCount < 1,
  })
}

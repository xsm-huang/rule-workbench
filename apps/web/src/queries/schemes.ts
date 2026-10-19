import { computed, type Ref } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { getSchemeDetail } from '@/api/schemes'

export function useSchemeDetail(schemeId: Ref<string>) {
  // ID 放进 Query Key，让每个方案使用各自的缓存。
  const queryKey = computed(() => ['schemes', 'detail', schemeId.value] as const)

  return useQuery({
    queryKey,
    enabled: computed(() => Boolean(schemeId.value)),
    queryFn: () => getSchemeDetail(schemeId.value),
    staleTime: 0,
  })
}

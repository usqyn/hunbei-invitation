import { computed, type Ref, type ComputedRef } from 'vue'
import { RTL_CHAR_REGEX } from '@/constants/editor'
import { formatBiDi } from '@/utils/font-loader'

const RTL_FONT_STACK = '"KazakhSoftAsilya", "Scheherazade New", "Amiri", "Noto Sans Arabic", "PingFang SC", "Microsoft YaHei", sans-serif'

export function useRtl(text: string | Ref<string> | ComputedRef<string> | (() => string)) {
  const resolved = typeof text === 'function' ? (text as () => string) : () => text.value

  const isRtl = computed(() => RTL_CHAR_REGEX.test(resolved() || ''))
  const dir = computed<'rtl' | 'ltr'>(() => isRtl.value ? 'rtl' : 'ltr')

  const inputStyle = computed(() => ({
    direction: dir.value,
    textAlign: isRtl.value ? 'right' : 'left',
    fontFamily: isRtl.value ? RTL_FONT_STACK : undefined,
  }))

  const textClass = computed(() => isRtl.value ? 'rtl-text' : '')

  /** 处理后的文本（BiDi 控制字符包裹阿拉伯文段） */
  const formatted = computed(() => isRtl.value ? formatBiDi(resolved()) : resolved() || '')

  return { isRtl, dir, inputStyle, textClass, formatted }
}


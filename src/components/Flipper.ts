import type { Ref } from 'vue'

interface FlipItemType {
  flipId: number
  node: HTMLElement | null | undefined
  rect?: DOMRect
}
export interface IFlipContext {
  // mount 后执行 add
  add: (item: FlipItemType) => void
  // unout 后执行 remove
  remove: (flipId: number) => void
  // 自增唯一 id
  nextId: () => number
}

export const FlipWarpper = defineComponent({
  name: 'FlipWarpper',
  props: {
    flipKey: {
      required: true,
    },
  },
  setup(props, ctx) {
    const lastRectRef = ref<Map<number, FlipItemType>>(new Map())
    const uniqueIdRef = ref<number>(0)
    const fnRef = ref<IFlipContext>({
      add(flipItem: FlipItemType) {
        lastRectRef.value.set(flipItem.flipId, flipItem)
      },
      remove(flipId: number) {
        lastRectRef.value.delete(flipId)
      },
      nextId() {
        uniqueIdRef.value++
        return uniqueIdRef.value
      },
    })
    provide('fnRef', fnRef)

    watch(props, () => {
      lastRectRef.value.forEach((item) => {
        item.rect = item.node?.getBoundingClientRect()
      })
      nextTick(play)
    }, { deep: true })

    function play() {
      const currentRectMap = new Map<number, DOMRect>()
      lastRectRef.value.forEach((item) => {
        currentRectMap.set(item.flipId, item.node!.getBoundingClientRect())
      })
      lastRectRef.value.forEach((item) => {
        const currRect = currentRectMap.get(item.flipId)
        const prevRect = item.rect
        if (!currRect || !prevRect || !item.node)
          return
        // Invert
        const invert = {
          left: prevRect.left - currRect.left,
          top: prevRect.top - currRect.top,
        }

        if (invert.top === 0 && invert.left === 0)
          return

        const keyframes = [
          {
            transform: `translate(${invert.left}px, ${invert.top}px)`,
          },
          {
            transform: 'translate(0, 0)',
          },
        ]

        const isLastRectOverflow
          = prevRect.right < 0
          || prevRect.left > innerWidth
          || prevRect.bottom < 0
          || prevRect.top > innerHeight

        const isCurrentRectOverflow
          = currRect.right < 0
          || currRect.left > innerWidth
          || currRect.bottom < 0
          || currRect.top > innerHeight

        if (isLastRectOverflow && isCurrentRectOverflow)
          return

        // Play
        item.node.animate(keyframes, {
          duration: 800,
          easing: 'cubic-bezier(0.25, 0.8, 0.25, 1)',
        })
      })
    }

    return () => {
      const slot = ctx.slots.default?.()
      if (!slot)
        throw new Error('FlipWarpper requires a slot, but not found')
      return h('div', { }, [slot])
    }
  },
})

export const FlipItem = defineComponent({
  name: 'FlipItem',
  setup(_, ctx) {
    const currRef = ref<HTMLDivElement | null>()
    const fnRef = inject<Ref<IFlipContext>>('fnRef')!

    const flipId = fnRef.value.nextId()
    onMounted(() => {
      if (currRef.value)
        fnRef.value.add({ flipId, node: currRef.value })
    })
    onBeforeUnmount(() => {
      fnRef.value.remove(flipId)
    })
    return () => {
      const slot = ctx.slots.default?.()
      if (!slot)
        throw new Error('FlipItem requires a slot, but not found')
      return h('div', { ref: currRef }, [slot])
    }
  },
})

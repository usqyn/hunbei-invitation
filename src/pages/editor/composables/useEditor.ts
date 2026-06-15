import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { useTemplateStore } from '@/stores/template'
import { useEditorStore } from '@/stores/editor'
import { storeToRefs } from 'pinia'

export function useEditor() {
  const templateStore = useTemplateStore()
  const editorStore = useEditorStore()

  const {
    showTextEditor, showBasicInfoEditor, activePanelTab,
    editingText, currentFont, currentColor,
    currentFontSize, currentSpacing, currentLineHeight,
    editableElements, materialList,
  } = storeToRefs(editorStore)

  const showDatePicker = ref(false)

  const signinForm = reactive({
    name: '',
    count: ''
  })

  const countdown = reactive({
    days: '00',
    hours: '00',
    minutes: '00',
    seconds: '00'
  })

  let timer: number | null = null

  const goBack = () => {
    uni.navigateBack()
  }

  const handleShare = () => {
    uni.showToast({ title: '分享', icon: 'none' })
  }

  const handleMore = () => {
    uni.showToast({ title: '更多选项', icon: 'none' })
  }

  const onTextInput = (e: any) => {
    editorStore.editingText = e.detail.value
  }

  const confirmBasicInfo = () => {
    editorStore.closeBasicInfoEditor()
    uni.showToast({ title: '已保存', icon: 'success' })
  }

  const confirmTextEdit = () => {
    editorStore.confirmTextEdit()
    uni.showToast({ title: '已保存', icon: 'success' })
  }

  const selectMaterial = (material: any) => {
    editorStore.selectMaterial(material)
  }

  const handleMusic = () => {
    uni.navigateTo({ url: '/pages/music/index' })
  }

  const handleSettings = () => {
    editorStore.activePanelTab = 'settings'
  }

  const handleSave = () => {
    uni.showToast({ title: '已保存', icon: 'success' })
  }

  const handlePreviewShare = () => {
    uni.showToast({ title: '生成预览', icon: 'none' })
  }

  const handleLocation = () => {
    uni.chooseLocation({
      success: (res) => {
        templateStore.basicInfo.location = res.name || res.address
      }
    })
  }

  const handleSignin = () => {
    if (!signinForm.name) {
      uni.showToast({ title: '请填写姓名', icon: 'none' })
      return
    }
    uni.showToast({ title: '签到成功', icon: 'success' })
    signinForm.name = ''
    signinForm.count = ''
  }

  const updateCountdown = () => {
    const targetDate = new Date('2027-09-14T12:00:00').getTime()
    const now = new Date().getTime()
    const diff = targetDate - now

    if (diff > 0) {
      const days = Math.floor(diff / (1000 * 60 * 60 * 24))
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)

      countdown.days = String(days).padStart(2, '0')
      countdown.hours = String(hours).padStart(2, '0')
      countdown.minutes = String(minutes).padStart(2, '0')
      countdown.seconds = String(seconds).padStart(2, '0')
    }
  }

  const onImageError = () => {}

  onMounted(() => {
    updateCountdown()
    timer = setInterval(updateCountdown, 1000) as unknown as number
  })

  onUnmounted(() => {
    if (timer) {
      clearInterval(timer)
    }
  })

  return {
    templateStore, editorStore,
    showTextEditor, showBasicInfoEditor, activePanelTab,
    editingText, currentFont, currentColor,
    currentFontSize, currentSpacing, currentLineHeight,
    editableElements, materialList, showDatePicker,
    signinForm, countdown,
    goBack, handleShare, handleMore, onTextInput,
    confirmBasicInfo, confirmTextEdit, selectMaterial,
    handleMusic, handleSettings, handleSave,
    handlePreviewShare, handleLocation, handleSignin,
    onImageError,
  }
}

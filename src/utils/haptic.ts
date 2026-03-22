export function onVibrate() {
  // #ifdef APP-PLUS
  const platform = uni.getSystemInfoSync().platform
  if (platform === 'ios') {
    const UIImpactFeedbackGenerator = plus.ios.importClass('UIImpactFeedbackGenerator')
    const impact = new UIImpactFeedbackGenerator()
    impact.prepare()
    impact.init(1)
    impact.impactOccurred()
  } else if (platform === 'android') {
    uni.vibrateShort({})
  }
  // #endif
}

// Quick diagnostic script to test RevenueCat service
// Run this via the Premium Store to see what's happening

console.log('🛒 RevenueCat Diagnostic Test');

// This should trigger the RevenueCat service diagnostic
window.flutter_inappwebview?.callHandler('openPremiumStore', {
  action: 'diagnostic',
  test: true
});
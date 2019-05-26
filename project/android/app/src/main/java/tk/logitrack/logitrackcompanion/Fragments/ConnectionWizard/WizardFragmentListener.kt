package tk.logitrack.logitrackcompanion.Fragments.ConnectionWizard

interface WizardFragmentListener {
	fun onLogin()
	fun onLogout()

	fun onWiFiConnect()
	fun onAutoConnectChange(value: Boolean)

	fun onLoginReady()
	fun onWiFiReady()
	fun onWebSocketReady()
	fun onHotspotReady()
}